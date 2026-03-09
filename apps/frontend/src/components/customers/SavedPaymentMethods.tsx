/**
 * Saved Payment Methods Component
 * Displays and manages customer's cards on file
 */

import React, { useState, useEffect, useCallback } from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  CircularProgress,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
} from "@mui/material";
import {
  CreditCard as CreditCardIcon,
  MoreVert as MoreVertIcon,
  Delete as DeleteIcon,
  Star as StarIcon,
  Edit as EditIcon,
} from "@mui/icons-material";
import {
  customerPaymentMethodService,
  SavedPaymentMethod,
} from "../../services/customerPaymentMethodService";

interface SavedPaymentMethodsProps {
  customerId: string;
  onCardSelect?: (method: SavedPaymentMethod) => void;
  selectable?: boolean;
  selectedMethodId?: string;
}

const SavedPaymentMethods: React.FC<SavedPaymentMethodsProps> = ({
  customerId,
  onCardSelect,
  selectable = false,
  selectedMethodId,
}) => {
  const [paymentMethods, setPaymentMethods] = useState<SavedPaymentMethod[]>(
    []
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [selectedMethod, setSelectedMethod] =
    useState<SavedPaymentMethod | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [nickname, setNickname] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const loadPaymentMethods = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const methods = await customerPaymentMethodService.getPaymentMethods(
        customerId
      );
      setPaymentMethods(methods);
    } catch (err: any) {
      setError(err.message || "Failed to load payment methods");
    } finally {
      setLoading(false);
    }
  }, [customerId]);

  useEffect(() => {
    loadPaymentMethods();
  }, [loadPaymentMethods]);

  const handleMenuOpen = (
    event: React.MouseEvent<HTMLElement>,
    method: SavedPaymentMethod
  ) => {
    event.stopPropagation();
    setMenuAnchor(event.currentTarget);
    setSelectedMethod(method);
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
  };

  const handleEditClick = () => {
    if (selectedMethod) {
      setNickname(selectedMethod.nickname || "");
      setEditDialogOpen(true);
    }
    handleMenuClose();
  };

  const handleDeleteClick = () => {
    setDeleteDialogOpen(true);
    handleMenuClose();
  };

  const handleSetDefault = async () => {
    if (!selectedMethod) return;

    try {
      setActionLoading(true);
      await customerPaymentMethodService.updatePaymentMethod(
        customerId,
        selectedMethod.id,
        { setAsDefault: true }
      );
      await loadPaymentMethods();
    } catch (err: any) {
      setError(err.message || "Failed to set default");
    } finally {
      setActionLoading(false);
      handleMenuClose();
    }
  };

  const handleSaveNickname = async () => {
    if (!selectedMethod) return;

    try {
      setActionLoading(true);
      await customerPaymentMethodService.updatePaymentMethod(
        customerId,
        selectedMethod.id,
        { nickname: nickname || undefined }
      );
      setEditDialogOpen(false);
      await loadPaymentMethods();
    } catch (err: any) {
      setError(err.message || "Failed to update");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedMethod) return;

    try {
      setActionLoading(true);
      await customerPaymentMethodService.deletePaymentMethod(
        customerId,
        selectedMethod.id
      );
      setDeleteDialogOpen(false);
      await loadPaymentMethods();
    } catch (err: any) {
      setError(err.message || "Failed to delete");
    } finally {
      setActionLoading(false);
    }
  };

  const handleCardClick = (method: SavedPaymentMethod) => {
    if (selectable && onCardSelect) {
      onCardSelect(method);
    }
  };

  const getCardDisplay = (method: SavedPaymentMethod) => {
    const brand = customerPaymentMethodService.formatCardBrand(
      method.cardBrand
    );
    const expiry = customerPaymentMethodService.formatExpiry(
      method.expiryMonth,
      method.expiryYear
    );
    const isExpired = customerPaymentMethodService.isExpired(
      method.expiryMonth,
      method.expiryYear
    );

    return (
      <Box sx={{ display: "flex", alignItems: "center", gap: 2, flex: 1 }}>
        <CreditCardIcon
          sx={{
            fontSize: 40,
            color: isExpired ? "error.main" : "primary.main",
          }}
        />
        <Box sx={{ flex: 1 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Typography variant="subtitle1" fontWeight="medium">
              {method.nickname || `${brand} ending in ${method.lastFour}`}
            </Typography>
            {method.isDefault && (
              <Chip label="Default" size="small" color="primary" />
            )}
            {isExpired && <Chip label="Expired" size="small" color="error" />}
          </Box>
          <Typography variant="body2" color="text.secondary">
            {brand} •••• {method.lastFour} | Exp: {expiry}
          </Typography>
          {method.cardholderName && (
            <Typography variant="caption" color="text.secondary">
              {method.cardholderName}
            </Typography>
          )}
        </Box>
      </Box>
    );
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", p: 3 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {paymentMethods.length === 0 ? (
        <Card variant="outlined">
          <CardContent sx={{ textAlign: "center", py: 4 }}>
            <CreditCardIcon
              sx={{ fontSize: 48, color: "text.disabled", mb: 1 }}
            />
            <Typography variant="body1" color="text.secondary">
              No saved payment methods
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Cards can be saved during checkout
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
          {paymentMethods.map((method) => (
            <Card
              key={method.id}
              variant="outlined"
              sx={{
                cursor: selectable ? "pointer" : "default",
                border: selectedMethodId === method.id ? 2 : 1,
                borderColor:
                  selectedMethodId === method.id ? "primary.main" : "divider",
                "&:hover": selectable ? { borderColor: "primary.light" } : {},
              }}
              onClick={() => handleCardClick(method)}
            >
              <CardContent
                sx={{
                  display: "flex",
                  alignItems: "center",
                  py: 1.5,
                  "&:last-child": { pb: 1.5 },
                }}
              >
                {getCardDisplay(method)}
                <IconButton
                  size="small"
                  onClick={(e) => handleMenuOpen(e, method)}
                >
                  <MoreVertIcon />
                </IconButton>
              </CardContent>
            </Card>
          ))}
        </Box>
      )}

      {/* Actions Menu */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={handleMenuClose}
      >
        {selectedMethod && !selectedMethod.isDefault && (
          <MenuItem onClick={handleSetDefault} disabled={actionLoading}>
            <ListItemIcon>
              <StarIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Set as Default</ListItemText>
          </MenuItem>
        )}
        <MenuItem onClick={handleEditClick}>
          <ListItemIcon>
            <EditIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Edit Nickname</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleDeleteClick} sx={{ color: "error.main" }}>
          <ListItemIcon>
            <DeleteIcon fontSize="small" color="error" />
          </ListItemIcon>
          <ListItemText>Remove Card</ListItemText>
        </MenuItem>
      </Menu>

      {/* Edit Nickname Dialog */}
      <Dialog
        open={editDialogOpen}
        onClose={() => setEditDialogOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Edit Card Nickname</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Nickname (optional)"
            fullWidth
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="e.g., Personal Visa, Business Card"
            helperText="Give this card a friendly name for easy identification"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleSaveNickname}
            variant="contained"
            disabled={actionLoading}
          >
            {actionLoading ? <CircularProgress size={20} /> : "Save"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>Remove Payment Method?</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to remove this card? This action cannot be
            undone.
          </Typography>
          {selectedMethod && (
            <Box sx={{ mt: 2, p: 2, bgcolor: "grey.100", borderRadius: 1 }}>
              <Typography variant="body2">
                {customerPaymentMethodService.formatCardBrand(
                  selectedMethod.cardBrand
                )}{" "}
                •••• {selectedMethod.lastFour}
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleDelete}
            color="error"
            variant="contained"
            disabled={actionLoading}
          >
            {actionLoading ? <CircularProgress size={20} /> : "Remove"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SavedPaymentMethods;
