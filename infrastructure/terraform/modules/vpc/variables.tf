variable "environment" {
  type        = string
  description = "Environment name"
}

variable "vpc_cidr" {
  type        = string
  description = "VPC CIDR block"
}

variable "availability_zones" {
  type        = list(string)
  description = "Availability zones list"
}

variable "public_subnet_cidrs" {
  type        = list(string)
  description = "Public subnet CIDRs"
}

variable "private_app_subnets" {
  type        = list(string)
  description = "Private app subnet CIDRs"
}

variable "private_db_subnets" {
  type        = list(string)
  description = "Private database subnet CIDRs"
}

