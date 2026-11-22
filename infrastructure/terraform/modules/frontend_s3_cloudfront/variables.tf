variable "environment" { type = string }
variable "domain_name" {
  type    = string
  default = ""
}
variable "acm_certificate_arn" {
  type    = string
  default = ""
}
