output "db_secret_arn" {
  value = aws_secretsmanager_secret.db_credentials.arn
}

output "db_secret_name" {
  value = aws_secretsmanager_secret.db_credentials.name
}

output "kms_key_arn" {
  value = aws_kms_key.secrets.arn
}

output "db_password" {
  value     = random_password.db_password.result
  sensitive = true
}

