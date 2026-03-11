# Phase 5: Post-Deployment

## Overview
Configure monitoring, security, backups, and operational procedures for the production AWS environment.

**Duration:** 1-2 days  
**Prerequisites:** [Phase 4: Deployment Steps](./phase-4-deployment-steps.md) complete  
**Status:** Final Phase

---

## Objectives

- [ ] Set up monitoring and alerting
- [ ] Configure automated backups
- [ ] Implement security hardening
- [ ] Create operational runbooks
- [ ] Set up cost monitoring
- [ ] Document maintenance procedures
- [ ] Train team on operations

---

## 1. Monitoring and Alerting

### 1.1 CloudWatch Dashboards

**File:** `terraform/cloudwatch.tf`

```hcl
# CloudWatch Dashboard
resource "aws_cloudwatch_dashboard" "main" {
  dashboard_name = "${var.project_name}-dashboard"

  dashboard_body = jsonencode({
    widgets = [
      {
        type = "metric"
        properties = {
          metrics = [
            ["AWS/ECS", "CPUUtilization", { stat = "Average" }],
            [".", "MemoryUtilization", { stat = "Average" }]
          ]
          period = 300
          stat   = "Average"
          region = var.aws_region
          title  = "ECS Resource Utilization"
        }
      },
      {
        type = "metric"
        properties = {
          metrics = [
            ["AWS/ApplicationELB", "TargetResponseTime", { stat = "Average" }],
            [".", "RequestCount", { stat = "Sum" }]
          ]
          period = 300
          region = var.aws_region
          title  = "ALB Performance"
        }
      },
      {
        type = "metric"
        properties = {
          metrics = [
            ["AWS/RDS", "CPUUtilization", { stat = "Average" }],
            [".", "DatabaseConnections", { stat = "Average" }],
            [".", "FreeStorageSpace", { stat = "Average" }]
          ]
          period = 300
          region = var.aws_region
          title  = "RDS Metrics"
        }
      }
    ]
  })
}
```

### 1.2 CloudWatch Alarms

**File:** `terraform/alarms.tf`

