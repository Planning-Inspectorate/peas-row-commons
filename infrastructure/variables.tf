# variables should be sorted A-Z

variable "alerts_enabled" {
  description = "Whether to enable Azure Monitor alerts"
  type        = string
  default     = true
}

variable "apps_config" {
  description = "Config for the apps"
  type = object({
    app_service_plan = object({
      sku                      = string
      per_site_scaling_enabled = bool
      worker_count             = number
      zone_balancing_enabled   = bool
    })
    node_environment         = string
    private_endpoint_enabled = bool

    auth = object({
      client_id                = string
      group_application_access = string
    })

    functions_node_version = number

    logging = object({
      level = string
    })

    redis = object({
      capacity = number
      family   = string
      sku_name = string
    })
  })
}

variable "common_config" {
  description = "Config for the common resources, such as action groups"
  type = object({
    resource_group_name = string
    action_group_names = object({
      iap      = string
      its      = string
      info_sec = string
    })
  })
}

variable "environment" {
  description = "The name of the environment in which resources will be deployed"
  type        = string
}

variable "front_door_config" {
  description = "Config for the frontdoor in tooling subscription"
  type = object({
    name        = string
    rg          = string
    ep_name     = string
    use_tooling = bool
  })
}

variable "health_check_eviction_time_in_min" {
  description = "The eviction time in minutes for the health check"
  type        = number
  default     = 10
}

variable "sql_config" {
  description = "Config for SQL Server and DB"
  type = object({
    admin = object({
      login_username = string
      object_id      = string
    })
    sku_name    = string
    max_size_gb = number
    retention = object({
      audit_days             = number
      short_term_days        = number
      long_term_weekly       = string
      long_term_monthly      = string
      long_term_yearly       = string
      long_term_week_of_year = number
    })
  })
}

variable "tags" {
  description = "A collection of tags to assign to taggable resources"
  type        = map(string)
  default     = {}
}

variable "tooling_config" {
  description = "Config for the tooling subscription resources"
  type = object({
    container_registry_name = string
    container_registry_rg   = string
    network_name            = string
    network_rg              = string
    subscription_id         = string
  })
}

variable "vnet_config" {
  description = "VNet configuration"
  type = object({
    address_space                       = string
    apps_subnet_address_space           = string
    main_subnet_address_space           = string
    secondary_address_space             = string
    secondary_apps_subnet_address_space = string
    secondary_subnet_address_space      = string
  })
}

variable "waf_rate_limits" {
  description = "Config for Service Bus"
  type = object({
    enabled             = bool
    duration_in_minutes = number
    threshold           = number
  })
}

variable "web_domains" {
  description = "value for manage domain"
  type = object({
    manage = string
  })
}
