# YouTube Video Prep Guide - AWS Terraform Deployment

## Issues We Encountered (and How to Avoid Them)

### 🔴 CRITICAL: Vite Environment Variables Issue

**What Happened:**
- Frontend showed "failed to load flights" even though API was working
- docker-entrypoint.sh tried to replace `VITE_API_URL` at runtime
- But Vite bakes env vars into JS at BUILD time, not runtime!

**The Fix:**
```typescript
// Change from absolute URL to relative URL
baseURL: '/api'  // Instead of import.meta.env.VITE_API_URL
```

**For Video:** Emphasize this is a common gotcha with Vite/React apps in containers!

---

### 🟡 Terraform Syntax Issues

**Issue 1: ECS deployment_configuration**
```hcl
# Wrong (old syntax)
deployment_configuration {
  maximum_percent = 200
}

# Correct (new syntax)
deployment_configuration = {
  maximum_percent = 200
}
```

**Issue 2: RDS engine version**
```hcl
# Wrong
engine_version = "15.4"

# Correct (AWS uses major version only)
engine_version = "15"
```

**For Video:** Show terraform validate catching these early!

---

### 🟡 ALB Routing Configuration

**What Happened:**
- API requests went to frontend instead of backend
- Missing listener rule for `/api/*` paths

**The Fix:**
```hcl
resource "aws_lb_listener_rule" "backend_api" {
  condition {
    path_pattern {
      values = ["/api/*", "/docs", "/openapi.json"]
    }
  }
}
```

**For Video:** Explain path-based routing concept clearly!

---

### 🟡 FastAPI Route Mounting

**What Happened:**
- Routes defined at root level (`/flights`)
- But ALB routing to `/api/*`
- Mismatch caused 404 errors

**The Fix:**
```python
# Create sub-app and mount it
api_app = FastAPI(title="API")
app = FastAPI()
app.mount("/api", api_app)

@api_app.get("/flights")  # Now accessible at /api/flights
```

**For Video:** Show the before/after route structure!

---

### 🟢 Docker Platform Compatibility

**What Happened:**
- Built on Apple Silicon (ARM64)
- AWS Fargate needs linux/amd64

**The Fix:**
```bash
docker build --platform linux/amd64 -t image:tag .
```

**For Video:** Quick mention, not a major issue if you remember the flag!

---

### 🟢 Database Seeding Idempotency

**What Happened:**
- Seed script tried to insert duplicate data
- Caused deployment failures on restarts

**The Fix:**
```python
def seed_database(db: Session):
    if db.query(User).count() > 0:
        print("Already seeded. Skipping.")
        return
    # Insert data...
```

**For Video:** Good practice for any database initialization!

---

## Video Recording Tips

### Pre-Recording Checklist

1. **Clean Slate:**
   - Delete existing Terraform state: `rm -rf terraform/.terraform terraform/terraform.tfstate*`
   - Destroy existing infrastructure: `terraform destroy` (if any)
   - Clear ECR repositories

2. **Code Preparation:**
   - Have all fixes already in place (use this test run as baseline)
   - Frontend already using `/api` relative URL
   - Backend already mounting routes under `/api`
   - Database seed with idempotency check
   - All Terraform files with correct syntax

3. **Environment Setup:**
   - AWS credentials configured
   - Docker running
   - Terminal with clear history
   - Browser tabs ready (AWS Console, application URL)

### Recording Flow Suggestion

**Part 1: Introduction (2-3 min)**
- Show the application running locally
- Explain what we're deploying (React + FastAPI + PostgreSQL)
- Overview of AWS architecture (VPC, ALB, ECS, RDS)

**Part 2: Terraform Configuration (5-7 min)**
- Walk through key Terraform files
- Highlight important configurations:
  - VPC with multiple subnets
  - ALB with path-based routing
  - ECS Fargate services
  - RDS database
- Show terraform validate and plan

**Part 3: Docker Images (3-4 min)**
- Build frontend and backend images
- Push to ECR
- Emphasize `--platform linux/amd64` flag

**Part 4: Deployment (5-7 min)**
- Run terraform apply
- Show resources being created in AWS Console
- Wait for ECS tasks to become healthy
- Show CloudWatch logs

