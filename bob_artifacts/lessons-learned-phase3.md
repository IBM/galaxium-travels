# Lessons Learned - Phase 3: Container Deployment to AWS

## Overview
This document captures all issues, challenges, and solutions encountered during Phase 3 of the AWS migration project (deploying Docker containers to ECS). Use these insights to create custom rules for future demos and implementations.

---

## Key Observation: Multiple Runtime Issues

Phase 3 encountered **5 major issues** that required troubleshooting and fixes. Unlike Phase 2 (configuration-only), this phase involved runtime dependencies, architecture compatibility, and service integration challenges.

---

## 1. Docker Architecture Mismatch (ARM64 vs AMD64)

### Issue
Docker images built on Apple Silicon (ARM64/M1/M2 Mac) failed to run on AWS ECS Fargate, which uses AMD64 architecture.

**Error in CloudWatch Logs:**
```
exec /usr/local/bin/python: exec format error
```

**ECS Task Status:**
```
STOPPED (CannotPullContainerError)
```

### Root Cause
- Docker on Apple Silicon builds ARM64 images by default
- AWS ECS Fargate only supports AMD64 (x86_64) architecture
- Image worked locally but failed in AWS

### Solution
Added `--platform linux/amd64` flag to all Docker build commands:

```bash
# Backend
docker build --platform linux/amd64 -f Dockerfile.prod -t booking-backend:latest .

# Frontend
docker build --platform linux/amd64 -f Dockerfile.prod -t booking-frontend:latest .
```

### Custom Rule Recommendation
```markdown
**Rule: Always Build for Target Architecture**

**For AWS ECS Fargate:**
- MUST use `--platform linux/amd64` flag
- Test locally with: `docker run --platform linux/amd64 image:tag`
- Add to CI/CD pipelines
- Document in deployment scripts

**For Multi-Architecture Support:**
- Use Docker buildx: `docker buildx build --platform linux/amd64,linux/arm64`
- Push manifest lists to support both architectures
- Test on both architectures before production

**Detection:**
- Check local architecture: `uname -m` (arm64 = Apple Silicon)
- Check image architecture: `docker inspect image:tag | grep Architecture`
- AWS Fargate: Always AMD64
- AWS Graviton: ARM64

**In Documentation:**
- Clearly state target architecture
- Provide platform-specific build commands
- Include troubleshooting for architecture mismatches
```

---

## 2. CloudWatch Log Groups - IAM Permission Issues

### Issue
ECS tasks failed to start with error:
```
ResourceInitializationError: failed to validate logger args: 
create stream has been retried 1 times: failed to create log stream: 
ResourceNotFoundException: The specified log group does not exist
```

### Root Cause
- ECS task execution role lacked `logs:CreateLogGroup` permission
- Task definition referenced log groups that didn't exist
- AWS expects log groups to be pre-created or role to have creation permissions

### Solution
Manually created CloudWatch log groups:
```bash
aws logs create-log-group \
  --log-group-name /ecs/galaxium-booking-backend \
  --region us-east-1

aws logs create-log-group \
  --log-group-name /ecs/galaxium-booking-frontend \
  --region us-east-1
```

### Better Solution (For Future)
Add to Terraform configuration:
```hcl
resource "aws_cloudwatch_log_group" "backend" {
  name              = "/ecs/galaxium-booking-backend"
  retention_in_days = 7
}

resource "aws_cloudwatch_log_group" "frontend" {
  name              = "/ecs/galaxium-booking-frontend"
  retention_in_days = 7
}
```

Or add IAM permission to task execution role:
```hcl
{
  "Effect": "Allow",
  "Action": [
    "logs:CreateLogGroup",
    "logs:CreateLogStream",
    "logs:PutLogEvents"
  ],
  "Resource": "arn:aws:logs:*:*:*"
}
```

### Custom Rule Recommendation
```markdown
**Rule: Pre-Create CloudWatch Log Groups**

**In Terraform:**
- Always create log groups as resources
- Set retention period (7-30 days for dev, 90+ for prod)
- Reference in ECS task definitions
- Ensures consistent naming and configuration

**IAM Permissions:**
- Task execution role needs:
  - `logs:CreateLogStream`
  - `logs:PutLogEvents`
- Optionally add `logs:CreateLogGroup` for dynamic creation
- Use least privilege: Scope to specific log group ARNs

**Monitoring:**
- Set up CloudWatch Insights queries
- Create alarms for error patterns
- Export logs to S3 for long-term storage
- Use log retention to control costs

**Troubleshooting:**
- Check log group exists: `aws logs describe-log-groups`
- Verify IAM permissions: `aws iam get-role-policy`
- Test with AWS CLI: `aws logs put-log-events`
```

