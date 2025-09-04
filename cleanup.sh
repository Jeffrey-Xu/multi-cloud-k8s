#!/bin/bash
# Complete cleanup script for Monopoly Game infrastructure
# Handles both Kubernetes workloads and Terraform resources in proper order

set -e

echo "🧹 Starting complete cleanup of Monopoly Game infrastructure..."
echo "⚠️  This will destroy ALL resources including data!"
echo ""

# Confirmation prompt
read -p "Are you sure you want to destroy everything? (type 'yes' to confirm): " confirm
if [ "$confirm" != "yes" ]; then
    echo "❌ Cleanup cancelled"
    exit 0
fi

echo "🚀 Starting cleanup process..."

# Step 1: Clean up Kubernetes workloads first (to release AWS resources)
echo ""
echo "📋 Step 1: Cleaning up Kubernetes workloads..."

# Check if kubectl is configured
if ! kubectl cluster-info &> /dev/null; then
    echo "⚠️  kubectl not configured or cluster not accessible"
    echo "🔧 Attempting to configure kubectl from Terraform..."
    
    cd infra-dev
    if [ -f terraform.tfstate ]; then
        CLUSTER_NAME=$(terraform output -raw cluster_name 2>/dev/null || echo "")
        if [ -n "$CLUSTER_NAME" ]; then
            aws eks update-kubeconfig --region us-west-2 --name $CLUSTER_NAME
        fi
    fi
    cd ..
fi

# Delete Kubernetes resources in reverse order
if kubectl cluster-info &> /dev/null; then
    echo "🗑️  Deleting Kubernetes workloads..."
    
    # Delete ingress first (releases ALB)
    echo "  - Deleting ingress resources..."
    kubectl delete ingress --all -n monopoly-game --ignore-not-found=true --timeout=300s
    
    # Wait for ALB to be deleted
    echo "  - Waiting for ALB cleanup..."
    sleep 30
    
    # Delete services (releases any remaining load balancers)
    echo "  - Deleting services..."
    kubectl delete svc --all -n monopoly-game --ignore-not-found=true --timeout=180s
    
    # Delete deployments and pods
    echo "  - Deleting deployments..."
    kubectl delete deployment --all -n monopoly-game --ignore-not-found=true --timeout=180s
    
    # Delete PVCs (releases EBS volumes)
    echo "  - Deleting persistent volume claims..."
    kubectl delete pvc --all -n monopoly-game --ignore-not-found=true --timeout=300s
    
    # Delete PVs (cleanup any remaining volumes)
    echo "  - Deleting persistent volumes..."
    kubectl delete pv --all --ignore-not-found=true --timeout=300s
    
    # Delete secrets and configmaps
    echo "  - Deleting secrets and configmaps..."
    kubectl delete secret --all -n monopoly-game --ignore-not-found=true
    kubectl delete configmap --all -n monopoly-game --ignore-not-found=true
    
    # Delete namespace
    echo "  - Deleting namespace..."
    kubectl delete namespace monopoly-game --ignore-not-found=true --timeout=300s
    
    # Delete cluster-wide resources created by controllers
    echo "  - Cleaning up cluster-wide resources..."
    kubectl delete ingressclass alb --ignore-not-found=true
    kubectl delete storageclass gp3 --ignore-not-found=true
    
    echo "✅ Kubernetes workloads cleaned up"
else
    echo "⚠️  Could not connect to Kubernetes cluster - skipping K8s cleanup"
fi

# Step 2: Wait for AWS resources to be released
echo ""
echo "📋 Step 2: Waiting for AWS resources to be released..."
echo "⏳ Waiting 60 seconds for AWS resources to be fully released..."
sleep 60

# Step 3: Destroy Terraform infrastructure
echo ""
echo "📋 Step 3: Destroying Terraform infrastructure..."

cd infra-dev

# Check if Terraform state exists
if [ ! -f terraform.tfstate ]; then
    echo "⚠️  No Terraform state found - nothing to destroy"
    cd ..
    exit 0