**Part 5: Verification (3-4 min)**
- Access application via ALB URL
- Show frontend loading
- Show API returning data
- Demonstrate booking flow

**Part 6: Key Learnings (2-3 min)**
- Vite environment variables gotcha
- ALB path-based routing setup
- FastAPI route mounting
- Cost considerations (~$130-150/month)

**Total: 20-25 minutes**

---

## Common Questions to Address

1. **"Why not use environment variables for API URL?"**
   - Explain Vite build-time vs runtime
   - Show why relative URLs work better with ALB

2. **"Why use ALB instead of nginx proxy?"**
   - Better health checks
   - Native AWS integration
   - Easier SSL/TLS management
   - Path-based routing at load balancer level

3. **"Why Fargate instead of EC2?"**
   - No server management
   - Pay per task
   - Auto-scaling built-in
   - Better for demos/small apps

4. **"What about costs?"**
   - Show cost breakdown
   - Mention NAT gateways are expensive ($65/month)
   - Suggest single NAT for dev/test

5. **"How to add HTTPS?"**
   - Request ACM certificate
   - Add certificate_arn variable
   - Terraform handles the rest

---

## Troubleshooting Commands to Show

```bash
# Check ECS service status
aws ecs describe-services --cluster galaxium-travels-cluster \
  --services galaxium-travels-frontend-service --region us-east-1

# View logs
aws logs tail /ecs/galaxium-travels-frontend --follow --region us-east-1

# Force new deployment
aws ecs update-service --cluster galaxium-travels-cluster \
  --service galaxium-travels-frontend-service \
  --force-new-deployment --region us-east-1

# Check target health
aws elbv2 describe-target-health \
  --target-group-arn <ARN> --region us-east-1
```

---

## Files to Show in Video

1. **Terraform files** (quick overview):
   - main.tf (provider)
   - vpc.tf (networking)
   - alb.tf (load balancer with routing rules)
   - ecs.tf (services)
   - rds.tf (database)

2. **Application files** (key changes):
   - `booking_system_frontend/src/services/api.ts` (relative URL)
   - `booking_system_backend/server.py` (route mounting)
   - `booking_system_backend/seed.py` (idempotency)

3. **Docker files**:
   - Frontend Dockerfile
   - Backend Dockerfile.prod

---

## Post-Video Cleanup

```bash
# Destroy all infrastructure
cd terraform
terraform destroy -auto-approve

# Delete ECR images
aws ecr batch-delete-image \
  --repository-name galaxium-travels-frontend \
  --image-ids imageTag=latest --region us-east-1

aws ecr batch-delete-image \
  --repository-name galaxium-travels-backend \
  --image-ids imageTag=latest --region us-east-1
```

---

## Video Description Template

```
🚀 Deploy a Full-Stack Application to AWS with Terraform

In this video, I'll show you how to deploy a React + FastAPI + PostgreSQL application to AWS using Terraform and ECS Fargate.

📋 What We'll Cover:
- Complete Terraform infrastructure as code
- VPC with public, private, and database subnets
- Application Load Balancer with path-based routing
- ECS Fargate for containerized applications
- RDS PostgreSQL database
- CloudWatch logging and monitoring

⚠️ Common Gotchas:
- Vite environment variables (build-time vs runtime)
- ALB listener rules for API routing
- FastAPI route mounting
- Docker platform compatibility

💰 Cost: ~$130-150/month (can be optimized)

🔗 Links:
- GitHub Repository: [your-repo]
- Terraform Documentation: https://registry.terraform.io/providers/hashicorp/aws
- AWS Free Tier: https://aws.amazon.com/free/

⏱️ Timestamps:
0:00 Introduction
2:00 Terraform Configuration
7:00 Building Docker Images
10:00 Deploying to AWS
15:00 Verification
18:00 Key Learnings
20:00 Cleanup

#AWS #Terraform #DevOps #Docker #React #FastAPI #PostgreSQL
```

---

## Success Criteria

✅ Application accessible via ALB URL  
✅ Frontend loads and displays flights  
✅ API endpoints return correct data  
✅ Database connected and operational  
✅ All ECS tasks healthy  
✅ CloudWatch logs showing activity  
✅ No errors in browser console  

**Ready to record! 🎥**