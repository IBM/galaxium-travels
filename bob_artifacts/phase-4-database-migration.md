# Phase 4: Database Migration and Testing

## Goal
Migrate data from SQLite to RDS PostgreSQL and verify the application works end-to-end.

## Duration
1 day

## Prerequisites
- Phase 3 completed (containers deployed)
- Local SQLite database with data
- RDS PostgreSQL running

## Tasks

### 1. Create Database Schema

**Option A: Using SQLAlchemy (Recommended)**

Create `booking_system_backend/init_db.py`:
```python
from db import engine, init_db

if __name__ == "__main__":
    print("Creating database schema...")
    init_db()
    print("Schema created successfully!")
```

Run locally against RDS:
```bash
cd booking_system_backend

# Get RDS endpoint from Terraform
cd ../terraform
export RDS_ENDPOINT=$(terraform output -raw rds_endpoint)
cd ../booking_system_backend

# Set DATABASE_URL to point to RDS
export DATABASE_URL="postgresql://postgres:YourSecurePassword123!@$RDS_ENDPOINT/booking"

# Create schema
python init_db.py
```

**Option B: Using psql**

```bash
# Get RDS endpoint
cd terraform
RDS_ENDPOINT=$(terraform output -raw rds_endpoint)

# Connect to RDS
psql -h $RDS_ENDPOINT -U postgres -d booking

# Run schema creation (paste the SQL from models.py)
CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    name VARCHAR NOT NULL,
    email VARCHAR UNIQUE NOT NULL
);

CREATE TABLE flights (
    flight_id SERIAL PRIMARY KEY,
    origin VARCHAR NOT NULL,
    destination VARCHAR NOT NULL,
    departure_time VARCHAR NOT NULL,
    arrival_time VARCHAR NOT NULL,
    base_price INTEGER NOT NULL,
    economy_seats_available INTEGER NOT NULL,
    business_seats_available INTEGER NOT NULL,
    galaxium_seats_available INTEGER NOT NULL
);

CREATE TABLE bookings (
    booking_id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(user_id),
    flight_id INTEGER REFERENCES flights(flight_id),
    status VARCHAR NOT NULL,
    booking_time VARCHAR NOT NULL,
    seat_class VARCHAR NOT NULL DEFAULT 'economy',
    price_paid INTEGER NOT NULL
);
```

### 2. Export Data from SQLite

Create `booking_system_backend/export_data.py`:
```python
import json
from db import SessionLocal
from models import User, Flight, Booking

def export_data():
    db = SessionLocal()
    
    # Export users
    users = db.query(User).all()
    users_data = [{
        'user_id': u.user_id,
        'name': u.name,
        'email': u.email
    } for u in users]
    
    # Export flights
    flights = db.query(Flight).all()
    flights_data = [{
        'flight_id': f.flight_id,
        'origin': f.origin,
        'destination': f.destination,
        'departure_time': f.departure_time,
        'arrival_time': f.arrival_time,
        'base_price': f.base_price,
        'economy_seats_available': f.economy_seats_available,
        'business_seats_available': f.business_seats_available,
        'galaxium_seats_available': f.galaxium_seats_available
    } for f in flights]
    
    # Export bookings
    bookings = db.query(Booking).all()
    bookings_data = [{
        'booking_id': b.booking_id,
        'user_id': b.user_id,
        'flight_id': b.flight_id,
        'status': b.status,
        'booking_time': b.booking_time,
        'seat_class': b.seat_class,
        'price_paid': b.price_paid
    } for b in bookings]
    
    db.close()
    
    # Save to JSON files
    with open('users_export.json', 'w') as f:
        json.dump(users_data, f, indent=2)
    
    with open('flights_export.json', 'w') as f:
        json.dump(flights_data, f, indent=2)
    
    with open('bookings_export.json', 'w') as f:
        json.dump(bookings_data, f, indent=2)
    
    print(f"Exported {len(users_data)} users")
    print(f"Exported {len(flights_data)} flights")
    print(f"Exported {len(bookings_data)} bookings")

if __name__ == "__main__":
    export_data()
```

Run the export:
```bash
cd booking_system_backend

# Make sure DATABASE_URL points to SQLite
export DATABASE_URL="sqlite:///./booking.db"

python export_data.py
```

### 3. Import Data to PostgreSQL

Create `booking_system_backend/import_data.py`:
```python
import json
from db import SessionLocal
from models import User, Flight, Booking

def import_data():
    db = SessionLocal()
    
    # Import users
    with open('users_export.json', 'r') as f:
        users_data = json.load(f)
    
    for user_data in users_data:
        user = User(**user_data)
        db.add(user)
    
    db.commit()
    print(f"Imported {len(users_data)} users")
    
    # Import flights
    with open('flights_export.json', 'r') as f:
        flights_data = json.load(f)
    
    for flight_data in flights_data:
        flight = Flight(**flight_data)
        db.add(flight)
    
    db.commit()
    print(f"Imported {len(flights_data)} flights")
    
    # Import bookings
    with open('bookings_export.json', 'r') as f:
        bookings_data = json.load(f)
    
    for booking_data in bookings_data:
        booking = Booking(**booking_data)
        db.add(booking)
    
    db.commit()
    print(f"Imported {len(bookings_data)} bookings")
    
    # Update sequences
    db.execute("SELECT setval('users_user_id_seq', (SELECT MAX(user_id) FROM users))")
    db.execute("SELECT setval('flights_flight_id_seq', (SELECT MAX(flight_id) FROM flights))")
    db.execute("SELECT setval('bookings_booking_id_seq', (SELECT MAX(booking_id) FROM bookings))")
    db.commit()
    
    db.close()
    print("Import complete!")

if __name__ == "__main__":
    import_data()
```