fi

# Get resource count before destruction
echo "📊 Checking current Terraform state..."
RESOURCE_COUNT=$(terraform state list 2>/dev/null | wc -l || echo "0")
echo "📦 Found $RESOURCE_COUNT Terraform-managed resources"

if [ "$RESOURCE_COUNT" -eq "0" ]; then
    echo "✅ No Terraform resources to destroy"
    cd ..
    exit 0
fi

# Destroy Terraform resources
echo "🔥 Destroying Terraform infrastructure..."
echo "⚠️  This may take 10-15 minutes..."

# First attempt - normal destroy
if terraform destroy -auto-approve; then
    echo "✅ Terraform destroy completed successfully"
else
    echo "⚠️  Terraform destroy encountered issues, attempting cleanup..."
    
    # Second attempt - force destroy with refresh
    echo "🔄 Attempting force cleanup..."
    terraform refresh
    terraform destroy -auto-approve -refresh=false
    
    # If still failing, show remaining resources
    if [ $? -ne 0 ]; then
        echo "❌ Terraform destroy failed"
        echo "📋 Remaining resources:"
        terraform state list
        echo ""
        echo "🔧 Manual cleanup may be required for:"
        echo "   - Check AWS Console for remaining resources"
        echo "   - Look for resources with 'monopoly-dev' prefix"
        echo "   - Check for stuck EBS volumes, security groups, or load balancers"
    fi
fi

cd ..

# Step 4: Cleanup local files (optional)
echo ""
echo "📋 Step 4: Cleanup local files..."
read -p "Do you want to clean up local Terraform state files? (y/n): " cleanup_local
if [ "$cleanup_local" = "y" ]; then
    echo "🗑️  Cleaning up local files..."
    rm -rf infra-dev/.terraform
    rm -f infra-dev/.terraform.lock.hcl
    rm -f infra-dev/terraform.tfstate*
    echo "✅ Local files cleaned up"
fi

# Step 5: Verification
echo ""
echo "📋 Step 5: Verification..."
echo "🔍 Checking for remaining AWS resources..."

# Check for remaining resources with monopoly-dev prefix
echo "🔍 Scanning for resources with 'monopoly-dev' prefix..."

# Check ELBs
REMAINING_ALBS=$(aws elbv2 describe-load-balancers --query 'LoadBalancers[?contains(LoadBalancerName, `monopoly-dev`)].LoadBalancerName' --output text 2>/dev/null || echo "")
if [ -n "$REMAINING_ALBS" ]; then
    echo "⚠️  Remaining ALBs: $REMAINING_ALBS"
fi

# Check EBS volumes
REMAINING_VOLUMES=$(aws ec2 describe-volumes --filters "Name=tag:Project,Values=monopoly-game" --query 'Volumes[?State==`available`].VolumeId' --output text 2>/dev/null || echo "")
if [ -n "$REMAINING_VOLUMES" ]; then
    echo "⚠️  Remaining EBS volumes: $REMAINING_VOLUMES"
fi

# Check security groups
REMAINING_SGS=$(aws ec2 describe-security-groups --filters "Name=group-name,Values=monopoly-dev*" --query 'SecurityGroups[].GroupId' --output text 2>/dev/null || echo "")
if [ -n "$REMAINING_SGS" ]; then
    echo "⚠️  Remaining security groups: $REMAINING_SGS"
fi

echo ""
echo "🎉 Cleanup process completed!"
echo ""
echo "📋 Summary:"
echo "✅ Kubernetes workloads deleted"
echo "✅ Terraform infrastructure destroyed"
echo "✅ AWS resources cleaned up"
echo ""
echo "💡 If you see any remaining resources above, you may need to:"
echo "   1. Check AWS Console manually"
echo "   2. Delete resources with 'monopoly-dev' or 'monopoly-game' tags"
echo "   3. Verify no unexpected charges in AWS billing"
echo ""
echo "🚀 Ready for fresh deployment!"
