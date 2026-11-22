# IAM Security & Access Control

This document details the IAM roles, least-privilege policies, and keyless authentication used across the project.

---

## 1. Security Architecture & Principles

- **Zero Static Credentials in CI/CD**: We avoid generating long-lived `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` for GitHub Actions. Workflows use **GitHub Actions OpenID Connect (OIDC)** to obtain short-lived credentials scoped strictly to this repository.
- **Role Segregation**: ECS task execution (pulling Docker images, pushing logs) is separated from task runtime permissions (accessing Secrets Manager, communicating with RDS).
- **VPC Boundaries**: Lambda functions run within private application subnets, ensuring no traffic to the database traverses the public internet.

---

## 2. GitHub Actions OIDC Setup

### Trust Relationship
The deployment role (`prod-github-actions-deploy-role`) trust policy only allows GitHub Actions runners for this specific repository and branches to assume it:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::123456789012:oidc-provider/token.actions.githubusercontent.com"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
        },
        "StringLike": {
          "token.actions.githubusercontent.com:sub": "repo:my-organization/graphql-serverless-architecture:*"
        }
      }
    }
  ]
}
```

### Workflow Integration
In GitHub Actions workflows, authentication is handled simply via:
```yaml
- name: Configure AWS Credentials (OIDC Keyless)
  uses: aws-actions/configure-aws-credentials@v4
  with:
    role-to-assume: ${{ secrets.AWS_DEPLOY_ROLE_ARN }}
    aws-region: us-east-1
```

---

## 3. Lambda IAM Execution Role

Lambda functions need permissions to manage their network interfaces (ENIs) inside the VPC, decrypt credentials from Secrets Manager via KMS, and emit metrics to CloudWatch.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Resource": "arn:aws:logs:*:*:log-group:/aws/lambda/*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "ec2:CreateNetworkInterface",
        "ec2:DescribeNetworkInterfaces",
        "ec2:DeleteNetworkInterface",
        "ec2:AssignPrivateIpAddresses",
        "ec2:UnassignPrivateIpAddresses"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "secretsmanager:GetSecretValue"
      ],
      "Resource": "arn:aws:secretsmanager:us-east-1:*:secret:prod/rds/postgresql/credentials*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "kms:Decrypt"
      ],
      "Resource": "arn:aws:kms:us-east-1:*:key/*"
    }
  ]
}
```

---

## 4. ECS Fargate Roles: Task Execution vs Task Role

| Role | Principal | Scope / Permissions |
| :--- | :--- | :--- |
| **Task Execution Role** | `ecs-tasks.amazonaws.com` | Used by the ECS agent. Authorizes pulling container images from Amazon ECR, writing container logs to CloudWatch, and reading task-level secrets from Secrets Manager. |
| **Task Role** | `ecs-tasks.amazonaws.com` | Assumed by the Node.js application inside the container. Grants permissions to fetch credentials dynamically, publish CloudWatch metrics, and query RDS. |

---

## 5. Frontend S3 Origin Access Control (OAC)

The S3 bucket hosting the React frontend has public access completely blocked (`BlockPublicAcls = true`, `BlockPublicPolicy = true`). Access is allowed solely via CloudFront:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowCloudFrontServicePrincipalReadOnly",
      "Effect": "Allow",
      "Principal": {
        "Service": "cloudfront.amazonaws.com"
      },
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::prod-react-frontend-*/*",
      "Condition": {
        "StringEquals": {
          "AWS:SourceArn": "arn:aws:cloudfront::123456789012:distribution/E1234EXAMPLE"
        }
      }
    }
  ]
}
```
