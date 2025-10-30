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
  name                        = "${local.org}-kv-${local.resource_suffix}"
  location                    = module.primary_region.location
  resource_group_name         = azurerm_resource_group.primary.name
  enabled_for_disk_encryption = true
  tenant_id                   = data.azurerm_client_config.current.tenant_id
  soft_delete_retention_days  = 7
  purge_protection_enabled    = true
  rbac_authorization_enabled  = true
  sku_name                    = "standard"

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

  tags = local.tags

  lifecycle {
    ignore_changes = [
      value
    ]
  }
}
