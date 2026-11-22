output "endpoint" {
  value = aws_db_instance.postgres.address
}

output "port" {
  value = aws_db_instance.postgres.port
}

output "instance_id" {
  value = aws_db_instance.postgres.identifier
}

output "rds_security_group_id" {
  value = aws_security_group.rds.id
}
