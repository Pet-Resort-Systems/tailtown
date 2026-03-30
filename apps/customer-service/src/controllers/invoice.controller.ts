import { type Request, type Response, type NextFunction } from 'express';

import { AppError } from '../middleware/error.middleware.js';
import { type TenantRequest } from '../middleware/tenant.middleware.js';
import { prisma } from '../config/prisma.js';

// Get all invoices for a specific customer
export const getCustomerInvoices = async (
  req: TenantRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { customerId } = req.params;

    if (!customerId) {
      return next(new AppError('Customer ID is required', 400));
    }

    const invoices = await prisma.invoice.findMany({
      where: { customerId },
      include: {
        lineItems: true,
        payments: true,
      },
      orderBy: {
        issueDate: 'desc',
      },
    });

    res.status(200).json({
      status: 'success',
      results: invoices.length,
      data: invoices,
    });
  } catch (error) {
    console.error('Error fetching customer invoices:', error);
    return next(new AppError('Error fetching customer invoices', 500));
  }
};

// Get a specific invoice by ID
export const getInvoiceById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    if (!id) {
      return next(new AppError('Invoice ID is required', 400));
    }

    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        lineItems: true,
        payments: true,
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            address: true,
            city: true,
            state: true,
            zipCode: true,
          },
        },
        reservation: true,
      },
    });

    if (!invoice) {
      return next(new AppError('Invoice not found', 404));
    }

    res.status(200).json({
      status: 'success',
      data: invoice,
    });
  } catch (error) {
    console.error('Error fetching invoice:', error);
    return next(new AppError('Error fetching invoice', 500));
  }
};

// Create a new invoice
export const createInvoice = async (
  req: TenantRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const {
      customerId,
      reservationId,
      dueDate,
      subtotal,
      taxRate,
      taxAmount,
      discount,
      total,
      notes,
      lineItems,
    } = req.body;

    if (!customerId) {
      return next(new AppError('Customer ID is required', 400));
    }

    if (!lineItems || !Array.isArray(lineItems) || lineItems.length === 0) {
      return next(new AppError('At least one line item is required', 400));
    }

    // Get tenant ID from middleware
    const tenantId = req.tenantId!;

    // Validate reservation exists and belongs to this tenant
    if (reservationId) {
      const reservation = await prisma.reservation.findFirst({
        where: {
          id: reservationId,
          tenantId,
        },
      });
      if (!reservation) {
        return next(
          new AppError(
            'Reservation not found or does not belong to this tenant',
            404
          )
        );
      }
    }

    // Generate invoice number (format: INV-YYYYMMDD-XXXX)
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const invoiceNumber = `INV-${dateStr}-${randomSuffix}`;

    // Start a transaction to ensure all related records are created
    const invoice = await prisma.$transaction(async (prisma) => {
      // Create the invoice
      const newInvoice = await prisma.invoice.create({
        data: {
          tenantId,
          invoiceNumber,
          customerId,
          reservationId,
          dueDate: new Date(dueDate),
          subtotal: parseFloat(subtotal as any),
          taxRate: taxRate ? parseFloat(taxRate as any) : 0,
          taxAmount: taxAmount ? parseFloat(taxAmount as any) : 0,
          discount: discount ? parseFloat(discount as any) : 0,
          total: parseFloat(total as any),
          notes,
          lineItems: {
            create: lineItems.map((item: any) => ({
              tenantId,
              type: item.type || 'SERVICE',
              description: item.description,
              quantity: parseInt(item.quantity as any, 10),
              unitPrice: parseFloat(item.unitPrice as any),
              amount: parseFloat(item.amount as any),
              taxable: item.taxable !== undefined ? item.taxable : true,
              serviceId: item.serviceId || null,
              productId: item.productId || null,
            })),
          },
        },
        include: {
          lineItems: true,
        },
      });

      return newInvoice;
    });

    res.status(201).json({
      status: 'success',
      data: invoice,
    });
  } catch (error: any) {
    console.error('Error creating invoice:', error);
    const errorMessage = error.message || 'Error creating invoice';
    return next(new AppError(errorMessage, 500));
  }
};

// Update an invoice
export const updateInvoice = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const { status, dueDate, notes } = req.body;

    if (!id) {
      return next(new AppError('Invoice ID is required', 400));
    }

    // Check if invoice exists
    const existingInvoice = await prisma.invoice.findUnique({
      where: { id },
    });

    if (!existingInvoice) {
      return next(new AppError('Invoice not found', 404));
    }

    // Update only allowed fields
    const updatedInvoice = await prisma.invoice.update({
      where: { id },
      data: {
        status: status || undefined,
        dueDate: dueDate ? new Date(dueDate) : undefined,
        notes: notes || undefined,
      },
      include: {
        lineItems: true,
        payments: true,
      },
    });

    res.status(200).json({
      status: 'success',
      data: updatedInvoice,
    });
  } catch (error) {
    console.error('Error updating invoice:', error);
    return next(new AppError('Error updating invoice', 500));
  }
};

// Calculate account balance for a customer
export const getCustomerAccountBalance = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { customerId } = req.params;

    if (!customerId) {
      return next(new AppError('Customer ID is required', 400));
    }

    // Get all invoices for the customer
    const invoices = await prisma.invoice.findMany({
      where: {
        customerId,
        status: {
          notIn: ['CANCELLED', 'REFUNDED'],
        },
      },
      include: {
        payments: true,
      },
    });

    // Calculate total invoice amount
    const totalInvoiced = invoices.reduce(
      (sum, invoice) => sum + invoice.total,
      0
    );

    // Calculate total payments
    const totalPaid = invoices.reduce((sum, invoice) => {
      const invoicePaid = invoice.payments.reduce((paidSum, payment) => {
        if (payment.status === 'PAID') {
          return paidSum + payment.amount;
        }
        return paidSum;
      }, 0);
      return sum + invoicePaid;
    }, 0);

    // Calculate store credit (negative balance means customer has credit)
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

    // Calculate account balance (positive means customer owes money, negative means they have credit)
    const accountBalance = totalInvoiced - totalPaid;
    const storeCreditAmount = storeCredit._sum.amount || 0;

    // Calculate net balance (account balance minus available store credit)
    // For display purposes, we simply show store credit as a positive number that can be applied
    // rather than subtracting it from the balance automatically
    res.status(200).json({
      status: 'success',
      data: {
        totalInvoiced,
        totalPaid,
        accountBalance,
        storeCredit: storeCreditAmount,
        netBalance: accountBalance, // Remove the double subtraction of store credit
      },
    });
  } catch (error) {
    console.error('Error calculating customer account balance:', error);
    return next(
      new AppError('Error calculating customer account balance', 500)
    );
  }
};