```hcl
# SNS Topic for Alarms
resource "aws_sns_topic" "alarms" {
  name = "${var.project_name}-alarms"

  tags = {
    Name = "${var.project_name}-alarms"
  }
}

resource "aws_sns_topic_subscription" "alarms_email" {
  topic_arn = aws_sns_topic.alarms.arn
  protocol  = "email"
  endpoint  = var.alarm_email  # Add to variables.tf
}

# High CPU Alarm - Backend
resource "aws_cloudwatch_metric_alarm" "backend_cpu_high" {
  alarm_name          = "${var.project_name}-backend-cpu-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "CPUUtilization"
  namespace           = "AWS/ECS"
  period              = "300"
  statistic           = "Average"
  threshold           = "80"
  alarm_description   = "Backend CPU utilization is too high"
  alarm_actions       = [aws_sns_topic.alarms.arn]

  dimensions = {
    ClusterName = aws_ecs_cluster.main.name
    ServiceName = aws_ecs_service.backend.name
  }
}

# High Memory Alarm - Backend
resource "aws_cloudwatch_metric_alarm" "backend_memory_high" {
  alarm_name          = "${var.project_name}-backend-memory-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "MemoryUtilization"
  namespace           = "AWS/ECS"
  period              = "300"
  statistic           = "Average"
  threshold           = "80"
  alarm_description   = "Backend memory utilization is too high"
  alarm_actions       = [aws_sns_topic.alarms.arn]

  dimensions = {
    ClusterName = aws_ecs_cluster.main.name
    ServiceName = aws_ecs_service.backend.name
  }
}

# Unhealthy Target Alarm
resource "aws_cloudwatch_metric_alarm" "unhealthy_targets" {
  alarm_name          = "${var.project_name}-unhealthy-targets"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "UnHealthyHostCount"
  namespace           = "AWS/ApplicationELB"
  period              = "60"
  statistic           = "Average"
  threshold           = "0"
  alarm_description   = "One or more targets are unhealthy"
  alarm_actions       = [aws_sns_topic.alarms.arn]

  dimensions = {
    LoadBalancer = aws_lb.main.arn_suffix
    TargetGroup  = aws_lb_target_group.backend.arn_suffix
  }
}

# High Response Time Alarm
resource "aws_cloudwatch_metric_alarm" "high_response_time" {
  alarm_name          = "${var.project_name}-high-response-time"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "TargetResponseTime"
  namespace           = "AWS/ApplicationELB"
  period              = "300"
  statistic           = "Average"
  threshold           = "2"
  alarm_description   = "Response time is too high"
  alarm_actions       = [aws_sns_topic.alarms.arn]

  dimensions = {
    LoadBalancer = aws_lb.main.arn_suffix
  }
}

# RDS CPU High
resource "aws_cloudwatch_metric_alarm" "rds_cpu_high" {
  alarm_name          = "${var.project_name}-rds-cpu-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "CPUUtilization"
  namespace           = "AWS/RDS"
  period              = "300"
  statistic           = "Average"
  threshold           = "80"
  alarm_description   = "RDS CPU utilization is too high"
  alarm_actions       = [aws_sns_topic.alarms.arn]

  dimensions = {
    DBInstanceIdentifier = aws_db_instance.main.id
  }
}

# RDS Low Storage
resource "aws_cloudwatch_metric_alarm" "rds_storage_low" {
  alarm_name          = "${var.project_name}-rds-storage-low"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = "1"
  metric_name         = "FreeStorageSpace"
  namespace           = "AWS/RDS"
  period              = "300"
  statistic           = "Average"
  threshold           = "5000000000"  # 5GB
  alarm_description   = "RDS free storage space is low"
  alarm_actions       = [aws_sns_topic.alarms.arn]

  dimensions = {
    DBInstanceIdentifier = aws_db_instance.main.id
  }
}
```

### 1.3 Log Insights Queries

**Useful CloudWatch Insights queries:**

```sql
-- Error rate
fields @timestamp, @message
| filter @message like /ERROR/
| stats count() by bin(5m)

-- Slow queries
fields @timestamp, @message
| filter @message like /query/
| parse @message /duration: (?<duration>\d+)/
| filter duration > 1000
| sort duration desc

-- Request count by endpoint
fields @timestamp, @message
| filter @message like /GET|POST|PUT|DELETE/
| parse @message /(?<method>\w+) (?<path>\/\S+)/
| stats count() by path, method

-- 5xx errors
fields @timestamp, @message
| filter @message like /5\d\d/
| stats count() by bin(5m)
```

---

## 2. Backup and Disaster Recovery

### 2.1 RDS Automated Backups

Already configured in `terraform/rds.tf`:
- Backup retention: 7 days
- Backup window: 03:00-04:00 UTC
- Maintenance window: Monday 04:00-05:00 UTC

### 2.2 Manual Snapshot Script

**File:** `scripts/backup-database.sh`

```bash
#!/bin/bash
set -e

# Configuration
AWS_REGION=${AWS_REGION:-us-east-1}
DB_INSTANCE="galaxium-travels-db"
SNAPSHOT_ID="manual-backup-$(date +%Y%m%d-%H%M%S)"

echo "Creating RDS snapshot: $SNAPSHOT_ID"

aws rds create-db-snapshot \
    --db-instance-identifier $DB_INSTANCE \
    --db-snapshot-identifier $SNAPSHOT_ID \
    --region $AWS_REGION

echo "Snapshot creation initiated: $SNAPSHOT_ID"
echo "Monitor progress:"
echo "  aws rds describe-db-snapshots --db-snapshot-identifier $SNAPSHOT_ID --region $AWS_REGION"
```

### 2.3 Restore from Snapshot

**File:** `scripts/restore-database.sh`

