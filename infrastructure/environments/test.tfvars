apps_config = {
  app_service_plan = {
    sku                      = "P0v3"
    per_site_scaling_enabled = false
    worker_count             = 1
    zone_balancing_enabled   = false
  }
  node_environment         = "production"
  private_endpoint_enabled = true

  functions_node_version = 22

  logging = {
    level = "info"
  }

  redis = {
    capacity = 0
    family   = "C"
    sku_name = "Basic"
  }
}

common_config = {
  resource_group_name = "pins-rg-common-test-ukw-001"
  action_group_names = {
    iap      = "pins-ag-odt-iap-test"
    its      = "pins-ag-odt-its-test"
    info_sec = "pins-ag-odt-info-sec-test"
  }
}

environment = "test"

monitoring_config = {
  app_insights_web_test_enabled = false
}

sql_config = {
  admin = {
    login_username = "pins-peas-sql-test"
    object_id      = "f744d05a-df06-4b67-b5f9-2ea4b85fb490"
  }
  sku_name    = "Basic"
  max_size_gb = 2
  retention = {
    audit_days             = 7
    short_term_days        = 7
    long_term_weekly       = "P1W"
    long_term_monthly      = "P1M"
    long_term_yearly       = "P1Y"
    long_term_week_of_year = 1
  }
}

vnet_config = {
  address_space                       = "10.32.4.0/22"
  apps_subnet_address_space           = "10.32.4.0/24"
  main_subnet_address_space           = "10.32.5.0/24"
  secondary_address_space             = "10.32.20.0/22"
  secondary_apps_subnet_address_space = "10.32.20.0/24"
  secondary_subnet_address_space      = "10.32.21.0/24"
}

# web_domains = {
#   web = "https://<tbc>-manage-test.planninginspectorate.gov.uk"
# }
