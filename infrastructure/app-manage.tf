module "app_manage" {
  #checkov:skip=CKV_TF_1: Use of commit hash are not required for our Terraform modules
  source = "github.com/Planning-Inspectorate/infrastructure-modules.git//modules/node-app-service?ref=1.53"

  resource_group_name = azurerm_resource_group.primary.name
  location            = module.primary_region.location

  # naming
  app_name        = "manage"
  resource_suffix = var.environment
  service_name    = local.service_name
  tags            = local.tags

  # service plan & scaling
  app_service_plan_id                  = azurerm_service_plan.apps.id
  app_service_plan_resource_group_name = azurerm_resource_group.primary.name
  worker_count                         = var.apps_config.app_service_plan.worker_count

  # container
  container_registry_name = var.tooling_config.container_registry_name
  container_registry_rg   = var.tooling_config.container_registry_rg
  image_name              = "peas/manage"

  # networking
  app_service_private_dns_zone_id = data.azurerm_private_dns_zone.app_service.id
  inbound_vnet_connectivity       = var.apps_config.private_endpoint_enabled
  integration_subnet_id           = azurerm_subnet.apps.id
  endpoint_subnet_id              = azurerm_subnet.main.id
  outbound_vnet_connectivity      = true
  # public access via Front Door
  front_door_restriction = true
  public_network_access  = true

  # monitoring
  action_group_ids                  = local.action_group_ids
  log_analytics_workspace_id        = azurerm_log_analytics_workspace.main.id
  monitoring_alerts_enabled         = var.alerts_enabled
  health_check_path                 = "/health"
  health_check_eviction_time_in_min = var.health_check_eviction_time_in_min

  app_settings = {
    APPLICATIONINSIGHTS_CONNECTION_STRING      = local.key_vault_refs["app-insights-connection-string"]
    ApplicationInsightsAgent_EXTENSION_VERSION = "~3"
    NODE_ENV                                   = var.apps_config.node_environment
    ENVIRONMENT                                = var.environment

    APP_HOSTNAME                  = var.web_domains.manage
    PORTAL_HOSTNAME               = "https://${var.web_domains.manage}"
    AUTH_CLIENT_ID                = var.apps_config.auth.client_id
    AUTH_CLIENT_SECRET            = local.key_vault_refs["peas-client-secret"]
    AUTH_GROUP_APPLICATION_ACCESS = var.apps_config.auth.group_application_access
    AUTH_TENANT_ID                = data.azurerm_client_config.current.tenant_id

    # logging
    LOG_LEVEL = var.apps_config.logging.level

    # database connection
    SQL_CONNECTION_STRING = local.key_vault_refs["sql-app-connection-string"]

    # retries
    RETRY_MAX_ATTEMPTS = "3"
    # got default retry codes
    # https://github.com/sindresorhus/got/blob/main/documentation/7-retry.md
    RETRY_STATUS_CODES = "408,413,429,500,502,503,504,521,522,524"

    # sessions
    REDIS_CONNECTION_STRING = local.key_vault_refs["redis-connection-string"]
    SESSION_SECRET          = local.key_vault_refs["session-secret-web"]

    #Auth
    MICROSOFT_PROVIDER_AUTHENTICATION_SECRET = local.key_vault_refs["microsoft-provider-authentication-secret"]
    WEBSITE_AUTH_AAD_ALLOWED_TENANTS         = data.azurerm_client_config.current.tenant_id

    # gov notify
    GOV_NOTIFY_API_KEY = local.key_vault_refs["peas-gov-notify-api-key"]
  }

  providers = {
    azurerm         = azurerm
    azurerm.tooling = azurerm.tooling
  }
}

## RBAC for secrets
resource "azurerm_role_assignment" "app_secrets_user" {
  scope                = azurerm_key_vault.main.id
  role_definition_name = "Key Vault Secrets User"
  principal_id         = module.app_manage.principal_id
}

## RBAC for secrets (staging slot)
resource "azurerm_role_assignment" "app_web_staging_secrets_user" {
  scope                = azurerm_key_vault.main.id
  role_definition_name = "Key Vault Secrets User"
  principal_id         = module.app_manage.staging_principal_id
}

## sessions
resource "random_password" "web_session_secret" {
  length  = 32
  special = true
}

resource "azurerm_key_vault_secret" "web_session_secret" {
  #checkov:skip=CKV_AZURE_41: TODO: Secret rotation
  key_vault_id = azurerm_key_vault.main.id
  name         = "${local.service_name}-web-session-secret"
  value        = random_password.web_session_secret.result
  content_type = "session-secret"

  tags = local.tags
}
