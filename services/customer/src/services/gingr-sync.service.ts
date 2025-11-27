/**
 * Gingr Sync Service
 *
 * Automated synchronization service for tenants with Gingr integration.
 * Runs on a schedule (every 8 hours) to sync customers, pets, reservations, and invoices.
 */

import { PrismaClient } from "@prisma/client";
import { GingrApiClient } from "./gingr-api.service";
import {
  extractGingrLodging,
  getServiceNameForResourceType,
} from "./gingr-resource-mapper.service";

const prisma = new PrismaClient();

interface SyncResult {
  tenantId: string;
  success: boolean;
  customersSync: number;
  petsSync: number;
  reservationsSync: number;
  invoicesSync: number;
  errors: string[];
  syncedAt: Date;
}

export class GingrSyncService {
  /**
   * Sync all tenants that have Gingr sync enabled
   */
  async syncAllEnabledTenants(): Promise<SyncResult[]> {
    console.log("🔄 Starting Gingr sync for all enabled tenants...");

    // Get all tenants with Gingr sync enabled
    const tenants = await prisma.tenant.findMany({
      where: {
        gingrSyncEnabled: true,
        isActive: true,
        status: "ACTIVE",
      },
    });

    console.log(`   Found ${tenants.length} tenants with Gingr sync enabled`);

    const results: SyncResult[] = [];

    for (const tenant of tenants) {
      try {
        console.log(
          `\n📊 Syncing tenant: ${tenant.businessName} (${tenant.subdomain})`
        );
        const result = await this.syncTenant(tenant.subdomain);
        results.push(result);

        // Update last sync timestamp
        await prisma.tenant.update({
          where: { id: tenant.id },
          data: { lastGingrSyncAt: new Date() },
        });
      } catch (error: any) {
        console.error(
          `   ❌ Error syncing tenant ${tenant.subdomain}:`,
          error.message
        );
        results.push({
          tenantId: tenant.subdomain,
          success: false,
          customersSync: 0,
          petsSync: 0,
          reservationsSync: 0,
          invoicesSync: 0,
          errors: [error.message],
          syncedAt: new Date(),
        });
      }
    }

    console.log("\n✅ Gingr sync complete for all tenants");
    return results;
  }

  /**
   * Sync a single tenant
   */
  async syncTenant(tenantId: string): Promise<SyncResult> {
    const result: SyncResult = {
      tenantId,
      success: false,
      customersSync: 0,
      petsSync: 0,
      reservationsSync: 0,
      invoicesSync: 0,
      errors: [],
      syncedAt: new Date(),
    };

    try {
      // Initialize Gingr API client
      // TODO: Get Gingr credentials from tenant settings or environment
      const gingrClient = new GingrApiClient({
        subdomain: "tailtownpetresort", // TODO: Make this tenant-specific
        apiKey: process.env.GINGR_API_KEY || "c84c09ecfacdf23a495505d2ae1df533",
      });

      // Sync customers
      console.log("   1️⃣  Syncing customers...");
      try {
        result.customersSync = await this.syncCustomers(tenantId, gingrClient);
        console.log(`      ✓ Synced ${result.customersSync} customers`);
      } catch (error: any) {
        console.error(`      ❌ Customer sync failed: ${error.message}`);
        result.errors.push(`Customers: ${error.message}`);
      }

      // Sync pets
      console.log("   2️⃣  Syncing pets...");
      try {
        result.petsSync = await this.syncPets(tenantId, gingrClient);
        console.log(`      ✓ Synced ${result.petsSync} pets`);
      } catch (error: any) {
        console.error(`      ❌ Pet sync failed: ${error.message}`);
        result.errors.push(`Pets: ${error.message}`);
      }

      // Sync reservations (last 30 days to next 90 days)
      console.log("   3️⃣  Syncing reservations...");
      try {
        result.reservationsSync = await this.syncReservations(
          tenantId,
          gingrClient
        );
        console.log(`      ✓ Synced ${result.reservationsSync} reservations`);
      } catch (error: any) {
        console.error(`      ❌ Reservation sync failed: ${error.message}`);
        result.errors.push(`Reservations: ${error.message}`);
      }

      // Sync invoices (last 90 days)
      console.log("   4️⃣  Syncing invoices...");
      try {
        result.invoicesSync = await this.syncInvoices(tenantId, gingrClient);
        console.log(`      ✓ Synced ${result.invoicesSync} invoices`);
      } catch (error: any) {
        console.error(`      ❌ Invoice sync failed: ${error.message}`);
        result.errors.push(`Invoices: ${error.message}`);
      }

      result.success = true;
    } catch (error: any) {
      result.errors.push(error.message);
      console.error("   ❌ Sync failed:", error.message);
    }

    return result;
  }

