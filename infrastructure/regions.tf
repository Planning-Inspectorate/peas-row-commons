module "primary_region" {
  #checkov:skip=CKV_TF_1: "Ensure Terraform module sources use a commit hash"
  source  = "claranet/regions/azurerm"
  version = "8.0.3"

  azure_region = local.primary_location
}

module "secondary_region" {
  #checkov:skip=CKV_TF_1: "Ensure Terraform module sources use a commit hash"
  source  = "claranet/regions/azurerm"
  version = "8.0.3"

  azure_region = local.secondary_location
}
