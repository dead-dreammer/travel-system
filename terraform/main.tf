terraform {
  required_providers {
    aws = { source = "hashicorp/aws", version = "~> 5.0" }
  }
  required_version = ">= 1.6"
}

provider "aws" {
  region = var.aws_region
}

module "vpc" {
  source       = "./modules/vpc"
  aws_region   = var.aws_region
  project_name = var.project_name
  environment  = var.environment
}

module "rds" {
  source                = "./modules/rds"
  project_name          = var.project_name
  environment           = var.environment
  db_name               = var.db_name
  db_username           = var.db_username
  db_password           = var.db_password
  vpc_id                = module.vpc.vpc_id
  private_subnet_ids    = module.vpc.private_subnet_ids
  rds_security_group_id = module.vpc.rds_security_group_id
}

module "s3_cloudfront" {
  source       = "./modules/s3_cloudfront"
  project_name = var.project_name
  environment  = var.environment
  aws_region   = var.aws_region
}

module "sqs" {
  source       = "./modules/sqs"
  project_name = var.project_name
  environment  = var.environment
}

module "ses" {
  source        = "./modules/ses"
  ses_from_email = var.ses_from_email
  project_name  = var.project_name
}

module "lambda" {
  source                  = "./modules/lambda"
  project_name            = var.project_name
  environment             = var.environment
  aws_region              = var.aws_region
  db_host                 = module.rds.endpoint
  db_name                 = var.db_name
  db_username             = var.db_username
  db_password             = var.db_password
  document_bucket         = module.s3_cloudfront.document_bucket
  ses_from_email          = var.ses_from_email
  cognito_user_pool_id    = var.hr_cognito_user_pool_id
  notifications_queue_url = module.sqs.queue_url
  vpc_id                  = module.vpc.vpc_id
  private_subnet_ids      = module.vpc.private_subnet_ids
  lambda_security_group_id = module.vpc.lambda_security_group_id
  duffel_api_key          = var.duffel_api_key
}

module "api_gateway" {
  source                      = "./modules/api_gateway"
  project_name                = var.project_name
  environment                 = var.environment
  aws_region                  = var.aws_region
  hr_cognito_user_pool_id     = var.hr_cognito_user_pool_id
  requests_lambda_invoke_arn  = module.lambda.requests_invoke_arn
  approvals_lambda_invoke_arn = module.lambda.approvals_invoke_arn
  bookings_lambda_invoke_arn  = module.lambda.bookings_invoke_arn
  expenses_lambda_invoke_arn  = module.lambda.expenses_invoke_arn
  documents_lambda_invoke_arn = module.lambda.documents_invoke_arn
  advisories_lambda_invoke_arn = module.lambda.advisories_invoke_arn
  reports_lambda_invoke_arn   = module.lambda.reports_invoke_arn
  flight_search_lambda_invoke_arn = module.lambda.flight_search_invoke_arn

  requests_lambda_function_name   = module.lambda.requests_function_name
  approvals_lambda_function_name  = module.lambda.approvals_function_name
  bookings_lambda_function_name   = module.lambda.bookings_function_name
  expenses_lambda_function_name   = module.lambda.expenses_function_name
  documents_lambda_function_name  = module.lambda.documents_function_name
  advisories_lambda_function_name = module.lambda.advisories_function_name
  reports_lambda_function_name    = module.lambda.reports_function_name
  flight_search_lambda_function_name = module.lambda.flight_search_function_name
}

module "eventbridge" {
  source                        = "./modules/eventbridge"
  project_name                  = var.project_name
  environment                   = var.environment
  document_expiry_lambda_arn    = module.lambda.document_expiry_arn
  document_expiry_lambda_name   = module.lambda.document_expiry_name
}
