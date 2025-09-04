# Applications Only - Kubernetes Deployments, Services, Ingress

terraform {
  required_version = ">= 1.0"
  required_providers {
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.20"
    }
    helm = {
      source  = "hashicorp/helm"
      version = "~> 2.10"
    }
  }
}

# Get infrastructure outputs
data "terraform_remote_state" "infrastructure" {
  backend = "local"
  config = {
    path = "../infrastructure/terraform.tfstate"
  }
}

locals {
  # Infrastructure data
  cluster_name     = data.terraform_remote_state.infrastructure.outputs.cluster_name
  cluster_endpoint = data.terraform_remote_state.infrastructure.outputs.cluster_endpoint
  cluster_ca_data  = data.terraform_remote_state.infrastructure.outputs.cluster_certificate_authority_data
  
  # Database data
  db_endpoint = data.terraform_remote_state.infrastructure.outputs.db_endpoint
  db_port     = data.terraform_remote_state.infrastructure.outputs.db_port
  db_name     = data.terraform_remote_state.infrastructure.outputs.db_name
  db_username = data.terraform_remote_state.infrastructure.outputs.db_username
  db_password = data.terraform_remote_state.infrastructure.outputs.db_password
  
  # Redis data
  redis_endpoint = data.terraform_remote_state.infrastructure.outputs.redis_endpoint
  redis_port     = data.terraform_remote_state.infrastructure.outputs.redis_port
  
  # Network data
  public_subnets = data.terraform_remote_state.infrastructure.outputs.public_subnet_ids
  
  # IAM roles
  lb_controller_role_arn = data.terraform_remote_state.infrastructure.outputs.aws_load_balancer_controller_role_arn
  
  aws_region = data.terraform_remote_state.infrastructure.outputs.aws_region
}

provider "kubernetes" {
  host                   = local.cluster_endpoint
  cluster_ca_certificate = base64decode(local.cluster_ca_data)
  
  exec {
    api_version = "client.authentication.k8s.io/v1beta1"
    command     = "aws"
    args        = ["eks", "get-token", "--cluster-name", local.cluster_name, "--region", local.aws_region]
  }
}

provider "helm" {
  kubernetes {
    host                   = local.cluster_endpoint
    cluster_ca_certificate = base64decode(local.cluster_ca_data)
    
    exec {
      api_version = "client.authentication.k8s.io/v1beta1"
      command     = "aws"
      args        = ["eks", "get-token", "--cluster-name", local.cluster_name, "--region", local.aws_region]
    }
  }
}

# Namespace
resource "kubernetes_namespace" "monopoly_game" {
  metadata {
    name = "monopoly-game"
    labels = {
      name = "monopoly-game"
    }
  }
}

# AWS Load Balancer Controller
resource "helm_release" "aws_load_balancer_controller" {
  name       = "aws-load-balancer-controller"
  repository = "https://aws.github.io/eks-charts"
  chart      = "aws-load-balancer-controller"
  namespace  = "kube-system"
  version    = "1.6.2"

  set {
    name  = "clusterName"
    value = local.cluster_name
  }

  set {
    name  = "serviceAccount.create"
    value = "true"
  }

  set {
    name  = "serviceAccount.name"
    value = "aws-load-balancer-controller"
  }

  set {
    name  = "serviceAccount.annotations.eks\\.amazonaws\\.com/role-arn"
    value = local.lb_controller_role_arn
  }
}

# Storage Class
resource "kubernetes_storage_class" "gp3" {
  metadata {
    name = "gp3"
    annotations = {
      "storageclass.kubernetes.io/is-default-class" = "true"
    }
  }
  
  storage_provisioner    = "ebs.csi.aws.com"
  reclaim_policy        = "Delete"
  volume_binding_mode   = "WaitForFirstConsumer"
  allow_volume_expansion = true
  
  parameters = {
    type      = "gp3"
    encrypted = "true"
    fsType    = "ext4"
  }
}

