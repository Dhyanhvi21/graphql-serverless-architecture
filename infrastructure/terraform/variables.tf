variable "aws_region" {
  description = "AWS region for resources"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
  default     = "prod"
}

variable "vpc_cidr" {
  description = "CIDR block for VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "public_subnet_cidrs" {
  description = "CIDR blocks for public subnets"
  type        = list(string)
  default     = ["10.0.1.0/24", "10.0.2.0/24"]
}

variable "private_app_subnets" {
  description = "CIDR blocks for private application subnets (ECS, Lambda)"
  type        = list(string)
  default     = ["10.0.10.0/24", "10.0.20.0/24"]
}

variable "private_db_subnets" {
  description = "CIDR blocks for private isolated database subnets (RDS)"
  type        = list(string)
  default     = ["10.0.30.0/24", "10.0.40.0/24"]
}

variable "db_name" {
  description = "Name of the RDS database"
  type        = string
  default     = "graphql_prod_db"
}

variable "db_username" {
  description = "Master username for RDS"
  type        = string
  default     = "dbadmin"
}

variable "db_allocated_storage" {
  description = "Initial allocated storage for RDS (GB)"
  type        = number
  default     = 20
}

variable "db_max_allocated_storage" {
  description = "Max storage threshold for RDS autoscaling (GB)"
  type        = number
  default     = 100
}

variable "db_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t4g.medium"
}

variable "db_multi_az" {
  description = "Enable Multi-AZ for high availability"
  type        = bool
  default     = true
}

variable "ecs_container_image" {
  description = "ECR Docker image URI for GraphQL server"
  type        = string
  default     = "123456789012.dkr.ecr.us-east-1.amazonaws.com/graphql-server:latest"
}

variable "ecs_container_port" {
  description = "Port exposed by the ECS GraphQL container"
  type        = number
  default     = 4000
}

variable "ecs_cpu" {
  description = "Fargate CPU units (256, 512, 1024, etc.)"
  type        = number
  default     = 512
}

variable "ecs_memory" {
  description = "Fargate memory units (512, 1024, 2048, etc.)"
  type        = number
  default     = 1024
}

variable "ecs_desired_count" {
  description = "Desired number of ECS tasks"
  type        = number
  default     = 2
}

variable "frontend_domain_name" {
  description = "Optional custom domain name for frontend"
  type        = string
  default     = ""
}

variable "acm_certificate_arn" {
  description = "ACM Certificate ARN for CloudFront custom domain"
  type        = string
  default     = ""
}

variable "alarm_email" {
  description = "Email address for CloudWatch alarm notifications"
  type        = string
  default     = "devops-alerts@example.com"
}

variable "github_repo_owner" {
  description = "GitHub repository owner/organization for OIDC trust"
  type        = string
  default     = "my-organization"
}

variable "github_repo_name" {
  description = "GitHub repository name for OIDC trust"
  type        = string
  default     = "graphql-serverless-architecture"
}
