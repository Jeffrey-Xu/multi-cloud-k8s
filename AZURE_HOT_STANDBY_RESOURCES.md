# Azure AKS Hot Standby Resource Allocation

## **Hot Standby Strategy: Minimal + Auto-Scale** 🔥

### **Resource Allocation Philosophy**
```yaml
hot_standby_approach:
  normal_operations: "Minimal resources (20% of production)"
  failover_ready: "Auto-scale to 100% within 2 minutes"
  cost_optimization: "Pay only for what you need"
  availability_target: "Ready to serve traffic immediately"
```

## **Azure AKS Cluster Configuration**

### **Node Pool Setup**
```yaml
# Azure AKS hot standby configuration
aks_cluster:
  name: "monopoly-standby-aks"
  location: "West US 2"  # Same region as AWS
  kubernetes_version: "1.28"
  
  # System node pool (always running)
  system_node_pool:
    name: "system"
    vm_size: "Standard_B2s"  # 2 vCPU, 4GB RAM - minimal
    node_count: 1
    min_count: 1
    max_count: 3
    auto_scaling: true
    purpose: "Kubernetes system components only"
    
  # Application node pool (hot standby)
  app_node_pool:
    name: "gameservices"
    vm_size: "Standard_D4s_v3"  # 4 vCPU, 16GB RAM
    node_count: 2              # Minimal running nodes
    min_count: 2               # Always keep 2 for availability
    max_count: 10              # Scale up during failover
    auto_scaling: true
    purpose: "Game application workloads"
```

### **Resource Allocation Breakdown**

#### **Normal Operations (Hot Standby Mode)**
```yaml
standby_resources:
  compute_nodes:
    system_pool: "1x Standard_B2s ($30/month)"
    app_pool: "2x Standard_D4s_v3 ($280/month)"
    total_compute: "$310/month"
    
  storage:
    os_disks: "3x 30GB Premium SSD ($45/month)"
    persistent_volumes: "50GB for databases ($15/month)"
    total_storage: "$60/month"
    
  networking:
    load_balancer: "Standard LB ($20/month)"
    bandwidth: "Minimal usage ($10/month)"
    total_networking: "$30/month"
    
  total_monthly_cost: "$400/month (vs $800 for full production)"
```

#### **Failover Mode (Full Production)**
```yaml
failover_resources:
  auto_scale_target:
    system_pool: "3x Standard_B2s (system resilience)"
    app_pool: "8x Standard_D4s_v3 (match AWS capacity)"
    scale_time: "2-3 minutes to full capacity"
    
  cost_during_failover:
    hourly_cost: "$2.50/hour (vs $0.80/hour standby)"
    daily_failover_cost: "$60/day"
    monthly_if_always_scaled: "$1,800/month"
```

## **Application Deployment Strategy**

### **Minimal Standby Deployments**
```yaml
# Kubernetes deployments in standby mode
apiVersion: apps/v1
kind: Deployment
metadata:
  name: game-engine-standby
spec:
  replicas: 1  # Minimal replica for readiness
  template:
    spec:
      containers:
      - name: game-engine
        image: jeffreyxu2025/monopoly:latest
        resources:
          requests:
            cpu: "100m"      # Minimal CPU request
            memory: "256Mi"  # Minimal memory request
          limits:
            cpu: "500m"      # Allow burst during health checks
            memory: "512Mi"  # Reasonable limit for standby
        readinessProbe:
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 10
          periodSeconds: 30
        livenessProbe:
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 30
          periodSeconds: 60

---
# Horizontal Pod Autoscaler for failover scaling
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: game-engine-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: game-engine-standby
  minReplicas: 1    # Standby mode
  maxReplicas: 20   # Failover mode
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
  behavior:
    scaleUp:
      stabilizationWindowSeconds: 60
      policies:
      - type: Percent
        value: 100    # Double replicas every minute during failover
        periodSeconds: 60
```

### **Service Mesh Standby Configuration**
```yaml
# Consul Connect in standby mode
consul_standby:
  server_replicas: 1        # Minimal Consul server (vs 3 in production)
  client_resources:
    cpu_request: "50m"      # Minimal CPU for service discovery
    memory_request: "128Mi" # Minimal memory for mesh
    
  connect_proxy_resources:
    cpu_request: "10m"      # Very minimal for standby
    memory_request: "64Mi"  # Just enough for health checks
    
  federation_config:
    wan_gossip: "enabled"   # Maintain federation with AWS
    cross_dc_queries: "enabled"  # Ready for service discovery
```

## **Database Standby Configuration**

### **Azure Cosmos DB (Standby)**
```yaml
cosmos_db_standby:
  api: "PostgreSQL"
  consistency_level: "Strong"
  
  # Minimal throughput for standby
  throughput:
    normal: "400 RU/s (minimum)"  # $24/month
    failover: "4000 RU/s (auto-scale)"  # $240/month when active
    
  backup_policy: "Continuous"
  geo_redundancy: false  # Single region for cost savings
  
  # Auto-scale configuration
  auto_scale:
    enabled: true
    min_throughput: 400
    max_throughput: 4000
    scale_trigger: "Connection count > 10"
```

