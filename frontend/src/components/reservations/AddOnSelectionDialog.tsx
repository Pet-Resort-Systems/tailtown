import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  CircularProgress,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Paper,
  Divider
} from '@mui/material';
import { Add as AddIcon, Remove as RemoveIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useShoppingCart } from '../../contexts/ShoppingCartContext';
import { reservationService } from '../../services/reservationService';
import addonService, { AddOnService } from '../../services/addonService';

interface AddOnSelectionDialogProps {
  open: boolean;
  onClose: () => void;
  reservationId: string;
  serviceId: string;
  onAddOnsAdded: (success: boolean) => void;
  redirectToCheckout?: boolean; // New prop to indicate checkout flow
}

interface AddOn {
  serviceId: string;
  addOnId: string;
  name: string;
  description?: string;
  quantity: number;
  price: number;
}

const AddOnSelectionDialog: React.FC<AddOnSelectionDialogProps> = ({
  open,
  onClose,
  reservationId,
  serviceId,
  onAddOnsAdded,
  redirectToCheckout = false
}) => {
  // State for available add-ons
  const [availableAddOns, setAvailableAddOns] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  
  // State for selected add-ons
  const [selectedAddOns, setSelectedAddOns] = useState<AddOn[]>([]);
  
  // Navigation and shopping cart hooks
  const navigate = useNavigate();
  const { addItem } = useShoppingCart();
  
  // Calculate subtotal
  const [subtotal, setSubtotal] = useState<number>(0);
  
  // Calculate subtotal whenever selected add-ons change
  useEffect(() => {
    const total = selectedAddOns.reduce((sum, addon) => sum + (addon.price * addon.quantity), 0);
    setSubtotal(total);
  }, [selectedAddOns]);
  
  const loadAddOns = useCallback(async () => {
    if (!serviceId || !open) {
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      setSelectedAddOns([]); // Reset selected add-ons when loading new ones
      
      
      // First try to find add-ons specifically for this service
      const addOns = await addonService.getAllAddOns(serviceId);
      
      
      if (addOns.length === 0) {
        // If no add-ons found for this specific service, get all add-ons
        const allAddOns = await addonService.getAllAddOns();
        setAvailableAddOns(allAddOns);
      } else {
        setAvailableAddOns(addOns);
      }
    } catch (err: any) {
      console.error('AddOnSelectionDialog: Error loading add-ons:', err);
      setError('Failed to load add-on services. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [serviceId, open]);

  // Load available add-on services when the dialog opens
  useEffect(() => {
    if (open && serviceId) {
      loadAddOns();
    }
  }, [open, serviceId, loadAddOns]);
  
  // Handle adding an add-on service
  const handleAddService = (addon: AddOnService) => {
    // Check if the add-on is already selected
    const existingIndex = selectedAddOns.findIndex(item => item.addOnId === addon.id);
    
    if (existingIndex >= 0) {
      // If already selected, increase the quantity
      const updatedAddOns = [...selectedAddOns];
      updatedAddOns[existingIndex].quantity += 1;
      setSelectedAddOns(updatedAddOns);
    } else {
      // Otherwise, add it to the selected add-ons with quantity 1
      setSelectedAddOns([...selectedAddOns, {
        serviceId: addon.serviceId, // This is the service this add-on belongs to
        addOnId: addon.id, // This is the actual add-on ID
        name: addon.name,
        description: addon.description,
        price: addon.price,
        quantity: 1
      }]);
    }
  };
  
  // Handle changing add-on quantity
  const handleQuantityChange = (index: number, newQuantity: number) => {
    if (newQuantity < 1) return; // Don't allow quantities less than 1
    
    const updatedAddOns = [...selectedAddOns];
    updatedAddOns[index].quantity = newQuantity;
    setSelectedAddOns(updatedAddOns);
  };
  
  // Handle removing an add-on
  const handleRemoveAddon = (index: number) => {
    const updatedAddOns = selectedAddOns.filter((_, i) => i !== index);
    setSelectedAddOns(updatedAddOns);
  };
  
  /**
   * Handle saving add-ons to the reservation
   * If there are no add-ons selected, simply close the dialog
   * Otherwise, save the add-ons and show a success message
   */
  const handleSaveAddOns = async () => {
    if (selectedAddOns.length === 0) {
      // Always redirect to checkout when no add-ons are selected
      // This ensures proper invoice and payment processing
      try {
        const reservation = await reservationService.getReservationById(reservationId);
        
        // Create cart item from reservation
        const cartItem = {
          id: `reservation-${reservationId}`,
          price: reservation.service?.price || 0,
          quantity: 1,
          serviceName: reservation.service?.name || 'Unknown Service',
          serviceId: reservation.serviceId,
          customerId: reservation.customerId,
          customerName: `${reservation.customer?.firstName || ''} ${reservation.customer?.lastName || ''}`.trim(),
          petId: reservation.petId,
          petName: reservation.pet?.name || 'Unknown Pet',
          startDate: new Date(reservation.startDate),
          endDate: new Date(reservation.endDate),
          suiteType: 'STANDARD_SUITE', // Default suite type
          resourceId: reservation.resource?.id || undefined,
          notes: reservation.notes || '',
          addOns: [] // No add-ons selected
        };
        
        
        // Add to cart and navigate to checkout
        addItem(cartItem);
        navigate('/checkout');
        onClose();
        return;
      } catch (error) {
        console.error('Error preparing checkout:', error);
        // Fall back to normal close behavior
        onClose();
        return;
      }
    }
    
    try {
      // Start saving process and clear any previous errors
      setSaving(true);
      setError(null);
      
      // Prepare add-on data for API submission
      // The backend expects an array of objects with serviceId and quantity
      // But we're sending the addOnId as the serviceId because that's what the backend controller expects
      const addOnData = selectedAddOns.map(addon => ({
        serviceId: addon.addOnId, // Send the add-on ID as the serviceId parameter
        quantity: addon.quantity
      }));
      
      
      // Save add-ons to the reservation using the reservation service
      await reservationService.addAddOnsToReservation(reservationId, addOnData);
      
      // Show success message to the user
      setSuccess('Add-on services have been added to the reservation.');
      
      // Notify parent component that add-ons were added successfully
      onAddOnsAdded(true);
      
      // Always redirect to checkout after adding add-ons
      // This ensures proper invoice and payment processing
      try {
        const reservation = await reservationService.getReservationById(reservationId);
        
        // Create cart item from reservation with add-ons
        const cartItem = {
          id: `reservation-${reservationId}`,
          price: reservation.service?.price || 0,
          quantity: 1,
          serviceName: reservation.service?.name || 'Unknown Service',
          serviceId: reservation.serviceId,
          customerId: reservation.customerId,
          customerName: `${reservation.customer?.firstName || ''} ${reservation.customer?.lastName || ''}`.trim(),
          petId: reservation.petId,
          petName: reservation.pet?.name || 'Unknown Pet',
          startDate: new Date(reservation.startDate),
          endDate: new Date(reservation.endDate),
          suiteType: 'STANDARD_SUITE', // Default suite type
          resourceId: reservation.resource?.id || undefined,
          notes: reservation.notes || '',
          addOns: selectedAddOns.map(addon => ({
            id: addon.addOnId,
            name: addon.name,
            price: addon.price,
            quantity: addon.quantity
          }))
        };
        
        
        // Add to cart and navigate to checkout
        addItem(cartItem);
        navigate('/checkout');
        onClose();
        return;
      } catch (error) {
        console.error('Error preparing checkout with add-ons:', error);
        // Fall back to normal close behavior
      }
      
      // Close the dialog after a short delay to show the success message
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err: any) {
      console.error('AddOnSelectionDialog: Error saving add-ons:', err);
      setError(err.response?.data?.message || 'Failed to add services to the reservation. Please try again.');
      onAddOnsAdded(false);
    } finally {
      setSaving(false);
    }
  };
  
  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount);
  };
  
  /**
   * Improved close handler that properly manages focus to prevent accessibility warnings
   * This ensures focus is not trapped in the dialog when it closes
   */
  const handleClose = () => {
    // First, move focus to the document body to ensure it's not trapped in the dialog
    document.body.focus();
    
    // Clear focus from any element inside the dialog to prevent accessibility warnings
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    
    // Use a small timeout to ensure focus management happens before dialog closes
    // This prevents React warnings about state updates during unmounting
    setTimeout(() => {
      onClose();
    }, 0);
  };
  
  return (
    <Dialog
      open={open}
      onClose={handleClose}
      aria-labelledby="add-on-dialog-title"
      maxWidth="md"
      fullWidth
      // Add proper focus management to prevent accessibility warnings
      disableRestoreFocus
      // Prevent dialog from closing when clicking outside
      disableEscapeKeyDown={false}
      // Ensure proper focus management
      keepMounted={false}
      TransitionProps={{
        onEnter: () => {
        }
      }}
    >
      <DialogTitle id="add-on-dialog-title">
        Add Services to Your Reservation
      </DialogTitle>
      <DialogContent dividers>
        <Box sx={{ mb: 2 }}>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          
          {success && (
            <Alert severity="success" sx={{ mb: 2 }}>
              {success}
            </Alert>
          )}
          
          <Typography variant="subtitle1" gutterBottom>
            Available Add-On Services
          </Typography>
          
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', my: 3 }}>
              <CircularProgress />
            </Box>
          ) : availableAddOns.length === 0 ? (
            <Alert severity="info">No add-on services are available for this reservation.</Alert>
          ) : (
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Service</TableCell>
                    <TableCell>Description</TableCell>
                    <TableCell align="right">Price</TableCell>
                    <TableCell align="center">Action</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {availableAddOns.map((addon) => (
                    <TableRow key={addon.id}>
                      <TableCell>{addon.name}</TableCell>
                      <TableCell>{addon.description}</TableCell>
                      <TableCell align="right">{formatCurrency(addon.price)}</TableCell>
                      <TableCell align="center">
                        <IconButton
                          size="small"
                          color="primary"
                          onClick={() => handleAddService(addon)}
                        >
                          <AddIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Box>
        
        <Divider sx={{ my: 2 }} />
        
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle1" gutterBottom>
            Selected Services
          </Typography>
          
          {selectedAddOns.length === 0 ? (
            <Alert severity="info">No services selected yet.</Alert>
          ) : (
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Service</TableCell>
                    <TableCell align="right">Price</TableCell>
                    <TableCell align="center">Quantity</TableCell>
                    <TableCell align="right">Total</TableCell>
                    <TableCell align="center">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {selectedAddOns.map((addon, index) => (
                    <TableRow key={index}>
                      <TableCell>{addon.name}</TableCell>
                      <TableCell align="right">{formatCurrency(addon.price)}</TableCell>
                      <TableCell align="center">
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <IconButton
                            size="small"
                            onClick={() => handleQuantityChange(index, addon.quantity - 1)}
                          >
                            <RemoveIcon fontSize="small" />
                          </IconButton>
                          <Typography sx={{ mx: 1 }}>{addon.quantity}</Typography>
                          <IconButton
                            size="small"
                            onClick={() => handleQuantityChange(index, addon.quantity + 1)}
                          >
                            <AddIcon fontSize="small" />
                          </IconButton>
                        </Box>
                      </TableCell>
                      <TableCell align="right">{formatCurrency(addon.price * addon.quantity)}</TableCell>
                      <TableCell align="center">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleRemoveAddon(index)}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                  
                  {/* Subtotal row */}
                  <TableRow>
                    <TableCell colSpan={3} align="right"><strong>Subtotal</strong></TableCell>
                    <TableCell align="right"><strong>{formatCurrency(subtotal)}</strong></TableCell>
                    <TableCell />
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleClose} disabled={saving}>
          Cancel
        </Button>
        {selectedAddOns.length === 0 ? (
          <Button 
            variant="outlined" 
            color="secondary"
            onClick={handleSaveAddOns}
            disabled={saving}
          >
            Continue to Checkout
          </Button>
        ) : (
          <Button 
            variant="contained" 
            color="primary"
            onClick={handleSaveAddOns}
            disabled={saving}
          >
            {saving ? <CircularProgress size={24} /> : 'Add Services & Checkout'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default AddOnSelectionDialog;
