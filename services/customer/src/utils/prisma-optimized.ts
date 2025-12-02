/**
 * Prisma Query Optimization Utilities
 *
 * Provides optimized select statements and common query patterns
 * to reduce data transfer and improve performance.
 *
 * Usage:
 * - Use select objects instead of include: true for related data
 * - Use minimal selects for list views, full selects for detail views
 */

// ============================================================================
// Customer Selects
// ============================================================================

/** Minimal customer fields for list views and references */
export const customerSelectMinimal = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
  phone: true,
} as const;

/** Customer fields for detail views */
export const customerSelectFull = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
  phone: true,
  address: true,
  city: true,
  state: true,
  zipCode: true,
  notes: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} as const;

// ============================================================================
// Pet Selects
// ============================================================================

/** Minimal pet fields for list views */
export const petSelectMinimal = {
  id: true,
  name: true,
  type: true,
  breed: true,
} as const;

/** Pet fields for reservation context */
export const petSelectForReservation = {
  id: true,
  name: true,
  type: true,
  breed: true,
  weight: true,
  specialNeeds: true,
  foodNotes: true,
  medicationNotes: true,
} as const;

/** Full pet fields */
export const petSelectFull = {
  id: true,
  name: true,
  type: true,
  breed: true,
  weight: true,
  birthdate: true,
  gender: true,
  color: true,
  specialNeeds: true,
  foodNotes: true,
  medicationNotes: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} as const;

// ============================================================================
// Resource Selects
// ============================================================================

/** Minimal resource fields */
export const resourceSelectMinimal = {
  id: true,
  name: true,
  type: true,
} as const;

/** Resource fields for reservation context */
export const resourceSelectForReservation = {
  id: true,
  name: true,
  type: true,
  capacity: true,
  description: true,
} as const;

// ============================================================================
// Service Selects
// ============================================================================

/** Minimal service fields */
export const serviceSelectMinimal = {
  id: true,
  name: true,
  price: true,
  serviceCategory: true,
} as const;

/** Service fields for reservation context */
export const serviceSelectForReservation = {
  id: true,
  name: true,
  price: true,
  serviceCategory: true,
  duration: true,
  description: true,
} as const;

// ============================================================================
// Staff Selects
// ============================================================================

/** Minimal staff fields */
export const staffSelectMinimal = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
} as const;

/** Staff fields for schedule context */
export const staffSelectForSchedule = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
  phone: true,
  role: true,
} as const;

// ============================================================================
// Reservation Selects
// ============================================================================

/** Minimal reservation fields for calendar/list views */
export const reservationSelectMinimal = {
  id: true,
  orderNumber: true,
  startDate: true,
  endDate: true,
  status: true,
} as const;

/** Reservation with minimal related data for list views */
export const reservationSelectForList = {
  id: true,
  orderNumber: true,
  startDate: true,
  endDate: true,
  status: true,
  notes: true,
  customer: { select: customerSelectMinimal },
  pet: { select: petSelectMinimal },
  resource: { select: resourceSelectMinimal },
  service: { select: serviceSelectMinimal },
} as const;

/** Full reservation for detail views */
export const reservationSelectFull = {
  id: true,
  orderNumber: true,
  startDate: true,
  endDate: true,
  checkInDate: true,
  checkOutDate: true,
  status: true,
  notes: true,
  staffNotes: true,
  customerId: true,
  petId: true,
  serviceId: true,
  resourceId: true,
  createdAt: true,
  updatedAt: true,
  customer: { select: customerSelectFull },
  pet: { select: petSelectForReservation },
  resource: { select: resourceSelectForReservation },
  service: { select: serviceSelectForReservation },
} as const;

// ============================================================================
// Invoice Selects
// ============================================================================

/** Minimal invoice fields */
export const invoiceSelectMinimal = {
  id: true,
  invoiceNumber: true,
  totalAmount: true,
  status: true,
  issueDate: true,
  dueDate: true,
} as const;

/** Invoice with customer for list views */
export const invoiceSelectForList = {
  id: true,
  invoiceNumber: true,
  totalAmount: true,
  paidAmount: true,
  status: true,
  issueDate: true,
  dueDate: true,
  customer: { select: customerSelectMinimal },
} as const;
