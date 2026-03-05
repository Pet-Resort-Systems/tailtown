// Fixed routes for analytics data without schema errors
const express = require('express');
const router = express.Router();

// Mock data for dashboard
const mockDashboardData = {
  period: 'month',
  totalRevenue: 685,
  customerCount: 6,
  serviceData: [
    { id: '1', name: 'Boarding', count: 2 },
    { id: '2', name: 'Daycare', count: 1 },
    { id: '3', name: 'Grooming', count: 3 }
  ],
  addOnData: [
    { id: '1', name: 'Bath', count: 2 },
    { id: '2', name: 'Nail Trim', count: 1 }
  ],
  addOnRevenue: 65,
  reservationCount: 6
};

// Mock data for service sales
const mockServiceSalesData = {
  period: 'month',
  totalRevenue: 665,
  services: [
    { id: '1', name: 'Boarding', revenue: 350, count: 2, percentage: 52.6 },
    { id: '2', name: 'Daycare', revenue: 65, count: 1, percentage: 9.8 },
    { id: '3', name: 'Grooming', revenue: 250, count: 3, percentage: 37.6 }
  ],
  totalBookings: 6
};

// Mock data for add-on sales
const mockAddOnSalesData = {
  period: 'month',
  totalRevenue: 20,
  addOns: [
    { id: '1', name: 'Bath', revenue: 15, count: 2 },
    { id: '2', name: 'Nail Trim', revenue: 5, count: 1 }
  ],
  totalAddOns: 3
};

// Dashboard summary endpoint
router.get('/dashboard', (req, res) => {
  console.log('Using fixed analytics dashboard data');
  res.status(200).json({
    status: 'success',
    data: mockDashboardData
  });
});

// Sales by service endpoint
router.get('/sales/services', (req, res) => {
  console.log('Using fixed service sales data');
  res.status(200).json({
    status: 'success',
    data: mockServiceSalesData
  });
});

// Sales by add-on endpoint
router.get('/sales/addons', (req, res) => {
  console.log('Using fixed add-on sales data');
  res.status(200).json({
    status: 'success',
    data: mockAddOnSalesData
  });
});

// Customer value endpoint (simplified)
router.get('/customers/value', (req, res) => {
  console.log('Using fixed customer value data');
  res.status(200).json({
    status: 'success',
    results: 6,
    data: []
  });
});

module.exports = router;
