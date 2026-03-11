# AWS Migration Documentation

This directory contains comprehensive documentation for migrating the Galaxium Travels Booking System from local development to AWS cloud infrastructure.

## 📋 Migration Overview

**Current State:** Local development with SQLite database  
**Target State:** AWS cloud with containerized services, managed database, and infrastructure as code

## 📁 Documentation Structure

### Core Phase Documents

1. **[Phase 1: Application Preparation](./phase-1-application-preparation.md)**
   - Database migration (SQLite → PostgreSQL)
   - Environment configuration
   - Docker optimization
   - Code changes required

2. **[Phase 2: Infrastructure as Code](./phase-2-infrastructure-as-code.md)**
   - Terraform setup and structure
   - AWS resource definitions
   - Network architecture
   - Security configurations

3. **[Phase 3: CI/CD Pipeline](./phase-3-cicd-pipeline.md)**
   - Container registry setup
   - Build and deployment automation
   - Image management
   - Testing strategies

4. **[Phase 4: Deployment Steps](./phase-4-deployment-steps.md)**
   - Step-by-step deployment guide
   - Verification procedures
   - DNS configuration
   - Go-live checklist

5. **[Phase 5: Post-Deployment](./phase-5-post-deployment.md)**
   - Monitoring and logging
   - Backup and disaster recovery
   - Security hardening
   - Maintenance procedures

### Supporting Documents

- **[architecture-diagram.md](./architecture-diagram.md)** - Mermaid diagram of AWS infrastructure
- **[cost-estimation.md](./cost-estimation.md)** - Detailed cost breakdown
- **[troubleshooting.md](./troubleshooting.md)** - Common issues and solutions

## 🎯 Quick Start

1. Review the [architecture diagram](./architecture-diagram.md) to understand the target infrastructure
2. Follow phases sequentially, starting with Phase 1
3. Each phase document includes:
   - Objectives
   - Prerequisites
   - Detailed steps
   - Verification procedures
   - Next steps

## ⏱️ Timeline Estimate

| Phase | Duration | Dependencies |
|-------|----------|--------------|
| Phase 1 | 2-3 days | None |
| Phase 2 | 3-5 days | Phase 1 complete |
| Phase 3 | 1-2 days | Phase 2 complete |
| Phase 4 | 1 day | Phases 1-3 complete |
| Phase 5 | 1-2 days | Phase 4 complete |
| **Total** | **8-13 days** | Sequential execution |

## 💰 Cost Estimate

**Monthly AWS costs:** ~$75-125

See [cost-estimation.md](./cost-estimation.md) for detailed breakdown.

## 🔑 Prerequisites

Before starting the migration, ensure you have:

- [ ] AWS Account with appropriate IAM permissions
- [ ] AWS CLI installed and configured
- [ ] Terraform installed (v1.0+)
- [ ] Docker installed locally
- [ ] Basic understanding of AWS services (ECS, RDS, ALB)
- [ ] Domain name (optional, for custom URL)

## 📞 Support

For questions or issues during migration:
1. Check the [troubleshooting guide](./troubleshooting.md)
2. Review AWS documentation for specific services
3. Consult with DevOps team

## 🔄 Migration Status

Track your progress:

- [ ] Phase 1: Application Preparation
- [ ] Phase 2: Infrastructure as Code
- [ ] Phase 3: CI/CD Pipeline
- [ ] Phase 4: Deployment
- [ ] Phase 5: Post-Deployment

---

**Last Updated:** 2026-03-10  
**Version:** 1.0  
**Maintained by:** DevOps Team