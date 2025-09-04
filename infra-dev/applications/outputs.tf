# Application Outputs

output "application_url" {
  description = "URL to access the Monopoly game (available after ALB provisioning)"
  value       = length(kubernetes_ingress_v1.monopoly_ingress.status) > 0 && length(kubernetes_ingress_v1.monopoly_ingress.status[0].load_balancer) > 0 && length(kubernetes_ingress_v1.monopoly_ingress.status[0].load_balancer[0].ingress) > 0 ? "http://${kubernetes_ingress_v1.monopoly_ingress.status[0].load_balancer[0].ingress[0].hostname}" : "ALB provisioning in progress..."
}

output "namespace" {
  description = "Kubernetes namespace"
  value       = kubernetes_namespace.monopoly_game.metadata[0].name
}

output "game_engine_replicas" {
  description = "Number of game engine replicas"
  value       = kubernetes_deployment.game_engine.spec[0].replicas
}

output "deployment_status" {
  description = "Application deployment information"
  value = {
    namespace = kubernetes_namespace.monopoly_game.metadata[0].name
    services = {
      game_engine = {
        image = var.game_engine_image
        replicas = kubernetes_deployment.game_engine.spec[0].replicas
      }
      user_service = {
        image = var.user_service_image
        replicas = kubernetes_deployment.user_service.spec[0].replicas
      }
      matchmaking_service = {
        image = var.matchmaking_service_image
        replicas = kubernetes_deployment.matchmaking_service.spec[0].replicas
      }
      notification_service = {
        image = var.notification_service_image
        replicas = kubernetes_deployment.notification_service.spec[0].replicas
      }
    }
    load_balancer_controller = "Installed"
    storage_class = kubernetes_storage_class.gp3.metadata[0].name
  }
}

output "service_endpoints" {
  description = "Internal service endpoints"
  value = {
    game_engine = "http://game-engine-service:3001"
    user_service = "http://user-service:3002"
    matchmaking_service = "http://matchmaking-service:3003"
    notification_service = "http://notification-service:3004"
  }
}
