# AWS Cost Optimization Guide for Galaxium Travels

This guide provides strategies to minimize AWS costs for the Galaxium Travels demo deployment.

## Current Architecture Costs (Approximate)

### Running 24/7
- **ECS Fargate Tasks**: ~$10-15/month (2 tasks @ 0.25 vCPU, 0.5 GB RAM)
- **RDS PostgreSQL (db.t3.micro)**: ~$15-20/month
- **Application Load Balancer**: ~$16/month
- **NAT Gateway**: ~$32/month
- **Data Transfer**: ~$5-10/month
- **ECR Storage**: ~$1/month
- **CloudWatch Logs**: ~$1-2/month

**Total: ~$80-96/month**

## Implemented: Auto-Scaling to Zero

### What's Configured
The deployment now includes automatic scaling policies:

1. **Target Tracking Scaling**
   - Scales based on ALB request count per target
   - Target: 100 requests per target
   - Scale out: 60 seconds cooldown
   - Scale in: 300 seconds (5 minutes) cooldown

2. **Scheduled Scaling**
   - **Scale Down**: Daily at 2 AM UTC (sets min/max to 0)
   - **Scale Up**: Daily at 8 AM UTC (sets min to 0, max to 4)

3. **Manual Control Scripts**
   - `./scale-to-zero.sh` - Immediately scale services to zero
   - `./scale-up.sh` - Scale services back to desired count

### Cost Savings with Scale-to-Zero
- **ECS costs**: $0 when scaled to zero
- **Estimated savings**: ~$10-15/month if scaled down 12+ hours/day
- **Cold start time**: 30-60 seconds when traffic arrives

### How It Works
1. When no traffic for 5+ minutes, services scale down
2. Scheduled action scales to zero at 2 AM UTC
3. First request after scale-down triggers auto-scaling
4. New tasks start within 30-60 seconds
5. Scheduled action allows scaling at 8 AM UTC

## Additional Cost Optimization Options

### Option 1: Use SQLite Instead of RDS (Cheapest)
**Savings**: ~$15-20/month

**Trade-offs**:
- Data lost on container restart
- Single instance only (no scaling)
- Good for: Short demos (few hours)

**Implementation**:
1. Modify backend to use SQLite
2. Remove RDS from Terraform
3. Redeploy

### Option 2: PostgreSQL Container with EFS
**Savings**: ~$12-17/month (RDS → EFS)

**Benefits**:
- Data persists across restarts
- ~$3-5/month for EFS storage
- Can still scale containers

**Trade-offs**:
- Slightly slower than RDS
- Manual backup management

**Implementation**:
1. Create EFS file system in Terraform
2. Mount EFS volume to ECS task
3. Run PostgreSQL container with data on EFS
4. Remove RDS resources

### Option 3: Aurora Serverless v2
**Savings**: Variable, ~$0 when paused

**Benefits**:
- Auto-pauses after inactivity
- Resumes in ~15 seconds
- Scales with load

**Costs**:
- ~$0.12/hour when active
- ~$0.10/day minimum (storage)
- Good for: Intermittent use

**Trade-offs**:
- Cold start delay
- Minimum capacity charges

### Option 4: Remove NAT Gateway
**Savings**: ~$32/month

**Implementation**:
1. Use VPC endpoints for AWS services
2. Or: Use public subnets with public IPs (less secure)

**Trade-offs**:
- VPC endpoints add ~$7/month per service
- Public IPs expose containers (not recommended)

### Option 5: Use Fargate Spot
**Savings**: ~30-70% on ECS costs

**Implementation**:
Add to ECS service:
```hcl
capacity_provider_strategy {
  capacity_provider = "FARGATE_SPOT"
  weight           = 100
}
```

**Trade-offs**:
- Tasks can be interrupted
- Not suitable for production
- Fine for demos

## Recommended Demo Configuration

### For Short Demos (Few Hours)
1. Use current setup with auto-scaling
2. Manually scale to zero after demo: `./scale-to-zero.sh`
3. **Cost**: ~$0.50-1.00 per demo session

### For Multi-Day Demos
1. Keep current RDS setup
2. Use scheduled scaling (already configured)
3. Scale to zero overnight
4. **Cost**: ~$40-50/month

### For Minimal Cost (Acceptable Trade-offs)
1. Replace RDS with PostgreSQL on EFS
2. Remove NAT Gateway, use VPC endpoints
3. Use Fargate Spot
4. Enable auto-scaling to zero
5. **Cost**: ~$25-30/month

## Cost Monitoring

### View Current Costs
```bash
aws ce get-cost-and-usage \
  --time-period Start=2026-04-01,End=2026-04-07 \
  --granularity DAILY \
  --metrics BlendedCost \
  --group-by Type=SERVICE
```

### Set Up Cost Alerts
1. Go to AWS Billing Console
2. Create Budget
3. Set threshold (e.g., $50/month)
4. Configure email alerts

## Quick Cost Reduction Checklist

- [ ] Enable auto-scaling to zero (✓ Already done)
- [ ] Scale to zero when not in use: `./scale-to-zero.sh`
- [ ] Consider PostgreSQL on EFS instead of RDS
- [ ] Evaluate NAT Gateway necessity
- [ ] Use Fargate Spot for non-critical workloads
- [ ] Set up cost alerts
- [ ] Review CloudWatch log retention (currently 7 days)
- [ ] Clean up old ECR images (lifecycle policy active)

## Teardown

To completely remove all resources and stop all charges:
```bash
./teardown-aws.sh
```

This will:
1. Scale services to zero
2. Delete all ECR images
3. Destroy all Terraform resources
4. Backup Terraform state

**Time to teardown**: ~5-10 minutes
**Cost after teardown**: $0

## Summary

| Configuration | Monthly Cost | Best For |
|--------------|--------------|----------|
| Current (24/7) | $80-96 | Always-on demos |
| With Auto-Scale | $40-50 | Regular use |
| Minimal (EFS+Spot) | $25-30 | Budget-conscious |
| Scale-to-Zero | $0.50-1/session | Occasional demos |

**Recommendation**: Use the current auto-scaling setup and manually scale to zero between demos for optimal cost/convenience balance.