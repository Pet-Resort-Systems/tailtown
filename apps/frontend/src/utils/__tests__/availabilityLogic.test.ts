/**
 * Availability Logic Tests
 * 
 * Tests for complex availability checking algorithms.
 * These define what "working" means for suite availability.
 */

describe('Availability Checking Algorithm', () => {
  /**
   * BUSINESS LOGIC: Suite Availability
   * 
   * A suite is available if:
   * 1. No overlapping reservations exist
   * 2. Suite is not under maintenance
   * 3. Suite capacity is not exceeded
   */
  describe('Suite Availability Rules', () => {
    it('should identify suite as available when no conflicts exist', () => {
      const requestedCheckIn = new Date('2025-10-24');
      const requestedCheckOut = new Date('2025-10-26');
      
      const existingReservations = [
        { checkIn: new Date('2025-10-20'), checkOut: new Date('2025-10-22') },
        { checkIn: new Date('2025-10-28'), checkOut: new Date('2025-10-30') }
      ];

      const isAvailable = checkSuiteAvailability(
        requestedCheckIn,
        requestedCheckOut,
        existingReservations
      );

      expect(isAvailable).toBe(true);
    });

    it('should identify suite as unavailable when dates overlap', () => {
      const requestedCheckIn = new Date('2025-10-24');
      const requestedCheckOut = new Date('2025-10-26');
      
      const existingReservations = [
        { checkIn: new Date('2025-10-25'), checkOut: new Date('2025-10-27') }
      ];

      const isAvailable = checkSuiteAvailability(
        requestedCheckIn,
        requestedCheckOut,
        existingReservations
      );

      expect(isAvailable).toBe(false);
    });

    it('should handle same-day checkout and checkin (edge case)', () => {
      const requestedCheckIn = new Date('2025-10-24T14:00:00');
      const requestedCheckOut = new Date('2025-10-26T11:00:00');
      
      // Previous guest checks out at 11am, new guest checks in at 2pm
      const existingReservations = [
        { checkIn: new Date('2025-10-22'), checkOut: new Date('2025-10-24T11:00:00') }
      ];

      const isAvailable = checkSuiteAvailability(
        requestedCheckIn,
        requestedCheckOut,
        existingReservations
      );

      // Should be available - checkout before checkin
      expect(isAvailable).toBe(true);
    });

    it('should handle multiple overlapping reservations', () => {
      const requestedCheckIn = new Date('2025-10-24');
      const requestedCheckOut = new Date('2025-10-30');
      
      const existingReservations = [
        { checkIn: new Date('2025-10-23'), checkOut: new Date('2025-10-25') },
        { checkIn: new Date('2025-10-26'), checkOut: new Date('2025-10-28') },
        { checkIn: new Date('2025-10-29'), checkOut: new Date('2025-10-31') }
      ];

      const isAvailable = checkSuiteAvailability(
        requestedCheckIn,
        requestedCheckOut,
        existingReservations
      );

      expect(isAvailable).toBe(false);
    });
  });

  /**
   * BUSINESS LOGIC: Multi-Pet Suite Assignment
   * 
   * When booking multiple pets:
   * 1. Check if pets can share a suite (same owner, compatible)
   * 2. Find available suites with sufficient capacity
   * 3. Optimize for nearest available rooms if separate
   */
  describe('Multi-Pet Suite Assignment', () => {
    it('should assign multiple pets to same suite when capacity allows', () => {
      const pets = [
        { id: 'pet-1', size: 'small' },
        { id: 'pet-2', size: 'small' }
      ];

      const availableSuites = [
        { id: 'suite-1', capacity: 2, location: 'A01' },
        { id: 'suite-2', capacity: 1, location: 'A02' }
      ];

      const assignment = assignPetsToSuites(pets, availableSuites, {
        preferSameSuite: true
      });

      expect(assignment).toEqual({
        'suite-1': ['pet-1', 'pet-2']
      });
    });

    it('should assign pets to separate suites when requested', () => {
      const pets = [
        { id: 'pet-1', size: 'medium' },
        { id: 'pet-2', size: 'medium' }
      ];

      const availableSuites = [
        { id: 'suite-1', capacity: 1, location: 'A01' },
        { id: 'suite-2', capacity: 1, location: 'A02' },
        { id: 'suite-3', capacity: 1, location: 'B01' }
      ];

      const assignment = assignPetsToSuites(pets, availableSuites, {
        preferSameSuite: false,
        preferNearby: true
      });

      // Should assign to A01 and A02 (same room letter)
      expect(Object.keys(assignment)).toHaveLength(2);
      expect(assignment['suite-1']).toContain('pet-1');
      expect(assignment['suite-2']).toContain('pet-2');
    });

    it('should handle insufficient capacity gracefully', () => {
      const pets = [
        { id: 'pet-1', size: 'large' },
        { id: 'pet-2', size: 'large' },
        { id: 'pet-3', size: 'large' }
      ];

      const availableSuites = [
        { id: 'suite-1', capacity: 1, location: 'A01' },
        { id: 'suite-2', capacity: 1, location: 'A02' }
      ];

      const assignment = assignPetsToSuites(pets, availableSuites);

      // Should return error or partial assignment
      expect(assignment).toHaveProperty('error');
      expect(assignment.error).toContain('insufficient capacity');
    });
  });

  /**
   * BUSINESS LOGIC: Pricing Calculations
   * 
   * Price should include:
   * 1. Base service price × number of nights
   * 2. Additional pet discounts
   * 3. Add-on services
   * 4. Taxes
   */
  describe('Pricing Calculations', () => {
    it('should calculate total price for single pet boarding', () => {
      const booking = {
        servicePrice: 45,
        checkIn: new Date('2025-10-24'),
        checkOut: new Date('2025-10-26'),
        numberOfPets: 1,
        addOns: []
      };

      const total = calculateBookingPrice(booking);

      // 2 nights × $45 = $90
      expect(total.subtotal).toBe(90);
      expect(total.nights).toBe(2);
    });

    it('should apply multi-pet discount', () => {
      const booking = {
        servicePrice: 45,
        checkIn: new Date('2025-10-24'),
        checkOut: new Date('2025-10-26'),
        numberOfPets: 2,
        addOns: []
      };

      const total = calculateBookingPrice(booking);

      // First pet: 2 nights × $45 = $90
      // Second pet: 2 nights × $45 × 0.8 (20% discount) = $72
      // Total: $162
      expect(total.subtotal).toBe(162);
      expect(total.discount).toBe(18); // 20% of $90
    });

    it('should include add-on services in total', () => {
      const booking = {
        servicePrice: 45,
        checkIn: new Date('2025-10-24'),
        checkOut: new Date('2025-10-26'),
        numberOfPets: 1,
        addOns: [
          { name: 'Bath', price: 25 },
          { name: 'Nail Trim', price: 15 }
        ]
      };

      const total = calculateBookingPrice(booking);

      // Base: $90 + Add-ons: $40 = $130
      expect(total.subtotal).toBe(130);
      expect(total.addOnsTotal).toBe(40);
    });

    it('should calculate tax correctly', () => {
      const booking = {
        servicePrice: 45,
        checkIn: new Date('2025-10-24'),
        checkOut: new Date('2025-10-26'),
        numberOfPets: 1,
        addOns: [],
        taxRate: 0.08 // 8%
      };

      const total = calculateBookingPrice(booking);

      expect(total.subtotal).toBe(90);
      expect(total.tax).toBe(7.20); // 8% of $90
      expect(total.total).toBe(97.20);
    });

    it('should handle partial day pricing', () => {
      const booking = {
        servicePrice: 45,
        checkIn: new Date('2025-10-24T14:00:00'),
        checkOut: new Date('2025-10-24T18:00:00'),
        numberOfPets: 1,
        addOns: [],
        isDaycare: true
      };

      const total = calculateBookingPrice(booking);

      // Daycare: 4 hours same-day booking
      // Business Rule: Same-day bookings round up to 1 night for billing
      // But daycare should also track hours for scheduling
      expect(total.nights).toBe(1); // Math.ceil of same-day = 1
      expect(total.hours).toBe(4); // Actual hours for daycare scheduling
    });
  });

  /**
   * BUSINESS LOGIC: Date Validation
   * 
   * Valid booking dates must:
   * 1. Check-in is before check-out
   * 2. Check-in is not in the past
   * 3. Booking is within allowed advance window
   * 4. Minimum stay requirements are met
   */
  describe('Date Validation Rules', () => {
    it('should reject check-in after check-out', () => {
      const checkIn = new Date('2025-10-26');
      const checkOut = new Date('2025-10-24');

      const validation = validateBookingDates(checkIn, checkOut);

      expect(validation.isValid).toBe(false);
      expect(validation.error).toContain('Check-in must be before check-out');
    });

    it('should reject past check-in dates', () => {
      const checkIn = new Date('2020-01-01');
      const checkOut = new Date('2020-01-03');

      const validation = validateBookingDates(checkIn, checkOut);

      expect(validation.isValid).toBe(false);
      expect(validation.error).toContain('past');
    });

    it('should enforce minimum stay requirement', () => {
      const checkIn = new Date('2026-10-24');
      const checkOut = new Date('2026-10-24'); // Same day

      const validation = validateBookingDates(checkIn, checkOut, {
        minimumNights: 1
      });

      expect(validation.isValid).toBe(false);
      expect(validation.error).toContain('minimum');
    });

    it('should enforce maximum advance booking window', () => {
      const today = new Date();
      const checkIn = new Date(today);
      checkIn.setDate(checkIn.getDate() + 400); // 400 days in future
      const checkOut = new Date(checkIn);
      checkOut.setDate(checkOut.getDate() + 2);

      const validation = validateBookingDates(checkIn, checkOut, {
        maxAdvanceDays: 365
      });

      expect(validation.isValid).toBe(false);
      expect(validation.error).toContain('advance');
    });

    it('should accept valid date range', () => {
      const today = new Date();
      const checkIn = new Date(today);
      checkIn.setDate(checkIn.getDate() + 7); // 1 week from now
      const checkOut = new Date(checkIn);
      checkOut.setDate(checkOut.getDate() + 3); // 3 nights

      const validation = validateBookingDates(checkIn, checkOut);

      expect(validation.isValid).toBe(true);
      expect(validation.error).toBeUndefined();
    });
  });
});

