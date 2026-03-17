/**
 * Gingr API Client Service
 * Handles all communication with Gingr API for data migration
 */

// Use native fetch (Node 18+) instead of node-fetch to avoid ESM issues

interface GingrApiConfig {
  subdomain: string;
  apiKey: string;
}

interface GingrOwner {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  cell_phone?: string;
  home_phone?: string;
  address_1?: string;
  address_2?: string;
  city?: string;
  state?: string;
  zip?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  notes?: string;
}

interface GingrAnimal {
  id: string;
  owner_id: string;
  first_name: string; // Pet name
  species_id?: string;
  breed_id?: string;
  color?: string;
  gender?: string;
  birthday?: number; // Unix timestamp
  weight?: string;
  microchip?: string;
  vet_id?: string;
  medicines?: string;
  allergies?: string;
  notes?: string;
  feeding_notes?: string;
  grooming_notes?: string;
  temperment?: string;
  fixed?: string; // "1" or "0"
  vip?: string; // "1" or "0"
  banned?: string; // "1" or "0"
  image?: string; // Pet photo URL
  next_immunization_expiration?: string; // Unix timestamp
}

interface GingrReservation {
  reservation_id: string;
  start_date: string; // ISO string
  end_date: string; // ISO string
  check_in_date?: string | null;
  check_out_date?: string | null;
  cancelled_date?: string | null;
  confirmed_date?: string | null;
  animal: {
    id: string;
    name: string;
    breed: string;
  };
  owner: {
    id: string;
    first_name: string;
    last_name: string;
  };
  reservation_type: {
    id: string;
    type: string;
  };
  notes?: {
    reservation_notes?: string;
    animal_notes?: string;
    owner_notes?: string;
  };
  transaction?: {
    price?: number;
  };
}

interface GingrInvoice {
  id: string;
  owner_id: string;
  subtotal: string;
  tax_amount: string;
  total: string;
  create_stamp: string; // Unix timestamp as string
  location_id: string;
  first_name: string;
  last_name: string;
  email: string;
  username: string;
  user_id: string;
  item_count: string;
  voided_item_count: string | null;
  is_returned: string | null;
}

interface GingrReservationType {
  id: string;
  name: string;
  description?: string;
  price?: number;
}

export class GingrApiClient {
  private baseUrl: string;
  private apiKey: string;
  private requestCount: number = 0;
  private lastRequestTime: number = 0;

  constructor(config: GingrApiConfig) {
    this.baseUrl = `https://${config.subdomain}.gingrapp.com/api/v1`;
    this.apiKey = config.apiKey;
  }

  /**
   * Rate limiting - wait 150ms between requests
   */
  private async rateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;

    if (timeSinceLastRequest < 150) {
      await new Promise((resolve) =>
        setTimeout(resolve, 150 - timeSinceLastRequest)
      );
    }

