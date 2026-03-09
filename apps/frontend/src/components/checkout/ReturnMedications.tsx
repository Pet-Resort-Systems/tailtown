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
  Grid,
} from '@mui/material';
import { Medication as MedicationIcon } from '@mui/icons-material';

interface ReturnMedicationsProps {
  medications: any[];
  onContinue: (medicationsData: any[]) => void;
  onBack: () => void;
}

const ReturnMedications: React.FC<ReturnMedicationsProps> = ({
  medications,
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

  const allItemsReturned = medications.length === 0 || 
    medications.every(item => checkedItems[item.id]);

  const handleContinue = () => {
    const updatedMedications = medications.map(item => ({
      ...item,
      returned: checkedItems[item.id] || false,
    }));
    onContinue(updatedMedications);
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Return Medications
      </Typography>
      <Typography variant="body2" color="text.secondary" gutterBottom>
        Check off each medication as you return it to the customer
      </Typography>

      {medications.length === 0 ? (
        <Alert severity="info" sx={{ mt: 3 }}>
          No medications were recorded during check-in. You can proceed to the next step.
        </Alert>
      ) : (
        <Paper elevation={0} sx={{ mt: 3, bgcolor: 'grey.50' }}>
          <List>
            {medications.map((item, index) => (
              <ListItem
                key={item.id || index}
                dense
                button
                onClick={() => handleToggle(item.id || index.toString())}
                sx={{
                  borderBottom: index < medications.length - 1 ? '1px solid' : 'none',
                  borderColor: 'divider',
                  '&:hover': {
                    bgcolor: 'action.hover',
                  },
                  py: 2,
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
                  <MedicationIcon color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                      <Typography variant="body1" fontWeight="medium">
                        {item.name || item.medicationName || 'Unknown Medication'}
                      </Typography>
                      {item.dosage && (
                        <Chip label={item.dosage} size="small" color="primary" variant="outlined" />
                      )}
                    </Box>
                  }
                  secondary={
                    <Grid container spacing={1} sx={{ mt: 0.5 }}>
                      {item.frequency && (
                        <Grid item>
                          <Typography variant="caption" color="text.secondary">
                            Frequency: {item.frequency}
                          </Typography>
                        </Grid>
                      )}
                      {item.administrationMethod && (
                        <Grid item>
                          <Typography variant="caption" color="text.secondary">
                            Method: {item.administrationMethod}
                          </Typography>
                        </Grid>
                      )}
                      {item.instructions && (
                        <Grid item xs={12}>
                          <Typography variant="caption" color="text.secondary">
                            Instructions: {item.instructions}
                          </Typography>
                        </Grid>
                      )}
                    </Grid>
                  }
                />
              </ListItem>
            ))}
          </List>
        </Paper>
      )}

      {medications.length > 0 && !allItemsReturned && (
        <Alert severity="warning" sx={{ mt: 2 }}>
          Please check off all medications before proceeding
        </Alert>
      )}

      {medications.length > 0 && allItemsReturned && (
        <Alert severity="success" sx={{ mt: 2 }}>
          All medications have been marked as returned
        </Alert>
      )}

      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
        <Button onClick={onBack}>
          Back
        </Button>
        <Button
          variant="contained"
          onClick={handleContinue}
          disabled={medications.length > 0 && !allItemsReturned}
        >
          Continue to Payment
        </Button>
      </Box>
    </Box>
  );
};

export default ReturnMedications;
