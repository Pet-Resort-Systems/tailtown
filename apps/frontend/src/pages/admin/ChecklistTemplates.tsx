import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  TextField,
  Typography,
  Grid,
  Chip,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Switch,
  FormControlLabel,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Divider,
  Alert
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  ContentCopy as CopyIcon,
  DragIndicator as DragIcon,
  ArrowUpward as UpIcon,
  ArrowDownward as DownIcon
} from '@mui/icons-material';
import {
  ChecklistTemplate,
  ChecklistTemplateItem,
  ChecklistArea,
  ChecklistItemType,
  DEFAULT_KENNEL_CHECKIN_ITEMS,
  DEFAULT_KENNEL_CHECKOUT_ITEMS,
  DEFAULT_GROOMING_ITEMS,
  DEFAULT_DAILY_FACILITY_ITEMS
} from '../../types/checklist';

const AREA_OPTIONS: { value: ChecklistArea; label: string }[] = [
  { value: 'KENNEL_CHECKIN', label: 'Kennel Check-In' },
  { value: 'KENNEL_CHECKOUT', label: 'Kennel Check-Out' },
  { value: 'GROOMING', label: 'Grooming' },
  { value: 'TRAINING', label: 'Training' },
  { value: 'DAILY_FACILITY', label: 'Daily Facility' },
  { value: 'CUSTOM', label: 'Custom' }
];

const ITEM_TYPE_OPTIONS: { value: ChecklistItemType; label: string }[] = [
  { value: 'CHECKBOX', label: 'Checkbox (Yes/No)' },
  { value: 'TEXT', label: 'Text Input' },
  { value: 'NUMBER', label: 'Number Input' },
  { value: 'PHOTO', label: 'Photo Upload' },
  { value: 'SIGNATURE', label: 'Digital Signature' },
  { value: 'RATING', label: 'Rating (1-5 stars)' },
  { value: 'MULTI_SELECT', label: 'Multiple Choice' }
];

