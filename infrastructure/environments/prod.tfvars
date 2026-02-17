apps_config = {
  app_service_plan = {
    sku                      = "P1v3"
    per_site_scaling_enabled = false
    worker_count             = 1
    zone_balancing_enabled   = true
  }
  auth = {
    client_id                = "a303b5b2-f679-4787-929b-01943f72aa41"
    group_application_access = "408a00a6-c592-4684-acc0-fef83ea32c56"
  }
  blob_store = {
    disabled = false
  }
  functions_node_version = 22
  logging = {
    level = "info"
  }
  node_environment         = "production"
  private_endpoint_enabled = true
  redis = {
    capacity = 1
    family   = "C"
    sku_name = "Standard"
  }
}

common_config = {
  resource_group_name = "pins-rg-common-prod-ukw-001"
  action_group_names = {
    iap      = "pins-ag-odt-iap-prod"
    its      = "pins-ag-odt-its-prod"
    info_sec = "pins-ag-odt-info-sec-prod"
  }
}

environment = "prod"

front_door_config = {
  name        = "pins-fd-common-prod"
  rg          = "pins-rg-common-prod"
  ep_name     = "pins-fde-mpesc-prod"
  use_tooling = false
}

monitoring_config = {
  manage_app_insights_web_test_enabled = true
  log_daily_cap                        = 0.5
}

storage_config = {
  replication_type = "GZRS"
}

sql_config = {
  admin = {
    login_username = "pins-peas-row-commons-sql-prod"
    object_id      = "0a9c0370-0675-4216-b80b-1125ac2e8c80"
  }
  sku_name    = "S1"
  max_size_gb = 100
  retention = {
    audit_days             = 120
    short_term_days        = 30
    long_term_weekly       = "P1W"
    long_term_monthly      = "P1M"
    long_term_yearly       = "P1Y"
    long_term_week_of_year = 1
  }
  public_network_access_enabled = false
}

vnet_config = {
  address_space                       = "10.32.12.0/22"
  apps_subnet_address_space           = "10.32.12.0/24"
  main_subnet_address_space           = "10.32.13.0/24"
  secondary_address_space             = "10.32.28.0/22"
  secondary_apps_subnet_address_space = "10.32.28.0/24"
  secondary_subnet_address_space      = "10.32.29.0/24"
}

waf_rate_limits = {
  enabled             = true
  duration_in_minutes = 5
  threshold           = 1500
}

web_domains = {
  manage = "mpesc.planninginspectorate.gov.uk"
}
