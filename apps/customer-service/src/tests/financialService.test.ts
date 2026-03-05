/**
 * Financial Service Tests
 * 
 * These tests verify that the financial service calculates consistent
 * revenue figures across different methods and scenarios.
 */

import financialService from '../services/financialService';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Mock data for testing
const TEST_DATE_RANGE = {
  gte: new Date('2023-01-01'),
  lte: new Date('2023-12-31')
};

/**
 * This test ensures that the total revenue calculated from different methods matches:
 * 1. Total from getFinancialSummary
 * 2. Sum of service revenue from getServiceRevenue
 * 3. Sum of customer totals from getCustomerRevenue
 */
async function testRevenueConsistency() {
  console.log('=== TESTING REVENUE CONSISTENCY ===');
  
  try {
    // Get financial summary 
    const summary = await financialService.getFinancialSummary(TEST_DATE_RANGE);
    console.log(`Financial Summary Total Revenue: ${summary.totalRevenue}`);
    
    // Get service revenue
    const serviceRevenue = await financialService.getServiceRevenue(TEST_DATE_RANGE);
    const serviceTotal = serviceRevenue.reduce((sum, service) => sum + service.revenue, 0);
    console.log(`Service Revenue Total: ${serviceTotal}`);
    
    // Get add-on revenue
    const addOnRevenue = await financialService.getAddOnRevenue(TEST_DATE_RANGE);
    const addOnTotal = addOnRevenue.reduce((sum, addOn) => sum + addOn.revenue, 0);
    console.log(`Add-On Revenue Total: ${addOnTotal}`);
    
    // Verify totals match (add service + add-on)
    const combinedTotal = serviceTotal + addOnTotal;
    const serviceDiff = Math.abs(summary.totalRevenue - combinedTotal);
    console.log(`Combined Service + Add-On Total: ${combinedTotal}`);
    console.log(`Difference from Summary: ${serviceDiff}`);
    
    if (serviceDiff > 0.01) {
      console.error('❌ INCONSISTENCY DETECTED: Service + Add-On total does not match financial summary');
    } else {
      console.log('✅ Service + Add-On total consistent with financial summary');
    }
    
    // Get customer revenue
    const customerRevenue = await financialService.getCustomerRevenue(TEST_DATE_RANGE);
    const customerTotal = customerRevenue.reduce((sum, customer) => sum + customer.totalSpend, 0);
    console.log(`Customer Revenue Total: ${customerTotal}`);
    
    // Verify customer total matches summary
    const customerDiff = Math.abs(summary.totalRevenue - customerTotal);
    console.log(`Difference from Summary: ${customerDiff}`);
    
    if (customerDiff > 0.01) {
      console.error('❌ INCONSISTENCY DETECTED: Customer total does not match financial summary');
    } else {
      console.log('✅ Customer total consistent with financial summary');
    }
    
    // Daily revenue consistency test
    const dailyRevenue = await financialService.getDailyRevenue(TEST_DATE_RANGE);
    const dailyTotal = dailyRevenue.reduce((sum, day) => sum + day.revenue, 0);
    console.log(`Daily Revenue Total: ${dailyTotal}`);
    
    const dailyDiff = Math.abs(summary.totalRevenue - dailyTotal);
    console.log(`Difference from Summary: ${dailyDiff}`);
    
    if (dailyDiff > 0.01) {
      console.error('❌ INCONSISTENCY DETECTED: Daily total does not match financial summary');
    } else {
      console.log('✅ Daily total consistent with financial summary');
    }
    
    return {
      success: serviceDiff <= 0.01 && customerDiff <= 0.01 && dailyDiff <= 0.01,
      summary: summary.totalRevenue,
      serviceTotal,
      addOnTotal,
      combinedTotal,
      customerTotal,
      dailyTotal
    };
  } catch (error) {
    console.error('Error running revenue consistency test:', error);
    return {
      success: false,
      error
    };
  }
}

/**
 * Run the test
 */
const runTests = async () => {
  console.log('Running financial service tests...');
  
  try {
    const consistencyResult = await testRevenueConsistency();
    
    if (consistencyResult.success) {
      console.log('\n✅ ALL TESTS PASSED: Financial calculations are consistent');
    } else {
      console.error('\n❌ TESTS FAILED: Financial calculations are inconsistent');
      console.log('Please review the financial service implementation');
    }
  } catch (error) {
    console.error('Error running tests:', error);
  } finally {
    await prisma.$disconnect();
  }
};

// Uncomment to run directly
// runTests();

export default {
  testRevenueConsistency,
  runTests
};
