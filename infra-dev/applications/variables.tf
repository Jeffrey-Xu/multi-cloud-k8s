# Application Variables

variable "game_engine_image" {
  description = "Docker image for game engine"
  type        = string
  default     = "jeffreyxu2025/monopoly-game-engine:latest"
}

variable "game_engine_replicas" {
  description = "Number of game engine replicas"
  type        = number
  default     = 2
}

variable "user_service_image" {
  description = "Docker image for user service"
  type        = string
  default     = "jeffreyxu2025/monopoly-user-service:latest"
}

variable "user_service_replicas" {
  description = "Number of user service replicas"
  type        = number
  default     = 2
}

variable "matchmaking_service_image" {
  description = "Docker image for matchmaking service"
  type        = string
  default     = "jeffreyxu2025/monopoly-matchmaking-service:latest"
}

variable "matchmaking_service_replicas" {
  description = "Number of matchmaking service replicas"
  type        = number
  default     = 2
}

variable "notification_service_image" {
  description = "Docker image for notification service"
  type        = string
  default     = "jeffreyxu2025/monopoly-notification-service:latest"
}

variable "notification_service_replicas" {
  description = "Number of notification service replicas"
  type        = number
  default     = 2
}
