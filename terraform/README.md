# Galaxium Travels - Terraform Infrastructure

This directory contains Terraform configurations to provision and manage all AWS infrastructure for the Galaxium Travels booking system.

## 📋 Prerequisites

- [Terraform](https://www.terraform.io/downloads.html) >= 1.0
- [AWS CLI](https://aws.amazon.com/cli/) configured with appropriate credentials
- AWS account with necessary permissions
- Docker images built and ready to push to ECR

## 🏗️ Infrastructure Components

This Terraform configuration creates:

- **VPC & Networking**: VPC with public, private, and database subnets across 2 AZs
- **Application Load Balancer**: Internet-facing ALB with HTTP/HTTPS listeners
- **ECS Cluster**: Fargate-based ECS cluster for containerized applications
- **RDS Database**: PostgreSQL 15.4 database instance
- **ECR Repositories**: Container registries for frontend and backend images
- **Security Groups**: Network security rules for ALB, ECS, and RDS
- **IAM Roles**: Task execution and task roles for ECS
- **CloudWatch**: Log groups and metric alarms for monitoring

## 📁 File Structure

```
terraform/
├── main.tf                 # Provider and main configuration
├── variables.tf            # Input variables
├── outputs.tf              # Output values
├── backend.tf              # Remote state configuration (commented)
├── vpc.tf                  # VPC and networking resources
├── security_groups.tf      # Security group rules
├── alb.tf                  # Application Load Balancer
├── ecs.tf                  # ECS cluster and services
├── rds.tf                  # RDS database
├── ecr.tf                  # Container registries
├── iam.tf                  # IAM roles and policies
├── cloudwatch.tf           # Logging and monitoring
├── terraform.tfvars.example # Example variable values
└── README.md               # This file
```

## 🚀 Quick Start

### 1. Configure Variables

Copy the example variables file and customize it:

```bash
cp terraform.tfvars.example terraform.tfvars
```

Edit `terraform.tfvars` with your values:

```hcl
aws_region  = "us-east-1"
environment = "prod"
project_name = "galaxium-travels"

# Database credentials (use strong passwords!)
db_username = "galaxium_admin"
db_password = "your-strong-password-here"
db_name     = "galaxium_db"

# Docker image tags
frontend_image_tag = "latest"
backend_image_tag  = "latest"
```

**Important**: Never commit `terraform.tfvars` to version control. It's already in `.gitignore`.

### 2. Initialize Terraform

```bash
cd terraform
terraform init
```

### 3. Validate Configuration

```bash
terraform validate
```

### 4. Format Code

```bash
terraform fmt -recursive
```

### 5. Plan Deployment

```bash
terraform plan -out=tfplan
```

Review the plan carefully to understand what resources will be created.

### 6. Apply Configuration

```bash
terraform apply tfplan
```

This will create all AWS resources. The process takes approximately 15-20 minutes.

### 7. Get Outputs

After successful deployment:

```bash
terraform output
```

Important outputs:
- `alb_dns_name`: DNS name of the load balancer
- `alb_url`: URL to access the application
- `ecr_frontend_repository_url`: ECR URL for frontend images
- `ecr_backend_repository_url`: ECR URL for backend images
- `ecs_cluster_name`: Name of the ECS cluster

## 🔐 Security Best Practices

### Sensitive Variables

The following variables are marked as sensitive:
- `db_username`
- `db_password`
- `rds_endpoint` (output)

These values won't be displayed in logs or console output.

### Secrets Management

For production environments, consider using:
- **AWS Secrets Manager** for database credentials
- **AWS Systems Manager Parameter Store** for configuration
- **Environment variables** in ECS task definitions

### Network Security

- RDS is in private subnets with no public access
- ECS tasks run in private subnets
- Only ALB is publicly accessible
- Security groups follow least-privilege principle

## 📊 Cost Estimation

Approximate monthly costs (us-east-1):

| Resource | Configuration | Est. Cost |
|----------|--------------|-----------|
| ECS Fargate (Frontend) | 2 tasks, 0.25 vCPU, 0.5 GB | ~$15 |
| ECS Fargate (Backend) | 2 tasks, 0.5 vCPU, 1 GB | ~$30 |
| RDS PostgreSQL | db.t3.micro, 20 GB | ~$15 |
| Application Load Balancer | Standard | ~$20 |
| NAT Gateways | 2 gateways | ~$65 |
| Data Transfer | Varies | ~$10 |
| **Total** | | **~$155/month** |

**Note**: Costs vary based on usage, data transfer, and region.

### Cost Optimization Tips

1. **NAT Gateways**: Most expensive component. Consider:
   - Using a single NAT Gateway (reduces HA)
   - VPC endpoints for AWS services
   - NAT instances for dev/test environments

2. **RDS**: 
   - Use `db.t3.micro` for development
   - Enable Multi-AZ only for production
   - Adjust backup retention period

3. **ECS**:
   - Reduce task count for non-production
   - Use Fargate Spot for cost savings
   - Right-size CPU and memory

## 🔄 Remote State (Optional)

For team collaboration, configure remote state storage:

### 1. Create S3 Bucket and DynamoDB Table

```bash
# Create S3 bucket for state
aws s3api create-bucket \
  --bucket galaxium-travels-terraform-state \
  --region us-east-1

# Enable versioning
aws s3api put-bucket-versioning \
  --bucket galaxium-travels-terraform-state \
  --versioning-configuration Status=Enabled

# Create DynamoDB table for state locking
aws dynamodb create-table \
  --table-name galaxium-travels-terraform-locks \
  --attribute-definitions AttributeName=LockID,AttributeType=S \
  --key-schema AttributeName=LockID,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region us-east-1
```

### 2. Uncomment Backend Configuration

Edit `backend.tf` and uncomment the backend configuration:

```hcl
terraform {
  backend "s3" {
    bucket         = "galaxium-travels-terraform-state"
    key            = "prod/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "galaxium-travels-terraform-locks"
  }
}
```

### 3. Migrate State

```bash
terraform init -migrate-state
```

## 🔧 Common Operations

### Update ECS Service with New Image

```bash
# Update image tag variable
terraform apply -var="backend_image_tag=v1.2.3"
```

### Scale ECS Services

Edit the `desired_count` in `ecs.tf` and apply:

```bash
terraform apply
```

### View Current State

```bash
terraform show
```

### List Resources

```bash
terraform state list
```

### Destroy Infrastructure

**Warning**: This will delete all resources!

```bash
terraform destroy
```

## 📝 Variables Reference

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `aws_region` | AWS region | `us-east-1` | No |
| `environment` | Environment name | `prod` | No |
| `project_name` | Project name | `galaxium-travels` | No |
| `vpc_cidr` | VPC CIDR block | `10.0.0.0/16` | No |
| `db_username` | Database username | - | Yes |
| `db_password` | Database password | - | Yes |
| `db_name` | Database name | `galaxium_db` | No |
| `frontend_image_tag` | Frontend image tag | `latest` | No |
| `backend_image_tag` | Backend image tag | `latest` | No |
| `domain_name` | Custom domain | `""` | No |
| `certificate_arn` | ACM certificate ARN | `""` | No |

## 🎯 Outputs Reference

| Output | Description | Sensitive |
|--------|-------------|-----------|
| `alb_dns_name` | ALB DNS name | No |
| `alb_url` | Application URL | No |
| `rds_endpoint` | Database endpoint | Yes |
| `ecr_frontend_repository_url` | Frontend ECR URL | No |
| `ecr_backend_repository_url` | Backend ECR URL | No |
| `ecs_cluster_name` | ECS cluster name | No |
| `vpc_id` | VPC ID | No |

## 🐛 Troubleshooting

### Issue: "Error creating ECS Service"

**Cause**: Task definition references non-existent Docker images.

**Solution**: Build and push Docker images to ECR first:

```bash
# Get ECR login
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin <account-id>.dkr.ecr.us-east-1.amazonaws.com

# Build and push images
docker build -t <ecr-url>:latest ./booking_system_frontend
docker push <ecr-url>:latest
```

### Issue: "Error creating RDS instance"

**Cause**: Database password doesn't meet complexity requirements.

**Solution**: Use a strong password with:
- At least 8 characters
- Mix of uppercase, lowercase, numbers, and symbols
- No special characters: `/ @ " '`

### Issue: "Insufficient capacity"

**Cause**: AWS doesn't have enough Fargate capacity in the selected AZs.

**Solution**: 
- Wait and retry
- Try a different region
- Use EC2 launch type instead of Fargate

## 📚 Additional Resources

- [Terraform AWS Provider Documentation](https://registry.terraform.io/providers/hashicorp/aws/latest/docs)
- [AWS ECS Best Practices](https://docs.aws.amazon.com/AmazonECS/latest/bestpracticesguide/intro.html)
- [AWS Well-Architected Framework](https://aws.amazon.com/architecture/well-architected/)

## 🤝 Contributing

When making changes to Terraform configurations:

1. Always run `terraform fmt` before committing
2. Run `terraform validate` to check syntax
3. Test changes in a non-production environment first
4. Document any new variables or outputs
5. Update this README if adding new resources

## 📄 License

This infrastructure code is part of the Galaxium Travels project.