# Uncomment after creating S3 bucket and DynamoDB table
# terraform {
#   backend "s3" {
#     bucket         = "galaxium-travels-terraform-state"
#     key            = "prod/terraform.tfstate"
#     region         = "us-east-1"
#     encrypt        = true
#     dynamodb_table = "galaxium-travels-terraform-locks"
#   }
# }