resource "azurerm_storage_account" "sql_server" {
  #TODO: Customer Managed Keys
  #checkov:skip=CKV2_AZURE_1: Customer Managed Keys not implemented yet
  #checkov:skip=CKV2_AZURE_18: Customer Managed Keys not implemented yet
  #TODO: Logging
  #checkov:skip=CKV_AZURE_33: Not using queues, could implement example commented out
  #checkov:skip=CKV2_AZURE_21: Logging not implemented yet
  #TODO: Access restrictions
  #checkov:skip=CKV_AZURE_35: Network access restrictions
  #checkov:skip=CKV_AZURE_59: TODO: Ensure that Storage accounts disallow public access
  #checkov:skip=CKV2_AZURE_33: "Ensure storage account is configured with private endpoint"
  #checkov:skip=CKV2_AZURE_38: "Ensure soft-delete is enabled on Azure storage account"
  #checkov:skip=CKV2_AZURE_40: "Ensure storage account is not configured with Shared Key authorization"
  #checkov:skip=CKV2_AZURE_41: "Ensure storage account is configured with SAS expiration policy"
  name                             = "pinsstsqlpeas${var.environment}"
  resource_group_name              = azurerm_resource_group.primary.name
  location                         = module.primary_region.location
  account_tier                     = "Standard"
  account_replication_type         = "GRS"
  min_tls_version                  = "TLS1_2"
  https_traffic_only_enabled       = true
  allow_nested_items_to_be_public  = false
  cross_tenant_replication_enabled = false

  # network_rules {
  #   default_action             = "Deny"
  #   ip_rules                   = ["127.0.0.1"]
  #   virtual_network_subnet_ids = [azurerm_subnet.back_office_ingress.id]
  #   bypass                     = ["AzureServices"]
  # }

  identity {
    type = "SystemAssigned"
  }

  tags = local.tags
}

resource "azurerm_storage_container" "sql_server" {
  #TODO: Logging
  #checkov:skip=CKV2_AZURE_21 Logging not implemented yet
  name                  = "sqlvulnerabilityassessment"
  storage_account_id    = azurerm_storage_account.sql_server.id
  container_access_type = "private"
}

resource "azurerm_role_assignment" "sql_server_storage" {
  scope                = azurerm_storage_account.sql_server.id
  role_definition_name = "Storage Blob Data Contributor"
  principal_id         = azurerm_mssql_server.primary.identity[0].principal_id
}

# auditing policy
resource "azurerm_mssql_server_extended_auditing_policy" "sql_server" {
  enabled                    = true
  storage_endpoint           = azurerm_storage_account.sql_server.primary_blob_endpoint
  storage_account_access_key = azurerm_storage_account.sql_server.primary_access_key
  server_id                  = azurerm_mssql_server.primary.id
  retention_in_days          = var.sql_config.retention.audit_days
  log_monitoring_enabled     = false

  depends_on = [
    azurerm_role_assignment.sql_server_storage,
    azurerm_storage_account.sql_server,
  ]
}

# security alerts
resource "azurerm_mssql_server_security_alert_policy" "sql_server" {
  state                      = var.alerts_enabled ? "Enabled" : "Disabled"
  resource_group_name        = azurerm_resource_group.primary.name
  server_name                = azurerm_mssql_server.primary.name
  storage_endpoint           = azurerm_storage_account.sql_server.primary_blob_endpoint
  storage_account_access_key = azurerm_storage_account.sql_server.primary_access_key
  retention_days             = var.sql_config.retention.audit_days
  email_account_admins       = true
  email_addresses            = local.tech_emails
}

