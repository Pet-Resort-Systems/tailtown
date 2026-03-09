/**
 * Financial Data Validation Script
 * 
 * This script runs a comprehensive validation of all financial data
 * to ensure consistency across the application.
 * 
 * Usage:
 * ts-node validateFinancialData.ts
 */

import financialService from '../services/financialService';
import financialTests from '../tests/financialService.test';
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function validateFinancialData() {
  console.log('Starting financial data validation...');
  const timestamp = new Date().toISOString().replace(/:/g, '-');
  const resultsDir = path.join(__dirname, '../../../logs/financial-validation');
  
  // Create logs directory if it doesn't exist
  if (!fs.existsSync(resultsDir)) {
    fs.mkdirSync(resultsDir, { recursive: true });
  }
  
  const resultsFile = path.join(resultsDir, `validation-${timestamp}.log`);
  const outputStream = fs.createWriteStream(resultsFile, { flags: 'a' });
  
  const log = (message: string) => {
    console.log(message);
    outputStream.write(message + '\n');
  };
  
  log(`=== FINANCIAL DATA VALIDATION - ${new Date().toISOString()} ===`);
  
  try {
    // Run consistency tests
    log('\n1. REVENUE CONSISTENCY TESTS');
    log('----------------------------');
    const consistencyResult = await financialTests.testRevenueConsistency();
    
    if (consistencyResult.success) {
      log('\n✅ REVENUE CONSISTENCY: Passed - All calculations match');
    } else {
      log('\n❌ REVENUE CONSISTENCY: Failed - Discrepancies detected');
    }
    
    // Run invoice validation tests
    log('\n2. INVOICE VALIDATION');
    log('----------------------------');
    
    const allInvoices = await prisma.invoice.findMany({
      include: {
        lineItems: true,
        payments: true,
        reservation: {
          include: {
            addOnServices: {
              include: {
                addOn: true
              }
            },
            service: true
          }
        }
      }
    });
    
    log(`Found ${allInvoices.length} invoices to validate`);
    
    let invoicesWithIssues = 0;
    
    for (const invoice of allInvoices) {
      // Calculate expected total from line items
      const lineItemTotal = invoice.lineItems.reduce((sum, item) => sum + item.amount, 0);
      const invoiceSubtotal = invoice.subtotal;
      
      // Compare calculated subtotal with stored subtotal
      const subtotalDiff = Math.abs(lineItemTotal - invoiceSubtotal);
      
      if (subtotalDiff > 0.01) {
        log(`\n❌ INVOICE ${invoice.invoiceNumber} - Subtotal mismatch:`);
        log(`   Stored: ${invoiceSubtotal}`);
        log(`   Calculated: ${lineItemTotal}`);
        log(`   Difference: ${subtotalDiff}`);
        invoicesWithIssues++;
      }
      
      // Validate tax calculation
      const expectedTax = invoice.subtotal * invoice.taxRate;
      const taxDiff = Math.abs(expectedTax - invoice.taxAmount);
      
      if (taxDiff > 0.01) {
        log(`\n❌ INVOICE ${invoice.invoiceNumber} - Tax mismatch:`);
        log(`   Stored: ${invoice.taxAmount}`);
        log(`   Calculated: ${expectedTax}`);
        log(`   Difference: ${taxDiff}`);
        invoicesWithIssues++;
      }
      
      // Validate total calculation
      const expectedTotal = invoice.subtotal + invoice.taxAmount - invoice.discount;
      const totalDiff = Math.abs(expectedTotal - invoice.total);
      
      if (totalDiff > 0.01) {
        log(`\n❌ INVOICE ${invoice.invoiceNumber} - Total mismatch:`);
        log(`   Stored: ${invoice.total}`);
        log(`   Calculated: ${expectedTotal}`);
        log(`   Difference: ${totalDiff}`);
        invoicesWithIssues++;
      }
    }
    
    if (invoicesWithIssues === 0) {
      log('\n✅ INVOICE VALIDATION: All invoices are internally consistent');
    } else {
      log(`\n❌ INVOICE VALIDATION: Found issues in ${invoicesWithIssues} invoices`);
    }
    
    // Run payment validation
    log('\n3. PAYMENT VALIDATION');
    log('----------------------------');
    
    const invoicesWithPayments = await prisma.invoice.findMany({
      where: {
        payments: {
          some: {}
        }
      },
      include: {
        payments: true
      }
    });
    
    log(`Found ${invoicesWithPayments.length} invoices with payments to validate`);
    
    let paymentsWithIssues = 0;
    
    for (const invoice of invoicesWithPayments) {
      // Calculate total payment amount
      const totalPayments = invoice.payments.reduce(
        (sum, payment) => sum + payment.amount - payment.refundedAmount, 
        0
      );
      
      // For paid invoices, check that payments match invoice total
      if (invoice.status === 'PAID') {
        const paymentDiff = Math.abs(totalPayments - invoice.total);
        
        if (paymentDiff > 0.01) {
          log(`\n❌ INVOICE ${invoice.invoiceNumber} - Paid status but payment mismatch:`);
          log(`   Invoice total: ${invoice.total}`);
          log(`   Total payments: ${totalPayments}`);
          log(`   Difference: ${paymentDiff}`);
          paymentsWithIssues++;
        }
      }
    }
    
    if (paymentsWithIssues === 0) {
      log('\n✅ PAYMENT VALIDATION: All payment records are consistent with invoice status');
    } else {
      log(`\n❌ PAYMENT VALIDATION: Found issues in ${paymentsWithIssues} payment records`);
    }
    
    // Final summary
    log('\n=== VALIDATION SUMMARY ===');
    
    if (consistencyResult.success && invoicesWithIssues === 0 && paymentsWithIssues === 0) {
      log('\n✅ ALL VALIDATIONS PASSED: Financial data is consistent throughout the application');
    } else {
      log('\n❌ VALIDATION ISSUES DETECTED: Please review the full report for details');
    }
    
    log(`\nFull report written to: ${resultsFile}`);
    
  } catch (error) {
    log('\n❌ ERROR DURING VALIDATION:');
    log(error.toString());
  } finally {
    outputStream.end();
    await prisma.$disconnect();
  }
}

// Run the validation if this script is executed directly
if (require.main === module) {
  validateFinancialData()
    .then(() => console.log('Validation complete'))
    .catch(err => console.error('Validation failed:', err));
}

export default validateFinancialData;
