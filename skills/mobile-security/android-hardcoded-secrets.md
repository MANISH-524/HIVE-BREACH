---
id: mobile-secrets-001
name: Android Hardcoded Secrets Detection
category: mobile-security
mitre_attack_ids: [TA0006]
owasp_mapping: []
cwe_ids: [CWE-798]
verification_track: state-verified
severity: high
tools: [mobsf, jadx, apktool]
stage: Mobile App
tags: [android, secrets, hardcoded, api-key, mobile]
---

## Objective
Detect hardcoded API keys, secrets, and credentials in Android APK source code.

## Steps

### 1. Decompile the APK
```bash
apktool d target.apk -o decompiled/
jadx target.apk -d decompiled-source/
```

### 2. Search for common credential patterns
- `AKIA*` — AWS access keys
- `AIza*` — Google API keys
- `ghp_*` — GitHub tokens
- Base64-encoded strings in `strings.xml`, `BuildConfig.java`
- `api_key`, `secret`, `password`, `token`, `auth` in source code
- Firebase configuration files (`google-services.json`)

### 3. Check shared preferences
- Hardcoded `.putString("password", "value")` calls
- `SharedPreferences` misuse with MODE_WORLD_READABLE

### 4. Check NDK/native libraries
- Embedded strings in `.so` files
- Environment variables set in JNI code

### 5. Check ProGuard/R8 mappings
- Ensure secrets are NOT excluded from obfuscation rules
- `keep` rules that preserve secret-containing classes

## Severity
Critical: AWS production keys, payment API keys
High: Hardcoded OAuth client secrets, database passwords
Medium: Hardcoded URLs with embedded API keys