// Helper functions that would be implemented in actual code
function checkSuiteAvailability(
  checkIn: Date,
  checkOut: Date,
  existingReservations: Array<{ checkIn: Date; checkOut: Date }>
): boolean {
  return !existingReservations.some(reservation => {
    return (
      (checkIn >= reservation.checkIn && checkIn < reservation.checkOut) ||
      (checkOut > reservation.checkIn && checkOut <= reservation.checkOut) ||
      (checkIn <= reservation.checkIn && checkOut >= reservation.checkOut)
    );
  });
}

function assignPetsToSuites(
  pets: Array<{ id: string; size: string }>,
  suites: Array<{ id: string; capacity: number; location: string }>,
  options: { preferSameSuite?: boolean; preferNearby?: boolean } = {}
): any {
  if (options.preferSameSuite) {
    const suitableSuite = suites.find(s => s.capacity >= pets.length);
    if (suitableSuite) {
      return { [suitableSuite.id]: pets.map(p => p.id) };
    }
  }

  if (pets.length > suites.length) {
    return { error: 'insufficient capacity' };
  }

  const assignment: Record<string, string[]> = {};
  pets.forEach((pet, index) => {
    if (suites[index]) {
      assignment[suites[index].id] = [pet.id];
    }
  });

  return assignment;
}

