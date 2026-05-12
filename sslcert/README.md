# SSL certificates

This directory is intentionally empty in source control. `server.key` and
`server.crt` were **removed from the repository** as part of the 2026-04
security fix branch because the previously committed private key was exposed
to anyone who cloned the repository.

To run the app with HTTPS (`npm run dev-https`), generate or install your own
certificate and key locally:

```bash
openssl req -x509 -newkey rsa:4096 -nodes -keyout server.key -out server.crt \
  -days 365 -subj "/CN=localhost"
```

`server.key` is matched by `.gitignore` (`*.key`) and must never be committed.

**Operational follow-up**: the old `server.key` must be treated as compromised.
Rotate any TLS certificate that was ever signed with it (including the
`master.xinfin.network` certificate if that private key was ever deployed) and
revoke the corresponding certificate via the issuing CA.
