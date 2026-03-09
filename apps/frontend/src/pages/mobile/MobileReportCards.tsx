/**
 * Mobile Report Cards Page
 * 
 * Mobile-optimized interface for creating and managing pet report cards.
 * Focuses on quick photo capture and simple form entry.
 */

import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Tabs,
  Tab,
  Container,
} from '@mui/material';
import {
  PhotoCamera as PhotoIcon,
  ViewList as ListIcon,
} from '@mui/icons-material';
import { MobileHeader } from '../../components/mobile/MobileHeader';
import { BottomNav } from '../../components/mobile/BottomNav';
import QuickReportCard from '../../components/reportCards/QuickReportCard';

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
      id={`mobile-report-card-tabpanel-${index}`}
      aria-labelledby={`mobile-report-card-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ py: 2 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const MobileReportCards: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  return (
    <Box sx={{ 
      display: 'flex', 
      flexDirection: 'column', 
      minHeight: '100vh',
      bgcolor: 'background.default',
      pb: 8, // Space for bottom nav
    }}>
      <MobileHeader title="Report Cards" />
      
      <Container maxWidth="sm" sx={{ flex: 1, pt: 2, px: 2 }}>
        <Paper elevation={0} sx={{ borderRadius: 2 }}>
          <Tabs
            value={activeTab}
            onChange={handleTabChange}
            variant="fullWidth"
            sx={{
              borderBottom: 1,
              borderColor: 'divider',
              '& .MuiTab-root': {
                minHeight: 56,
                fontSize: '0.875rem',
              }
            }}
          >
            <Tab
              icon={<PhotoIcon />}
              label="Create"
              id="mobile-report-card-tab-0"
              aria-controls="mobile-report-card-tabpanel-0"
            />
            <Tab
              icon={<ListIcon />}
              label="View All"
              id="mobile-report-card-tab-1"
              aria-controls="mobile-report-card-tabpanel-1"
            />
          </Tabs>

          <TabPanel value={activeTab} index={0}>
            <QuickReportCard />
          </TabPanel>

          <TabPanel value={activeTab} index={1}>
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <ListIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                View All Report Cards
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Coming soon - View and manage all report cards
              </Typography>
            </Box>
          </TabPanel>
        </Paper>
      </Container>

      <BottomNav />
    </Box>
  );
};

export default MobileReportCards;
