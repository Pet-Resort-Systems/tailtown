import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFnsV3";
import ReservationForm from "../ReservationForm";
import * as customerService from "../../../services/customerService";
import * as petService from "../../../services/petService";
import * as serviceManagement from "../../../services/serviceManagement";
import * as resourceService from "../../../services/resourceService";

// Mock the services with proper implementations
jest.mock("../../../services/customerService", () => ({
  customerService: {
    getAllCustomers: jest.fn(),
    searchCustomers: jest.fn(),
    getCustomerById: jest.fn(),
  },
}));

jest.mock("../../../services/petService", () => ({
  petService: {
    getPetsByCustomer: jest.fn(),
    getPetById: jest.fn(),
  },
}));

jest.mock("../../../services/serviceManagement", () => ({
  serviceManagement: {
    getAllServices: jest.fn(),
    getServiceById: jest.fn(),
  },
}));

jest.mock("../../../services/resourceService", () => ({
  resourceService: {
    getSuites: jest.fn(),
    getResourceById: jest.fn(),
    getResourcesByType: jest.fn(),
  },
}));

const mockCustomerService = customerService.customerService as jest.Mocked<
  typeof customerService.customerService
>;
const mockPetService = petService.petService as jest.Mocked<
  typeof petService.petService
>;
const mockServiceManagement =
  serviceManagement.serviceManagement as jest.Mocked<
    typeof serviceManagement.serviceManagement
  >;
const mockResourceService = resourceService.resourceService as jest.Mocked<
  typeof resourceService.resourceService
>;

// Test data
const mockCustomers = [
  {
    id: "customer-1",
    firstName: "John",
    lastName: "Doe",
    email: "john@example.com",
    phone: "555-1234",
  },
];

const mockPets = [
  {
    id: "pet-1",
    name: "Buddy",
    type: "DOG",
    breed: "Golden Retriever",
    customerId: "customer-1",
  },
  {
    id: "pet-2",
    name: "Max",
    type: "DOG",
    breed: "Labrador",
    customerId: "customer-1",
  },
];

const mockServices = [
  {
    id: "service-boarding",
    name: "Boarding",
    serviceCategory: "BOARDING",
    price: 50,
  },
  {
    id: "service-daycare",
    name: "Daycare",
    serviceCategory: "DAYCARE",
    price: 30,
  },
  {
    id: "service-grooming",
    name: "Grooming",
    serviceCategory: "GROOMING",
    price: 40,
  },
];

const mockResources = [
  {
    id: "resource-1",
    name: "A01",
    type: "STANDARD_SUITE",
    attributes: { suiteNumber: "A01", suiteType: "STANDARD_SUITE" },
  },
  {
    id: "resource-2",
    name: "A02",
    type: "STANDARD_SUITE",
    attributes: { suiteNumber: "A02", suiteType: "STANDARD_SUITE" },
  },
  {
    id: "resource-3",
    name: "A03",
    type: "STANDARD_SUITE",
    attributes: { suiteNumber: "A03", suiteType: "STANDARD_SUITE" },
  },
];

// Wrapper component with required providers
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <LocalizationProvider dateAdapter={AdapterDateFns}>
    {children}
  </LocalizationProvider>
);

