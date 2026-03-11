# Phase 2: Infrastructure as Code - Implementation Summary

## ✅ Implementation Complete

**Date:** March 11, 2026  
**Status:** Successfully deployed and operational

---

## 🎯 All Objectives Achieved

- [x] Set up Terraform project structure (14 files)
- [x] Configure AWS provider and backend
- [x] Create VPC and networking resources (6 subnets, 2 NAT gateways)
- [x] Set up Application Load Balancer with path-based routing
- [x] Configure ECS Fargate cluster and services (4 tasks running)
- [x] Provision RDS PostgreSQL 15 database
- [x] Create ECR repositories with lifecycle policies
- [x] Configure security groups and IAM roles
- [x] Test and verify infrastructure deployment

---

## 🏗️ Infrastructure Deployed

### Network Architecture
- **VPC:** 10.0.0.0/16 across 2 availability zones
- **Subnets:** 2 public (ALB), 2 private (ECS), 2 database (RDS)
- **NAT Gateways:** 2 for high availability
- **Internet Gateway:** For public subnet access

### Compute Resources
- **ECS Cluster:** galaxium-travels-cluster
- **Frontend Service:** 2 Fargate tasks (Nginx + React)
- **Backend Service:** 2 Fargate tasks (FastAPI)
- **Load Balancer:** ALB with path-based routing (`/api/*` → backend)

### Database
- **RDS Instance:** PostgreSQL 15, db.t3.micro
- **Storage:** 20GB GP3 (auto-scaling to 100GB)
- **Backup:** 7-day retention, encrypted

### Container Registry
- **ECR Repositories:** frontend and backend
- **Lifecycle Policy:** Keep last 10 images

---

## 🔧 Key Issues Resolved

1. **Terraform syntax:** Fixed ECS deployment_configuration block → attribute
2. **PostgreSQL version:** Changed from "15.4" to "15"
3. **ALB routing:** Added missing `/api/*` listener rule
4. **Backend mounting:** Created FastAPI sub-app mounted at `/api`
5. **Database seeding:** Added idempotency check
6. **Docker platform:** Rebuilt with `--platform linux/amd64`
7. **Frontend startup:** Fixed line endings and Alpine sed syntax
8. **API URL hardcoding:** Changed to relative URL `/api` (Vite build-time issue)

---

## 🌐 Deployment URLs

- **Application:** http://galaxium-travels-alb-478103173.us-east-1.elb.amazonaws.com/
- **API:** http://galaxium-travels-alb-478103173.us-east-1.elb.amazonaws.com/api/
- **API Docs:** http://galaxium-travels-alb-478103173.us-east-1.elb.amazonaws.com/docs
- **Health Check:** http://galaxium-travels-alb-478103173.us-east-1.elb.amazonaws.com/api/health

---

## ✅ Verification Results

### Service Health
- Frontend: 2/2 tasks HEALTHY ✅
- Backend: 2/2 tasks HEALTHY ✅
- RDS: Available and connected ✅
- ALB: All target health checks passing ✅

### API Tests
```bash
# Frontend loads successfully
curl http://galaxium-travels-alb-478103173.us-east-1.elb.amazonaws.com/
# ✅ Returns HTML

# Backend API returns flight data
curl http://galaxium-travels-alb-478103173.us-east-1.elb.amazonaws.com/api/flights
# ✅ Returns JSON array with 30 flights

# Health check passes
curl http://galaxium-travels-alb-478103173.us-east-1.elb.amazonaws.com/api/health
# ✅ Returns {"status":"healthy"}
```

---

## 📊 Resources Created

- 1 VPC with 6 subnets
- 1 Internet Gateway + 2 NAT Gateways
- 1 Application Load Balancer + 2 Target Groups
- 3 Security Groups (ALB, ECS, RDS)
- 1 ECS Cluster + 2 Services + 4 Tasks
- 1 RDS PostgreSQL instance
- 2 ECR Repositories
- 2 IAM Roles + 4 Policies
- 2 CloudWatch Log Groups + 4 Alarms

**Estimated Monthly Cost:** ~$130-150

---

## 🔐 Security Implemented

- Private subnets for application tier
- Database in isolated subnets (no public access)
- Security groups with minimal required ports
- IAM roles with least privilege
- RDS and ECR encryption enabled
- CloudWatch logging and monitoring
- Multi-AZ deployment (2 availability zones)

---

## 🚀 Next Steps

**Phase 2 Complete!** Ready for Phase 3: CI/CD Pipeline

### Optional Enhancements
1. Enable Terraform remote state (S3 + DynamoDB)
2. Add HTTPS with ACM certificate
3. Configure custom domain with Route 53
4. Enable ECS auto-scaling
5. Enable RDS Multi-AZ for production

---

## 🎓 Key Learning

**Critical Discovery:** Vite bakes environment variables at BUILD time, not runtime. The docker-entrypoint.sh script's runtime replacement doesn't work because the values are already compiled into the JavaScript bundle. Solution: Use relative URLs (`/api`) instead of absolute URLs when frontend and backend are on the same domain via ALB.

---

## 📝 Files Created

### Terraform Configuration (14 files)
- main.tf, variables.tf, outputs.tf, backend.tf
- vpc.tf, security_groups.tf, alb.tf
- ecs.tf, rds.tf, ecr.tf, iam.tf, cloudwatch.tf
- terraform.tfvars.example, README.md

### Application Changes
- Modified `booking_system_backend/server.py` (API sub-app mounting)
- Modified `booking_system_backend/seed.py` (idempotency check)
- Modified `booking_system_frontend/src/services/api.ts` (relative URL)
- Fixed `booking_system_frontend/docker-entrypoint.sh` (line endings)

---

**Implementation Time:** ~2 hours (including debugging)  
**Difficulty:** High (as expected)  
**Status:** ✅ All systems operational