```bash
#!/bin/bash
set -e

if [ -z "$1" ]; then
    echo "Usage: ./restore-database.sh <snapshot-id>"
    exit 1
fi

SNAPSHOT_ID=$1
AWS_REGION=${AWS_REGION:-us-east-1}
NEW_DB_INSTANCE="galaxium-travels-db-restored"

echo "Restoring database from snapshot: $SNAPSHOT_ID"

aws rds restore-db-instance-from-db-snapshot \
    --db-instance-identifier $NEW_DB_INSTANCE \
    --db-snapshot-identifier $SNAPSHOT_ID \
    --region $AWS_REGION

echo "Restore initiated. New instance: $NEW_DB_INSTANCE"
echo "Monitor progress:"
echo "  aws rds describe-db-instances --db-instance-identifier $NEW_DB_INSTANCE --region $AWS_REGION"
```

### 2.4 Terraform State Backup

**File:** `scripts/backup-terraform-state.sh`

```bash
#!/bin/bash
set -e

BACKUP_DIR="terraform-backups"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)

mkdir -p $BACKUP_DIR

# Backup Terraform state
cd terraform
terraform state pull > ../$BACKUP_DIR/terraform-state-$TIMESTAMP.json

echo "Terraform state backed up to: $BACKUP_DIR/terraform-state-$TIMESTAMP.json"

# Keep only last 10 backups
cd ../$BACKUP_DIR
ls -t terraform-state-*.json | tail -n +11 | xargs -r rm

echo "Cleanup complete. Keeping last 10 backups."
```

---

## 3. Security Hardening

### 3.1 Enable AWS WAF (Web Application Firewall)

**File:** `terraform/waf.tf`

```hcl
# WAF Web ACL
resource "aws_wafv2_web_acl" "main" {
  name  = "${var.project_name}-waf"
  scope = "REGIONAL"

  default_action {
    allow {}
  }

  # Rate limiting rule
  rule {
    name     = "RateLimitRule"
    priority = 1

    action {
      block {}
    }

    statement {
      rate_based_statement {
        limit              = 2000
        aggregate_key_type = "IP"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "RateLimitRule"
      sampled_requests_enabled   = true
    }
  }

  # AWS Managed Rules - Core Rule Set
  rule {
    name     = "AWSManagedRulesCommonRuleSet"
    priority = 2

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesCommonRuleSet"
        vendor_name = "AWS"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "AWSManagedRulesCommonRuleSet"
      sampled_requests_enabled   = true
    }
  }

  # AWS Managed Rules - Known Bad Inputs
  rule {
    name     = "AWSManagedRulesKnownBadInputsRuleSet"
    priority = 3

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesKnownBadInputsRuleSet"
        vendor_name = "AWS"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "AWSManagedRulesKnownBadInputsRuleSet"
      sampled_requests_enabled   = true
    }
  }

  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = "${var.project_name}-waf"
    sampled_requests_enabled   = true
  }

  tags = {
    Name = "${var.project_name}-waf"
  }
}

# Associate WAF with ALB
resource "aws_wafv2_web_acl_association" "main" {
  resource_arn = aws_lb.main.arn
  web_acl_arn  = aws_wafv2_web_acl.main.arn
}
```

### 3.2 Enable VPC Flow Logs

**File:** `terraform/vpc.tf` (add to existing file)

```hcl
# CloudWatch Log Group for VPC Flow Logs
resource "aws_cloudwatch_log_group" "vpc_flow_logs" {
  name              = "/aws/vpc/${var.project_name}"
  retention_in_days = 7

  tags = {
    Name = "${var.project_name}-vpc-flow-logs"
  }
}

# IAM Role for VPC Flow Logs
resource "aws_iam_role" "vpc_flow_logs" {
  name = "${var.project_name}-vpc-flow-logs-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "vpc-flow-logs.amazonaws.com"
      }
    }]
  })
}

resource "aws_iam_role_policy" "vpc_flow_logs" {
  name = "${var.project_name}-vpc-flow-logs-policy"
  role = aws_iam_role.vpc_flow_logs.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents",
        "logs:DescribeLogGroups",
        "logs:DescribeLogStreams"
      ]
      Effect   = "Allow"
      Resource = "*"
    }]
  })
}

# VPC Flow Logs
resource "aws_flow_log" "main" {
  iam_role_arn    = aws_iam_role.vpc_flow_logs.arn
  log_destination = aws_cloudwatch_log_group.vpc_flow_logs.arn
  traffic_type    = "ALL"
  vpc_id          = aws_vpc.main.id

  tags = {
    Name = "${var.project_name}-vpc-flow-logs"
  }
}
```

