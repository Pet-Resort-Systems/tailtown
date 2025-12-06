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

      // Link orphaned invoices to reservations
      console.log("   5️⃣  Linking invoices to reservations...");
      try {
        const linkedCount = await this.linkInvoicesToReservations(tenantId);
        console.log(`      ✓ Linked ${linkedCount} invoices to reservations`);
      } catch (error: any) {
        console.error(`      ❌ Invoice linking failed: ${error.message}`);
        result.errors.push(`Invoice linking: ${error.message}`);
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
    let skippedNoOwner = 0;
    let skippedCustomerNotFound = 0;
    let skippedErrors = 0;
    const BATCH_SIZE = 100; // Process 100 pets at a time

    console.log(`      Found ${animals.length} pets to sync`);

    for (let i = 0; i < animals.length; i++) {
      const animal = animals[i];

      // Log progress every 100 pets
      if (i > 0 && i % BATCH_SIZE === 0) {
        console.log(
          `      Progress: ${i}/${animals.length} pets (${syncCount} synced, ${skippedNoOwner} no owner, ${skippedCustomerNotFound} customer not found)`
        );
      }
      try {
        // Check if pet has an owner_id
        if (!animal.owner_id) {
          skippedNoOwner++;
          continue;
        }

        // Find customer by externalId
        const customer = await prisma.customer.findFirst({
          where: {
            tenantId,
            externalId: animal.owner_id,
          },
        });

        if (!customer) {
          skippedCustomerNotFound++;
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

        // Parse Gingr dates correctly - preserve local date without timezone conversion
        // Gingr sends dates like "2025-11-28T19:00:00-07:00" which when parsed as UTC
        // becomes "2025-11-29T02:00:00Z" - we need to preserve the local date (2025-11-28)
        const parseGingrDate = (dateStr: string): Date => {
          if (!dateStr) return new Date();
          // Extract the local date and time parts, ignoring timezone
          // Format: "2025-11-28T19:00:00-07:00" -> use "2025-11-28T19:00:00"
          const localPart = dateStr.replace(/[+-]\d{2}:\d{2}$/, "");
          return new Date(localPart);
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

        let savedReservation;
        if (existing) {
          savedReservation = await prisma.reservation.update({
            where: { id: existing.id },
            data: reservationData,
          });
        } else {
          savedReservation = await prisma.reservation.create({
            data: {
              ...reservationData,
              tenantId,
            },
          });
        }

        // Create/update invoice if reservation has price data
        const reservationPrice = (reservation as any).transaction?.price;
        if (reservationPrice && reservationPrice > 0 && savedReservation) {
          await this.createOrUpdateReservationInvoice(
            tenantId,
            savedReservation.id,
            customer.id,
            reservationPrice,
            parseGingrDate(reservation.start_date),
            reservation.reservation_id,
            reservationData.status === "COMPLETED" ||
              reservationData.status === "CHECKED_OUT"
          );
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

        const subtotal = parseFloat(invoice.subtotal) || 0;
        const taxAmount = parseFloat(invoice.tax_amount) || 0;
        const total = parseFloat(invoice.total) || 0;
        // Calculate tax rate from subtotal and tax amount
        const taxRate = subtotal > 0 ? (taxAmount / subtotal) * 100 : 0;

        const invoiceData: any = {
          customerId: customer.id,
          invoiceNumber: `GINGR-${invoice.id}`,
          issueDate: new Date(parseInt(invoice.create_stamp) * 1000),
          dueDate: new Date(
            parseInt(invoice.create_stamp) * 1000 + 30 * 24 * 60 * 60 * 1000
          ),
          subtotal,
          taxRate,
          taxAmount,
          discount: 0,
          total,
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

  /**
   * Create or update an invoice linked to a reservation
   * This is called when syncing reservations that have price data from Gingr
   */
  private async createOrUpdateReservationInvoice(
    tenantId: string,
    reservationId: string,
    customerId: string,
    price: number,
    invoiceDate: Date,
    gingrReservationId: string,
    isPaid: boolean
  ): Promise<void> {
    try {
      // Check if invoice already exists for this reservation
      const existingInvoice = await prisma.invoice.findFirst({
        where: {
          tenantId,
          reservationId,
        },
      });

      // Calculate tax (use default 7.44% rate)
      const taxRate = 0.0744;
      const subtotal = price;
      const taxAmount = subtotal * taxRate;
      const total = subtotal + taxAmount;

      const invoiceData: any = {
        customerId,
        reservationId,
        invoiceNumber: `GINGR-RES-${gingrReservationId}`,
        issueDate: invoiceDate,
        dueDate: new Date(invoiceDate.getTime() + 30 * 24 * 60 * 60 * 1000), // 30 days
        subtotal,
        taxRate,
        taxAmount,
        total,
        status: isPaid ? "PAID" : "PENDING",
        notes: "Invoice synced from Gingr reservation",
      };

      if (existingInvoice) {
        await prisma.invoice.update({
          where: { id: existingInvoice.id },
          data: invoiceData,
        });
      } else {
        // Create new invoice with line item
        const invoice = await prisma.invoice.create({
          data: {
            ...invoiceData,
            tenantId,
            lineItems: {
              create: {
                tenantId,
                type: "SERVICE",
                description: "Reservation services (from Gingr)",
                quantity: 1,
                unitPrice: subtotal,
                amount: subtotal,
                taxable: true,
              },
            },
          },
        });

        // If paid, create a payment record
        if (isPaid) {
          await prisma.payment.create({
            data: {
              tenantId,
              invoiceId: invoice.id,
              customerId,
              amount: total,
              method: "CASH", // Default since we don't know payment method from Gingr
              paymentDate: invoiceDate,
              status: "PAID",
              notes: "Payment synced from Gingr",
            },
          });
        }
      }
    } catch (error: any) {
      // Don't fail the reservation sync if invoice creation fails
      if (!error.message.includes("Unique constraint")) {
        console.error(
          `      Warning: Failed to create invoice for reservation ${reservationId}:`,
          error.message
        );
      }
    }
  }

  /**
   * Link existing invoices to reservations by matching customer and date
   * This is called after syncing invoices to try to link orphaned invoices
   */
  async linkInvoicesToReservations(tenantId: string): Promise<number> {
    let linkedCount = 0;

    // Find invoices without a reservation link
    const orphanedInvoices = await prisma.invoice.findMany({
      where: {
        tenantId,
        reservationId: null,
        externalId: { not: null }, // Only Gingr-imported invoices
      },
      include: {
        customer: true,
      },
    });

    console.log(`      Found ${orphanedInvoices.length} invoices to link`);

    for (const invoice of orphanedInvoices) {
      try {
        // Find a reservation for this customer within a reasonable date range
        // Invoice date should be close to reservation end date (checkout)
        const invoiceDate = invoice.issueDate;
        const startRange = new Date(invoiceDate);
        startRange.setDate(startRange.getDate() - 7); // 7 days before
        const endRange = new Date(invoiceDate);
        endRange.setDate(endRange.getDate() + 1); // 1 day after

        const matchingReservation = await prisma.reservation.findFirst({
          where: {
            tenantId,
            customerId: invoice.customerId,
            endDate: {
              gte: startRange,
              lte: endRange,
            },
            invoice: null, // Not already linked to an invoice
            status: { in: ["COMPLETED", "CHECKED_OUT"] },
          },
          orderBy: {
            endDate: "desc",
          },
        });

        if (matchingReservation) {
          await prisma.invoice.update({
            where: { id: invoice.id },
            data: { reservationId: matchingReservation.id },
          });
          linkedCount++;
          console.log(
            `      Linked invoice ${invoice.invoiceNumber} to reservation ${matchingReservation.id}`
          );
        }
      } catch (error: any) {
        if (!error.message.includes("Unique constraint")) {
          console.error(
            `      Warning: Failed to link invoice ${invoice.id}:`,
            error.message
          );
        }
      }
    }

    return linkedCount;
  }

  /**
   * Historical sync - sync reservations and invoices for a custom date range
   * Use this for backfilling historical data
   */
  async syncHistorical(
    tenantId: string,
    fromDate: Date,
    toDate: Date
  ): Promise<{ reservations: number; invoices: number; linked: number }> {
    console.log(`📅 Starting historical sync for ${tenantId}`);
    console.log(
      `   Date range: ${fromDate.toISOString().split("T")[0]} to ${
        toDate.toISOString().split("T")[0]
      }`
    );

    const gingrClient = new GingrApiClient({
      subdomain: "tailtownpetresort",
      apiKey: process.env.GINGR_API_KEY || "c84c09ecfacdf23a495505d2ae1df533",
    });

    let reservationCount = 0;
    let invoiceCount = 0;

    // Sync reservations in 30-day chunks (API limitation)
    console.log("   1️⃣  Syncing historical reservations...");
    let currentStart = new Date(fromDate);
    while (currentStart < toDate) {
      const chunkEnd = new Date(currentStart);
      chunkEnd.setDate(chunkEnd.getDate() + 29);
      const actualEnd = chunkEnd > toDate ? toDate : chunkEnd;

      console.log(
        `      Chunk: ${currentStart.toISOString().split("T")[0]} to ${
          actualEnd.toISOString().split("T")[0]
        }`
      );

      try {
        const reservations = await gingrClient.fetchAllReservations(
          currentStart,
          actualEnd
        );
        console.log(`      Found ${reservations.length} reservations`);

        for (const reservation of reservations) {
          try {
            await this.syncSingleReservation(
              tenantId,
              reservation,
              gingrClient
            );
            reservationCount++;
          } catch (error: any) {
            if (!error.message.includes("Unique constraint")) {
              console.error(
                `      Error syncing reservation: ${error.message}`
              );
            }
          }
        }
      } catch (error: any) {
        console.error(`      Error fetching chunk: ${error.message}`);
      }

      currentStart = new Date(actualEnd);
      currentStart.setDate(currentStart.getDate() + 1);
    }
    console.log(`      ✓ Synced ${reservationCount} reservations`);

    // Sync invoices for the date range
    console.log("   2️⃣  Syncing historical invoices...");
    try {
      const invoices = await gingrClient.fetchAllInvoices(fromDate, toDate);
      console.log(`      Found ${invoices.length} invoices`);

      for (const invoice of invoices) {
        try {
          const customer = await prisma.customer.findFirst({
            where: { tenantId, externalId: invoice.owner_id },
          });

          if (!customer) continue;

          const existing = await prisma.invoice.findFirst({
            where: { tenantId, externalId: invoice.id },
          });

          const invoiceData: any = {
            customerId: customer.id,
            invoiceNumber: `GINGR-${invoice.id}`,
            issueDate: new Date(parseInt(invoice.create_stamp) * 1000),
            dueDate: new Date(
              parseInt(invoice.create_stamp) * 1000 + 30 * 24 * 60 * 60 * 1000
            ),
            subtotal: parseFloat(invoice.subtotal),
            taxRate:
              parseFloat(invoice.subtotal) > 0
                ? parseFloat(invoice.tax_amount) / parseFloat(invoice.subtotal)
                : 0,
            taxAmount: parseFloat(invoice.tax_amount),
            total: parseFloat(invoice.total),
            status: "PAID",
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
                lineItems: {
                  create: {
                    tenantId,
                    type: "SERVICE",
                    description: "Services (imported from Gingr)",
                    quantity: 1,
                    unitPrice: parseFloat(invoice.subtotal),
                    amount: parseFloat(invoice.subtotal),
                    taxable: true,
                  },
                },
              },
            });
          }
          invoiceCount++;
        } catch (error: any) {
          if (!error.message.includes("Unique constraint")) {
            console.error(`      Error syncing invoice: ${error.message}`);
          }
        }
      }
    } catch (error: any) {
      console.error(`      Error fetching invoices: ${error.message}`);
    }
    console.log(`      ✓ Synced ${invoiceCount} invoices`);

    // Link invoices to reservations
    console.log("   3️⃣  Linking invoices to reservations...");
    const linkedCount = await this.linkInvoicesToReservations(tenantId);
    console.log(`      ✓ Linked ${linkedCount} invoices`);

    console.log(
      `\n✅ Historical sync complete: ${reservationCount} reservations, ${invoiceCount} invoices, ${linkedCount} linked`
    );

    return {
      reservations: reservationCount,
      invoices: invoiceCount,
      linked: linkedCount,
    };
  }

  /**
   * Sync a single reservation (helper for historical sync)
   */
  private async syncSingleReservation(
    tenantId: string,
    reservation: any,
    gingrClient: GingrApiClient
  ): Promise<void> {
    const customer = await prisma.customer.findFirst({
      where: { tenantId, externalId: reservation.owner?.id },
    });

    const pet = await prisma.pet.findFirst({
      where: { tenantId, externalId: reservation.animal?.id },
    });

    if (!customer || !pet) return;

    const existing = await prisma.reservation.findFirst({
      where: { tenantId, externalId: reservation.reservation_id },
    });

    const parseGingrDate = (dateStr: string): Date => {
      if (!dateStr) return new Date();
      const localPart = dateStr.replace(/[+-]\d{2}:\d{2}$/, "");
      return new Date(localPart);
    };

    // Determine service
    const gingrLodging = extractGingrLodging(reservation);
    let serviceName = "Boarding | Indoor Suite";
    let serviceCategory: "BOARDING" | "DAYCARE" = "BOARDING";

    if (gingrLodging) {
      const lodgingUpper = gingrLodging.toUpperCase();
      let resourceType = "JUNIOR_KENNEL";
      if (lodgingUpper.includes("VIP") || lodgingUpper.startsWith("V"))
        resourceType = "VIP_ROOM";
      else if (lodgingUpper.includes("CAT") || lodgingUpper.includes("CONDO"))
        resourceType = "CAT_CONDO";
      else if (lodgingUpper.endsWith("K") || lodgingUpper.includes("KING"))
        resourceType = "KING_KENNEL";
      else if (lodgingUpper.endsWith("Q") || lodgingUpper.includes("QUEEN"))
        resourceType = "QUEEN_KENNEL";
      serviceName = getServiceNameForResourceType(resourceType);
    } else {
      const gingrType = reservation.reservation_type?.type || "Boarding";
      if (gingrType.includes("Day Camp") && !gingrType.includes("Lodging")) {
        serviceName = gingrType.includes("Half")
          ? "Day Camp | Half Day"
          : "Day Camp | Full Day";
        serviceCategory = "DAYCARE";
      }
    }

    let service = await prisma.service.findFirst({
      where: { tenantId, name: serviceName },
    });
    if (!service) {
      service = await prisma.service.create({
        data: {
          tenantId,
          name: serviceName,
          serviceCategory,
          duration: 1440,
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

    let savedReservation;
    if (existing) {
      savedReservation = await prisma.reservation.update({
        where: { id: existing.id },
        data: reservationData,
      });
    } else {
      savedReservation = await prisma.reservation.create({
        data: { ...reservationData, tenantId },
      });
    }

    // Create invoice if price data exists
    const reservationPrice = reservation.transaction?.price;
    if (reservationPrice && reservationPrice > 0 && savedReservation) {
      await this.createOrUpdateReservationInvoice(
        tenantId,
        savedReservation.id,
        customer.id,
        reservationPrice,
        parseGingrDate(reservation.start_date),
        reservation.reservation_id,
        reservationData.status === "COMPLETED" ||
          reservationData.status === "CHECKED_OUT"
      );
    }
  }
}

// Export singleton instance
export const gingrSyncService = new GingrSyncService();
