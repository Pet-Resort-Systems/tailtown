import React, { useState } from 'react';
import {
  Box,
  TextField,
  Button,
  Paper,
  Typography,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Divider,
  Alert,
  Tabs,
  Tab
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`config-tabpanel-${index}`}
      aria-labelledby={`config-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 2 }}>{children}</Box>}
    </div>
  );
}

const ConfigurationEditor: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  
  // Medication administration methods
  const [medicationMethods, setMedicationMethods] = useState([
    { value: 'ORAL', label: 'Oral' },
    { value: 'TOPICAL', label: 'Topical' },
    { value: 'INJECTION', label: 'Injection' },
    { value: 'EYE_DROPS', label: 'Eye Drops' },
    { value: 'EAR_DROPS', label: 'Ear Drops' },
    { value: 'OTHER', label: 'Other' }
  ]);

  // Common belongings items
  const [commonItems, setCommonItems] = useState([
    { type: 'Collar', icon: '🔗' },
    { type: 'Leash', icon: '🦮' },
    { type: 'Toy', icon: '🎾' },
    { type: 'Bedding', icon: '🛏️' },
    { type: 'Food', icon: '🍖' },
    { type: 'Bowl', icon: '🥣' },
    { type: 'Medication', icon: '💊' },
    { type: 'Treats', icon: '🦴' }
  ]);

  const [editingMethod, setEditingMethod] = useState<any>(null);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [newMethodValue, setNewMethodValue] = useState('');
  const [newMethodLabel, setNewMethodLabel] = useState('');
  const [newItemType, setNewItemType] = useState('');
  const [newItemIcon, setNewItemIcon] = useState('');

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  // Medication Methods
  const handleAddMethod = () => {
    if (newMethodValue && newMethodLabel) {
      setMedicationMethods([
        ...medicationMethods,
        { value: newMethodValue.toUpperCase().replace(/\s+/g, '_'), label: newMethodLabel }
      ]);
      setNewMethodValue('');
      setNewMethodLabel('');
    }
  };

  const handleDeleteMethod = (index: number) => {
    setMedicationMethods(medicationMethods.filter((_, i) => i !== index));
  };

  const handleEditMethod = (method: any, index: number) => {
    setEditingMethod({ ...method, index });
    setNewMethodValue(method.value);
    setNewMethodLabel(method.label);
  };

  const handleUpdateMethod = () => {
    if (editingMethod && newMethodValue && newMethodLabel) {
      const updated = [...medicationMethods];
      updated[editingMethod.index] = {
        value: newMethodValue.toUpperCase().replace(/\s+/g, '_'),
        label: newMethodLabel
      };
      setMedicationMethods(updated);
      setEditingMethod(null);
      setNewMethodValue('');
      setNewMethodLabel('');
    }
  };

  // Common Items
  const handleAddItem = () => {
    if (newItemType) {
      setCommonItems([
        ...commonItems,
        { type: newItemType, icon: newItemIcon || '📦' }
      ]);
      setNewItemType('');
      setNewItemIcon('');
    }
  };

  const handleDeleteItem = (index: number) => {
    setCommonItems(commonItems.filter((_, i) => i !== index));
  };

  const handleEditItem = (item: any, index: number) => {
    setEditingItem({ ...item, index });
    setNewItemType(item.type);
    setNewItemIcon(item.icon);
  };

  const handleUpdateItem = () => {
    if (editingItem && newItemType) {
      const updated = [...commonItems];
      updated[editingItem.index] = {
        type: newItemType,
        icon: newItemIcon || '📦'
      };
      setCommonItems(updated);
      setEditingItem(null);
      setNewItemType('');
      setNewItemIcon('');
    }
  };

  const handleSaveConfiguration = () => {
    // TODO: Implement save to backend
    alert('Configuration saved! (Backend integration pending)');
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6">Pre-populated Options Configuration</Typography>
        <Button variant="contained" onClick={handleSaveConfiguration}>
          Save Configuration
        </Button>
      </Box>

      <Alert severity="info" sx={{ mb: 3 }}>
        Configure the pre-populated options that appear in dropdowns and quick-add buttons throughout the check-in process.
      </Alert>

      <Paper>
        <Tabs value={tabValue} onChange={handleTabChange}>
          <Tab label="Medication Methods" />
          <Tab label="Common Belongings" />
        </Tabs>

        <TabPanel value={tabValue} index={0}>
          <Box sx={{ p: 2 }}>
            <Typography variant="subtitle1" gutterBottom>
              Medication Administration Methods
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              These options appear in the medication administration method dropdown during check-in.
            </Typography>

            <Paper sx={{ p: 2, mb: 3, bgcolor: 'grey.50' }}>
              <Typography variant="subtitle2" gutterBottom>
                {editingMethod ? 'Edit Method' : 'Add New Method'}
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                <TextField
                  size="small"
                  label="Value (CODE)"
                  value={newMethodValue}
                  onChange={(e) => setNewMethodValue(e.target.value)}
                  placeholder="e.g., SUBCUTANEOUS"
                  helperText="Internal code (uppercase, underscores)"
                />
                <TextField
                  size="small"
                  label="Display Label"
                  value={newMethodLabel}
                  onChange={(e) => setNewMethodLabel(e.target.value)}
                  placeholder="e.g., Subcutaneous Injection"
                  helperText="User-friendly label"
                  sx={{ flexGrow: 1 }}
                />
                {editingMethod ? (
                  <>
                    <Button variant="contained" onClick={handleUpdateMethod}>
                      Update
                    </Button>
                    <Button
                      variant="outlined"
                      onClick={() => {
                        setEditingMethod(null);
                        setNewMethodValue('');
                        setNewMethodLabel('');
                      }}
                    >
                      Cancel
                    </Button>
                  </>
                ) : (
                  <Button variant="contained" startIcon={<AddIcon />} onClick={handleAddMethod}>
                    Add
                  </Button>
                )}
              </Box>
            </Paper>

            <List>
              {medicationMethods.map((method, index) => (
                <React.Fragment key={index}>
                  <ListItem>
                    <ListItemText
                      primary={method.label}
                      secondary={`Code: ${method.value}`}
                    />
                    <ListItemSecondaryAction>
                      <IconButton edge="end" onClick={() => handleEditMethod(method, index)} sx={{ mr: 1 }}>
                        <EditIcon />
                      </IconButton>
                      <IconButton edge="end" onClick={() => handleDeleteMethod(index)}>
                        <DeleteIcon />
                      </IconButton>
                    </ListItemSecondaryAction>
                  </ListItem>
                  {index < medicationMethods.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>
          </Box>
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          <Box sx={{ p: 2 }}>
            <Typography variant="subtitle1" gutterBottom>
              Common Belongings Items
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              These items appear as quick-add buttons in the belongings inventory during check-in.
            </Typography>

            <Paper sx={{ p: 2, mb: 3, bgcolor: 'grey.50' }}>
              <Typography variant="subtitle2" gutterBottom>
                {editingItem ? 'Edit Item' : 'Add New Item'}
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                <TextField
                  size="small"
                  label="Item Type"
                  value={newItemType}
                  onChange={(e) => setNewItemType(e.target.value)}
                  placeholder="e.g., Harness"
                  helperText="Item name"
                  sx={{ flexGrow: 1 }}
                />
                <TextField
                  size="small"
                  label="Icon (Emoji)"
                  value={newItemIcon}
                  onChange={(e) => setNewItemIcon(e.target.value)}
                  placeholder="e.g., 🎒"
                  helperText="Single emoji"
                  sx={{ width: 120 }}
                />
                {editingItem ? (
                  <>
                    <Button variant="contained" onClick={handleUpdateItem}>
                      Update
                    </Button>
                    <Button
                      variant="outlined"
                      onClick={() => {
                        setEditingItem(null);
                        setNewItemType('');
                        setNewItemIcon('');
                      }}
                    >
                      Cancel
                    </Button>
                  </>
                ) : (
                  <Button variant="contained" startIcon={<AddIcon />} onClick={handleAddItem}>
                    Add
                  </Button>
                )}
              </Box>
            </Paper>

            <List>
              {commonItems.map((item, index) => (
                <React.Fragment key={index}>
                  <ListItem>
                    <ListItemText
                      primary={`${item.icon} ${item.type}`}
                      secondary={`Icon: ${item.icon}`}
                    />
                    <ListItemSecondaryAction>
                      <IconButton edge="end" onClick={() => handleEditItem(item, index)} sx={{ mr: 1 }}>
                        <EditIcon />
                      </IconButton>
                      <IconButton edge="end" onClick={() => handleDeleteItem(index)}>
                        <DeleteIcon />
                      </IconButton>
                    </ListItemSecondaryAction>
                  </ListItem>
                  {index < commonItems.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>
          </Box>
        </TabPanel>
      </Paper>
    </Box>
  );
};

export default ConfigurationEditor;
