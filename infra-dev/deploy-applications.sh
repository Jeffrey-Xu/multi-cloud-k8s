#!/bin/bash
# Deploy Applications Only

set -e

echo "🎮 Deploying Applications (Game Engine, Services, Ingress)..."

# Check if infrastructure exists
if [ ! -f "infrastructure/terraform.tfstate" ]; then
    echo "❌ Infrastructure not found! Run ./deploy-infrastructure.sh first"
    exit 1
fi

cd applications

echo "📋 Initializing Terraform..."
terraform init

echo "📊 Planning application deployment..."
terraform plan

echo "🚀 Deploying applications..."
terraform apply -auto-approve

echo "✅ Applications deployed successfully!"
echo ""
echo "📋 Application Summary:"
terraform output

echo ""
echo "🎯 Game is ready! Check the application_url output above"
echo "⏳ ALB may take 2-3 minutes to become fully available"
