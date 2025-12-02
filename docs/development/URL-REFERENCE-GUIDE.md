# URL Reference Guide

**Last Updated:** November 7, 2025  
**Purpose:** Clear guide on when to use production URLs vs localhost

---

## 🌐 Production URLs (For End Users & Production)

### Multi-Tenant Subdomains
Each tenant has their own subdomain:

- **Tailtown (Production):** https://tailtown.canicloud.com
- **BranGro (Demo):** https://brangro.canicloud.com
- **Future Tenants:** https://[tenant-name].canicloud.com

### API Endpoints
- **Base URL:** `https://[tenant-subdomain].canicloud.com/api`
- **Example:** `https://tailtown.canicloud.com/api/customers`

### When to Use Production URLs
✅ End users accessing the application  
✅ Staff using the system  
✅ API documentation examples  
✅ curl examples in public docs  
✅ Production testing  
✅ Demo/sales presentations

---

## 💻 Localhost URLs (For Developers Only)

### Local Development
When running the application on your local machine:

- **Frontend:** http://localhost:3000
- **Customer Service:** http://localhost:4004
- **Reservation Service:** http://localhost:4003
- **Database:** localhost:5432

### When to Use Localhost
✅ Local development  
✅ Running tests locally  
✅ Debugging on your machine  
✅ Developer documentation examples  
✅ Internal testing scripts

---

## 🖥️ Server-Side Localhost (Production Server)

### Nginx Internal Routing
On the production server, Nginx proxies external requests to internal services:

```
External Request:  https://tailtown.canicloud.com
                   ↓
Nginx:             Receives on port 443 (SSL)
                   ↓
Internal Routing:  http://localhost:3000 (frontend)
                   http://localhost:4004 (customer service)
                   http://localhost:4003 (reservation service)
```

### When You See Server-Side Localhost
✅ Nginx configuration files  
✅ PM2 process configuration  
✅ Server deployment scripts  
✅ Production server logs

**Important:** These localhost references are **on the production server**, not your local machine!

---

## 📝 Documentation Standards

### User-Facing Documentation
**Always use production URLs first:**

```markdown
## Access the Application

**Production:**
- Tailtown: https://tailtown.canicloud.com
- BranGro: https://brangro.canicloud.com

**Local Development (Developers Only):**
- Frontend: http://localhost:3000
```

### Developer Documentation
**Clarify context for localhost:**

```markdown
**Note:** All curl examples use `localhost` for **local testing only**. 
Production uses `https://canicloud.com`

```bash
# Local testing
curl http://localhost:4004/api/customers

# Production
curl https://tailtown.canicloud.com/api/customers
```
```

### Architecture Documentation
**Explain server-side vs client-side:**

```markdown
**Note:** The `localhost` references below are **server-side** configuration 
on the production server. Nginx proxies external requests to internal services.

```nginx
# External: https://tailtown.canicloud.com
# Internal: http://localhost:4004 (on server)
location /api/ {
    proxy_pass http://localhost:4004;
}
```
```

---

## 🎯 Quick Decision Tree

**"Should I use production URLs or localhost?"**

```
Are you writing for end users?
├─ YES → Use production URLs (https://canicloud.com)
└─ NO → Is this for local development?
    ├─ YES → Use localhost (http://localhost:3000)
    └─ NO → Is this server configuration?
        ├─ YES → Use localhost with context note
        └─ NO → Default to production URLs
```

---

## 📚 Examples

### ✅ Good: User-Facing README
```markdown
# Access Tailtown

Visit https://tailtown.canicloud.com

For developers: See [QUICK-START.md](docs/human/QUICK-START.md) 
for local development setup.
```

### ✅ Good: Developer Guide
```markdown
# Local Development

1. Start services:
   ```bash
   npm run start:services
   ```

2. Access locally:
   - Frontend: http://localhost:3000
   - API: http://localhost:4004

**Production uses:** https://canicloud.com
```

### ✅ Good: API Documentation
```markdown
# API Reference

**Base URL (Production):** https://canicloud.com/api  
**Base URL (Local Dev):** http://localhost:4004/api

**Production Examples:**
- Tailtown: https://tailtown.canicloud.com/api
- BranGro: https://brangro.canicloud.com/api
```

### ❌ Bad: Ambiguous
```markdown
# Access the Application

Go to http://localhost:3000
```
**Problem:** Doesn't clarify this is for local development only!

### ❌ Bad: Missing Context
```markdown
# Nginx Config

```nginx
proxy_pass http://localhost:4004;
```
```
**Problem:** Doesn't explain this is server-side routing!

---

## 🔍 Finding Localhost References

### Search Commands
```bash
# Find all localhost references in docs
grep -r "localhost:300\|localhost:400" docs/ --include="*.md"

# Find in specific file types
grep -r "http://localhost" . --include="*.md" --include="*.ts"

# Find production URLs
grep -r "canicloud.com" docs/ --include="*.md"
```

### Files Updated (November 7, 2025)
✅ README.md  
✅ docs/HOME.md  
✅ docs/human/QUICK-START.md  
✅ docs/api/API-OVERVIEW.md  
✅ docs/CURRENT-SYSTEM-ARCHITECTURE.md  
✅ docs/human/SECURITY.md  
✅ docs/ai-context/security/SECURITY-IMPLEMENTATION-PROGRESS.md

---

## 🎓 For AI Assistants

When generating documentation or code examples:

1. **Default to production URLs** for user-facing content
2. **Use localhost** only for developer guides with clear context
3. **Always add a note** when using localhost in examples
4. **Explain server-side vs client-side** for architecture docs
5. **Show both production and local** in API documentation

**Template Note:**
```markdown
**Note:** All examples use `localhost` for **local testing only**. 
Production uses `https://canicloud.com`
```

---

## 📊 Summary

| Context | URL to Use | Example |
|---------|-----------|---------|
| End Users | Production | https://tailtown.canicloud.com |
| API Calls (Production) | Production | https://tailtown.canicloud.com/api |
| Local Development | Localhost | http://localhost:3000 |
| Server Config | Localhost + Note | proxy_pass http://localhost:4004 |
| Documentation Default | Production | Always show production first |

---

**Key Principle:** When in doubt, use production URLs and add a note about localhost for developers.

**Goal:** Prevent confusion for users, developers, and AI assistants about where to access the application.
