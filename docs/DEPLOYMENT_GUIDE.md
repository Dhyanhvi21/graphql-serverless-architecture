# Deployment Runbook

Practical guide for deploying and testing the serverless GraphQL infrastructure on AWS.

---

## Prerequisites

- AWS CLI v2 configured (`aws configure`) with administrative permissions.
- Terraform >= 1.5.0.
- Node.js >= 20.x and npm.
- Docker Desktop or Docker engine.
- Serverless Framework (`npm i -g serverless`) or AWS SAM CLI.

---

## Step 1: Provision Infrastructure with Terraform

```bash
cd infrastructure/terraform

# Copy variable definition file and adjust parameters as needed
cp terraform.tfvars.example terraform.tfvars

terraform init
terraform plan -out=tfplan
terraform apply tfplan
```

### Save Output Values
After `terraform apply`, take note of the following outputs:
- `vpc_id`
- `rds_endpoint`
- `db_secret_arn`
- `s3_frontend_bucket`
- `cloudfront_distribution_id`
- `cloudfront_domain_name`

---

## Step 2: Run Database Migrations

Connect to the database and initialize the schema (`users`, `items`, `audit_logs`).

```bash
cd ../../backend/lambda

npm install
npm run build

# Set the secret ARN from Terraform outputs
export DB_SECRET_ARN="<from-terraform-output>"
export AWS_REGION="us-east-1"
npm run migrate
```

*(If testing locally against a local PostgreSQL instance, simply set `DB_HOST=localhost`, `DB_USER=dbadmin`, and `DB_PASSWORD=localpassword123`)*.

---

## Step 3: Deploy the Lambda Handlers

You can deploy using either the **Serverless Framework** or **AWS SAM**:

### Using Serverless Framework:
```bash
cd backend/lambda

npx serverless deploy --stage prod \
  --param="dbSecretArn=<db_secret_arn>" \
  --param="dbHost=<rds_endpoint>" \
  --param="lambdaSecurityGroupId=<lambda_sg_id>" \
  --param="privateSubnet1=<private_subnet_1>" \
  --param="privateSubnet2=<private_subnet_2>"
```

### Using AWS SAM:
```bash
sam build
sam deploy --guided
```

---

## Step 4: Build and Deploy the ECS Fargate Container

```bash
cd ../graphql-server

# Log in to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <AWS_ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com

# Build, tag and push
docker build -t graphql-server:latest .
docker tag graphql-server:latest <AWS_ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com/graphql-server:latest
docker push <AWS_ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com/graphql-server:latest

# Trigger deployment
aws ecs update-service \
  --cluster prod-graphql-cluster \
  --service prod-graphql-service \
  --force-new-deployment
```

---

## Step 5: Build and Deploy Frontend

```bash
cd ../../frontend

# Point frontend to deployed API Gateway endpoint
export VITE_GRAPHQL_URL="https://<api-id>.execute-api.us-east-1.amazonaws.com/graphql"

npm install
npm run build

# Deploy assets with immutable cache
aws s3 sync dist/assets/ s3://<s3_frontend_bucket>/assets/ \
  --cache-control "public, max-age=31536000, immutable" \
  --delete

# Deploy HTML with revalidation
aws s3 sync dist/ s3://<s3_frontend_bucket>/ \
  --exclude "assets/*" \
  --cache-control "public, max-age=0, must-revalidate" \
  --delete

# Invalidate CDN cache
aws cloudfront create-invalidation --distribution-id <cloudfront_distribution_id> --paths "/*"
```

---

## Verification & Smoke Testing

### 1. Test GraphQL Endpoint
```bash
curl -X POST https://<api-id>.execute-api.us-east-1.amazonaws.com/graphql \
  -H "Content-Type: application/json" \
  -d '{"query":"query { healthCheck }"}'
```

### 2. Test GraphQL Item Creation Mutation
```bash
curl -X POST https://<api-id>.execute-api.us-east-1.amazonaws.com/graphql \
  -H "Content-Type: application/json" \
  -d '{
    "query": "mutation { createItem(input: { title: \"Automate CloudWatch Dashboard\", priority: HIGH }) { id title status } }"
  }'
```

### 3. Check Web UI
Visit `https://<cloudfront_domain_name>` in any browser.

---

## Teardown

```bash
# Clean up S3 contents
aws s3 rm s3://<s3_frontend_bucket> --recursive

# Destroy Terraform resources
cd infrastructure/terraform
terraform destroy -auto-approve
```
