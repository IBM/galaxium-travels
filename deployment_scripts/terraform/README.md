# Galaxium Booking System - Terraform Infrastructure

This directory contains the complete Infrastructure as Code (IaC) configuration for deploying the Galaxium Booking System to AWS.

## Architecture Overview

- **VPC**: Custom VPC with public and private subnets across 2 availability zones
- **NAT Gateway**: Single NAT Gateway for cost optimization (configurable)
- **ECS Fargate**: Containerized backend and frontend services
- **ALB**: Application Load Balancer for routing traffic
- **ECR**: Container image repositories
- **CloudWatch**: Centralized logging
- **Auto-Scaling**: Scale-to-zero support for ECS services

The backend uses an **embedded SQLite** database (no external database service). Demo data is seeded on each task startup.

## Prerequisites

1. **AWS CLI** configured with appropriate credentials
2. **Terraform** >= 1.0 installed
3. **Docker images** built and ready to push to ECR

## Quick Start

### 1. Initialize Terraform

```bash
cd terraform
terraform init
```

### 2. Configure Variables

```bash
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars with your specific values
```

### 3. Validate Configuration

```bash
terraform validate
terraform fmt -recursive
```

### 4. Plan Deployment

```bash
terraform plan -out=tfplan
```

Review the plan carefully to understand what resources will be created.

### 5. Apply Configuration

```bash
terraform apply tfplan
```

This will create all AWS resources. The process takes approximately 5-10 minutes.

### 6. Save Outputs

```bash
terraform output > outputs.txt
terraform output -json > outputs.json
```

## Important Outputs

After deployment, you'll receive:

- `alb_url`: The public URL to access your application
- `ecr_backend_repository_url`: ECR repository for backend images
- `ecr_frontend_repository_url`: ECR repository for frontend images
- `ecs_cluster_name`: ECS cluster name for deployments

## Configuration Files

- `main.tf`: Provider and Terraform configuration
- `variables.tf`: Input variable definitions
- `vpc.tf`: VPC, subnets, NAT Gateway, routing
- `security_groups.tf`: Security group rules
- `ecr.tf`: Container registries
- `ecs.tf`: ECS cluster, task definitions, services
- `alb.tf`: Application Load Balancer and routing
- `cloudwatch.tf`: Log groups
- `iam.tf`: IAM roles and policies
- `autoscaling.tf`: ECS auto-scaling and scale-to-zero
- `outputs.tf`: Output values

## Cost Optimization

For development environments:

- Single NAT Gateway (~$32/month)
- 256 CPU / 512 MB memory for ECS tasks
- 7-day CloudWatch log retention
- Scale-to-zero when idle (ECS costs drop to $0)

Baseline idle costs (ALB + NAT) are ~$48/month even with zero running tasks.

## Cleanup

To destroy all resources:

```bash
terraform destroy
```

**Warning**: This will delete all resources. Data in SQLite containers is ephemeral anyway.

## Security Notes

- ECS tasks run in private subnets
- Security groups follow the principle of least privilege
- No external database to secure (SQLite is embedded)

## Troubleshooting

### NAT Gateway Issues

If ECS tasks can't pull images from ECR, verify:
- NAT Gateway is created and associated with private subnets
- Route tables are correctly configured
- Security groups allow outbound traffic

### ECS Task Failures

Check CloudWatch logs:
```bash
aws logs tail /ecs/galaxium-booking-backend --follow
aws logs tail /ecs/galaxium-booking-frontend --follow
```

## Next Steps

After infrastructure is deployed:
1. Push Docker images to ECR repositories
2. Update ECS services to use new images
3. Test the application via the ALB URL
