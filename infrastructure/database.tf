resource "azurerm_mssql_server" "primary" { # create pins-odt-sql-<env>-scheduling
  # checkov:skip=CKV2_AZURE_2: ADD REASON
  # checkov:skip=CKV_AZURE_23: Auditing to be added later
  # checkov:skip=CKV_AZURE_24: Auditing to be added later
  name                          = "${local.org}-sql-${local.service_name}-primary-${var.environment}"
  resource_group_name           = azurerm_resource_group.primary.name
  location                      = module.primary_region.location
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

resource "azurerm_private_endpoint" "sql_primary" {
  name                = "${local.org}-pe-${local.service_name}-sql-${var.environment}"
  resource_group_name = azurerm_resource_group.primary.name
  location            = module.primary_region.location
  subnet_id           = azurerm_subnet.main.id

  private_dns_zone_group {
    name                 = "sqlserverprivatednszone"
    private_dns_zone_ids = [data.azurerm_private_dns_zone.database.id]
  }

  private_service_connection {
    name                           = "privateendpointconnection"
    private_connection_resource_id = azurerm_mssql_server.primary.id
    subresource_names              = ["sqlServer"]
    is_manual_connection           = false
  }

  tags = local.tags
}

resource "azurerm_mssql_database" "primary" {
  # checkov:skip=CKV_AZURE_229: ADD REASON
  # checkov:skip=CKV_AZURE_224: TODO: Ensure that the Ledger feature is enabled on database that requires cryptographic proof and nonrepudiation of data integrity
  name        = "${local.org}-sqldb-${local.resource_suffix}"
  server_id   = azurerm_mssql_server.primary.id
  collation   = "SQL_Latin1_General_CP1_CI_AS"
  sku_name    = var.sql_config.sku_name
  max_size_gb = var.sql_config.max_size_gb

  short_term_retention_policy {
    retention_days = var.sql_config.retention.short_term_days
  }

  long_term_retention_policy {
    weekly_retention  = var.sql_config.retention.long_term_weekly
    monthly_retention = var.sql_config.retention.long_term_monthly
    yearly_retention  = var.sql_config.retention.long_term_yearly
    week_of_year      = var.sql_config.retention.long_term_week_of_year
  }

  tags = local.tags
}

resource "azurerm_key_vault_secret" "sql_admin_connection_string" {
  # checkov:skip=CKV_AZURE_41: TODO: Secret rotation
  key_vault_id = azurerm_key_vault.main.id
  name         = "${local.service_name}-sql-admin-connection-string"
  value = join(
    ";",
    [
      "sqlserver://${azurerm_mssql_server.primary.fully_qualified_domain_name}",
      "database=${azurerm_mssql_database.primary.name}",
      "user=${random_id.sql_admin_username.b64_url}",
      "password=${random_password.sql_admin_password.result}",
      "trustServerCertificate=false"
    ]
  )
  content_type = "connection-string"

  tags = local.tags
}

resource "azurerm_key_vault_secret" "sql_app_connection_string" {
  # checkov:skip=CKV_AZURE_41: TODO: Secret rotation
  key_vault_id = azurerm_key_vault.main.id
  name         = "${local.service_name}-sql-app-connection-string"
  value = join(
    ";",
    [
      "sqlserver://${azurerm_mssql_server.primary.fully_qualified_domain_name}",
      "database=${azurerm_mssql_database.primary.name}",
      "user=${random_id.sql_app_username.b64_url}",
      "password=${random_password.sql_app_password.result}",
      "trustServerCertificate=false"
    ]
  )
  content_type = "connection-string"

  tags = local.tags
}

resource "random_id" "sql_admin_username" {
  byte_length = 6
  prefix      = "${local.service_name}_admin_"
}

resource "random_password" "sql_admin_password" {
  length           = 32
  special          = true
  override_special = "#&-_+"
  min_lower        = 2
  min_upper        = 2
  min_numeric      = 2
  min_special      = 2
}

resource "random_id" "sql_app_username" {
  byte_length = 6
  prefix      = "${local.service_name}_app_"
}

resource "random_password" "sql_app_password" {
  length           = 32
  special          = true
  override_special = "#&-_+"
  min_lower        = 2
  min_upper        = 2
  min_numeric      = 2
  min_special      = 2
}
