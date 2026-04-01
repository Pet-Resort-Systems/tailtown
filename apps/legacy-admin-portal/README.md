# Tailtown Admin Portal

**Super Admin Application** for platform-wide management and tenant administration.

## Purpose

This is a **separate application** from the main tenant app. It provides platform administrators with tools to manage tenants, monitor system health, and configure platform-wide settings.

## Why Separate?

- **Security**: Tenant applications should never have access to super-admin code
- **Isolation**: Complete separation of concerns
- **Scalability**: Can be deployed independently
- **Access Control**: Different authentication and authorization

## Architecture

```
Tailtown Platform
├── Tenant App (port 3000)          - Customer-facing application
│   └── Used by: Pet resort staff
│
├── Admin Portal (port 3001)        - Platform management
│   └── Used by: Platform administrators (you)
│
└── Backend Services (port 4004)    - Shared API
    └── Protected endpoints for admin-only access
```

## Features

### Current
- **Tenant Management**
  - List all tenants
  - Create new tenants
  - View tenant details
  - Edit tenant information
  - Pause/reactivate tenants
  - Delete tenants (soft delete)
  - View usage statistics

### Coming Soon
- Platform Analytics
- System Monitoring
- Billing Management
- Audit Logs

## Running the Admin Portal

### Development

```bash
cd admin-portal
npm install
npm start
```

The app will run on **http://localhost:3001**

### Environment Variables

Create `.env` file:
```
PORT=3001
REACT_APP_CUSTOMER_SERVICE_URL=http://localhost:4004
```

## Access

**Local Development**:
- Admin Portal: http://localhost:3001
- Tenant App: http://localhost:3000
- Backend API: http://localhost:4004

**Login Credentials** (Development):
- Password: `admin123`
- Can be changed in `.env` file (`REACT_APP_ADMIN_PASSWORD`)

**Production** (Future):
- Admin Portal: https://admin.tailtown.com
- Tenant Apps: https://{subdomain}.tailtown.com
- Backend API: https://api.tailtown.com

## Security

### Authentication
- Separate authentication from tenant app
- Super-admin credentials only
- No tenant users can access this portal

### API Protection
Backend endpoints under `/api/tenants` should be protected with middleware:
```typescript
// Only allow super-admin role
if (req.user.role !== 'SUPER_ADMIN') {
  return res.status(403).json({ error: 'Forbidden' });
}
```

## Deployment

### Separate Deployment
The admin portal should be deployed separately from tenant apps:

1. **Different subdomain**: admin.tailtown.com
2. **Different server** (optional but recommended)
3. **Restricted access**: IP whitelist or VPN
4. **Separate database** for admin users (optional)

### Build for Production

```bash
npm run build
```

Output in `/build` directory can be deployed to:
- Vercel
- Netlify
- AWS S3 + CloudFront
- DigitalOcean App Platform

## Development Notes

### Adding New Features

1. Create pages in `src/pages/`
2. Add routes in `src/App.tsx`
3. Create services in `src/services/`
4. Update navigation in `src/pages/Dashboard.tsx`

### Shared Code

If you need to share code between tenant app and admin portal:
- Create a `shared` package
- Use npm workspaces or lerna
- Or duplicate small utilities (simpler for now)

## Tech Stack

- **React** 18.2
- **TypeScript** 4.9
- **Material-UI** 5.14
- **React Router** 6.20
- **Axios** for API calls

## File Structure

```
admin-portal/
├── public/
│   └── index.html
├── src/
│   ├── components/       # Reusable components
│   ├── pages/
│   │   ├── Dashboard.tsx
│   │   └── tenants/      # Tenant management pages
│   ├── services/         # API services
│   ├── contexts/         # React contexts
│   ├── utils/            # Utilities
│   ├── App.tsx           # Main app component
│   ├── index.tsx         # Entry point
│   └── theme.ts          # MUI theme
├── package.json
└── tsconfig.json
```

## Important Notes

1. **Never merge** admin portal code into tenant app
2. **Always deploy separately** in production
3. **Protect API endpoints** with super-admin checks
4. **Use different authentication** for admin portal
5. **Monitor access logs** for security

## Support

For questions about the admin portal:
- Check `/docs/features/multi-tenancy-system.md`
- Review commit history
- Contact platform administrator

---

**Status**: ✅ Operational  
**Port**: 3001  
**Version**: 0.1.0
