/**
 * Payment Controller
 * Handles payment processing endpoints
 */

import type { Request, Response } from 'express';
import {
  CardConnectService,
  cardConnectService,
} from '../services/cardconnect.service.js';
import { env } from '../env.js';
import { logger } from '../utils/logger.js';
import Joi from 'joi';

// Validation schemas
const authorizeSchema = Joi.object({
  amount: Joi.number().positive().required(),
  cardNumber: Joi.string().creditCard().required(),
  expiry: Joi.string()
    .pattern(/^\d{4}$/)
    .required(), // MMYY
  cvv: Joi.string()
    .pattern(/^\d{3,4}$/)
    .required(),
  name: Joi.string().optional(),
  email: Joi.string().email().optional(),
  address: Joi.string().optional(),
  city: Joi.string().optional(),
  state: Joi.string().optional(),
  zip: Joi.string().optional(),
  orderId: Joi.string().optional(),
  capture: Joi.boolean().optional(),
});

const captureSchema = Joi.object({
  retref: Joi.string().required(),
  amount: Joi.number().positive().optional(),
});

const refundSchema = Joi.object({
  retref: Joi.string().required(),
  amount: Joi.number().positive().optional(),
});

const voidSchema = Joi.object({
  retref: Joi.string().required(),
});

/**
 * Process a payment authorization
 */