  /**
   * Sync customers from Gingr
   */
  private async syncCustomers(
    tenantId: string,
    gingrClient: GingrApiClient
  ): Promise<number> {
    const owners = await gingrClient.fetchAllOwners();
    let syncCount = 0;
    const BATCH_SIZE = 100;

    console.log(`      Found ${owners.length} customers to sync`);

    for (let i = 0; i < owners.length; i++) {
      const owner = owners[i];

      if (i > 0 && i % BATCH_SIZE === 0) {
        console.log(
          `      Progress: ${i}/${owners.length} customers (${syncCount} synced)`
        );
      }
      try {
        // Check if customer already exists
        const existing = await prisma.customer.findFirst({
          where: {
            tenantId,
            externalId: owner.id,
          },
        });

        const customerData = {
          firstName: owner.first_name,
          lastName: owner.last_name,
          email: owner.email || `gingr-${owner.id}@placeholder.com`,
          phone: owner.cell_phone || owner.home_phone,
          address: owner.address_1,
          city: owner.city,
          state: owner.state,
          zipCode: owner.zip,
          emergencyContact: owner.emergency_contact_name,
          emergencyPhone: owner.emergency_contact_phone,
          notes: owner.notes,
          externalId: owner.id,
        };

        if (existing) {
          // Update existing customer
          await prisma.customer.update({
            where: { id: existing.id },
            data: customerData,
          });
        } else {
          // Create new customer
          await prisma.customer.create({
            data: {
              ...customerData,
              tenantId,
            },
          });
        }
        syncCount++;
      } catch (error: any) {
        // Only log non-duplicate errors
        if (!error.message.includes("Unique constraint")) {
          console.error(
            `      Warning: Failed to sync customer ${owner.id}:`,
            error.message
          );
        }
      }
    }

    return syncCount;
  }

  /**
   * Sync pets from Gingr
   */
  private async syncPets(
    tenantId: string,
    gingrClient: GingrApiClient
  ): Promise<number> {
    const animals = await gingrClient.fetchAllAnimals();
    let syncCount = 0;
    const BATCH_SIZE = 100; // Process 100 pets at a time

    console.log(`      Found ${animals.length} pets to sync`);

    for (let i = 0; i < animals.length; i++) {
      const animal = animals[i];

      // Log progress every 100 pets
      if (i > 0 && i % BATCH_SIZE === 0) {
        console.log(
          `      Progress: ${i}/${animals.length} pets (${syncCount} synced)`
        );
      }
      try {
        // Find customer by externalId
        const customer = await prisma.customer.findFirst({
          where: {
            tenantId,
            externalId: animal.owner_id,
          },
        });

        if (!customer) {
          console.error(
            `      Warning: Customer not found for pet ${animal.id}`
          );
          continue;
        }

        // Check if pet already exists
        const existing = await prisma.pet.findFirst({
          where: {
            tenantId,
            externalId: animal.id,
          },
        });

        const petData: any = {
          name: animal.first_name,
          type: animal.species_id === "1" ? "DOG" : "CAT", // Assuming 1=Dog, 2=Cat
          breed: animal.breed_id,
          color: animal.color,
          gender:
            animal.gender === "M"
              ? "MALE"
              : animal.gender === "F"
              ? "FEMALE"
              : undefined,
          birthdate: animal.birthday
            ? new Date(animal.birthday * 1000)
            : undefined,
          weight: animal.weight ? parseFloat(animal.weight) : undefined,
          microchipNumber: animal.microchip,
          notes: animal.notes,
          medicationNotes: animal.medicines,
          allergies: animal.allergies,
          foodNotes: animal.feeding_notes,
          behaviorNotes: animal.grooming_notes,
          specialNeeds: animal.temperment,
          isNeutered: animal.fixed === "1",
          externalId: animal.id,
        };

        if (existing) {
          await prisma.pet.update({
            where: { id: existing.id },
            data: petData,
          });
        } else {
          await prisma.pet.create({
            data: {
              ...petData,
              tenantId,
              customerId: customer.id,
            },
          });
        }
        syncCount++;
      } catch (error: any) {
        if (!error.message.includes("Unique constraint")) {
          console.error(
            `      Warning: Failed to sync pet ${animal.id}:`,
            error.message
          );
        }
      }
    }

    return syncCount;
  }

