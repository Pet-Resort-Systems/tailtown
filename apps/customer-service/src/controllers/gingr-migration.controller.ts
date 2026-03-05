/**
 * Gingr Migration Controller
 * Handles data migration from Gingr to Tailtown
 */

import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
// Use native fetch (Node 18+) instead of node-fetch
import GingrApiClient from '../services/gingr-api.service';
import {
  transformOwnerToCustomer,
  transformAnimalToPet,
  transformReservationToReservation,
  generateOrderNumber
} from '../services/gingr-transform.service';
import {
  findOrCreateResource,
  extractGingrLodging
} from '../services/gingr-resource-mapper.service';

const prisma = new PrismaClient();

interface MigrationProgress {
  phase: string;
  total: number;
  completed: number;
  failed: number;
  errors: Array<{
    type: string;
    id: string;
    error: string;
  }>;
  startTime: Date;
  endTime?: Date;
}

/**
 * Start Gingr data migration
 * POST /api/gingr-migration/start
 */
export const startMigration = async (req: Request, res: Response, next: NextFunction) => {
  const { subdomain, apiKey, startDate, endDate } = req.body;

  if (!subdomain || !apiKey) {
    return res.status(400).json({
      success: false,
      error: 'Subdomain and API key are required'
    });
  }

  const progress: MigrationProgress = {
    phase: 'Initializing',
    total: 0,
    completed: 0,
    failed: 0,
    errors: [],
    startTime: new Date()
  };

  try {
    // Initialize Gingr API client
    const gingr = new GingrApiClient({ subdomain, apiKey });
    console.log('[Migration] Starting Gingr migration...');

    // Phase 1: Fetch only what we need (skip customers/pets if already imported)
    progress.phase = 'Fetching data from Gingr';
    console.log('[Migration] Phase 1: Fetching reservations and services only...');
    console.log('[Migration] Skipping customers/pets fetch (already in database)');

    const reservations = await gingr.fetchAllReservations(
      new Date(startDate),
      new Date(endDate)
    );
    console.log(`[Migration] Fetched ${reservations.length} reservations`);

    const reservationTypes = await gingr.fetchReservationTypes();
    console.log(`[Migration] Fetched ${reservationTypes.length} reservation types`);

    progress.total = reservations.length + reservationTypes.length;

    // Phase 2: Import reservation types (services)
    progress.phase = 'Importing services';
    console.log('[Migration] Phase 2: Importing services...');

    const serviceMap = new Map<string, string>(); // Gingr type ID -> Tailtown service ID

    for (const type of reservationTypes) {
      try {
        // Check if service already exists by name or externalId
        let service = await prisma.service.findFirst({
          where: {
            OR: [
              { tenantId: 'dev', name: type.name },
              { tenantId: 'dev', externalId: type.id }
            ]
          } as any
        });

        if (!service) {
          service = await prisma.service.create({
            data: {
              name: type.name,
              description: type.description || '',
              price: type.price || 0,
              duration: 60, // Default duration
              serviceCategory: 'BOARDING', // Default category
              isActive: true,
              externalId: type.id,
              tenantId: 'dev'
            } as any
          });
        }

        serviceMap.set(type.id, service.id);
        progress.completed++;
      } catch (error: any) {
        progress.failed++;
        progress.errors.push({
          type: 'service',
          id: type.id,
          error: error.message
        });
      }
    }

    // Phase 3: Build customer map from existing database records
    progress.phase = 'Mapping existing customers';
    console.log('[Migration] Phase 3: Building customer map from database...');

    const customerMap = new Map<string, string>(); // Gingr owner ID -> Tailtown customer ID
    
    // Get all existing customers with their externalId
    const existingCustomers = await prisma.customer.findMany({
      where: { tenantId: 'dev', externalId: { not: null } },
      select: { id: true, externalId: true }
    });
    
    for (const customer of existingCustomers) {
      if (customer.externalId) {
        customerMap.set(customer.externalId, customer.id);
      }
    }
    console.log(`[Migration] Mapped ${customerMap.size} existing customers`);
    
    // Skip customer import loop since we're using existing data
    const owners: any[] = []; // Empty array to avoid errors
    for (const owner of owners) {
      try {
        // Check if customer already exists by externalId or email
        const whereConditions: any[] = [
          { tenantId: 'dev', externalId: owner.id }
        ];
        
        // Only check email if it exists
        if (owner.email) {
          whereConditions.push({ tenantId: 'dev', email: owner.email });
        }
        
        let customer = await prisma.customer.findFirst({
          where: {
            OR: whereConditions
          } as any
        });

        if (!customer) {
          const customerData = transformOwnerToCustomer(owner);
          customer = await prisma.customer.create({
            data: customerData as any
          });
        }

        customerMap.set(owner.id, customer.id);
        progress.completed++;
      } catch (error: any) {
        progress.failed++;
        progress.errors.push({
          type: 'customer',
          id: owner.id,
          error: error.message
        });
      }
    }

    // Phase 4: Build pet map from existing database records
    progress.phase = 'Mapping existing pets';
    console.log('[Migration] Phase 4: Building pet map from database...');

    const petMap = new Map<string, string>(); // Gingr animal ID -> Tailtown pet ID
    
    // Get all existing pets with their externalId
    const existingPets = await prisma.pet.findMany({
      where: { externalId: { not: null } },
      select: { id: true, externalId: true }
    });
    
    for (const pet of existingPets) {
      if (pet.externalId) {
        petMap.set(pet.externalId, pet.id);
      }
    }
    console.log(`[Migration] Mapped ${petMap.size} existing pets`);
    
    // Skip pet import loop since we're using existing data
    const animals: any[] = []; // Empty array to avoid errors
    for (const animal of animals) {
      try {
        const customerId = customerMap.get(animal.owner_id);

        if (!customerId) {
          throw new Error(`Customer not found for owner_id: ${animal.owner_id}`);
        }

        // Check if pet already exists by externalId
        let pet = await prisma.pet.findFirst({
          where: {
            tenantId: 'dev',
            externalId: animal.id
          } as any
        });

        if (!pet) {
          const petData = transformAnimalToPet(animal, customerId);
          pet = await prisma.pet.create({
            data: petData as any
          });
        }

        petMap.set(animal.id, pet.id);
        progress.completed++;
      } catch (error: any) {
        progress.failed++;
        progress.errors.push({
          type: 'pet',
          id: animal.id,
          error: error.message
        });
      }
    }

    // Phase 5: Import reservations (to reservation service)
    progress.phase = 'Importing reservations';
    console.log('[Migration] Phase 5: Importing reservations to reservation service...');

    const RESERVATION_SERVICE_URL = process.env.RESERVATION_SERVICE_URL || 'http://localhost:4003';
    
    // Fetch a default resource to assign (calendar requires resourceId)
    let defaultResourceId: string | null = null;
    try {
      const resourceResponse = await fetch(
        `${RESERVATION_SERVICE_URL}/api/resources?type=STANDARD_SUITE&limit=1`,
        { headers: { 'x-tenant-id': 'dev' } }
      );
      const resourceData = await resourceResponse.json() as any;
      const resources = resourceData.data?.resources || [];
      if (resources.length > 0) {
        defaultResourceId = resources[0].id;
        console.log(`[Migration] Using default resource: ${resources[0].name} (${defaultResourceId})`);
      }
    } catch (error) {
      console.warn('[Migration] Could not fetch default resource, reservations will not have resourceId');
    }

    for (const reservation of reservations) {
      try {
        const customerId = customerMap.get(reservation.owner.id);
        const petId = petMap.get(reservation.animal.id);
        const serviceId = serviceMap.get(reservation.reservation_type.id);

        if (!customerId) {
          throw new Error(`Customer not found for owner_id: ${reservation.owner.id}`);
        }

        if (!petId) {
          throw new Error(`Pet not found for animal_id: ${reservation.animal.id}`);
        }

        if (!serviceId) {
          throw new Error(`Service not found for type_id: ${reservation.reservation_type.id}`);
        }

        // Check if reservation already exists in reservation service
        const checkResponse = await fetch(
          `${RESERVATION_SERVICE_URL}/api/reservations?externalId=${reservation.reservation_id}`,
          {
            headers: { 'x-tenant-id': 'dev' }
          }
        );
        
        const existingReservations = await checkResponse.json() as any;
        
        if (!existingReservations || existingReservations.length === 0) {
          const reservationData = transformReservationToReservation(
            reservation,
            customerId,
            petId,
            serviceId
          );

          // Extract lodging from Gingr and map to Tailtown resource
          let resourceId = defaultResourceId;
          const gingrLodging = extractGingrLodging(reservation);
          
          if (gingrLodging) {
            try {
              const resource = await findOrCreateResource(gingrLodging, RESERVATION_SERVICE_URL);
              resourceId = resource.id;
              console.log(`[Migration] Mapped Gingr lodging "${gingrLodging}" → Tailtown resource "${resource.name}" (${resource.id})`);
            } catch (error: any) {
              console.warn(`[Migration] Could not map lodging "${gingrLodging}": ${error.message}, using default`);
            }
          } else {
            console.log(`[Migration] No lodging found for reservation ${reservation.reservation_id}, using default`);
          }

          // Create reservation via API
          const createResponse = await fetch(
            `${RESERVATION_SERVICE_URL}/api/reservations`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'x-tenant-id': 'dev'
              },
              body: JSON.stringify({
                ...reservationData,
                orderNumber: generateOrderNumber(),
                resourceId: resourceId
              })
            }
          );

          if (!createResponse.ok) {
            const errorText = await createResponse.text();
            throw new Error(`Failed to create reservation: ${errorText}`);
          }
        }

        progress.completed++;
      } catch (error: any) {
        progress.failed++;
        progress.errors.push({
          type: 'reservation',
          id: reservation.reservation_id,
          error: error.message
        });
      }
    }

    // Complete
    progress.phase = 'Complete';
    progress.endTime = new Date();

    const stats = gingr.getStats();
    console.log(`[Migration] Complete! API requests made: ${stats.totalRequests}`);

    res.json({
      success: true,
      progress,
      stats: {
        apiRequests: stats.totalRequests,
        duration: progress.endTime.getTime() - progress.startTime.getTime()
      }
    });

  } catch (error: any) {
    console.error('[Migration] Error:', error);
    progress.phase = 'Failed';
    progress.endTime = new Date();

    res.status(500).json({
      success: false,
      error: error.message,
      progress
    });
  }
};

/**
 * Test Gingr API connection
 * POST /api/gingr-migration/test
 */
export const testConnection = async (req: Request, res: Response, next: NextFunction) => {
  const { subdomain, apiKey } = req.body;

  if (!subdomain || !apiKey) {
    return res.status(400).json({
      success: false,
      error: 'Subdomain and API key are required'
    });
  }

  try {
    const gingr = new GingrApiClient({ subdomain, apiKey });

    // Try to fetch locations as a simple test
    const locations = await gingr.fetchLocations();

    res.json({
      success: true,
      message: 'Connection successful',
      locations
    });

  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

export default {
  startMigration,
  testConnection
};
