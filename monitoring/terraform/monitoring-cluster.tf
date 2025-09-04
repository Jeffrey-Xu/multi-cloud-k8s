# Dedicated Monitoring Cluster for Multi-Cloud Gaming Platform

terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

# Monitoring cluster - cost-optimized for observability workloads
module "monitoring_eks" {
  source = "terraform-aws-modules/eks/aws"
  
  cluster_name    = "monopoly-monitoring"
  cluster_version = "1.28"
  
  vpc_id     = module.monitoring_vpc.vpc_id
  subnet_ids = module.monitoring_vpc.private_subnets
  
  # Cost-optimized node groups
  eks_managed_node_groups = {
    monitoring_nodes = {
      instance_types = ["m6i.large"]  # 2 vCPU, 8GB RAM
      min_size       = 3
      max_size       = 6
      desired_size   = 3
      
      # Storage-optimized for logs and metrics
      block_device_mappings = {
        xvda = {
          device_name = "/dev/xvda"
          ebs = {
            volume_size = 100
            volume_type = "gp3"
            iops        = 3000
            throughput  = 125
          }
        }
      }
    }
  }
  
  # Enable logging
  cluster_enabled_log_types = ["api", "audit", "authenticator", "controllerManager", "scheduler"]
}

# Dedicated VPC for monitoring
module "monitoring_vpc" {
  source = "terraform-aws-modules/vpc/aws"
  
  name = "monopoly-monitoring-vpc"
  cidr = "10.2.0.0/16"
  
  azs             = ["us-west-2a", "us-west-2b", "us-west-2c"]
  private_subnets = ["10.2.1.0/24", "10.2.2.0/24", "10.2.3.0/24"]
  public_subnets  = ["10.2.101.0/24", "10.2.102.0/24", "10.2.103.0/24"]
  
  enable_nat_gateway = true
  enable_vpn_gateway = false
  enable_dns_hostnames = true
  enable_dns_support = true
}

# EFS for shared monitoring configs
resource "aws_efs_file_system" "monitoring_shared" {
  creation_token = "monopoly-monitoring-shared"
  
  performance_mode = "generalPurpose"
  throughput_mode  = "provisioned"
  provisioned_throughput_in_mibps = 100
  
  tags = {
    Name = "monopoly-monitoring-shared"
  }
}

# Security group for monitoring cluster
resource "aws_security_group" "monitoring_cluster" {
  name_prefix = "monopoly-monitoring-"
  vpc_id      = module.monitoring_vpc.vpc_id
  
  # Allow metrics ingestion from game clusters
  ingress {
    from_port   = 9090  # Prometheus
    to_port     = 9090
    protocol    = "tcp"
    cidr_blocks = ["10.0.0.0/16", "10.1.0.0/16"]  # Game cluster CIDRs
  }
  
  ingress {
    from_port   = 9200  # Elasticsearch
    to_port     = 9200
    protocol    = "tcp"
    cidr_blocks = ["10.0.0.0/16", "10.1.0.0/16"]
  }
  
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# Outputs for other modules
output "monitoring_cluster_endpoint" {
  value = module.monitoring_eks.cluster_endpoint
}

output "monitoring_cluster_name" {
  value = module.monitoring_eks.cluster_name
}

output "monitoring_vpc_id" {
  value = module.monitoring_vpc.vpc_id
}
