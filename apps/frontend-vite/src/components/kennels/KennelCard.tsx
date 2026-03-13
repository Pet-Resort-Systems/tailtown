import React from 'react';
import { 
  Box, 
  Card, 
  CardContent, 
  Typography, 
  Divider, 
  Paper,
  Grid,
  styled,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow
} from '@mui/material';
import PrintablePetIcons from './PrintablePetIcons';
import { format, addDays, startOfWeek } from 'date-fns';

// Styled components for the kennel card
const PrintableCard = styled(Card)(({ theme }) => ({
  width: '8.5in', // Full letter size width
  height: '11in', // Full letter size height
  padding: theme.spacing(3),
  margin: '0 auto',
  border: '2px solid #000',
  boxShadow: 'none',
  pageBreakInside: 'avoid',
  pageBreakAfter: 'always',
  breakAfter: 'page',
  breakInside: 'avoid',
  '@media print': {
    boxShadow: 'none',
    border: '2px solid #000',
    margin: 0,
    padding: theme.spacing(3),
    height: '11in',
    width: '8.5in',
    position: 'relative',
    pageBreakAfter: 'always',
    pageBreakBefore: 'avoid',
    breakAfter: 'page',
    breakInside: 'avoid',
    overflow: 'visible'
  }
}));

const CardHeader = styled(Box)(({ theme }) => ({
  backgroundColor: theme.palette.primary.main,
  color: theme.palette.primary.contrastText,
  padding: theme.spacing(1.5),
  borderRadius: theme.shape.borderRadius,
  marginBottom: theme.spacing(1.5),
  textAlign: 'center',
}));

const SectionTitle = styled(Typography)(({ theme }) => ({
  fontWeight: 'bold',
  marginBottom: theme.spacing(0.5),
  color: theme.palette.primary.main,
}));

const AlertBox = styled(Paper)(({ theme }) => ({
  backgroundColor: theme.palette.error.light,
  color: theme.palette.error.contrastText,
  padding: theme.spacing(1),
  marginTop: theme.spacing(1),
  borderRadius: theme.shape.borderRadius,
}));

const NotesBox = styled(Paper)(({ theme }) => ({
  backgroundColor: theme.palette.grey[100],
  padding: theme.spacing(1),
  marginTop: theme.spacing(1),
  borderRadius: theme.shape.borderRadius,
  minHeight: '60px',
}));

const StyledTableCell = styled(TableCell)(({ theme }) => ({
  border: '2px solid #000',
  padding: theme.spacing(1.5),
  fontSize: '0.9rem',
  height: '30px',
  '@media print': {
    border: '2px solid #000 !important',
    padding: theme.spacing(1),
    fontSize: '0.85rem',
    height: '30px',
    printColorAdjust: 'exact',
    WebkitPrintColorAdjust: 'exact'
  }
}));

const StyledTableHeaderCell = styled(TableCell)(({ theme }) => ({
  border: '2px solid #000',
  padding: theme.spacing(1),
  backgroundColor: theme.palette.primary.main,
  color: theme.palette.primary.contrastText,
  fontWeight: 'bold',
  textAlign: 'center',
  fontSize: '1rem',
  '@media print': {
    border: '2px solid #000 !important',
    backgroundColor: `${theme.palette.primary.main} !important`,
    color: `${theme.palette.primary.contrastText} !important`,
    padding: theme.spacing(0.5),
    fontSize: '0.9rem',
    printColorAdjust: 'exact',
    WebkitPrintColorAdjust: 'exact'
  }
}));

const StyledTableRowHeaderCell = styled(TableCell)(({ theme }) => ({
  border: '2px solid #000',
  padding: theme.spacing(1),
  backgroundColor: theme.palette.grey[300],
  fontWeight: 'bold',
  width: '120px',
  fontSize: '1rem',
  '@media print': {
    border: '2px solid #000 !important',
    backgroundColor: `${theme.palette.grey[300]} !important`,
    padding: theme.spacing(0.5),
    fontSize: '0.9rem',
    printColorAdjust: 'exact',
    WebkitPrintColorAdjust: 'exact'
  }
}));

interface KennelCardProps {
  kennelNumber: number | string;
  suiteType: string;
  petName: string;
  petBreed?: string;
  petWeight?: number;
  petIconIds: string[];
  petType?: 'DOG' | 'CAT' | 'OTHER';
  customNotes?: { [iconId: string]: string };
  petNotes?: string;
  ownerName: string;
  ownerPhone?: string;
  startDate: Date;
  endDate: Date;
  alerts?: string[];
}

