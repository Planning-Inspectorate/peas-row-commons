resource "azurerm_cdn_frontdoor_origin_group" "manage" {
  name                     = "${local.org}-fd-${local.service_name}-manage-${var.environment}"
  cdn_frontdoor_profile_id = data.azurerm_cdn_frontdoor_profile.shared.id
  session_affinity_enabled = true
  provider                 = azurerm.front_door

  health_probe {
    interval_in_seconds = 240
    path                = "/"
    protocol            = "Https"
    request_type        = "HEAD"
  }

  load_balancing {
    additional_latency_in_milliseconds = 0
    sample_size                        = 16
    successful_samples_required        = 3
  }
}

resource "azurerm_cdn_frontdoor_origin" "manage" {
  name                          = "${local.org}-fd-${local.service_name}-manage-${var.environment}"
  cdn_frontdoor_origin_group_id = azurerm_cdn_frontdoor_origin_group.manage.id
  enabled                       = true

  certificate_name_check_enabled = true
  provider                       = azurerm.front_door

  host_name          = module.app_manage.default_site_hostname
  origin_host_header = module.app_manage.default_site_hostname
  http_port          = 80
  https_port         = 443
  priority           = 1
  weight             = 1000
}

resource "azurerm_cdn_frontdoor_custom_domain" "manage" {
  name                     = "${local.org}-fd-${local.service_name}-manage-${var.environment}"
  cdn_frontdoor_profile_id = data.azurerm_cdn_frontdoor_profile.shared.id
  host_name                = var.web_domains.manage
  provider                 = azurerm.front_door

  tls {
    certificate_type = "ManagedCertificate"
  }
}

resource "azurerm_cdn_frontdoor_route" "manage" {
  name                          = "${local.org}-fd-${local.service_name}-manage-${var.environment}"
  cdn_frontdoor_endpoint_id     = data.azurerm_cdn_frontdoor_endpoint.shared.id
  cdn_frontdoor_origin_group_id = azurerm_cdn_frontdoor_origin_group.manage.id
  cdn_frontdoor_origin_ids      = [azurerm_cdn_frontdoor_origin.manage.id]
  provider                      = azurerm.front_door

  cache {
    compression_enabled           = true
    content_types_to_compress     = local.content_types_to_compress
    query_string_caching_behavior = "UseQueryString"
  }

  forwarding_protocol    = "MatchRequest"
  https_redirect_enabled = true
  patterns_to_match      = ["/*"]
  supported_protocols    = ["Http", "Https"]

  cdn_frontdoor_custom_domain_ids = [azurerm_cdn_frontdoor_custom_domain.manage.id]
  link_to_default_domain          = false
}

resource "azurerm_cdn_frontdoor_custom_domain_association" "manage" {
  cdn_frontdoor_custom_domain_id = azurerm_cdn_frontdoor_custom_domain.manage.id
  cdn_frontdoor_route_ids        = [azurerm_cdn_frontdoor_route.manage.id]
  provider                       = azurerm.front_door
}

# WAF policy
resource "azurerm_cdn_frontdoor_firewall_policy" "manage" {
  name                              = replace("${local.org}-waf-${local.service_name}-web-${var.environment}", "-", "")
  resource_group_name               = var.front_door_config.rg
  sku_name                          = "Premium_AzureFrontDoor"
  enabled                           = true
  mode                              = "Prevention"
  redirect_url                      = "https://${var.web_domains.manage}/error/firewall-error"
  custom_block_response_status_code = 403
  provider                          = azurerm.front_door

  tags = local.tags

  # custom rules in priority order to match the API
  custom_rule {
    name     = "IpBlock"
    action   = "Block"
    enabled  = true
    priority = 10
    type     = "MatchRule"

    match_condition {
      match_variable     = "RemoteAddr"
      operator           = "IPMatch"
      negation_condition = false
      match_values = [
        "10.255.255.255" # placeholder value
      ]
    }
  }

  custom_rule {
    name                           = "RateLimitHttpRequest"
    enabled                        = var.waf_rate_limits.enabled
    priority                       = 100
    rate_limit_duration_in_minutes = var.waf_rate_limits.duration_in_minutes
    rate_limit_threshold           = var.waf_rate_limits.threshold
    type                           = "RateLimitRule"
    action                         = "Block"

    match_condition {
      match_variable = "RequestMethod"
      operator       = "Equal"
      match_values = [
        "GET",
        "POST",
        "PUT",
        "DELETE",
        "COPY",
        "MOVE",
        "HEAD",
        "OPTIONS"
      ]
    }
  }

  managed_rule {
    type    = "Microsoft_DefaultRuleSet"
    version = "2.1"
    action  = "Block"

    override {
      rule_group_name = "PROTOCOL-ATTACK"
      rule {
        action  = "AnomalyScoring"
        rule_id = "921110"
      }
      exclusion {
        match_variable = "RequestBodyPostArgNames"
        operator       = "Equals"
        selector       = "files"
      }
      exclusion {
        match_variable = "RequestBodyPostArgNames"
        operator       = "Equals"
        selector       = "_csrf"
      }
    }

    override {
      rule_group_name = "SQLI"
      rule {
        action  = "AnomalyScoring"
        rule_id = "942390"
      }
      exclusion {
        match_variable = "RequestBodyPostArgNames"
        operator       = "Equals"
        selector       = "myselfComment"
      }
      exclusion {
        match_variable = "RequestBodyPostArgNames"
        operator       = "Equals"
        selector       = "submitterComment"
      }
      exclusion {
        match_variable = "RequestBodyPostArgNames"
        operator       = "Equals"
        selector       = "_csrf"
      }
      exclusion {
        match_variable = "RequestBodyPostArgNames"
        operator       = "Equals"
        selector       = "healthAndSafetyIssue"
      }
    }

    override {
      rule_group_name = "General"
      rule {
        action  = "Log"
        rule_id = "200002"
      }
      rule {
        action  = "Log"
        rule_id = "200003"
      }
    }
  }

  managed_rule {
    type    = "Microsoft_BotManagerRuleSet"
    version = "1.1"
    action  = "Block"
  }

  lifecycle {
    ignore_changes = [
      # match the first custom rule (IpBlock) and ignore the match values (IPs)
      # managed in manage
      custom_rule[0].match_condition[0].match_values
    ]
  }
}

resource "azurerm_cdn_frontdoor_security_policy" "manage" {
  name                     = replace("${local.org}-sec-${local.service_name}-web-${var.environment}", "-", "")
  cdn_frontdoor_profile_id = data.azurerm_cdn_frontdoor_profile.shared.id
  provider                 = azurerm.front_door

  security_policies {
    firewall {
      cdn_frontdoor_firewall_policy_id = azurerm_cdn_frontdoor_firewall_policy.manage.id

      association {
        domain {
          cdn_frontdoor_domain_id = azurerm_cdn_frontdoor_custom_domain.manage.id
        }
        patterns_to_match = ["/*"]
      }
    }
  }
}
