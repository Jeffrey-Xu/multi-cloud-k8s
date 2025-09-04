# Monopoly Game - Complete Development Environment Configuration

# General Configuration
aws_region  = "us-west-2"
environment = "development"

# EKS Configuration
cluster_version      = "1.31"
node_instance_type   = "t3.medium"
node_desired_size    = 1
node_max_size        = 3
node_min_size        = 1
enable_spot_instances = true
node_disk_size       = 50

# Database Configuration
db_instance_class           = "db.t3.micro"
db_allocated_storage        = 20
db_backup_retention_period  = 7
enable_db_multi_az         = false  # Cost optimization for dev

# Cache Configuration
cache_node_type            = "cache.t3.micro"
cache_num_cache_nodes      = 1
cache_parameter_group_name = "default.redis7"

# Storage Configuration
enable_s3_versioning = true
s3_lifecycle_days    = 30

# Monitoring Configuration
enable_cloudwatch_logs = true
log_retention_days     = 14

# Security Configuration
allowed_cidr_blocks    = ["0.0.0.0/0"]  # Restrict in production
enable_private_endpoint = false          # Public for dev ease

# Cost Optimization
enable_cost_optimization = true

# Additional Tags
additional_tags = {
  Owner       = "development-team"
  Purpose     = "monopoly-game-development"
  CostCenter  = "engineering"
  AutoShutdown = "true"  # For cost management scripts
}