  /**
   * Sync reservations from Gingr
   */
  private async syncReservations(
    tenantId: string,
    gingrClient: GingrApiClient
  ): Promise<number> {
    console.log(`      Starting reservation sync for tenant ${tenantId}...`);

    // Get reservations for last 30 days to next 90 days
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 90);

    console.log(
      `      Fetching reservations from ${startDate.toISOString()} to ${endDate.toISOString()}`
    );

    const reservations = await gingrClient.fetchAllReservations(
      startDate,
      endDate
    );
    console.log(`      Gingr API returned ${reservations.length} reservations`);
    let syncCount = 0;
    const BATCH_SIZE = 50;

    console.log(`      Found ${reservations.length} reservations to sync`);

    // Debug: Show first reservation structure
    if (reservations.length > 0) {
      console.log(
        `      Sample reservation structure:`,
        JSON.stringify(reservations[0], null, 2).substring(0, 500)
      );
    }

    for (let i = 0; i < reservations.length; i++) {
      const reservation = reservations[i];

      if (i > 0 && i % BATCH_SIZE === 0) {
        console.log(
          `      Progress: ${i}/${reservations.length} reservations (${syncCount} synced)`
        );
      }
      try {
        // Find customer and pet by externalId
        const customer = await prisma.customer.findFirst({
          where: { tenantId, externalId: reservation.owner.id },
        });

        const pet = await prisma.pet.findFirst({
          where: { tenantId, externalId: reservation.animal.id },
        });

        if (!customer || !pet) {
          if (i < 5) {
            // Log first 5 failures
            console.error(
              `      Warning: Customer or pet not found for reservation ${reservation.reservation_id}`
            );
            console.error(
              `        Looking for owner.id: ${reservation.owner?.id}, pet.id: ${reservation.animal?.id}`
            );
          }
          continue;
        }

        // Check if reservation already exists
        const existing = await prisma.reservation.findFirst({
          where: {
            tenantId,
            externalId: reservation.reservation_id,
          },
        });

        // Parse Gingr dates correctly - they come with timezone info already
        // Gingr sends dates like "2025-11-17T13:00:00-07:00" which already includes the timezone
        // Just parse as-is, no offset needed
        const parseGingrDate = (dateStr: string): Date => {
          return new Date(dateStr);
        };

        // Determine service based on resource type (new approach - Nov 2025)
        // First, try to extract lodging info and determine resource type
        const gingrLodging = extractGingrLodging(reservation);
        let serviceName: string;
        let serviceCategory: "BOARDING" | "DAYCARE" = "BOARDING";

        if (gingrLodging) {
          // Determine resource type from lodging name
          const lodgingUpper = gingrLodging.toUpperCase();
          let resourceType = "JUNIOR_KENNEL"; // default

          if (lodgingUpper.includes("VIP") || lodgingUpper.startsWith("V")) {
            resourceType = "VIP_ROOM";
          } else if (
            lodgingUpper.includes("CAT") ||
            lodgingUpper.includes("CONDO")
          ) {
            resourceType = "CAT_CONDO";
          } else if (
            lodgingUpper.endsWith("K") ||
            lodgingUpper.includes("KING")
          ) {
            resourceType = "KING_KENNEL";
          } else if (
            lodgingUpper.endsWith("Q") ||
            lodgingUpper.includes("QUEEN")
          ) {
            resourceType = "QUEEN_KENNEL";
          } else if (
            lodgingUpper.endsWith("R") ||
            lodgingUpper.includes("JUNIOR")
          ) {
            resourceType = "JUNIOR_KENNEL";
          }

          // Get service name from resource type
          serviceName = getServiceNameForResourceType(resourceType);
          console.log(
            `      Mapped lodging "${gingrLodging}" → ${resourceType} → "${serviceName}"`
          );
        } else {
          // Fallback: Use Gingr reservation type
          const gingrType =
            (reservation.reservation_type as any)?.type || "Boarding";

          if (
            gingrType.includes("Day Camp") &&
            !gingrType.includes("Lodging")
          ) {
            serviceName = gingrType.includes("Half")
              ? "Day Camp | Half Day"
              : "Day Camp | Full Day";
            serviceCategory = "DAYCARE";
          } else {
            serviceName = "Boarding | Indoor Suite"; // Default boarding service
          }
          console.log(
            `      No lodging found, using Gingr type "${gingrType}" → "${serviceName}"`
          );
        }

        // Find or create the service
        let service = await prisma.service.findFirst({
          where: {
            tenantId,
            name: serviceName,
          },
        });

        // If service doesn't exist, create it
        if (!service) {
          console.log(`      Creating service: ${serviceName}`);
          service = await prisma.service.create({
            data: {
              tenantId,
              name: serviceName,
              serviceCategory,
              duration: 1440, // Default 1 day in minutes
              price: 0,
              isActive: true,
            },
          });
        }

        const reservationData: any = {
          customerId: customer.id,
          petId: pet.id,
          serviceId: service.id,
          startDate: parseGingrDate(reservation.start_date),
          endDate: parseGingrDate(reservation.end_date),
          status: reservation.cancelled_date
            ? "CANCELLED"
            : reservation.check_out_date
            ? "COMPLETED"
            : reservation.check_in_date
            ? "CHECKED_IN"
            : reservation.confirmed_date
            ? "CONFIRMED"
            : "PENDING",
          notes: reservation.notes?.reservation_notes,
          externalId: reservation.reservation_id,
        };

        if (existing) {
          await prisma.reservation.update({
            where: { id: existing.id },
            data: reservationData,
          });
        } else {
          await prisma.reservation.create({
            data: {
              ...reservationData,
              tenantId,
            },
          });
        }
        syncCount++;
      } catch (error: any) {
        if (!error.message.includes("Unique constraint")) {
          console.error(
            `      Warning: Failed to sync reservation ${reservation.reservation_id}:`,
            error.message
          );
        }
      }
    }