---

## 3. API Routing Issue - FastAPI root_path Configuration

### Issue
Frontend could access the application but API calls failed with 404 errors.

**Browser Console:**
```
GET http://alb-dns/api/flights 404 Not Found
```

**Backend Logs:**
```
INFO: "GET /api/flights HTTP/1.1" 404 Not Found
```

### Root Cause
- ALB forwards requests to backend with `/api` prefix: `/api/flights`
- FastAPI backend expects routes without prefix: `/flights`
- Backend tried to match `/api/flights` but only had `/flights` route defined

### Solution
Added `root_path="/api"` to FastAPI application:

```python
# booking_system_backend/server.py
app = FastAPI(
    title="Galaxium Booking System API",
    root_path="/api"  # Tells FastAPI to expect /api prefix
)
```

This makes FastAPI:
- Accept requests at `/api/flights`
- Generate correct OpenAPI docs at `/api/docs`
- Handle path-based routing correctly

### Alternative Solutions Considered

**Option 1: ALB Path Rewriting (Not Available)**
- ALB doesn't support path rewriting like nginx
- Would need to use Lambda@Edge or API Gateway

**Option 2: Nginx Sidecar Container**
- Add nginx container to strip `/api` prefix
- More complex, additional container overhead
- Not necessary with `root_path` solution

**Option 3: Change Frontend API Calls**
- Remove `/api` prefix from frontend
- Backend would be directly accessible
- Less secure, breaks reverse proxy pattern

### Custom Rule Recommendation
```markdown
**Rule: Configure Application for Reverse Proxy Paths**

**For FastAPI:**
- Use `root_path` parameter when behind reverse proxy
- Set to the path prefix used by proxy: `root_path="/api"`
- Automatically updates OpenAPI docs and redirects
- No code changes needed in route definitions

**For Express.js:**
- Use `app.use('/api', router)` or
- Set `trust proxy` and check `X-Forwarded-Prefix` header

**For Django:**
- Set `FORCE_SCRIPT_NAME = '/api'` in settings
- Or use `SCRIPT_NAME` from WSGI environment

**For Spring Boot:**
- Set `server.servlet.context-path=/api` in application.properties

**Testing:**
- Test with curl through proxy: `curl http://alb/api/endpoint`
- Verify OpenAPI docs path: `http://alb/api/docs`
- Check all redirects work correctly
- Test both with and without trailing slashes

**Documentation:**
- Document the path prefix in API documentation
- Include in deployment guides
- Add to troubleshooting section
```

---

## 4. ECS Image Caching with :latest Tag

### Issue
After fixing issues and pushing new images, ECS continued to use old cached images with the same `:latest` tag.

### Root Cause
- Docker tags are mutable (`:latest` can point to different images)
- ECS caches images by tag
- Pushing new image with same tag doesn't trigger automatic update
- `force-new-deployment` alone doesn't guarantee new image pull

### Solution
Used image digests instead of tags in task definitions:

```bash
# Get image digest after push
BACKEND_DIGEST=$(aws ecr describe-images \
  --repository-name galaxium-booking-backend \
  --region us-east-1 \
  --query 'sort_by(imageDetails,& imagePushedAt)[-1].imageDigest' \
  --output text)

# Create new task definition with digest
aws ecs register-task-definition \
  --family galaxium-booking-backend \
  --image "$ECR_BASE/galaxium-booking-backend@$BACKEND_DIGEST"
```

### Why This Works
- Image digests are immutable (sha256:abc123...)
- Each new image has unique digest
- ECS must pull new image when digest changes
- No caching issues

### Custom Rule Recommendation
```markdown
**Rule: Use Image Digests for ECS Deployments**

**For Production:**
- Always use image digests, not tags
- Digest format: `repository@sha256:abc123...`
- Ensures exact image version is deployed
- Prevents caching issues

