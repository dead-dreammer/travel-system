variable "project_name"             {}
variable "environment"              {}
variable "aws_region"               {}
variable "db_host"                  {}
variable "db_name"                  {}
variable "db_username"              {}
variable "db_password"              { sensitive = true }
variable "document_bucket"          {}
variable "ses_from_email"           {}
variable "cognito_user_pool_id"     {}
variable "notifications_queue_url"  {}
variable "vpc_id"                   {}
variable "private_subnet_ids"       { type = list(string) }
variable "lambda_security_group_id" {}
variable "duffel_api_key"           { sensitive = true; default = "" }
