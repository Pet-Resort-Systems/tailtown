import React, { useState } from 'react';
import { Box, Tabs, Tab } from '@mui/material';
import StaffAvailabilityForm from './StaffAvailabilityForm';
import StaffTimeOffForm from './StaffTimeOffForm';

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
      id={`staff-scheduling-tabpanel-${index}`}
      aria-labelledby={`staff-scheduling-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ pt: 2 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `staff-scheduling-tab-${index}`,
    'aria-controls': `staff-scheduling-tabpanel-${index}`,
  };
}

interface StaffSchedulingTabsProps {
  staffId: string;
  onSave?: () => void;
}

const StaffSchedulingTabs: React.FC<StaffSchedulingTabsProps> = ({ staffId, onSave }) => {
  const [tabValue, setTabValue] = useState(0);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  return (
    <Box sx={{ width: '100%' }}>
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs 
          value={tabValue} 
          onChange={handleTabChange} 
          aria-label="staff scheduling tabs"
          variant="fullWidth"
        >
          <Tab label="Regular Availability" {...a11yProps(0)} />
          <Tab label="Time Off Requests" {...a11yProps(1)} />
        </Tabs>
      </Box>
      <TabPanel value={tabValue} index={0}>
        <StaffAvailabilityForm staffId={staffId} onSave={onSave} />
      </TabPanel>
      <TabPanel value={tabValue} index={1}>
        <StaffTimeOffForm staffId={staffId} onSave={onSave} />
      </TabPanel>
    </Box>
  );
};

export default StaffSchedulingTabs;
