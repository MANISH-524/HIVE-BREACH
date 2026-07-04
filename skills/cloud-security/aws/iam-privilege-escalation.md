---
id: aws-iam-001
name: AWS IAM Privilege Escalation Detection
category: cloud-security
mitre_attack_ids: [TA0004, TA0007]
owasp_mapping: []
cwe_ids: [CWE-269]
verification_track: state-verified
severity: critical
tools: [prowler, scoutsuite, pacu]
stage: Cloud usage
tags: [aws, iam, privilege-escalation, cloud]
---

## Objective
Detect IAM misconfigurations that allow privilege escalation within AWS accounts.

## Steps

### 1. List all IAM policies
Check for overly permissive policies — especially `*:*` or `AdministratorAccess` attached to non-admin roles/users.

### 2. Verify trust relationships
Check role trust policies for:
- Cross-account assumption from untrusted accounts
- Federated/web identity with overbroad audience
- `sts:AssumeRole` with `*` principal

### 3. Detect privilege escalation paths
Common IAM escalation vectors:
- `iam:CreatePolicyVersion` — user can modify their own policy
- `iam:SetDefaultPolicyVersion` — switch to previously created version
- `iam:PutRolePolicy` — attach policy to role user can assume
- `iam:AttachRolePolicy` — attach AdministratorAccess
- `iam:UpdateAssumeRolePolicy` — modify who can assume a role
- `iam:PassRole` + `ec2:RunInstances` — pass role to new EC2 instance
- `lambda:CreateFunction` + `lambda:InvokeFunction` + `iam:PassRole` — create lambda with privileged role

### 4. Check for exposed cloud metadata
Confirm Instance Metadata Service (IMDS) is v2-only (not v1 which is vulnerable to SSRF).

## Severity
Critical if any `*:*` or `AdministratorAccess` policy exists.
High if any privilege escalation path is confirmed.