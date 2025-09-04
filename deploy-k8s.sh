#!/bin/bash
# Deployment script that uses ONLY Terraform-managed resources

set -e

echo "🚀 Deploying Monopoly Game to Kubernetes using Terraform-managed resources..."

# Get Terraform outputs
cd infra-dev
echo "📊 Getting Terraform outputs..."

CLUSTER_NAME=$(terraform output -raw cluster_name)
RDS_ENDPOINT=$(terraform output -raw db_endpoint)
REDIS_ENDPOINT=$(terraform output -raw redis_endpoint)
GAME_DATA_VOLUME_ID=$(terraform output -raw game_data_volume_id)
LOGS_VOLUME_ID=$(terraform output -raw logs_volume_id)
ALB_DNS_NAME=$(terraform output -raw alb_dns_name)
FRONTEND_TARGET_GROUP=$(terraform output -raw frontend_target_group_arn)
GAME_ENGINE_TARGET_GROUP=$(terraform output -raw game_engine_target_group_arn)
EBS_CSI_ROLE_ARN=$(terraform output -raw ebs_csi_role_arn)
LB_CONTROLLER_ROLE_ARN=$(terraform output -raw aws_load_balancer_controller_role_arn)
DB_SECRET_ARN=$(terraform output -raw db_credentials_secret_arn)

cd ..

echo "✅ Terraform outputs retrieved"
echo "🎯 Cluster: $CLUSTER_NAME"
echo "🗄️  Database: $RDS_ENDPOINT"
echo "🔄 Redis: $REDIS_ENDPOINT"
echo "🌐 Load Balancer: $ALB_DNS_NAME"

# Configure kubectl
echo "🔧 Configuring kubectl..."
aws eks update-kubeconfig --region us-west-2 --name $CLUSTER_NAME

# Create namespace
echo "📁 Creating namespace..."
kubectl create namespace monopoly-game --dry-run=client -o yaml | kubectl apply -f -

# Create database secret from Terraform-managed Secrets Manager
echo "🔐 Creating database secret..."
DB_SECRET=$(aws secretsmanager get-secret-value --secret-id $DB_SECRET_ARN --query SecretString --output text)
DB_USERNAME=$(echo $DB_SECRET | jq -r .username)
DB_PASSWORD=$(echo $DB_SECRET | jq -r .password)

kubectl create secret generic db-credentials \
  --from-literal=username=$DB_USERNAME \
  --from-literal=password=$DB_PASSWORD \
  --namespace=monopoly-game \
  --dry-run=client -o yaml | kubectl apply -f -

# Replace placeholders in Kubernetes manifests with Terraform outputs
echo "📝 Updating Kubernetes manifests with Terraform-managed resource IDs..."

# Create temporary manifest files with Terraform values
cp monopoly/k8s/game-engine.yaml /tmp/game-engine-deploy.yaml

# Replace placeholders with actual Terraform-managed resource IDs
sed -i "s/TERRAFORM_RDS_ENDPOINT/$RDS_ENDPOINT/g" /tmp/game-engine-deploy.yaml
sed -i "s/TERRAFORM_REDIS_ENDPOINT/$REDIS_ENDPOINT/g" /tmp/game-engine-deploy.yaml
sed -i "s/TERRAFORM_GAME_DATA_VOLUME_ID/$GAME_DATA_VOLUME_ID/g" /tmp/game-engine-deploy.yaml
sed -i "s/TERRAFORM_LOGS_VOLUME_ID/$LOGS_VOLUME_ID/g" /tmp/game-engine-deploy.yaml

# Deploy applications
echo "🎮 Deploying game engine..."
kubectl apply -f /tmp/game-engine-deploy.yaml

# Create TargetGroupBinding for AWS Load Balancer Controller (uses Terraform ALB)
echo "🔗 Creating Target Group Bindings for Terraform-managed ALB..."
cat <<EOF | kubectl apply -f -
apiVersion: elbv2.k8s.aws/v1beta1
kind: TargetGroupBinding
metadata:
  name: game-engine-tgb
  namespace: monopoly-game
spec:
  serviceRef:
    name: game-engine-service
    port: 3001
  targetGroupARN: $GAME_ENGINE_TARGET_GROUP
EOF

# Wait for deployments
echo "⏳ Waiting for deployments to be ready..."
kubectl wait --for=condition=available --timeout=300s deployment/game-engine -n monopoly-game

# Show status
echo "📊 Deployment Status:"
kubectl get pods -n monopoly-game
kubectl get svc -n monopoly-game
kubectl get pv,pvc -n monopoly-game

echo ""
echo "✅ Deployment Complete!"
echo "🌐 Application URL: http://$ALB_DNS_NAME"
echo "🎯 All AWS resources managed by Terraform:"
echo "   - Load Balancer: $ALB_DNS_NAME"
echo "   - Database: $RDS_ENDPOINT"
echo "   - Redis: $REDIS_ENDPOINT"
echo "   - EBS Volumes: $GAME_DATA_VOLUME_ID, $LOGS_VOLUME_ID"
echo "   - Target Groups: Terraform-managed"
echo "   - IAM Roles: Terraform-managed"
echo ""
echo "🚀 Ready to play Monopoly!"

# Cleanup temp files
rm -f /tmp/game-engine-deploy.yaml
