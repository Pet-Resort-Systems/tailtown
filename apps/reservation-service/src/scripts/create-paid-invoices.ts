// @ts-nocheck
/**
 * Create Paid Invoices Script
 *
 * Creates invoices and cash payments for half of the October reservations
 *
 * NOTE: This script references Customer/Pet models that have been removed from
 * the reservation service schema. Run this script against the customer service
 * database if needed, or update to use customerServiceClient.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function createPaidInvoices() {
  console.log('Starting invoice and payment creation...');

  const tenantId = 'dev';

  try {
    // Get all October reservations
    const reservations = await prisma.reservation.findMany({
      where: {
        tenantId,
        startDate: {
          gte: new Date(2025, 9, 26), // Oct 26
        },
      },
      include: {
        service: true,
        customer: true,
        pet: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    console.log(`Found ${reservations.length} reservations`);

    // Take half of them
    const reservationsToPay = reservations.slice(
      0,
      Math.floor(reservations.length / 2)
    );
    console.log(
      `Creating invoices for ${reservationsToPay.length} reservations`
    );

    let invoicesCreated = 0;
    let paymentsCreated = 0;

    for (const reservation of reservationsToPay) {
      // Calculate number of nights
      const nights = Math.ceil(
        (reservation.endDate.getTime() - reservation.startDate.getTime()) /
          (1000 * 60 * 60 * 24)
      );

      // Calculate total (service price per night)
      const servicePrice = reservation.service?.price || 50; // Default $50/night
      const subtotal = servicePrice * nights;
      const taxRate = 0.08; // 8% tax
      const taxAmount = subtotal * taxRate;
      const total = subtotal + taxAmount;

      // Generate invoice number
      const invoiceNumber = `INV-${Date.now()}-${invoicesCreated
        .toString()
        .padStart(3, '0')}`;

      try {
        // Create invoice
        const invoice = await prisma.invoice.create({
          data: {
            tenantId,
            invoiceNumber,
            customerId: reservation.customerId,
            reservationId: reservation.id,
            issueDate: new Date(),
            dueDate: reservation.startDate, // Due on check-in
            subtotal,
            taxAmount,
            total,
            status: 'PAID',
            notes: `${nights} night(s) boarding for ${reservation.pet?.name}`,
          },
        });

        // Create cash payment
        await prisma.payment.create({
          data: {
            tenantId,
            invoiceId: invoice.id,
            customerId: reservation.customerId,
            amount: total,
            paymentMethod: 'CASH',
            paymentDate: new Date(),
            status: 'COMPLETED' as any,
            notes: `Cash payment for ${invoiceNumber}`,
            transactionId: `CASH-${Date.now()}-${paymentsCreated}`,
          } as any,
        });

        invoicesCreated++;
        paymentsCreated++;

        if (invoicesCreated % 5 === 0) {
          console.log(
            `  Created ${invoicesCreated}/${reservationsToPay.length} invoices...`
          );
        }
      } catch (error: any) {
        console.error(
          `  Error creating invoice for reservation ${reservation.id}:`,
          error.message
        );
      }
    }

    console.log(
      `\n✅ Successfully created ${invoicesCreated} invoices and ${paymentsCreated} payments!`
    );

    // Show summary
    const totalRevenue = await prisma.invoice.aggregate({
      where: {
        tenantId,
        status: 'PAID',
      },
      _sum: {
        total: true,
      },
    });

    console.log(
      `\nTotal revenue: $${totalRevenue._sum?.total?.toFixed(2) || '0.00'}`
    );

    // Show invoice status breakdown
    const invoiceStats = await prisma.invoice.groupBy({
      by: ['status'],
      where: { tenantId },
      _count: true,
      _sum: {
        total: true,
      },
    });

    console.log('\nInvoice summary:');
    invoiceStats.forEach((stat) => {
      console.log(
        `  ${stat.status}: ${stat._count} invoices ($${
          stat._sum.total?.toFixed(2) || '0.00'
        })`
      );
    });

    // Show payment count
    const paymentCount = await prisma.payment.count({
      where: { tenantId },
    });

    console.log(`\nTotal payments: ${paymentCount} (all CASH)`);

    // Show sample invoices
    console.log('\nSample invoices:');
    const samples = await prisma.invoice.findMany({
      where: { tenantId },
      include: {
        customer: true,
        reservation: {
          include: {
            pet: true,
          },
        },
      },
      take: 5,
      orderBy: { createdAt: 'desc' },
    });

    samples.forEach((inv) => {
      console.log(
        `  ${inv.invoiceNumber} - ${inv.customer?.firstName} ${inv.customer?.lastName}`
      );
      console.log(
        `    Pet: ${inv.reservation?.pet?.name} | Total: $${inv.total.toFixed(
          2
        )} | Status: ${inv.status}`
      );
    });
  } catch (error) {
    console.error('Error creating invoices:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
createPaidInvoices()
  .then(() => console.log('\n🎉 Invoice creation complete!'))
  .catch((e) => {
    console.error('Error during invoice creation:', e);
    process.exit(1);
  });
