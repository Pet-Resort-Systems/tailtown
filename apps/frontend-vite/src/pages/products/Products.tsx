import React, { useState, useEffect } from "react";
import { getApiBaseUrl } from "../../services/api";
import {
  Container,
  Typography,
  Box,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Chip,
  TextField,
  InputAdornment,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Checkbox,
  Grid,
  Alert,
  Snackbar,
  Tabs,
  Tab,
} from "@mui/material";
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  Inventory as InventoryIcon,
  Warning as WarningIcon,
} from "@mui/icons-material";

interface Product {
  id: string;
  sku?: string;
  name: string;
  description?: string;
  categoryId?: string;
  price: number | string; // Decimal from DB comes as string
  cost?: number | string;
  taxable: boolean;
  trackInventory: boolean;
  currentStock: number;
  lowStockAlert?: number;
  isService: boolean;
  isPackage: boolean;
  isActive: boolean;
  isFeatured: boolean;
  category?: {
    id: string;
    name: string;
  };
}

interface Category {
  id: string;
  name: string;
  description?: string;
}

// Helper to get auth headers
const getAuthHeaders = () => {
  const tenantId =
    localStorage.getItem("tailtown_tenant_id") ||
    localStorage.getItem("tenantId") ||
    "dev";
  const token =
    localStorage.getItem("impersonationToken") ||
    localStorage.getItem("accessToken") ||
    localStorage.getItem("token");
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "x-tenant-id": tenantId,
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
};

