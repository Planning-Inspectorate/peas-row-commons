apps_config = {
  app_service_plan = {
    sku                      = "P0v3"
    per_site_scaling_enabled = false
    worker_count             = 1
    zone_balancing_enabled   = false
  }
  node_environment         = "development"
  private_endpoint_enabled = true

  auth = {
    client_id                = "085639e9-5584-42dd-ac00-3537ae8c38a6"
    group_application_access = "a472644a-44ec-42fe-92fb-0dd95e5f2159"
  }

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
  resource_group_name = "pins-rg-common-dev-ukw-001"
  action_group_names = {
    iap      = "pins-ag-odt-iap-dev"
    its      = "pins-ag-odt-its-dev"
    info_sec = "pins-ag-odt-info-sec-dev"
  }
}

environment = "dev"

front_door_config = {
  name        = "pins-fd-common-tooling"
  rg          = "pins-rg-common-tooling"
  ep_name     = "pins-fde-peas"
  use_tooling = true
}

monitoring_config = {
  manage_app_insights_web_test_enabled = false
  log_daily_cap                        = 0.1
}

sql_config = {
  admin = {
    login_username = "pins-peas-row-commons-sql-dev"
    object_id      = "13356659-79b6-41ca-91a0-4a16b126c306"
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
  address_space                       = "10.32.0.0/22"
  apps_subnet_address_space           = "10.32.0.0/24"
  main_subnet_address_space           = "10.32.1.0/24"
  secondary_address_space             = "10.32.16.0/22"
  secondary_apps_subnet_address_space = "10.32.16.0/24"
  secondary_subnet_address_space      = "10.32.17.0/24"
}

waf_rate_limits = {
  enabled             = true
  duration_in_minutes = 5
  threshold           = 1500
}

web_domains = {
  manage = "peas-row-manage-dev.planninginspectorate.gov.uk"
}
