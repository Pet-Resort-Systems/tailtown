# Resource Availability API Documentation

## Overview

This API provides endpoints for checking resource (kennel) availability for specific dates or date ranges. It replaces the frontend `isKennelOccupied` logic that previously handled this functionality.

## Authentication

All endpoints require tenant authentication. The tenant ID must be provided in the `x-tenant-id` header.

## Endpoints

### Check Resource Availability

Checks if a specific resource is available on a given date or date range.

**URL:** `GET /api/v1/resources/availability`

**Query Parameters:**
- `resourceId` (required): The ID of the resource to check
- `date` (optional): A specific date to check availability for (format: YYYY-MM-DD)
- `startDate` and `endDate` (optional): A date range to check availability for (format: YYYY-MM-DD)

Either `date` or both `startDate` and `endDate` must be provided.

**Response Example:**
```json
{
  "status": "success",
  "data": {
    "resourceId": "123",
    "checkDate": "2023-06-01",
    "checkStartDate": "2023-06-01T00:00:00.000Z",
    "checkEndDate": "2023-06-01T23:59:59.999Z",
    "isAvailable": false,
    "occupyingReservations": [
      {
        "id": "abc123",
        "startDate": "2023-06-01T12:00:00.000Z",
        "endDate": "2023-06-02T12:00:00.000Z",
        "customer": {
          "firstName": "John",
          "lastName": "Doe",
          "email": "john@example.com",
          "phone": "555-123-4567"
        },
        "pet": {
          "name": "Buddy",
          "breed": "Golden Retriever"
        },
        "service": {
          "name": "Boarding"
        }
      }
    ]
  }
}
```

### Batch Check Resource Availability

Checks availability for multiple resources at once.

**URL:** `POST /api/v1/resources/availability/batch`

**Request Body:**
```json
{
  "resources": ["123", "456", "789"],
  "date": "2023-06-01"
  // OR
  // "startDate": "2023-06-01",
  // "endDate": "2023-06-03"
}
```

**Response Example:**
```json
{
  "status": "success",
  "data": {
    "checkDate": "2023-06-01",
    "checkStartDate": "2023-06-01T00:00:00.000Z",
    "checkEndDate": "2023-06-01T23:59:59.999Z",
    "resources": [
      {
        "resourceId": "123",
        "isAvailable": false,
        "occupyingReservations": [
          {
            "id": "abc123",
            "startDate": "2023-06-01T12:00:00.000Z",
            "endDate": "2023-06-02T12:00:00.000Z",
            "customer": {
              "firstName": "John",
              "lastName": "Doe"
            },
            "pet": {
              "name": "Buddy"
            }
          }
        ]
      },
      {
        "resourceId": "456",
        "isAvailable": true,
        "occupyingReservations": []
      },
      {
        "resourceId": "789",
        "isAvailable": false,
        "occupyingReservations": [
          {
            "id": "def456",
            "startDate": "2023-06-01T14:00:00.000Z",
            "endDate": "2023-06-03T14:00:00.000Z",
            "customer": {
              "firstName": "Jane",
              "lastName": "Smith"
            },
            "pet": {
              "name": "Max"
            }
          }
        ]
      }
    ]
  }
}
```

## Error Responses

All endpoints return standard error responses in this format:

```json
{
  "success": false,
  "error": {
    "type": "ERROR_TYPE",
    "message": "Error description"
  }
}
```

Common error types:
- `VALIDATION_ERROR`: Invalid input parameters (400 status code)
- `UNAUTHORIZED_ERROR`: Missing or invalid tenant ID (401 status code)
- `FORBIDDEN_ERROR`: Valid tenant ID but unauthorized access (403 status code)
- `NOT_FOUND_ERROR`: Resource not found (404 status code)
- `SERVER_ERROR`: Internal server error (500 status code)