    return syncCount;
  }

  /**
   * Sync invoices from Gingr
   */
  private async syncInvoices(
    tenantId: string,
    gingrClient: GingrApiClient
  ): Promise<number> {
    // Get invoices for last 90 days
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 90);
    const endDate = new Date();

    const invoices = await gingrClient.fetchAllInvoices(startDate, endDate);
    let syncCount = 0;
    const BATCH_SIZE = 100;

    console.log(`      Found ${invoices.length} invoices to sync`);

    for (let i = 0; i < invoices.length; i++) {
      const invoice = invoices[i];

      if (i > 0 && i % BATCH_SIZE === 0) {
        console.log(
          `      Progress: ${i}/${invoices.length} invoices (${syncCount} synced)`
        );
      }
      try {
        // Find customer by externalId
        const customer = await prisma.customer.findFirst({
          where: {
            tenantId,
            externalId: invoice.owner_id,
          },
        });

        if (!customer) {
          console.error(
            `      Warning: Customer not found for invoice ${invoice.id}`
          );
          continue;
        }

        // Check if invoice already exists
        // @ts-ignore - Prisma types will be regenerated
        const existing = await prisma.invoice.findFirst({
          where: {
            tenantId,
            externalId: invoice.id,
          },
        });

        const invoiceData: any = {
          customerId: customer.id,
          invoiceNumber: `GINGR-${invoice.id}`,
          invoiceDate: new Date(parseInt(invoice.create_stamp) * 1000),
          dueDate: new Date(
            parseInt(invoice.create_stamp) * 1000 + 30 * 24 * 60 * 60 * 1000
          ),
          subtotal: parseFloat(invoice.subtotal),
          tax: parseFloat(invoice.tax_amount),
          total: parseFloat(invoice.total),
          status: "PAID", // All imported invoices are completed transactions
          externalId: invoice.id,
        };

        if (existing) {
          await prisma.invoice.update({
            where: { id: existing.id },
            data: invoiceData,
          });
        } else {
          await prisma.invoice.create({
            data: {
              ...invoiceData,
              tenantId,
            },
          });
        }
        syncCount++;
      } catch (error: any) {
        if (
          !error.message.includes("Unique constraint") &&
          !error.message.includes("toUpperCase")
        ) {
          console.error(
            `      Warning: Failed to sync invoice ${invoice.id}:`,
            error.message
          );
        }
      }
    }

    return syncCount;
  }
}

// Export singleton instance
export const gingrSyncService = new GingrSyncService();
