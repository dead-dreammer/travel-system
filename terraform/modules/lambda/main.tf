data "aws_caller_identity" "current" {}

resource "aws_iam_role" "lambda" {
  name = "${var.project_name}-${var.environment}-lambda-role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy" "lambda" {
  name = "${var.project_name}-${var.environment}-lambda-policy"
  role = aws_iam_role.lambda.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      { Effect = "Allow"; Action = ["logs:CreateLogGroup","logs:CreateLogStream","logs:PutLogEvents"]; Resource = "arn:aws:logs:*:*:*" },
      { Effect = "Allow"; Action = ["ec2:CreateNetworkInterface","ec2:DescribeNetworkInterfaces","ec2:DeleteNetworkInterface"]; Resource = "*" },
      { Effect = "Allow"; Action = ["s3:GetObject","s3:PutObject","s3:DeleteObject"]; Resource = "arn:aws:s3:::${var.document_bucket}/*" },
      { Effect = "Allow"; Action = ["ses:SendEmail","ses:SendRawEmail"]; Resource = "*" },
      { Effect = "Allow"; Action = ["sqs:SendMessage","sqs:ReceiveMessage","sqs:DeleteMessage"]; Resource = "*" },
      { Effect = "Allow"; Action = ["cognito-idp:GetUser","cognito-idp:AdminGetUser"]; Resource = "*" },
    ]
  })
}

locals {
  common_env = {
    DB_HOST              = var.db_host
    DB_NAME              = var.db_name
    DB_USER              = var.db_username
    DB_PASSWORD          = var.db_password
    DOCUMENT_BUCKET      = var.document_bucket
    SES_FROM_EMAIL       = var.ses_from_email
    COGNITO_USER_POOL_ID = var.cognito_user_pool_id
    QUEUE_URL            = var.notifications_queue_url
    AWS_NODEJS_CONNECTION_REUSE_ENABLED = "1"
  }
  vpc_config = {
    subnet_ids         = var.private_subnet_ids
    security_group_ids = [var.lambda_security_group_id]
  }
}

data "archive_file" "lambda_zip" {
  type        = "zip"
  source_dir  = "${path.root}/../backend"
  output_path = "${path.root}/../lambda.zip"
}

resource "aws_lambda_function" "requests" {
  function_name    = "${var.project_name}-${var.environment}-travel-requests"
  handler          = "src/handlers/requests/index.handler"
  runtime          = "nodejs20.x"
  role             = aws_iam_role.lambda.arn
  filename         = data.archive_file.lambda_zip.output_path
  source_code_hash = data.archive_file.lambda_zip.output_base64sha256
  memory_size      = 256
  timeout          = 30
  environment { variables = local.common_env }
  vpc_config { subnet_ids = local.vpc_config.subnet_ids; security_group_ids = local.vpc_config.security_group_ids }
}

resource "aws_lambda_function" "approvals" {
  function_name    = "${var.project_name}-${var.environment}-travel-approvals"
  handler          = "src/handlers/approvals/index.handler"
  runtime          = "nodejs20.x"
  role             = aws_iam_role.lambda.arn
  filename         = data.archive_file.lambda_zip.output_path
  source_code_hash = data.archive_file.lambda_zip.output_base64sha256
  memory_size      = 256
  timeout          = 30
  environment { variables = local.common_env }
  vpc_config { subnet_ids = local.vpc_config.subnet_ids; security_group_ids = local.vpc_config.security_group_ids }
}

resource "aws_lambda_function" "bookings" {
  function_name    = "${var.project_name}-${var.environment}-travel-bookings"
  handler          = "src/handlers/bookings/index.handler"
  runtime          = "nodejs20.x"
  role             = aws_iam_role.lambda.arn
  filename         = data.archive_file.lambda_zip.output_path
  source_code_hash = data.archive_file.lambda_zip.output_base64sha256
  memory_size      = 256
  timeout          = 30
  environment { variables = local.common_env }
  vpc_config { subnet_ids = local.vpc_config.subnet_ids; security_group_ids = local.vpc_config.security_group_ids }
}

resource "aws_lambda_function" "expenses" {
  function_name    = "${var.project_name}-${var.environment}-travel-expenses"
  handler          = "src/handlers/expenses/index.handler"
  runtime          = "nodejs20.x"
  role             = aws_iam_role.lambda.arn
  filename         = data.archive_file.lambda_zip.output_path
  source_code_hash = data.archive_file.lambda_zip.output_base64sha256
  memory_size      = 256
  timeout          = 30
  environment { variables = local.common_env }
  vpc_config { subnet_ids = local.vpc_config.subnet_ids; security_group_ids = local.vpc_config.security_group_ids }
}

