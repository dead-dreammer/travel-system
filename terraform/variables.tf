variable "aws_region"    { default = "af-south-1" }
variable "environment"   { default = "production" }
variable "project_name"  { default = "travel-system" }
variable "db_name"       { default = "travel_db" }
variable "db_username"   { default = "travel_admin" }
variable "db_password"   { sensitive = true }
variable "ses_from_email" {}
variable "hr_cognito_user_pool_id" { description = "Cognito User Pool ID from the HR system (shared)" }
variable "hr_cognito_client_id"    { description = "Cognito Client ID from the HR system (shared)" }
variable "duffel_api_key"          { description = "Duffel API key (flight search) — sk_test_... in sandbox, sk_live_... in production"; sensitive = true; default = "" }
