---
id: api-bola-001
name: Broken Object Level Authorization (BOLA) Detection
category: api-security
mitre_attack_ids: [TA0001]
owasp_mapping: [API1]
cwe_ids: [CWE-639]
verification_track: exploit-verified
severity: high
tools: [schemathesis, kiterunner, curl, burp-mcp]
stage: Application-side
tags: [api, bola, idor, authorization, owasp-api-top10]
---

## Objective
Detect BOLA/IDOR vulnerabilities where an API returns other users' objects when IDs are substituted.

## Steps

### 1. Identify object endpoints
Endpoints with user-specific identifiers in URL:
- `GET /api/users/{id}`
- `GET /api/orders/{orderId}`
- `PUT /api/profiles/{userId}`

### 2. Substitute IDs
Using a second authenticated session, substitute the ID of another object:
```bash
# User A's valid request
curl -H "Authorization: Bearer USER_A_TOKEN" "https://target.com/api/orders/123"

# User A trying to access User B's order
curl -H "Authorization: Bearer USER_A_TOKEN" "https://target.com/api/orders/456"
```

### 3. Test sequential/guessable IDs
- Try ID +1, ID +10, ID +100
- UUIDs that aren't truly random (v1 UUIDs are time-based)
- Try negative IDs, null, empty string, ID=admin

### 4. Test mass assignment
When updating objects, include fields that shouldn't be writable:
```bash
curl -X PUT -H "Authorization: Bearer USER_TOKEN" \
  -d '{"role": "admin", "verified": true}' \
  "https://target.com/api/profiles/USER_ID"
```

## Validation
BOLA is confirmed if a user accessing non-owned objects receives their data successfully (not 403).
Mass assignment is confirmed if a privilege field is accepted and persisted.