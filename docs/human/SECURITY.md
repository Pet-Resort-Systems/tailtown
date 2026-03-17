# Security Quick Reference

## ✅ What's Protected

- ✅ **Brute Force** - Rate limiting (5 attempts/15 min)
- ✅ **Account Takeover** - Auto-lockout after 5 failed logins
- ✅ **Token Theft** - Short-lived tokens (8h) with rotation
- ✅ **Injection** - Input validation on all endpoints
- ✅ **DoS** - Request size limits (10MB max)
- ✅ **XSS** - Input sanitization + security headers

---

## Common Issues

**"Too many requests" error:**
- Rate limit hit
- Wait 15 minutes or use different IP

**"Account locked" error:**
- 5 failed login attempts
- Wait 15 minutes for auto-unlock

**"Invalid token" error:**
- Token expired (8 hours)
- Use refresh token to get new one

**Validation error:**
- Check error.errors array for field-specific messages
- Fix input and retry

---

## 📚 More Details

- **Security Checklist:** [/docs/security/SECURITY-CHECKLIST.md](../security/SECURITY-CHECKLIST.md)
- **Full Security Docs:** [/docs/ai-context/security/](../ai-context/security/)
- **OWASP Top 10:** [/docs/ai-context/security/SECURITY-FINAL-SUMMARY.md](../ai-context/security/SECURITY-FINAL-SUMMARY.md)