const Products: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [currentTab, setCurrentTab] = useState(0);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success" as "success" | "error",
  });

  // Inventory adjustment state
  const [inventoryDialogOpen, setInventoryDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [inventoryAdjustment, setInventoryAdjustment] = useState({
    quantity: "",
    changeType: "ADJUSTMENT",
    reason: "",
  });

  const [formData, setFormData] = useState({
    sku: "",
    name: "",
    description: "",
    categoryId: "",
    price: "",
    cost: "",
    taxable: true,
    trackInventory: true,
    currentStock: "0",
    lowStockAlert: "",
    reorderPoint: "",
    reorderQuantity: "",
    isService: false,
    isPackage: false,
    isFeatured: false,
  });

  useEffect(
    () => {
      // eslint-disable-next-line react-hooks/exhaustive-deps
      loadProducts();
      loadCategories();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  useEffect(
    () => {
      // eslint-disable-next-line react-hooks/exhaustive-deps
      filterProducts();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [products, searchQuery, selectedCategory, currentTab]
  );

  const loadProducts = async () => {
    try {
      const apiUrl = getApiBaseUrl();
      const response = await fetch(`${apiUrl}/api/products`, {
        headers: getAuthHeaders(),
      });
      const data = await response.json();
      if (data.status === "success") {
        setProducts(data.data);
      }
    } catch (error) {
      console.error("Error loading products:", error);
    }
  };

  const loadCategories = async () => {
    try {
      const apiUrl = getApiBaseUrl();
      const response = await fetch(`${apiUrl}/api/products/categories`, {
        headers: getAuthHeaders(),
      });
      const data = await response.json();
      if (data.status === "success") {
        setCategories(data.data);
      }
    } catch (error) {
      console.error("Error loading categories:", error);
    }
  };

  const filterProducts = () => {
    let filtered = products;

    // Filter by tab (All, Physical, Services, Packages)
    if (currentTab === 1)
      filtered = filtered.filter((p) => !p.isService && !p.isPackage);
    if (currentTab === 2) filtered = filtered.filter((p) => p.isService);
    if (currentTab === 3) filtered = filtered.filter((p) => p.isPackage);

    // Filter by category
    if (selectedCategory !== "all") {
      filtered = filtered.filter((p) => p.categoryId === selectedCategory);
    }

    // Filter by search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          (p.sku && p.sku.toLowerCase().includes(query)) ||
          (p.description && p.description.toLowerCase().includes(query))
      );
    }

    setFilteredProducts(filtered);
  };

  const handleOpenDialog = (product?: Product) => {
    if (product) {
      setEditingProduct(product);
      setFormData({
        sku: product.sku || "",
        name: product.name,
        description: product.description || "",
        categoryId: product.categoryId || "",
        price: product.price.toString(),
        cost: product.cost?.toString() || "",
        taxable: product.taxable,
        trackInventory: product.trackInventory,
        currentStock: product.currentStock.toString(),
        lowStockAlert: product.lowStockAlert?.toString() || "",
        reorderPoint: "",
        reorderQuantity: "",
        isService: product.isService,
        isPackage: product.isPackage,
        isFeatured: product.isFeatured,
      });
    } else {
      setEditingProduct(null);
      setFormData({
        sku: "",
        name: "",
        description: "",
        categoryId: "",
        price: "",
        cost: "",
        taxable: true,
        trackInventory: true,
        currentStock: "0",
        lowStockAlert: "",
        reorderPoint: "",
        reorderQuantity: "",
        isService: false,
        isPackage: false,
        isFeatured: false,
      });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingProduct(null);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.price) {
      setSnackbar({
        open: true,
        message: "Name and price are required",
        severity: "error",
      });
      return;
    }

    try {
      const apiUrl = getApiBaseUrl();
      const url = editingProduct
        ? `${apiUrl}/api/products/${editingProduct.id}`
        : `${apiUrl}/api/products`;

      const response = await fetch(url, {
        method: editingProduct ? "PUT" : "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          ...formData,
          price: parseFloat(formData.price),
          cost: formData.cost ? parseFloat(formData.cost) : undefined,
          currentStock: parseInt(formData.currentStock),
          lowStockAlert: formData.lowStockAlert
            ? parseInt(formData.lowStockAlert)
            : undefined,
          reorderPoint: formData.reorderPoint
            ? parseInt(formData.reorderPoint)
            : undefined,
          reorderQuantity: formData.reorderQuantity
            ? parseInt(formData.reorderQuantity)
            : undefined,
        }),
      });

      if (!response.ok) throw new Error("Failed to save product");

      setSnackbar({
        open: true,
        message: editingProduct ? "Product updated!" : "Product created!",
        severity: "success",
      });

      handleCloseDialog();
      loadProducts();
    } catch (error) {
      console.error("Error saving product:", error);
      setSnackbar({
        open: true,
        message: "Failed to save product",
        severity: "error",
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this product?"))
      return;

    try {
      const apiUrl = getApiBaseUrl();
      const response = await fetch(`${apiUrl}/api/products/${id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });

      if (!response.ok) throw new Error("Failed to delete product");

      setSnackbar({
        open: true,
        message: "Product deleted!",
        severity: "success",
      });

      loadProducts();
    } catch (error) {
      console.error("Error deleting product:", error);
      setSnackbar({
        open: true,
        message: "Failed to delete product",
        severity: "error",
      });
    }
  };

  const isLowStock = (product: Product) => {
    if (!product.trackInventory || product.isService) return false;
    if (product.lowStockAlert) {
      return product.currentStock <= product.lowStockAlert;
    }
    return product.currentStock === 0;
  };

  const handleOpenInventoryDialog = (product: Product) => {
    setSelectedProduct(product);
    setInventoryAdjustment({
      quantity: "",
      changeType: "ADJUSTMENT",
      reason: "",
    });
    setInventoryDialogOpen(true);
  };

  const handleCloseInventoryDialog = () => {
    setInventoryDialogOpen(false);
    setSelectedProduct(null);
  };

  const handleInventoryAdjustment = async () => {
    if (!selectedProduct || !inventoryAdjustment.quantity) {
      setSnackbar({
        open: true,
        message: "Quantity is required",
        severity: "error",
      });
      return;
    }

    try {
      const apiUrl = getApiBaseUrl();
      const response = await fetch(
        `${apiUrl}/api/products/${selectedProduct.id}/inventory/adjust`,
        {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify({
            quantity: parseInt(inventoryAdjustment.quantity),
            changeType: inventoryAdjustment.changeType,
            reason: inventoryAdjustment.reason || undefined,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to adjust inventory");
      }

      setSnackbar({
        open: true,
        message: "Inventory adjusted successfully!",
        severity: "success",
      });

      handleCloseInventoryDialog();
      loadProducts();
    } catch (error: any) {
      console.error("Error adjusting inventory:", error);
      setSnackbar({
        open: true,
        message: error.message || "Failed to adjust inventory",
        severity: "error",
      });
    }
  };

  return (
    <Container maxWidth="xl">
      <Box sx={{ mt: 4, mb: 4 }}>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 3,
          }}
        >
          <Typography variant="h4">Products & Inventory</Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
          >
            Add Product
          </Button>
        </Box>

        {/* Filters */}
        <Paper sx={{ p: 2, mb: 3 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Category</InputLabel>
                <Select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  label="Category"
                >
                  <MenuItem value="all">All Categories</MenuItem>
                  {categories.map((cat) => (
                    <MenuItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </Paper>

        {/* Tabs */}
        <Tabs
          value={currentTab}
          onChange={(e, v) => setCurrentTab(v)}
          sx={{ mb: 2 }}
        >
          <Tab label={`All (${products.length})`} />
          <Tab
            label={`Physical Products (${
              products.filter((p) => !p.isService && !p.isPackage).length
            })`}
          />
          <Tab
            label={`Services (${products.filter((p) => p.isService).length})`}
          />
          <Tab
            label={`Packages (${products.filter((p) => p.isPackage).length})`}
          />
        </Tabs>

        {/* Products Table */}
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>SKU</TableCell>
                <TableCell>Name</TableCell>
                <TableCell>Category</TableCell>
                <TableCell align="right">Price</TableCell>
                <TableCell align="center">Stock</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredProducts.map((product) => (
                <TableRow
                  key={product.id}
                  sx={{ "&:hover": { bgcolor: "action.hover" } }}
                >
                  <TableCell>{product.sku || "-"}</TableCell>
                  <TableCell>
                    <Box>
                      <Typography variant="body2" fontWeight="medium">
                        {product.name}
                      </Typography>
                      {product.description && (
                        <Typography variant="caption" color="text.secondary">
                          {product.description.substring(0, 50)}...
                        </Typography>
                      )}
                    </Box>
                  </TableCell>
                  <TableCell>{product.category?.name || "-"}</TableCell>
                  <TableCell align="right">
                    ${Number(product.price).toFixed(2)}
                  </TableCell>
                  <TableCell align="center">
                    {product.trackInventory && !product.isService ? (
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 0.5,
                        }}
                      >
                        {isLowStock(product) && (
                          <WarningIcon color="warning" fontSize="small" />
                        )}
                        <Typography
                          variant="body2"
                          color={
                            isLowStock(product) ? "warning.main" : "inherit"
                          }
                        >
                          {product.currentStock}
                        </Typography>
                      </Box>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                  <TableCell>
                    {product.isService && (
                      <Chip label="Service" size="small" color="info" />
                    )}
                    {product.isPackage && (
                      <Chip label="Package" size="small" color="secondary" />
                    )}
                    {!product.isService && !product.isPackage && (
                      <Chip label="Product" size="small" />
                    )}
                  </TableCell>
                  <TableCell>
                    {product.isFeatured && (
                      <Chip
                        label="Featured"
                        size="small"
                        color="primary"
                        sx={{ mr: 0.5 }}
                      />
                    )}
                    <Chip
                      label={product.isActive ? "Active" : "Inactive"}
                      size="small"
                      color={product.isActive ? "success" : "default"}
                    />
                  </TableCell>
                  <TableCell align="right">
                    {product.trackInventory && !product.isService && (
                      <IconButton
                        size="small"
                        color="primary"
                        onClick={() => handleOpenInventoryDialog(product)}
                        title="Adjust Inventory"
                      >
                        <InventoryIcon fontSize="small" />
                      </IconButton>
                    )}
                    <IconButton
                      size="small"
                      onClick={() => handleOpenDialog(product)}
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => handleDelete(product.id)}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
              {filteredProducts.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                    <Typography color="text.secondary">
                      No products found
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Add/Edit Dialog */}
        <Dialog
          open={dialogOpen}
          onClose={handleCloseDialog}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>
            {editingProduct ? "Edit Product" : "Add Product"}
          </DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Product Name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="SKU"
                  value={formData.sku}
                  onChange={(e) =>
                    setFormData({ ...formData, sku: e.target.value })
                  }
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  multiline
                  rows={2}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Category</InputLabel>
                  <Select
                    value={formData.categoryId}
                    onChange={(e) =>
                      setFormData({ ...formData, categoryId: e.target.value })
                    }
                    label="Category"
                  >
                    <MenuItem value="">None</MenuItem>
                    {categories.map((cat) => (
                      <MenuItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Price"
                  type="number"
                  value={formData.price}
                  onChange={(e) =>
                    setFormData({ ...formData, price: e.target.value })
                  }
                  required
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">$</InputAdornment>
                    ),
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Cost"
                  type="number"
                  value={formData.cost}
                  onChange={(e) =>
                    setFormData({ ...formData, cost: e.target.value })
                  }
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">$</InputAdornment>
                    ),
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Current Stock"
                  type="number"
                  value={formData.currentStock}
                  onChange={(e) =>
                    setFormData({ ...formData, currentStock: e.target.value })
                  }
                  disabled={formData.isService || !formData.trackInventory}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Low Stock Alert"
                  type="number"
                  value={formData.lowStockAlert}
                  onChange={(e) =>
                    setFormData({ ...formData, lowStockAlert: e.target.value })
                  }
                  disabled={formData.isService || !formData.trackInventory}
                />
              </Grid>
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={formData.taxable}
                      onChange={(e) =>
                        setFormData({ ...formData, taxable: e.target.checked })
                      }
                    />
                  }
                  label="Taxable"
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={formData.trackInventory}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          trackInventory: e.target.checked,
                        })
                      }
                      disabled={formData.isService}
                    />
                  }
                  label="Track Inventory"
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={formData.isService}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          isService: e.target.checked,
                          trackInventory: !e.target.checked,
                        })
                      }
                    />
                  }
                  label="Service (no inventory)"
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={formData.isFeatured}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          isFeatured: e.target.checked,
                        })
                      }
                    />
                  }
                  label="Featured"
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>Cancel</Button>
            <Button onClick={handleSave} variant="contained">
              {editingProduct ? "Update" : "Create"}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Inventory Adjustment Dialog */}
        <Dialog
          open={inventoryDialogOpen}
          onClose={handleCloseInventoryDialog}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>Adjust Inventory - {selectedProduct?.name}</DialogTitle>
          <DialogContent>
            <Box sx={{ mt: 2 }}>
              <Alert severity="info" sx={{ mb: 2 }}>
                Current Stock:{" "}
                <strong>{selectedProduct?.currentStock || 0}</strong>
              </Alert>

              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <FormControl fullWidth>
                    <InputLabel>Change Type</InputLabel>
                    <Select
                      value={inventoryAdjustment.changeType}
                      onChange={(e) =>
                        setInventoryAdjustment({
                          ...inventoryAdjustment,
                          changeType: e.target.value,
                        })
                      }
                      label="Change Type"
                    >
                      <MenuItem value="PURCHASE">Purchase (Add Stock)</MenuItem>
                      <MenuItem value="SALE">Sale (Remove Stock)</MenuItem>
                      <MenuItem value="ADJUSTMENT">Manual Adjustment</MenuItem>
                      <MenuItem value="RETURN">Customer Return</MenuItem>
                      <MenuItem value="DAMAGE">Damaged/Lost</MenuItem>
                      <MenuItem value="RESTOCK">Restock</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Quantity"
                    type="number"
                    value={inventoryAdjustment.quantity}
                    onChange={(e) =>
                      setInventoryAdjustment({
                        ...inventoryAdjustment,
                        quantity: e.target.value,
                      })
                    }
                    helperText="Use negative numbers to decrease stock (e.g., -5 for removing 5 items)"
                    required
                  />
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Reason (Optional)"
                    value={inventoryAdjustment.reason}
                    onChange={(e) =>
                      setInventoryAdjustment({
                        ...inventoryAdjustment,
                        reason: e.target.value,
                      })
                    }
                    multiline
                    rows={2}
                    placeholder="Enter reason for adjustment..."
                  />
                </Grid>

                {inventoryAdjustment.quantity && (
                  <Grid item xs={12}>
                    <Alert
                      severity={
                        parseInt(inventoryAdjustment.quantity) >= 0
                          ? "success"
                          : "warning"
                      }
                    >
                      New Stock:{" "}
                      <strong>
                        {(selectedProduct?.currentStock || 0) +
                          parseInt(inventoryAdjustment.quantity || "0")}
                      </strong>
                    </Alert>
                  </Grid>
                )}
              </Grid>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseInventoryDialog}>Cancel</Button>
            <Button
              onClick={handleInventoryAdjustment}
              variant="contained"
              color="primary"
            >
              Adjust Inventory
            </Button>
          </DialogActions>
        </Dialog>

        {/* Snackbar */}
        <Snackbar
          open={snackbar.open}
          autoHideDuration={4000}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
        >
          <Alert
            severity={snackbar.severity}
            onClose={() => setSnackbar({ ...snackbar, open: false })}
          >
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Box>
    </Container>
  );
};

export default Products;
