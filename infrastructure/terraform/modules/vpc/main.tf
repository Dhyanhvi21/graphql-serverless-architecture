# VPC
resource "aws_vpc" "main" {
  cidr_block           = var.vpc_cidr
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name = "${var.environment}-vpc"
  }
}

# Internet Gateway
resource "aws_internet_gateway" "igw" {
  vpc_id = aws_vpc.main.id

  tags = {
    Name = "${var.environment}-igw"
  }
}

# Public Subnets (for NAT Gateway & Edge ALB if needed)
resource "aws_subnet" "public" {
  count                   = length(var.public_subnet_cidrs)
  vpc_id                  = aws_vpc.main.id
  cidr_block              = var.public_subnet_cidrs[count.index]
  availability_zone       = var.availability_zones[count.index]
  map_public_ip_on_launch = true

  tags = {
    Name = "${var.environment}-public-subnet-${count.index + 1}"
    Tier = "Public"
  }
}

# Elastic IP for NAT Gateway
resource "aws_eip" "nat" {
  domain = "vpc"
  tags = {
    Name = "${var.environment}-nat-eip"
  }
}

# NAT Gateway (allows private subnets to communicate outbound with AWS APIs & package repos)
resource "aws_nat_gateway" "nat" {
  allocation_id = aws_eip.nat.id
  subnet_id     = aws_subnet.public[0].id

  tags = {
    Name = "${var.environment}-nat-gw"
  }
  depends_on = [aws_internet_gateway.igw]
}

# Private Application Subnets (for ECS Fargate & Lambda)
resource "aws_subnet" "private_app" {
  count             = length(var.private_app_subnets)
  vpc_id            = aws_vpc.main.id
  cidr_block        = var.private_app_subnets[count.index]
  availability_zone = var.availability_zones[count.index]

  tags = {
    Name = "${var.environment}-private-app-subnet-${count.index + 1}"
    Tier = "PrivateApp"
  }
}

# Private Database Subnets (Isolated for RDS PostgreSQL)
resource "aws_subnet" "private_db" {
  count             = length(var.private_db_subnets)
  vpc_id            = aws_vpc.main.id
  cidr_block        = var.private_db_subnets[count.index]
  availability_zone = var.availability_zones[count.index]

  tags = {
    Name = "${var.environment}-private-db-subnet-${count.index + 1}"
    Tier = "PrivateDatabase"
  }
}

# RDS DB Subnet Group
resource "aws_db_subnet_group" "rds" {
  name       = "${var.environment}-rds-subnet-group"
  subnet_ids = aws_subnet.private_db[*].id

  tags = {
    Name = "${var.environment}-rds-subnet-group"
  }
}

# Route Table for Public Subnet
resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.igw.id
  }

  tags = {
    Name = "${var.environment}-public-rt"
  }
}

resource "aws_route_table_association" "public" {
  count          = length(var.public_subnet_cidrs)
  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}

# Route Table for Private Application Subnets (routed via NAT Gateway)
resource "aws_route_table" "private_app" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block     = "0.0.0.0/0"
    nat_gateway_id = aws_nat_gateway.nat.id
  }

  tags = {
    Name = "${var.environment}-private-app-rt"
  }
}

resource "aws_route_table_association" "private_app" {
  count          = length(var.private_app_subnets)
  subnet_id      = aws_subnet.private_app[count.index].id
  route_table_id = aws_route_table.private_app.id
}

# Route Table for Isolated Database Subnets (no internet route)
resource "aws_route_table" "private_db" {
  vpc_id = aws_vpc.main.id

  tags = {
    Name = "${var.environment}-private-db-rt"
  }
}

resource "aws_route_table_association" "private_db" {
  count          = length(var.private_db_subnets)
  subnet_id      = aws_subnet.private_db[count.index].id
  route_table_id = aws_route_table.private_db.id
}

# --- SECURITY GROUPS ---

# ALB Security Group
resource "aws_security_group" "alb" {
  name        = "${var.environment}-alb-sg"
  description = "Security group for Internal ALB fronting private ECS Fargate"
  vpc_id      = aws_vpc.main.id

  ingress {
    description = "Allow HTTP from VPC"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = [var.vpc_cidr]
  }

  ingress {
    description = "Allow HTTPS from VPC"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = [var.vpc_cidr]
  }

  egress {
    description = "Allow all outbound"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.environment}-alb-sg"
  }
}

# ECS Fargate Tasks Security Group
resource "aws_security_group" "ecs" {
  name        = "${var.environment}-ecs-tasks-sg"
  description = "Security group for ECS Fargate GraphQL server"
  vpc_id      = aws_vpc.main.id

  ingress {
    description     = "Allow traffic from ALB to container port"
    from_port       = 4000
    to_port         = 4000
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
  }

  egress {
    description = "Allow all outbound traffic for package downloads, Secrets Manager, etc."
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.environment}-ecs-tasks-sg"
  }
}

# Lambda Functions Security Group
resource "aws_security_group" "lambda" {
  name        = "${var.environment}-lambda-sg"
  description = "Security group for AWS Lambda functions"
  vpc_id      = aws_vpc.main.id

  egress {
    description = "Allow outbound to VPC and NAT gateway"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.environment}-lambda-sg"
  }
}