export async function authorizePayment(req: Request, res: Response) {
  try {
    // Validate request
    const { error, value } = authorizeSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        status: 'error',
        message: 'Validation error',
        errors: error.details.map((d) => d.message),
      });
    }

    const {
      amount,
      cardNumber,
      expiry,
      cvv,
      name,
      email,
      address,
      city,
      state,
      zip,
      orderId,
      capture = true,
    } = value;

    // Format amount (CardConnect expects amount in cents without decimal)
    const formattedAmount = Math.round(amount * 100).toString();

    // Call CardConnect API
    const result = await cardConnectService.authorize({
      amount: formattedAmount,
      account: cardNumber,
      expiry,
      cvv2: cvv,
      name,
      email,
      address,
      city,
      region: state,
      postal: zip,
      orderid: orderId,
      capture: capture ? 'Y' : 'N',
    });

    // Check if approved
    if (result.respstat === 'A') {
      logger.info('Payment authorized successfully', {
        retref: result.retref,
        amount: formattedAmount,
      });

      return res.status(200).json({
        status: 'success',
        message: 'Payment authorized successfully',
        data: {
          transactionId: result.retref,
          authCode: result.authcode,
          amount: amount,
          approved: true,
          responseCode: result.respcode,
          responseText: result.resptext,
          avsResponse: result.avsresp,
          cvvResponse: result.cvvresp,
          token: result.token,
          maskedCard: result.account,
        },
      });
    } else {
      logger.warn('Payment declined', {
        respstat: result.respstat,
        resptext: result.resptext,
      });

      return res.status(402).json({
        status: 'declined',
        message: 'Payment declined',
        data: {
          approved: false,
          responseCode: result.respcode,
          responseText: result.resptext,
        },
      });
    }
  } catch (error) {
    logger.error('Payment authorization error', { error });
    return res.status(500).json({
      status: 'error',
      message: 'Payment processing failed',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Capture a previously authorized payment
 */
export async function capturePayment(req: Request, res: Response) {
  try {
    const { error, value } = captureSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        status: 'error',
        message: 'Validation error',
        errors: error.details.map((d) => d.message),
      });
    }

    const { retref, amount } = value;

    // Format amount if provided
    const formattedAmount = amount
      ? Math.round(amount * 100).toString()
      : undefined;

    const result = await cardConnectService.capture({
      retref,
      amount: formattedAmount,
    });

    if (result.respstat === 'A') {
      return res.status(200).json({
        status: 'success',
        message: 'Payment captured successfully',
        data: {
          transactionId: result.retref,
          amount: amount,
          approved: true,
        },
      });
    } else {
      return res.status(402).json({
        status: 'declined',
        message: 'Payment capture declined',
        data: {
          approved: false,
          responseText: result.resptext,
        },
      });
    }
  } catch (error) {
    logger.error('Payment capture error', { error });
    return res.status(500).json({
      status: 'error',
      message: 'Payment capture failed',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Refund a payment
 */
export async function refundPayment(req: Request, res: Response) {
  try {
    const { error, value } = refundSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        status: 'error',
        message: 'Validation error',
        errors: error.details.map((d) => d.message),
      });
    }

    const { retref, amount } = value;

    // Format amount if provided
    const formattedAmount = amount
      ? Math.round(amount * 100).toString()
      : undefined;

    const result = await cardConnectService.refund({
      retref,
      amount: formattedAmount,
    });

    if (result.respstat === 'A') {
      return res.status(200).json({
        status: 'success',
        message: 'Payment refunded successfully',
        data: {
          transactionId: result.retref,
          amount: amount,
          approved: true,
        },
      });
    } else {
      return res.status(402).json({
        status: 'declined',
        message: 'Payment refund declined',
        data: {
          approved: false,
          responseText: result.resptext,
        },
      });
    }
  } catch (error) {
    logger.error('Payment refund error', { error });
    return res.status(500).json({
      status: 'error',
      message: 'Payment refund failed',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Void a payment
 */
export async function voidPayment(req: Request, res: Response) {
  try {
    const { error, value } = voidSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        status: 'error',
        message: 'Validation error',
        errors: error.details.map((d) => d.message),
      });
    }

    const { retref } = value;

    const result = await cardConnectService.void({
      retref,
    });

    if (result.respstat === 'A') {
      return res.status(200).json({
        status: 'success',
        message: 'Payment voided successfully',
        data: {
          transactionId: result.retref,
          approved: true,
        },
      });
    } else {
      return res.status(402).json({
        status: 'declined',
        message: 'Payment void declined',
        data: {
          approved: false,
          responseText: result.resptext,
        },
      });
    }
  } catch (error) {
    logger.error('Payment void error', { error });
    return res.status(500).json({
      status: 'error',
      message: 'Payment void failed',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Inquire about a transaction
 */
export async function inquireTransaction(req: Request, res: Response) {
  try {
    const { retref } = req.params;

    if (!retref || Array.isArray(retref)) {
      return res.status(400).json({
        status: 'error',
        message: 'Transaction reference is required',
      });
    }

    const result = await cardConnectService.inquire({ retref });

    return res.status(200).json({
      status: 'success',
      data: result,
    });
  } catch (error) {
    logger.error('Transaction inquiry error', { error });
    return res.status(500).json({
      status: 'error',
      message: 'Transaction inquiry failed',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Charge a saved card token
 * Used for card-on-file transactions
 */
export async function chargeToken(req: Request, res: Response) {
  try {
    const { token, amount, expiry, orderId, description } = req.body;

    if (!token || !amount) {
      return res.status(400).json({
        status: 'error',
        message: 'Token and amount are required',
      });
    }

    // Format amount (CardConnect expects amount in cents without decimal)
    const formattedAmount = Math.round(amount * 100).toString();

    // Call CardConnect API with token instead of card number
    const result = await cardConnectService.authorize({
      amount: formattedAmount,
      account: token, // Token is used as the account for saved cards
      expiry: expiry || '1299', // Use stored expiry or far-future fallback
      orderid: orderId,
      capture: 'Y',
    });

    if (result.respstat === 'A') {
      logger.info('Token charge successful', {
        retref: result.retref,
        amount: formattedAmount,
      });

      return res.status(200).json({
        status: 'success',
        message: 'Payment processed successfully',
        data: {
          transactionId: result.retref,
          authCode: result.authcode,
          amount: amount,
          approved: true,
          responseCode: result.respcode,
          responseText: result.resptext,
        },
      });
    } else {
      logger.warn('Token charge declined', {
        respstat: result.respstat,
        resptext: result.resptext,
      });

      return res.status(402).json({
        status: 'declined',
        message: 'Payment declined',
        data: {
          approved: false,
          responseCode: result.respcode,
          responseText: result.resptext,
        },
      });
    }
  } catch (error) {
    logger.error('Token charge error', { error });
    return res.status(500).json({
      status: 'error',
      message: 'Payment processing failed',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Get test card numbers (for development only)
 */
export function getTestCards(req: Request, res: Response) {
  if (env.NODE_ENV === 'production') {
    return res.status(403).json({
      status: 'error',
      message: 'Test cards not available in production',
    });
  }

  const testCards = CardConnectService.getTestCards();

  return res.status(200).json({
    status: 'success',
    message: 'Test card numbers for CardConnect UAT environment',
    data: testCards,
    note: 'These are test cards only. Do not use real card numbers in test environment.',
  });
}