### 3.3 Secrets Management

**File:** `terraform/secrets.tf`

```hcl
# Secrets Manager for Database Credentials
resource "aws_secretsmanager_secret" "db_credentials" {
  name        = "${var.project_name}/db/credentials"
  description = "Database credentials for ${var.project_name}"

  tags = {
    Name = "${var.project_name}-db-credentials"
  }
}

resource "aws_secretsmanager_secret_version" "db_credentials" {
  secret_id = aws_secretsmanager_secret.db_credentials.id
  secret_string = jsonencode({
    username = var.db_username
    password = var.db_password
    host     = aws_db_instance.main.address
    port     = aws_db_instance.main.port
    dbname   = var.db_name
  })
}

# Update ECS task definition to use secrets
# Modify container_definitions in ecs.tf to use secrets instead of environment variables
```

---

## 4. Cost Monitoring

### 4.1 Cost Allocation Tags

Already applied via `default_tags` in `main.tf`.

### 4.2 Budget Alerts

**File:** `terraform/budgets.tf`

```hcl
# Monthly Budget
resource "aws_budgets_budget" "monthly" {
  name              = "${var.project_name}-monthly-budget"
  budget_type       = "COST"
  limit_amount      = "150"
  limit_unit        = "USD"
  time_period_start = "2026-01-01_00:00"
  time_unit         = "MONTHLY"

  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 80
    threshold_type             = "PERCENTAGE"
    notification_type          = "ACTUAL"
    subscriber_email_addresses = [var.alarm_email]
  }

  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 100
    threshold_type             = "PERCENTAGE"
    notification_type          = "FORECASTED"
    subscriber_email_addresses = [var.alarm_email]
  }
}
```

### 4.3 Cost Optimization Script

**File:** `scripts/cost-report.sh`

```bash
#!/bin/bash
set -e

AWS_REGION=${AWS_REGION:-us-east-1}
START_DATE=$(date -d "1 month ago" +%Y-%m-01)
END_DATE=$(date +%Y-%m-%d)

echo "=========================================="
echo "AWS Cost Report"
echo "Period: $START_DATE to $END_DATE"
echo "=========================================="

# Get cost by service
aws ce get-cost-and-usage \
    --time-period Start=$START_DATE,End=$END_DATE \
    --granularity MONTHLY \
    --metrics "UnblendedCost" \
    --group-by Type=DIMENSION,Key=SERVICE \
    --region us-east-1

echo ""
echo "=========================================="
echo "Top 5 Most Expensive Services"
echo "=========================================="

aws ce get-cost-and-usage \
    --time-period Start=$START_DATE,End=$END_DATE \
    --granularity MONTHLY \
    --metrics "UnblendedCost" \
    --group-by Type=DIMENSION,Key=SERVICE \
    --region us-east-1 \
    --query 'ResultsByTime[0].Groups | sort_by(@, &Metrics.UnblendedCost.Amount) | reverse(@) | [0:5]'
```

---

## 5. Operational Runbooks

### 5.1 Scaling Operations

**Scale ECS Services:**
```bash
# Scale up backend
aws ecs update-service \
    --cluster galaxium-travels-cluster \
    --service galaxium-travels-backend \
    --desired-count 4 \
    --region us-east-1

# Scale down backend
aws ecs update-service \
    --cluster galaxium-travels-cluster \
    --service galaxium-travels-backend \
    --desired-count 2 \
    --region us-east-1
```

