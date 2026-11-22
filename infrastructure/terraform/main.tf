terraform {
  required_version = ">= 1.5.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.5"
    }
  }

  # In production, use S3 remote backend with DynamoDB state locking:
  # backend "s3" {
  #   bucket         = "mycompany-terraform-state-prod"
  #   key            = "serverless-graphql/terraform.tfstate"
  #   region         = "us-east-1"
  #   dynamodb_table = "terraform-state-lock"
  #   encrypt        = true
  # }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "GraphQL-Serverless-RDS"
      Environment = var.environment
      ManagedBy   = "Terraform"
    }
  }
}

# Data source for available AZs
data "aws_availability_zones" "available" {
  state = "available"
}

# 1. VPC & Networking Module
module "vpc" {
  source              = "./modules/vpc"
  environment         = var.environment
  vpc_cidr            = var.vpc_cidr
  availability_zones  = slice(data.aws_availability_zones.available.names, 0, 2)
  public_subnet_cidrs = var.public_subnet_cidrs
  private_app_subnets = var.private_app_subnets
  private_db_subnets  = var.private_db_subnets
}

# 2. Secrets Manager Module
module "secrets" {
  source      = "./modules/secrets"
  environment = var.environment
  db_name     = var.db_name
  db_username = var.db_username
}

# 3. IAM Module
module "iam" {
  source            = "./modules/iam"
  environment       = var.environment
  secrets_arn       = module.secrets.db_secret_arn
  github_repo_owner = var.github_repo_owner
  github_repo_name  = var.github_repo_name
}

# 4. RDS PostgreSQL Module
module "rds" {
  source                   = "./modules/rds"
  environment              = var.environment
  vpc_id                   = module.vpc.vpc_id
  db_subnet_group_name     = module.vpc.db_subnet_group_name
  db_name                  = var.db_name
  db_username              = var.db_username
  db_password              = module.secrets.db_password
  allocated_storage        = var.db_allocated_storage
  max_allocated_storage    = var.db_max_allocated_storage
  instance_class           = var.db_instance_class
  multi_az                 = var.db_multi_az
  lambda_security_group_id = module.vpc.lambda_security_group_id
  ecs_security_group_id    = module.vpc.ecs_security_group_id
  kms_key_arn              = module.secrets.kms_key_arn
}

# 5. ECS Fargate Module
module "ecs" {
  source                  = "./modules/ecs"
  environment             = var.environment
  vpc_id                  = module.vpc.vpc_id
  private_subnet_ids      = module.vpc.private_app_subnet_ids
  public_subnet_ids       = module.vpc.public_subnet_ids
  ecs_security_group_id   = module.vpc.ecs_security_group_id
  alb_security_group_id   = module.vpc.alb_security_group_id
  task_execution_role_arn = module.iam.ecs_task_execution_role_arn
  task_role_arn           = module.iam.ecs_task_role_arn
  container_image         = var.ecs_container_image
  container_port          = var.ecs_container_port
  cpu                     = var.ecs_cpu
  memory                  = var.ecs_memory
  desired_count           = var.ecs_desired_count
  db_secret_arn           = module.secrets.db_secret_arn
  db_host                 = module.rds.endpoint
  db_name                 = var.db_name
}

# 6. Frontend S3 + CloudFront Module
module "frontend" {
  source              = "./modules/frontend_s3_cloudfront"
  environment         = var.environment
  domain_name         = var.frontend_domain_name
  acm_certificate_arn = var.acm_certificate_arn
}

# 7. CloudWatch Alarms & Monitoring Module
module "cloudwatch" {
  source           = "./modules/cloudwatch"
  environment      = var.environment
  alarm_email      = var.alarm_email
  ecs_cluster_name = module.ecs.cluster_name
  ecs_service_name = module.ecs.service_name
  rds_instance_id  = module.rds.instance_id
  lambda_function_names = [
    "${var.environment}-graphql-handler",
    "${var.environment}-query-handler",
    "${var.environment}-mutation-handler",
    "${var.environment}-subscription-handler"
  ]
}
