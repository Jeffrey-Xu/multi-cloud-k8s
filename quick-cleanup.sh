#!/bin/bash
# Quick cleanup for development iterations - K8s workloads only

set -e

echo "🧹 Quick cleanup: Kubernetes workloads only..."
echo "💡 This keeps infrastructure running, only cleans applications"

# Configure kubectl if needed
cd infra-dev
if [ -f terraform.tfstate ]; then
    CLUSTER_NAME=$(terraform output -raw cluster_name 2>/dev/null || echo "")
    if [ -n "$CLUSTER_NAME" ]; then
        aws eks update-kubeconfig --region us-west-2 --name $CLUSTER_NAME
    fi
fi
cd ..

# Quick K8s cleanup
if kubectl cluster-info &> /dev/null; then
    echo "🗑️  Deleting Kubernetes applications..."
    
    # Delete in order to avoid hanging resources
    kubectl delete ingress --all -n monopoly-game --ignore-not-found=true --timeout=60s
    kubectl delete deployment --all -n monopoly-game --ignore-not-found=true --timeout=60s
    kubectl delete svc --all -n monopoly-game --ignore-not-found=true --timeout=60s
    kubectl delete pvc --all -n monopoly-game --ignore-not-found=true --timeout=60s
    kubectl delete secret --all -n monopoly-game --ignore-not-found=true
    
    echo "✅ Applications cleaned up"
    echo "🏗️  Infrastructure remains running"
    echo "🚀 Ready for redeployment with: ./deploy-k8s.sh"
else
    echo "❌ Could not connect to cluster"
fi
