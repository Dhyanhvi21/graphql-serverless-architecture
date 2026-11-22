# Deployment and Testing Guide

This guide provides step-by-step instructions for deploying and testing the entire Serverless GraphQL Architecture with RDS integration on AWS.

---

## Prerequisites Checklist

Ensure the following tools and permissions are configured on your local machine or CI environment:
- [x] **AWS CLI** (v2.x) configured with administrative credentials (`aws configure`).
- [x] **Terraform** (>= 1.5.0) installed.
- [x] **Node.js** (v20.x or higher) and **npm** (v10+).
- [x] **Docker** running for container builds.
- [x] **Serverless Framework** (`npm install -g serverless`) OR **AWS SAM CLI**.
- [x] An AWS account with VPC, RDS, ECS, Lambda, Secrets Manager, and CloudFront permissions.

---

## Step 1: Deploy Core Infrastructure via Terraform

The Terraform modules provision the VPC, Subnets, NAT Gateway, Security Groups, IAM roles, RDS PostgreSQL, ECS Cluster, Secrets Manager, and CloudFront/S3 frontend.

```bash
# 1. Navigate to the terraform directory
cd infrastructure/terraform

# 2. Copy the example variable configuration
cp terraform.tfvars.example terraform.tfvars

# 3. Edit terraform.tfvars to configure your environment:
# - alarm_email = "your-email@example.com"
# - github_repo_owner = "your-github-username"
# - github_repo_name = "your-repo-name"

# 4. Initialize Terraform and validate
terraform init
terraform validate

# 5. Review the execution plan
terraform plan -out=tfplan

# 6. Apply infrastructure changes
terraform apply tfplan
```

### Key Outputs to Record:
```bash
terraform output
# Captures:
# - vpc_id
# - rds_endpoint
# - db_secret_arn
# - ecs_cluster_name
# - ecs_service_name
# - s3_frontend_bucket
# - cloudfront_distribution_id
# - cloudfront_domain_name
```

---

## Step 2: Database Initialization and Schema Migration

Once RDS is provisioned, execute the database schema migration to create the tables (`users`, `items`, `websocket_connections`, `audit_logs`).

```bash
# Navigate to lambda backend
cd ../../backend/lambda

# Install dependencies and build
npm install
npm run build

# Run migration script pointing to RDS instance via VPN/bastion or within VPC
export DB_SECRET_ARN="<from-terraform-output>"
export AWS_REGION="us-east-1"
npm run migrate
```

Alternatively, if connecting locally during dev:
```bash
export DB_HOST="localhost"
export DB_USER="dbadmin"
export DB_PASSWORD="localpassword123"
npm run migrate
```

---

## Step 3: Build and Deploy the ECS Fargate GraphQL Server

The containerized private GraphQL server runs inside private subnets behind an internal ALB.

```bash
cd ../graphql-server

# 1. Authenticate Docker with Amazon ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <AWS_ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com

# 2. Create ECR repository (if not already existing)
aws ecr create-repository --repository-name graphql-server --region us-east-1 || true

# 3. Build and tag the multi-stage Docker container
docker build -t graphql-server:latest .
docker tag graphql-server:latest <AWS_ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com/graphql-server:latest

# 4. Push to Amazon ECR
docker push <AWS_ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com/graphql-server:latest

# 5. Trigger ECS service deployment
aws ecs update-service \
  --cluster prod-graphql-cluster \
  --service prod-graphql-service \
  --force-new-deployment
```

---

## Step 4: Deploy Serverless Lambda Functions

Deploy the Lambda backend handlers using Serverless Framework or AWS SAM.

### Option A: Serverless Framework
```bash
cd ../lambda

# Deploy stack with VPC parameters from Terraform outputs
npx serverless deploy --stage prod \
  --param="dbSecretArn=<db_secret_arn>" \
  --param="dbHost=<rds_endpoint>" \
  --param="lambdaSecurityGroupId=<lambda_sg_id>" \
  --param="privateSubnet1=<private_subnet_1>" \
  --param="privateSubnet2=<private_subnet_2>"
```

### Option B: AWS SAM
```bash
sam build
sam deploy --guided \
  --parameter-overrides \
    Environment=prod \
    DbSecretArn=<db_secret_arn> \
    DbHost=<rds_endpoint> \
    LambdaSecurityGroupId=<lambda_sg_id> \
    PrivateSubnet1=<private_subnet_1> \
    PrivateSubnet2=<private_subnet_2>
```

---

## Step 5: Build and Deploy React Frontend to S3 & CloudFront

```bash
cd ../../frontend

# 1. Set environment variable pointing to the deployed GraphQL API Gateway
export VITE_GRAPHQL_URL="https://<api-id>.execute-api.us-east-1.amazonaws.com/graphql"

# 2. Install dependencies & build production bundle
npm install
npm run build

# 3. Sync assets to S3 with immutable cache
aws s3 sync dist/assets/ s3://<s3_frontend_bucket>/assets/ \
  --cache-control "public, max-age=31536000, immutable" \
  --delete

# 4. Sync HTML files with no-cache policy
aws s3 sync dist/ s3://<s3_frontend_bucket>/ \
  --exclude "assets/*" \
  --cache-control "public, max-age=0, must-revalidate" \
  --delete

# 5. Invalidate CloudFront cache
aws cloudfront create-invalidation \
  --distribution-id <cloudfront_distribution_id> \
  --paths "/*"
```

---

## Step 6: Testing & End-to-End Verification

### 1. Test Health Check Endpoint
```bash
curl -X POST https://<api-id>.execute-api.us-east-1.amazonaws.com/graphql \
  -H "Content-Type: application/json" \
  -d '{"query":"query { healthCheck }"}'
```
**Expected Response:**
```json
{
  "data": {
    "healthCheck": "GraphQL Lambda healthy. DB Time: 2026-11-22T14:40:00.000Z"
  }
}
```

### 2. Test GraphQL Item Creation Mutation
```bash
curl -X POST https://<api-id>.execute-api.us-east-1.amazonaws.com/graphql \
  -H "Content-Type: application/json" \
  -d '{
    "query": "mutation { createItem(input: { title: \"Deploy RDS Multi-AZ\", priority: HIGH }) { id title status priority createdAt } }"
  }'
```

### 3. Test GraphQL Items Query
```bash
curl -X POST https://<api-id>.execute-api.us-east-1.amazonaws.com/graphql \
  -H "Content-Type: application/json" \
  -d '{
    "query": "query { getItems { id title status priority } }"
  }'
```

### 4. Verify ECS Fargate Health Check
From a bastion host or test instance in the VPC:
```bash
curl http://<internal_alb_dns_name>/health
```
**Expected Response:**
```json
{
  "status": "UP",
  "database": "CONNECTED",
  "uptimeSeconds": 120
}
```

### 5. Access Frontend in Browser
Navigate to your CloudFront URL:
`https://<cloudfront_domain_name>`
Verify:
1. Valid SSL/TLS certificate (TLS 1.2+).
2. Status cards indicate connected components.
3. Creating a new task triggers the GraphQL mutation and immediately reflects in the items list.

---

## Teardown Instructions

To destroy all provisioned AWS resources and avoid unnecessary charges:

```bash
# 1. Teardown Lambda functions
cd backend/lambda
npx serverless remove --stage prod

# 2. Empty S3 bucket before Terraform destroy
aws s3 rm s3://<s3_frontend_bucket> --recursive

# 3. Destroy Terraform infrastructure
cd ../../infrastructure/terraform
terraform destroy -auto-approve
```
