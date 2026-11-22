variable "environment" {
  type        = string
  description = "Environment name"
}

variable "secrets_arn" {
  type        = string
  description = "Secrets Manager secret ARN"
}

variable "github_repo_owner" {
  type        = string
  description = "GitHub repository owner"
}

variable "github_repo_name" {
  type        = string
  description = "GitHub repository name"
}

