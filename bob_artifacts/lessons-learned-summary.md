# Critical Lessons Learned - AWS Migration Project

## Docker & Architecture
- **ALWAYS use `--platform linux/amd64`** for AWS ECS builds (Apple Silicon builds ARM64 by default)
- Test images locally with platform flag before pushing to ECR
- Use image digests (`@sha256:...`) not tags (`:latest`) in ECS task definitions to avoid caching issues

## Application Configuration
- Configure apps for reverse proxy paths: FastAPI needs `root_path="/api"`, Express needs `app.use('/api', router)`
- Pre-create CloudWatch log groups in Terraform (don't rely on auto-creation)
- Use environment variables for all configuration (DATABASE_URL, API endpoints)

## Terraform Best Practices
- Private subnets with compute MUST have NAT Gateway for internet access (ECR pulls, CloudWatch logs)
- Always create CloudWatch log groups as Terraform resources with retention policies
- Use security group references, never `0.0.0.0/0` for internal services
- Mark sensitive variables with `sensitive = true`

## Deployment Scripts
- Use `#!/usr/bin/env bash` not `#!/bin/bash`
- Cleanup scripts: DON'T use `set -e`, use `|| true` to continue on errors
- Use `return` instead of `exit` to avoid closing terminal windows
- Let Terraform handle cleanup; only manually delete what it can't (ECR images in non-empty repos)

## Testing Workflow
1. Test backend API directly first
2. Test reverse proxy second
3. Check CloudWatch logs
4. Test in browser last
- Budget 50-100% extra time for runtime/integration issues vs configuration-only tasks

## Cost Management
- Use smallest viable sizes for demos (db.t3.micro, 256 CPU/512 MB)
- Single NAT Gateway for dev (~$32/month), multi-AZ for production
- Set CloudWatch log retention to 7 days for dev
- **Always tear down demo infrastructure when done!**