### **Azure Cache for Redis (Standby)**
```yaml
redis_standby:
  tier: "Standard"
  size: "C1"  # 1GB cache (minimal)
  cost: "$15/month"
  
  # Failover scaling
  failover_config:
    scale_to: "C4"  # 26GB cache (match AWS ElastiCache)
    scale_time: "15-20 minutes"
    cost_during_failover: "$150/month when scaled"
```

## **Auto-Scaling Triggers**

### **Failover Detection & Scaling**
```yaml
# Azure Monitor alert rules for auto-scaling
alert_rules:
  aws_health_check_failure:
    condition: "AWS endpoint unreachable for 60 seconds"
    action: "Trigger Azure AKS scale-up"
    
  traffic_redirection:
    condition: "DNS failover activated"
    action: "Scale all services to production levels"
    
  database_failover:
    condition: "Cosmos DB connections > 5"
    action: "Scale database throughput to 4000 RU/s"
```

### **Scaling Automation Script**
```bash
#!/bin/bash
# Azure AKS failover scaling script

echo "🚨 AWS failure detected - scaling Azure AKS to production levels..."

# Scale node pools
az aks nodepool scale \
  --resource-group monopoly-rg \
  --cluster-name monopoly-standby-aks \
  --name gameservices \
  --node-count 8

# Scale application deployments
kubectl scale deployment game-engine-standby --replicas=10
kubectl scale deployment matchmaking-standby --replicas=5
kubectl scale deployment user-service-standby --replicas=3
kubectl scale deployment leaderboard-standby --replicas=2

# Scale database throughput
az cosmosdb sql database throughput update \
  --account-name monopoly-cosmos \
  --resource-group monopoly-rg \
  --name monopoly-game \
  --throughput 4000

# Scale Redis cache
az redis update \
  --name monopoly-redis-standby \
  --resource-group monopoly-rg \
  --sku Standard \
  --vm-size C4

echo "✅ Azure AKS scaled to production capacity"
echo "⏱️  Full scaling completed in 3-5 minutes"
```

## **Cost Analysis**

### **Monthly Cost Breakdown**
```yaml
# Hot standby costs (normal operations)
azure_standby_monthly:
  aks_cluster:
    system_nodes: "$30 (1x B2s)"
    app_nodes: "$280 (2x D4s_v3)"
    
  databases:
    cosmos_db: "$24 (400 RU/s minimal)"
    redis_cache: "$15 (C1 standard)"
    
  networking:
    load_balancer: "$20"
    bandwidth: "$10"
    
  storage:
    disks: "$45"
    backup: "$10"
    
  total_standby: "$434/month"

# Failover costs (when active)
azure_failover_costs:
  additional_nodes: "+$840/month (6 more D4s_v3)"
  scaled_database: "+$216/month (3600 more RU/s)"
  scaled_redis: "+$135/month (C4 vs C1)"
  
  total_during_failover: "$1,625/month"
  cost_per_failover_day: "$54/day"
```

### **Cost Optimization Strategies**
```yaml
cost_optimizations:
  spot_instances:
    use_case: "Non-critical standby workloads"
    savings: "60-80% on compute costs"
    risk: "May be evicted (acceptable for standby)"
    
  reserved_instances:
    commitment: "1-year reserved for base capacity"
    savings: "30-40% on guaranteed nodes"
    
  auto_shutdown:
    schedule: "Scale down to 1 node during low-traffic hours"
    savings: "Additional 20% during off-hours"
```

## **Monitoring & Health Checks**

### **Standby Health Validation**
```yaml
# Continuous standby readiness checks
health_checks:
  cluster_readiness:
    check: "kubectl get nodes"
    frequency: "Every 5 minutes"
    
  application_readiness:
    check: "HTTP health endpoints"
    frequency: "Every 30 seconds"
    
  database_connectivity:
    check: "Cosmos DB connection test"
    frequency: "Every 60 seconds"
    
  scaling_capability:
    check: "Test auto-scale triggers"
    frequency: "Daily"
```

### **Failover Readiness Dashboard**
```yaml
# Azure Monitor dashboard metrics
dashboard_metrics:
  - standby_cluster_health: "Green/Yellow/Red status"
  - node_pool_capacity: "Current vs maximum nodes"
  - database_throughput: "Current vs failover target"
  - estimated_scale_time: "Time to reach production capacity"
  - monthly_standby_cost: "Current month spending"
  - failover_test_results: "Last successful failover test"
```

## **Summary: Optimal Hot Standby**

### **Resource Strategy**
- **Normal**: $434/month (20% of production capacity)
- **Failover**: $1,625/month (100% production capacity)
- **Scale Time**: 2-3 minutes to full capacity
- **Availability**: Always ready, minimal delay

### **Key Benefits**
✅ **Cost Effective**: 75% cheaper than full active-active
✅ **Fast Failover**: <3 minutes to production capacity  
✅ **Always Ready**: Continuous health checks and readiness
✅ **Auto-Scaling**: No manual intervention required

This hot standby approach gives you **enterprise-grade DR capability** at **startup-friendly costs** while maintaining **rapid failover capability** for your gaming platform.
