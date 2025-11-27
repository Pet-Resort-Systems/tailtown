import { useState, useEffect, useCallback } from "react";
import { resourceService, type Resource } from "../services/resourceService";
import {
  reservationService,
  Reservation as BaseReservation,
} from "../services/reservationService";
import { formatDateToYYYYMMDD } from "../utils/dateUtils";
import { reservationApi } from "../services/api";
import { sortByRoomAndNumber, sortBySuiteNumber } from "../utils/sortingUtils";

// Extended Resource interface for specific properties used in KennelCalendar
export interface ExtendedResource extends Resource {
  resourceId?: string;
  resourceName?: string;
  suiteNumber?: string;
  reservations?: Array<{
    id: string;
    startDate: string;
    endDate: string;
    status: string;
  }>;
}

// Enhanced Reservation interface with additional fields we might encounter
export interface Reservation extends BaseReservation {
  resourceId?: string;
  kennelId?: string;
  suiteId?: string;
  suiteType?: string;
  staffNotes?: string;
  resource?: ExtendedResource;
}

// Define the kennel types
export type RoomSize = "JUNIOR" | "QUEEN" | "KING" | "VIP" | "CAT" | "OVERFLOW";
export type KennelType = RoomSize; // Alias for backward compatibility

interface UseKennelDataProps {
  currentDate: Date;
  getDaysToDisplay: () => Date[];
  kennelTypeFilter: KennelType | "ALL";
}

interface UseKennelDataReturn {
  kennels: ExtendedResource[];
  reservations: Reservation[];
  loading: boolean;
  error: string | null;
  availabilityData: any;
  fetchingAvailability: boolean;
  availabilityError: string | null;
  refreshData: () => void;
}

/**
 * Custom hook to manage kennel data fetching and state
 * Centralizes all the complex data fetching logic from KennelCalendar
 */
