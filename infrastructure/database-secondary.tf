resource "azurerm_mssql_server" "secondary" {

  # checkov:skip=CKV2_AZURE_2: ADD REASON
  # checkov:skip=CKV_AZURE_23: Auditing to be added later
  # checkov:skip=CKV_AZURE_24: Auditing to be added later

  name                          = "${local.org}-sql-${local.secondary_resource_suffix}"
  resource_group_name           = azurerm_resource_group.secondary.name
  location                      = module.secondary_region.location
  version                       = "12.0"
  administrator_login           = random_id.sql_admin_username.b64_url
  administrator_login_password  = random_password.sql_admin_password.result
  minimum_tls_version           = "1.2"
  public_network_access_enabled = false

  azuread_administrator {
    login_username = var.sql_config.admin.login_username
    object_id      = var.sql_config.admin.object_id
  }

  identity {
    type = "SystemAssigned"
  }

  tags = local.tags
}

resource "azurerm_private_endpoint" "sql_secondary" {
  name                = "${local.org}-pe-${local.service_name}-sql-secondary-${var.environment}"
  resource_group_name = azurerm_resource_group.secondary.name
  location            = module.secondary_region.location
  subnet_id           = azurerm_subnet.secondary.id

  private_dns_zone_group {
    name                 = "sqlserverprivatednszone"
    private_dns_zone_ids = [data.azurerm_private_dns_zone.database.id]
  }

  private_service_connection {
    name                           = "privateendpointconnection"
    private_connection_resource_id = azurerm_mssql_server.secondary.id
    subresource_names              = ["sqlServer"]
    is_manual_connection           = false
  }

  tags = local.tags
}

resource "azurerm_mssql_failover_group" "sql_failover" {
  name      = "${local.org}-sql-fog-${local.resource_suffix}"
  server_id = azurerm_mssql_server.primary.id
  databases = [azurerm_mssql_database.primary.id]

  partner_server {
    id = azurerm_mssql_server.secondary.id
  }

  read_write_endpoint_failover_policy {
    mode = "Manual" # TODO: confirm DR strategy
    # mode          = "Automatic"
    # grace_minutes = 60
  }

  tags = local.tags
}
