#!/bin/bash
set -e
echo "=== Travel System Deploy ==="

# Package Lambda
cd backend && npm install && cd ..
zip -r lambda.zip backend/src backend/node_modules

# Terraform
cd terraform
terraform init
terraform apply -auto-approve
API_URL=$(terraform output -raw api_gateway_url)
CF_URL=$(terraform output -raw cloudfront_url)
BUCKET=$(terraform output -raw frontend_bucket)
CF_ID=$(terraform output -raw cloudfront_distribution_id)
cd ..

# Run DB migrations
psql "$DATABASE_URL" -f database/migrations/001_initial_schema.sql

# Build and deploy frontend
cd frontend
REACT_APP_API_URL=$API_URL REACT_APP_MOCK=false npm run build
aws s3 sync build/ s3://$BUCKET/ --delete
aws cloudfront create-invalidation --distribution-id $CF_ID --paths "/*"
cd ..

echo ""
echo "=== Deploy complete ==="
echo "Frontend: $CF_URL"
echo "API:      $API_URL"