function calculateBookingPrice(booking: any): any {
  const nights = Math.ceil(
    (booking.checkOut.getTime() - booking.checkIn.getTime()) / (1000 * 60 * 60 * 24)
  );

  let subtotal = booking.servicePrice * nights;

  // Multi-pet discount (20% off additional pets)
  if (booking.numberOfPets > 1) {
    const additionalPets = booking.numberOfPets - 1;
    const additionalCost = booking.servicePrice * nights * additionalPets * 0.8;
    const discount = booking.servicePrice * nights * additionalPets * 0.2;
    subtotal += additionalCost;
    
    const addOnsTotal = booking.addOns.reduce((sum: number, addon: any) => sum + addon.price, 0);
    subtotal += addOnsTotal;

    return {
      subtotal,
      nights,
      discount,
      addOnsTotal,
      tax: 0,
      total: subtotal
    };
  }

  const addOnsTotal = booking.addOns.reduce((sum: number, addon: any) => sum + addon.price, 0);
  subtotal += addOnsTotal;

  const tax = booking.taxRate ? subtotal * booking.taxRate : 0;

  return {
    subtotal,
    nights,
    hours: booking.isDaycare ? Math.ceil(
      (booking.checkOut.getTime() - booking.checkIn.getTime()) / (1000 * 60 * 60)
    ) : 0,
    addOnsTotal,
    tax: parseFloat(tax.toFixed(2)),
    total: parseFloat((subtotal + tax).toFixed(2))
  };
}

function validateBookingDates(
  checkIn: Date,
  checkOut: Date,
  options: { minimumNights?: number; maxAdvanceDays?: number } = {}
): { isValid: boolean; error?: string } {
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  if (checkIn >= checkOut) {
    return { isValid: false, error: 'Check-in must be before check-out' };
  }

  if (checkIn < now) {
    return { isValid: false, error: 'Check-in date cannot be in the past' };
  }

  if (options.minimumNights) {
    const nights = Math.ceil(
      (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (nights < options.minimumNights) {
      return { isValid: false, error: `Minimum stay is ${options.minimumNights} night(s)` };
    }
  }

  if (options.maxAdvanceDays) {
    const daysInAdvance = Math.ceil(
      (checkIn.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (daysInAdvance > options.maxAdvanceDays) {
      return { isValid: false, error: `Cannot book more than ${options.maxAdvanceDays} days in advance` };
    }
  }

  return { isValid: true };
}
