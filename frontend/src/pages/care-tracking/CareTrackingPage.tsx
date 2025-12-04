/**
 * Care Tracking Page
 * Mobile-friendly page for staff to access feeding and medication tracking
 */

import React, { useState } from "react";
import {
  Box,
  Container,
  Tabs,
  Tab,
  Paper,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import {
  Restaurant as FeedingIcon,
  Medication as MedicationIcon,
} from "@mui/icons-material";
import {
  FeedingTracker,
  MedicationTracker,
} from "../../components/care-tracking";

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
      id={`care-tabpanel-${index}`}
      aria-labelledby={`care-tab-${index}`}
      {...other}
    >
      {value === index && <Box>{children}</Box>}
    </div>
  );
}

const CareTrackingPage: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  return (
    <Container maxWidth="md" sx={{ py: isMobile ? 1 : 3 }}>
      <Paper sx={{ mb: 2 }}>
        <Tabs
          value={tabValue}
          onChange={(_, newValue) => setTabValue(newValue)}
          variant="fullWidth"
          indicatorColor="primary"
          textColor="primary"
        >
          <Tab
            icon={<FeedingIcon />}
            label="Feeding"
            iconPosition="start"
            sx={{ py: 2 }}
          />
          <Tab
            icon={<MedicationIcon />}
            label="Medications"
            iconPosition="start"
            sx={{ py: 2 }}
          />
        </Tabs>
      </Paper>

      <TabPanel value={tabValue} index={0}>
        <FeedingTracker />
      </TabPanel>

      <TabPanel value={tabValue} index={1}>
        <MedicationTracker />
      </TabPanel>
    </Container>
  );
};

export default CareTrackingPage;