# Database Secret
resource "kubernetes_secret" "db_credentials" {
  metadata {
    name      = "db-credentials"
    namespace = kubernetes_namespace.monopoly_game.metadata[0].name
  }

  data = {
    username = local.db_username
    password = local.db_password
    host     = local.db_endpoint
    port     = tostring(local.db_port)
    dbname   = local.db_name
  }

  type = "Opaque"
}

# Application Secrets
resource "kubernetes_secret" "app_secrets" {
  metadata {
    name      = "app-secrets"
    namespace = kubernetes_namespace.monopoly_game.metadata[0].name
  }

  data = {
    jwt-secret = base64encode("monopoly-jwt-secret-key-2024")
  }

  type = "Opaque"
}

# Game Engine Deployment
resource "kubernetes_deployment" "game_engine" {
  metadata {
    name      = "game-engine"
    namespace = kubernetes_namespace.monopoly_game.metadata[0].name
    labels = {
      app = "game-engine"
    }
  }

  spec {
    replicas = var.game_engine_replicas

    selector {
      match_labels = {
        app = "game-engine"
      }
    }

    template {
      metadata {
        labels = {
          app = "game-engine"
        }
      }

      spec {
        container {
          image = var.game_engine_image
          name  = "game-engine"
          
          port {
            container_port = 3001
          }

          env {
            name  = "PORT"
            value = "3001"
          }
          
          env {
            name  = "NODE_ENV"
            value = "development"
          }

          env {
            name = "DB_HOST"
            value_from {
              secret_key_ref {
                name = kubernetes_secret.db_credentials.metadata[0].name
                key  = "host"
              }
            }
          }

          env {
            name = "DB_PORT"
            value_from {
              secret_key_ref {
                name = kubernetes_secret.db_credentials.metadata[0].name
                key  = "port"
              }
            }
          }

          env {
            name = "DB_NAME"
            value_from {
              secret_key_ref {
                name = kubernetes_secret.db_credentials.metadata[0].name
                key  = "dbname"
              }
            }
          }

          env {
            name = "DB_USER"
            value_from {
              secret_key_ref {
                name = kubernetes_secret.db_credentials.metadata[0].name
                key  = "username"
              }
            }
          }

          env {
            name = "DB_PASSWORD"
            value_from {
              secret_key_ref {
                name = kubernetes_secret.db_credentials.metadata[0].name
                key  = "password"
              }
            }
          }

          env {
            name  = "REDIS_HOST"
            value = local.redis_endpoint
          }

          env {
            name  = "REDIS_PORT"
            value = tostring(local.redis_port)
          }

          resources {
            limits = {
              cpu    = "500m"
              memory = "512Mi"
            }
            requests = {
              cpu    = "200m"
              memory = "256Mi"
            }
          }

          liveness_probe {
            http_get {
              path = "/health"
              port = 3001
            }
            initial_delay_seconds = 30
            period_seconds        = 10
          }

          readiness_probe {
            http_get {
              path = "/health"
              port = 3001
            }
            initial_delay_seconds = 5
            period_seconds        = 5
          }
        }
      }
    }
  }

  depends_on = [kubernetes_secret.db_credentials]
}

