/**
 * Gingr API Test Controller
 * Tests connection and fetches sample data from Gingr
 */

import { Request, Response, NextFunction } from 'express';
import GingrApiClient from '../services/gingr-api.service';

/**
 * Test Gingr API connection and fetch sample data
 * POST /api/gingr/test
 */
export const testGingrConnection = async (req: Request, res: Response, next: NextFunction) => {
  const { subdomain, apiKey, startDate, endDate } = req.body;

  if (!subdomain || !apiKey) {
    return res.status(400).json({
      success: false,
      error: 'Subdomain and API key are required'
    });
  }

  try {
    const gingr = new GingrApiClient({ subdomain, apiKey });
    console.log('[Gingr Test] Testing connection...');

    // Test 1: Fetch locations
    console.log('[Gingr Test] Fetching locations...');
    const locations = await gingr.fetchLocations();

    // Test 2: Fetch a few owners
    console.log('[Gingr Test] Fetching owners...');
    const owners = await gingr.fetchAllOwners();

    // Test 3: Fetch a few animals
    console.log('[Gingr Test] Fetching animals...');
    const animals = await gingr.fetchAllAnimals();

    // Test 4: Fetch reservation types
    console.log('[Gingr Test] Fetching reservation types...');
    const reservationTypes = await gingr.fetchReservationTypes();

    // Test 5: Fetch reservations for date range
    console.log('[Gingr Test] Fetching reservations...');
    const reservations = await gingr.fetchAllReservations(
      new Date(startDate),
      new Date(endDate)
    );

    const stats = gingr.getStats();

    res.json({
      success: true,
      message: 'Connection successful',
      data: {
        locations: locations.slice(0, 5),
        owners: owners.slice(0, 10),
        animals: animals.slice(0, 10),
        reservationTypes: reservationTypes.slice(0, 10),
        reservations: reservations.slice(0, 10)
      },
      counts: {
        locations: locations.length,
        owners: owners.length,
        animals: animals.length,
        reservationTypes: reservationTypes.length,
        reservations: reservations.length
      },
      stats: {
        apiRequests: stats.totalRequests,
        baseUrl: stats.baseUrl
      }
    });

  } catch (error: any) {
    console.error('[Gingr Test] Error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

export default {
  testGingrConnection
};
