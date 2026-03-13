/**
 * Report Cards Page - Desktop/Main App
 * 
 * Staff dashboard for managing pet report cards with tabs for:
 * - Quick Create (single report card)
 * - Bulk Operations (multiple reports at once)
 * - View All (list of existing reports)
 */

import React, { useState } from 'react';
import {
  Container,
  Paper,
  Typography,
  Box,
  Tabs,
  Tab
} from '@mui/material';
import {
  PhotoCamera as PhotoIcon,
  ViewList as ListIcon,
  DynamicFeed as BulkIcon
} from '@mui/icons-material';
import QuickReportCard from '../../components/reportCards/QuickReportCard';
import BulkReportCardDashboard from '../../components/reportCards/BulkReportCardDashboard';

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
      id={`report-card-tabpanel-${index}`}
      aria-labelledby={`report-card-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const ReportCards: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  return (
    <Container maxWidth="xl">
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Pet Report Cards
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Create and manage photo-rich report cards for pet parents
        </Typography>
      </Box>

      <Paper>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          aria-label="report card tabs"
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab
            icon={<PhotoIcon />}
            label="Quick Create"
            iconPosition="start"
            id="report-card-tab-0"
            aria-controls="report-card-tabpanel-0"
          />
          <Tab
            icon={<BulkIcon />}
            label="Bulk Operations"
            iconPosition="start"
            id="report-card-tab-1"
            aria-controls="report-card-tabpanel-1"
          />
          <Tab
            icon={<ListIcon />}
            label="View All"
            iconPosition="start"
            id="report-card-tab-2"
            aria-controls="report-card-tabpanel-2"
          />
        </Tabs>

        <TabPanel value={tabValue} index={0}>
          <QuickReportCard />
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          <BulkReportCardDashboard />
        </TabPanel>

        <TabPanel value={tabValue} index={2}>
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <ListIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              View All Reports
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Coming soon - View and search all report cards
            </Typography>
          </Box>
        </TabPanel>
      </Paper>
    </Container>
  );
};

export default ReportCards;
