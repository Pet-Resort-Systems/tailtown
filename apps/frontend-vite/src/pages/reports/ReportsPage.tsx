import React, { useState } from 'react';
import {
  Box,
  Typography,
  Container,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  Chip,
  Tabs,
  Tab,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Paper,
  Alert,
  IconButton,
} from '@mui/material';
import {
  Assessment as ReportsIcon,
  Pets as PetIcon,
  Campaign as MarketingIcon,
  Build as ServiceIcon,
  GetApp as ExportIcon,
  Restaurant as FeedingIcon,
  Medication as MedicationIcon,
} from '@mui/icons-material';
import SalesReports from './SalesReports';
import TaxReports from './TaxReports';
import FinancialReports from './FinancialReports';
import CustomerReports from './CustomerReports';
import OperationalReports from './OperationalReports';
import TipReports from './TipReports';

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
      id={`reports-tabpanel-${index}`}
      aria-labelledby={`reports-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const ReportsPage: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const [dateRange, setDateRange] = useState('month');
  const [exportFormat, setExportFormat] = useState('pdf');

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleExport = (reportType: string) => {
    // Placeholder for export functionality
    alert(`Exporting ${reportType} report as ${exportFormat.toUpperCase()}...`);
  };

  const ReportCard = ({
    title,
    description,
    icon,
    status = 'planned',
    onGenerate,
    onExport,
  }: {
    title: string;
    description: string;
    icon: React.ReactNode;
    status?: 'available' | 'planned' | 'coming-soon';
    onGenerate?: () => void;
    onExport?: () => void;
  }) => (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardContent sx={{ flexGrow: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          {icon}
          <Typography variant="h6" sx={{ ml: 1 }}>
            {title}
          </Typography>
          <Box sx={{ ml: 'auto' }}>
            <Chip
              label={
                status === 'available'
                  ? 'Available'
                  : status === 'planned'
                    ? 'Planned'
                    : 'Coming Soon'
              }
              color={
                status === 'available'
                  ? 'success'
                  : status === 'planned'
                    ? 'warning'
                    : 'default'
              }
              size="small"
            />
          </Box>
        </Box>
        <Typography variant="body2" color="text.secondary">
          {description}
        </Typography>
      </CardContent>
      <CardActions>
        <Button
          size="small"
          onClick={onGenerate}
          disabled={status !== 'available'}
        >
          Generate Report
        </Button>
        <IconButton
          size="small"
          onClick={onExport}
          disabled={status !== 'available'}
          title="Export Report"
        >
          <ExportIcon />
        </IconButton>
      </CardActions>
    </Card>
  );

  return (
    <Container maxWidth="xl">
      <Box sx={{ mt: 4, mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <ReportsIcon sx={{ fontSize: 40, mr: 2, color: 'primary.main' }} />
          <Typography variant="h4" component="h1">
            Reports & Analytics
          </Typography>
        </Box>

        <Alert severity="info" sx={{ mb: 3 }}>
          <Typography variant="body2">
            <strong>Demo Mode:</strong> This reports page shows the planned
            comprehensive reporting system. Most reports are currently in
            development. The Sales Dashboard and Customer Value reports are
            available in the Analytics section.
          </Typography>
        </Alert>

        {/* Report Controls */}
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Report Settings
          </Typography>
          <Grid container spacing={2} alignItems="center">
            <Grid
              size={{
                xs: 12,
                sm: 3
              }}>
              <FormControl fullWidth size="small">
                <InputLabel>Date Range</InputLabel>
                <Select
                  value={dateRange}
                  label="Date Range"
                  onChange={(e) => setDateRange(e.target.value)}
                >
                  <MenuItem value="day">Today</MenuItem>
                  <MenuItem value="week">This Week</MenuItem>
                  <MenuItem value="month">This Month</MenuItem>
                  <MenuItem value="month-to-date">Month to Date</MenuItem>
                  <MenuItem value="year-to-date">Year to Date</MenuItem>
                  <MenuItem value="year">This Year</MenuItem>
                  <MenuItem value="custom">Custom Range</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid
              size={{
                xs: 12,
                sm: 3
              }}>
              <FormControl fullWidth size="small">
                <InputLabel>Export Format</InputLabel>
                <Select
                  value={exportFormat}
                  label="Export Format"
                  onChange={(e) => setExportFormat(e.target.value)}
                >
                  <MenuItem value="pdf">PDF</MenuItem>
                  <MenuItem value="csv">CSV</MenuItem>
                  <MenuItem value="excel">Excel</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid
              size={{
                xs: 12,
                sm: 3
              }}>
              <TextField
                fullWidth
                size="small"
                label="Start Date"
                type="date"
                InputLabelProps={{ shrink: true }}
                disabled={dateRange !== 'custom'}
              />
            </Grid>
            <Grid
              size={{
                xs: 12,
                sm: 3
              }}>
              <TextField
                fullWidth
                size="small"
                label="End Date"
                type="date"
                InputLabelProps={{ shrink: true }}
                disabled={dateRange !== 'custom'}
              />
            </Grid>
          </Grid>
        </Paper>

        {/* Report Categories Tabs */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs
            value={tabValue}
            onChange={handleTabChange}
            aria-label="report categories"
            variant="scrollable"
            scrollButtons="auto"
            allowScrollButtonsMobile
            sx={{
              '& .MuiTab-root': {
                minWidth: 100,
                fontSize: '0.8rem',
                padding: '6px 8px',
              },
              '& .MuiTabs-flexContainer': {
                gap: 0.5,
              },
            }}
          >
            <Tab label="Sales" />
            <Tab label="Financial" />
            <Tab label="Tips" />
            <Tab label="Customer" />
            <Tab label="Pet" />
            <Tab label="Marketing" />
            <Tab label="Operations" />
            <Tab label="Service" />
            <Tab label="Tax" />
          </Tabs>
        </Box>

        {/* Sales Reports */}
        <TabPanel value={tabValue} index={0}>
          <SalesReports />
        </TabPanel>

        {/* Financial Reports */}
        <TabPanel value={tabValue} index={1}>
          <FinancialReports />
        </TabPanel>

        {/* Tip Reports */}
        <TabPanel value={tabValue} index={2}>
          <TipReports />
        </TabPanel>

        {/* Customer Reports */}
        <TabPanel value={tabValue} index={3}>
          <CustomerReports />
        </TabPanel>

        {/* Pet Reports */}
        <TabPanel value={tabValue} index={4}>
          <Grid container spacing={3}>
            <Grid
              size={{
                xs: 12,
                md: 6,
                lg: 4
              }}>
              <ReportCard
                title="Pet Demographics"
                description="Pet population analysis by breed, age, size, and type distribution."
                icon={<PetIcon color="primary" />}
                status="planned"
                onGenerate={() => handleExport('Pet Demographics')}
                onExport={() => handleExport('Pet Demographics')}
              />
            </Grid>
            <Grid
              size={{
                xs: 12,
                md: 6,
                lg: 4
              }}>
              <ReportCard
                title="Breed Analysis"
                description="Popular breeds, breed-specific service preferences, and health trends."
                icon={<PetIcon color="primary" />}
                status="planned"
                onGenerate={() => handleExport('Breed Analysis')}
                onExport={() => handleExport('Breed Analysis')}
              />
            </Grid>
            <Grid
              size={{
                xs: 12,
                md: 6,
                lg: 4
              }}>
              <ReportCard
                title="Health & Vaccination Tracking"
                description="Vaccination status, health records, and compliance reporting."
                icon={<PetIcon color="primary" />}
                status="planned"
                onGenerate={() => handleExport('Health Tracking')}
                onExport={() => handleExport('Health Tracking')}
              />
            </Grid>
            <Grid
              size={{
                xs: 12,
                md: 6,
                lg: 4
              }}>
              <ReportCard
                title="Service Preferences by Pet"
                description="Service usage patterns based on pet characteristics and preferences."
                icon={<PetIcon color="primary" />}
                status="planned"
                onGenerate={() => handleExport('Service Preferences')}
                onExport={() => handleExport('Service Preferences')}
              />
            </Grid>
            <Grid
              size={{
                xs: 12,
                md: 6,
                lg: 4
              }}>
              <ReportCard
                title="Feeding Reports"
                description="Picky eater tracking, meal consumption ratings (0-4), and feeding patterns by pet."
                icon={<FeedingIcon color="primary" />}
                status="available"
                onGenerate={() =>
                  (window.location.href = '/mobile/care-tracking')
                }
                onExport={() => handleExport('Feeding Reports')}
              />
            </Grid>
            <Grid
              size={{
                xs: 12,
                md: 6,
                lg: 4
              }}>
              <ReportCard
                title="Medication Reports"
                description="Medication administration logs, missed doses, and staff sign-off tracking."
                icon={<MedicationIcon color="primary" />}
                status="available"
                onGenerate={() =>
                  (window.location.href = '/mobile/care-tracking')
                }
                onExport={() => handleExport('Medication Reports')}
              />
            </Grid>
          </Grid>
        </TabPanel>

        {/* Marketing Reports */}
        <TabPanel value={tabValue} index={5}>
          <Grid container spacing={3}>
            <Grid
              size={{
                xs: 12,
                md: 6,
                lg: 4
              }}>
              <ReportCard
                title="Campaign Effectiveness"
                description="Marketing campaign performance, ROI analysis, and conversion tracking."
                icon={<MarketingIcon color="primary" />}
                status="planned"
                onGenerate={() => handleExport('Campaign Effectiveness')}
                onExport={() => handleExport('Campaign Effectiveness')}
              />
            </Grid>
            <Grid
              size={{
                xs: 12,
                md: 6,
                lg: 4
              }}>
              <ReportCard
                title="Referral Source Analysis"
                description="Customer referral sources, referral program performance, and attribution."
                icon={<MarketingIcon color="primary" />}
                status="planned"
                onGenerate={() => handleExport('Referral Analysis')}
                onExport={() => handleExport('Referral Analysis')}
              />
            </Grid>
            <Grid
              size={{
                xs: 12,
                md: 6,
                lg: 4
              }}>
              <ReportCard
                title="Seasonal Trends"
                description="Seasonal booking patterns, demand forecasting, and capacity planning."
                icon={<MarketingIcon color="primary" />}
                status="planned"
                onGenerate={() => handleExport('Seasonal Trends')}
                onExport={() => handleExport('Seasonal Trends')}
              />
            </Grid>
            <Grid
              size={{
                xs: 12,
                md: 6,
                lg: 4
              }}>
              <ReportCard
                title="Promotional Analysis"
                description="Coupon usage, discount effectiveness, and promotional campaign results."
                icon={<MarketingIcon color="primary" />}
                status="planned"
                onGenerate={() => handleExport('Promotional Analysis')}
                onExport={() => handleExport('Promotional Analysis')}
              />
            </Grid>
          </Grid>
        </TabPanel>

        {/* Operational Reports */}
        <TabPanel value={tabValue} index={6}>
          <OperationalReports />
        </TabPanel>

        {/* Service Reports */}
        <TabPanel value={tabValue} index={7}>
          <Grid container spacing={3}>
            <Grid
              size={{
                xs: 12,
                md: 6,
                lg: 4
              }}>
              <ReportCard
                title="Popular Services"
                description="Most requested services, service popularity trends, and demand analysis."
                icon={<ServiceIcon color="primary" />}
                status="planned"
                onGenerate={() => handleExport('Popular Services')}
                onExport={() => handleExport('Popular Services')}
              />
            </Grid>
            <Grid
              size={{
                xs: 12,
                md: 6,
                lg: 4
              }}>
              <ReportCard
                title="Add-On Performance"
                description="Add-on service uptake, revenue contribution, and upselling effectiveness."
                icon={<ServiceIcon color="primary" />}
                status="planned"
                onGenerate={() => handleExport('Add-On Performance')}
                onExport={() => handleExport('Add-On Performance')}
              />
            </Grid>
            <Grid
              size={{
                xs: 12,
                md: 6,
                lg: 4
              }}>
              <ReportCard
                title="Pricing Analysis"
                description="Service pricing optimization, price sensitivity analysis, and revenue per service."
                icon={<ServiceIcon color="primary" />}
                status="planned"
                onGenerate={() => handleExport('Pricing Analysis')}
                onExport={() => handleExport('Pricing Analysis')}
              />
            </Grid>
            <Grid
              size={{
                xs: 12,
                md: 6,
                lg: 4
              }}>
              <ReportCard
                title="Service Duration Trends"
                description="Average service durations, efficiency metrics, and time optimization opportunities."
                icon={<ServiceIcon color="primary" />}
                status="planned"
                onGenerate={() => handleExport('Duration Trends')}
                onExport={() => handleExport('Duration Trends')}
              />
            </Grid>
          </Grid>
        </TabPanel>

        {/* Tax Reports */}
        <TabPanel value={tabValue} index={8}>
          <TaxReports />
        </TabPanel>
      </Box>
    </Container>
  );
};

export default ReportsPage;
