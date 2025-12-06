# Overnight Reservation Count Fix - December 5, 2025

## Executive Summary

Successfully resolved the overnight reservation count discrepancy between the dashboard (showing 51) and Gingr (showing 69). The dashboard now accurately displays **69 active overnight boarding reservations**.

## Problem Statement

The dashboard was showing 51 overnight boarding reservations for December 5, 2025, while Gingr showed 69.

## Root Cause

The frontend was only counting `CHECKED_IN` reservations as overnight guests. Gingr's count includes both `CHECKED_IN` and `CONFIRMED` reservations.

### Original Code

```typescript
const overnight = enhancedReservations.filter((res: any) => {
  if (res.status !== "CHECKED_IN") return false;
  // ...
}).length;
```

### Fixed Code

```typescript
const overnight = enhancedReservations.filter((res: any) => {
  const status = res.status?.toUpperCase();
  if (!["CHECKED_IN", "CONFIRMED"].includes(status)) return false;
  const serviceCategory = res.service?.serviceCategory;
  if (serviceCategory !== "BOARDING") return false;
  // ...
}).length;
```

## Deployment Issues Encountered

### Issue 1: Browser Caching

- Old JavaScript chunks were cached aggressively
- Solution: Production builds use hashed filenames (e.g., `main.6d622486.js`) which force cache invalidation

### Issue 2: Development Build Deployed

- Initial deployment used development build which connected to `localhost:4003/4004`
- Root cause: `.env.development` contains `REACT_APP_RESERVATION_API_URL=http://localhost:4003`
- Solution: Build with env vars explicitly cleared:
  ```bash
  REACT_APP_API_URL= REACT_APP_RESERVATION_API_URL= npm run build
  ```

### Issue 3: Wrong Deployment Location

- Files were deployed to `/var/www/tailtown/` but frontend is served from `/opt/tailtown/frontend/build/`
- Nginx proxies `location /` to `http://localhost:3000` (serve process)
- Solution: Deploy to correct location and restart serve process

## Prevention Measures

Created deployment script: `scripts/deploy-frontend.sh`

- Automatically clears env vars for production build
- Verifies hashed filenames (production mode)
- Deploys to correct location
- Restarts serve process
- Validates deployment

## Verification

### API Query

```bash
curl -s -H "x-tenant-id: tailtown" "http://localhost:4004/api/reservations?page=1&limit=500&status=CONFIRMED,CHECKED_IN&date=2025-12-05" | python3 -c "
import sys,json
d=json.load(sys.stdin)
r=d.get('data',[])
boarding = [x for x in r if x.get('service',{}).get('serviceCategory')=='BOARDING']
print('BOARDING by status:')
from collections import Counter
for s, c in Counter(b.get('status') for b in boarding).items():
    print(f'  {s}: {c}')
"
```

### Expected Output

```
BOARDING by status:
  CHECKED_IN: 51
  CONFIRMED: 18
```

Total: 69 (matches Gingr)

## Files Modified

- `/frontend/src/hooks/useDashboardData.ts` - Include CONFIRMED status in overnight count
- `/scripts/deploy-frontend.sh` - New deployment script (created)

## Related Documentation

- Previous fix: `docs/archive/summaries/OVERNIGHT_RESERVATION_FIX_2025-11-19.md`