resource "aws_lambda_function" "documents" {
  function_name    = "${var.project_name}-${var.environment}-travel-documents"
  handler          = "src/handlers/documents/index.handler"
  runtime          = "nodejs20.x"
  role             = aws_iam_role.lambda.arn
  filename         = data.archive_file.lambda_zip.output_path
  source_code_hash = data.archive_file.lambda_zip.output_base64sha256
  memory_size      = 256
  timeout          = 30
  environment { variables = local.common_env }
  vpc_config { subnet_ids = local.vpc_config.subnet_ids; security_group_ids = local.vpc_config.security_group_ids }
}

resource "aws_lambda_function" "advisories" {
  function_name    = "${var.project_name}-${var.environment}-travel-advisories"
  handler          = "src/handlers/advisories/index.handler"
  runtime          = "nodejs20.x"
  role             = aws_iam_role.lambda.arn
  filename         = data.archive_file.lambda_zip.output_path
  source_code_hash = data.archive_file.lambda_zip.output_base64sha256
  memory_size      = 256
  timeout          = 30
  environment { variables = local.common_env }
  vpc_config { subnet_ids = local.vpc_config.subnet_ids; security_group_ids = local.vpc_config.security_group_ids }
}

resource "aws_lambda_function" "reports" {
  function_name    = "${var.project_name}-${var.environment}-travel-reports"
  handler          = "src/handlers/reports/index.handler"
  runtime          = "nodejs20.x"
  role             = aws_iam_role.lambda.arn
  filename         = data.archive_file.lambda_zip.output_path
  source_code_hash = data.archive_file.lambda_zip.output_base64sha256
  memory_size      = 256
  timeout          = 30
  environment { variables = local.common_env }
  vpc_config { subnet_ids = local.vpc_config.subnet_ids; security_group_ids = local.vpc_config.security_group_ids }
}

resource "aws_lambda_function" "document_expiry" {
  function_name    = "${var.project_name}-${var.environment}-document-expiry"
  handler          = "src/automation/documentExpiry.handler"
  runtime          = "nodejs20.x"
  role             = aws_iam_role.lambda.arn
  filename         = data.archive_file.lambda_zip.output_path
  source_code_hash = data.archive_file.lambda_zip.output_base64sha256
  memory_size      = 256
  timeout          = 300
  environment { variables = local.common_env }
  vpc_config { subnet_ids = local.vpc_config.subnet_ids; security_group_ids = local.vpc_config.security_group_ids }
}

resource "aws_cloudwatch_log_group" "requests"       { name = "/aws/lambda/${aws_lambda_function.requests.function_name}";       retention_in_days = 30 }
resource "aws_cloudwatch_log_group" "approvals"      { name = "/aws/lambda/${aws_lambda_function.approvals.function_name}";      retention_in_days = 30 }
resource "aws_cloudwatch_log_group" "bookings"       { name = "/aws/lambda/${aws_lambda_function.bookings.function_name}";       retention_in_days = 30 }
resource "aws_cloudwatch_log_group" "expenses"       { name = "/aws/lambda/${aws_lambda_function.expenses.function_name}";       retention_in_days = 30 }
resource "aws_cloudwatch_log_group" "documents"      { name = "/aws/lambda/${aws_lambda_function.documents.function_name}";      retention_in_days = 30 }
resource "aws_cloudwatch_log_group" "advisories"     { name = "/aws/lambda/${aws_lambda_function.advisories.function_name}";     retention_in_days = 30 }
resource "aws_cloudwatch_log_group" "reports"        { name = "/aws/lambda/${aws_lambda_function.reports.function_name}";        retention_in_days = 30 }
resource "aws_cloudwatch_log_group" "document_expiry"{ name = "/aws/lambda/${aws_lambda_function.document_expiry.function_name}";retention_in_days = 30 }

output "requests_invoke_arn"   { value = aws_lambda_function.requests.invoke_arn }
output "approvals_invoke_arn"  { value = aws_lambda_function.approvals.invoke_arn }
output "bookings_invoke_arn"   { value = aws_lambda_function.bookings.invoke_arn }
output "expenses_invoke_arn"   { value = aws_lambda_function.expenses.invoke_arn }
output "documents_invoke_arn"  { value = aws_lambda_function.documents.invoke_arn }
output "advisories_invoke_arn" { value = aws_lambda_function.advisories.invoke_arn }
output "reports_invoke_arn"    { value = aws_lambda_function.reports.invoke_arn }
output "document_expiry_arn"   { value = aws_lambda_function.document_expiry.arn }
output "document_expiry_name"  { value = aws_lambda_function.document_expiry.function_name }
