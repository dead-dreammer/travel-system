variable "project_name"          {}
variable "environment"           {}
variable "db_name"               {}
variable "db_username"           {}
variable "db_password"           { sensitive = true }
variable "vpc_id"                {}
variable "private_subnet_ids"    { type = list(string) }
variable "rds_security_group_id" {}
