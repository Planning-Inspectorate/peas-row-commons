data "azurerm_client_config" "current" {}

data "azurerm_cdn_frontdoor_profile" "shared" {
  name                = var.front_door_config.name
  resource_group_name = var.front_door_config.rg
  provider            = azurerm.front_door
}

data "azurerm_cdn_frontdoor_endpoint" "shared" {
  name                = var.front_door_config.ep_name
  resource_group_name = var.front_door_config.rg
  profile_name        = var.front_door_config.name
  provider            = azurerm.front_door
}

data "azurerm_monitor_action_group" "common" {
  for_each = tomap(var.common_config.action_group_names)

  resource_group_name = var.common_config.resource_group_name
  name                = each.value
}

data "azurerm_private_dns_zone" "app_service" {
  name                = "privatelink.azurewebsites.net"
  resource_group_name = var.tooling_config.network_rg

  provider = azurerm.tooling
}

data "azurerm_private_dns_zone" "database" {
  name                = "privatelink.database.windows.net"
  resource_group_name = var.tooling_config.network_rg

  provider = azurerm.tooling
}

data "azurerm_private_dns_zone" "redis_cache" {
  name                = "privatelink.redis.cache.windows.net"
  resource_group_name = var.tooling_config.network_rg

  provider = azurerm.tooling
}

data "azurerm_virtual_network" "tooling" {
  name                = var.tooling_config.network_name
  resource_group_name = var.tooling_config.network_rg

  provider = azurerm.tooling
}
