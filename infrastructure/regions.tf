module "primary_region" {
  #checkov:skip=CKV_TF_1: "Ensure Terraform module sources use a commit hash"
  source  = "claranet/regions/azurerm"
  version = "9.0.0"

  azure_region = local.primary_location
}

module "secondary_region" {
  #checkov:skip=CKV_TF_1: "Ensure Terraform module sources use a commit hash"
  source  = "claranet/regions/azurerm"
  version = "9.0.0"

  azure_region = local.secondary_location
}
