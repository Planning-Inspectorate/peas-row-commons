resource "azurerm_storage_account" "documents" {
  #checkov:skip=CKV2_AZURE_1: Customer Managed Keys not implemented yet
  #checkov:skip=CKV2_AZURE_18: Azure Storage account Encryption CMKs Disabled
  #checkov:skip=CKV_AZURE_33: Not using queues, could implement example commented out
  #checkov:skip=CKV2_AZURE_21: Logging not implemented yet
  #checkov:skip=CKV2_AZURE_38: "Ensure soft-delete is enabled on Azure storage account"
  #checkov:skip=CKV2_AZURE_40: "Ensure storage account is not configured with Shared Key authorization"
  #checkov:skip=CKV2_AZURE_41: "Ensure storage account is configured with SAS expiration policy"
  name                             = "pinsstdocpeas${var.environment}"
  resource_group_name              = azurerm_resource_group.primary.name
  location                         = module.primary_region.location
  account_tier                     = "Standard"
  account_replication_type         = var.storage_config.replication_type
  min_tls_version                  = "TLS1_2"
  https_traffic_only_enabled       = true
  allow_nested_items_to_be_public  = false
  cross_tenant_replication_enabled = false
  public_network_access_enabled    = true

  identity {
    type = "SystemAssigned"
  }

  tags = local.tags
}

resource "azurerm_storage_container" "documents" {
  #checkov:skip=CKV2_AZURE_21 Logging not implemented yet
  name                  = "${local.service_name}-documents"
  storage_account_id    = azurerm_storage_account.documents.id
  container_access_type = "blob"
}

resource "azurerm_private_endpoint" "documents" {
  name                = "${local.org}-pe-${local.service_name}-documents-${var.environment}"
  location            = module.primary_region.location
  resource_group_name = azurerm_resource_group.primary.name
  subnet_id           = azurerm_subnet.main.id

  private_service_connection {
    name                           = "${local.org}-psc-${local.service_name}-documents-${var.environment}"
    private_connection_resource_id = azurerm_storage_account.documents.id
    subresource_names              = ["blob"]
    is_manual_connection           = false
  }

  private_dns_zone_group {
    name                 = "${local.org}-pdns-${local.service_name}-documents-${var.environment}"
    private_dns_zone_ids = [data.azurerm_private_dns_zone.storage.id]
  }

  tags = local.tags
}

resource "azurerm_role_assignment" "documents_rbac" {
  scope                = azurerm_storage_container.documents.id
  role_definition_name = "Storage Blob Data Contributor"
  principal_id         = module.app_manage.principal_id
}