describe("ReservationForm - Kennel Assignment Validation", () => {
  const mockOnSubmit = jest.fn();
  const mockOnClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default mock responses
    mockCustomerService.getAllCustomers.mockResolvedValue({
      status: "success",
      data: mockCustomers,
    });

    mockPetService.getPetsByCustomer.mockResolvedValue({
      status: "success",
      data: mockPets,
    });

    mockServiceManagement.getAllServices.mockResolvedValue({
      status: "success",
      data: mockServices,
    });

    mockResourceService.getResourcesByType.mockResolvedValue({
      status: "success",
      data: mockResources,
    });

    mockResourceService.batchCheckResourceAvailability.mockResolvedValue({
      status: "success",
      data: {
        resources: mockResources.map((r) => ({
          resourceId: r.id,
          isAvailable: true,
          conflictingReservations: [],
        })),
      },
    });
  });

  describe("Mandatory Kennel Assignment for Boarding/Daycare", () => {
    it("should require kennel assignment for boarding service with single pet", async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <ReservationForm onSubmit={mockOnSubmit} onClose={mockOnClose} />
        </TestWrapper>
      );

      // Wait for form to load
      await waitFor(() => {
        expect(screen.getByLabelText(/customer/i)).toBeInTheDocument();
      });

      // Select customer
      const customerInput = screen.getByLabelText(/customer/i);
      await user.click(customerInput);
      await user.type(customerInput, "John");

      await waitFor(() => {
        const option = screen.getByText("John Doe");
        user.click(option);
      });

      // Select pet
      await waitFor(() => {
        const petSelect = screen.getByLabelText(/pet/i);
        expect(petSelect).toBeInTheDocument();
      });

      // Select boarding service
      const serviceSelect = screen.getByLabelText(/service/i);
      await user.click(serviceSelect);
      const boardingOption = screen.getByText("Boarding");
      await user.click(boardingOption);

      // Set dates
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      // Try to submit without selecting kennel
      const submitButton = screen.getByRole("button", {
        name: /create reservation|submit/i,
      });
      await user.click(submitButton);

      // Should show error about required fields or kennel assignment
      await waitFor(() => {
        expect(
          screen.getByText(
            /please fill in all required fields|please assign kennels/i
          )
        ).toBeInTheDocument();
      });

      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    it("should allow submission for boarding when kennel is assigned", async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <ReservationForm onSubmit={mockOnSubmit} onClose={mockOnClose} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByLabelText(/customer/i)).toBeInTheDocument();
      });

      // Complete form with kennel assignment
      // ... (similar setup as above)
      // Select kennel
      const kennelSelect = screen.getByLabelText(/kennel/i);
      await user.click(kennelSelect);
      const kennelOption = screen.getByText(/A01/i);
      await user.click(kennelOption);

      const submitButton = screen.getByRole("button", {
        name: /create reservation|submit/i,
      });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalled();
      });
    });

    it("should allow auto-assign option for boarding service", async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <ReservationForm onSubmit={mockOnSubmit} onClose={mockOnClose} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByLabelText(/customer/i)).toBeInTheDocument();
      });

      // Select boarding service and choose auto-assign
      const kennelSelect = screen.getByLabelText(/kennel/i);
      await user.click(kennelSelect);
      const autoAssignOption = screen.getByText(/auto-assign/i);
      await user.click(autoAssignOption);

      const submitButton = screen.getByRole("button", {
        name: /create reservation|submit/i,
      });
      await user.click(submitButton);

      // Should allow submission with auto-assign
      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalled();
      });
    });

    it("should NOT require kennel for grooming service", async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <ReservationForm onSubmit={mockOnSubmit} onClose={mockOnClose} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByLabelText(/customer/i)).toBeInTheDocument();
      });

      // Select grooming service (should not require kennel)
      const serviceSelect = screen.getByLabelText(/service/i);
      await user.click(serviceSelect);
      const groomingOption = screen.getByText("Grooming");
      await user.click(groomingOption);

      // Should not show kennel selector for grooming
      expect(screen.queryByLabelText(/kennel/i)).not.toBeInTheDocument();

      const submitButton = screen.getByRole("button", {
        name: /create reservation|submit/i,
      });
      await user.click(submitButton);

      // Should allow submission without kennel for grooming
      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalled();
      });
    });
  });

  describe("Multi-Pet Kennel Assignment Validation", () => {
    it("should require kennel assignment for all pets in multi-pet booking", async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <ReservationForm onSubmit={mockOnSubmit} onClose={mockOnClose} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByLabelText(/customer/i)).toBeInTheDocument();
      });

      // Select multiple pets
      const petSelect = screen.getByLabelText(/pet/i);
      await user.click(petSelect);

      // Select first pet
      const buddy = screen.getByText("Buddy");
      await user.click(buddy);

      // Select second pet
      const max = screen.getByText("Max");
      await user.click(max);

      // Select boarding service
      const serviceSelect = screen.getByLabelText(/service/i);
      await user.click(serviceSelect);
      const boardingOption = screen.getByText("Boarding");
      await user.click(boardingOption);

      // Assign kennel to first pet only
      const kennelSelects = screen.getAllByLabelText(/kennel for/i);
      await user.click(kennelSelects[0]);
      const kennel1 = screen.getByText(/A01/i);
      await user.click(kennel1);

      // Try to submit without assigning kennel to second pet
      const submitButton = screen.getByRole("button", {
        name: /create reservation|submit/i,
      });
      await user.click(submitButton);

      // Should show error about unassigned pets
      await waitFor(() => {
        expect(
          screen.getByText(/please assign kennels for all pets/i)
        ).toBeInTheDocument();
        expect(screen.getByText(/Max/i)).toBeInTheDocument(); // Should mention the unassigned pet
      });

      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    it("should allow submission when all pets have kennel assignments", async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <ReservationForm onSubmit={mockOnSubmit} onClose={mockOnClose} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByLabelText(/customer/i)).toBeInTheDocument();
      });

      // Select multiple pets and assign kennels to both
      // ... (similar setup)

      const kennelSelects = screen.getAllByLabelText(/kennel for/i);

      // Assign kennel to first pet
      await user.click(kennelSelects[0]);
      const kennel1 = screen.getByText(/A01/i);
      await user.click(kennel1);

      // Assign kennel to second pet
      await user.click(kennelSelects[1]);
      const kennel2 = screen.getByText(/A02/i);
      await user.click(kennel2);

      const submitButton = screen.getByRole("button", {
        name: /create reservation|submit/i,
      });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalled();
      });
    });

    it("should prevent assigning same kennel to multiple pets", async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <ReservationForm onSubmit={mockOnSubmit} onClose={mockOnClose} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByLabelText(/customer/i)).toBeInTheDocument();
      });

      // Assign same kennel to first pet
      const kennelSelects = screen.getAllByLabelText(/kennel for/i);
      await user.click(kennelSelects[0]);
      const kennel1 = screen.getByText(/A01/i);
      await user.click(kennel1);

      // Try to assign same kennel to second pet
      await user.click(kennelSelects[1]);

      // A01 should be disabled or marked as selected for another pet
      const kennelOptions = screen.getAllByRole("option");
      const a01Option = kennelOptions.find((opt) =>
        opt.textContent?.includes("A01")
      );

      expect(a01Option).toHaveAttribute("aria-disabled", "true");
      // Or should show yellow indicator for "Selected for another pet"
      expect(a01Option?.textContent).toMatch(/🟡|selected for another pet/i);
    });
  });

  describe("Availability Checking", () => {
    it("should show occupied kennels as disabled", async () => {
      // Mock one kennel as occupied
      mockResourceService.batchCheckResourceAvailability.mockResolvedValue({
        status: "success",
        data: {
          resources: [
            {
              resourceId: "resource-1",
              isAvailable: false,
              conflictingReservations: [{ id: "other-reservation" }],
            },
            {
              resourceId: "resource-2",
              isAvailable: true,
              conflictingReservations: [],
            },
            {
              resourceId: "resource-3",
              isAvailable: true,
              conflictingReservations: [],
            },
          ],
        },
      });

      const user = userEvent.setup();

      render(
        <TestWrapper>
          <ReservationForm onSubmit={mockOnSubmit} onClose={mockOnClose} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByLabelText(/customer/i)).toBeInTheDocument();
      });

      // Select boarding service to show kennels
      const serviceSelect = screen.getByLabelText(/service/i);
      await user.click(serviceSelect);
      const boardingOption = screen.getByText("Boarding");
      await user.click(boardingOption);

      // Open kennel selector
      const kennelSelect = screen.getByLabelText(/kennel/i);
      await user.click(kennelSelect);

      // A01 should be disabled and marked as occupied
      const kennelOptions = screen.getAllByRole("option");
      const a01Option = kennelOptions.find((opt) =>
        opt.textContent?.includes("A01")
      );

      expect(a01Option).toHaveAttribute("aria-disabled", "true");
      expect(a01Option?.textContent).toMatch(/🔴|occupied/i);

      // A02 should be available
      const a02Option = kennelOptions.find((opt) =>
        opt.textContent?.includes("A02")
      );
      expect(a02Option).not.toHaveAttribute("aria-disabled", "true");
      expect(a02Option?.textContent).toMatch(/🟢|available/i);
    });

    it("should show color-coded availability indicators", async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <ReservationForm onSubmit={mockOnSubmit} onClose={mockOnClose} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByLabelText(/kennel/i)).toBeInTheDocument();
      });

      const kennelSelect = screen.getByLabelText(/kennel/i);
      await user.click(kennelSelect);

      // Should show legend or indicators
      expect(screen.getByText(/🟢.*available/i)).toBeInTheDocument();
      expect(screen.getByText(/🔴.*occupied/i)).toBeInTheDocument();
    });

    it("should exclude current reservation when editing", async () => {
      const initialData = {
        id: "reservation-123",
        customerId: "customer-1",
        petId: "pet-1",
        serviceId: "service-boarding",
        resourceId: "resource-1",
        startDate: new Date(),
        endDate: new Date(),
      };

      // Mock A01 as occupied by current reservation
      mockResourceService.batchCheckResourceAvailability.mockResolvedValue({
        status: "success",
        data: {
          resources: [
            {
              resourceId: "resource-1",
              isAvailable: false,
              conflictingReservations: [{ id: "reservation-123" }], // Current reservation
            },
            {
              resourceId: "resource-2",
              isAvailable: true,
              conflictingReservations: [],
            },
          ],
        },
      });

      const user = userEvent.setup();

      render(
        <TestWrapper>
          <ReservationForm
            onSubmit={mockOnSubmit}
            onClose={mockOnClose}
            initialData={initialData}
          />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByLabelText(/kennel/i)).toBeInTheDocument();
      });

      const kennelSelect = screen.getByLabelText(/kennel/i);
      await user.click(kennelSelect);

      // A01 should be available (not disabled) because it's the current reservation
      const kennelOptions = screen.getAllByRole("option");
      const a01Option = kennelOptions.find((opt) =>
        opt.textContent?.includes("A01")
      );

      expect(a01Option).not.toHaveAttribute("aria-disabled", "true");
      expect(a01Option?.textContent).toMatch(/🟢|available/i);
    });
  });

  describe("Form Validation", () => {
    it("should show error when required fields are missing", async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <ReservationForm onSubmit={mockOnSubmit} onClose={mockOnClose} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByLabelText(/customer/i)).toBeInTheDocument();
      });

      // Try to submit without filling anything
      const submitButton = screen.getByRole("button", {
        name: /create reservation|submit/i,
      });
      await user.click(submitButton);

      await waitFor(() => {
        expect(
          screen.getByText(/please fill in all required fields/i)
        ).toBeInTheDocument();
      });

      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    it("should clear error message when form is corrected", async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <ReservationForm onSubmit={mockOnSubmit} onClose={mockOnClose} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByLabelText(/customer/i)).toBeInTheDocument();
      });

      // Submit with missing fields to trigger error
      const submitButton = screen.getByRole("button", {
        name: /create reservation|submit/i,
      });
      await user.click(submitButton);

      await waitFor(() => {
        expect(
          screen.getByText(/please fill in all required fields/i)
        ).toBeInTheDocument();
      });

      // Now fill in a field
      const customerInput = screen.getByLabelText(/customer/i);
      await user.click(customerInput);
      await user.type(customerInput, "John");

      // Error should clear or update
      await waitFor(() => {
        expect(
          screen.queryByText(/please fill in all required fields/i)
        ).not.toBeInTheDocument();
      });
    });
  });
});