    this.lastRequestTime = Date.now();
    this.requestCount++;
  }

  /**
   * Generic GET request
   */
  private async get(
    endpoint: string,
    params: Record<string, any> = {}
  ): Promise<any> {
    await this.rateLimit();

    const url = new URL(`${this.baseUrl}${endpoint}`);
    url.searchParams.append('key', this.apiKey);

    Object.keys(params).forEach((key) => {
      const value = params[key];
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, String(value));
      }
    });

    console.log(`[Gingr API] GET ${endpoint}`, params);

    try {
      const response = await fetch(url.toString());

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = (await response.json()) as any;

      if (data.error) {
        throw new Error(data.error);
      }

      return data;
    } catch (error) {
      console.error(`[Gingr API] Error on GET ${endpoint}:`, error);
      throw error;
    }
  }

  /**
   * Generic POST request
   */
  private async post(
    endpoint: string,
    data: Record<string, any> = {}
  ): Promise<any> {
    await this.rateLimit();

    const formData = new URLSearchParams();
    formData.append('key', this.apiKey);

    Object.keys(data).forEach((key) => {
      const value = data[key];
      if (value !== undefined && value !== null) {
        formData.append(key, String(value));
      }
    });

    console.log(`[Gingr API] POST ${endpoint}`, data);

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded; charset=utf-8',
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = (await response.json()) as any;

      if (result.error) {
        throw new Error(result.error);
      }

      return result;
    } catch (error) {
      console.error(`[Gingr API] Error on POST ${endpoint}:`, error);
      throw error;
    }
  }

  /**
   * Format date to YYYY-MM-DD
   */
  private formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  /**
   * Fetch all owners
   */
  async fetchAllOwners(): Promise<GingrOwner[]> {
    const response = await this.get('/owners');
    return response.data || [];
  }

  /**
   * Fetch all animals
   */
  async fetchAllAnimals(): Promise<GingrAnimal[]> {
    const response = await this.get('/animals');
    return response.data || [];
  }

  /**
   * Fetch reservations in 30-day chunks (API limitation)
   */
  async fetchAllReservations(
    startDate: Date,
    endDate: Date
  ): Promise<GingrReservation[]> {
    const allReservations: GingrReservation[] = [];
    let currentStart = new Date(startDate);

    while (currentStart < endDate) {
      // Calculate end of current chunk (30 days max)
      const currentEnd = new Date(currentStart);
      currentEnd.setDate(currentEnd.getDate() + 29);

      // Don't go past the requested end date
      const chunkEnd = currentEnd > endDate ? endDate : currentEnd;

      console.log(
        `[Gingr API] Fetching reservations from ${this.formatDate(
          currentStart
        )} to ${this.formatDate(chunkEnd)}`
      );

      try {
        const response = await this.post('/reservations', {
          start_date: this.formatDate(currentStart),
          end_date: this.formatDate(chunkEnd),
        });

        // Gingr returns reservations in response.data as an object with reservation IDs as keys
        // Convert to array
        const reservationsData = response.data || {};
        const chunk = Array.isArray(reservationsData)
          ? reservationsData
          : (Object.values(reservationsData) as GingrReservation[]);

        allReservations.push(...chunk);

        console.log(
          `[Gingr API] Fetched ${chunk.length} reservations for this chunk`
        );
      } catch (error) {
        console.error(`[Gingr API] Error fetching reservations chunk:`, error);
        // Continue with next chunk even if one fails
      }

      // Move to next chunk
      currentStart = new Date(chunkEnd);
      currentStart.setDate(currentStart.getDate() + 1);
    }

    console.log(
      `[Gingr API] Total reservations fetched: ${allReservations.length}`
    );
    return allReservations;
  }

  /**
   * Fetch reservation types (services)
   */
  async fetchReservationTypes(): Promise<GingrReservationType[]> {
    const response = await this.get('/reservation_types');
    return response.data || [];
  }

  /**
   * Fetch invoices
   */
  async fetchAllInvoices(
    fromDate: Date,
    toDate: Date
  ): Promise<GingrInvoice[]> {
    const response = await this.get('/list_invoices', {
      from_date: this.formatDate(fromDate),
      to_date: this.formatDate(toDate),
      complete: true,
    });

    return response.data || [];
  }

  /**
   * Fetch animal immunizations
   */
  async fetchAnimalImmunizations(animalId: string): Promise<any[]> {
    const response = await this.get('/get_animal_immunizations', {
      animal_id: animalId,
    });

    return response.data || [];
  }

  /**
   * Fetch animal feeding info
   */
  async fetchFeedingInfo(animalId: string): Promise<any> {
    const response = await this.get('/get_feeding_info', {
      animal_id: animalId,
    });

    return response.data || null;
  }

  /**
   * Fetch animal medication info
   */
  async fetchMedicationInfo(animalId: string): Promise<any> {
    const response = await this.get('/get_medication_info', {
      animal_id: animalId,
    });

    return response.data || null;
  }

  /**
   * Fetch species list
   */
  async fetchSpecies(): Promise<any[]> {
    const response = await this.get('/get_species');
    return response.data || [];
  }

  /**
   * Fetch breeds list
   */
  async fetchBreeds(): Promise<any[]> {
    const response = await this.get('/get_breeds');
    return response.data || [];
  }

  /**
   * Fetch locations
   */
  async fetchLocations(): Promise<any[]> {
    const response = await this.get('/get_locations');
    return response.data || [];
  }

  /**
   * Fetch vets list
   */
  async fetchVets(): Promise<any[]> {
    const response = await this.get('/get_vets');
    return response.data || [];
  }

  /**
   * Get request statistics
   */
  getStats() {
    return {
      totalRequests: this.requestCount,
      baseUrl: this.baseUrl,
    };
  }
}

export default GingrApiClient;
