#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Helper to get random item from array
const randomItem = (arr) => arr[Math.floor(Math.random() * arr.length)];

// Helper to get random number in range
const randomInt = (min, max) =>
  Math.floor(Math.random() * (max - min + 1)) + min;

// Helper to get random date in next N days
function getRandomFutureDate(maxDays = 14) {
  const now = new Date();
  const daysAhead = randomInt(0, maxDays);
  const futureDate = new Date(now);
  futureDate.setDate(futureDate.getDate() + daysAhead);
  return futureDate;
}

// Order statuses with realistic distribution
const ORDER_STATUSES = [
  { status: 'PAID', weight: 60 }, // 60% paid
  { status: 'PENDING', weight: 25 }, // 25% pending
  { status: 'OVERDUE', weight: 10 }, // 10% overdue
  { status: 'CANCELLED', weight: 5 }, // 5% cancelled
];

function getWeightedStatus() {
  const random = Math.random() * 100;
  let cumulative = 0;
  for (const { status, weight } of ORDER_STATUSES) {
    cumulative += weight;
    if (random <= cumulative) return status;
  }
  return 'PENDING';
}

async function createSampleOrders(tenantSubdomain, orderCount = 15) {
  try {
    console.log(
      `\n📦 Creating ${orderCount} sample orders for ${tenantSubdomain}...\n`
    );

    // Get tenant
    const tenant = await prisma.tenant.findUnique({
      where: { subdomain: tenantSubdomain },
    });

    if (!tenant) {
      console.error(`❌ Tenant '${tenantSubdomain}' not found`);
      process.exit(1);
    }

    // Get customers and products for this tenant
    const customers = await prisma.customer.findMany({
      where: { tenantId: tenant.id },
      include: { pets: true },
    });

    const products = await prisma.product.findMany({
      where: { tenantId: tenant.id, isActive: true },
    });

    if (customers.length === 0) {
      console.error('❌ No customers found. Create customers first.');
      process.exit(1);
    }

    if (products.length === 0) {
      console.error('❌ No products found. Create products first.');
      process.exit(1);
    }

    console.log(
      `Found ${customers.length} customers and ${products.length} products\n`
    );

    const createdOrders = [];

    for (let i = 0; i < orderCount; i++) {
      const customer = randomItem(customers);
      const orderDate = getRandomFutureDate(14);
      const status = getWeightedStatus();

      // Determine due date based on order date
      const dueDate = new Date(orderDate);
      dueDate.setDate(dueDate.getDate() + 7); // Due 7 days after order

      // Random number of line items (1-4 products per order)
      const itemCount = randomInt(1, 4);
      const selectedProducts = [];
      for (let j = 0; j < itemCount; j++) {
        selectedProducts.push(randomItem(products));
      }

      // Calculate totals
      let subtotal = 0;
      const lineItems = selectedProducts.map((product) => {
        const quantity = randomInt(1, 3);
        const price = parseFloat(product.price);
        const lineTotal = price * quantity;
        subtotal += lineTotal;

        return {
          productId: product.id,
          description: product.name,
          quantity,
          unitPrice: price,
          total: lineTotal,
        };
      });

      const taxRate = 0.08; // 8% tax
      const taxAmount = subtotal * taxRate;
      const total = subtotal + taxAmount;

      // Determine payment info based on status
      let paidAmount = 0;
      let paidAt = null;
      if (status === 'PAID') {
        paidAmount = total;
        paidAt = new Date(orderDate);
        paidAt.setHours(paidAt.getHours() + randomInt(1, 48)); // Paid within 48 hours
      } else if (status === 'PENDING' && Math.random() > 0.5) {
        // 50% of pending orders have partial payment
        paidAmount = (total * randomInt(25, 75)) / 100;
      }

      // Create invoice
      const invoice = await prisma.invoice.create({
        data: {
          tenantId: tenant.id,
          customerId: customer.id,
          invoiceNumber: `INV-${Date.now()}-${i}`,
          invoiceDate: orderDate,
          dueDate: dueDate,
          status: status,
          subtotal: subtotal,
          taxAmount: taxAmount,
          total: total,
          paidAmount: paidAmount,
          balance: total - paidAmount,
          notes: status === 'CANCELLED' ? 'Order cancelled by customer' : null,
          lineItems: lineItems,
          paidAt: paidAt,
        },
      });

      const statusEmoji = {
        PAID: '✅',
        PENDING: '⏳',
        OVERDUE: '⚠️',
        CANCELLED: '❌',
      }[status];

      console.log(
        `${statusEmoji} ${invoice.invoiceNumber} - ${customer.name} - $${total.toFixed(2)} - ` +
          `${orderDate.toLocaleDateString()} - ${status}`
      );

      createdOrders.push(invoice);
    }

    // Summary
    const statusCounts = createdOrders.reduce((acc, order) => {
      acc[order.status] = (acc[order.status] || 0) + 1;
      return acc;
    }, {});

    const totalRevenue = createdOrders
      .filter((o) => o.status === 'PAID')
      .reduce((sum, o) => sum + o.total, 0);

    console.log(`\n✅ Created ${createdOrders.length} orders!`);
    console.log(`\n📊 Summary:`);
    Object.entries(statusCounts).forEach(([status, count]) => {
      console.log(`   ${status}: ${count}`);
    });
    console.log(`\n💰 Total Revenue (Paid): $${totalRevenue.toFixed(2)}`);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Parse command line arguments
const args = process.argv.slice(2);

if (args.length < 1 || args.length > 2) {
  console.log(
    'Usage: node create-sample-orders.js <tenant-subdomain> [order-count]'
  );
  console.log('Example: node create-sample-orders.js rainy 15');
  console.log('Default: 15 orders');
  process.exit(1);
}

const tenantSubdomain = args[0];
const orderCount = args[1] ? parseInt(args[1]) : 15;

if (orderCount < 1 || orderCount > 100) {
  console.error('❌ Order count must be between 1 and 100');
  process.exit(1);
}

createSampleOrders(tenantSubdomain, orderCount);
