import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Checkbox,
  Button,
  Alert,
  Chip,
} from '@mui/material';
import { Inventory as InventoryIcon } from '@mui/icons-material';

interface ReturnBelongingsProps {
  belongings: any[];
  onContinue: (belongingsData: any[]) => void;
  onBack: () => void;
}

const ReturnBelongings: React.FC<ReturnBelongingsProps> = ({
  belongings,
  onContinue,
  onBack,
}) => {
  const [checkedItems, setCheckedItems] = useState<{ [key: string]: boolean }>({});

  const handleToggle = (itemId: string) => {
    setCheckedItems({
      ...checkedItems,
      [itemId]: !checkedItems[itemId],
    });
  };

  const allItemsReturned = belongings.length === 0 || 
    belongings.every(item => checkedItems[item.id]);

  const handleContinue = () => {
    const updatedBelongings = belongings.map(item => ({
      ...item,
      returned: checkedItems[item.id] || false,
    }));
    onContinue(updatedBelongings);
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Return Belongings
      </Typography>
      <Typography variant="body2" color="text.secondary" gutterBottom>
        Check off each item as you return it to the customer
      </Typography>

      {belongings.length === 0 ? (
        <Alert severity="info" sx={{ mt: 3 }}>
          No belongings were recorded during check-in. You can proceed to the next step.
        </Alert>
      ) : (
        <Paper elevation={0} sx={{ mt: 3, bgcolor: 'grey.50' }}>
          <List>
            {belongings.map((item, index) => (
              <ListItem
                key={item.id || index}
                dense
                button
                onClick={() => handleToggle(item.id || index.toString())}
                sx={{
                  borderBottom: index < belongings.length - 1 ? '1px solid' : 'none',
                  borderColor: 'divider',
                  '&:hover': {
                    bgcolor: 'action.hover',
                  },
                }}
              >
                <ListItemIcon>
                  <Checkbox
                    edge="start"
                    checked={checkedItems[item.id || index.toString()] || false}
                    tabIndex={-1}
                    disableRipple
                  />
                </ListItemIcon>
                <ListItemIcon>
                  <InventoryIcon />
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="body1">
                        {item.item || item.name || 'Unknown Item'}
                      </Typography>
                      {item.quantity > 1 && (
                        <Chip label={`×${item.quantity}`} size="small" />
                      )}
                    </Box>
                  }
                  secondary={item.notes || item.description}
                />
              </ListItem>
            ))}
          </List>
        </Paper>
      )}

      {belongings.length > 0 && !allItemsReturned && (
        <Alert severity="warning" sx={{ mt: 2 }}>
          Please check off all items before proceeding
        </Alert>
      )}

      {belongings.length > 0 && allItemsReturned && (
        <Alert severity="success" sx={{ mt: 2 }}>
          All items have been marked as returned
        </Alert>
      )}

      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
        <Button onClick={onBack}>
          Back
        </Button>
        <Button
          variant="contained"
          onClick={handleContinue}
          disabled={belongings.length > 0 && !allItemsReturned}
        >
          Continue to Medications
        </Button>
      </Box>
    </Box>
  );
};

export default ReturnBelongings;