/**
 * Printable kennel card component to be hung on each kennel
 * Displays pet information, icons, alerts, and reservation details
 * 
 * Performance: Memoized with useMemo for expensive date formatting
 */
const KennelCard: React.FC<KennelCardProps> = React.memo(({
  kennelNumber,
  suiteType,
  petName,
  petBreed,
  petWeight,
  petIconIds,
  petType = 'DOG',
  customNotes = {},
  petNotes,
  ownerName,
  ownerPhone,
  startDate,
  endDate,
  alerts = [],
}) => {
  // Format suite type for display (memoized)
  const formattedSuiteType = React.useMemo(() => 
    suiteType
      .replace('_', ' ')
      .toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' '),
    [suiteType]
  );

  // Format dates for display (memoized to avoid re-formatting on every render)
  const formattedDates = React.useMemo(() => ({
    startDate: format(startDate, 'MMM d, yyyy'),
    startTime: format(startDate, 'h:mm a'),
    endDate: format(endDate, 'MMM d, yyyy'),
    endTime: format(endDate, 'h:mm a'),
  }), [startDate, endDate]);
  
  // Always use today's date for the printed date
  const today = React.useMemo(() => new Date(), []);
  
  // Generate week days for the schedule table (memoized)
  const weekDays = React.useMemo(() => {
    const weekStart = startOfWeek(startDate, { weekStartsOn: 0 }); // 0 = Sunday
    return Array.from({ length: 7 }, (_, i) => {
      const day = addDays(weekStart, i);
      return {
        date: day,
        dayName: format(day, 'EEE'), // Short day name (Mon, Tue, etc.)
        dayNumber: format(day, 'd'), // Day of month
      };
    });
  }, [startDate]);

  // Format kennel number with space before last character (e.g., "A 03")
  const formattedKennelNumber = typeof kennelNumber === 'string' && kennelNumber.length > 1
    ? kennelNumber.slice(0, -1) + ' ' + kennelNumber.slice(-1)
    : kennelNumber;

  return (
    <PrintableCard>
      <CardHeader>
        <Typography variant="h2" component="h1" sx={{ fontSize: '2.5rem', mb: 1 }}>
          {petName}
        </Typography>
        <Typography variant="h4" component="h2">
          {formattedDates.startTime} - {formattedSuiteType}
        </Typography>
      </CardHeader>

      <CardContent sx={{ p: 0 }}>
        <Grid container spacing={4} sx={{ mt: 2 }}>
          {/* Left column */}
          <Grid item xs={7}>
            <SectionTitle variant="h5" sx={{ fontSize: '1.5rem', mb: 2 }}>Pet Information</SectionTitle>
            <Box sx={{ pl: 2, mb: 4 }}>
              {petBreed && (
                <Typography variant="h6" sx={{ mb: 1 }}>
                  <strong>Breed:</strong> {petBreed}
                </Typography>
              )}
              {petWeight && (
                <Typography variant="h6" sx={{ mb: 1 }}>
                  <strong>Weight:</strong> {petWeight} lbs
                </Typography>
              )}
              <Typography variant="h6" sx={{ mb: 1 }}>
                <strong>Owner:</strong> {ownerName}
              </Typography>
              {ownerPhone && (
                <Typography variant="h6" sx={{ mb: 1 }}>
                  <strong>Phone:</strong> {ownerPhone}
                </Typography>
              )}
            </Box>

            <Box sx={{ mt: 4, mb: 4 }}>
              <SectionTitle variant="h5" sx={{ fontSize: '1.5rem', mb: 2 }}>Stay Information</SectionTitle>
              <Box sx={{ pl: 2 }}>
                <Typography variant="h6" sx={{ mb: 1, fontSize: '1.375rem' }}>
                  <strong>Kennel #</strong>{formattedKennelNumber}
                </Typography>
                <Typography variant="h6" sx={{ mb: 1 }}>
                  <strong>Check-In:</strong> {formattedDates.startDate} at {formattedDates.startTime}
                </Typography>
                <Typography variant="h6" sx={{ mb: 1 }}>
                  <strong>Check-Out:</strong> {formattedDates.endDate} at {formattedDates.endTime}
                </Typography>
              </Box>
            </Box>

            {petNotes && (
              <Box sx={{ mt: 4 }}>
                <SectionTitle variant="h5" sx={{ fontSize: '1.5rem', mb: 2 }}>Notes</SectionTitle>
                <NotesBox sx={{ p: 2, minHeight: '120px' }}>
                  <Typography variant="h6">{petNotes}</Typography>
                </NotesBox>
              </Box>
            )}
          </Grid>

          {/* Right column */}
          <Grid item xs={5}>
            <SectionTitle variant="h5" sx={{ fontSize: '1.5rem', mb: 2 }}>Pet Characteristics</SectionTitle>
            <Box 
              sx={{ 
                border: '1px solid #e0e0e0', 
                p: 2, 
                borderRadius: 1, 
                backgroundColor: '#f9f9f9', 
                mb: 4,
                '@media print': {
                  backgroundColor: '#f9f9f9 !important',
                  printColorAdjust: 'exact',
                  WebkitPrintColorAdjust: 'exact'
                }
              }}
              className="pet-icons-wrapper"
            >
              <PrintablePetIcons 
                iconIds={petIconIds} 
                petType={petType}
                size="large" 
                showLabels={true} 
                customNotes={customNotes}
              />
            </Box>

            {alerts.length > 0 && (
              <Box sx={{ mt: 4 }}>
                <SectionTitle variant="h5" sx={{ fontSize: '1.5rem', mb: 2 }}>Alerts</SectionTitle>
                {alerts.map((alert, index) => (
                  <AlertBox key={index} sx={{ p: 2, mb: 2 }}>
                    <Typography variant="h6">{alert}</Typography>
                  </AlertBox>
                ))}
              </Box>
            )}
          </Grid>
        </Grid>

        <Divider sx={{ my: 4 }} />
        
        {/* Weekly Schedule Table */}
        <Box sx={{ mt: 4, mb: 4 }}>
          <SectionTitle variant="h5" sx={{ fontSize: '1.5rem', mb: 2, color: 'primary.dark' }}>WEEKLY SCHEDULE</SectionTitle>
          <TableContainer component={Paper} variant="outlined" sx={{ 
            border: '3px solid #000', 
            boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
            '@media print': {
              border: '3px solid #000 !important',
              boxShadow: 'none'
            }
          }}>
            <Table size="small" aria-label="weekly schedule table" sx={{ tableLayout: 'fixed' }}>
              <TableHead>
                <TableRow>
                  <StyledTableHeaderCell>Care Type</StyledTableHeaderCell>
                  {weekDays.map((day) => (
                    <StyledTableHeaderCell key={day.dayName}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                        {day.dayName}
                      </Typography>
                      <Typography variant="body2">
                        {day.dayNumber}
                      </Typography>
                    </StyledTableHeaderCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {/* Feeding Row */}
                <TableRow>
                  <StyledTableRowHeaderCell>Feeding</StyledTableRowHeaderCell>
                  {weekDays.map((day) => (
                    <StyledTableCell key={`feeding-${day.dayName}`}></StyledTableCell>
                  ))}
                </TableRow>
                
                {/* AM Row */}
                <TableRow>
                  <StyledTableRowHeaderCell>AM</StyledTableRowHeaderCell>
                  {weekDays.map((day) => (
                    <StyledTableCell key={`am-${day.dayName}`}></StyledTableCell>
                  ))}
                </TableRow>
                
                {/* Lunch/IC Row */}
                <TableRow>
                  <StyledTableRowHeaderCell>Lunch/IC</StyledTableRowHeaderCell>
                  {weekDays.map((day) => (
                    <StyledTableCell key={`lunch-${day.dayName}`}></StyledTableCell>
                  ))}
                </TableRow>
                
                {/* PM Row */}
                <TableRow>
                  <StyledTableRowHeaderCell>PM</StyledTableRowHeaderCell>
                  {weekDays.map((day) => (
                    <StyledTableCell key={`pm-${day.dayName}`}></StyledTableCell>
                  ))}
                </TableRow>
                
                {/* Treats Row */}
                <TableRow>
                  <StyledTableRowHeaderCell>Treats</StyledTableRowHeaderCell>
                  {weekDays.map((day) => (
                    <StyledTableCell key={`treats-${day.dayName}`}></StyledTableCell>
                  ))}
                </TableRow>
                
                {/* Picky Notes Row */}
                <TableRow>
                  <StyledTableRowHeaderCell>Picky Notes</StyledTableRowHeaderCell>
                  {weekDays.map((day) => (
                    <StyledTableCell key={`notes-${day.dayName}`}></StyledTableCell>
                  ))}
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
        
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2 }}>
          <Typography variant="body1" sx={{ fontStyle: 'italic' }}>
            Printed: {format(today, 'MMM d, yyyy h:mm a')}
          </Typography>
          <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
            Tailtown Pet Care
          </Typography>
        </Box>
      </CardContent>
    </PrintableCard>
  );
});

KennelCard.displayName = 'KennelCard';

export default KennelCard;
