import React, { useState, useEffect, useCallback } from "react";
import { getApiBaseUrl } from "../../services/api";
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
  Divider,
  Tabs,
  Tab,
  Chip,
} from "@mui/material";
import {
  Add as AddIcon,
  Remove as RemoveIcon,
  Delete as DeleteIcon,
  ShoppingCart as ProductIcon,
  Build as ServiceIcon,
  Inventory as StockIcon,
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { useShoppingCart } from "../../contexts/ShoppingCartContext";
import { reservationService } from "../../services/reservationService";
import addonService, { AddOnService } from "../../services/addonService";

interface AddOnSelectionDialogEnhancedProps {
  open: boolean;
  onClose: () => void;
  reservationId: string;
  serviceId: string;
  onAddOnsAdded: (success: boolean) => void;
  redirectToCheckout?: boolean;
}

interface Product {
  id: string;
  name: string;
  description?: string;
  price: number | string;
  currentStock: number;
  category?: {
    name: string;
  };
}

interface SelectedItem {
  id: string;
  name: string;
  description?: string;
  quantity: number;
  price: number;
  type: "service" | "product";
  productId?: string;
  addOnId?: string;
  serviceId?: string;
}

const AddOnSelectionDialogEnhanced: React.FC<
  AddOnSelectionDialogEnhancedProps
> = ({
  open,
  onClose,
  reservationId,
  serviceId,
  onAddOnsAdded,
  redirectToCheckout = false,
}) => {
  // State
  const [availableAddOns, setAvailableAddOns] = useState<AddOnService[]>([]);
  const [availableProducts, setAvailableProducts] = useState<Product[]>([]);
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [currentTab, setCurrentTab] = useState(0);

  const navigate = useNavigate();
  const { addItem } = useShoppingCart();

  // Calculate subtotal
  const subtotal = selectedItems.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  // Load add-on services
  const loadAddOns = useCallback(async () => {
    if (!serviceId || !open) return;

    try {
      setLoading(true);
      setError(null);

      const addOns = await addonService.getAllAddOns(serviceId);

      if (addOns.length === 0) {
        const allAddOns = await addonService.getAllAddOns();
        setAvailableAddOns(allAddOns);
      } else {
        setAvailableAddOns(addOns);
      }
    } catch (err: any) {
      console.error("Error loading add-ons:", err);
      setError("Failed to load add-on services.");
    } finally {
      setLoading(false);
    }
  }, [serviceId, open]);

  // Load products
  const loadProducts = useCallback(async () => {
    if (!open) return;

    try {
      setLoadingProducts(true);
      const apiUrl = getApiBaseUrl();
      const response = await fetch(
        `${apiUrl}/api/products?isActive=true&isService=false`,
        {
          headers: {
            "x-tenant-id":
              localStorage.getItem("tailtown_tenant_id") ||
              localStorage.getItem("tenantId") ||
              "dev",
          },
        }
      );

      if (!response.ok) throw new Error("Failed to load products");

      const data = await response.json();
      setAvailableProducts(data.data || []);
    } catch (err: any) {
      console.error("Error loading products:", err);
      // Don't show error for products, just log it
    } finally {
      setLoadingProducts(false);
    }
  }, [open]);

  // Load data when dialog opens
  useEffect(() => {
    if (open) {
      if (serviceId) {
        loadAddOns();
      }
      loadProducts();
      setSelectedItems([]);
      setError(null);
      setSuccess(null);
    }
  }, [open, serviceId, loadAddOns, loadProducts]);

  // Handle adding a service add-on
  const handleAddService = (addon: AddOnService) => {
    const existingIndex = selectedItems.findIndex(
      (item) => item.type === "service" && item.addOnId === addon.id
    );

    if (existingIndex >= 0) {
      const updated = [...selectedItems];
      updated[existingIndex].quantity += 1;
      setSelectedItems(updated);
    } else {
      setSelectedItems([
        ...selectedItems,
        {
          id: addon.id,
          name: addon.name,
          description: addon.description,
          price: addon.price,
          quantity: 1,
          type: "service",
          addOnId: addon.id,
          serviceId: addon.serviceId,
        },
      ]);
    }
  };

  // Handle adding a product
  const handleAddProduct = (product: Product) => {
    const existingIndex = selectedItems.findIndex(
      (item) => item.type === "product" && item.productId === product.id
    );
    const currentQty =
      existingIndex >= 0 ? selectedItems[existingIndex].quantity : 0;

    // Check stock availability
    if (currentQty >= product.currentStock) {
      setError(`Only ${product.currentStock} units available in stock`);
      setTimeout(() => setError(null), 3000);
      return;
    }

    if (existingIndex >= 0) {
      const updated = [...selectedItems];
      updated[existingIndex].quantity += 1;
      setSelectedItems(updated);
    } else {
      setSelectedItems([
        ...selectedItems,
        {
          id: product.id,
          name: product.name,
          description: product.description,
          price: Number(product.price),
          quantity: 1,
          type: "product",
          productId: product.id,
        },
      ]);
    }
  };

  // Handle quantity change
  const handleQuantityChange = (index: number, newQuantity: number) => {
    if (newQuantity < 1) return;

    const item = selectedItems[index];

    // Check stock for products
    if (item.type === "product") {
      const product = availableProducts.find((p) => p.id === item.productId);
      if (product && newQuantity > product.currentStock) {
        setError(`Only ${product.currentStock} units available in stock`);
        setTimeout(() => setError(null), 3000);
        return;
      }
    }

    const updated = [...selectedItems];
    updated[index].quantity = newQuantity;
    setSelectedItems(updated);
  };

  // Handle remove item
  const handleRemoveItem = (index: number) => {
    setSelectedItems(selectedItems.filter((_, i) => i !== index));
  };

  // Handle save and checkout
  const handleSaveAndCheckout = async () => {
    try {
      setSaving(true);
      setError(null);

      // Separate services and products
      const services = selectedItems.filter((item) => item.type === "service");
      const products = selectedItems.filter((item) => item.type === "product");

      // Save service add-ons to reservation if any
      if (services.length > 0) {
        const addOnData = services.map((service) => ({
          serviceId: service.addOnId!,
          quantity: service.quantity,
        }));

        await reservationService.addAddOnsToReservation(
          reservationId,
          addOnData
        );
        setSuccess("Services added successfully!");
      }

      // Get reservation details
      const reservation = await reservationService.getReservationById(
        reservationId
      );

      // Create cart item with both services and products
      const cartItem = {
        id: `reservation-${reservationId}`,
        price: reservation.service?.price || 0,
        quantity: 1,
        serviceName: reservation.service?.name || "Unknown Service",
        serviceId: reservation.serviceId,
        customerId: reservation.customerId,
        customerName: `${reservation.customer?.firstName || ""} ${
          reservation.customer?.lastName || ""
        }`.trim(),
        petId: reservation.petId,
        petName: reservation.pet?.name || "Unknown Pet",
        startDate: new Date(reservation.startDate),
        endDate: new Date(reservation.endDate),
        suiteType: "STANDARD_SUITE",
        resourceId: reservation.resource?.id || undefined,
        notes: reservation.notes || "",
        addOns: services.map((service) => ({
          id: service.addOnId!,
          name: service.name,
          price: service.price,
          quantity: service.quantity,
        })),
        products: products.map((product) => ({
          id: product.productId!,
          name: product.name,
          price: product.price,
          quantity: product.quantity,
        })),
      };

      // Add to cart and navigate to checkout
      addItem(cartItem);
      onAddOnsAdded(true);
      navigate("/checkout");
      onClose();
    } catch (err: any) {
      console.error("Error saving items:", err);
      setError(
        err.response?.data?.message || "Failed to add items. Please try again."
      );
      onAddOnsAdded(false);
    } finally {
      setSaving(false);
    }
  };

  // Handle continue without items
  const handleContinueWithout = async () => {
    try {
      const reservation = await reservationService.getReservationById(
        reservationId
      );

      const cartItem = {
        id: `reservation-${reservationId}`,
        price: reservation.service?.price || 0,
        quantity: 1,
        serviceName: reservation.service?.name || "Unknown Service",
        serviceId: reservation.serviceId,
        customerId: reservation.customerId,
        customerName: `${reservation.customer?.firstName || ""} ${
          reservation.customer?.lastName || ""
        }`.trim(),
        petId: reservation.petId,
        petName: reservation.pet?.name || "Unknown Pet",
        startDate: new Date(reservation.startDate),
        endDate: new Date(reservation.endDate),
        suiteType: "STANDARD_SUITE",
        resourceId: reservation.resource?.id || undefined,
        notes: reservation.notes || "",
        addOns: [],
        products: [],
      };

      addItem(cartItem);
      navigate("/checkout");
      onClose();
    } catch (error) {
      console.error("Error preparing checkout:", error);
      onClose();
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const handleClose = () => {
    if (!saving) {
      onClose();
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      disableRestoreFocus
    >
      <DialogTitle>Add Services & Products to Your Reservation</DialogTitle>

      <DialogContent dividers>
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

        <Tabs
          value={currentTab}
          onChange={(_, newValue) => setCurrentTab(newValue)}
          sx={{ mb: 2 }}
        >
          <Tab icon={<ServiceIcon />} label="Service Add-Ons" />
          <Tab icon={<ProductIcon />} label="Retail Products" />
        </Tabs>

        {/* Service Add-Ons Tab */}
        {currentTab === 0 && (
          <Box>
            <Typography variant="subtitle1" gutterBottom>
              Available Add-On Services
            </Typography>

            {loading ? (
              <Box sx={{ display: "flex", justifyContent: "center", my: 3 }}>
                <CircularProgress />
              </Box>
            ) : availableAddOns.length === 0 ? (
              <Alert severity="info">
                No add-on services available for this reservation.
              </Alert>
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
                        <TableCell align="right">
                          {formatCurrency(addon.price)}
                        </TableCell>
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
        )}

        {/* Retail Products Tab */}
        {currentTab === 1 && (
          <Box>
            <Typography variant="subtitle1" gutterBottom>
              Available Retail Products
            </Typography>

            {loadingProducts ? (
              <Box sx={{ display: "flex", justifyContent: "center", my: 3 }}>
                <CircularProgress />
              </Box>
            ) : availableProducts.length === 0 ? (
              <Alert severity="info">No retail products available.</Alert>
            ) : (
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Product</TableCell>
                      <TableCell>Category</TableCell>
                      <TableCell align="right">Price</TableCell>
                      <TableCell align="center">Stock</TableCell>
                      <TableCell align="center">Action</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {availableProducts.map((product) => (
                      <TableRow key={product.id}>
                        <TableCell>
                          <Box>
                            <Typography variant="body2">
                              {product.name}
                            </Typography>
                            {product.description && (
                              <Typography
                                variant="caption"
                                color="text.secondary"
                              >
                                {product.description}
                              </Typography>
                            )}
                          </Box>
                        </TableCell>
                        <TableCell>{product.category?.name || "-"}</TableCell>
                        <TableCell align="right">
                          {formatCurrency(Number(product.price))}
                        </TableCell>
                        <TableCell align="center">
                          <Chip
                            icon={<StockIcon />}
                            label={product.currentStock}
                            size="small"
                            color={
                              product.currentStock > 10
                                ? "success"
                                : product.currentStock > 0
                                ? "warning"
                                : "error"
                            }
                          />
                        </TableCell>
                        <TableCell align="center">
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={() => handleAddProduct(product)}
                            disabled={product.currentStock === 0}
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
        )}

        <Divider sx={{ my: 2 }} />

        {/* Selected Items */}
        <Box>
          <Typography variant="subtitle1" gutterBottom>
            Selected Items
          </Typography>

          {selectedItems.length === 0 ? (
            <Alert severity="info">No items selected yet.</Alert>
          ) : (
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Item</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell align="right">Price</TableCell>
                    <TableCell align="center">Quantity</TableCell>
                    <TableCell align="right">Total</TableCell>
                    <TableCell align="center">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {selectedItems.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell>{item.name}</TableCell>
                      <TableCell>
                        <Chip
                          label={
                            item.type === "service" ? "Service" : "Product"
                          }
                          size="small"
                          color={
                            item.type === "service" ? "primary" : "secondary"
                          }
                        />
                      </TableCell>
                      <TableCell align="right">
                        {formatCurrency(item.price)}
                      </TableCell>
                      <TableCell align="center">
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <IconButton
                            size="small"
                            onClick={() =>
                              handleQuantityChange(index, item.quantity - 1)
                            }
                          >
                            <RemoveIcon fontSize="small" />
                          </IconButton>
                          <Typography sx={{ mx: 1 }}>
                            {item.quantity}
                          </Typography>
                          <IconButton
                            size="small"
                            onClick={() =>
                              handleQuantityChange(index, item.quantity + 1)
                            }
                          >
                            <AddIcon fontSize="small" />
                          </IconButton>
                        </Box>
                      </TableCell>
                      <TableCell align="right">
                        {formatCurrency(item.price * item.quantity)}
                      </TableCell>
                      <TableCell align="center">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleRemoveItem(index)}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}

                  <TableRow>
                    <TableCell colSpan={4} align="right">
                      <strong>Subtotal</strong>
                    </TableCell>
                    <TableCell align="right">
                      <strong>{formatCurrency(subtotal)}</strong>
                    </TableCell>
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
        {selectedItems.length === 0 ? (
          <Button
            variant="outlined"
            color="secondary"
            onClick={handleContinueWithout}
            disabled={saving}
          >
            Continue to Checkout
          </Button>
        ) : (
          <Button
            variant="contained"
            color="primary"
            onClick={handleSaveAndCheckout}
            disabled={saving}
          >
            {saving ? <CircularProgress size={24} /> : "Add Items & Checkout"}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default AddOnSelectionDialogEnhanced;
