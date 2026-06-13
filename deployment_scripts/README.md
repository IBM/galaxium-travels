# Scripts Directory

This directory contains all operational scripts for the Galaxium Travels project, organized by deployment target.

## Directory Structure

```
scripts/
├── aws/          # AWS deployment scripts
├── ibm/          # IBM Cloud deployment scripts
├── local/        # Local development scripts
└── README.md     # This file
```

## AWS Scripts (`aws/`)

Scripts for deploying to AWS ECS with Terraform:

- **`deploy-to-aws.sh`** - Complete AWS deployment (VPC, ECS, ALB, etc.)
- **`teardown-aws.sh`** - Remove all AWS infrastructure
- **`scale-to-zero.sh`** - Scale ECS services to 0 (save costs)
- **`scale-up.sh`** - Scale ECS services back up

### Usage
```bash
# Deploy to AWS
./scripts/aws/deploy-to-aws.sh

# Tear down AWS infrastructure
./scripts/aws/teardown-aws.sh

# Scale to zero (cost savings)
./scripts/aws/scale-to-zero.sh

# Scale back up
./scripts/aws/scale-up.sh
```

See [`docs/AWS-DEPLOYMENT.md`](../docs/AWS-DEPLOYMENT.md) for detailed documentation.

## IBM Cloud Scripts (`ibm/`)

Scripts for deploying to IBM Cloud Code Engine:

- **`deploy-to-ibm.sh`** - Complete IBM Cloud deployment (all services)
- **`deploy-to-ibm-simple.sh`** - Simplified deployment script
- **`teardown-ibm.sh`** - Remove all IBM Cloud applications
- **`check-ibm-status.sh`** - Check status of deployed services

### Usage
```bash
# Deploy to IBM Cloud
./scripts/ibm/deploy-to-ibm.sh

# Check deployment status
./scripts/ibm/check-ibm-status.sh

# Tear down IBM Cloud apps
./scripts/ibm/teardown-ibm.sh
```

See [`docs/IBM-CLOUD-DEPLOYMENT.md`](../docs/IBM-CLOUD-DEPLOYMENT.md) for detailed documentation.

## Local Development Scripts (`local/`)

Scripts for local development and testing:

- **`start_locally.sh`** - Start backend and frontend locally
- **`test-containers.sh`** - Test Docker containers locally

### Usage
```bash
# Start local development servers
./scripts/local/start_locally.sh

# Test Docker containers
./scripts/local/test-containers.sh
```

## Convenience Wrappers

For backward compatibility, convenience wrapper scripts are available in the root directory:

- `start.sh` → `scripts/local/start_locally.sh`
- `deploy-aws.sh` → `scripts/aws/deploy-to-aws.sh`
- `deploy-ibm.sh` → `scripts/ibm/deploy-to-ibm.sh`

## Prerequisites

### All Scripts
- **Docker** - For building container images
- **jq** - For JSON parsing

### AWS Scripts
- **AWS CLI** - Configured with credentials
- **Terraform** - For infrastructure as code

### IBM Cloud Scripts
- **IBM Cloud CLI** - With Code Engine plugin
- **Container Registry plugin**

## Notes

- All scripts should be run from the project root directory
- Scripts use relative paths for portability
- Environment variables can customize deployment behavior
- See individual script headers for specific requirements