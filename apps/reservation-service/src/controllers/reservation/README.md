# Reservation Controllers

This directory contains the modular controller structure for reservation-related operations.

## Structure

- `index.ts` - Central export file that re-exports all controller methods
- `create-reservation.controller.ts` - Controller for creating new reservations
- `update-reservation.controller.ts` - Controller for updating existing reservations
- `delete-reservation.controller.ts` - Controller for deleting reservations
- `get-reservation.controller.ts` - Controllers for fetching reservations (all and by ID)
- `customer-reservation.controller.ts` - Controller for customer-specific reservation operations
- `reservation.controller.ts` - **DEPRECATED** - Legacy file that re-exports from index.ts

## Design Patterns

1. **Modular Controllers**: Each file handles a specific set of related operations
2. **Error Handling**: Standardized using `catchAsync` middleware and `AppError` utility
3. **Validation**: Input validation and tenant ownership checks
4. **Logging**: Detailed logging with unique request IDs for traceability
5. **Conflict Detection**: Prevents double-booking and resource conflicts

## Usage

Import controller methods from the index file:

```typescript
import { 
  createReservation, 
  updateReservation, 
  deleteReservation,
  getAllReservations,
  getReservationById,
  getCustomerReservations
} from '../controllers/reservation';
```

## Migration Notes

The original monolithic controller has been refactored into separate files for better maintainability. The legacy file (`reservation.controller.ts`) has been preserved with a deprecation notice to maintain backward compatibility with existing imports.
