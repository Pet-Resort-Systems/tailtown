/**
 * PriceRules Component
 * 
 * This component displays a list of price rules and provides functionality
 * to manage them (add, edit, delete). It's part of the Settings section
 * and provides a table view of all price rules with their key properties.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { 
  Container, 
  Typography, 
  Box, 
  Paper,
  Button, 
  TableContainer, 
  Table, 
  TableHead, 
  TableBody, 
  TableRow, 
  TableCell, 
  TablePagination,
  IconButton,
  CircularProgress,
  Alert,
  Breadcrumbs,
  Link as MuiLink
} from '@mui/material';
import { Link, useNavigate } from 'react-router-dom';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
// Import price rule types and service
import { PriceRule, PriceRuleServiceCategory, PriceRuleService } from '../../types/priceRule';
import priceRuleService from '../../services/priceRuleService';
// Import the alert dialog component for confirmations
import AlertDialog from '../../components/common/AlertDialog';

const PriceRules: React.FC = () => {
  const [priceRules, setPriceRules] = useState<PriceRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedRuleId, setSelectedRuleId] = useState<string | null>(null);
  
  const navigate = useNavigate();

  const fetchPriceRules = useCallback(async () => {
    setLoading(true);
    try {
      const response = await priceRuleService.getAllPriceRules({
        page: page + 1,
        limit: rowsPerPage
      });
      setPriceRules(response.data);
      setTotalCount(response.totalPages * rowsPerPage);
      setError('');
    } catch (err: any) {
      console.error('Error fetching price rules:', err);
      setError(err.response?.data?.message || 'Failed to load price rules');
      setPriceRules([]);
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage]);

  useEffect(() => {
    fetchPriceRules();
  }, [fetchPriceRules, page, rowsPerPage]);

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleDelete = async () => {
    if (!selectedRuleId) return;
    
    try {
      await priceRuleService.deletePriceRule(selectedRuleId);
      fetchPriceRules();
      setDeleteDialogOpen(false);
      setSelectedRuleId(null);
    } catch (err: any) {
      console.error('Error deleting price rule:', err);
      setError(err.response?.data?.message || 'Failed to delete price rule');
    }
  };

  const openDeleteDialog = (id: string) => {
    setSelectedRuleId(id);
    setDeleteDialogOpen(true);
  };

  const getRuleTypeDisplay = (rule: PriceRule) => {
    switch (rule.ruleType) {
      case 'DAY_OF_WEEK':
        return 'Day of Week';
      case 'MULTI_DAY':
        return 'Multi-Day Stay';
      case 'MULTI_PET':
        return 'Multiple Pets';
      case 'SEASONAL':
        return 'Seasonal';
      case 'PROMOTIONAL':
        return 'Promotional';
      case 'CUSTOM':
        return 'Custom';
      default:
        return rule.ruleType;
    }
  };

  const getDiscountDisplay = (rule: PriceRule) => {
    const prefix = rule.adjustmentType === 'SURCHARGE' ? '+' : '-';
    if (rule.discountType === 'PERCENTAGE') {
      return `${prefix}${rule.discountValue}%`;
    } else {
      return `${prefix}$${rule.discountValue.toFixed(2)}`;
    }
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ mt: 4, mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <Button
            component={Link}
            to="/settings"
            startIcon={<ArrowBackIcon />}
            sx={{ mr: 2 }}
          >
            Back
          </Button>
          <Box>
            <Breadcrumbs aria-label="breadcrumb" sx={{ mb: 1 }}>
              <MuiLink component={Link} to="/settings" color="inherit">
                Settings
              </MuiLink>
              <Typography color="text.primary">Price Rules</Typography>
            </Breadcrumbs>
            <Typography variant="h4" component="h1">
              Price Rules
            </Typography>
          </Box>
        </Box>

        <Typography variant="body1" color="text.secondary" paragraph>
          Manage pricing rules for services. Create discounts to reduce prices or surcharges to increase prices based on days of the week, multi-day stays, or multiple pets.
        </Typography>

        {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={() => navigate('/settings/price-rules/new')}
          >
            Add Rule
          </Button>
        </Box>

        <Paper sx={{ width: '100%', overflow: 'hidden' }}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Discount</TableCell>
                  <TableCell>Applies To</TableCell>
                  <TableCell>Active</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      <CircularProgress size={24} />
                    </TableCell>
                  </TableRow>
                ) : priceRules?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      No price rules found
                    </TableCell>
                  </TableRow>
                ) : (
                  priceRules.map((rule) => (
                    <TableRow key={rule.id}>
                      <TableCell>{rule.name}</TableCell>
                      <TableCell>{getRuleTypeDisplay(rule)}</TableCell>
                      <TableCell>{getDiscountDisplay(rule)}</TableCell>
                      <TableCell>
                        {rule.serviceCategories && rule.serviceCategories.length > 0 ? (
                          <Typography variant="body2">
                            {rule.serviceCategories.map((sc: PriceRuleServiceCategory) => sc.serviceCategory).join(', ')}
                          </Typography>
                        ) : rule.services && rule.services.length > 0 ? (
                          <Typography variant="body2">
                            {rule.services.map((s: PriceRuleService) => s.service?.name || 'Unknown').join(', ')}
                          </Typography>
                        ) : (
                          <Typography variant="body2">All Services</Typography>
                        )}
                      </TableCell>
                      <TableCell>{rule.isActive ? 'Yes' : 'No'}</TableCell>
                      <TableCell align="right">
                        <IconButton 
                          onClick={() => navigate(`/settings/price-rules/${rule.id}`)}
                          size="small"
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton 
                          onClick={() => openDeleteDialog(rule.id)}
                          size="small"
                          color="error"
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
          <TablePagination
            rowsPerPageOptions={[5, 10, 25]}
            component="div"
            count={totalCount}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
          />
        </Paper>
      </Box>

      <AlertDialog
        open={deleteDialogOpen}
        title="Confirm Deletion"
        content="Are you sure you want to delete this price rule? This action cannot be undone."
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={handleDelete}
      />
    </Container>
  );
};

export default PriceRules;
