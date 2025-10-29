resource "azurerm_redis_cache" "web" {
  name                = "${local.org}-redis-cache-${local.resource_suffix}"
  resource_group_name = azurerm_resource_group.primary.name
  location            = module.primary_region.location

  capacity                      = var.apps_config.redis.capacity
  family                        = var.apps_config.redis.family
  sku_name                      = var.apps_config.redis.sku_name
  public_network_access_enabled = false
  minimum_tls_version           = "1.2"
}

resource "azurerm_private_endpoint" "redis_web" {
  name                = "${local.org}-pe-${local.service_name}-redis-cache-${var.environment}"
  resource_group_name = azurerm_resource_group.primary.name
  location            = module.primary_region.location
  subnet_id           = azurerm_subnet.main.id

  private_dns_zone_group {
    name                 = "pins-pdns-${local.service_name}-redis-cache-${var.environment}"
    private_dns_zone_ids = [data.azurerm_private_dns_zone.redis_cache.id]
  }

  private_service_connection {
    name                           = "pins-psc-${local.service_name}-redis-cache-${var.environment}"
    private_connection_resource_id = azurerm_redis_cache.web.id
    is_manual_connection           = false
    subresource_names              = ["redisCache"]
  }
}

resource "azurerm_key_vault_secret" "redis_web_connection_string" {
  #checkov:skip=CKV_AZURE_41: TODO: Secret rotation
  key_vault_id = azurerm_key_vault.main.id
  name         = "${local.service_name}-redis-cache-connection-string"
  value        = azurerm_redis_cache.web.primary_connection_string
  content_type = "connection-string"

  tags = local.tags
}
