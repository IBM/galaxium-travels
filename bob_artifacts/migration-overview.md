# AWS Migration Overview - Galaxium Travels

## Simple 4-Phase Migration Plan

This is a simplified, practical migration plan to get your Galaxium Travels booking system running on AWS quickly.

## Target Architecture

```
User → ALB → ECS Fargate (Frontend + Backend) → RDS PostgreSQL
```

**Key Components:**
- **ALB**: Application Load Balancer (entry point)
- **ECS Fargate**: Serverless containers for frontend and backend
- **RDS PostgreSQL**: Managed database (replaces SQLite)
- **ECR**: Container image registry
- **Terraform**: Infrastructure as code

**Estimated Cost:** $50-80/month

## Migration Phases

### Phase 1: Application Preparation (1-2 days)
**Goal:** Prepare app for cloud deployment

**Key Tasks:**
- Add PostgreSQL support to backend
- Create production Dockerfiles
- Test containers locally

**Document:** [`phase-1-application-preparation.md`](phase-1-application-preparation.md)

### Phase 2: Infrastructure Setup (2-3 days)
**Goal:** Deploy AWS infrastructure with Terraform

**Key Tasks:**
- Create Terraform configuration
- Deploy VPC, subnets, security groups
- Create RDS PostgreSQL database
- Set up ECR repositories
- Deploy ECS cluster and ALB

**Document:** [`phase-2-infrastructure-setup.md`](phase-2-infrastructure-setup.md)

### Phase 3: Deploy Containers (1 day)
**Goal:** Get application running on AWS

**Key Tasks:**
- Build Docker images
- Push images to ECR
- Deploy to ECS
- Verify application is accessible

**Document:** [`phase-3-deploy-containers.md`](phase-3-deploy-containers.md)

### Phase 4: Database Migration (1 day)
**Goal:** Migrate data and test everything

**Key Tasks:**
- Create database schema in RDS
- Export data from SQLite
- Import data to PostgreSQL
- Test all application features

**Document:** [`phase-4-database-migration.md`](phase-4-database-migration.md)

## Total Timeline

**5-7 days** from start to finish

## What's NOT Included (Kept Simple)

To keep this migration straightforward, we're NOT including:
- ❌ Automated backups (can add later)
- ❌ CloudWatch monitoring/alarms (can add later)
- ❌ AWS Secrets Manager (using environment variables)
- ❌ Auto-scaling (using fixed task count)
- ❌ Multi-AZ deployment (single AZ for cost)
- ❌ CI/CD pipeline (manual deployments)
- ❌ Custom domain/HTTPS (using ALB DNS)

All of these can be added incrementally after the basic migration is complete.

## Prerequisites

**Tools needed:**
- AWS account with admin access
- AWS CLI installed and configured
- Terraform installed (v1.0+)
- Docker installed
- PostgreSQL client (psql) for database work

**Knowledge needed:**
- Basic AWS concepts
- Basic Terraform usage
- Basic Docker commands
- Basic SQL

## Quick Start

1. **Read Phase 1 document** - Understand what needs to be done
2. **Complete Phase 1 tasks** - Get Docker images working locally
3. **Read Phase 2 document** - Review Terraform configuration
4. **Deploy infrastructure** - Run `terraform apply`
5. **Read Phase 3 document** - Understand deployment process
6. **Deploy containers** - Push images and update ECS
7. **Read Phase 4 document** - Plan database migration
8. **Migrate database** - Move data to RDS
9. **Test everything** - Verify all features work

## Success Criteria

✅ Application accessible via ALB URL  
✅ All features working (browse, book, cancel)  
✅ Data successfully migrated  
✅ No errors in application  
✅ Cost within budget ($50-80/month)  

## Getting Help

Each phase document includes:
- Step-by-step instructions
- Code examples
- Validation checklists
- Troubleshooting tips

## After Migration

Once your application is running on AWS:

**Monitor costs:**
```bash
# Check AWS billing dashboard regularly
# Set up billing alerts in AWS console
```

**Make updates:**
```bash
# Use the deploy.sh script from Phase 3
./deploy.sh
```

**Scale if needed:**
```bash
# Update desired_count in Terraform
# Run terraform apply
```

**Add features incrementally:**
- Set up automated backups
- Add CloudWatch monitoring
- Configure auto-scaling
- Set up CI/CD pipeline
- Add custom domain with HTTPS

## Architecture Diagram

```
┌─────────┐
│  User   │
└────┬────┘
     │ HTTPS
     ▼
┌─────────────────┐
│      ALB        │
│  (Port 80)      │
└────┬────────────┘
     │
     ├─────────────────┐
     │                 │
     ▼                 ▼
┌──────────┐    ┌──────────┐
│ Frontend │    │ Backend  │
│   ECS    │    │   ECS    │
│ (Nginx)  │    │ (FastAPI)│
└──────────┘    └────┬─────┘
                     │
                     ▼
              ┌─────────────┐
              │     RDS     │
              │ PostgreSQL  │
              └─────────────┘
```

## Cost Breakdown

| Service | Monthly Cost |
|---------|-------------|
| ALB | $16 |
| ECS Fargate (2 tasks) | $25 |
| RDS t3.micro | $15 |
| Data Transfer | $5 |
| ECR & Logs | $5 |
| **Total** | **~$66** |

## Next Steps

Start with **[Phase 1: Application Preparation](phase-1-application-preparation.md)**

Good luck with your migration! 🚀