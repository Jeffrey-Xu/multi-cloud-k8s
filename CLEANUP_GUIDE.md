# Cleanup Procedures for Monopoly Gaming Platform

## 🧹 Cleanup Options

### **Option 1: Complete Cleanup (Everything)**
```bash
./cleanup.sh
```
**What it does:**
- ✅ Deletes all Kubernetes workloads
- ✅ Destroys all Terraform infrastructure  
- ✅ Removes all AWS resources
- ✅ Stops all billing

**Use when:** Project complete, switching environments, or major changes

---

### **Option 2: Quick Cleanup (Apps Only)**
```bash
./quick-cleanup.sh
```
**What it does:**
- ✅ Deletes Kubernetes applications
- ❌ Keeps infrastructure running
- ❌ Keeps EKS, RDS, Redis running

**Use when:** Testing new app versions, development iterations

---

## 🔄 Cleanup Order (Critical!)

### **❌ Wrong Order (Will Cause Issues):**
```bash
terraform destroy  # DON'T do this first!
# Leaves orphaned AWS resources created by K8s
```

### **✅ Correct Order:**
```bash
1. Delete K8s workloads (releases AWS resources)
2. Wait for AWS cleanup (ALB, EBS volumes)
3. Run terraform destroy (infrastructure)
4. Verify no remaining resources
```

---

## 🚨 Common Cleanup Issues

### **Issue 1: Stuck Load Balancers**
```bash
# Symptom: Terraform can't delete VPC
Error: DependencyViolation: The vpc 'vpc-xxx' has dependencies

# Solution:
kubectl delete ingress --all -n monopoly-game --timeout=300s
# Wait 2-3 minutes for ALB cleanup
terraform destroy
```

### **Issue 2: Stuck EBS Volumes**
```bash
# Symptom: EBS volumes not deleted
Error: VolumeInUse: Volume vol-xxx is currently attached

# Solution:
kubectl delete pvc --all -n monopoly-game --timeout=300s
kubectl delete pv --all --timeout=300s
# Wait for volume detachment
terraform destroy
```

### **Issue 3: Security Group Dependencies**
```bash
# Symptom: Can't delete security groups
Error: DependencyViolation: resource sg-xxx has a dependent object

# Solution: Check for remaining ENIs, ALBs, or instances
aws ec2 describe-network-interfaces --filters "Name=group-id,Values=sg-xxx"
```

---

## 🔍 Manual Verification Commands

### **Check Remaining Resources:**
```bash
# Load Balancers
aws elbv2 describe-load-balancers --query 'LoadBalancers[?contains(LoadBalancerName, `monopoly`)].LoadBalancerName'

# EBS Volumes
aws ec2 describe-volumes --filters "Name=tag:Project,Values=monopoly-game" --query 'Volumes[?State==`available`].VolumeId'

# Security Groups
aws ec2 describe-security-groups --filters "Name=group-name,Values=monopoly-dev*"

# EKS Clusters
aws eks list-clusters --query 'clusters[?contains(@, `monopoly`)]'

# RDS Instances
aws rds describe-db-instances --query 'DBInstances[?contains(DBInstanceIdentifier, `monopoly`)].DBInstanceIdentifier'
```

### **Force Delete Stuck Resources:**
```bash
# Force delete ALB (if stuck)
ALB_ARN=$(aws elbv2 describe-load-balancers --names monopoly-dev-alb --query 'LoadBalancers[0].LoadBalancerArn' --output text)
aws elbv2 delete-load-balancer --load-balancer-arn $ALB_ARN

# Force delete EBS volumes
aws ec2 delete-volume --volume-id vol-xxxxxxxxx

# Force delete security group
aws ec2 delete-security-group --group-id sg-xxxxxxxxx
```

---

## 💰 Cost Verification

### **After Cleanup, Verify No Charges:**
```bash
# Check running instances
aws ec2 describe-instances --filters "Name=instance-state-name,Values=running" --query 'Reservations[].Instances[].{ID:InstanceId,Name:Tags[?Key==`Name`].Value|[0]}'

# Check RDS instances
aws rds describe-db-instances --query 'DBInstances[?DBInstanceStatus==`available`].DBInstanceIdentifier'

# Check NAT Gateways (expensive!)
aws ec2 describe-nat-gateways --filter "Name=state,Values=available"

# Check Elastic IPs
aws ec2 describe-addresses --query 'Addresses[?AssociationId==null].PublicIp'
```

---

## 🔄 Development Workflow

### **Typical Development Cycle:**
```bash
# 1. Deploy infrastructure (once)
terraform apply

# 2. Deploy applications
./deploy-k8s.sh

# 3. Test and iterate
./quick-cleanup.sh    # Clean apps only
./deploy-k8s.sh       # Redeploy apps

# 4. End of day/project
./cleanup.sh          # Clean everything
```

### **Emergency Cleanup:**
```bash
# If scripts fail, manual cleanup:
kubectl delete namespace monopoly-game --force --grace-period=0
terraform destroy -auto-approve
aws elbv2 describe-load-balancers  # Check for orphaned ALBs
```

---

## ⚠️ Important Notes

1. **Always clean K8s first** - Prevents orphaned AWS resources
2. **Wait between steps** - AWS resources need time to release
3. **Check billing** - Verify no unexpected charges after cleanup
4. **Save important data** - Cleanup is irreversible
5. **Use quick-cleanup** - For development iterations to save costs

**The cleanup scripts handle 99% of cases automatically, but manual verification is recommended for production environments.**
