import React, { useState, useEffect } from "react";
import {
  Box,
  Button,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography,
  Paper,
  Alert,
  Autocomplete,
  CircularProgress,
  InputAdornment,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import DeleteIcon from "@mui/icons-material/Delete";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { TimePicker } from "@mui/x-date-pickers/TimePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import Grid from "@mui/material/Grid";
import { Customer } from "../../types/customer";
import { Pet } from "../../types/pet";
import { Service } from "../../types/service";
import { customerService } from "../../services/customerService";
import { petService } from "../../services/petService";
import { serviceManagement } from "../../services/serviceManagement";
import { resourceService, type Resource } from "../../services/resourceService";
import { getRoomSizeDisplayName } from "../../types/resource";
import { useResponsive, getResponsiveButtonSize } from "../../utils/responsive";
import AddOnSelectionDialogEnhanced from "./AddOnSelectionDialogEnhanced";
import GroomerSelector from "./GroomerSelector";
import { useShoppingCart } from "../../contexts/ShoppingCartContext";
import { useNavigate } from "react-router-dom";
import {
  getServiceNameForResourceType,
  shouldAutoSelectService,
} from "../../config/resource-service-mapping";
import { parseGingrDate } from "../../utils/dateUtils";

/**
 * Props for the ReservationForm component
 */
interface ReservationFormProps {
  /**
   * Callback function called when the form is submitted
   * @param formData - The form data for the reservation
   * @returns A promise with the created/updated reservation result
   */
  onSubmit: (formData: any) => Promise<{ reservationId?: string } | void>;

  /**
   * Optional initial data for editing an existing reservation
   */
  initialData?: any;

  /**
   * Optional default dates for a new reservation
   */
  defaultDates?: {
    /** Start date and time */
    start: Date;
    /** End date and time */
    end: Date;
  };

  /**
   * Whether to show add-on services in the form
   */
  showAddOns?: boolean;

  /**
   * Optional array of service categories to filter services by
   * If provided, only services matching these categories will be shown
   */
  serviceCategories?: string[];

  /**
   * Optional callback to close the parent form/dialog
   */
  onClose?: () => void;
}

/**
 * Form component for creating and editing reservations
 *
 * This component provides a form interface for managing reservations, including:
 * - Customer selection
 * - Pet selection (filtered by selected customer)
 * - Service selection
 * - Date and time selection
 * - Form validation
 * - Error handling
 *
 * @component
 * @example
 * ```tsx
 * <ReservationForm
 *   onSubmit={handleSubmit}
 *   initialData={existingReservation}
 *   defaultDates={{ start: new Date(), end: new Date() }}
 * />
 * ```
 */
const ReservationForm: React.FC<ReservationFormProps> = ({
  onSubmit,
  initialData,
  defaultDates,
  showAddOns = false,
  serviceCategories,
  onClose,
}) => {
  // Responsive hooks
  const { isMobile } = useResponsive();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [pets, setPets] = useState<Pet[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<string>("");
  const [selectedCustomerObj, setSelectedCustomerObj] =
    useState<Customer | null>(null);
  const [customerSearchInput, setCustomerSearchInput] = useState<string>("");
  const [customerSearchResults, setCustomerSearchResults] = useState<
    Customer[]
  >([]);
  const [petSearchResults, setPetSearchResults] = useState<Pet[]>([]);
  const [customerSearchLoading, setCustomerSearchLoading] =
    useState<boolean>(false);
  const [selectedPet, setSelectedPet] = useState<string>("");
  const [selectedPets, setSelectedPets] = useState<string[]>([]);
  const [petSuiteAssignments, setPetSuiteAssignments] = useState<{
    [petId: string]: string;
  }>({});
  const [occupiedSuiteIds, setOccupiedSuiteIds] = useState<Set<string>>(
    new Set()
  );
  const [selectedService, setSelectedService] = useState<string>("");
  const [selectedGroomerId, setSelectedGroomerId] = useState<string>("");
  const [selectedSuiteType, setSelectedSuiteType] = useState<string>("");
  const [selectedStatus, setSelectedStatus] = useState<string>("CONFIRMED");
  const [startDate, setStartDate] = useState<Date | null>(
    defaultDates?.start || null
  );
  const [endDate, setEndDate] = useState<Date | null>(
    defaultDates?.end || null
  );
  const [currentServiceDuration, setCurrentServiceDuration] = useState<
    number | null
  >(null);
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

  // Shopping cart and navigation hooks
  const { addItem } = useShoppingCart();
  const navigate = useNavigate();

  // Kennel/suite override state
  const [availableSuites, setAvailableSuites] = useState<Resource[]>([]);
  const [suiteLoading, setSuiteLoading] = useState(false);
  const [suiteError, setSuiteError] = useState<string>("");
  const [selectedSuiteId, setSelectedSuiteId] = useState<string>("");

  // Track if service was auto-selected from resource (disables service dropdown)
  const [serviceAutoSelected, setServiceAutoSelected] =
    useState<boolean>(false);
  const [preSelectedResource, setPreSelectedResource] =
    useState<Resource | null>(null);

  // Use a ref to track if the form has been initialized
  // This prevents multiple initializations that can cause select value errors
  const initialDataLoaded = React.useRef(false);

  // Use a ref to track which select components have valid options loaded
  // This prevents out-of-range value errors when options aren't loaded yet
  const selectsWithOptions = React.useRef({
    customer: false,
    pet: false,
    service: false,
    suiteType: false,
    suiteId: false,
  });

  // Delete confirmation dialog state
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const loadInitialData = async () => {
      // Only load initial data once to prevent duplicate initializations
      if (initialDataLoaded.current) return;

      console.log("ReservationForm initialData:", initialData);

      try {
        setLoading(true);

        // Build service query params - use category filter if only one category specified
        const serviceParams: { limit: number; category?: string } = {
          limit: 100,
        };
        if (serviceCategories && serviceCategories.length === 1) {
          serviceParams.category = serviceCategories[0];
        }

        const [customersResponse, servicesResponse] = await Promise.all([
          customerService.getAllCustomers(1, 100), // Load more customers initially
          serviceManagement.getAllServices(serviceParams),
        ]);

        setCustomers(customersResponse.data || []);
        selectsWithOptions.current.customer =
          (customersResponse.data || []).length > 0;

        // Filter services by categories if multiple categories provided
        let filteredServices = servicesResponse.data || [];
        if (serviceCategories && serviceCategories.length > 1) {
          filteredServices = filteredServices.filter((service: any) =>
            serviceCategories.includes(service.serviceCategory)
          );
        }

        setServices(filteredServices);
        selectsWithOptions.current.service = filteredServices.length > 0;

        // Mark that suite type options are always available since they're hardcoded
        selectsWithOptions.current.suiteType = true;

        if (initialData) {
          // Set dates if they exist in initialData
          // Use parseGingrDate to handle Gingr's local-time-with-Z-suffix format
          if (initialData.startDate) {
            const parsedStart = parseGingrDate(initialData.startDate);
            if (parsedStart) setStartDate(parsedStart);
          }
          if (initialData.endDate) {
            const parsedEnd = parseGingrDate(initialData.endDate);
            if (parsedEnd) setEndDate(parsedEnd);
          }
          // Set initial status if provided
          if (initialData.status) {
            setSelectedStatus(initialData.status);
          }

          // Set customer ID - fetch the specific customer if not in initial list
          const customersList = customersResponse.data || [];
          if (initialData.customerId) {
            // Check if customer is in the list
            let customerExists = customersList.some(
              (c: Customer) => c.id === initialData.customerId
            );

            // If not in list, fetch the specific customer
            if (!customerExists && initialData.customer) {
              // Add the customer from initialData to the list
              const customer = initialData.customer;
              customersList.push(customer);
              setCustomers(customersList);
              customerExists = true;
            }

            if (customerExists) {
              setSelectedCustomer(initialData.customerId);
              // Also set the customer object for the Autocomplete
              const customerObj = customersList.find(
                (c: Customer) => c.id === initialData.customerId
              );
              if (customerObj) {
                setSelectedCustomerObj(customerObj);
              }
              selectsWithOptions.current.customer = true;

              // Load pets for the selected customer
              try {
                const petsResponse = await petService.getPetsByCustomer(
                  initialData.customerId
                );
                let petsData = petsResponse.data || [];
                console.log(
                  "Loaded pets:",
                  petsData.length,
                  "Looking for petId:",
                  initialData.petId
                );

                // Check if pet exists in the list
                let petExists =
                  initialData.petId &&
                  petsData.some((p) => p.id === initialData.petId);

                // If not in list, add the pet from initialData
                if (!petExists && initialData.pet) {
                  console.log("Adding pet from initialData:", initialData.pet);
                  petsData.push(initialData.pet);
                  petExists = true;
                }

                setPets(petsData);
                selectsWithOptions.current.pet = petsData.length > 0;

                // Set pet ID if it exists
                if (petExists && initialData.petId) {
                  console.log("Setting selected pet:", initialData.petId);
                  setSelectedPet(initialData.petId);
                  // Also set selectedPets array for the multi-select dropdown
                  setSelectedPets([initialData.petId]);
                } else if (!petExists) {
                  console.warn(
                    "Pet not found in list and no pet object in initialData:",
                    initialData.petId
                  );
                }
              } catch (err) {
                console.error("Error loading pets:", err);
                setPets([]);
              }
            } else {
              console.warn("Customer not found:", initialData.customerId);
            }
          }

          // Only set service ID - add service from initialData if not in list
          const servicesList = servicesResponse.data || [];
          console.log(
            "Services loaded:",
            servicesList.length,
            "Looking for serviceId:",
            initialData.serviceId
          );
          if (initialData.serviceId) {
            let serviceExists = servicesList.some(
              (s: Service) => s.id === initialData.serviceId
            );

            // If not in list, add the service from initialData
            if (!serviceExists && initialData.service) {
              console.log(
                "Adding service from initialData:",
                initialData.service
              );
              servicesList.push(initialData.service);
              setServices(servicesList);
              serviceExists = true;
            }

            if (serviceExists) {
              console.log("Setting selected service:", initialData.serviceId);
              setSelectedService(initialData.serviceId);
            } else {
              console.warn(
                "Service not found in list and no service object in initialData:",
                initialData.serviceId
              );
            }
          }

          // Set groomer if assigned
          if (initialData.staffAssignedId) {
            setSelectedGroomerId(initialData.staffAssignedId);
          }

          // Mark that initial data has been loaded
          initialDataLoaded.current = true;

          // Set resource ID or suite type
          if (initialData.resourceId || initialData.kennelId) {
            // Use resourceId or kennelId (from calendar)
            const effectiveResourceId =
              initialData.resourceId || initialData.kennelId;

            // IMMEDIATELY set the selected suite ID so it's available
            setSelectedSuiteId(effectiveResourceId);

            // Fetch resource details to get the suite type and auto-select service
            try {
              const resourceResponse = await resourceService.getResource(
                effectiveResourceId
              );

              if (resourceResponse.data) {
                const resource = resourceResponse.data;
                const resourceType = resource.type;

                // Store the pre-selected resource
                setPreSelectedResource(resource);

                if (resourceType) {
                  setSelectedSuiteType(resourceType);

                  // Auto-select service based on resource type
                  if (shouldAutoSelectService(resourceType)) {
                    const serviceName =
                      getServiceNameForResourceType(resourceType);
                    if (serviceName) {
                      // Find the service by name
                      const matchingService = servicesList.find(
                        (s: Service) => s.name === serviceName
                      );
                      if (matchingService) {
                        console.log(
                          "Auto-selecting service based on resource type:",
                          serviceName
                        );
                        setSelectedService(matchingService.id);
                        setServiceAutoSelected(true);
                      }
                    }
                  }
                } else if (initialData.suiteType) {
                  setSelectedSuiteType(initialData.suiteType);
                }
              }
            } catch (err) {
              console.error("Error fetching resource details:", err);

              // Fallback to suite type if resource fetch fails
              if (initialData.suiteType) {
                setSelectedSuiteType(initialData.suiteType);
              }
            }
          } else if (initialData.suiteType) {
            setSelectedSuiteType(initialData.suiteType);
          }
        }
        // End of initialData handling
      } catch (err) {
        setError("Failed to load initial data");
        console.error("Error loading initial data:", err);
      } finally {
        setLoading(false);
      }
    };

    loadInitialData();
  }, [initialData, serviceCategories]);

  // Auto-select service when resource type is set and services are loaded
  // This handles the case where services load after the resource is fetched
  useEffect(() => {
    if (
      preSelectedResource?.type &&
      services.length > 0 &&
      !selectedService &&
      !serviceAutoSelected
    ) {
      const resourceType = preSelectedResource.type;
      if (shouldAutoSelectService(resourceType)) {
        const serviceName = getServiceNameForResourceType(resourceType);
        if (serviceName) {
          const matchingService = services.find(
            (s: Service) => s.name === serviceName
          );
          if (matchingService) {
            console.log(
              "Auto-selecting service (delayed) based on resource type:",
              serviceName
            );
            setSelectedService(matchingService.id);
            setServiceAutoSelected(true);
          }
        }
      }
    }
  }, [preSelectedResource, services, selectedService, serviceAutoSelected]);

  /**
   * Handle customer selection change
   * Loads the selected customer's pets and updates the form state
   * @param customerId - The selected customer ID
   */
  const handleCustomerChange = async (
    customerId: string,
    customerObj?: Customer | null
  ) => {
    setSelectedCustomer(customerId);
    setSelectedCustomerObj(customerObj || null);
    setSelectedPet(""); // Reset pet selection when customer changes
    setSelectedPets([]); // Reset multiple pet selection when customer changes
    setPetSuiteAssignments({}); // Reset suite assignments when customer changes

    // Immediately load pets for the selected customer
    if (customerId) {
      try {
        const response = await petService.getPetsByCustomer(customerId);

        // Extract pets from the response, handling different response structures
        let petsData: Pet[] = [];

        // Check if response.data is directly an array
        if (Array.isArray(response.data)) {
          petsData = response.data;
        }
        // Check if response.data is an object with a data property that's an array
        else if (response.data && typeof response.data === "object") {
          // Use type assertion to let TypeScript know this is an object with a data property
          const responseObj = response.data as Record<string, unknown>;
          if ("data" in responseObj && Array.isArray(responseObj.data)) {
            petsData = responseObj.data as Pet[];
          }
        }

        // Update the pets state with the fetched data
        setPets(petsData);

        // Mark that pet options are available
        selectsWithOptions.current.pet = petsData.length > 0;

        // Auto-select the pet if the customer has only one pet
        if (petsData.length === 1) {
          setSelectedPet(petsData[0].id);
        }
      } catch (err) {
        console.error("Error loading pets:", err);
        setPets([]);
      }
    } else {
      setPets([]);
    }
  };

  /**
   * Handle customer/pet search input change
   * Searches for BOTH customers and pets matching the input text
   * Only triggers search when at least 2 characters are entered
   * @param searchText - The search text entered by the user
   */
  const handleCustomerSearch = async (searchText: string) => {
    setCustomerSearchInput(searchText);

    if (!searchText || searchText.length < 2) {
      setCustomerSearchResults([]);
      setPetSearchResults([]);
      return;
    }

    try {
      setCustomerSearchLoading(true);

      // Search both customers and pets in parallel
      const [customerResponse, petResponse] = await Promise.all([
        customerService.searchCustomers(searchText),
        petService.searchPets(searchText),
      ]);

      // Set customer results
      if (customerResponse && customerResponse.data) {
        setCustomerSearchResults(customerResponse.data || []);
      } else {
        setCustomerSearchResults([]);
      }

      // Set pet results
      if (petResponse && petResponse.data) {
        setPetSearchResults(petResponse.data || []);
      } else {
        setPetSearchResults([]);
      }
    } catch (error) {
      console.error("Error searching for customers/pets:", error);
      setCustomerSearchResults([]);
      setPetSearchResults([]);
    } finally {
      setCustomerSearchLoading(false);
    }
  };

  useEffect(() => {
    // Only handle the initial data case when the form first loads
    // Otherwise, we'll rely on the handleCustomerChange function for normal pet loading
    const loadInitialPets = async () => {
      if (!selectedCustomer || !initialData?.petId) {
        return;
      }

      try {
        const response = await petService.getPetsByCustomer(selectedCustomer);

        // Extract pets from the response, handling different response structures
        let petsData: Pet[] = [];

        // Check if response.data is directly an array
        if (Array.isArray(response.data)) {
          petsData = response.data;
        }
        // Check if response.data is an object with a data property that's an array
        else if (response.data && typeof response.data === "object") {
          // Use type assertion to let TypeScript know this is an object with a data property
          const responseObj = response.data as Record<string, unknown>;
          if ("data" in responseObj && Array.isArray(responseObj.data)) {
            petsData = responseObj.data as Pet[];
          }
        }

        // Only update pets if not already set by handleCustomerChange
        if (petsData.length > 0 && pets.length === 0) {
          setPets(petsData);
          selectsWithOptions.current.pet = true;
        }

        // If we have initialData with a petId, check if it's valid for this customer
        if (initialData?.petId) {
          // Check if the pet ID from initialData exists in the loaded pets
          const petExists = petsData.some(
            (pet) => pet.id === initialData.petId
          );
          if (petExists) {
            setSelectedPet(initialData.petId);
          }
        }
      } catch (err) {
        console.error("Error loading initial pets:", err);
      }
    };

    // Only run this effect when initialDataLoaded changes
    if (initialDataLoaded.current && initialData) {
      loadInitialPets();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialData, selectedCustomer, pets]); // initialDataLoaded.current is a ref and doesn't need to be in deps

  // Reset suiteType and suite override if service changes to a category that doesn't require it
  useEffect(() => {
    if (!selectedService) return;

    const selectedServiceObj = services.find((s) => s.id === selectedService);
    const requiresSuiteType =
      selectedServiceObj &&
      (selectedServiceObj.serviceCategory === "DAYCARE" ||
        selectedServiceObj.serviceCategory === "BOARDING");

    if (!requiresSuiteType) {
      setSelectedSuiteType("");
      setSelectedSuiteId("");
      setAvailableSuites([]);
    }
  }, [selectedService, services]);

  // State to track if dropdown should be rendered
  const [dropdownReady, setDropdownReady] = useState(false);

  // State for add-ons dialog
  const [addOnsDialogOpen, setAddOnsDialogOpen] = useState(false);
  const [newReservationId, setNewReservationId] = useState<string>("");
  const [selectedServiceId, setSelectedServiceId] = useState<string>("");

  // Monitor add-ons dialog state changes
  useEffect(() => {
    if (addOnsDialogOpen && newReservationId) {
      // No longer forcing refresh - this was causing an infinite loop
    }
  }, [addOnsDialogOpen, newReservationId, selectedServiceId]);

  // Fetch available suites when suite type changes
  useEffect(() => {
    const loadAvailableSuites = async () => {
      // Always load kennels when a boarding service is selected
      // selectedSuiteType is now used as an optional filter, not a requirement

      setDropdownReady(false); // Reset dropdown ready state
      try {
        setSuiteLoading(true);
        let suites: Resource[] = [];

        // Fetch all KENNEL type resources
        const response = await resourceService.getAllResources(
          1, // page
          500, // limit - get all kennels
          "name", // sortBy
          "asc", // sortOrder
          "KENNEL" // type filter - get all kennels
        );

        if (response?.status === "success" && response?.data) {
          suites = response.data;

          // Apply size filter if one is selected
          if (selectedSuiteType) {
            suites = suites.filter(
              (suite) => (suite as any).size === selectedSuiteType
            );
          }
        }

        // If we're editing an existing reservation, make sure to include the current resource
        // even if it's not available (e.g., it's currently booked)
        const effectiveResourceId =
          initialData?.resourceId || initialData?.kennelId;

        if (effectiveResourceId) {
          const resourceExists = suites.some(
            (suite) => suite.id === effectiveResourceId
          );

          if (!resourceExists) {
            try {
              const resourceResponse = await resourceService.getResource(
                effectiveResourceId
              );

              if (
                resourceResponse?.status === "success" &&
                resourceResponse?.data
              ) {
                const resourceData = resourceResponse.data;

                // Only add it if it matches the selected suite type
                const resourceType =
                  resourceData.type || resourceData.attributes?.suiteType;

                if (resourceType === selectedSuiteType) {
                  suites.push(resourceData);
                }
              }
            } catch (err) {
              console.error("Error fetching specific resource:", err);
            }
          }
        }

        // First update available suites
        setAvailableSuites(suites);

        // Mark that suite options are available if we have suites
        selectsWithOptions.current.suiteId = suites.length > 0;

        // If we have initialData with a resourceId or kennelId, check if it's valid
        const resourceToCheck =
          initialData?.resourceId || initialData?.kennelId;

        if (resourceToCheck) {
          // Check if the resource ID exists in the available suites
          const suiteExists = suites.some(
            (suite) => suite.id === resourceToCheck
          );

          if (suiteExists) {
            // Only set the suite ID if it exists in the available suites
            setSelectedSuiteId(resourceToCheck);

            // Only set dropdown ready after both suites and selection are set
            setTimeout(() => {
              setDropdownReady(true);
            }, 100);
          } else {
            // If the resource doesn't exist, clear the selection
            setSelectedSuiteId("");
            setDropdownReady(true);
          }
        } else {
          // Clear the selection if no resource ID was provided
          setSelectedSuiteId("");
          setDropdownReady(true);
        }
      } catch (error) {
        console.error("Error loading available suites:", error);
        setAvailableSuites([]);
        setSuiteError("Error loading available suites");
        selectsWithOptions.current.suiteId = false;
        setDropdownReady(true);
      } finally {
        setSuiteLoading(false);
      }
    };

    loadAvailableSuites();
  }, [selectedSuiteType, initialData, selectedPets.length]);

  // Check availability for all suites when dates change
  useEffect(() => {
    const checkAvailability = async () => {
      if (!startDate || !endDate || availableSuites.length === 0) {
        setOccupiedSuiteIds(new Set());
        return;
      }

      try {
        // Check availability for all suites
        const suiteIds = availableSuites.map((s) => s.id);

        // Format dates as YYYY-MM-DD for the API
        const formatDate = (date: Date) => {
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, "0");
          const day = String(date.getDate()).padStart(2, "0");
          return `${year}-${month}-${day}`;
        };

        const response = await resourceService.batchCheckResourceAvailability(
          suiteIds,
          formatDate(startDate),
          formatDate(endDate)
        );

        if (response?.status === "success" && response?.data?.resources) {
          // Find which suites are occupied (not available)
          const occupied = new Set<string>();
          response.data.resources.forEach((result: any) => {
            if (!result.isAvailable) {
              // Check if this conflict is with the current reservation being edited
              const isCurrentReservation =
                initialData?.id &&
                result.conflictingReservations?.some(
                  (r: any) => r.id === initialData.id
                );

              // Only mark as occupied if it's NOT the current reservation
              if (!isCurrentReservation) {
                occupied.add(result.resourceId);
              } else {
              }
            }
          });
          setOccupiedSuiteIds(occupied);
        }
      } catch (error) {
        console.error("Error checking suite availability:", error);
        setOccupiedSuiteIds(new Set());
      }
    };

    checkAvailability();
  }, [startDate, endDate, availableSuites, initialData?.id]);

  /**
   * Handle proceeding to checkout
   * For grooming/training services: Creates the reservation first, then adds to cart with real ID
   * For boarding/daycare services: Adds reservation details to cart (reservation created during checkout)
   */
  const handleProceedToCheckout = async () => {
    setError("");
    setLoading(true);

    try {
      // Validate required fields
      if (
        !selectedCustomer ||
        !selectedPet ||
        !selectedService ||
        !startDate ||
        !endDate
      ) {
        setError("Please fill in all required fields");
        setLoading(false);
        return;
      }

      // Get the selected objects for detailed information
      const selectedCustomerObj = customers.find(
        (c) => c.id === selectedCustomer
      );
      const selectedPetObj = pets.find((p) => p.id === selectedPet);
      const selectedServiceObj = services.find((s) => s.id === selectedService);
      const selectedSuiteObj = availableSuites.find(
        (s) => s.id === selectedSuiteId
      );

      if (!selectedCustomerObj || !selectedPetObj || !selectedServiceObj) {
        console.error("Invalid selection debug:", {
          selectedCustomer,
          selectedPet,
          selectedService,
          customersCount: customers.length,
          petsCount: pets.length,
          servicesCount: services.length,
          foundCustomer: !!selectedCustomerObj,
          foundPet: !!selectedPetObj,
          foundService: !!selectedServiceObj,
        });
        setError("Invalid selection. Please try again.");
        setLoading(false);
        return;
      }

      // Check if this is a grooming or training service
      const isGroomingOrTraining =
        selectedServiceObj.serviceCategory === "GROOMING" ||
        selectedServiceObj.serviceCategory === "TRAINING";

      let reservationId: string | undefined;

      // For grooming/training, create the reservation first
      if (isGroomingOrTraining && onSubmit) {
        const formData: any = {
          customerId: selectedCustomer,
          petId: selectedPet,
          serviceId: selectedService,
          startDate: startDate ? startDate.toISOString() : null,
          endDate: endDate ? endDate.toISOString() : null,
          status: "PENDING", // Set as PENDING until payment is complete
          notes: "",
        };

        try {
          // Call onSubmit to create the reservation
          const result = await onSubmit(formData);

          if (result?.reservationId) {
            reservationId = result.reservationId;
          } else {
            throw new Error("Failed to create reservation");
          }
        } catch (error) {
          console.error("Error creating reservation:", error);
          throw error;
        }
      }

      // Create cart item with reservation details
      const cartItem = {
        id: reservationId
          ? `reservation-${reservationId}`
          : `reservation-${Date.now()}`,
        price: selectedServiceObj.price || 0,
        quantity: 1,
        serviceName: selectedServiceObj.name,
        serviceId: selectedServiceObj.id,
        serviceCategory: selectedServiceObj.serviceCategory, // Add service category for checkout navigation
        customerId: selectedCustomerObj.id,
        customerName: `${selectedCustomerObj.firstName} ${selectedCustomerObj.lastName}`,
        petId: selectedPetObj.id,
        petName: selectedPetObj.name,
        startDate: startDate,
        endDate: endDate,
        suiteType: selectedSuiteType || "STANDARD_SUITE",
        resourceId: selectedSuiteId || undefined,
        resourceName: selectedSuiteObj?.name || undefined,
        notes: "",
        addOns: [], // Will be handled in checkout if needed
      };

      // Add to shopping cart
      addItem(cartItem);

      // Navigate to checkout
      navigate("/checkout");
    } catch (error: any) {
      console.error("Error preparing checkout:", error);
      setError(error.message || "An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle reservation deletion
   */
  const handleDelete = async () => {
    if (!initialData?.id) {
      setError("No reservation ID found");
      return;
    }

    const getApiUrl = () => {
      if (process.env.NODE_ENV === "production") {
        return window.location.origin;
      }
      return process.env.REACT_APP_API_URL || "http://localhost:4003";
    };

    console.log("Deleting reservation:", initialData.id);
    setDeleting(true);
    try {
      const response = await fetch(
        `${getApiUrl()}/api/reservations/${initialData.id}`,
        {
          method: "DELETE",
          headers: {
            "x-tenant-id":
              localStorage.getItem("tailtown_tenant_id") ||
              localStorage.getItem("tenantId") ||
              "dev",
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.text();
        console.error("Delete failed:", response.status, errorData);
        throw new Error(`Failed to delete: ${response.status} - ${errorData}`);
      }

      console.log("Delete successful");
      setDeleteConfirmOpen(false);

      // Close the form and refresh
      if (onClose) {
        onClose();
      }

      // Reload the page to refresh the calendar
      window.location.reload();
    } catch (err: any) {
      console.error("Delete error:", err);
      setError(err.message || "Failed to delete reservation");
      setDeleteConfirmOpen(false);
    } finally {
      setDeleting(false);
    }
  };

  /**
   * Handle form submission
   * Validates the form data and calls the onSubmit callback
   * @param event - The form submission event
   */
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setLoading(true); // Set loading state while we process the form

    // Validate all required fields
    if (
      !selectedCustomer ||
      (selectedPets.length === 0 && !selectedPet) ||
      !selectedService ||
      !startDate ||
      !endDate
    ) {
      setError("Please fill in all required fields");
      setLoading(false);
      return;
    }

    // Validate kennel assignment for boarding/daycare services
    const selectedServiceObj = services.find((s) => s.id === selectedService);
    const requiresSuiteType =
      selectedServiceObj &&
      (selectedServiceObj.serviceCategory === "DAYCARE" ||
        selectedServiceObj.serviceCategory === "BOARDING");

    if (requiresSuiteType) {
      const petsToBook = selectedPets.length > 0 ? selectedPets : [selectedPet];
      const hasMultiplePets = petsToBook.length > 1;

      if (hasMultiplePets) {
        // For multiple pets, check that each pet has a kennel assigned (or auto-assign is selected)
        const unassignedPets = petsToBook.filter((petId) => {
          const assignment = petSuiteAssignments[petId];
          return assignment === undefined; // Empty string means auto-assign, which is OK
        });

        if (unassignedPets.length > 0) {
          const petNames = unassignedPets
            .map((petId) => {
              const pet = pets.find((p) => p.id === petId);
              return pet?.name || "Unknown";
            })
            .join(", ");
          setError(
            `Please assign kennels for all pets or select "Auto-assign": ${petNames}`
          );
          setLoading(false);
          return;
        }
      }
      // For single pet, selectedSuiteId can be empty (auto-assign) or have a value
      // No validation needed as auto-assign is acceptable
    }

    // Validate groomer assignment for grooming services
    const requiresGroomer =
      selectedServiceObj && selectedServiceObj.serviceCategory === "GROOMING";
    if (requiresGroomer && !selectedGroomerId) {
      setError("Please select a groomer for this grooming service");
      setLoading(false);
      return;
    }

    // Store service ID for later use with add-ons
    if (selectedService) {
      setSelectedServiceId(selectedService);
    }

    try {
      // Determine which pets to create reservations for
      const petsToBook = selectedPets.length > 0 ? selectedPets : [selectedPet];
      const hasMultiplePets = petsToBook.length > 1;

      // Handle resource selection based on suite type
      const selectedServiceObj = services.find((s) => s.id === selectedService);
      const requiresSuiteType =
        selectedServiceObj &&
        (selectedServiceObj.serviceCategory === "DAYCARE" ||
          selectedServiceObj.serviceCategory === "BOARDING");

      let effectiveSuiteType = selectedSuiteType;
      if (requiresSuiteType && !selectedSuiteType) {
        // Set a default suite type if none is selected
        effectiveSuiteType = "STANDARD_SUITE";
      }

      // Create reservations for each pet
      const results = [];
      for (let i = 0; i < petsToBook.length; i++) {
        const petId = petsToBook[i];

        // Get the suite assignment for this pet
        const assignedSuiteId = hasMultiplePets
          ? petSuiteAssignments[petId]
          : selectedSuiteId;

        // Create the form data object for this pet
        const formData: any = {
          customerId: selectedCustomer,
          petId: petId,
          serviceId: selectedService,
          startDate: startDate ? startDate.toISOString() : null,
          endDate: endDate ? endDate.toISOString() : null,
          status: selectedStatus,
          notes: hasMultiplePets
            ? `Multi-pet reservation (${i + 1} of ${petsToBook.length})`
            : "",
        };

        // Add groomer assignment for grooming services
        if (
          selectedGroomerId &&
          selectedServiceObj?.serviceCategory === "GROOMING"
        ) {
          formData.staffAssignedId = selectedGroomerId;
        }

        if (requiresSuiteType) {
          // Send suite type to backend for auto-assignment
          formData.suiteType = effectiveSuiteType;

          // Assign the specific resource for this pet
          if (assignedSuiteId && assignedSuiteId.trim() !== "") {
            formData.resourceId = assignedSuiteId;
          } else {
          }

          // If we have initialData with a kennelId but are not using it as resourceId,
          // include it as a separate field for backward compatibility
          if (
            initialData?.kennelId &&
            initialData.kennelId !== assignedSuiteId
          ) {
          }
        }

        // Call the parent component's onSubmit function with our form data

        const result = await onSubmit(formData);

        if (result) {
          results.push(result);
        }
      }

      // Use the first result for add-ons dialog
      const result = results[0];

      // If the result is undefined, it means there was an error in the parent component
      // The parent component will display the error, so we don't need to reset the form
      if (result === undefined) {
        setLoading(false);
        return;
      }

      // Show add-ons dialog only if showAddOns prop is true
      if (showAddOns && result?.reservationId) {
        // Set reservation ID for add-ons dialog
        setNewReservationId(result.reservationId);

        // Make sure we set the selectedServiceId for the add-ons dialog
        if (selectedService) {
          setSelectedServiceId(selectedService);

          // Open the add-ons dialog immediately
          setAddOnsDialogOpen(true);

          // Don't reset the form yet - we'll do it after add-ons are handled
          return;
        } else {
          console.warn("No selected service ID for add-ons dialog");
          handleReset();
        }
      } else {
        handleReset();
      }
    } catch (error: any) {
      console.error("Error in form submission:", error);
      setError(error.message || "An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <Typography>Loading...</Typography>;
  }

  // Reset the form to its initial state
  const handleReset = () => {
    // Only reset if we're not editing an existing reservation
    if (!initialData) {
      // Keep the customer selected but reset other fields
      setSelectedPet("");
      setSelectedPets([]);
      setSelectedService("");
      setSelectedSuiteType("");
      setSelectedSuiteId("");
      setStartDate(defaultDates?.start || null);
      setEndDate(defaultDates?.end || null);
    }
    // Reset form state
    setError("");
  };

  /**
   * Handler for when add-ons are added to a reservation
   * Closes the dialog and signals completion to parent components
   * @param success - Whether the add-ons were successfully added
   */
  const handleAddOnsAdded = (success: boolean) => {
    // Close the add-ons dialog regardless of success/failure
    setAddOnsDialogOpen(false);

    if (success) {
      // Reset the form to clear all fields
      handleReset();

      // Signal to the parent component that the reservation process is complete
      // This event will be caught by both KennelCalendar and SpecializedCalendar
      // to close the form dialog and refresh the calendar
      const event = new CustomEvent("reservationComplete", {
        detail: { success: true },
      });
      document.dispatchEvent(event);
    }
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Paper elevation={3} sx={{ p: 2 }}>
        <Box
          component="form"
          onSubmit={handleSubmit}
          sx={{ display: "flex", flexDirection: "column", gap: 1 }}
        >
          {error && (
            <Alert severity="error" sx={{ mb: 1 }}>
              {error}
            </Alert>
          )}

          {/* Display order number when editing an existing reservation */}
          {initialData && initialData.orderNumber && (
            <Box sx={{ mb: 2, display: "flex", alignItems: "center", gap: 1 }}>
              <Typography variant="subtitle1">Order Number:</Typography>
              <Typography
                variant="body1"
                sx={{ fontWeight: "bold", color: "primary.main" }}
              >
                {initialData.orderNumber}
              </Typography>
            </Box>
          )}
          {/* Customer/Pet search autocomplete - shows both customers and pets when user types 2+ characters */}
          <Autocomplete
            id="customer-search"
            filterOptions={(x) => x}
            options={
              customerSearchInput.length >= 2
                ? [
                    ...customerSearchResults.map((c) => ({
                      type: "customer" as const,
                      data: c,
                    })),
                    ...petSearchResults.map((p) => ({
                      type: "pet" as const,
                      data: p,
                    })),
                  ]
                : customers.map((c) => ({ type: "customer" as const, data: c }))
            }
            getOptionLabel={(option: {
              type: "customer" | "pet";
              data: Customer | Pet;
            }) => {
              if (!option || !option.data) return "";
              if (option.type === "customer") {
                const customer = option.data as Customer;
                return `${customer.firstName} ${customer.lastName}`;
              } else {
                const pet = option.data as Pet;
                const owner = pet.owner;
                return `${pet.name} (${
                  owner
                    ? `${owner.firstName} ${owner.lastName}`
                    : "Unknown Owner"
                }) - ${pet.breed || pet.type}`;
              }
            }}
            isOptionEqualToValue={(option, value) => {
              if (!option || !value) return false;
              if (option.type !== value.type) return false;
              return option.data.id === value.data.id;
            }}
            groupBy={(option) =>
              option.type === "customer" ? "👤 Customers" : "🐕 Pets"
            }
            loading={customerSearchLoading}
            onInputChange={(event, newInputValue) => {
              handleCustomerSearch(newInputValue);
            }}
            onChange={(
              event,
              newValue: {
                type: "customer" | "pet";
                data: Customer | Pet;
              } | null
            ) => {
              if (newValue) {
                if (newValue.type === "customer") {
                  const customer = newValue.data as Customer;
                  handleCustomerChange(customer.id, customer);
                } else {
                  // Pet selected - auto-select the customer
                  const pet = newValue.data as Pet;
                  if (pet.owner) {
                    // Create a customer object from pet.owner
                    const customerObj: Customer = {
                      id: pet.customerId,
                      firstName: pet.owner.firstName,
                      lastName: pet.owner.lastName,
                      email: "",
                      isActive: true,
                    };
                    handleCustomerChange(pet.customerId, customerObj);
                    // Also pre-select this pet
                    setSelectedPet(pet.id);
                    setSelectedPets([pet.id]);
                  }
                }
              } else {
                handleCustomerChange("", null);
              }
            }}
            value={
              selectedCustomerObj
                ? { type: "customer" as const, data: selectedCustomerObj }
                : null
            }
            renderInput={(params) => (
              <TextField
                {...params}
                label="Customer or Pet"
                size="small"
                required
                placeholder="Search by customer name, pet name, email, or phone"
                InputLabelProps={{
                  shrink: true,
                }}
                InputProps={{
                  ...params.InputProps,
                  endAdornment: (
                    <React.Fragment>
                      {customerSearchLoading ? (
                        <CircularProgress color="primary" size={20} />
                      ) : null}
                      {params.InputProps.endAdornment}
                    </React.Fragment>
                  ),
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon color="action" />
                    </InputAdornment>
                  ),
                }}
              />
            )}
            noOptionsText="No customers or pets found. Try a different search term."
            loadingText="Searching for customers and pets..."
            size="small"
            sx={{ mb: 1 }}
          />

          <Autocomplete
            multiple
            id="pet-select"
            options={pets}
            getOptionLabel={(option: Pet) => `${option.name} (${option.type})`}
            value={pets.filter((p) => selectedPets.includes(p.id))}
            isOptionEqualToValue={(option, value) => option.id === value.id}
            onChange={(event, newValue: Pet[]) => {
              const petIds = newValue.map((p) => p.id);
              setSelectedPets(petIds);
              // Also update single pet for backward compatibility
              if (petIds.length > 0) {
                setSelectedPet(petIds[0]);
              } else {
                setSelectedPet("");
              }

              // When pets are selected, pre-assign kennels intelligently
              if (petIds.length > 1) {
                const newAssignments: { [key: string]: string } = {};

                if (selectedSuiteId) {
                  // First pet gets the initially selected kennel
                  newAssignments[petIds[0]] = selectedSuiteId;

                  // Find the index of the selected suite
                  const selectedSuiteIndex = availableSuites.findIndex(
                    (s) => s.id === selectedSuiteId
                  );

                  // Assign subsequent pets to next available suites
                  for (let i = 1; i < petIds.length; i++) {
                    const nextSuiteIndex = selectedSuiteIndex + i;
                    if (nextSuiteIndex < availableSuites.length) {
                      newAssignments[petIds[i]] =
                        availableSuites[nextSuiteIndex].id;
                    } else {
                      // If we run out of adjacent kennels, set to empty string for auto-assign
                      newAssignments[petIds[i]] = "";
                    }
                  }
                } else {
                  // No kennel selected initially, set all to auto-assign
                  petIds.forEach((petId) => {
                    newAssignments[petId] = "";
                  });
                }

                setPetSuiteAssignments(newAssignments);
              } else if (petIds.length === 0) {
                // Clear assignments when no pets are selected
                setPetSuiteAssignments({});
              }
            }}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Pet(s)"
                size="small"
                placeholder={
                  pets.length > 0
                    ? "Select one or more pets"
                    : "No pets available"
                }
                InputLabelProps={{
                  shrink: true,
                }}
                helperText="You can select multiple pets for the same reservation"
                error={selectedPets.length === 0 && selectedPet === ""}
              />
            )}
            size="small"
            sx={{ mb: 1 }}
            noOptionsText="No pets available for this customer"
          />

          <FormControl fullWidth size="small" sx={{ mb: 1 }}>
            <InputLabel id="service-label" shrink={true}>
              Service{" "}
              {serviceAutoSelected && preSelectedResource
                ? `(${preSelectedResource.name})`
                : ""}
            </InputLabel>
            <Select
              labelId="service-label"
              id="service-select"
              value={
                selectsWithOptions.current.service &&
                services.some((s) => s.id === selectedService)
                  ? selectedService
                  : ""
              }
              label={`Service ${
                serviceAutoSelected && preSelectedResource
                  ? `(${preSelectedResource.name})`
                  : ""
              }`}
              disabled={serviceAutoSelected}
              // Add proper ARIA attributes to fix accessibility warning
              inputProps={{
                "aria-label": "Select a service",
                "aria-hidden": "false",
              }}
              onChange={(e) => {
                const serviceId = e.target.value;
                setSelectedService(serviceId);

                // Find the selected service to get its duration
                if (serviceId) {
                  const service = services.find((s) => s.id === serviceId);
                  if (service) {
                    if (service.duration) {
                      setCurrentServiceDuration(service.duration);
                    }

                    // Update end date based on service type
                    if (startDate) {
                      const newEndDate = new Date(startDate.getTime());

                      // For BOARDING services (overnight), set to 5pm next day instead of adding duration
                      if (service.serviceCategory === "BOARDING") {
                        newEndDate.setDate(newEndDate.getDate() + 1); // Next day
                        newEndDate.setHours(17, 0, 0, 0); // 5:00 PM
                      } else if (service.serviceCategory === "GROOMING") {
                        // For GROOMING services, default to 2 hours on same day
                        newEndDate.setMinutes(newEndDate.getMinutes() + 120);
                      } else if (service.duration) {
                        // For other services (DAYCARE), add the service duration
                        newEndDate.setMinutes(
                          newEndDate.getMinutes() + service.duration
                        );
                      }

                      setEndDate(newEndDate);
                    }
                  }
                }
              }}
              required
              displayEmpty
              notched
            >
              <MenuItem value="" disabled>
                Select a service
              </MenuItem>
              {services.map((service) => (
                <MenuItem key={service.id} value={service.id}>
                  {service.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Conditionally show Groomer Selector for Grooming services */}
          {(() => {
            const selectedServiceObj = services.find(
              (s) => s.id === selectedService
            );
            const isGroomingService =
              selectedServiceObj?.serviceCategory === "GROOMING";

            if (!isGroomingService) return null;

            return (
              <GroomerSelector
                selectedGroomerId={selectedGroomerId}
                onGroomerChange={setSelectedGroomerId}
                appointmentDate={startDate}
                appointmentStartTime={startDate}
                appointmentEndTime={endDate}
                disabled={loading}
              />
            );
          })()}

          {/* Conditionally show suiteType dropdown for Daycare or Boarding */}
          {(() => {
            const selectedServiceObj = services.find(
              (s) => s.id === selectedService
            );
            const requiresSuiteType =
              selectedServiceObj &&
              (selectedServiceObj.serviceCategory === "DAYCARE" ||
                selectedServiceObj.serviceCategory === "BOARDING");

            // If the service doesn't require a suite type, don't show the dropdown
            if (!requiresSuiteType) return null;

            return (
              <>
                {/* Room Size Filter - Optional filter to show only specific room sizes */}
                {!selectedSuiteId && (
                  <FormControl fullWidth size="small" sx={{ mb: 1 }}>
                    <InputLabel id="room-size-label" shrink={true}>
                      Room Size (Optional Filter)
                    </InputLabel>
                    <Select
                      labelId="room-size-label"
                      id="room-size-select"
                      value={selectedSuiteType || ""}
                      label="Room Size (Optional Filter)"
                      inputProps={{
                        "aria-label": "Filter by room size",
                        "aria-hidden": "false",
                      }}
                      onChange={(e) => {
                        const newSize = e.target.value;
                        setSelectedSuiteType(newSize);

                        // Reset suite selection when filter changes
                        if (selectedSuiteId) {
                          setSelectedSuiteId("");
                        }
                      }}
                      displayEmpty
                      notched
                    >
                      <MenuItem value="">All Sizes</MenuItem>
                      <MenuItem value="JUNIOR">Junior Suite (1 pet)</MenuItem>
                      <MenuItem value="QUEEN">Queen Suite (2 pets)</MenuItem>
                      <MenuItem value="KING">King Suite (4 pets)</MenuItem>
                      <MenuItem value="VIP">VIP Suite (4 pets)</MenuItem>
                      <MenuItem value="CAT">Cat Kennel (2 pets)</MenuItem>
                      <MenuItem value="OVERFLOW">Overflow (2 pets)</MenuItem>
                    </Select>
                  </FormControl>
                )}

                {/* Kennel/Suite Number Selection - Per Pet when multiple pets selected */}
                {requiresSuiteType && selectedPets.length > 1 && (
                  <Box
                    sx={{
                      mt: 2,
                      mb: 2,
                      p: 2,
                      border: "1px solid #e0e0e0",
                      borderRadius: 1,
                    }}
                  >
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        mb: 1,
                      }}
                    >
                      <Typography
                        variant="subtitle2"
                        sx={{ fontWeight: "bold" }}
                      >
                        Assign Kennels for Each Pet:
                      </Typography>
                      <Button
                        size="small"
                        variant="outlined"
                        color="primary"
                        onClick={() => {
                          console.log("Board Together clicked");
                          console.log(
                            "Available suites:",
                            availableSuites.length
                          );
                          console.log("Selected pets:", selectedPets.length);

                          // Get the first pet's assigned suite (or first available multi-pet suite)
                          const firstPetSuite =
                            petSuiteAssignments[selectedPets[0]];
                          let targetSuiteId = firstPetSuite;

                          // If first pet has no suite, find a multi-pet suite
                          if (!targetSuiteId) {
                            const multiPetSuite = availableSuites.find((s) => {
                              const capacity = (s as any).maxPets || 1;
                              const isAvailable =
                                capacity >= selectedPets.length &&
                                !occupiedSuiteIds.has(s.id);
                              console.log(
                                `Suite ${s.name}: capacity=${capacity}, needed=${selectedPets.length}, available=${isAvailable}`
                              );
                              return isAvailable;
                            });
                            targetSuiteId = multiPetSuite?.id || "";
                            console.log(
                              "Found multi-pet suite:",
                              multiPetSuite?.name,
                              targetSuiteId
                            );
                          }

                          // Assign all pets to the same suite
                          if (targetSuiteId) {
                            const newAssignments: { [key: string]: string } =
                              {};
                            selectedPets.forEach((petId) => {
                              newAssignments[petId] = targetSuiteId;
                            });
                            setPetSuiteAssignments(newAssignments);
                            alert(`All pets assigned to the same suite!`);
                          } else {
                            alert(
                              `No suitable multi-pet suite found. Available suites: ${availableSuites.length}. Please select a STANDARD_PLUS_SUITE or VIP_SUITE from the Suite Type dropdown above.`
                            );
                          }
                        }}
                        sx={{ textTransform: "none" }}
                      >
                        🏠 Board Together
                      </Button>
                    </Box>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ mb: 1, display: "block" }}
                    >
                      Multi-pet suites allow multiple pets from the same family.
                      Capacity is shown for each suite.
                    </Typography>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ mb: 2, display: "block" }}
                    >
                      🟢 Available • 🟡 At Capacity • 🔴 Occupied by existing
                      reservation
                    </Typography>{" "}
                    {selectedPets.map((petId, index) => {
                      const pet = pets.find((p) => p.id === petId);
                      const isFirstPet = index === 0;

                      return (
                        <Autocomplete
                          key={petId}
                          size="small"
                          options={[
                            { id: "", name: "Auto-assign" },
                            ...availableSuites,
                          ]}
                          value={
                            availableSuites.find(
                              (s) => s.id === petSuiteAssignments[petId]
                            ) || { id: "", name: "Auto-assign" }
                          }
                          isOptionEqualToValue={(option, value) =>
                            option.id === value.id
                          }
                          onChange={(event, newValue) => {
                            const suiteId = newValue?.id || "";
                            setPetSuiteAssignments((prev) => ({
                              ...prev,
                              [petId]: suiteId,
                            }));
                          }}
                          getOptionLabel={(option) => {
                            if (!option.id) return "Auto-assign";
                            return (
                              option.name ||
                              `Suite #${
                                (option as any).attributes?.suiteNumber ||
                                option.id.substring(0, 8)
                              }`
                            );
                          }}
                          getOptionDisabled={(option) => {
                            if (!option.id) return false; // Auto-assign is always enabled

                            // Check if occupied by existing reservation
                            const isOccupied = occupiedSuiteIds.has(option.id);
                            if (isOccupied) return true;

                            // Count how many pets already assigned to this suite
                            const petsInSuite = Object.values(
                              petSuiteAssignments
                            ).filter((id) => id === option.id).length;

                            // Get suite capacity (default to 1 if not specified)
                            const suiteCapacity = (option as any).maxPets || 1;

                            // Debug logging
                            if (suiteCapacity > 1) {
                              console.log(
                                `Kennel ${
                                  option.name
                                }: ${petsInSuite}/${suiteCapacity} pets, disabled: ${
                                  petsInSuite >= suiteCapacity
                                }`
                              );
                            }

                            // Disable if suite is at capacity
                            return petsInSuite >= suiteCapacity;
                          }}
                          renderOption={(props, option) => {
                            if (!option.id) {
                              return (
                                <li {...props}>
                                  <em>Auto-assign</em>
                                </li>
                              );
                            }

                            const isOccupied = occupiedSuiteIds.has(option.id);
                            const petsInSuite = Object.values(
                              petSuiteAssignments
                            ).filter((id) => id === option.id).length;
                            const suiteCapacity = (option as any).maxPets || 1;
                            const atCapacity = petsInSuite >= suiteCapacity;

                            const displayName =
                              option.name ||
                              `Suite #${
                                (option as any).attributes?.suiteNumber ||
                                option.id.substring(0, 8)
                              }`;
                            const roomSize = getRoomSizeDisplayName(
                              (option as any).size
                            );
                            const sizeText = roomSize ? ` - ${roomSize}` : "";
                            const capacityText =
                              suiteCapacity > 1
                                ? ` (${petsInSuite}/${suiteCapacity} pets)`
                                : "";

                            return (
                              <li
                                {...props}
                                style={{
                                  color: isOccupied
                                    ? "#d32f2f"
                                    : atCapacity
                                    ? "#ff9800"
                                    : "#2e7d32",
                                  opacity: atCapacity || isOccupied ? 0.6 : 1,
                                }}
                              >
                                {isOccupied && "🔴 "}
                                {atCapacity && !isOccupied && "🟡 "}
                                {!isOccupied && !atCapacity && "🟢 "}
                                {displayName}
                                {sizeText}
                                {capacityText}
                                {isOccupied && " (Occupied)"}
                                {atCapacity && !isOccupied && " (At Capacity)"}
                              </li>
                            );
                          }}
                          disabled={suiteLoading}
                          loading={suiteLoading}
                          renderInput={(params) => (
                            <TextField
                              {...params}
                              label={`Kennel for ${
                                pet?.name || `Pet ${index + 1}`
                              }${isFirstPet ? " (Initially selected)" : ""}`}
                              placeholder="Type to search..."
                              InputLabelProps={{
                                shrink: true,
                              }}
                            />
                          )}
                          sx={{ mt: 1, mb: 1 }}
                        />
                      );
                    })}
                  </Box>
                )}

                {/* Kennel/Suite Number Selection - Single Pet */}
                {requiresSuiteType &&
                  selectedSuiteType &&
                  selectedPets.length <= 1 && (
                    <FormControl fullWidth required margin="normal">
                      <InputLabel id="kennel-number-label">
                        Kennel/Suite Number
                      </InputLabel>
                      {suiteLoading ? (
                        <Select
                          labelId="kennel-number-label"
                          id="kennel-number-select"
                          value=""
                          label="Kennel/Suite Number"
                          disabled
                        >
                          <MenuItem disabled>Loading suites...</MenuItem>
                        </Select>
                      ) : !dropdownReady ? (
                        <Select
                          labelId="kennel-number-label"
                          id="kennel-number-select"
                          value=""
                          label="Kennel/Suite Number"
                          disabled
                        >
                          <MenuItem disabled>Preparing options...</MenuItem>
                        </Select>
                      ) : (
                        <Select
                          labelId="kennel-number-label"
                          id="kennel-number-select"
                          value={selectedSuiteId || ""}
                          label="Kennel/Suite Number"
                          onChange={(e) => {
                            const newSuiteId = e.target.value || "";
                            setSelectedSuiteId(newSuiteId);
                          }}
                          inputProps={{
                            "aria-label": "Select kennel number",
                            "aria-hidden": "false",
                          }}
                          renderValue={(selected) => {
                            if (!selected) return "Auto-assign (recommended)";
                            const suite = availableSuites.find(
                              (s) => s.id === selected
                            );
                            if (suite) {
                              const suiteNumber = suite.attributes?.suiteNumber;
                              const suiteName = suite.name || "Suite";
                              return suiteNumber
                                ? `#${suiteNumber} - ${suiteName}`
                                : suiteName;
                            }
                            return `Suite ID: ${selected.substring(0, 8)}...`;
                          }}
                        >
                          <MenuItem value="">
                            Auto-assign (recommended)
                          </MenuItem>
                          {suiteError ? (
                            <MenuItem disabled>{suiteError}</MenuItem>
                          ) : availableSuites.length > 0 ? (
                            availableSuites.map((suite) => {
                              const isOccupied = occupiedSuiteIds.has(suite.id);
                              const displayName =
                                suite.name ||
                                `Suite #${
                                  suite.attributes?.suiteNumber ||
                                  suite.id.substring(0, 8)
                                }`;
                              return (
                                <MenuItem
                                  key={suite.id}
                                  id={`suite-option-${suite.id}`}
                                  value={suite.id}
                                  disabled={isOccupied}
                                  sx={{
                                    color: isOccupied ? "#d32f2f" : "#2e7d32",
                                    opacity: isOccupied ? 0.6 : 1,
                                  }}
                                >
                                  {isOccupied ? "🔴 " : "🟢 "}
                                  {displayName}
                                  {isOccupied && " (Occupied)"}
                                </MenuItem>
                              );
                            })
                          ) : (
                            <MenuItem disabled>No suites available</MenuItem>
                          )}
                          {selectedSuiteId &&
                            !availableSuites.some(
                              (suite) => suite.id === selectedSuiteId
                            ) && (
                              <MenuItem
                                id={`suite-option-${selectedSuiteId}`}
                                value={selectedSuiteId}
                              >
                                Suite ID: {selectedSuiteId.substring(0, 8)}...
                              </MenuItem>
                            )}
                        </Select>
                      )}
                    </FormControl>
                  )}
              </>
            );
          })()}

          <Typography variant="subtitle2" sx={{ mt: 1, mb: 0.5 }}>
            Start Date & Time
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <DatePicker
                label="Start Date"
                value={startDate}
                onChange={(newValue) => {
                  if (!newValue) return;

                  // Preserve the time from the existing startDate if it exists
                  if (startDate) {
                    const hours = startDate.getHours();
                    const minutes = startDate.getMinutes();
                    newValue.setHours(hours, minutes);
                  } else {
                    // Default to 9:00 AM if no previous time
                    newValue.setHours(9, 0, 0, 0);
                  }

                  setStartDate(newValue);

                  // Update end date based on service type when start date changes
                  if (currentServiceDuration) {
                    const newEndDate = new Date(newValue.getTime());
                    const service = services.find(
                      (s) => s.id === selectedService
                    );

                    // For BOARDING services (overnight), set to 5pm next day
                    if (service?.serviceCategory === "BOARDING") {
                      newEndDate.setDate(newEndDate.getDate() + 1); // Next day
                      newEndDate.setHours(17, 0, 0, 0); // 5:00 PM
                    } else if (service?.serviceCategory === "GROOMING") {
                      // For GROOMING services, default to 2 hours on same day
                      newEndDate.setMinutes(newEndDate.getMinutes() + 120);
                    } else {
                      // For other services, add the service duration in minutes
                      newEndDate.setMinutes(
                        newEndDate.getMinutes() + currentServiceDuration
                      );
                    }

                    setEndDate(newEndDate);
                  }
                }}
                slotProps={{
                  textField: { fullWidth: true, size: "small", sx: { mb: 1 } },
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TimePicker
                label="Start Time"
                value={startDate}
                onChange={(newValue) => {
                  if (!newValue) return;

                  // Create a new date with the current date but updated time
                  const updatedDate = startDate
                    ? new Date(startDate)
                    : new Date();
                  updatedDate.setHours(
                    newValue.getHours(),
                    newValue.getMinutes()
                  );

                  setStartDate(updatedDate);

                  // Update end date based on service type when time changes
                  if (currentServiceDuration) {
                    const newEndDate = new Date(updatedDate.getTime());
                    const service = services.find(
                      (s) => s.id === selectedService
                    );

                    // For BOARDING services (overnight), set to 5pm next day
                    if (service?.serviceCategory === "BOARDING") {
                      newEndDate.setDate(newEndDate.getDate() + 1); // Next day
                      newEndDate.setHours(17, 0, 0, 0); // 5:00 PM
                    } else if (service?.serviceCategory === "GROOMING") {
                      // For GROOMING services, default to 2 hours on same day
                      newEndDate.setMinutes(newEndDate.getMinutes() + 120);
                    } else {
                      // For other services, add the service duration in minutes
                      newEndDate.setMinutes(
                        newEndDate.getMinutes() + currentServiceDuration
                      );
                    }

                    setEndDate(newEndDate);
                  }
                }}
                slotProps={{
                  textField: { fullWidth: true, size: "small", sx: { mb: 1 } },
                }}
              />
            </Grid>
          </Grid>

          <Typography variant="subtitle2" sx={{ mt: 1, mb: 0.5 }}>
            End Date & Time
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <DatePicker
                label="End Date"
                value={endDate}
                onChange={(newValue) => {
                  if (!newValue) return;

                  // Preserve the time from the existing endDate if it exists
                  if (endDate) {
                    const hours = endDate.getHours();
                    const minutes = endDate.getMinutes();
                    newValue.setHours(hours, minutes);
                  } else {
                    // Default to 5:00 PM if no previous time
                    newValue.setHours(17, 0, 0, 0);
                  }

                  setEndDate(newValue);
                }}
                slotProps={{
                  textField: { fullWidth: true, size: "small", sx: { mb: 1 } },
                }}
                minDate={startDate || undefined}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TimePicker
                label="End Time"
                value={endDate}
                onChange={(newValue) => {
                  if (!newValue) return;

                  // Create a new date with the current date but updated time
                  const updatedDate = endDate ? new Date(endDate) : new Date();
                  updatedDate.setHours(
                    newValue.getHours(),
                    newValue.getMinutes()
                  );

                  setEndDate(updatedDate);
                }}
                slotProps={{
                  textField: { fullWidth: true, size: "small", sx: { mb: 1 } },
                }}
              />
            </Grid>
          </Grid>

          {/* Status dropdown - only show for editing existing reservations */}
          {initialData && (
            <>
              <FormControl fullWidth size="small" sx={{ mb: 1 }}>
                <InputLabel id="status-select-label">
                  Reservation Status
                </InputLabel>
                <Select
                  labelId="status-select-label"
                  id="status-select"
                  value={selectedStatus || "CONFIRMED"}
                  label="Reservation Status"
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  displayEmpty
                  // Add proper ARIA attributes to fix accessibility warning
                  inputProps={{
                    "aria-label": "Select reservation status",
                    "aria-hidden": "false",
                  }}
                >
                  <MenuItem value="PENDING">Pending</MenuItem>
                  <MenuItem value="CONFIRMED">Confirmed</MenuItem>
                  <MenuItem value="CHECKED_IN">Checked In</MenuItem>
                  <MenuItem value="CHECKED_OUT">Checked Out</MenuItem>
                  <MenuItem value="COMPLETED">Completed</MenuItem>
                  <MenuItem value="CANCELLED">Cancelled</MenuItem>
                  <MenuItem value="NO_SHOW">No Show</MenuItem>
                </Select>
              </FormControl>
            </>
          )}

          {!initialData && (
            <Box
              sx={{
                mb: 2,
                p: 2,
                bgcolor: "warning.light",
                borderRadius: 1,
                border: "2px solid",
                borderColor: "warning.main",
              }}
            >
              <Typography
                variant="body2"
                color="warning.contrastText"
                sx={{ fontWeight: "bold" }}
              >
                ⚠️ <strong>IMPORTANT:</strong> Use "Proceed to Checkout" below
                to create reservations with proper invoicing and payment
                processing. This ensures accurate financial records and
                analytics.
              </Typography>
            </Box>
          )}

          <Box
            sx={{
              display: "flex",
              gap: 1,
              justifyContent: "flex-end",
              mt: 1,
              flexDirection: { xs: "column", sm: "row" },
            }}
          >
            {!initialData && (
              <>
                <Button
                  variant="contained"
                  color="primary"
                  size={isMobile ? "medium" : "large"}
                  onClick={handleProceedToCheckout}
                  disabled={loading}
                  fullWidth={isMobile}
                  sx={{
                    mr: { xs: 0, sm: 1 },
                    px: { xs: 2, sm: 3 },
                    py: { xs: 1, sm: 1.5 },
                    fontSize: { xs: "1rem", sm: "1.1rem" },
                    fontWeight: "bold",
                  }}
                >
                  🛒{" "}
                  {isMobile ? "Checkout" : "Proceed to Checkout (Recommended)"}
                </Button>
                <Button
                  type="submit"
                  variant="outlined"
                  color="secondary"
                  size={getResponsiveButtonSize(isMobile)}
                  disabled={loading}
                  fullWidth={isMobile}
                >
                  {loading
                    ? "Processing..."
                    : isMobile
                    ? "Quick Create"
                    : "Quick Create (Staff Only)"}
                </Button>
              </>
            )}
            {initialData && (
              <>
                <Button
                  variant="outlined"
                  color="error"
                  size={getResponsiveButtonSize(isMobile)}
                  startIcon={!isMobile ? <DeleteIcon /> : undefined}
                  onClick={() => setDeleteConfirmOpen(true)}
                  disabled={loading || deleting}
                  fullWidth={isMobile}
                  sx={{ mr: { xs: 0, sm: 1 }, mb: { xs: 1, sm: 0 } }}
                >
                  {isMobile ? <DeleteIcon /> : "Delete"}
                </Button>
                <Button
                  type="submit"
                  variant="contained"
                  color="primary"
                  size={getResponsiveButtonSize(isMobile)}
                  disabled={loading}
                  fullWidth={isMobile}
                >
                  {loading
                    ? "Processing..."
                    : isMobile
                    ? "Update"
                    : "Update Reservation"}
                </Button>
              </>
            )}
          </Box>
        </Box>
      </Paper>

      {/* Add-Ons Dialog - only shown after successful reservation creation when showAddOns is true */}
      <AddOnSelectionDialogEnhanced
        open={addOnsDialogOpen && !!newReservationId && !!selectedServiceId}
        onClose={() => {
          setAddOnsDialogOpen(false);
          // Reset the form after closing the dialog
          handleReset();
          // Close the parent form/dialog if callback provided
          if (onClose) {
            onClose();
          }
        }}
        reservationId={newReservationId}
        serviceId={selectedServiceId}
        onAddOnsAdded={handleAddOnsAdded}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteConfirmOpen}
        onClose={() => !deleting && setDeleteConfirmOpen(false)}
      >
        <DialogTitle>Delete Reservation?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete this reservation? This action cannot
            be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setDeleteConfirmOpen(false)}
            disabled={deleting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleDelete}
            color="error"
            variant="contained"
            disabled={deleting}
          >
            {deleting ? "Deleting..." : "Delete"}
          </Button>
        </DialogActions>
      </Dialog>
    </LocalizationProvider>
  );
};

export default ReservationForm;
