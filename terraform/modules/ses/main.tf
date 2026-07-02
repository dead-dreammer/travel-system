resource "aws_ses_email_identity" "from" {
  email = var.ses_from_email
}

resource "aws_ses_configuration_set" "main" {
  name = "${var.project_name}-config-set"
  delivery_options {
    tls_policy = "Require"
  }
}

output "ses_identity_arn" { value = aws_ses_email_identity.from.arn }