**Deployment Script Pattern:**
```bash
# 1. Build and push image
docker build --platform linux/amd64 -t image:latest .
docker push $ECR_URL/image:latest

# 2. Get digest of pushed image
DIGEST=$(aws ecr describe-images \
  --repository-name image \
  --query 'sort_by(imageDetails,& imagePushedAt)[-1].imageDigest' \
  --output text)

# 3. Create task definition with digest
aws ecs register-task-definition \
  --image "$ECR_URL/image@$DIGEST"

# 4. Update service with new task definition
aws ecs update-service \
  --task-definition new-revision \
  --force-new-deployment
```

**For Development:**
- Can use tags for faster iteration
- Use `--force-new-deployment` flag
- Consider using unique tags: `image:build-123`

**Best Practices:**
- Tag images with version numbers: `v1.2.3`
- Also tag with commit SHA: `git-abc123`
- Keep `:latest` for convenience
- Use digests in production task definitions
```

---

## 5. Bash Script Exit Behavior - Terminal Closing Issue

### Issue
The `teardown.sh` script caused the entire terminal window to close when run, making it impossible to see errors or results.

**User Report:**
```
"The terminal process terminated with exit code: 1"
"It just terminated the whole terminal window"
```

### Root Cause
Multiple issues in the script:
1. **`set -e` flag**: Caused script to exit on first error
2. **`exit 0` command**: Literally exited the shell process, closing terminal
3. **Complex error handling**: JSON parsing failures caused immediate exit
4. **Wrong shebang**: `#!/bin/bash` instead of `#!/usr/bin/env bash`

### Solution Evolution

**Attempt 1: Remove `set -e`**
- Removed `set -e` to continue on errors
- Still had terminal closing issue

**Attempt 2: Fix ECR image deletion**
- Simplified JSON parsing
- Added better error handling
- Still had terminal closing issue

**Attempt 3: Replace `exit` with `return`**
```bash
if [ "$CONFIRM" != "yes" ]; then
    echo "Teardown cancelled."
    return 0 2>/dev/null || :  # Won't close terminal
fi
```

**Final Solution: Simplify Everything**
```bash
#!/usr/bin/env bash
# Let Terraform do most of the work
# Only manually delete ECR images (Terraform can't delete non-empty repos)

# Delete ECR images
for REPO in backend frontend; do
    aws ecr batch-delete-image ... || true  # Continue on error
done

# Let Terraform destroy everything else
cd terraform
terraform destroy -auto-approve
```

### Custom Rule Recommendation
```markdown
**Rule: Bash Script Best Practices for Cleanup Scripts**

**Shebang:**
- Use `#!/usr/bin/env bash` for portability
- Not `#!/bin/bash` (may not exist on all systems)

**Error Handling:**
- DON'T use `set -e` in cleanup scripts
- Cleanup should be best-effort, not fail-fast
- Use `|| true` to continue on errors
- Log errors but don't stop execution

**Exit vs Return:**
- Use `return` instead of `exit` when possible
- `exit` closes the shell (terminal window)
- `return` only exits the script
- Pattern: `return 0 2>/dev/null || exit 0`

**Simplicity:**
- Let infrastructure tools (Terraform) do the work
- Don't manually delete what Terraform can delete
- Only handle special cases (non-empty ECR repos)
- Fewer commands = fewer failure points

**User Confirmation:**
```bash
read -p "Are you sure? (type 'yes'): " CONFIRM
if [ "$CONFIRM" != "yes" ]; then
    echo "Cancelled."
    return 0 2>/dev/null || :
fi
```

**Testing:**
- Test in a subshell: `bash script.sh`
- Don't test by sourcing: `source script.sh`
- Test cancellation path
- Test with missing resources
- Verify terminal stays open on errors
```

---

## 6. Deployment Automation Script Creation

### Success Story
Created `deploy.sh` script that automates the entire deployment process.

### Key Features
```bash
#!/usr/bin/env bash
set -e  # OK for deployment (want to stop on errors)

# 1. Authenticate to ECR
aws ecr get-login-password | docker login ...

# 2. Build with correct architecture
docker build --platform linux/amd64 ...

# 3. Push to ECR
docker push $ECR_URL/image:latest

# 4. Get image digest
DIGEST=$(aws ecr describe-images ...)

# 5. Create new task definition with digest
aws ecs register-task-definition --image "...@$DIGEST"

# 6. Update ECS service
aws ecs update-service --force-new-deployment
```

### Custom Rule Recommendation
```markdown
**Rule: Deployment Script Best Practices**

