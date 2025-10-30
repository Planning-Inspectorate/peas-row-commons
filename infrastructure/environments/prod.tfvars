#########################################################
############ VALUES BASED FROM CROWN PROD ###############
#########################################################


#apps_config = {
#   app_service_plan = {
#     sku                      = "P1v3"
#     per_site_scaling_enabled = true
#     worker_count             = 3
#     zone_balancing_enabled   = true
#   }
#   node_environment         = "production"
#   private_endpoint_enabled = true

#   functions_node_version = 22

#   logging = {
#     level = "info"
#   }

#   redis = {
#     capacity = 1
#     family   = "C"
#     sku_name = "Standard"
#   }
# }

# common_config = {
#   resource_group_name = "pins-rg-common-prod-ukw-001"
#   action_group_names = {
#     iap      = "pins-ag-odt-iap-prod"
#     its      = "pins-ag-odt-its-prod"
#     info_sec = "pins-ag-odt-info-sec-prod"
#   }
# }

# environment = "prod"

# monitoring_config = {
#   app_insights_web_test_enabled = true
#   log_daily_cap                 = 0.5
# }

# sql_config = {
#   admin = {
#     login_username = "pins-peas-sql-prod"
#     object_id      = "0a9c0370-0675-4216-b80b-1125ac2e8c80"
#   }
#   sku_name    = "S3"
#   max_size_gb = 100
#   retention = {
#     audit_days             = 7
#     short_term_days        = 7
#     long_term_weekly       = "P1W"
#     long_term_monthly      = "P1M"
#     long_term_yearly       = "P1Y"
#     long_term_week_of_year = 1
#   }
#   public_network_access_enabled = false
# }

# vnet_config = {
#   address_space                       = "10.32.12.0/22"
#   apps_subnet_address_space           = "10.32.12.0/24"
#   main_subnet_address_space           = "10.32.13.0/24"
#   secondary_address_space             = "10.32.28.0/22"
#   secondary_apps_subnet_address_space = "10.32.28.0/24"
#   secondary_subnet_address_space      = "10.32.29.0/24"
# }

# # web_domains = {
# #   web = "https://<tbc>-manage-prod.planninginspectorate.gov.uk"
# # }