Run the import:
```bash
cd booking_system_backend

# Get RDS endpoint
cd ../terraform
export RDS_ENDPOINT=$(terraform output -raw rds_endpoint)
cd ../booking_system_backend

# Set DATABASE_URL to point to RDS
export DATABASE_URL="postgresql://postgres:YourSecurePassword123!@$RDS_ENDPOINT/booking"

python import_data.py
```

### 4. Verify Data Migration

```bash
# Connect to RDS
psql -h $RDS_ENDPOINT -U postgres -d booking

# Check row counts
SELECT COUNT(*) FROM users;
SELECT COUNT(*) FROM flights;
SELECT COUNT(*) FROM bookings;

# Sample some data
SELECT * FROM users LIMIT 5;
SELECT * FROM flights LIMIT 5;
SELECT * FROM bookings LIMIT 5;
```

### 5. Restart ECS Services

The backend containers need to restart to pick up the populated database:

```bash
# Force new deployment (containers will restart)
aws ecs update-service \
  --cluster galaxium-booking-cluster \
  --service galaxium-booking-backend \
  --force-new-deployment \
  --region us-east-1
```

Wait 2-3 minutes for the service to stabilize.

### 6. Test the Application

Get the ALB URL:
```bash
cd terraform
terraform output alb_dns_name
```

**Test in browser:**
1. Open the ALB URL
2. Navigate to Flights page
3. Verify flights are displayed
4. Try to create a booking
5. Check My Bookings page
6. Try to cancel a booking

**Test with curl:**
```bash
ALB_URL=$(cd terraform && terraform output -raw alb_dns_name)

# List flights
curl http://$ALB_URL/api/flights

# Get a specific user's bookings
curl http://$ALB_URL/api/bookings/1
```

## Validation Checklist

- [ ] Database schema created in RDS
- [ ] Data exported from SQLite (users, flights, bookings)
- [ ] Data imported to PostgreSQL
- [ ] Row counts match between SQLite and PostgreSQL
- [ ] Sequences updated for auto-increment fields
- [ ] ECS backend service restarted
- [ ] Application accessible via ALB
- [ ] Flights page shows data
- [ ] Can create new bookings
- [ ] Can view bookings
- [ ] Can cancel bookings
- [ ] No errors in browser console
- [ ] Backend logs show successful database connections

## Troubleshooting

### Cannot connect to RDS from local machine

RDS is in a private subnet. Options:

**Option 1: Temporary security group rule**
```bash
# Get your IP
MY_IP=$(curl -s ifconfig.me)

# Add temporary rule to RDS security group
aws ec2 authorize-security-group-ingress \
  --group-id <RDS_SECURITY_GROUP_ID> \
  --protocol tcp \
  --port 5432 \
  --cidr $MY_IP/32 \
  --region us-east-1

# After migration, remove the rule
aws ec2 revoke-security-group-ingress \
  --group-id <RDS_SECURITY_GROUP_ID> \
  --protocol tcp \
  --port 5432 \
  --cidr $MY_IP/32 \
  --region us-east-1
```

**Option 2: Use ECS task**
Run the migration scripts as an ECS task instead of locally.

### Data import fails

```bash
# Check for duplicate keys
# Clear existing data if needed
psql -h $RDS_ENDPOINT -U postgres -d booking -c "TRUNCATE users, flights, bookings CASCADE;"

# Re-run import
python import_data.py
```

### Application shows no data

```bash
# Check backend logs
aws logs tail /ecs/galaxium-booking-backend --follow --region us-east-1

# Verify DATABASE_URL in task definition
aws ecs describe-task-definition \
  --task-definition galaxium-booking-backend \
  --region us-east-1 \
  --query 'taskDefinition.containerDefinitions[0].environment'
```

### Bookings fail to create

```bash
# Check sequences are set correctly
psql -h $RDS_ENDPOINT -U postgres -d booking

SELECT last_value FROM users_user_id_seq;
SELECT last_value FROM flights_flight_id_seq;
SELECT last_value FROM bookings_booking_id_seq;

# Should be >= max ID in each table
```

## Alternative: Seed Fresh Data

If you don't need to migrate existing data, you can seed fresh data:

```bash
cd booking_system_backend

# Point to RDS
export DATABASE_URL="postgresql://postgres:YourSecurePassword123!@$RDS_ENDPOINT/booking"

# Run seed script
python seed.py
```

## Success Criteria

✅ All data migrated successfully  
✅ Application fully functional  
✅ Can browse flights  
✅ Can create bookings  
✅ Can view bookings  
✅ Can cancel bookings  
✅ No database connection errors  
✅ Performance is acceptable  

## Migration Complete!

Your application is now running on AWS! 

**Application URL:** http://[ALB_DNS_NAME]

**Next steps:**
- Set up a custom domain (optional)
- Configure HTTPS with ACM certificate (optional)
- Set up automated deployments (optional)
- Monitor costs in AWS Billing dashboard

## Cost Monitoring

Check your AWS costs:
```bash
# View current month costs
aws ce get-cost-and-usage \
  --time-period Start=2024-01-01,End=2024-01-31 \
  --granularity MONTHLY \
  --metrics BlendedCost \
  --region us-east-1
```

Expected monthly cost: $50-80
- ALB: ~$16
- ECS Fargate: ~$25
- RDS t3.micro: ~$15
- Data transfer: ~$5
- Other: ~$5

## Cleanup (if needed)

To destroy all resources:
```bash
cd terraform
terraform destroy
```

**Warning:** This will delete everything including the database!