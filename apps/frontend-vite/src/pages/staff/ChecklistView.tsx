import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  TextField,
  Typography,
  Rating,
  FormControlLabel,
  FormGroup,
  LinearProgress,
  Alert,
  Chip
} from '@mui/material';
import {
  CheckCircle as CheckIcon,
  Camera as CameraIcon,
  Edit as SignatureIcon
} from '@mui/icons-material';
import { ChecklistInstance, ChecklistInstanceItem } from '../../types/checklist';

export default function ChecklistView() {
  const { id: checklistId } = useParams<{ id: string }>();
  const [checklist, setChecklist] = useState<ChecklistInstance | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadChecklist = React.useCallback(async () => {
    try {
      const response = await fetch(`/api/checklists/instances/${checklistId}`, {
        headers: { 'x-tenant-id': (localStorage.getItem('tailtown_tenant_id') || localStorage.getItem('tenantId') || 'dev') }
      });
      const data = await response.json();
      setChecklist(data.data);
    } catch (error) {
      console.error('Failed to load checklist:', error);
    } finally {
      setLoading(false);
    }
  }, [checklistId]);

  useEffect(() => {
    loadChecklist();
  }, [loadChecklist]);

  const handleUpdateItem = async (item: ChecklistInstanceItem, values: Partial<ChecklistInstanceItem>) => {
    if (!checklist) return;
    
    setSaving(true);
    try {
      await fetch(`/api/checklists/instances/${checklistId}/item`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': (localStorage.getItem('tailtown_tenant_id') || localStorage.getItem('tenantId') || 'dev')
        },
        body: JSON.stringify({
          templateItemId: item.templateItemId,
          ...values
        })
      });
      
      // Update local state
      const updatedItems = checklist.items.map(i => 
        i.templateItemId === item.templateItemId 
          ? { ...i, ...values, isCompleted: true }
          : i
      );
      setChecklist({ ...checklist, items: updatedItems });
    } catch (error) {
      console.error('Failed to update item:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleComplete = async () => {
    if (!checklist) return;
    
    const requiredItems = checklist.items.filter(i => i.isRequired);
    const completedRequired = requiredItems.filter(i => i.isCompleted);
    
    if (completedRequired.length < requiredItems.length) {
      alert('Please complete all required items before finishing.');
      return;
    }
    
    try {
      await fetch(`/api/checklists/instances/${checklistId}/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': (localStorage.getItem('tailtown_tenant_id') || localStorage.getItem('tenantId') || 'dev')
        },
        body: JSON.stringify({
          notes: ''
        })
      });
      
      alert('Checklist completed!');
      loadChecklist();
    } catch (error) {
      console.error('Failed to complete checklist:', error);
    }
  };

  if (loading) {
    return <LinearProgress />;
  }

  if (!checklist) {
    return <Alert severity="error">Checklist not found</Alert>;
  }

  const completedCount = checklist.items.filter(i => i.isCompleted).length;
  const totalCount = checklist.items.length;
  const progress = (completedCount / totalCount) * 100;

  return (
    <Box sx={{ p: 2, maxWidth: 600, mx: 'auto' }}>
      {/* Header */}
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="h5" gutterBottom>
            {checklist.template?.name}
          </Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            {checklist.template?.description}
          </Typography>
          
          <Box sx={{ mt: 2, mb: 1 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="body2">
                Progress: {completedCount} / {totalCount}
              </Typography>
              <Typography variant="body2">
                {Math.round(progress)}%
              </Typography>
            </Box>
            <LinearProgress variant="determinate" value={progress} />
          </Box>
          
          {checklist.status === 'COMPLETED' && (
            <Chip 
              icon={<CheckIcon />} 
              label="Completed" 
              color="success" 
              sx={{ mt: 1 }}
            />
          )}
        </CardContent>
      </Card>

      {/* Checklist Items */}
      {checklist.items.map((item, index) => (
        <Card key={index} sx={{ mb: 2 }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'start', mb: 1 }}>
              <Typography variant="h6" sx={{ flex: 1 }}>
                {item.label}
                {item.isRequired && (
                  <Chip label="Required" size="small" color="error" sx={{ ml: 1 }} />
                )}
              </Typography>
              {item.isCompleted && (
                <CheckIcon color="success" />
              )}
            </Box>

            {item.description && (
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {item.description}
              </Typography>
            )}

            {/* Checkbox Type */}
            {item.type === 'CHECKBOX' && (
              <FormControlLabel
                control={
                  <Checkbox
                    checked={item.checkboxValue || false}
                    onChange={(e) => handleUpdateItem(item, { checkboxValue: e.target.checked })}
                    disabled={checklist.status === 'COMPLETED'}
                  />
                }
                label="Complete"
              />
            )}

            {/* Text Type */}
            {item.type === 'TEXT' && (
              <TextField
                fullWidth
                multiline
                rows={2}
                value={item.textValue || ''}
                onChange={(e) => handleUpdateItem(item, { textValue: e.target.value })}
                placeholder="Enter text..."
                disabled={checklist.status === 'COMPLETED'}
              />
            )}

            {/* Number Type */}
            {item.type === 'NUMBER' && (
              <TextField
                fullWidth
                type="number"
                value={item.numberValue || ''}
                onChange={(e) => handleUpdateItem(item, { numberValue: parseFloat(e.target.value) })}
                placeholder="Enter number..."
                disabled={checklist.status === 'COMPLETED'}
              />
            )}

            {/* Rating Type */}
            {item.type === 'RATING' && (
              <Box>
                <Rating
                  value={item.ratingValue || 0}
                  onChange={(e, value) => handleUpdateItem(item, { ratingValue: value || 0 })}
                  disabled={checklist.status === 'COMPLETED'}
                />
              </Box>
            )}

            {/* Photo Type */}
            {item.type === 'PHOTO' && (
              <Box>
                <Button
                  variant="outlined"
                  startIcon={<CameraIcon />}
                  disabled={checklist.status === 'COMPLETED'}
                >
                  Take Photo
                </Button>
                {item.photoUrls && item.photoUrls.length > 0 && (
                  <Typography variant="body2" sx={{ mt: 1 }}>
                    {item.photoUrls.length} photo(s) attached
                  </Typography>
                )}
              </Box>
            )}

            {/* Signature Type */}
            {item.type === 'SIGNATURE' && (
              <Box>
                <Button
                  variant="outlined"
                  startIcon={<SignatureIcon />}
                  disabled={checklist.status === 'COMPLETED'}
                >
                  Add Signature
                </Button>
                {item.signatureUrl && (
                  <Typography variant="body2" sx={{ mt: 1 }} color="success.main">
                    ✓ Signed
                  </Typography>
                )}
              </Box>
            )}

            {/* Multi-Select Type */}
            {item.type === 'MULTI_SELECT' && (
              <FormGroup>
                {/* Placeholder for multi-select options */}
                <Typography variant="body2" color="text.secondary">
                  Multi-select options would go here
                </Typography>
              </FormGroup>
            )}

            {/* Notes */}
            {item.notes && (
              <Alert severity="info" sx={{ mt: 2 }}>
                {item.notes}
              </Alert>
            )}
          </CardContent>
        </Card>
      ))}

      {/* Complete Button */}
      {checklist.status !== 'COMPLETED' && (
        <Button
          fullWidth
          variant="contained"
          size="large"
          onClick={handleComplete}
          disabled={saving}
          sx={{ mt: 2 }}
        >
          Complete Checklist
        </Button>
      )}
    </Box>
  );
}
