import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  CircularProgress,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Button,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import DeleteIcon from '@mui/icons-material/Delete';
import { serviceManagement } from '../../services/serviceManagement';

interface AddOnSelectionProps {
  onContinue: (addOns: any[], subtotal: number) => void;
  initialAddOns: Array<{
    serviceId: string;
    name: string;
    quantity: number;
    price: number;
  }>;
  serviceId: string;
  reservationDates: {
    startDate: Date | null;
    endDate: Date | null;
  };
}

const AddOnSelection: React.FC<AddOnSelectionProps> = ({
  onContinue,
  initialAddOns,
  serviceId,
  reservationDates,
}) => {
  // State for available add-ons
  const [availableAddOns, setAvailableAddOns] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // State for selected add-ons
  const [selectedAddOns, setSelectedAddOns] = useState<
    Array<{
      serviceId: string;
      name: string;
      quantity: number;
      price: number;
    }>
  >(initialAddOns || []);

  // Calculate subtotal
  const [baseServicePrice, setBaseServicePrice] = useState<number>(0);
  const [subtotal, setSubtotal] = useState<number>(0);

  // Load available add-on services
  useEffect(() => {
    const loadAddOns = async () => {
      try {
        setLoading(true);
        setError(null);

        // Get the main service first to get its price
        const mainService = await serviceManagement.getServiceById(serviceId);
        if (mainService?.data) {
          setBaseServicePrice(mainService.data.price);
        }

        // Get add-on services for this specific service
        const response = await serviceManagement.getServiceAddOns(serviceId);

        if (response && response.data) {
          setAvailableAddOns(response.data);

          // If we have initial add-ons, make sure they exist in available add-ons
          if (initialAddOns && initialAddOns.length > 0) {
            const validAddOns = initialAddOns.filter((addon) =>
              response.data.some(
                (available: { id: string }) => available.id === addon.serviceId
              )
            );
            setSelectedAddOns(validAddOns);
          }
        }
      } catch (err) {
        console.error('Error loading add-on services:', err);
        setError('Failed to load add-on services. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    if (serviceId) {
      loadAddOns();
    }
  }, [serviceId, initialAddOns]);

  // Update subtotal when selected add-ons change or base price changes
  useEffect(() => {
    // Calculate the number of days for the reservation
    let daysCount = 1;
    if (reservationDates.startDate && reservationDates.endDate) {
      const timeDiff =
        reservationDates.endDate.getTime() -
        reservationDates.startDate.getTime();
      daysCount = Math.ceil(timeDiff / (1000 * 3600 * 24)) || 1; // Default to 1 if calculation is 0
    }

    // Calculate base service price for the entire stay
    const totalBasePrice = baseServicePrice * daysCount;

    // Calculate add-ons total
    const addOnsTotal = selectedAddOns.reduce(
      (sum, addon) => sum + addon.price * addon.quantity,
      0
    );

    // Set the total
    setSubtotal(totalBasePrice + addOnsTotal);
  }, [
    selectedAddOns,
    baseServicePrice,
    reservationDates.startDate,
    reservationDates.endDate,
  ]);

  // Handle adding an add-on service
  const handleAddService = (addon: any) => {
    // Check if the add-on is already selected
    const existingIndex = selectedAddOns.findIndex(
      (item) => item.serviceId === addon.id
    );

    if (existingIndex >= 0) {
      // Increment quantity if already selected
      const updatedAddOns = [...selectedAddOns];
      updatedAddOns[existingIndex].quantity += 1;
      setSelectedAddOns(updatedAddOns);
    } else {
      // Add new add-on with quantity 1
      setSelectedAddOns([
        ...selectedAddOns,
        {
          serviceId: addon.id,
          name: addon.name,
          quantity: 1,
          price: addon.price,
        },
      ]);
    }
  };

  // Handle changing add-on quantity
  const handleQuantityChange = (index: number, newQuantity: number) => {
    if (newQuantity < 1) {
      // Remove the add-on if quantity is less than 1
      const updatedAddOns = selectedAddOns.filter((_, i) => i !== index);
      setSelectedAddOns(updatedAddOns);
    } else {
      // Update the quantity
      const updatedAddOns = [...selectedAddOns];
      updatedAddOns[index].quantity = newQuantity;
      setSelectedAddOns(updatedAddOns);
    }
  };

  // Handle removing an add-on
  const handleRemoveAddon = (index: number) => {
    const updatedAddOns = selectedAddOns.filter((_, i) => i !== index);
    setSelectedAddOns(updatedAddOns);
  };

  // Handle continue to next step
  const handleContinue = () => {
    onContinue(selectedAddOns, subtotal);
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Add-On Services
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
        <Typography variant="subtitle1" gutterBottom>
          Available Add-Ons
        </Typography>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
            <CircularProgress />
          </Box>
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Service</TableCell>
                  <TableCell>Description</TableCell>
                  <TableCell align="right">Price</TableCell>
                  <TableCell align="center">Add</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {availableAddOns.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4}>
                      <Typography variant="body2" align="center" sx={{ py: 2 }}>
                        No add-on services available
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  availableAddOns.map((addon) => (
                    <TableRow key={addon.id} hover>
                      <TableCell>{addon.name}</TableCell>
                      <TableCell>
                        {addon.description || 'No description'}
                      </TableCell>
                      <TableCell align="right">
                        {formatCurrency(addon.price)}
                      </TableCell>
                      <TableCell align="center">
                        <IconButton
                          size="small"
                          color="primary"
                          onClick={() => handleAddService(addon)}
                        >
                          <AddIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
        <Typography variant="subtitle1" gutterBottom>
          Selected Add-Ons
        </Typography>

        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Service</TableCell>
                <TableCell align="right">Price</TableCell>
                <TableCell align="center">Quantity</TableCell>
                <TableCell align="right">Total</TableCell>
                <TableCell align="center">Remove</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {selectedAddOns.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5}>
                    <Typography variant="body2" align="center" sx={{ py: 2 }}>
                      No add-on services selected
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                selectedAddOns.map((addon, index) => (
                  <TableRow key={index} hover>
                    <TableCell>{addon.name}</TableCell>
                    <TableCell align="right">
                      {formatCurrency(addon.price)}
                    </TableCell>
                    <TableCell align="center">
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <IconButton
                          size="small"
                          onClick={() =>
                            handleQuantityChange(index, addon.quantity - 1)
                          }
                        >
                          <RemoveIcon fontSize="small" />
                        </IconButton>
                        <Typography sx={{ mx: 1 }}>{addon.quantity}</Typography>
                        <IconButton
                          size="small"
                          onClick={() =>
                            handleQuantityChange(index, addon.quantity + 1)
                          }
                        >
                          <AddIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    </TableCell>
                    <TableCell align="right">
                      {formatCurrency(addon.price * addon.quantity)}
                    </TableCell>
                    <TableCell align="center">
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleRemoveAddon(index)}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
          <Typography variant="subtitle1">
            Base Service: {formatCurrency(baseServicePrice)}
            {reservationDates.startDate &&
              reservationDates.endDate &&
              ` × ${Math.ceil((reservationDates.endDate.getTime() - reservationDates.startDate.getTime()) / (1000 * 3600 * 24)) || 1} day(s)`}
          </Typography>
        </Box>

        <Box sx={{ mt: 1, display: 'flex', justifyContent: 'flex-end' }}>
          <Typography variant="h6">
            Subtotal: {formatCurrency(subtotal)}
          </Typography>
        </Box>
      </Paper>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
        <Button
          variant="outlined"
          color="secondary"
          onClick={() => onContinue([], 0)}
        >
          Skip Add-Ons
        </Button>
        <Button variant="contained" color="primary" onClick={handleContinue}>
          Continue to Review
        </Button>
      </Box>
    </Box>
  );
};

export default AddOnSelection;
