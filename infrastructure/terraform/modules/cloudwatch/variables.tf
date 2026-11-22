variable "environment" { type = string }
variable "alarm_email" { type = string }
variable "ecs_cluster_name" { type = string }
variable "ecs_service_name" { type = string }
variable "rds_instance_id" { type = string }
variable "lambda_function_names" { type = list(string) }
