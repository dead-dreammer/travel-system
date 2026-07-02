data "aws_caller_identity" "current" {}

resource "aws_api_gateway_rest_api" "main" {
  name = "${var.project_name}-${var.environment}-api"
  endpoint_configuration { types = ["REGIONAL"] }
}

resource "aws_api_gateway_authorizer" "cognito" {
  name          = "cognito-authorizer"
  rest_api_id   = aws_api_gateway_rest_api.main.id
  type          = "COGNITO_USER_POOLS"
  provider_arns = ["arn:aws:cognito-idp:${var.aws_region}:${data.aws_caller_identity.current.account_id}:userpool/${var.hr_cognito_user_pool_id}"]
}

locals {
  routes = {
    "travel-requests"   = { lambda_arn = var.requests_lambda_invoke_arn,  function_name = var.requests_lambda_function_name,  has_id = true }
    "approvals"         = { lambda_arn = var.approvals_lambda_invoke_arn, function_name = var.approvals_lambda_function_name, has_id = true }
    "bookings"          = { lambda_arn = var.bookings_lambda_invoke_arn,  function_name = var.bookings_lambda_function_name,  has_id = false }
    "expenses"          = { lambda_arn = var.expenses_lambda_invoke_arn,  function_name = var.expenses_lambda_function_name,  has_id = true }
    "documents"         = { lambda_arn = var.documents_lambda_invoke_arn, function_name = var.documents_lambda_function_name, has_id = false }
    "advisories"        = { lambda_arn = var.advisories_lambda_invoke_arn,function_name = var.advisories_lambda_function_name,has_id = true }
  }
}

# Root resources for each path
resource "aws_api_gateway_resource" "root" {
  for_each    = local.routes
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_rest_api.main.root_resource_id
  path_part   = each.key
}

resource "aws_api_gateway_method" "proxy" {
  for_each      = local.routes
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.root[each.key].id
  http_method   = "ANY"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito.id
}

resource "aws_api_gateway_integration" "proxy" {
  for_each                = local.routes
  rest_api_id             = aws_api_gateway_rest_api.main.id
  resource_id             = aws_api_gateway_resource.root[each.key].id
  http_method             = aws_api_gateway_method.proxy[each.key].http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = each.value.lambda_arn
}

# Grants API Gateway permission to invoke each Lambda. Without this, every
# route above returns an authorization error at invoke time regardless of
# how the integration is wired.
resource "aws_lambda_permission" "proxy" {
  for_each      = local.routes
  statement_id  = "AllowAPIGatewayInvoke-${each.key}"
  action        = "lambda:InvokeFunction"
  function_name = each.value.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.main.execution_arn}/*/*"
}

# Reports sub-resources
resource "aws_api_gateway_resource" "reports" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_rest_api.main.root_resource_id
  path_part   = "reports"
}

resource "aws_api_gateway_resource" "reports_proxy" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_resource.reports.id
  path_part   = "{proxy+}"
}

resource "aws_api_gateway_method" "reports_proxy" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.reports_proxy.id
  http_method   = "ANY"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito.id
}

resource "aws_api_gateway_integration" "reports_proxy" {
  rest_api_id             = aws_api_gateway_rest_api.main.id
  resource_id             = aws_api_gateway_resource.reports_proxy.id
  http_method             = aws_api_gateway_method.reports_proxy.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = var.reports_lambda_invoke_arn
}

resource "aws_lambda_permission" "reports" {
  statement_id  = "AllowAPIGatewayInvoke-reports"
  action        = "lambda:InvokeFunction"
  function_name = var.reports_lambda_function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.main.execution_arn}/*/*"
}

# Flights sub-resources (flight search)
resource "aws_api_gateway_resource" "flights" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_rest_api.main.root_resource_id
  path_part   = "flights"
}

resource "aws_api_gateway_resource" "flights_proxy" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_resource.flights.id
  path_part   = "{proxy+}"
}

resource "aws_api_gateway_method" "flights_proxy" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.flights_proxy.id
  http_method   = "ANY"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito.id
}

resource "aws_api_gateway_integration" "flights_proxy" {
  rest_api_id             = aws_api_gateway_rest_api.main.id
  resource_id             = aws_api_gateway_resource.flights_proxy.id
  http_method             = aws_api_gateway_method.flights_proxy.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = var.flight_search_lambda_invoke_arn
}

resource "aws_lambda_permission" "flights" {
  statement_id  = "AllowAPIGatewayInvoke-flights"
  action        = "lambda:InvokeFunction"
  function_name = var.flight_search_lambda_function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.main.execution_arn}/*/*"
}

resource "aws_api_gateway_deployment" "main" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  depends_on  = [
    aws_api_gateway_integration.proxy,
    aws_api_gateway_integration.reports_proxy,
    aws_api_gateway_integration.flights_proxy,
  ]
  lifecycle { create_before_destroy = true }
}

resource "aws_api_gateway_stage" "api" {
  deployment_id = aws_api_gateway_deployment.main.id
  rest_api_id   = aws_api_gateway_rest_api.main.id
  stage_name    = "api"
  xray_tracing_enabled = true
}

output "api_url" { value = aws_api_gateway_stage.api.invoke_url }
output "rest_api_id" { value = aws_api_gateway_rest_api.main.id }
