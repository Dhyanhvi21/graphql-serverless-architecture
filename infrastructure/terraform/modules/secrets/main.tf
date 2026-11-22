resource "aws_kms_key" "secrets" {
  description             = "KMS Key for ${var.environment} secrets encryption"
  deletion_window_in_days = 7
  enable_key_rotation     = true

  tags = {
    Name = "${var.environment}-secrets-kms-key"
  }
}

resource "aws_kms_alias" "secrets" {
  name          = "alias/${var.environment}-secrets-key"
  target_key_id = aws_kms_key.secrets.key_id
}

resource "random_password" "db_password" {
  length           = 24
  special          = true
  override_special = "!#$%&*()-_=+[]{}<>:?"
}

resource "aws_secretsmanager_secret" "db_credentials" {
  name                    = "${var.environment}/rds/postgresql/credentials"
  description             = "Master database credentials for ${var.environment}"
  kms_key_id              = aws_kms_key.secrets.arn
  recovery_window_in_days = 0 # For easy teardown in assessment; set to 7+ in production

  tags = {
    Name = "${var.environment}-db-credentials"
  }
}

resource "aws_secretsmanager_secret_version" "db_credentials" {
  secret_id = aws_secretsmanager_secret.db_credentials.id
  secret_string = jsonencode({
    engine   = "postgres"
    username = var.db_username
    password = random_password.db_password.result
    dbname   = var.db_name
    port     = 5432
  })
}
