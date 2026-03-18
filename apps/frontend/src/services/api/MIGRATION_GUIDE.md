# API Client Migration Guide

This guide explains how to migrate from the old API client structure to the new centralized API client architecture.

## Old Structure

```javascript
// Direct import from api.js
import api from '../services/api';
import { customerApi } from '../services/api';
import { reservationApi } from '../services/api';

// Example usage
api.get('/api/customers');
customerApi.get('/api/customers');
reservationApi.get('/api/reservations');
```

## New Structure

```javascript
// Import service-specific clients
import apiClients from '../services/api';
import { customerApiClient, reservationApiClient } from '../services/api/serviceClients';

// Example usage
apiClients.customer.get('/api/customers');
customerApiClient.get('/api/customers');
reservationApiClient.get('/api/reservations');
```

## Migration Steps

### Step 1: Update Imports

Replace:
```javascript
import api from '../services/api';
import { customerApi, reservationApi } from '../services/api';
```

With:
```javascript
import apiClients from '../services/api';
import { customerApiClient, reservationApiClient } from '../services/api';
```

### Step 2: Update API Calls

Replace:
```javascript
api.get('/api/customers');
customerApi.get('/api/customers');
reservationApi.get('/api/reservations');
```

With:
```javascript
apiClients.customer.get('/api/customers');
customerApiClient.get('/api/customers');
reservationApiClient.get('/api/reservations');
```

### Step 3: Use Helper Methods (Optional)

Take advantage of the new helper methods:

```javascript
import { safeApiCall, normalizeResponse } from '../services/api';

// Safe API call with error handling
const data = await safeApiCall(apiClients.customer.get('/api/customers'));

// Normalize response data
const customer = normalizeResponse(response);
```

## Benefits of the New Architecture

- **Type Safety**: Better TypeScript integration and type definitions
- **Consistent Error Handling**: Standardized error handling across all API calls
- **Service Separation**: Clear separation between different backend services
- **Enhanced Logging**: Improved debug logging for API interactions
- **Response Normalization**: Helpers for handling different API response formats
