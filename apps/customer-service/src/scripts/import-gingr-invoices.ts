/**
 * Import Historical Invoice Data from Gingr
 *
 * This script imports invoices from Gingr to populate historical revenue data.
 * Run with: npx ts-node src/scripts/import-gingr-invoices.ts
 */

import { prisma } from '../config/prisma.js';
import GingrApiClient from '../services/gingr-api.service.js';
import dotenv from 'dotenv';

dotenv.config();

interface ImportStats {
  total: number;
  imported: number;
  skipped: number;
  errors: number;
}

async function importInvoices(
  tenantId: string,
  fromDate: Date,
  toDate: Date,
  dryRun: boolean = false
): Promise<ImportStats> {
  const stats: ImportStats = {
    total: 0,
    imported: 0,
    skipped: 0,
    errors: 0,
  };

  console.log(`\n🔍 Importing invoices for tenant: ${tenantId}`);
  console.log(
    `📅 Date range: ${fromDate.toISOString().split('T')[0]} to ${
      toDate.toISOString().split('T')[0]
    }`
  );
  console.log(
    `${
      dryRun
        ? '🧪 DRY RUN MODE - No data will be saved'
        : '💾 LIVE MODE - Data will be saved'
    }\n`
  );

  // Initialize Gingr API
  const gingrSubdomain = process.env.GINGR_SUBDOMAIN;
  const gingrApiKey = process.env.GINGR_API_KEY;

  if (!gingrSubdomain || !gingrApiKey) {
    throw new Error(
      'Missing GINGR_SUBDOMAIN or GINGR_API_KEY in environment variables'
    );
  }

  const gingrApi = new GingrApiClient({
    subdomain: gingrSubdomain,
    apiKey: gingrApiKey,
  });

  try {
    // Fetch invoices from Gingr
    console.log('📥 Fetching invoices from Gingr...');
    const gingrInvoices = await gingrApi.fetchAllInvoices(fromDate, toDate);
    stats.total = gingrInvoices.length;
    console.log(`✅ Found ${stats.total} invoices\n`);

    // Debug: Show first invoice structure
    if (gingrInvoices.length > 0) {
      console.log('🔍 Sample invoice data:');
      console.log(JSON.stringify(gingrInvoices[0], null, 2));
      console.log('');
    }

    // Process each invoice
    for (const gingrInvoice of gingrInvoices) {
      try {
        // Check if invoice already exists (by external ID)
        const existing = await prisma.invoice.findFirst({
          where: {
            tenantId,
            externalId: gingrInvoice.id,
          },
        });

        if (existing) {
          console.log(
            `⏭️  Skipping invoice ${gingrInvoice.id} - already exists`
          );
          stats.skipped++;
          continue;
        }

        // Find customer by Gingr owner ID
        const customer = await prisma.customer.findFirst({
          where: {
            tenantId,
            externalId: gingrInvoice.owner_id,
          },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            tenantId: true,
          },
        });

        if (!customer) {
          console.log(
            `⚠️  Warning: Customer not found for owner_id ${gingrInvoice.owner_id}, skipping invoice ${gingrInvoice.id}`
          );
          stats.skipped++;
          continue;
        }

        // Convert Gingr invoice to Tailtown format
        const invoiceDate = new Date(
          parseInt(gingrInvoice.create_stamp) * 1000
        ); // Unix timestamp to Date

        // Validate invoice date
        if (isNaN(invoiceDate.getTime())) {
          console.log(
            `⚠️  Warning: Invalid invoice date for invoice ${gingrInvoice.id}, skipping`
          );
          stats.skipped++;
          continue;
        }

        // Default due date to 30 days after invoice date
        const dueDate = new Date(
          invoiceDate.getTime() + 30 * 24 * 60 * 60 * 1000
        );

        // Parse amounts (they come as strings)
        const subtotal = parseFloat(gingrInvoice.subtotal);
        const taxAmount = parseFloat(gingrInvoice.tax_amount);
        const total = parseFloat(gingrInvoice.total);

        // All imported invoices are considered PAID (they're completed transactions)
        const status: 'PAID' = 'PAID';

        const invoiceData = {
          tenantId,
          invoiceNumber: `GINGR-${gingrInvoice.id}`,
          customerId: customer.id,
          issueDate: invoiceDate,
          dueDate: dueDate,
          status: status,
          subtotal: subtotal,
          taxRate: subtotal > 0 ? taxAmount / subtotal : 0,
          taxAmount: taxAmount,
          discount: 0,
          total: total,
          externalId: gingrInvoice.id,
          notes: 'Imported from Gingr',
        };

        if (dryRun) {
          console.log(`✅ Would import invoice ${invoiceData.invoiceNumber}:`);
          console.log(
            `   Customer: ${customer.firstName} ${customer.lastName}`
          );
          console.log(`   Date: ${invoiceDate.toISOString().split('T')[0]}`);
          console.log(`   Total: $${total.toFixed(2)}`);
          console.log(`   Status: ${status}`);
          stats.imported++;
        } else {
          // Create invoice with a generic line item
          const invoice = await prisma.invoice.create({
            data: {
              ...invoiceData,
              lineItems: {
                create: [
                  {
                    tenantId,
                    type: 'SERVICE',
                    description: 'Services (imported from Gingr)',
                    quantity: 1,
                    unitPrice: subtotal,
                    amount: subtotal,
                    taxable: taxAmount > 0,
                  },
                ],
              },
            },
          });

          // If invoice is paid, create a payment record
          if (status === 'PAID') {
            await prisma.payment.create({
              data: {
                tenantId,
                invoiceId: invoice.id,
                customerId: customer.id,
                amount: total,
                method: 'CASH', // Default to CASH for imported payments
                paymentDate: invoiceDate,
                status: 'PAID',
                notes: 'Payment imported from Gingr',
              },
            });
          }

          console.log(
            `✅ Imported invoice ${
              invoiceData.invoiceNumber
            } - $${total.toFixed(2)}`
          );
          stats.imported++;
        }
      } catch (error) {
        console.error(`❌ Error processing invoice ${gingrInvoice.id}:`, error);
        stats.errors++;
      }
    }

    // Print summary
    console.log('\n📊 Import Summary:');
    console.log(`   Total invoices: ${stats.total}`);
    console.log(`   ✅ Imported: ${stats.imported}`);
    console.log(`   ⏭️  Skipped: ${stats.skipped}`);
    console.log(`   ❌ Errors: ${stats.errors}`);

    if (!dryRun && stats.imported > 0) {
      // Calculate total revenue imported
      const totalRevenue = await prisma.invoice.aggregate({
        where: {
          tenantId,
          externalId: { not: null },
        },
        _sum: {
          total: true,
        },
      });

      console.log(
        `\n💰 Total historical revenue imported: $${(
          totalRevenue._sum.total || 0
        ).toFixed(2)}`
      );
    }
  } catch (error) {
    console.error('❌ Fatal error during import:', error);
    throw error;
  }

  return stats;
}

async function main() {
  const args = process.argv.slice(2);

  // Parse arguments
  // Default to tailtown production tenant ID
  const TAILTOWN_TENANT_ID = 'b696b4e8-6e86-4d4b-a0c2-1da0e4b1ae05';
  const tenantId =
    args.find((arg) => arg.startsWith('--tenant='))?.split('=')[1] ||
    TAILTOWN_TENANT_ID;
  const fromDateStr = args
    .find((arg) => arg.startsWith('--from='))
    ?.split('=')[1];
  const toDateStr = args.find((arg) => arg.startsWith('--to='))?.split('=')[1];
  const dryRun = args.includes('--dry-run');

  // Default to last 12 months if no dates provided
  const toDate = toDateStr ? new Date(toDateStr) : new Date();
  const fromDate = fromDateStr
    ? new Date(fromDateStr)
    : new Date(toDate.getTime() - 365 * 24 * 60 * 60 * 1000);

  console.log('🚀 Gingr Invoice Import Script');
  console.log('================================\n');

  try {
    await importInvoices(tenantId, fromDate, toDate, dryRun);
    console.log('\n✅ Import completed successfully!');
  } catch (error) {
    console.error('\n❌ Import failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

export { importInvoices };
