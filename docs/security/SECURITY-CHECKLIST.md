# Production Security Checklist

**Date:** November 2, 2025  
**Version:** 1.0

---

## 🔐 Critical Security Items

### Environment Variables
- [ ] All `.env.production` files created with unique values
- [ ] No `.env.production` files committed to git (in .gitignore)
- [ ] `JWT_SECRET` is at least 32 characters, randomly generated
- [ ] `JWT_REFRESH_SECRET` is different from JWT_SECRET
- [ ] `SUPER_ADMIN_JWT_SECRET` is different from other secrets
- [ ] `SESSION_SECRET` is randomly generated
- [ ] All secrets generated using: `openssl rand -base64 32`

### Database Security
- [ ] Production database has strong password (16+ chars, mixed case, numbers, symbols)
- [ ] Database is not publicly accessible (firewall rules)
- [ ] Database connection uses SSL/TLS
- [ ] Database backups are encrypted
- [ ] Separate database user for application (not postgres superuser)
- [ ] Database user has minimal required permissions

### Authentication & Authorization
- [ ] Super admin default password changed
- [ ] Password hashing uses bcrypt with 12+ rounds
- [ ] JWT tokens expire appropriately (8h for access, 7d for refresh)
- [ ] Refresh tokens are rotated on use
- [ ] Failed login attempts are rate-limited
- [ ] Account lockout after multiple failed attempts

### HTTPS/SSL
- [ ] SSL certificate installed (Let's Encrypt or commercial)
- [ ] All HTTP traffic redirects to HTTPS
- [ ] HSTS header enabled
- [ ] SSL certificate auto-renewal configured
- [ ] Strong SSL ciphers configured
- [ ] TLS 1.2+ only (no TLS 1.0/1.1)

### CORS Configuration
- [ ] CORS_ORIGIN set to specific domain(s) (no wildcards)
- [ ] Credentials allowed only for trusted origins
- [ ] Preflight requests handled correctly

### Rate Limiting
- [ ] Rate limiting enabled on all API endpoints
- [ ] Login endpoint has stricter rate limits
- [ ] Rate limit window: 15 minutes
- [ ] Max requests: 100 per window (adjust as needed)

### File Uploads
- [ ] File size limits enforced (5MB default)
- [ ] File type validation (whitelist approach)
- [ ] Uploaded files stored outside web root
- [ ] Uploaded files scanned for malware (if possible)
- [ ] File names sanitized

### Headers & Security Middleware
- [ ] Helmet.js enabled (already configured)
- [ ] X-Frame-Options: DENY
- [ ] X-Content-Type-Options: nosniff
- [ ] X-XSS-Protection: 1; mode=block
- [ ] Content-Security-Policy configured
- [ ] Strict-Transport-Security enabled

### Input Validation
- [ ] All user input validated on backend
- [ ] SQL injection prevention (using Prisma ORM)
- [ ] XSS prevention (React escapes by default)
- [ ] CSRF protection enabled for state-changing operations

### Logging & Monitoring
- [ ] Error logging configured (Winston)
- [ ] Sensitive data not logged (passwords, tokens)
- [ ] Failed authentication attempts logged
- [ ] Audit log for super admin actions (already implemented)
- [ ] Log rotation configured
- [ ] Logs monitored for suspicious activity

### Server Security
- [ ] Server OS updated and patched
- [ ] Firewall configured (only ports 80, 443, 22 open)
- [ ] SSH key-based authentication (no password auth)
- [ ] Non-root user for running applications
- [ ] Fail2ban or similar intrusion prevention
- [ ] Regular security updates scheduled

### Dependency Security
- [ ] All npm packages updated to latest stable
- [ ] `npm audit` run and vulnerabilities fixed
- [ ] Dependabot or Snyk configured for alerts
- [ ] Regular dependency updates scheduled

### Backup & Recovery
- [ ] Automated daily database backups
- [ ] Backups stored off-site
- [ ] Backup encryption enabled
- [ ] Backup restoration tested
- [ ] Recovery procedures documented

---

## 🛡️ Additional Security Measures

### API Security
- [ ] API versioning implemented
- [ ] Deprecated endpoints removed
- [ ] API documentation not publicly accessible
- [ ] GraphQL introspection disabled in production
- [ ] API keys rotated regularly

### Session Management
- [ ] Sessions expire after inactivity
- [ ] Session tokens are httpOnly cookies
- [ ] Session tokens are secure (HTTPS only)
- [ ] Session fixation prevention
- [ ] Concurrent session limits

### Error Handling
- [ ] Generic error messages to users (no stack traces)
- [ ] Detailed errors logged server-side only
- [ ] 404 pages don't reveal system information
- [ ] Error tracking service configured (Sentry)

### Code Security
- [ ] No hardcoded credentials in code
- [ ] No commented-out sensitive code
- [ ] No debug code in production
- [ ] Source maps disabled in production
- [ ] Minification enabled

### Third-Party Services
- [ ] API keys for external services secured
- [ ] Third-party service access reviewed
- [ ] Webhook signatures verified
- [ ] OAuth scopes minimized

---

## 📋 Pre-Deployment Checklist

### Final Verification
- [ ] All items above completed
- [ ] Security scan performed
- [ ] Penetration testing completed (if required)
- [ ] Security review by team
- [ ] Incident response plan documented
- [ ] Security contact information updated

### Post-Deployment
- [ ] Monitor logs for first 24 hours
- [ ] Verify all security headers present
- [ ] Test authentication flows
- [ ] Verify rate limiting works
- [ ] Test backup restoration
- [ ] Schedule first security audit

---

## 🚨 Security Incident Response

### If Breach Detected
1. Isolate affected systems
2. Preserve evidence (logs, snapshots)
3. Notify stakeholders
4. Assess scope of breach
5. Contain and remediate
6. Document incident
7. Review and improve security

### Emergency Contacts
- **Security Lead:** _____________
- **DevOps Lead:** _____________
- **Database Admin:** _____________
- **Hosting Provider:** _____________

---

## 📅 Regular Security Tasks

### Daily
- Monitor error logs
- Check failed login attempts
- Review audit logs

### Weekly
- Review access logs
- Check for security updates
- Verify backups successful

### Monthly
- Run `npm audit`
- Review user permissions
- Update dependencies
- Test backup restoration

### Quarterly
- Security audit
- Penetration testing
- Review and update security policies
- Rotate API keys and secrets

---

**Security Officer:** _____________  
**Last Review:** _____________  
**Next Review:** _____________
