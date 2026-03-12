# Terraform Infrastructure for Galaxium Booking System

This directory contains Terraform configuration for deploying the Galaxium Booking System to AWS.

## Architecture

- **VPC**: Custom VPC with public and private subnets across 2 availability zones
- **RDS**: PostgreSQL 15 database in private subnets
- **ECR**: Container registries for frontend and backend images
- **ECS**: Fargate cluster running containerized applications
- **ALB**: Application Load Balancer for routing traffic

## Prerequisites

1. **AWS CLI** installed and configured:
   ```bash
   aws configure
   ```

2. **Terraform** installed (v1.0+):
   ```bash
   terraform version
   ```

3. **Docker images** built and ready (from Phase 1)

## Setup Instructions

### 1. Configure Variables

Edit `terraform.tfvars` and set a secure database password:

```hcl
aws_region   = "us-east-1"
project_name = "galaxium-booking"
db_password  = "YourSecurePassword123!"  # Change this!
```

**Important**: Never commit `terraform.tfvars` to version control (it's already in .gitignore).

### 2. Initialize Terraform

```bash
cd terraform
terraform init
```

This downloads the AWS provider and initializes the backend.

### 3. Review the Plan

```bash
terraform plan
```

Review the resources that will be created. You should see:
- 1 VPC
- 4 Subnets (2 public, 2 private)
- 1 Internet Gateway
- 1 NAT Gateway
- 3 Security Groups
- 1 RDS PostgreSQL instance
- 2 ECR repositories
- 1 ECS cluster
- 1 Application Load Balancer
- 2 Target Groups
- 2 ECS Task Definitions
- 2 ECS Services
- IAM roles and policies

### 4. Apply the Configuration

```bash
terraform apply
```

Type `yes` when prompted. This will take 10-15 minutes to complete.

### 5. Capture Outputs

After successful deployment, note these important values:

```bash
terraform output alb_dns_name      # Load balancer URL
terraform output ecr_frontend_url  # Frontend ECR repository
terraform output ecr_backend_url   # Backend ECR repository
terraform output rds_endpoint      # Database endpoint
```

## Resource Details

### Networking

- **VPC CIDR**: 10.0.0.0/16
- **Public Subnets**: 10.0.1.0/24, 10.0.2.0/24
- **Private Subnets**: 10.0.10.0/24, 10.0.11.0/24

### Database

- **Engine**: PostgreSQL 15
- **Instance**: db.t3.micro
- **Storage**: 20GB gp3
- **Location**: Private subnets (not publicly accessible)

### ECS Configuration

- **Launch Type**: Fargate
- **CPU**: 256 (0.25 vCPU)
- **Memory**: 512 MB
- **Desired Count**: 1 task per service

### Load Balancer

- **Type**: Application Load Balancer
- **Scheme**: Internet-facing
- **Routing**:
  - `/` → Frontend (port 80)
  - `/api/*` → Backend (port 8080)

## Cost Estimation

Approximate monthly costs (us-east-1):
- RDS db.t3.micro: ~$15
- NAT Gateway: ~$32
- ALB: ~$16
- ECS Fargate (2 tasks): ~$15
- **Total**: ~$78/month

## Troubleshooting

### AWS Credentials

Verify your AWS credentials:
```bash
aws sts get-caller-identity
```

### Region Availability

Some regions may not have all instance types. If you encounter errors, try:
- Changing `aws_region` in `terraform.tfvars`
- Using a different RDS instance class

### Service Quotas

Check your AWS service quotas:
```bash
aws service-quotas list-service-quotas --service-code vpc
aws service-quotas list-service-quotas --service-code rds
```

### RDS Creation Time

RDS instance creation typically takes 10-15 minutes. Check status in AWS Console if needed.

## Cleanup

To destroy all resources:

```bash
terraform destroy
```

**Warning**: This will delete all resources including the database. Make sure to backup any important data first.

## Next Steps

After infrastructure is deployed:
1. Push Docker images to ECR (Phase 3)
2. Update ECS task definitions with new image tags
3. Run database migrations (Phase 4)
4. Access application via ALB DNS name

## Files

- `main.tf`: Main infrastructure configuration
- `variables.tf`: Input variable definitions
- `outputs.tf`: Output value definitions
- `terraform.tfvars`: Variable values (gitignored)
- `.terraform/`: Terraform working directory (gitignored)
- `*.tfstate`: State files (gitignored)