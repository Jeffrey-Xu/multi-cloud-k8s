#!/bin/bash

set -e

echo "🚀 Deploying Monopoly Core Services..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
NAMESPACE="monopoly-game"
REGISTRY="monopoly"  # Replace with your container registry

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if kubectl is available
if ! command -v kubectl &> /dev/null; then
    print_error "kubectl is not installed or not in PATH"
    exit 1
fi

# Check if docker is available
if ! command -v docker &> /dev/null; then
    print_error "docker is not installed or not in PATH"
    exit 1
fi

# Create namespace if it doesn't exist
print_status "Creating namespace: $NAMESPACE"
kubectl create namespace $NAMESPACE --dry-run=client -o yaml | kubectl apply -f -

# Deploy secrets first
print_status "Deploying secrets..."
kubectl apply -f k8s/secrets.yaml

# Build and deploy services
services=("user-service" "matchmaking" "notification-service")

for service in "${services[@]}"; do
    print_status "Building and deploying $service..."
    
    # Build Docker image
    print_status "Building Docker image for $service..."
    docker build -t $REGISTRY/$service:latest $service/
    
    # In a real environment, you would push to a registry:
    # docker push $REGISTRY/$service:latest
    
    # Deploy to Kubernetes
    print_status "Deploying $service to Kubernetes..."
    kubectl apply -f k8s/$service.yaml
    
    print_success "$service deployed successfully"
done

# Wait for deployments to be ready
print_status "Waiting for deployments to be ready..."
for service in "${services[@]}"; do
    print_status "Waiting for $service to be ready..."
    kubectl wait --for=condition=available --timeout=300s deployment/$service -n $NAMESPACE
    print_success "$service is ready"
done

# Show deployment status
print_status "Deployment Status:"
kubectl get pods -n $NAMESPACE
echo ""
kubectl get services -n $NAMESPACE
echo ""

# Show service endpoints
print_status "Service Health Checks:"
echo "User Service: kubectl port-forward -n $NAMESPACE svc/user-service 3002:3002"
echo "Matchmaking Service: kubectl port-forward -n $NAMESPACE svc/matchmaking-service 3003:3003"
echo "Notification Service: kubectl port-forward -n $NAMESPACE svc/notification-service 3004:3004"
echo ""

print_success "🎉 All core services deployed successfully!"
print_status "Next steps:"
echo "1. Test service health endpoints"
echo "2. Configure API Gateway"
echo "3. Test service integration"
echo "4. Deploy frontend application"
