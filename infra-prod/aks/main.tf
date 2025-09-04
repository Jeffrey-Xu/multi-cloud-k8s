# Copyright (c) HashiCorp, Inc. # SPDX-License-Identifier: MPL-2.0
resource "random_pet" "prefix" {}


provider "azurerm" {
  features {}
  subscription_id = "4b87ad63-6cff-4c15-b43b-d8b01881b40b"
}

resource "azurerm_resource_group" "default" {
  name     = "${random_pet.prefix.id}-aks"
  location = "West US 2"
  tags = {
    environment = "Demo"
  }
}

resource "azurerm_kubernetes_cluster" "default" {
  name                = "${random_pet.prefix.id}-aks"
  location            = azurerm_resource_group.default.location
  resource_group_name = azurerm_resource_group.default.name
  dns_prefix          = "${random_pet.prefix.id}-k8s"
  kubernetes_version  = "1.33.2"

  default_node_pool {
    name       = "default"
    node_count = 3
    vm_size    = "Standard_D2s_v3"
    os_disk_size_gb = 30
  }

  identity {
    type = "SystemAssigned"
  }

  tags = {
    environment = "Demo"
  }
}