export const useKennelData = ({
  currentDate,
  getDaysToDisplay,
  kennelTypeFilter,
}: UseKennelDataProps): UseKennelDataReturn => {
  // State for kennels and reservations
  const [kennels, setKennels] = useState<ExtendedResource[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // State for resource availability data from backend API
  const [availabilityData, setAvailabilityData] = useState<any>(null);
  const [fetchingAvailability, setFetchingAvailability] =
    useState<boolean>(false);
  const [availabilityError, setAvailabilityError] = useState<string | null>(
    null
  );

  // Function to load kennels and availability data
  const loadKennelsAndAvailability = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // First, get all resources of type suite
      try {
        // Get all kennel resources (no type filter - includes JUNIOR_KENNEL, QUEEN_KENNEL, KING_KENNEL, etc.)
        const suitesResponse = await resourceService.getAllResources(
          1, // page
          1000, // large limit to get all resources
          "name", // sortBy
          "asc" // sortOrder
          // No type filter - fetch all resources
        );

        // Extract resources from the response
        let kennelResources: ExtendedResource[] = [];

        if (
          suitesResponse?.status === "success" &&
          Array.isArray(suitesResponse?.data)
        ) {
          kennelResources = suitesResponse.data;
        } else {
          console.error("Could not find suite resources in response");
          setError("Failed to load kennels: Could not find suite resources");
          setLoading(false);
          return;
        }

        // Now check availability for these resources
        const days = getDaysToDisplay();
        const startDate = formatDateToYYYYMMDD(days[0]);
        const endDate = formatDateToYYYYMMDD(days[days.length - 1]);

        // Extract resource IDs for batch availability check
        const resourceIds = kennelResources.map(
          (resource: ExtendedResource) => resource.id
        );

        let availabilityResponse: any = {};

        if (resourceIds.length > 0) {
          availabilityResponse = await reservationApi.post(
            "/api/resources/availability/batch",
            {
              resourceIds: resourceIds,
              startDate: startDate,
              endDate: endDate,
            }
          );
        } else {
          availabilityResponse = {
            data: {
              resources: [],
              checkStartDate: startDate,
              checkEndDate: endDate,
            },
          };
        }

        // Process availability data
        interface AvailabilityMap {
          [resourceId: string]: boolean;
        }

        const availabilityMap: AvailabilityMap = {};

        // Extract the actual API response data from the Axios response
        const apiResponseData =
          availabilityResponse?.data?.data || availabilityResponse?.data;

        // Store both availability and occupying reservations
        const occupyingReservationsMap: { [resourceId: string]: any[] } = {};

        if (
          apiResponseData?.resources &&
          Array.isArray(apiResponseData.resources)
        ) {
          apiResponseData.resources.forEach((item: any) => {
            availabilityMap[item.resourceId] = item.isAvailable;
            occupyingReservationsMap[item.resourceId] =
              item.occupyingReservations || [];
          });
        } else {
          console.warn(
            "Could not process availability data, assuming all available"
          );
        }

        // Combine resource data with availability data
        const kennelData = kennelResources.map(
          (resource: ExtendedResource) => ({
            ...resource,
            isAvailable: availabilityMap[resource.id] !== false, // Default to available if not specified
            occupyingReservations: occupyingReservationsMap[resource.id] || [],
            checkDate: startDate,
          })
        );

        // Sort kennels by room letter and then by number (A01, A02, A03, ..., B01, B02, etc.)
        const sortedKennels = sortByRoomAndNumber(kennelData);
        setKennels(sortedKennels);
        setLoading(false);
        return;
      } catch (apiError: any) {
        console.error("Error fetching resources:", apiError);

        // Fallback to the original availability endpoint

        try {
          const response = await reservationApi.get(
            "/api/resources/availability",
            {
              params: {
                resourceType: "suite",
                date: formatDateToYYYYMMDD(currentDate),
              },
            }
          );

          // Extract kennels from the response, handling different response formats
          let kennelData: any[] = [];

          // Handle the actual response structure from the API
          if (response?.data?.status === "success") {
            // For the single resource availability endpoint, we need to create a synthetic kennels array
            if (response?.data?.data) {
              // Store the availability data for later use
              setAvailabilityData(response.data.data);

              // Create placeholder kennels if we don't have real data
              if (!kennelData.length) {
                try {
                  const allSuites = await resourceService.getAllResources(
                    1,
                    1000,
                    "name",
                    "asc"
                  );
                  if (allSuites && Array.isArray(allSuites)) {
                    kennelData = allSuites.map((suite: any) => ({
                      ...suite,
                      isAvailable: true, // Default to available
                      checkDate: formatDateToYYYYMMDD(currentDate),
                    }));
                  }
                } catch (error) {
                  console.warn(
                    "Could not fetch suite details, using placeholder data",
                    error
                  );
                }
              }
            }
          }
          // Handle batch response format with resources array
          else if (
            response?.data?.status === "success" &&
            response?.data?.data?.resources &&
            Array.isArray(response?.data?.data?.resources)
          ) {
            kennelData = response.data.data.resources;
            setAvailabilityData(response.data.data);
          }
          // Handle legacy response formats as fallbacks
          else if (
            response?.data?.resources &&
            Array.isArray(response?.data?.resources)
          ) {
            kennelData = response.data.resources;
          } else if (Array.isArray(response?.data)) {
            kennelData = response.data;
          }
          // Check for nested data structure with data property
          else if (
            response?.data?.data &&
            typeof response.data.data === "object"
          ) {
            // Look for any array property in the nested data object
            for (const key in response.data.data) {
              if (Array.isArray(response.data.data[key])) {
                kennelData = response.data.data[key];
                break;
              }
            }
          }

          if (kennelData.length === 0) {
            console.warn("No kennel data found in any expected format");
            setError(
              "No kennels found. Please check your resource configuration."
            );
          } else {
            // Sort the kennels by suite number
            const sortedKennels = sortBySuiteNumber(kennelData);
            setKennels(sortedKennels);
          }

          setLoading(false);
        } catch (fallbackError: any) {
          console.error("Fallback API call also failed:", fallbackError);
          setError(
            `Failed to load kennels: ${
              fallbackError.message || "Unknown error"
            }`
          );
          setLoading(false);
        }
      }
    } catch (error: any) {
      console.error("Error in loadKennelsAndAvailability:", error);
      setError(`Failed to load kennels: ${error.message || "Unknown error"}`);
      setLoading(false);
    }
  }, [currentDate, getDaysToDisplay]);

  // Function to load reservations for the date range
  const loadReservations = useCallback(async () => {
    try {
      const days = getDaysToDisplay();
      const startDate = formatDateToYYYYMMDD(days[0]);
      const endDate = formatDateToYYYYMMDD(days[days.length - 1]);

      // Use the reservation API directly to get reservations for the date range
      const response = await reservationApi.get("/api/reservations", {
        params: {
          startDate,
          endDate,
          limit: 500, // API max limit is 500
        },
      });

      // Handle the nested response format: data.reservations
      console.log("[useKennelData] Reservations response:", response?.data);
      const reservationsData =
        response?.data?.data?.reservations ||
        response?.data?.reservations ||
        response?.data?.data ||
        [];
      console.log(
        "[useKennelData] Extracted reservations:",
        reservationsData.length,
        "reservations"
      );
      if (reservationsData.length > 0) {
        console.log("[useKennelData] First reservation:", reservationsData[0]);
      }
      setReservations(reservationsData);
    } catch (error) {
      console.error("Error loading reservations:", error);
      setReservations([]);
    }
  }, [getDaysToDisplay]);

  // Load data when dependencies change
  useEffect(() => {
    loadKennelsAndAvailability();
    loadReservations();
  }, [loadKennelsAndAvailability, loadReservations]);

  // Filter kennels based on room size filter
  const filteredKennels = kennels.filter((kennel) => {
    if (kennelTypeFilter === "ALL") return true;
    const roomSize = kennel.size || "JUNIOR";
    return roomSize === kennelTypeFilter;
  });

  return {
    kennels: filteredKennels,
    reservations,
    loading,
    error,
    availabilityData,
    fetchingAvailability,
    availabilityError,
    refreshData: loadKennelsAndAvailability,
  };
};
