# Service Port Assignments

> ⚠️ **CRITICAL**: This is the authoritative source for service port assignments.
> Always reference this document when configuring Nginx, PM2, or any service routing.

## Production Port Assignments

| Service                 | Port | Description                                  | Has Pet/Customer Data? |
| ----------------------- | ---- | -------------------------------------------- | ---------------------- |
| **Frontend**            | 3000 | React app served by `serve`                  | N/A                    |
| **Reservation Service** | 4003 | Check-ins, service agreements, resources     | ❌ No - only IDs       |
| **Customer Service**    | 4004 | Customers, pets, reservations with relations | ✅ Yes - full data     |

## Which Service to Use?

### Use Customer Service (4004) for:

- `/api/reservations` - Returns full pet/customer data
- `/api/customers` - Customer CRUD
- `/api/pets` - Pet CRUD
- `/api/staff` - Staff management
- `/api/tenants` - Tenant management
- `/api/announcements` - Announcements
- `/api/analytics` - Analytics with customer data

### Use Reservation Service (4003) for:

- `/api/check-ins` - Check-in workflow
- `/api/check-in-templates` - Check-in templates
- `/api/service-agreements` - Signed agreements
- `/api/service-agreement-templates` - Agreement templates
- `/api/resources` - Room/kennel resources (shared database)

## Why Two Services?

The reservation-service was created to handle check-in workflows and service agreements separately. However, it shares the same PostgreSQL database but has a **reduced Prisma schema** that excludes Customer and Pet models.

**Key Insight**: If you need `pet.name` or `customer.firstName` in the response, you MUST route to **customer-service (4004)**.

## Nginx Configuration Locations

- `/etc/nginx/sites-enabled/tailtown` - Main domain (canicloud.com)
- `/etc/nginx/sites-enabled/wildcard-subdomains` - Tenant subdomains (\*.canicloud.com)

Both files must be kept in sync for routing rules.

## Verification Commands

```bash
# Check which service handles reservations
curl -s "http://localhost:4004/api/reservations?limit=1" -H "x-tenant-subdomain: tailtown" | jq ".data[0].pet"
# Should return: { "id": "...", "name": "Buddy", ... }

curl -s "http://localhost:4003/api/reservations?limit=1" -H "x-tenant-id: <tenant-id>" | jq ".data.reservations[0].pet"
# Should return: null (no pet relation in schema)

# Verify production routing
curl -s "https://tailtown.canicloud.com/api/reservations?limit=1" | jq ".data[0].pet.name"
# Should return the pet name, not null
```

## Common Mistakes

1. **Routing `/api/reservations` to 4003** - Results in "Unknown Pet" on calendar
2. **Forgetting to update wildcard-subdomains** - Main domain works but subdomains don't
3. **Using reservation-service for customer lookups** - Returns null for relations

## Changelog

| Date       | Change                            | Reason                        |
| ---------- | --------------------------------- | ----------------------------- |
| 2025-12-03 | Route `/api/reservations` to 4004 | Fix "Unknown Pet" on calendar |
| 2025-12-03 | Pin Prisma to 4.16.2              | Prevent v7 breaking changes   |
