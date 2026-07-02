output "api_gateway_url"  { value = module.api_gateway.api_url }
output "cloudfront_url"   { value = module.s3_cloudfront.cloudfront_url }
output "frontend_bucket"  { value = module.s3_cloudfront.frontend_bucket }
output "rds_endpoint"     { value = module.rds.endpoint }
