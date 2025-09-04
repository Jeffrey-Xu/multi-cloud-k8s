#!/bin/bash
# Deploy Infrastructure Only

set -e

echo "🏗️  Deploying Infrastructure (EKS, RDS, VPC, Redis)..."

cd infrastructure

echo "📋 Initializing Terraform..."
terraform init

echo "📊 Planning infrastructure deployment..."
terraform plan

echo "🚀 Deploying infrastructure..."
terraform apply -auto-approve

echo "✅ Infrastructure deployed successfully!"
echo ""
echo "📋 Infrastructure Summary:"
terraform output

echo ""
echo "🎯 Next step: Deploy applications with ./deploy-applications.sh"
