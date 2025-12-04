import { AxiosResponse } from "axios";
import { reservationApi as api } from "./api";
import { formatDateToYYYYMMDD } from "../utils/dateUtils";
import { ServiceCategory } from "../types/service";
import { serviceManagement } from "./serviceManagement";
import {
  Resource,
  ResourceType,
  AvailabilityStatus,
  ResourceAvailability,
} from "../types/resource";

// Re-export the Resource types
export type {
  Resource,
  ResourceType,
  AvailabilityStatus,
  ResourceAvailability,
};

// Local helper type for endpoints where we enrich a Resource with reservations
type ResourceWithReservations = Resource & {
  reservations?: Array<{
    id: string;
    startDate: string;
    endDate: string;
    status: string;
    customer: {
      id: string;
      firstName: string;
      lastName: string;
    };
    pet: {
      id: string;
      name: string;
      type: string;
      owner?: {
        id: string;
        firstName: string;
        lastName: string;
      };
    };
  }>;
};

export const resourceService = {
  getAllResources: async (
    page?: number,
    limit?: number,
    sortBy?: string,
    sortOrder: "asc" | "desc" = "asc",
    type?: string
  ): Promise<{
    status: string;
    data: Resource[];
    totalPages?: number;
    currentPage?: number;
    results?: number;
  }> => {
    try {
      // If a large limit is requested (like 1000), fetch all pages
      if (limit && limit > 100) {
        console.log(
          "[ResourceService] Large limit detected:",
          limit,
          "- fetching all pages"
        );
        let allResources: Resource[] = [];
        let currentPage = 1;
        let totalPages = 1;

        // Fetch first page with limit of 100
        const firstResponse: AxiosResponse = await api.get("/api/resources", {
          params: {
            page: currentPage,
            limit: 100,
            sortBy,
            sortOrder,
            type,
          },
        });

        console.log(
          "[ResourceService] Response keys:",
          Object.keys(firstResponse.data)
        );
        console.log(
          "[ResourceService] Response status:",
          firstResponse.data.status
        );
        console.log(
          "[ResourceService] Response data type:",
          typeof firstResponse.data.data,
          "isArray:",
          Array.isArray(firstResponse.data.data)
        );
        console.log(
          "[ResourceService] Response data length:",
          firstResponse.data.data?.length
        );

        if (firstResponse.data.status === "success") {
          allResources = firstResponse.data.data || [];
          // If we have data but no totalPages, we got all data in one response
          if (
            allResources.length > 0 &&
            (firstResponse.data.totalPages === null ||
              firstResponse.data.totalPages === undefined)
          ) {
            // All data was returned in this single response, no pagination needed
            totalPages = 1;
            console.log(
              "[ResourceService] No pagination metadata in response, got all",
              allResources.length,
              "resources in one response"
            );
          } else {
            totalPages = firstResponse.data.totalPages || 1;
          }
          console.log(
            "[ResourceService] First page fetched:",
            allResources.length,
            "resources, totalPages:",
            totalPages
          );

          // Fetch remaining pages if there are any
          while (currentPage < totalPages) {
            currentPage++;
            const pageResponse: AxiosResponse = await api.get(
              "/api/resources",
              {
                params: {
                  page: currentPage,
                  limit: 100,
                  sortBy,
                  sortOrder,
                  type,
                },
              }
            );

            if (
              pageResponse.data.status === "success" &&
              pageResponse.data.data
            ) {
              allResources = [...allResources, ...pageResponse.data.data];
              console.log(
                "[ResourceService] Page",
                currentPage,
                "fetched:",
                pageResponse.data.data.length,
                "resources. Total so far:",
                allResources.length
              );
            }
          }
        }

        console.log(
          "[ResourceService] All pages fetched! Total resources:",
          allResources.length
        );
        return {
          status: "success",
          data: allResources,
          totalPages: totalPages,
          currentPage: totalPages,
          results: allResources.length,
        };
      }

      // Normal single-page request
      const response: AxiosResponse = await api.get("/api/resources", {
        params: {
          page,
          limit,
          sortBy,
          sortOrder,
          type,
        },
      });
      return response.data;
    } catch (error: any) {
      console.error("Error in getAllResources:", error);
      throw error;
    }
  },

  getResource: async (
    id: string,
    date?: string
  ): Promise<{ status: string; data: ResourceWithReservations }> => {
    try {
      // Use the date provided or get today's date
      const formattedDate = date || formatDateToYYYYMMDD(new Date());

      // Get the resource details with the date parameter to include reservations
      const resourceResponse: AxiosResponse = await api.get(
        `/api/resources/${id}`,
        {
          params: {
            date: formattedDate,
          },
        }
      );

      // If no reservations array, initialize it
      if (!resourceResponse.data.data.reservations) {
        resourceResponse.data.data.reservations = [];
      }

      // Direct approach: Fetch all reservations for this specific resource on the given date
      const reservationsResponse: AxiosResponse = await api.get(
        `/api/reservations`,
        {
          params: {
            resourceId: id,
            date: formattedDate,
            status: "PENDING,CONFIRMED,CHECKED_IN", // Include pending reservations too
          },
        }
      );

      // If we have reservations, add them to the resource
      if (
        reservationsResponse.data?.status === "success" &&
        Array.isArray(reservationsResponse.data?.data) &&
        reservationsResponse.data.data.length > 0
      ) {
        // Replace the reservations with the ones we just fetched
        resourceResponse.data.data.reservations =
          reservationsResponse.data.data;
      } else {
        // Ensure we have an empty array if no reservations were found
        resourceResponse.data.data.reservations = [];
      }

      return resourceResponse.data;
    } catch (error: any) {
      console.error("Error in getResource:", error);
      throw error;
    }
  },

  createResource: async (
    resource: Omit<Resource, "id" | "createdAt" | "updatedAt">
  ): Promise<{ status: string; data: Resource }> => {
    try {
      const response: AxiosResponse = await api.post(
        "/api/resources",
        resource
      );
      return response.data;
    } catch (error: any) {
      console.error("Error in createResource:", error);
      throw error;
    }
  },

  updateResource: async (
    id: string,
    resource: Partial<Resource>
  ): Promise<{ status: string; data: Resource }> => {
    try {
      const response: AxiosResponse = await api.put(
        `/api/resources/${id}`,
        resource
      );
      return response.data;
    } catch (error: any) {
      console.error("Error in updateResource:", error);
      throw error;
    }
  },

  deleteResource: async (id: string): Promise<void> => {
    try {
      await api.delete(`/api/resources/${id}`);
    } catch (error: any) {
      console.error("Error in deleteResource:", error);
      throw error;
    }
  },

  // Suite-specific methods - using resource endpoints with filters
  getSuites: async (
    type?: string,
    status?: string,
    search?: string,
    date?: string
  ): Promise<{
    status: string;
    data: ResourceWithReservations[];
    results?: number;
  }> => {
    try {
      // Use the resources endpoint to fetch all boarding kennels
      // Kennel types: JUNIOR_KENNEL, QUEEN_KENNEL, KING_KENNEL, VIP_ROOM, CAT_CONDO
      // Also include legacy KENNEL type for backward compatibility

      // To get all resources, implement pagination
      let allResources: Resource[] = [];
      let currentPage = 1;
      let totalPages = 1;
      const pageSize = 100; // Fetch 100 per page for efficiency

      // Fetch all resources without type filter, then filter client-side
      // This ensures we get all kennel types
      do {
        const response: AxiosResponse = await api.get("/api/resources", {
          params: {
            page: currentPage,
            limit: pageSize,
            date: date, // Include date parameter for potential filtering
          },
        });

        if (
          response?.data?.status === "success" &&
          Array.isArray(response?.data?.data)
        ) {
          allResources = allResources.concat(response.data.data);
          totalPages = response.data.totalPages || 1;

          currentPage++; // Increment AFTER processing the response
        } else {
          break; // Exit the loop if we got an invalid response
        }
      } while (currentPage <= totalPages);

      // Now fetch reservations for each suite to determine occupancy
      const formattedDate = date || formatDateToYYYYMMDD(new Date());

      // Get all reservations that overlap with the specified date
      // A reservation overlaps if: reservation.startDate <= date AND reservation.endDate >= date
      const reservationsResponse = await api.get("/api/reservations", {
        params: {
          date: formattedDate, // Use single date param to find overlapping reservations
          status: "PENDING,CONFIRMED,CHECKED_IN",
          page: 1,
          limit: 500, // Backend max is 500
        },
      });

      const reservations = reservationsResponse?.data?.data?.reservations || [];

      // Attach reservations to each resource
      const resourcesWithReservations: ResourceWithReservations[] =
        allResources.map((resource) => {
          const resourceReservations = reservations.filter(
            (reservation: any) => reservation.resourceId === resource.id
          );

          if (resourceReservations.length > 0) {
          }

          return {
            ...resource,
            reservations: resourceReservations,
          };
        });

      // Return the same structure as the API but with all resources combined and enriched
      return {
        status: "success",
        data: resourcesWithReservations,
        results: resourcesWithReservations.length,
      };
    } catch (error: any) {
      console.error("Error in getSuites:", error);
      throw error;
    }
  },

  getSuiteStats: async (
    date?: string
  ): Promise<{
    status: string;
    data: {
      total: number;
      occupied: number;
      available: number;
      reserved: number;
      maintenance: number;
      needsCleaning: number;
      occupancyRate: number;
    };
  }> => {
    try {
      // Use the same logic as getSuites to get enriched data with reservations
      const suitesResponse = await resourceService.getSuites(
        undefined,
        undefined,
        undefined,
        date
      );

      if (
        suitesResponse.status !== "success" ||
        !Array.isArray(suitesResponse.data)
      ) {
        throw new Error("Failed to fetch suites data for stats calculation");
      }

      // Calculate stats
      let total = 0;
      let available = 0;
      let occupied = 0;
      let reserved = 0;
      let maintenance = 0;
      let needsCleaning = 0;

      const suites = suitesResponse.data;

      for (const suite of suites) {
        total++;

        // Check if suite has active reservations
        const hasActiveReservations =
          suite.reservations && suite.reservations.length > 0;

        // Determine the status of each suite
        const maintenanceStatus =
          (suite as any).maintenanceStatus ||
          suite.attributes?.maintenanceStatus;
        const lastCleaned =
          (suite as any).lastCleanedAt || suite.attributes?.lastCleaned;

        if (
          maintenanceStatus === "MAINTENANCE" ||
          maintenanceStatus === "OUT_OF_ORDER"
        ) {
          maintenance++;
        } else if (
          maintenanceStatus === "NEEDS_CLEANING" ||
          (lastCleaned &&
            new Date(lastCleaned) < new Date(Date.now() - 24 * 60 * 60 * 1000))
        ) {
          needsCleaning++;
        } else if (hasActiveReservations && suite.reservations) {
          // Check reservation status to determine if occupied or reserved
          const reservation = suite.reservations[0];
          if (
            reservation.status === "CONFIRMED" ||
            reservation.status === "CHECKED_IN"
          ) {
            occupied++;
          } else if (reservation.status === "PENDING") {
            reserved++;
          } else {
            available++;
          }
        } else {
          available++;
        }
      }

      // Calculate occupancy rate
      const occupancyRate =
        total > 0 ? Math.round(((occupied + reserved) / total) * 100) : 0;

      return {
        status: "success",
        data: {
          total,
          occupied,
          reserved,
          available,
          maintenance,
          needsCleaning,
          occupancyRate,
        },
      };
    } catch (error: any) {
      console.error("Error in getSuiteStats:", error);
      throw error;
    }
  },

  updateSuiteCleaning: async (
    id: string,
    data: { maintenanceStatus: string; notes?: string }
  ): Promise<{ status: string; data: Resource }> => {
    try {
      // Use the standard resource update endpoint instead
      const response: AxiosResponse = await api.patch(`/api/resources/${id}`, {
        maintenanceStatus: data.maintenanceStatus,
        notes: data.notes,
      });
      return response.data;
    } catch (error: any) {
      console.error("Error in updateSuiteCleaning:", error);
      throw error;
    }
  },

  // This method would require a special endpoint on the backend
  // For now, we'll implement a fallback that returns a helpful message
  initializeSuites: async (options: {
    count: number;
    vipCount: number;
    standardPlusCount: number;
  }): Promise<{ status: string; message: string; data: any }> => {
    try {
      // Since this is a specialized operation, we don't have a direct equivalent in the resource API
      // In a production environment, you would implement this endpoint on the backend
      console.warn(
        "Suite initialization endpoint not available in this version"
      );
      return {
        status: "error",
        message:
          "Suite initialization is not available in this version of the API",
        data: null,
      };
    } catch (error: any) {
      console.error("Error in initializeSuites:", error);
      throw error;
    }
  },

  // Get available resources by date range
  getAvailableResourcesByDate: async (
    startDate: string,
    endDate: string,
    serviceId?: string
  ): Promise<{ status: string; data: Resource[] }> => {
    try {
      // Determine resourceType from serviceId -> serviceCategory mapping
      let resourceType: string | undefined;

      if (serviceId) {
        try {
          const svcResp = await serviceManagement.getServiceById(serviceId);
          // Handle possible response shapes
          const service =
            (svcResp?.data?.id ? svcResp.data : svcResp?.data) || svcResp;
          const category: ServiceCategory | string | undefined =
            service?.serviceCategory || service?.category;

          const mapServiceCategoryToResourceType = (
            cat?: ServiceCategory | string
          ): string | undefined => {
            switch (cat) {
              case ServiceCategory.BOARDING:
              case "BOARDING":
                return "SUITE";
              case ServiceCategory.DAYCARE:
              case "DAYCARE":
                // Using SUITE for daycare to align with current suite-based selection flow
                return "SUITE";
              case ServiceCategory.GROOMING:
              case "GROOMING":
                return "GROOMING_TABLE";
              case ServiceCategory.TRAINING:
              case "TRAINING":
                return "TRAINING_ROOM";
              default:
                return "OTHER";
            }
          };

          resourceType = mapServiceCategoryToResourceType(category);
        } catch (e) {
          console.warn(
            "Unable to resolve service by ID to map resourceType; proceeding without service filter",
            e
          );
        }
      }

      // Build params for backend availability endpoint
      const params: Record<string, string> = {
        startDate,
        endDate,
      };
      if (resourceType) params.resourceType = resourceType;

      const response: AxiosResponse = await api.get(
        "/api/resources/availability",
        { params }
      );

      // Normalize backend response to the array of available resources expected by callers
      // Backend shape: { status, data: { resources: [{ resourceId, name, type, isAvailable, ... }] } }
      const resources = Array.isArray(response?.data?.data?.resources)
        ? response.data.data.resources
        : Array.isArray(response?.data)
        ? response.data
        : [];

      const normalized: Resource[] = (resources as any[])
        .filter(
          (r) => r && (r.isAvailable === undefined || r.isAvailable === true)
        )
        .map(
          (r: any) =>
            ({
              id: r.id || r.resourceId,
              name: r.name || r.resourceName || "Resource",
              type: r.type || r.resourceType || "OTHER",
              capacity: "capacity" in r ? r.capacity : 1,
              attributes: "attributes" in r ? r.attributes : undefined,
              isActive: true,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            } as Resource)
        );

      return { status: "success", data: normalized };
    } catch (error: any) {
      console.error("Error in getAvailableResourcesByDate:", error);
      throw error;
    }
  },

  /**
   * Check if a specific resource is available on a given date
   * Uses the new backend resource availability API
   *
   * @param resourceId - ID of the resource to check
   * @param date - Date to check in YYYY-MM-DD format
   * @returns Promise resolving to an object with availability status and conflicting reservations
   */
  checkResourceAvailability: async (
    resourceId: string,
    date: string
  ): Promise<{
    status: string;
    data: {
      resourceId: string;
      isAvailable: boolean;
      checkDate: string;
      conflictingReservations?: any[];
    };
  }> => {
    try {
      const response: AxiosResponse = await api.get(
        "/api/resources/availability",
        {
          params: { resourceId, date },
        }
      );
      return response.data;
    } catch (error: any) {
      console.error("Error in checkResourceAvailability:", error);
      throw error;
    }
  },

  /**
   * Check availability for multiple resources at once
   * Uses the new backend batch resource availability API
   *
   * @param resourceIds - Array of resource IDs to check
   * @param startDate - Start date in YYYY-MM-DD format
   * @param endDate - End date in YYYY-MM-DD format
   * @returns Promise resolving to an object with availability status for each resource
   */
  batchCheckResourceAvailability: async (
    resourceIds: string[],
    startDate: string,
    endDate: string
  ): Promise<{
    status: string;
    data: {
      checkDate: string | null;
      checkStartDate: string;
      checkEndDate: string;
      resources: Array<{
        resourceId: string;
        isAvailable: boolean;
        conflictingReservations?: any[];
      }>;
    };
  }> => {
    // Guard: Don't call API with empty resourceIds array
    if (!resourceIds || resourceIds.length === 0) {
      return {
        status: "success",
        data: {
          checkDate: null,
          checkStartDate: startDate,
          checkEndDate: endDate,
          resources: [],
        },
      };
    }

    try {
      const response: AxiosResponse = await api.post(
        "/api/resources/availability/batch",
        {
          resourceIds, // Backend expects 'resourceIds' not 'resources'
          startDate,
          endDate,
        }
      );
      return response.data;
    } catch (error: any) {
      console.error("Error in batchCheckResourceAvailability:", error);
      throw error;
    }
  },
};