**Structure:**
1. Authentication
2. Build (with platform flag)
3. Push to registry
4. Get image digest
5. Update task definition
6. Update service
7. Monitor deployment

**Error Handling:**
- Use `set -e` for deployment scripts (fail fast)
- Validate prerequisites (AWS CLI, Docker, credentials)
- Check for required environment variables
- Provide clear error messages

**Idempotency:**
- Script should be safe to run multiple times
- Don't fail if resources already exist
- Use `--force-new-deployment` flag

**Logging:**
- Echo each major step
- Show progress indicators
- Capture important outputs (URLs, digests)
- Log to file for debugging

**Validation:**
- Check AWS credentials before starting
- Verify Docker is running
- Confirm terraform outputs exist
- Test ECR authentication

**Documentation:**
- Add comments explaining each step
- Document required environment variables
- Include example usage
- Add troubleshooting section
```

---

## Summary of Key Takeaways

### Issues Encountered (5 Major):
1. ❌ Docker architecture mismatch (ARM64 vs AMD64)
2. ❌ CloudWatch log groups not created
3. ❌ API routing with ALB path prefix
4. ❌ ECS image caching with :latest tags
5. ❌ Bash script exit behavior

### Time Impact:
- Estimated: 1 day
- Actual: ~2 days (with troubleshooting)
- Main delays: Architecture issue, API routing debugging

### What Worked Well:
1. ✅ Terraform infrastructure was solid (Phase 2 success)
2. ✅ Docker images built correctly locally
3. ✅ ECR authentication straightforward
4. ✅ ECS service updates worked as expected
5. ✅ Created reusable deployment scripts

### What Could Be Improved:
1. ⚠️ Test architecture compatibility earlier
2. ⚠️ Pre-create CloudWatch log groups in Terraform
3. ⚠️ Document reverse proxy configuration requirements
4. ⚠️ Use image digests from the start
5. ⚠️ Test scripts in clean environment

---

## Recommended Custom Rules for Future Demos

```markdown
# Custom Rules for AWS ECS Container Deployment

## Pre-Deployment Checklist
- [ ] Check local architecture: `uname -m`
- [ ] Add `--platform linux/amd64` to all Docker builds
- [ ] Test images locally with platform flag
- [ ] Create CloudWatch log groups in Terraform
- [ ] Configure application for reverse proxy paths
- [ ] Document all environment variables needed

## Docker Build Commands
```bash
# Always specify platform for AWS
docker build --platform linux/amd64 -f Dockerfile.prod -t image:latest .

# Test locally with same platform
docker run --platform linux/amd64 -p 8080:8080 image:latest

# Verify architecture
docker inspect image:latest | grep Architecture
```

## ECS Deployment Pattern
```bash
# 1. Build and push
docker build --platform linux/amd64 -t image:latest .
docker push $ECR_URL/image:latest

# 2. Get digest (not tag!)
DIGEST=$(aws ecr describe-images \
  --repository-name image \
  --query 'sort_by(imageDetails,& imagePushedAt)[-1].imageDigest' \
  --output text)

# 3. Register task definition with digest
aws ecs register-task-definition \
  --family task-family \
  --image "$ECR_URL/image@$DIGEST"

# 4. Update service
aws ecs update-service \
  --cluster cluster-name \
  --service service-name \
  --force-new-deployment
```

## Application Configuration
- FastAPI: Add `root_path="/api"` parameter
- Express: Use `app.use('/api', router)`
- Django: Set `FORCE_SCRIPT_NAME = '/api'`
- Spring Boot: Set `server.servlet.context-path=/api`

## Terraform Additions
```hcl
# Always create log groups
resource "aws_cloudwatch_log_group" "app" {
  name              = "/ecs/app-name"
  retention_in_days = 7
}

# Reference in task definition
log_configuration {
  logDriver = "awslogs"
  options = {
    "awslogs-group"         = aws_cloudwatch_log_group.app.name
    "awslogs-region"        = var.aws_region
    "awslogs-stream-prefix" = "ecs"
  }
}
```

## Cleanup Scripts
- Use `#!/usr/bin/env bash`
- Don't use `set -e` in cleanup scripts
- Use `return` instead of `exit`
- Let Terraform handle most cleanup
- Only manually delete what Terraform can't (ECR images)

