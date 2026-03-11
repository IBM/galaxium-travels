# AWS Credentials Setup Guide

This guide will walk you through creating AWS credentials needed to deploy the Terraform infrastructure.

---

## 📋 Prerequisites

- AWS Account (if you don't have one, sign up at https://aws.amazon.com)
- Access to AWS Console
- AWS CLI installed locally

---

## 🔐 Step 1: Install AWS CLI

### macOS (using Homebrew)
```bash
brew install awscli
```

### Alternative: Direct Download
```bash
# Download and install
curl "https://awscli.amazonaws.com/AWSCLIV2.pkg" -o "AWSCLIV2.pkg"
sudo installer -pkg AWSCLIV2.pkg -target /
```

### Verify Installation
```bash
aws --version
# Should output: aws-cli/2.x.x ...
```

---

## 🔑 Step 2: Create IAM User in AWS Console

### 2.1 Sign in to AWS Console
1. Go to https://console.aws.amazon.com
2. Sign in with your AWS account credentials

### 2.2 Navigate to IAM
1. In the AWS Console search bar, type **IAM**
2. Click on **IAM** (Identity and Access Management)

### 2.3 Create New User
1. In the left sidebar, click **Users**
2. Click **Create user** button (top right)
3. Enter user details:
   - **User name**: `terraform-deploy` (or any name you prefer)
   - Click **Next**

### 2.4 Set Permissions
Choose one of these options:

#### Option A: Administrator Access (Easiest - for learning/testing)
1. Select **Attach policies directly**
2. Search for and select: **AdministratorAccess**
3. Click **Next**

#### Option B: Minimal Required Permissions (More Secure - for production)
1. Select **Attach policies directly**
2. Search for and select these policies:
   - `AmazonVPCFullAccess`
   - `AmazonEC2FullAccess`
   - `AmazonECS_FullAccess`
   - `AmazonRDSFullAccess`
   - `AmazonEC2ContainerRegistryFullAccess`
   - `IAMFullAccess`
   - `CloudWatchFullAccess`
   - `ElasticLoadBalancingFullAccess`
3. Click **Next**

### 2.5 Review and Create
1. Review the user details
2. Click **Create user**

---

## 🔐 Step 3: Create Access Keys

### 3.1 Access the User
1. After creating the user, click on the username
2. Or navigate to **IAM** → **Users** → Click on your user

### 3.2 Create Access Key
1. Click on the **Security credentials** tab
2. Scroll down to **Access keys** section
3. Click **Create access key**

### 3.3 Select Use Case
1. Select **Command Line Interface (CLI)**
2. Check the confirmation box at the bottom
3. Click **Next**

### 3.4 Add Description (Optional)
1. Add a description tag (e.g., "Terraform deployment from local machine")
2. Click **Create access key**

### 3.5 Save Your Credentials
**⚠️ IMPORTANT: This is the ONLY time you'll see the Secret Access Key!**

You'll see:
- **Access key ID**: `AKIAIOSFODNN7EXAMPLE` (example)
- **Secret access key**: `wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY` (example)

**Save these credentials immediately!**

Options to save:
1. Click **Download .csv file** (recommended)
2. Copy both values to a secure password manager
3. Write them down temporarily (delete after setup)

---

## 💻 Step 4: Configure AWS CLI

### 4.1 Run AWS Configure
```bash
aws configure
```

### 4.2 Enter Your Credentials
You'll be prompted for:

```
AWS Access Key ID [None]: AKIAIOSFODNN7EXAMPLE
AWS Secret Access Key [None]: wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
Default region name [None]: us-east-1
Default output format [None]: json
```

**Enter:**
- Your Access Key ID (from Step 3.5)
- Your Secret Access Key (from Step 3.5)
- Region: `us-east-1` (or your preferred region)
- Output format: `json`

### 4.3 Verify Configuration
```bash
# Test AWS CLI
aws sts get-caller-identity
```

**Expected output:**
```json
{
    "UserId": "AIDAI...",
    "Account": "123456789012",
    "Arn": "arn:aws:iam::123456789012:user/terraform-deploy"
}
```

If you see this, your credentials are working! ✅

---

## 📁 Step 5: Verify Credential Files

Your credentials are stored in:

### macOS/Linux
```bash
# View credentials (be careful - these are sensitive!)
cat ~/.aws/credentials
cat ~/.aws/config
```

### Files should contain:

**~/.aws/credentials**
```ini
[default]
aws_access_key_id = AKIAIOSFODNN7EXAMPLE
aws_secret_access_key = wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
```

**~/.aws/config**
```ini
[default]
region = us-east-1
output = json
```

---

## 🧪 Step 6: Test Terraform Access

Now test if Terraform can use your credentials:

```bash
cd terraform

# Initialize Terraform
terraform init

# Validate configuration
terraform validate

# Test AWS access
terraform plan
```

If `terraform plan` runs without authentication errors, you're all set! ✅

---

## 🔒 Security Best Practices

### ✅ DO:
- Store credentials securely (use password manager)
- Use IAM users instead of root account
- Enable MFA (Multi-Factor Authentication) on your AWS account
- Rotate access keys regularly (every 90 days)
- Use minimal required permissions
- Delete unused access keys

### ❌ DON'T:
- Share your access keys with anyone
- Commit credentials to Git
- Use root account credentials
- Leave unused access keys active
- Use the same credentials across multiple projects

---

## 🔄 Managing Multiple AWS Profiles

If you need multiple AWS accounts or profiles:

### Create Named Profile
```bash
aws configure --profile production
aws configure --profile development
```

### Use Specific Profile with Terraform
```bash
# Set environment variable
export AWS_PROFILE=production

# Or specify in provider
terraform plan
```

### List All Profiles
```bash
aws configure list-profiles
```

---

## 🆘 Troubleshooting

### Issue: "Unable to locate credentials"
**Solution:**
```bash
# Check if credentials file exists
ls -la ~/.aws/

# Re-run configure
aws configure
```

### Issue: "Access Denied" errors
**Solution:**
- Verify IAM user has correct permissions
- Check if you're using the right profile
- Ensure credentials are not expired

### Issue: "Invalid security token"
**Solution:**
- Credentials might be incorrect
- Re-create access keys in AWS Console
- Run `aws configure` again

### Issue: Region errors
**Solution:**
```bash
# Set default region
aws configure set region us-east-1

# Or use environment variable
export AWS_DEFAULT_REGION=us-east-1
```

---

## 🔐 Alternative: Using AWS SSO (Recommended for Organizations)

If your organization uses AWS SSO:

```bash
# Configure SSO
aws configure sso

# Login
aws sso login --profile my-sso-profile

# Use with Terraform
export AWS_PROFILE=my-sso-profile
terraform plan
```

---

## 📊 Cost Monitoring Setup

After credentials are configured, set up billing alerts:

1. Go to **AWS Console** → **Billing Dashboard**
2. Click **Billing preferences**
3. Enable:
   - ✅ Receive Free Tier Usage Alerts
   - ✅ Receive Billing Alerts
4. Set up CloudWatch billing alarm:
   - Go to **CloudWatch** → **Alarms** → **Create alarm**
   - Select **Billing** → **Total Estimated Charge**
   - Set threshold (e.g., $50)
   - Add email notification

---

## ✅ Checklist

Before proceeding with Terraform deployment:

- [ ] AWS CLI installed and working (`aws --version`)
- [ ] IAM user created with appropriate permissions
- [ ] Access keys generated and saved securely
- [ ] AWS CLI configured (`aws configure`)
- [ ] Credentials verified (`aws sts get-caller-identity`)
- [ ] Terraform can access AWS (`terraform plan` works)
- [ ] Billing alerts configured
- [ ] MFA enabled on AWS account (recommended)

---

## 🚀 Next Steps

Once credentials are set up:

1. **Configure Terraform Variables**
   ```bash
   cd terraform
   cp terraform.tfvars.example terraform.tfvars
   # Edit terraform.tfvars with your values
   ```

2. **Initialize Terraform**
   ```bash
   terraform init
   ```

3. **Plan Deployment**
   ```bash
   terraform plan -out=tfplan
   ```

4. **Apply Infrastructure**
   ```bash
   terraform apply tfplan
   ```

---

## 📚 Additional Resources

- [AWS IAM Best Practices](https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html)
- [AWS CLI Configuration](https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-files.html)
- [Terraform AWS Provider Authentication](https://registry.terraform.io/providers/hashicorp/aws/latest/docs#authentication-and-configuration)
- [AWS Free Tier](https://aws.amazon.com/free/)

---

**Need Help?** 
- AWS Support: https://console.aws.amazon.com/support/
- Terraform Documentation: https://www.terraform.io/docs