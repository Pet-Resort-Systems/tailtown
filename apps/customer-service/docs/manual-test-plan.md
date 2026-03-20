# Manual Testing Plan for Services Controller

This document outlines a manual testing plan for the Service Controller API endpoints. Use this to verify functionality when you have the service running.

## Prerequisites

1. Start the customer service: `npm run dev` from the `/services/customer` directory
2. Have a tool like Postman, cURL, or any HTTP client ready for testing

## Test Cases

### 1. Get All Services (GET `/api/services`)

**Request:**
```
GET http://localhost:3002/api/services
```

**Expected Response:**
- Status code: 200
- Response contains an array of services
- Pagination details are included

**Variations to Test:**
- Use query params: `?page=1&limit=5`
- Filter by category: `?category=BOARDING`
- Search for services: `?search=day`
- Filter active services: `?isActive=true`

### 2. Get Service by ID (GET `/api/services/:id`)

**Request:**
```
GET http://localhost:3002/api/services/{valid-service-id}
```

**Expected Response:**
- Status code: 200
- Response contains service details including available add-ons

**Error Case:**
- GET with non-existent ID should return 404

### 3. Create Service (POST `/api/services`)

**Request:**
```
POST http://localhost:3002/api/services
Content-Type: application/json

{
  "name": "Premium Boarding",
  "description": "Luxury boarding experience for your pet",
  "price": 65.00,
  "duration": 1440,
  "serviceCategory": "BOARDING",
  "isActive": true,
  "capacityLimit": 15,
  "requiresStaff": true,
  "availableAddOns": [
    {
      "name": "Extra Playtime",
      "description": "Add an extra 30 minutes of dedicated playtime",
      "price": 15.00,
      "duration": 30
    },
    {
      "name": "Grooming Add-on",
      "description": "Basic grooming service",
      "price": 25.00,
      "duration": 60
    }
  ]
}
```

**Expected Response:**
- Status code: 201
- Response contains created service with ID and add-ons

### 4. Update Service (PUT `/api/services/:id`)

**Request:**
```
PUT http://localhost:3002/api/services/{valid-service-id}
Content-Type: application/json

{
  "name": "Elite Boarding",
  "price": 75.00,
  "availableAddOns": [
    {
      "name": "Extra Playtime",
      "description": "Add an extra 30 minutes of dedicated playtime",
      "price": 20.00,
      "duration": 30
    }
  ]
}
```

**Expected Response:**
- Status code: 200
- Response contains updated service details

**Error Case:**
- PUT with non-existent ID should return 404

### 5. Deactivate Service (PATCH `/api/services/:id/deactivate`)

**Request:**
```
PATCH http://localhost:3002/api/services/{valid-service-id}/deactivate
```

**Expected Response:**
- Status code: 200
- Response contains service with isActive: false

**Error Case:**
- PATCH with non-existent ID should return 404

### 6. Delete Service (DELETE `/api/services/:id`)

**Request:**
```
DELETE http://localhost:3002/api/services/{valid-service-id}
```

**Expected Response:**
- Status code: 204 (No Content)

**Error Cases:**
- DELETE with non-existent ID should return 404
- DELETE with a service that has active reservations should return 400

### 7. Get Service Add-ons (GET `/api/services/:id/add-ons`)

**Request:**
```
GET http://localhost:3002/api/services/{valid-service-id}/add-ons
```

**Expected Response:**
- Status code: 200
- Response contains array of add-on services for this service

### 8. Get Service Reservations (GET `/api/services/:id/reservations`)

**Request:**
```
GET http://localhost:3002/api/services/{valid-service-id}/reservations
```

**Expected Response:**
- Status code: 200
- Response contains array of reservations for this service
- Pagination details are included

**Variations to Test:**
- Filter by status: `?status=CONFIRMED`
- Filter by date range: `?startDate=2025-04-01&endDate=2025-04-30`

## Additional Testing Tips

1. **Error Handling**: Verify that appropriate error responses are generated
2. **Data Validation**: Test boundary cases like invalid prices, missing required fields
3. **Relationships**: Verify that related data (add-ons, reservations) is properly managed
4. **Performance**: Check response times for endpoints with large data sets

## Typical Testing Flow

1. First create a service with add-ons
2. Retrieve it by ID to verify creation
3. Update some fields
4. Test specialized endpoints like get add-ons
5. Deactivate the service
6. Verify you can't delete it if it has reservations
7. Create a service without reservations and delete it