# vulnerabilty assesment
resource "azurerm_mssql_server_vulnerability_assessment" "peas_sql_server" {
  count = var.alerts_enabled ? 1 : 0

  #checkov:skip=CKV2_AZURE_3: scans enabled by env
  #checkov:skip=CKV2_AZURE_4: false positive?
  #checkov:skip=CKV2_AZURE_5: false positive?
  server_security_alert_policy_id = azurerm_mssql_server_security_alert_policy.sql_server.id
  storage_container_path          = "${azurerm_storage_account.sql_server.primary_blob_endpoint}${azurerm_storage_container.sql_server.name}/"
  storage_account_access_key      = azurerm_storage_account.sql_server.primary_access_key

  recurring_scans {
    enabled                   = var.alerts_enabled
    email_subscription_admins = true
    emails                    = local.tech_emails
  }
}

# Metric Alerts
resource "azurerm_monitor_metric_alert" "sql_db_cpu_alert" {
  name                = "${local.service_name} SQL CPU Alert ${local.resource_suffix}"
  resource_group_name = azurerm_resource_group.primary.name
  scopes              = [azurerm_mssql_database.primary.id]
  description         = "Action will be triggered when cpu percent is greater than 80."
  window_size         = "PT5M"
  frequency           = "PT1M"
  severity            = 2
  enabled             = var.alerts_enabled

  criteria {
    metric_namespace = "Microsoft.Sql/servers/databases"
    metric_name      = "cpu_percent"
    aggregation      = "Average"
    operator         = "GreaterThan"
    threshold        = 80
  }

  action {
    action_group_id = azurerm_monitor_action_group.peas_tech.id
  }

  tags = local.tags
}

resource "azurerm_monitor_metric_alert" "sql_db_dtu_alert" {
  name                = "${local.service_name} SQL DTU Alert ${local.resource_suffix}"
  resource_group_name = azurerm_resource_group.primary.name
  scopes              = [azurerm_mssql_database.primary.id]
  description         = "Action will be triggered when DTU percent is greater than 80."
  window_size         = "PT5M"
  frequency           = "PT1M"
  severity            = 2
  enabled             = var.alerts_enabled

  criteria {
    metric_namespace = "Microsoft.Sql/servers/databases"
    metric_name      = "dtu_consumption_percent"
    aggregation      = "Average"
    operator         = "GreaterThan"
    threshold        = 80
  }

  action {
    action_group_id = azurerm_monitor_action_group.peas_tech.id
  }

  tags = local.tags
}

resource "azurerm_monitor_metric_alert" "sql_db_log_io_alert" {
  name                = "${local.service_name} SQL Log IO Alert ${local.resource_suffix}"
  resource_group_name = azurerm_resource_group.primary.name
  scopes              = [azurerm_mssql_database.primary.id]
  description         = "Action will be triggered when Log write percent is greater than 80."
  window_size         = "PT5M"
  frequency           = "PT1M"
  severity            = 2
  enabled             = var.alerts_enabled

  criteria {
    metric_namespace = "Microsoft.Sql/servers/databases"
    metric_name      = "log_write_percent"
    aggregation      = "Average"
    operator         = "GreaterThan"
    threshold        = 80
  }

  action {
    action_group_id = azurerm_monitor_action_group.peas_tech.id
  }

  tags = local.tags
}

resource "azurerm_monitor_metric_alert" "sql_db_deadlock_alert" {
  name                = "${local.service_name} SQL Deadlock Alert ${local.resource_suffix}"
  resource_group_name = azurerm_resource_group.primary.name
  scopes              = [azurerm_mssql_database.primary.id]
  description         = "Action will be triggered whenever the count of deadlocks is greater than 1."
  window_size         = "PT5M"
  frequency           = "PT1M"
  severity            = 2
  enabled             = var.alerts_enabled

  criteria {
    metric_namespace = "Microsoft.Sql/servers/databases"
    metric_name      = "deadlock"
    aggregation      = "Count"
    operator         = "GreaterThanOrEqual"
    threshold        = 1
  }

  action {
    action_group_id = azurerm_monitor_action_group.peas_tech.id
  }

  tags = local.tags
}
