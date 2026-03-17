import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { AppError } from '../middleware/error.middleware';

const prisma = new PrismaClient();

// Get all payments for a specific customer
export const getCustomerPayments = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { customerId } = req.params;

    if (!customerId) {
      return next(new AppError('Customer ID is required', 400));
    }

    const payments = await prisma.payment.findMany({
      where: { customerId },
      include: {
        invoice: {
          select: {
            id: true,
            invoiceNumber: true,
            status: true,
            total: true,
          },
        },
      },
      orderBy: {
        paymentDate: 'desc',
      },
    });

    res.status(200).json({
      status: 'success',
      results: payments.length,
      data: payments,
    });
  } catch (error) {
    console.error('Error fetching customer payments:', error);
    return next(new AppError('Error fetching customer payments', 500));
  }
};

// Get a specific payment by ID
export const getPaymentById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    if (!id) {
      return next(new AppError('Payment ID is required', 400));
    }

    const payment = await prisma.payment.findUnique({
      where: { id },
      include: {
        invoice: true,
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    if (!payment) {
      return next(new AppError('Payment not found', 404));
    }

    res.status(200).json({
      status: 'success',
      data: payment,
    });
  } catch (error) {
    console.error('Error fetching payment:', error);
    return next(new AppError('Error fetching payment', 500));
  }
};

// Create a new payment
export const createPayment = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { invoiceId, customerId, amount, method, transactionId, notes } =
      req.body;

    if (!invoiceId || !customerId || !amount || !method) {
      return next(
        new AppError(
          'Invoice ID, Customer ID, Amount, and Payment Method are required',
          400
        )
      );
    }

    // Validate invoice exists
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { payments: true },
    });

    if (!invoice) {
      return next(new AppError('Invoice not found', 404));
    }

    // Calculate how much has been paid already
    const paidAmount = invoice.payments.reduce((sum, payment) => {
      if (payment.status === 'PAID') {
        return sum + payment.amount;
      }
      return sum;
    }, 0);

    // Check if payment amount exceeds remaining balance
    // Round to the nearest penny to avoid floating point issues
    const remainingBalance =
      Math.round((invoice.total - paidAmount) * 100) / 100;
    const paymentAmount = Math.round(parseFloat(amount as any) * 100) / 100;

    if (paymentAmount > remainingBalance) {
      return next(
        new AppError(
          `Payment amount exceeds remaining balance of ${remainingBalance}`,
          400
        )
      );
    }

    // Create the payment
    const payment = await prisma.payment.create({
      data: {
        invoiceId,
        customerId,
        amount: paymentAmount, // Already rounded above
        method,
        status: 'PAID', // Assuming payment is successful immediately
        transactionId,
        notes,
      },
    });

    // Update invoice with new payment totals
    const newTotalPaid = paidAmount + paymentAmount;
    const newBalanceDue = Math.max(
      0,
      Math.round((invoice.total - newTotalPaid) * 100) / 100
    );
    const isFullyPaid = newBalanceDue === 0;

    await prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        status: isFullyPaid
          ? 'PAID'
          : newTotalPaid > 0
            ? 'SENT'
            : invoice.status,
        depositPaid: Math.round(newTotalPaid * 100) / 100,
        balanceDue: newBalanceDue,
      },
    });

    res.status(201).json({
      status: 'success',
      data: payment,
    });
  } catch (error) {
    console.error('Error creating payment:', error);
    return next(new AppError('Error creating payment', 500));
  }
};

// Record store credit
export const recordStoreCredit = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { customerId, amount, reason } = req.body;

    if (!customerId || !amount) {
      return next(new AppError('Customer ID and Amount are required', 400));
    }

    // Create a fake invoice for store credit (this tracks the credit balance)
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const invoiceNumber = `CREDIT-${dateStr}-${randomSuffix}`;

    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber,
        customerId,
        dueDate: date,
        subtotal: 0,
        total: 0,
        status: 'PAID',
        notes: `Store credit: ${reason || 'No reason provided'}`,
        lineItems: {
          create: [
            {
              description: 'Store Credit',
              quantity: 1,
              unitPrice: 0,
              amount: 0,
              taxable: false,
            },
          ],
        },
      },
    });

    // Record the store credit as a payment
    const payment = await prisma.payment.create({
      data: {
        invoiceId: invoice.id,
        customerId,
        amount: Math.round(parseFloat(amount as any) * 100) / 100, // Round to the nearest penny
        method: 'STORE_CREDIT',
        status: 'PAID',
        notes: reason || 'Store credit',
      },
    });

    res.status(201).json({
      status: 'success',
      data: payment,
    });
  } catch (error) {
    console.error('Error recording store credit:', error);
    return next(new AppError('Error recording store credit', 500));
  }
};

// Apply store credit to an invoice
export const applyStoreCredit = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { invoiceId, customerId, amount } = req.body;

    if (!invoiceId || !customerId || !amount) {
      return next(
        new AppError('Invoice ID, Customer ID, and Amount are required', 400)
      );
    }

    // Check if customer has enough store credit
    const storeCredit = await prisma.payment.aggregate({
      where: {
        customerId,
        method: 'STORE_CREDIT',
        status: 'PAID',
      },
      _sum: {
        amount: true,
      },
    });

    const storeCreditsUsed = await prisma.payment.aggregate({
      where: {
        customerId,
        method: 'STORE_CREDIT',
        status: 'PAID',
        OR: [
          {
            amount: { lt: 0 },
          },
          {
            notes: { contains: 'Applied to invoice' },
          },
        ],
      },
      _sum: {
        amount: true,
      },
    });

    const availableCredit =
      (storeCredit._sum.amount || 0) -
      Math.abs(storeCreditsUsed._sum.amount || 0);
    const creditAmount = parseFloat(amount as any);

    if (creditAmount > availableCredit) {
      return next(
        new AppError(
          `Insufficient store credit. Available: ${availableCredit}`,
          400
        )
      );
    }

    // Apply the store credit (record as a negative payment)
    const creditPayment = await prisma.payment.create({
      data: {
        invoiceId,
        customerId,
        amount: -Math.abs(creditAmount), // Negative amount represents credit used
        method: 'STORE_CREDIT',
        status: 'PAID',
        notes: `Applied to invoice ${invoiceId}`,
      },
    });

    // Record payment against invoice
    const invoicePayment = await prisma.payment.create({
      data: {
        invoiceId,
        customerId,
        amount: creditAmount,
        method: 'STORE_CREDIT',
        status: 'PAID',
        notes: 'Paid with store credit',
      },
    });

    // Get invoice to check if it's fully paid
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { payments: true },
    });

    if (invoice) {
      const totalPaid = invoice.payments.reduce((sum, payment) => {
        if (payment.status === 'PAID') {
          return sum + payment.amount;
        }
        return sum;
      }, 0);

      // Update invoice with new payment totals
      const newBalanceDue = Math.max(
        0,
        Math.round((invoice.total - totalPaid) * 100) / 100
      );
      const isFullyPaid = newBalanceDue === 0;

      await prisma.invoice.update({
        where: { id: invoiceId },
        data: {
          status: isFullyPaid
            ? 'PAID'
            : totalPaid > 0
              ? 'SENT'
              : invoice.status,
          depositPaid: Math.round(totalPaid * 100) / 100,
          balanceDue: newBalanceDue,
        },
      });
    }

    res.status(200).json({
      status: 'success',
      data: {
        creditPayment,
        invoicePayment,
        remainingCredit: availableCredit - creditAmount,
      },
    });
  } catch (error) {
    console.error('Error applying store credit:', error);
    return next(new AppError('Error applying store credit', 500));
  }
};
