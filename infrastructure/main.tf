import {
  id = "https://pins-kv-peas-test.vault.azure.net/secrets/authorities-change-request-email/50875312af0e44499628cea0e8a36380"
  to = azurerm_key_vault_secret.manual_secrets["authorities-change-request-email"]
}

resource "azurerm_resource_group" "primary" {
  name     = "${local.org}-rg-${local.resource_suffix}"
  location = module.primary_region.location

  tags = local.tags
}

resource "azurerm_resource_group" "secondary" {
  name     = "${local.org}-rg-${local.secondary_resource_suffix}"
  location = module.secondary_region.location

  tags = local.tags
}

resource "azurerm_key_vault" "main" {
  # checkov:skip=CKV_AZURE_189: Consider moving to VPN; requires RBAC
  # checkov:skip=CKV_AZURE_109: Route traffic via a VNet; Private Endpoint consideration
  # checkov:skip=CKV2_AZURE_32: Private Endpoint relies on the VNet
  name                          = "${local.org}-kv-${local.resource_suffix}"
  location                      = module.primary_region.location
  resource_group_name           = azurerm_resource_group.primary.name
  enabled_for_disk_encryption   = true
  tenant_id                     = data.azurerm_client_config.current.tenant_id
  soft_delete_retention_days    = 7
  purge_protection_enabled      = true
  rbac_authorization_enabled    = true
  public_network_access_enabled = false
  sku_name                      = "standard"

  network_acls {
    bypass         = "AzureServices"
    default_action = "Deny"
  }

  tags = local.tags
}

# secrets to be manually populated
resource "azurerm_key_vault_secret" "manual_secrets" {
  #checkov:skip=CKV_AZURE_41: expiration not valid
  for_each = toset(local.secrets)

  key_vault_id = azurerm_key_vault.main.id
  name         = each.value
  value        = "<terraform_placeholder>"
  content_type = "plaintext"

  depends_on = [
    azurerm_private_endpoint.keyvault,
    azurerm_private_dns_zone_virtual_network_link.keyvault
  ]

  tags = local.tags

  lifecycle {
    ignore_changes = [
      value
    ]
  }
}

resource "azurerm_private_endpoint" "keyvault" {
  name                = "${local.org}-pe-keyvault-${local.resource_suffix}"
  location            = module.primary_region.location
  resource_group_name = azurerm_resource_group.primary.name
  subnet_id           = azurerm_subnet.main.id

  private_dns_zone_group {
    name                 = "${local.org}-pdns-${local.service_name}-keyvault-${var.environment}"
    private_dns_zone_ids = [data.azurerm_private_dns_zone.keyvault.id]
  }

  private_service_connection {
    name                           = "${local.org}-psc-keyvault-${local.resource_suffix}"
    private_connection_resource_id = azurerm_key_vault.main.id
    subresource_names              = ["vault"]
    is_manual_connection           = false
  }

  tags = local.tags
}
