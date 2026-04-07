# AWS Deployment Guide

This guide explains how to deploy and manage the Galaxium Travels Booking System on AWS.

## Overview

The application is deployed on AWS using:
- **ECS Fargate** for containerized services
- **RDS PostgreSQL** for the database
- **Application Load Balancer** for routing
- **ECR** for Docker image storage
- **VPC** with public and private subnets
- **Terraform** for infrastructure as code

---

## Prerequisites

Before deploying, ensure you have:

1. **AWS Account** with appropriate permissions
2. **AWS CLI** installed and configured (`aws configure`)
3. **Docker** installed and running
4. **Terraform** installed (v1.0+)
5. **jq** installed (for JSON parsing)

### Installing Prerequisites

**macOS:**
```bash
brew install awscli terraform jq
```

**Linux:**
```bash
# AWS CLI
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install

# Terraform
wget https://releases.hashicorp.com/terraform/1.6.0/terraform_1.6.0_linux_amd64.zip
unzip terraform_1.6.0_linux_amd64.zip
sudo mv terraform /usr/local/bin/

# jq
sudo apt-get install jq
```

---

## Quick Start

### Deploy to AWS

```bash
./deploy-to-aws.sh
```

This single command will:
1. ✅ Check all prerequisites
2. ✅ Create Terraform configuration
3. ✅ Deploy infrastructure (VPC, RDS, ECS, ALB, etc.)
4. ✅ Build Docker images for backend and frontend
5. ✅ Push images to ECR
6. ✅ Deploy ECS services
7. ✅ Validate the deployment
8. ✅ Display the application URL

**Deployment time:** Approximately 15-20 minutes

### Demo-Oriented Defaults

This AWS setup is optimized for a low-cost, short-lived demo environment:

- ECS desired count defaults to `1` task per service to reduce cost
- The frontend uses relative [`/api`](booking_system_frontend/src/services/api.ts:13) requests behind the ALB, so no custom domain is required
- Backend demo seeding is disabled in ECS via `SEED_DEMO_DATA=false` to avoid reseeding on task restarts
- You can still enable seeding for local development by setting `SEED_DEMO_DATA=true`

### Tear Down Infrastructure

```bash
./teardown-aws.sh
```

This command will:
1. ⚠️  Ask for confirmation (type 'yes')
2. 🔄 Scale down ECS services
3. 🗑️  Delete Docker images from ECR
4. 🗑️  Destroy all Terraform-managed resources
5. ✅ Verify cleanup
6. 💰 Show cost savings

**Teardown time:** Approximately 10-15 minutes

---

## Deployment Scripts

### deploy-to-aws.sh

**Features:**
- Comprehensive prerequisite checking
- Automatic Terraform configuration
- Docker image building with correct platform (linux/amd64)
- ECR authentication and image pushing
- ECS service deployment
- Health check validation
- Colored output for easy reading
- Detailed progress reporting

**Environment Variables:**
```bash
AWS_REGION=us-east-1 ./deploy-to-aws.sh  # Override default region
```

**What it creates:**
- VPC with 2 public and 2 private subnets
- Internet Gateway and NAT Gateway
- Application Load Balancer
- ECS Cluster with Fargate tasks
- RDS PostgreSQL database (db.t3.micro)
- ECR repositories
- CloudWatch log groups
- Security groups and IAM roles
- Secrets Manager for database credentials

**Note:** This setup intentionally uses the ALB DNS name directly over HTTP for demo simplicity and lower cost.

### teardown-aws.sh

**Features:**
- Safety confirmation prompt
- Graceful service shutdown
- ECR image cleanup
- Complete infrastructure removal
- Verification of cleanup
- Cost savings calculation
- Preserves local code and Terraform configs

**Safety Features:**
- Requires explicit 'yes' confirmation
- 5-second countdown before starting
- Continues cleanup even if some steps fail
- Backs up Terraform state
- Verifies resource removal

---

## Manual Deployment Steps

If you prefer to deploy manually or need to troubleshoot:

### 1. Configure Terraform

```bash
cd terraform
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars with your preferences
```

### 2. Deploy Infrastructure

```bash
cd terraform
terraform init
terraform plan
terraform apply
```

### 3. Build and Push Images

```bash
# Get ECR URLs
cd terraform
BACKEND_REPO=$(terraform output -raw ecr_backend_repository_url)
FRONTEND_REPO=$(terraform output -raw ecr_frontend_repository_url)
cd ..

# Authenticate with ECR
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin \
  $(aws sts get-caller-identity --query Account --output text).dkr.ecr.us-east-1.amazonaws.com

# Build and push backend
cd booking_system_backend
docker build --platform linux/amd64 -t galaxium-backend:latest .
docker tag galaxium-backend:latest $BACKEND_REPO:latest
docker push $BACKEND_REPO:latest
cd ..

# Build and push frontend
cd booking_system_frontend
docker build --platform linux/amd64 -t galaxium-frontend:latest .
docker tag galaxium-frontend:latest $FRONTEND_REPO:latest
docker push $FRONTEND_REPO:latest
cd ..
```

### 4. Deploy Services

```bash
aws ecs update-service \
  --cluster galaxium-booking-cluster \
  --service galaxium-booking-backend \
  --force-new-deployment

aws ecs update-service \
  --cluster galaxium-booking-cluster \
  --service galaxium-booking-frontend \
  --force-new-deployment
```

---

## Monitoring and Troubleshooting

### View Logs

**Backend logs:**
```bash
aws logs tail /ecs/galaxium-booking-backend --region us-east-1 --follow
```