**Scale RDS:**
```bash
# Modify instance class
aws rds modify-db-instance \
    --db-instance-identifier galaxium-travels-db \
    --db-instance-class db.t3.small \
    --apply-immediately \
    --region us-east-1
```

### 5.2 Incident Response

**File:** `docs/incident-response.md`

```markdown
# Incident Response Playbook

## Service Outage

1. Check ALB health
2. Check ECS task status
3. Review CloudWatch logs
4. Check RDS connectivity
5. Verify security group rules
6. Rollback if needed

## High Error Rate

1. Check CloudWatch logs for errors
2. Review recent deployments
3. Check database performance
4. Verify external dependencies
5. Scale resources if needed

## Database Issues

1. Check RDS metrics
2. Review slow query logs
3. Check connection count
4. Verify backup status
5. Consider read replica if needed
```

### 5.3 Maintenance Windows

**Schedule:**
- **Deployments:** Tuesday/Thursday 10:00-12:00 UTC
- **Database Maintenance:** Monday 04:00-05:00 UTC
- **Infrastructure Updates:** First Sunday of month

---

## 6. Documentation

### 6.1 Team Access

**File:** `docs/team-access.md`

```markdown
# Team Access Guide

## AWS Console Access
- URL: https://console.aws.amazon.com
- Account ID: [YOUR_ACCOUNT_ID]
- IAM Users: Create per team member

## Application URLs
- Production: http://[ALB_DNS]
- API Docs: http://[ALB_DNS]/docs
- CloudWatch: [LINK]

## Credentials
- Database: Stored in AWS Secrets Manager
- ECR: Use AWS CLI authentication

## Emergency Contacts
- DevOps Lead: [EMAIL]
- On-Call: [PHONE]
```

### 6.2 Monitoring Guide

**File:** `docs/monitoring-guide.md`

```markdown
# Monitoring Guide

## Key Metrics to Watch

### Application Health
- Target response time < 2s
- Error rate < 1%
- Request count trends

### Infrastructure Health
- ECS CPU < 80%
- ECS Memory < 80%
- RDS CPU < 80%
- RDS Storage > 5GB free

## Alert Response

### High CPU Alert
1. Check CloudWatch metrics
2. Review application logs
3. Consider scaling up
4. Investigate code performance

### Database Connection Issues
1. Check RDS status
2. Verify security groups
3. Check connection pool settings
4. Review slow queries
```

---

## 7. Final Checklist

- [ ] CloudWatch dashboards created
- [ ] Alarms configured and tested
- [ ] SNS topic subscribed
- [ ] Automated backups verified
- [ ] Manual backup script tested
- [ ] WAF enabled and configured
- [ ] VPC Flow Logs enabled
- [ ] Secrets moved to Secrets Manager
- [ ] Budget alerts configured
- [ ] Cost monitoring set up
- [ ] Runbooks documented
- [ ] Team trained on operations
- [ ] Emergency procedures documented
- [ ] Maintenance schedule established

---

## Ongoing Maintenance

### Daily
- Review CloudWatch dashboards
- Check for alarms
- Monitor costs

### Weekly
- Review logs for errors
- Check backup status
- Review security alerts

### Monthly
- Cost optimization review
- Security audit
- Update documentation
- Review and update alarms

### Quarterly
- Disaster recovery drill
- Performance optimization
- Capacity planning
- Security assessment

---

## Success Criteria

✅ **Monitoring:** All key metrics tracked and alerted  
✅ **Backups:** Automated and tested  
✅ **Security:** WAF, encryption, and access controls in place  
✅ **Documentation:** Complete and accessible  
✅ **Team:** Trained and confident  
✅ **Costs:** Within budget and optimized  

---

**Congratulations!** Your AWS migration is complete and production-ready! 🎉

**Estimated Time:** 1-2 days  
**Difficulty:** Medium  
**Status:** Final Phase Complete