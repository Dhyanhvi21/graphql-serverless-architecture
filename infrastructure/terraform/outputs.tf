output "vpc_id" {
  description = "VPC ID"
  value       = module.vpc.vpc_id
}

output "private_app_subnets" {
  description = "Private Subnet IDs for ECS & Lambda"
  value       = module.vpc.private_app_subnet_ids
}

output "rds_endpoint" {
  description = "RDS PostgreSQL endpoint"
  value       = module.rds.endpoint
}

output "rds_instance_id" {
  description = "RDS DB Instance Identifier"
  value       = module.rds.instance_id
}

output "ecs_cluster_name" {
  description = "ECS Fargate Cluster Name"
  value       = module.ecs.cluster_name
}

output "ecs_service_name" {
  description = "ECS Fargate Service Name"
  value       = module.ecs.service_name
}

output "internal_alb_dns_name" {
  description = "Internal ALB DNS for private GraphQL server"
  value       = module.ecs.alb_dns_name
}

output "s3_frontend_bucket" {
  description = "S3 bucket name hosting the React frontend"
  value       = module.frontend.s3_bucket_name
}

output "cloudfront_distribution_id" {
  description = "CloudFront Distribution ID"
  value       = module.frontend.cloudfront_distribution_id
}

output "cloudfront_domain_name" {
  description = "CloudFront distribution URL for the React frontend"
  value       = module.frontend.cloudfront_domain_name
}

output "db_secret_arn" {
  description = "AWS Secrets Manager ARN for DB credentials"
  value       = module.secrets.db_secret_arn
}

output "sns_alert_topic_arn" {
  description = "SNS topic ARN for CloudWatch alarm alerts"
  value       = module.cloudwatch.sns_topic_arn
}
