terraform {
  required_version = ">= 1.9, < 2.0"
  required_providers {
    aws = { source = "hashicorp/aws", version = "~> 6.0" }
  }
}
provider "aws" {
  region = var.region
}
variable "region" {
  type    = string
  default = "us-east-1"
}
variable "vpc_id" { type = string }
variable "subnet_id" { type = string }
variable "allowed_cidr" {
  type        = string
  description = "Operator CIDR allowed to reach HTTP/HTTPS. Start with your own /32."
  validation {
    condition     = can(cidrhost(var.allowed_cidr, 0)) && var.allowed_cidr != "0.0.0.0/0"
    error_message = "Use a restricted valid CIDR for this temporary lab."
  }
}
variable "instance_type" {
  type    = string
  default = "t3.micro"
}
data "aws_ssm_parameter" "ami" {
  name = "/aws/service/ami-amazon-linux-latest/al2023-ami-kernel-default-x86_64"
}
resource "aws_security_group" "orbit" {
  name_prefix = "orbit-lab-"
  description = "Temporary Orbit Docker lab. Administration via SSM, no SSH."
  vpc_id      = var.vpc_id
  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = [var.allowed_cidr]
  }
  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = [var.allowed_cidr]
  }
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
  tags = { Project = "Orbit", Purpose = "temporary-portfolio-lab" }
}
resource "aws_iam_role" "orbit" {
  name_prefix = "orbit-lab-"
  assume_role_policy = jsonencode({
    Version = "2012-10-17",
    Statement = [{
      Effect = "Allow", Principal = { Service = "ec2.amazonaws.com" }, Action = "sts:AssumeRole"
    }]
  })
}
resource "aws_iam_role_policy_attachment" "ssm" {
  role       = aws_iam_role.orbit.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}
resource "aws_iam_instance_profile" "orbit" {
  name_prefix = "orbit-lab-"
  role        = aws_iam_role.orbit.name
}
resource "aws_instance" "orbit" {
  ami                         = data.aws_ssm_parameter.ami.value
  instance_type               = var.instance_type
  subnet_id                   = var.subnet_id
  vpc_security_group_ids      = [aws_security_group.orbit.id]
  associate_public_ip_address = true
  iam_instance_profile        = aws_iam_instance_profile.orbit.name
  metadata_options {
    http_tokens   = "required"
    http_endpoint = "enabled"
  }
  root_block_device {
    volume_size           = 20
    volume_type           = "gp3"
    encrypted             = true
    delete_on_termination = true
  }
  user_data                   = file("${path.module}/setup.sh")
  user_data_replace_on_change = true
  tags                        = { Name = "orbit-lab", Project = "Orbit", Purpose = "temporary-portfolio-lab" }
}
output "instance_id" { value = aws_instance.orbit.id }
output "public_ip" { value = aws_instance.orbit.public_ip }