**Frontend logs:**
```bash
aws logs tail /ecs/galaxium-booking-frontend --region us-east-1 --follow
```

### Check Service Status

```bash
aws ecs describe-services \
  --cluster galaxium-booking-cluster \
  --services galaxium-booking-backend galaxium-booking-frontend \
  --region us-east-1
```

### Check Task Status

```bash
aws ecs list-tasks \
  --cluster galaxium-booking-cluster \
  --region us-east-1
```

### Test Endpoints

```bash
# Get ALB URL
cd terraform
ALB_URL=$(terraform output -raw alb_url)

# Test backend
curl $ALB_URL/api/

# Test frontend
curl $ALB_URL/

# Test health
curl $ALB_URL/health
```

---

## Cost Management

### Estimated Monthly Costs (Development)

| Resource | Cost |
|----------|------|
| RDS db.t3.micro | ~$15 |
| NAT Gateway | ~$32 |
| Application Load Balancer | ~$16 |
| ECS Fargate (2 tasks) | ~$30 |
| **Total** | **~$93/month** |

### Cost Optimization Tips

1. **Stop when not in use:**
   ```bash
   ./teardown-aws.sh  # Tear down completely
   ```

2. **Reduce task count:**
   - Edit `terraform/terraform.tfvars`
   - Set `ecs_desired_count = 1`
   - Run `terraform apply`

3. **Use smaller instances:**
   - Already using smallest viable sizes
   - db.t3.micro for RDS
   - 256 CPU / 512 MB for ECS tasks

4. **Single AZ deployment:**
   - Edit `terraform/terraform.tfvars`
   - Set `availability_zones = ["us-east-1a"]`
   - Saves on NAT Gateway costs

---

## Updating the Application

### Update Backend Code

```bash
cd booking_system_backend
# Make your changes
docker build --platform linux/amd64 -t galaxium-backend:latest .
docker tag galaxium-backend:latest $(cd ../terraform && terraform output -raw ecr_backend_repository_url):latest
docker push $(cd ../terraform && terraform output -raw ecr_backend_repository_url):latest

# Force new deployment
aws ecs update-service \
  --cluster galaxium-booking-cluster \
  --service galaxium-booking-backend \
  --force-new-deployment
```

### Update Frontend Code

```bash
cd booking_system_frontend
# Make your changes
docker build --platform linux/amd64 -t galaxium-frontend:latest .
docker tag galaxium-frontend:latest $(cd ../terraform && terraform output -raw ecr_frontend_repository_url):latest
docker push $(cd ../terraform && terraform output -raw ecr_frontend_repository_url):latest

# Force new deployment
aws ecs update-service \
  --cluster galaxium-booking-cluster \
  --service galaxium-booking-frontend \
  --force-new-deployment
```

### Update Infrastructure

```bash
cd terraform
# Edit .tf files as needed
terraform plan
terraform apply
```

---

## Security Considerations

### Current Security Features

✅ Private subnets for ECS tasks and RDS  
✅ Security groups with minimal required access  
✅ Database credentials in Secrets Manager  
✅ Encrypted RDS storage  
✅ No public database access  
✅ IAM roles with least privilege  

### Production Recommendations

For production deployments, consider:

1. **HTTPS/SSL:**
   - Add ACM certificate
   - Configure ALB listener for HTTPS
   - Redirect HTTP to HTTPS

2. **Custom Domain:**
   - Register domain in Route 53
   - Create A record pointing to ALB
   - Add SSL certificate

3. **Multi-AZ:**
   - Enable RDS Multi-AZ
   - Use multiple NAT Gateways
   - Increase task count

4. **Monitoring:**
   - Set up CloudWatch alarms
   - Configure SNS notifications
   - Enable AWS X-Ray tracing

5. **Backups:**
   - Enable automated RDS backups
   - Configure backup retention
   - Test restore procedures

6. **WAF:**
   - Add AWS WAF to ALB
   - Configure rate limiting
   - Block malicious requests

---

## Troubleshooting

### Common Issues

**Issue: 503 Service Unavailable**
- Check if ECS tasks are running
- Verify health checks are passing
- Check CloudWatch logs for errors

**Issue: Database connection errors**
- Verify RDS security group allows ECS
- Check DATABASE_URL in Secrets Manager
- Ensure RDS is in available state

**Issue: Docker build fails**
- Ensure Docker is running
- Check available disk space
- Verify Dockerfile syntax

**Issue: Terraform apply fails**
- Check AWS credentials
- Verify region availability
- Review error messages in output

**Issue: Images not pulling in ECS**
- Verify ECR authentication
- Check image exists in ECR
- Ensure correct image digest/tag

---

## Support

For issues or questions:
1. Check CloudWatch logs
2. Review Terraform output
3. Verify AWS Console resources
4. Check this documentation

---

## Next Steps

After successful deployment:

1. ✅ Test the application in browser
2. ✅ Verify all features work
3. ✅ Monitor CloudWatch logs
4. ✅ Set up billing alerts
5. ✅ Plan for production deployment
6. ✅ Configure CI/CD pipeline
7. ✅ Add custom domain
8. ✅ Enable HTTPS

---

## Files Reference

- `deploy-to-aws.sh` - Automated deployment script
- `teardown-aws.sh` - Automated teardown script
- `terraform/` - Infrastructure as code
- `booking_system_backend/` - Backend application
- `booking_system_frontend/` - Frontend application
- `bob_artifacts/phase4-deployment-results.md` - Deployment results

---

**Last Updated:** 2026-03-17  
**Version:** 1.0