## Monitoring
- Check ECS service status: `aws ecs describe-services`
- View CloudWatch logs: `aws logs tail /ecs/app-name --follow`
- Check ALB target health: `aws elbv2 describe-target-health`
- Monitor task status: `aws ecs list-tasks`

## Troubleshooting Commands
```bash
# Check task failures
aws ecs describe-tasks --cluster cluster --tasks task-id

# View logs
aws logs tail /ecs/app-name --follow --since 10m

# Check image architecture
docker inspect image:tag | grep Architecture

# Test API directly
curl http://alb-dns/api/endpoint

# Force new deployment
aws ecs update-service --force-new-deployment
```
```

---

## Files Modified/Created

### Modified:
- `booking_system_backend/server.py` - Added `root_path="/api"`
- `booking_system_frontend/nginx.conf` - Simplified (removed backend proxy)

### Created:
- `deploy.sh` - Automated deployment script
- `teardown.sh` - Infrastructure cleanup script
- `bob_artifacts/lessons-learned-phase3.md` - This document

### Manual AWS Operations:
- Created CloudWatch log groups (should be in Terraform)
- Registered task definitions with image digests
- Updated ECS services

---

## Comparison: All Phases

| Aspect | Phase 1 (Docker) | Phase 2 (Terraform) | Phase 3 (Deploy) |
|--------|------------------|---------------------|------------------|
| Issues | 10 major | 0 major | 5 major |
| Time Overrun | +50% | -6% | +100% |
| Debugging | Extensive | None | Extensive |
| Predictability | Low | High | Medium |
| Type | Runtime | Configuration | Runtime + Integration |

### Key Insights:
1. **Configuration-only tasks are most predictable** (Phase 2)
2. **Runtime tasks require extensive testing** (Phases 1 & 3)
3. **Integration issues are hardest to predict** (Phase 3)
4. **Architecture compatibility must be tested early**
5. **Automation scripts save time on repeated deployments**

---

## Recommendations for Phase 4 (Database Migration)

Based on all three phases:

1. **Test database connectivity from ECS first**
   - Use `psql` or Python script to verify connection
   - Check security groups allow traffic
   - Verify RDS is accessible from private subnets

2. **Run migrations in a one-off ECS task**
   - Don't run migrations in application startup
   - Use `aws ecs run-task` for migration task
   - Monitor CloudWatch logs during migration

3. **Backup database before migration**
   - Create RDS snapshot
   - Document rollback procedure
   - Test restore process

4. **Use environment variables for database URL**
   - Already configured in Phase 1
   - Verify in ECS task definition
   - Test connection string format

5. **Monitor application logs after migration**
   - Check for database errors
   - Verify all queries work
   - Test all API endpoints

---

## Cost Analysis

### Actual Costs Incurred:
- ECS Fargate tasks (2 tasks, 256 CPU, 512 MB): ~$0.04/hour
- Data transfer (ECR pulls): ~$0.01/GB
- CloudWatch Logs: ~$0.50/GB ingested
- **Total for testing: ~$5-10**

### Ongoing Costs (if left running):
- Infrastructure (from Phase 2): ~$78/month
- ECS tasks: ~$30/month
- Data transfer: ~$5/month
- **Total: ~$113/month**

### Cost Optimization:
- Stop ECS services when not in use
- Use smaller task sizes (256 CPU, 512 MB minimum)
- Set CloudWatch log retention to 7 days
- Delete old ECR images
- **Use teardown.sh to delete everything when done!**

---

## Final Checklist for Production Deployment

- [ ] Build images with `--platform linux/amd64`
- [ ] Test images locally with platform flag
- [ ] Create CloudWatch log groups in Terraform
- [ ] Configure application `root_path` for ALB
- [ ] Use image digests in task definitions
- [ ] Set up proper health check endpoints
- [ ] Configure auto-scaling policies
- [ ] Set up CloudWatch alarms
- [ ] Document deployment process
- [ ] Create rollback procedure
- [ ] Test disaster recovery
- [ ] Set up monitoring dashboards
- [ ] Configure log aggregation
- [ ] Implement secrets management
- [ ] Set up CI/CD pipeline
- [ ] Document troubleshooting steps

---

*Document created: 2026-03-12*
*Phase: 3 - Container Deployment to AWS*
*Status: Complete*
*Issues Encountered: 5 major*
*Time: 2x estimate (100% overrun)*
*Deployment: Successful*
*Application Status: Running and accessible*