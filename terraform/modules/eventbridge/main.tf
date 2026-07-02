resource "aws_iam_role" "eventbridge" {
  name = "${var.project_name}-${var.environment}-eventbridge-role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "scheduler.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy" "eventbridge" {
  name = "${var.project_name}-${var.environment}-eventbridge-policy"
  role = aws_iam_role.eventbridge.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = "lambda:InvokeFunction"
      Resource = var.document_expiry_lambda_arn
    }]
  })
}

resource "aws_scheduler_schedule" "document_expiry" {
  name        = "${var.project_name}-${var.environment}-document-expiry-check"
  description = "Daily document expiry check — fires at 07:00 SAST"

  flexible_time_window { mode = "OFF" }
  schedule_expression = "cron(0 5 * * ? *)"  # 07:00 SAST = 05:00 UTC

  target {
    arn      = var.document_expiry_lambda_arn
    role_arn = aws_iam_role.eventbridge.arn
  }
}

resource "aws_lambda_permission" "allow_eventbridge" {
  statement_id  = "AllowEventBridgeScheduler"
  action        = "lambda:InvokeFunction"
  function_name = var.document_expiry_lambda_name
  principal     = "scheduler.amazonaws.com"
  source_arn    = aws_scheduler_schedule.document_expiry.arn
}