export default function ChecklistTemplates() {
  const [templates, setTemplates] = useState<ChecklistTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [currentTemplate, setCurrentTemplate] = useState<Partial<ChecklistTemplate> | null>(null);
  const [itemDialogOpen, setItemDialogOpen] = useState(false);
  const [currentItem, setCurrentItem] = useState<Partial<ChecklistTemplateItem> | null>(null);
  const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      const apiUrl = process.env.REACT_APP_API_URL || '';
      const response = await fetch(`${apiUrl}/api/checklists/templates`, {
        headers: { 'x-tenant-id': (localStorage.getItem('tailtown_tenant_id') || localStorage.getItem('tenantId') || 'dev') }
      });
      const data = await response.json();
      setTemplates(data.data || []);
    } catch (error) {
      console.error('Failed to load templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTemplate = () => {
    setCurrentTemplate({
      name: '',
      description: '',
      area: 'CUSTOM',
      isActive: true,
      items: [],
      estimatedMinutes: 15
    });
    setEditDialogOpen(true);
  };

  const handleEditTemplate = (template: ChecklistTemplate) => {
    setCurrentTemplate({ ...template });
    setEditDialogOpen(true);
  };

  const handleDeleteTemplate = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this template?')) return;
    
    try {
      const apiUrl = process.env.REACT_APP_API_URL || '';
      await fetch(`${apiUrl}/api/checklists/templates/${id}`, {
        method: 'DELETE',
        headers: { 'x-tenant-id': (localStorage.getItem('tailtown_tenant_id') || localStorage.getItem('tenantId') || 'dev') }
      });
      loadTemplates();
    } catch (error) {
      console.error('Failed to delete template:', error);
    }
  };

  const handleDuplicateTemplate = (template: ChecklistTemplate) => {
    setCurrentTemplate({
      ...template,
      id: undefined,
      name: `${template.name} (Copy)`,
      items: [...template.items]
    });
    setEditDialogOpen(true);
  };

  const handleSaveTemplate = async () => {
    if (!currentTemplate) return;

    try {
      const apiUrl = process.env.REACT_APP_API_URL || '';
      const url = currentTemplate.id 
        ? `${apiUrl}/api/checklists/templates/${currentTemplate.id}`
        : `${apiUrl}/api/checklists/templates`;
      
      const method = currentTemplate.id ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': (localStorage.getItem('tailtown_tenant_id') || localStorage.getItem('tenantId') || 'dev')
        },
        body: JSON.stringify(currentTemplate)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Server error:', errorData);
        alert(`Failed to save template: ${errorData.message || 'Unknown error'}`);
        return;
      }
      
      setEditDialogOpen(false);
      setCurrentTemplate(null);
      loadTemplates();
    } catch (error) {
      console.error('Failed to save template:', error);
      alert('Failed to save template. Check console for details.');
    }
  };

  const handleAddItem = () => {
    setCurrentItem({
      order: (currentTemplate?.items?.length || 0) + 1,
      label: '',
      type: 'CHECKBOX',
      isRequired: false
    });
    setEditingItemIndex(null);
    setItemDialogOpen(true);
  };

  const handleEditItem = (item: ChecklistTemplateItem, index: number) => {
    setCurrentItem({ ...item });
    setEditingItemIndex(index);
    setItemDialogOpen(true);
  };

  const handleSaveItem = () => {
    if (!currentItem || !currentTemplate) return;

    const items = [...(currentTemplate.items || [])];
    
    if (editingItemIndex !== null) {
      items[editingItemIndex] = currentItem as ChecklistTemplateItem;
    } else {
      items.push(currentItem as ChecklistTemplateItem);
    }

    setCurrentTemplate({ ...currentTemplate, items });
    setItemDialogOpen(false);
    setCurrentItem(null);
    setEditingItemIndex(null);
  };

  const handleDeleteItem = (index: number) => {
    if (!currentTemplate) return;
    const items = [...(currentTemplate.items || [])];
    items.splice(index, 1);
    setCurrentTemplate({ ...currentTemplate, items });
  };

  const handleMoveItem = (index: number, direction: 'up' | 'down') => {
    if (!currentTemplate) return;
    const items = [...(currentTemplate.items || [])];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    
    if (newIndex < 0 || newIndex >= items.length) return;
    
    [items[index], items[newIndex]] = [items[newIndex], items[index]];
    items.forEach((item, i) => item.order = i + 1);
    
    setCurrentTemplate({ ...currentTemplate, items });
  };

  const handleLoadDefaultTemplate = (area: ChecklistArea) => {
    let defaultItems: Omit<ChecklistTemplateItem, 'id'>[] = [];
    
    switch (area) {
      case 'KENNEL_CHECKIN':
        defaultItems = DEFAULT_KENNEL_CHECKIN_ITEMS;
        break;
      case 'KENNEL_CHECKOUT':
        defaultItems = DEFAULT_KENNEL_CHECKOUT_ITEMS;
        break;
      case 'GROOMING':
        defaultItems = DEFAULT_GROOMING_ITEMS;
        break;
      case 'DAILY_FACILITY':
        defaultItems = DEFAULT_DAILY_FACILITY_ITEMS;
        break;
    }

    if (defaultItems.length > 0 && currentTemplate) {
      const itemsWithIds = defaultItems.map((item, index) => ({
        ...item,
        id: `item-${index + 1}`
      }));
      setCurrentTemplate({ ...currentTemplate, items: itemsWithIds });
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Checklist Templates</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleCreateTemplate}
        >
          Create Template
        </Button>
      </Box>

      {loading ? (
        <Typography>Loading...</Typography>
      ) : (
        <Grid container spacing={3}>
          {templates.map((template) => (
            <Grid item xs={12} md={6} lg={4} key={template.id}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 2 }}>
                    <Box>
                      <Typography variant="h6">{template.name}</Typography>
                      <Chip 
                        label={AREA_OPTIONS.find(a => a.value === template.area)?.label} 
                        size="small" 
                        sx={{ mt: 1 }}
                      />
                    </Box>
                    <Box>
                      <IconButton size="small" onClick={() => handleEditTemplate(template)}>
                        <EditIcon />
                      </IconButton>
                      <IconButton size="small" onClick={() => handleDuplicateTemplate(template)}>
                        <CopyIcon />
                      </IconButton>
                      <IconButton size="small" onClick={() => handleDeleteTemplate(template.id)}>
                        <DeleteIcon />
                      </IconButton>
                    </Box>
                  </Box>
                  
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {template.description}
                  </Typography>
                  
                  <Box sx={{ display: 'flex', gap: 2 }}>
                    <Typography variant="body2">
                      {template.items.length} items
                    </Typography>
                    <Typography variant="body2">
                      ~{template.estimatedMinutes} min
                    </Typography>
                    <Chip 
                      label={template.isActive ? 'Active' : 'Inactive'} 
                      size="small"
                      color={template.isActive ? 'success' : 'default'}
                    />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Edit Template Dialog */}
      <Dialog 
        open={editDialogOpen} 
        onClose={() => setEditDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {currentTemplate?.id ? 'Edit Template' : 'Create Template'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <TextField
              fullWidth
              label="Template Name"
              value={currentTemplate?.name || ''}
              onChange={(e) => setCurrentTemplate({ ...currentTemplate, name: e.target.value })}
              sx={{ mb: 2 }}
            />
            
            <TextField
              fullWidth
              label="Description"
              value={currentTemplate?.description || ''}
              onChange={(e) => setCurrentTemplate({ ...currentTemplate, description: e.target.value })}
              multiline
              rows={2}
              sx={{ mb: 2 }}
            />
            
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Area</InputLabel>
              <Select
                value={currentTemplate?.area || 'CUSTOM'}
                onChange={(e) => {
                  const newArea = e.target.value as ChecklistArea;
                  setCurrentTemplate({ ...currentTemplate, area: newArea });
                  if (window.confirm('Load default items for this area?')) {
                    handleLoadDefaultTemplate(newArea);
                  }
                }}
              >
                {AREA_OPTIONS.map(option => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            
            <TextField
              fullWidth
              type="number"
              label="Estimated Minutes"
              value={currentTemplate?.estimatedMinutes || 15}
              onChange={(e) => setCurrentTemplate({ ...currentTemplate, estimatedMinutes: parseInt(e.target.value) })}
              sx={{ mb: 2 }}
            />
            
            <FormControlLabel
              control={
                <Switch
                  checked={currentTemplate?.isActive !== false}
                  onChange={(e) => setCurrentTemplate({ ...currentTemplate, isActive: e.target.checked })}
                />
              }
              label="Active"
              sx={{ mb: 2 }}
            />

            <Divider sx={{ my: 2 }} />
            
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">Checklist Items</Typography>
              <Button startIcon={<AddIcon />} onClick={handleAddItem}>
                Add Item
              </Button>
            </Box>

            {currentTemplate?.items && currentTemplate.items.length > 0 ? (
              <List>
                {currentTemplate.items.map((item, index) => (
                  <ListItem key={index} divider>
                    <DragIcon sx={{ mr: 1, color: 'text.secondary' }} />
                    <ListItemText
                      primary={item.label}
                      secondary={`${ITEM_TYPE_OPTIONS.find(t => t.value === item.type)?.label}${item.isRequired ? ' (Required)' : ''}`}
                    />
                    <ListItemSecondaryAction>
                      <IconButton size="small" onClick={() => handleMoveItem(index, 'up')} disabled={index === 0}>
                        <UpIcon />
                      </IconButton>
                      <IconButton size="small" onClick={() => handleMoveItem(index, 'down')} disabled={index === currentTemplate.items!.length - 1}>
                        <DownIcon />
                      </IconButton>
                      <IconButton size="small" onClick={() => handleEditItem(item, index)}>
                        <EditIcon />
                      </IconButton>
                      <IconButton size="small" onClick={() => handleDeleteItem(index)}>
                        <DeleteIcon />
                      </IconButton>
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>
            ) : (
              <Alert severity="info">No items added yet. Click "Add Item" to get started.</Alert>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSaveTemplate} variant="contained">
            Save Template
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Item Dialog */}
      <Dialog open={itemDialogOpen} onClose={() => setItemDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editingItemIndex !== null ? 'Edit Item' : 'Add Item'}</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <TextField
              fullWidth
              label="Item Label"
              value={currentItem?.label || ''}
              onChange={(e) => setCurrentItem({ ...currentItem, label: e.target.value })}
              sx={{ mb: 2 }}
            />
            
            <TextField
              fullWidth
              label="Description (optional)"
              value={currentItem?.description || ''}
              onChange={(e) => setCurrentItem({ ...currentItem, description: e.target.value })}
              multiline
              rows={2}
              sx={{ mb: 2 }}
            />
            
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Item Type</InputLabel>
              <Select
                value={currentItem?.type || 'CHECKBOX'}
                onChange={(e) => setCurrentItem({ ...currentItem, type: e.target.value as ChecklistItemType })}
              >
                {ITEM_TYPE_OPTIONS.map(option => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            
            <FormControlLabel
              control={
                <Switch
                  checked={currentItem?.isRequired || false}
                  onChange={(e) => setCurrentItem({ ...currentItem, isRequired: e.target.checked })}
                />
              }
              label="Required"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setItemDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSaveItem} variant="contained">
            Save Item
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
