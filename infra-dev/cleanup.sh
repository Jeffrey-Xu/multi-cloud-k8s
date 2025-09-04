#!/bin/bash
# Complete cleanup for separated structure

set -e

echo "🧹 Cleaning up Monopoly Game (Separated Structure)..."
echo "⚠️  This will destroy ALL resources!"
echo ""

read -p "Are you sure you want to destroy everything? (type 'yes' to confirm): " confirm
if [ "$confirm" != "yes" ]; then
    echo "❌ Cleanup cancelled"
    exit 0
fi

echo "🚀 Starting cleanup process..."

# Step 1: Clean up applications first
echo ""
echo "📋 Step 1: Cleaning up applications..."
if [ -f "applications/terraform.tfstate" ]; then
    cd applications
    echo "🗑️  Destroying applications..."
    terraform destroy -auto-approve
    cd ..
    echo "✅ Applications cleaned up"
else
    echo "⚠️  No application state found"
fi

# Step 2: Wait for AWS resources to be released
echo ""
echo "📋 Step 2: Waiting for AWS resources to be released..."
echo "⏳ Waiting 60 seconds for ALB and EBS volumes to be fully released..."
sleep 60

# Step 3: Clean up infrastructure
echo ""
echo "📋 Step 3: Cleaning up infrastructure..."
if [ -f "infrastructure/terraform.tfstate" ]; then
    cd infrastructure
    echo "🗑️  Destroying infrastructure..."
    terraform destroy -auto-approve
    cd ..
    echo "✅ Infrastructure cleaned up"
else
    echo "⚠️  No infrastructure state found"
fi

echo ""
echo "🎉 Cleanup completed!"
echo "💰 All AWS resources destroyed - no more billing!"
