locals {
  org                = "pins"
  service_name       = "peas"
  primary_location   = "uk-south"
  secondary_location = "uk-west"

  resource_suffix           = "${local.service_name}-${var.environment}"
  secondary_resource_suffix = "${local.service_name}-secondary-${var.environment}"

  secrets = [
    "peas-client-secret",
    "peas-gov-notify-api-key",
    "microsoft-provider-authentication-secret"
  ]

  key_vault_refs = merge(
    {
      for k, v in azurerm_key_vault_secret.manual_secrets : k => "@Microsoft.KeyVault(SecretUri=${v.versionless_id})"
    },
    {
      "app-insights-connection-string" = "@Microsoft.KeyVault(SecretUri=${azurerm_key_vault_secret.app_insights_connection_string.versionless_id})",
      "redis-connection-string"        = "@Microsoft.KeyVault(SecretUri=${azurerm_key_vault_secret.redis_web_connection_string.versionless_id})"
      "session-secret-web"             = "@Microsoft.KeyVault(SecretUri=${azurerm_key_vault_secret.web_session_secret.versionless_id})"
      "sql-app-connection-string"      = "@Microsoft.KeyVault(SecretUri=${azurerm_key_vault_secret.sql_app_connection_string.versionless_id})"
    }
  )

  tech_emails = [for rec in azurerm_monitor_action_group.peas_tech.email_receiver : rec.email_address]

  action_group_ids = {
    tech            = azurerm_monitor_action_group.peas_tech.id
    service_manager = azurerm_monitor_action_group.peas_service_manager.id
    iap             = data.azurerm_monitor_action_group.common["iap"].id,
    its             = data.azurerm_monitor_action_group.common["its"].id,
    info_sec        = data.azurerm_monitor_action_group.common["info_sec"].id
  }

  tags = {
    CreatedBy   = "terraform"
    Environment = var.environment
    ServiceName = local.service_name
    location    = local.primary_location
  }

  # all content types to compress, as a default, but has to be specified
  content_types_to_compress = [
    "application/eot",
    "application/font",
    "application/font-sfnt",
    "application/javascript",
    "application/json",
    "application/opentype",
    "application/otf",
    "application/pkcs7-mime",
    "application/truetype",
    "application/ttf",
    "application/vnd.ms-fontobject",
    "application/xhtml+xml",
    "application/xml",
    "application/xml+rss",
    "application/x-font-opentype",
    "application/x-font-truetype",
    "application/x-font-ttf",
    "application/x-httpd-cgi",
    "application/x-mpegurl",
    "application/x-opentype",
    "application/x-otf",
    "application/x-perl",
    "application/x-ttf",
    "application/x-javascript",
    "font/eot",
    "font/ttf",
    "font/otf",
    "font/opentype",
    "image/svg+xml",
    "text/css",
    "text/csv",
    "text/html",
    "text/javascript",
    "text/js",
    "text/plain",
    "text/richtext",
    "text/tab-separated-values",
    "text/xml",
    "text/x-script",
    "text/x-component",
    "text/x-java-source"
  ]
}
