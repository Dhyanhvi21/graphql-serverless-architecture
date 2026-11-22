variable "environment" { type = string }
variable "vpc_id" { type = string }
variable "db_subnet_group_name" { type = string }
variable "db_name" { type = string }
variable "db_username" { type = string }
variable "db_password" {
  type      = string
  sensitive = true
}
variable "allocated_storage" { type = number }
variable "max_allocated_storage" { type = number }
variable "instance_class" { type = string }
variable "multi_az" { type = bool }
variable "lambda_security_group_id" { type = string }
variable "ecs_security_group_id" { type = string }
variable "kms_key_arn" { type = string }
