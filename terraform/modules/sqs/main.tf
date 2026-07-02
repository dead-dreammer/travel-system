resource "aws_sqs_queue" "dlq" {
  name                      = "${var.project_name}-${var.environment}-notifications-dlq"
  message_retention_seconds = 1209600  # 14 days
}

resource "aws_sqs_queue" "notifications" {
  name                       = "${var.project_name}-${var.environment}-notifications"
  visibility_timeout_seconds = 300
  message_retention_seconds  = 1209600  # 14 days
  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.dlq.arn
    maxReceiveCount     = 3
  })
}

output "queue_url" { value = aws_sqs_queue.notifications.url }
output "queue_arn" { value = aws_sqs_queue.notifications.arn }
output "dlq_arn"   { value = aws_sqs_queue.dlq.arn }