# User Service Deployment
resource "kubernetes_deployment" "user_service" {
  metadata {
    name      = "user-service"
    namespace = kubernetes_namespace.monopoly_game.metadata[0].name
    labels = {
      app = "user-service"
    }
  }

  spec {
    replicas = var.user_service_replicas

    selector {
      match_labels = {
        app = "user-service"
      }
    }

    template {
      metadata {
        labels = {
          app = "user-service"
        }
      }

      spec {
        container {
          image = var.user_service_image
          name  = "user-service"
          
          port {
            container_port = 3002
          }

          env {
            name  = "PORT"
            value = "3002"
          }

          env {
            name = "DB_HOST"
            value_from {
              secret_key_ref {
                name = kubernetes_secret.db_credentials.metadata[0].name
                key  = "host"
              }
            }
          }

          env {
            name = "DB_PORT"
            value_from {
              secret_key_ref {
                name = kubernetes_secret.db_credentials.metadata[0].name
                key  = "port"
              }
            }
          }

          env {
            name  = "DB_NAME"
            value = "monopoly_game"
          }

          env {
            name = "DB_USER"
            value_from {
              secret_key_ref {
                name = kubernetes_secret.db_credentials.metadata[0].name
                key  = "username"
              }
            }
          }

          env {
            name = "DB_PASSWORD"
            value_from {
              secret_key_ref {
                name = kubernetes_secret.db_credentials.metadata[0].name
                key  = "password"
              }
            }
          }

          env {
            name = "JWT_SECRET"
            value_from {
              secret_key_ref {
                name = kubernetes_secret.app_secrets.metadata[0].name
                key  = "jwt-secret"
              }
            }
          }

          resources {
            limits = {
              cpu    = "500m"
              memory = "512Mi"
            }
            requests = {
              cpu    = "200m"
              memory = "256Mi"
            }
          }

          liveness_probe {
            http_get {
              path = "/health/live"
              port = 3002
            }
            initial_delay_seconds = 30
            period_seconds        = 10
          }

          readiness_probe {
            http_get {
              path = "/health/ready"
              port = 3002
            }
            initial_delay_seconds = 5
            period_seconds        = 5
          }
        }
      }
    }
  }

  depends_on = [kubernetes_secret.db_credentials, kubernetes_secret.app_secrets]
}

# User Service
resource "kubernetes_service" "user_service" {
  metadata {
    name      = "user-service"
    namespace = kubernetes_namespace.monopoly_game.metadata[0].name
    labels = {
      app = "user-service"
    }
  }

  spec {
    selector = {
      app = "user-service"
    }

    port {
      port        = 3002
      target_port = 3002
      protocol    = "TCP"
    }

    type = "ClusterIP"
  }
}

# Matchmaking Service Deployment
resource "kubernetes_deployment" "matchmaking_service" {
  metadata {
    name      = "matchmaking-service"
    namespace = kubernetes_namespace.monopoly_game.metadata[0].name
    labels = {
      app = "matchmaking-service"
    }
  }

  spec {
    replicas = var.matchmaking_service_replicas

    selector {
      match_labels = {
        app = "matchmaking-service"
      }
    }

    template {
      metadata {
        labels = {
          app = "matchmaking-service"
        }
      }

      spec {
        container {
          image = var.matchmaking_service_image
          name  = "matchmaking-service"
          
          port {
            container_port = 3003
          }

          env {
            name  = "PORT"
            value = "3003"
          }

          env {
            name  = "REDIS_HOST"
            value = local.redis_endpoint
          }

          env {
            name  = "REDIS_PORT"
            value = tostring(local.redis_port)
          }

          env {
            name  = "GAME_ENGINE_URL"
            value = "http://game-engine-service:3001"
          }

          env {
            name  = "USER_SERVICE_URL"
            value = "http://user-service:3002"
          }

          resources {
            limits = {
              cpu    = "400m"
              memory = "512Mi"
            }
            requests = {
              cpu    = "200m"
              memory = "256Mi"
            }
          }

          liveness_probe {
            http_get {
              path = "/health/live"
              port = 3003
            }
            initial_delay_seconds = 30
            period_seconds        = 10
          }

          readiness_probe {
            http_get {
              path = "/health/ready"
              port = 3003
            }
            initial_delay_seconds = 5
            period_seconds        = 5
          }
        }
      }
    }
  }
}

# Matchmaking Service
resource "kubernetes_service" "matchmaking_service" {
  metadata {
    name      = "matchmaking-service"
    namespace = kubernetes_namespace.monopoly_game.metadata[0].name
    labels = {
      app = "matchmaking-service"
    }
  }

  spec {
    selector = {
      app = "matchmaking-service"
    }

    port {
      port        = 3003
      target_port = 3003
      protocol    = "TCP"
    }

    type = "ClusterIP"
  }
}

