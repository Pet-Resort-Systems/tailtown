# Tailtown Service Architecture

This document provides a comprehensive overview of the Tailtown microservice architecture, including service boundaries, communication patterns, and port assignments.

## Service Overview

Tailtown is built on a microservice architecture with the following core services:

| Service             | Description                                 | Port | Repository Path                 |
| ------------------- | ------------------------------------------- | ---- | ------------------------------- |
| Frontend            | React-based UI application                  | 3000 | `/frontend`                     |
| Customer Service    | Manages customer, pet, staff, products data | 4004 | `/services/customer`            |
| Reservation Service | Handles reservations, resources, check-ins  | 4003 | `/services/reservation-service` |

## Service Boundaries

### Frontend

- **Responsibility**: User interface and client-side logic
- **Technologies**: React, Material-UI, TypeScript
- **Key Features**:
  - Calendar views for reservations
  - Customer and pet management interfaces
  - Resource visualization and management
  - Service configuration

### Customer Service

- **Responsibility**: Customer and pet data management
- **Technologies**: Express.js, Prisma, PostgreSQL
- **Key Features**:
  - Customer profile management
  - Pet profile management with medical history
  - Document storage for forms and agreements
  - Customer account balance tracking

### Reservation Service

- **Responsibility**: Reservation and resource management
- **Technologies**: Express.js, Prisma, PostgreSQL
- **Key Features**:
  - Reservation creation and management
  - Resource availability checking
  - Conflict detection for reservations
  - Add-on service management
  - Resource occupancy tracking

## Database Architecture

### Shared Database Approach

- Customer and Reservation services share the same PostgreSQL database (port 5433)
- Prisma schemas must be synchronized between services to avoid runtime errors
- Field names and types must be consistent across services
- Schema validation can be disabled in development mode for stability

## Service Communication

### API Gateway Pattern

- The frontend communicates with backend services directly
- Each service exposes a RESTful API with consistent patterns
- Authentication is handled at the service level

### Cross-Service Communication

- Services communicate via HTTP when needed
- No direct database access between services
- Each service owns its data domain

## Port Configuration

To avoid confusion and port conflicts, we've standardized the port assignments:

### Development Environment

- Frontend: Port 3000
- Customer Service: Port 4004
- Reservation Service: Port 4003
- PostgreSQL Database: Port 5433 (Docker) or 5432 (local)

### Production Environment

- Frontend: Port 3000 (served by Nginx)
- Customer Service: Port 4004 (PM2 cluster, 2 instances)
- Reservation Service: Port 4003 (PM2 cluster, 2 instances)
- PostgreSQL Database: Port 5432

### Database

- PostgreSQL database for persistent storage
- Prisma ORM for database access
- Migrations managed through Prisma
- Comprehensive schema validation system for ensuring database consistency across environments
- Automatic schema validation on service startup with detailed reporting

### Configuration Files

- Frontend: `.env` in `/frontend`
- Customer Service: `.env` in `/services/customer`
- Reservation Service: `.env` in `/services/reservation-service`

## Environment Variables

### Frontend

```
REACT_APP_API_URL=http://localhost:3003  # Points to Customer Service
REACT_APP_RESERVATION_API_URL=http://localhost:4003  # Points to Reservation Service
```

### Customer Service

```
PORT=3003
DATABASE_URL=postgresql://postgres:postgres@localhost:5433/customer
```

### Reservation Service

```
PORT=4003
DATABASE_URL=postgresql://postgres:postgres@localhost:5433/customer
```

## Service Health Checks

Each service provides a health check endpoint at `/health`:

- Customer Service: `http://localhost:3003/health`
- Reservation Service: `http://localhost:4003/health`

## Error Handling

- Standardized error handling system across all services
- Shared `AppError` class with consistent error types and status codes
- Operational vs Programming error distinction
- Detailed error logging with proper context
- Consistent error middleware with environment-specific responses
- Type-safe async error handling with `catchAsync` wrapper
- Integration with schema alignment strategy for graceful error handling
- See [ERROR-HANDLING.md](./ERROR-HANDLING.md) for detailed documentation

## Future Service Expansion

As we continue to implement the SaaS architecture, we plan to add the following services:

1. **Authentication Service** - Centralized authentication and authorization
2. **Notification Service** - Email and SMS notifications
3. **Reporting Service** - Business analytics and reporting
4. **Payment Service** - Payment processing and invoicing

## Deployment Considerations

In production environments:

- Each service should be deployed independently
- Consider using containerization (Docker) for consistency
- Implement proper load balancing for horizontal scaling
- Use environment-specific configuration for ports and URLs
