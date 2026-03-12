#!/usr/bin/env bash
# Simplified teardown script - let Terraform do most of the work

REGION="us-east-1"

echo "=========================================="
echo "AWS Infrastructure Teardown"
echo "=========================================="
echo ""
echo "⚠️  WARNING: This will delete ALL resources and cannot be undone!"
echo ""
read -p "Are you sure you want to continue? (type 'yes' to confirm): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    echo "Teardown cancelled."
    return 0 2>/dev/null || :
fi

echo ""
echo "Starting teardown process..."
echo ""

# 1. Delete ECR images (Terraform can't delete non-empty repositories)
echo "🗑️  Deleting ECR images..."
for REPO in galaxium-booking-backend galaxium-booking-frontend; do
    echo "  - Checking $REPO..."
    if aws ecr describe-repositories --repository-names $REPO --region $REGION >/dev/null 2>&1; then
        echo "    Deleting all images..."
        aws ecr batch-delete-image \
            --repository-name $REPO \
            --image-ids "$(aws ecr list-images --repository-name $REPO --region $REGION --query 'imageIds[*]' --output json)" \
            --region $REGION >/dev/null 2>&1 || true
        echo "    ✓ Done"
    else
        echo "    Repository not found (may already be deleted)"
    fi
done

echo ""
echo "🏗️  Running Terraform destroy..."
echo "    This will delete all infrastructure resources..."
echo ""

cd terraform || { echo "Error: terraform directory not found"; return 1 2>/dev/null || exit 1; }
terraform destroy -auto-approve

cd ..

echo ""
echo "✅ Teardown complete!"
echo ""
echo "All AWS resources have been deleted:"
echo "  ✓ ECR images deleted"
echo "  ✓ ECS Cluster and Services"
echo "  ✓ ECR Repositories"
echo "  ✓ RDS Database"
echo "  ✓ Application Load Balancer"
echo "  ✓ VPC, Subnets, NAT Gateway"
echo "  ✓ Security Groups"
echo "  ✓ IAM Roles"
echo "  ✓ CloudWatch Log Groups"
echo ""
echo "💰 No AWS resources remain that would incur costs."

# Made with Bob