# Notification Service Deployment
resource "kubernetes_deployment" "notification_service" {
  metadata {
    name      = "notification-service"
    namespace = kubernetes_namespace.monopoly_game.metadata[0].name
    labels = {
      app = "notification-service"
    }
  }

  spec {
    replicas = var.notification_service_replicas

    selector {
      match_labels = {
        app = "notification-service"
      }
    }

    template {
      metadata {
        labels = {
          app = "notification-service"
        }
      }

      spec {
        container {
          image = var.notification_service_image
          name  = "notification-service"
          
          port {
            container_port = 3004
          }

          env {
            name  = "PORT"
            value = "3004"
          }

          env {
            name  = "REDIS_HOST"
            value = local.redis_endpoint
          }

          env {
            name  = "REDIS_PORT"
            value = tostring(local.redis_port)
          }

          env {
            name  = "FROM_EMAIL"
            value = "noreply@monopolygame.com"
          }

          resources {
            limits = {
              cpu    = "400m"
              memory = "512Mi"
            }
            requests = {
              cpu    = "200m"
              memory = "256Mi"
            }
          }

          liveness_probe {
            http_get {
              path = "/health/live"
              port = 3004
            }
            initial_delay_seconds = 30
            period_seconds        = 10
          }

          readiness_probe {
            http_get {
              path = "/health/ready"
              port = 3004
            }
            initial_delay_seconds = 5
            period_seconds        = 5
          }
        }
      }
    }
  }
}

# Notification Service
resource "kubernetes_service" "notification_service" {
  metadata {
    name      = "notification-service"
    namespace = kubernetes_namespace.monopoly_game.metadata[0].name
    labels = {
      app = "notification-service"
    }
  }

  spec {
    selector = {
      app = "notification-service"
    }

    port {
      port        = 3004
      target_port = 3004
      protocol    = "TCP"
    }

    type = "ClusterIP"
  }
}

# Game Engine Service
resource "kubernetes_service" "game_engine" {
  metadata {
    name      = "game-engine-service"
    namespace = kubernetes_namespace.monopoly_game.metadata[0].name
    labels = {
      app = "game-engine"
    }
  }

  spec {
    selector = {
      app = "game-engine"
    }

    port {
      port        = 3001
      target_port = 3001
      protocol    = "TCP"
    }

    type = "ClusterIP"
  }
}

# Ingress
resource "kubernetes_ingress_v1" "monopoly_ingress" {
  metadata {
    name      = "monopoly-ingress"
    namespace = kubernetes_namespace.monopoly_game.metadata[0].name
    annotations = {
      "kubernetes.io/ingress.class"                    = "alb"
      "alb.ingress.kubernetes.io/scheme"               = "internet-facing"
      "alb.ingress.kubernetes.io/target-type"          = "ip"
      "alb.ingress.kubernetes.io/listen-ports"         = "[{\"HTTP\":80}]"
      "alb.ingress.kubernetes.io/healthcheck-path"     = "/health"
      "alb.ingress.kubernetes.io/subnets"              = join(",", local.public_subnets)
      "alb.ingress.kubernetes.io/tags"                 = "Environment=development,Project=monopoly-game,ManagedBy=terraform"
    }
  }

  spec {
    rule {
      http {
        path {
          path      = "/api/auth"
          path_type = "Prefix"
          backend {
            service {
              name = kubernetes_service.user_service.metadata[0].name
              port {
                number = 3002
              }
            }
          }
        }
        
        path {
          path      = "/api/users"
          path_type = "Prefix"
          backend {
            service {
              name = kubernetes_service.user_service.metadata[0].name
              port {
                number = 3002
              }
            }
          }
        }
        
        path {
          path      = "/api/matchmaking"
          path_type = "Prefix"
          backend {
            service {
              name = kubernetes_service.matchmaking_service.metadata[0].name
              port {
                number = 3003
              }
            }
          }
        }
        
        path {
          path      = "/api/notifications"
          path_type = "Prefix"
          backend {
            service {
              name = kubernetes_service.notification_service.metadata[0].name
              port {
                number = 3004
              }
            }
          }
        }
        
        path {
          path      = "/"
          path_type = "Prefix"
          backend {
            service {
              name = kubernetes_service.game_engine.metadata[0].name
              port {
                number = 3001
              }
            }
          }
        }
      }
    }
  }

  depends_on = [helm_release.aws_load_balancer_controller]
}
