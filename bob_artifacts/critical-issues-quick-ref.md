# Critical Issues Quick Reference

## 🔴 TOP 3 ISSUES THAT WILL BREAK YOUR DEPLOYMENT

### 1. Vite Environment Variables (MOST COMMON!)

**Symptom:** Frontend loads but shows "failed to load flights" or API errors

**Root Cause:** Vite bakes `import.meta.env.VITE_*` at BUILD time, not runtime

**Fix:**
```typescript
// In booking_system_frontend/src/services/api.ts
const api = axios.create({
  baseURL: '/api'  // Use relative URL, not import.meta.env.VITE_API_URL
});
```

**Why it works:** Both frontend and backend are behind the same ALB domain, so relative URLs work perfectly.

---

### 2. Missing ALB Listener Rule

**Symptom:** API requests return 404 or go to frontend instead of backend

**Root Cause:** No listener rule routing `/api/*` to backend target group

**Fix:**
```hcl
// In terraform/alb.tf - Make sure this exists!
resource "aws_lb_listener_rule" "backend_api" {
  listener_arn = aws_lb_listener.http.arn
  priority     = 100

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.backend.arn
  }

  condition {
    path_pattern {
      values = ["/api/*", "/docs", "/openapi.json", "/mcp"]
    }
  }
}
```

---

### 3. FastAPI Route Mounting Mismatch

**Symptom:** Backend returns 404 for `/api/flights` even though route exists

**Root Cause:** Routes defined at root level but ALB routes to `/api/*`

**Fix:**
```python
# In booking_system_backend/server.py
api_app = FastAPI(title="Galaxium Booking System API")
app = FastAPI()
app.mount("/api", api_app)  # Mount sub-app at /api

@api_app.get("/flights")  # This becomes /api/flights
def get_flights():
    pass
```

---

## 🟡 IMPORTANT BUT LESS CRITICAL

### 4. Terraform Syntax (Provider v5.0+)

```hcl
# ECS service - use attribute syntax
deployment_configuration = {  # Not a block!
  maximum_percent = 200
}
```

### 5. RDS Version

```hcl
engine_version = "15"  # Not "15.4" - AWS uses major version only
```

### 6. Docker Platform

```bash
docker build --platform linux/amd64 -t image:tag .
```

### 7. Database Seeding

```python
# Check before inserting
if db.query(User).count() > 0:
    return  # Already seeded
```

---

## ✅ PRE-DEPLOYMENT CHECKLIST

Before running `terraform apply`:

- [ ] Frontend uses relative URL `/api` in api.ts
- [ ] Backend mounts routes under `/api` prefix
- [ ] ALB has listener rule for `/api/*` paths
- [ ] Terraform uses correct syntax (deployment_configuration = {})
- [ ] RDS engine_version is major version only ("15")
- [ ] Docker images built with --platform linux/amd64
- [ ] Database seed has idempotency check
- [ ] All Terraform files validated: `terraform validate`

---

## 🚨 DEBUGGING COMMANDS

```bash
# Check if services are running
aws ecs describe-services --cluster galaxium-travels-cluster \
  --services galaxium-travels-frontend-service galaxium-travels-backend-service \
  --region us-east-1 --query 'services[*].{Name:serviceName,Running:runningCount,Desired:desiredCount}'

# View logs
aws logs tail /ecs/galaxium-travels-backend --follow --region us-east-1

# Test API directly
curl http://ALB-DNS/api/health
curl http://ALB-DNS/api/flights

# Force new deployment after code changes
aws ecs update-service --cluster galaxium-travels-cluster \
  --service galaxium-travels-frontend-service \
  --force-new-deployment --region us-east-1
```

---

## 📝 QUICK FIX WORKFLOW

If deployment fails:

1. **Check ECS task logs first** - Most issues show up here
2. **Verify ALB target health** - Are targets healthy?
3. **Test API endpoint directly** - Does backend respond?
4. **Check browser console** - Frontend errors?
5. **Review CloudWatch logs** - Application errors?

**Most common fix:** Rebuild and push Docker images, then force new deployment.

---

## 💡 KEY INSIGHTS

1. **Vite is not like traditional SPAs** - Environment variables are baked at build time
2. **ALB path routing is explicit** - You must define rules for each path pattern
3. **FastAPI mounting matters** - Route prefix must match ALB routing
4. **Terraform syntax changes** - Provider v5.0+ uses different syntax for some resources
5. **AWS Fargate needs amd64** - Apple Silicon builds won't work

---

## 🎯 SUCCESS INDICATORS

When everything works:

✅ `curl http://ALB-DNS/` returns HTML  
✅ `curl http://ALB-DNS/api/flights` returns JSON array  
✅ `curl http://ALB-DNS/api/health` returns `{"status":"healthy"}`  
✅ Browser shows flights list without errors  
✅ ECS shows 2/2 tasks running for both services  
✅ ALB target health checks all passing  

**If all above pass, you're good to go! 🚀**