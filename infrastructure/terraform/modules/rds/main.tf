# Security Group for RDS PostgreSQL
resource "aws_security_group" "rds" {
  name        = "${var.environment}-rds-postgres-sg"
  description = "Access to RDS PostgreSQL exclusively from ECS and Lambda security groups"
  vpc_id      = var.vpc_id

  ingress {
    description     = "PostgreSQL access from ECS Fargate tasks"
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [var.ecs_security_group_id]
  }

  ingress {
    description     = "PostgreSQL access from Lambda functions"
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [var.lambda_security_group_id]
  }

  egress {
    description = "Outbound rule"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.environment}-rds-postgres-sg"
  }
}

# DB Parameter Group for PostgreSQL (Performance & Logging)
resource "aws_db_parameter_group" "postgres" {
  name   = "${var.environment}-postgres15-pg"
  family = "postgres15"

  parameter {
    name  = "log_connections"
    value = "1"
  }

  parameter {
    name  = "log_disconnections"
    value = "1"
  }

  parameter {
    name  = "log_duration"
    value = "1"
  }

  parameter {
    name  = "rds.force_ssl"
    value = "1"
  }

  tags = {
    Name = "${var.environment}-postgres15-pg"
  }
}

# RDS PostgreSQL Instance
resource "aws_db_instance" "postgres" {
  identifier            = "${var.environment}-postgres-db"
  engine                = "postgres"
  engine_version        = "15.4"
  instance_class        = var.instance_class
  allocated_storage     = var.allocated_storage
  max_allocated_storage = var.max_allocated_storage # Storage Auto Scaling
  storage_type          = "gp3"
  storage_encrypted     = true
  kms_key_id            = var.kms_key_arn

  db_name  = var.db_name
  username = var.db_username
  password = var.db_password
  port     = 5432

  db_subnet_group_name   = var.db_subnet_group_name
  vpc_security_group_ids = [aws_security_group.rds.id]
  parameter_group_name   = aws_db_parameter_group.postgres.name

  multi_az            = var.multi_az
  publicly_accessible = false # Strictly private in isolated DB subnet

  backup_retention_period    = 7
  backup_window              = "03:00-04:00"
  maintenance_window         = "Sun:04:30-Sun:05:30"
  auto_minor_version_upgrade = true
  copy_tags_to_snapshot      = true
  deletion_protection        = false # Set to true for production systems
  skip_final_snapshot        = true

  enabled_cloudwatch_logs_exports = ["postgresql", "upgrade"]

  tags = {
    Name = "${var.environment}-postgres-db"
  }
}
