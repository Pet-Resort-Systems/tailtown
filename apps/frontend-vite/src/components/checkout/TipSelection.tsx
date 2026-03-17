import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  Grid,
  TextField,
  InputAdornment,
  Avatar,
  Chip,
} from '@mui/material';
import GroupsIcon from '@mui/icons-material/Groups';
import ContentCutIcon from '@mui/icons-material/ContentCut';

interface TipSelectionProps {
  subtotal: number;
  groomer?: {
    id: string;
    firstName: string;
    lastName: string;
  } | null;
  hasGroomingService: boolean;
  onTipsSelected: (tips: TipData) => void;
  onBack?: () => void;
  onSkip?: () => void;
}

export interface TipData {
  groomerTip: number | null;
  groomerTipPercentage: number | null;
  groomerId: string | null;
  generalTip: number | null;
  generalTipPercentage: number | null;
  totalTips: number;
}

const TIP_PERCENTAGES = [15, 20, 25];

const TipSelection: React.FC<TipSelectionProps> = ({
  subtotal,
  groomer,
  hasGroomingService,
  onTipsSelected,
  onBack,
  onSkip,
}) => {
  // Groomer tip state
  const [groomerTipPercentage, setGroomerTipPercentage] = useState<
    number | null
  >(null);
  const [groomerTipCustom, setGroomerTipCustom] = useState<string>('');
  const [groomerTipMode, setGroomerTipMode] = useState<
    'percentage' | 'custom' | 'none'
  >('none');

  // General tip state
  const [generalTipPercentage, setGeneralTipPercentage] = useState<
    number | null
  >(null);
  const [generalTipCustom, setGeneralTipCustom] = useState<string>('');
  const [generalTipMode, setGeneralTipMode] = useState<
    'percentage' | 'custom' | 'none'
  >('none');

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  // Calculate tip amounts
  const calculateGroomerTip = (): number => {
    if (groomerTipMode === 'percentage' && groomerTipPercentage) {
      return Math.round(subtotal * (groomerTipPercentage / 100) * 100) / 100;
    }
    if (groomerTipMode === 'custom' && groomerTipCustom) {
      return parseFloat(groomerTipCustom) || 0;
    }
    return 0;
  };

  const calculateGeneralTip = (): number => {
    if (generalTipMode === 'percentage' && generalTipPercentage) {
      return Math.round(subtotal * (generalTipPercentage / 100) * 100) / 100;
    }
    if (generalTipMode === 'custom' && generalTipCustom) {
      return parseFloat(generalTipCustom) || 0;
    }
    return 0;
  };

  const groomerTipAmount = calculateGroomerTip();
  const generalTipAmount = calculateGeneralTip();
  const totalTips = groomerTipAmount + generalTipAmount;

  const handleGroomerPercentageClick = (percentage: number) => {
    if (
      groomerTipMode === 'percentage' &&
      groomerTipPercentage === percentage
    ) {
      // Deselect
      setGroomerTipMode('none');
      setGroomerTipPercentage(null);
    } else {
      setGroomerTipMode('percentage');
      setGroomerTipPercentage(percentage);
      setGroomerTipCustom('');
    }
  };

  const handleGeneralPercentageClick = (percentage: number) => {
    if (
      generalTipMode === 'percentage' &&
      generalTipPercentage === percentage
    ) {
      // Deselect
      setGeneralTipMode('none');
      setGeneralTipPercentage(null);
    } else {
      setGeneralTipMode('percentage');
      setGeneralTipPercentage(percentage);
      setGeneralTipCustom('');
    }
  };

  const handleGroomerCustomChange = (value: string) => {
    setGroomerTipCustom(value);
    if (value) {
      setGroomerTipMode('custom');
      setGroomerTipPercentage(null);
    } else {
      setGroomerTipMode('none');
    }
  };

  const handleGeneralCustomChange = (value: string) => {
    setGeneralTipCustom(value);
    if (value) {
      setGeneralTipMode('custom');
      setGeneralTipPercentage(null);
    } else {
      setGeneralTipMode('none');
    }
  };

  const handleContinue = () => {
    const tipData: TipData = {
      groomerTip: groomerTipAmount > 0 ? groomerTipAmount : null,
      groomerTipPercentage:
        groomerTipMode === 'percentage' ? groomerTipPercentage : null,
      groomerId: groomerTipAmount > 0 && groomer ? groomer.id : null,
      generalTip: generalTipAmount > 0 ? generalTipAmount : null,
      generalTipPercentage:
        generalTipMode === 'percentage' ? generalTipPercentage : null,
      totalTips,
    };
    onTipsSelected(tipData);
  };

  const showGroomerSection = hasGroomingService && groomer;

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Add a Tip
      </Typography>
      <Typography variant="body2" color="text.secondary" gutterBottom>
        Tips are optional and greatly appreciated by our team
      </Typography>

      {/* Groomer Tip Section */}
      {showGroomerSection && (
        <Paper
          elevation={0}
          sx={{
            p: 3,
            mt: 3,
            bgcolor: 'primary.50',
            border: '1px solid',
            borderColor: 'primary.200',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <Avatar sx={{ bgcolor: 'primary.main', mr: 2 }}>
              <ContentCutIcon />
            </Avatar>
            <Box>
              <Typography variant="subtitle1" fontWeight={600}>
                Tip for {groomer.firstName} {groomer.lastName}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Your groomer today
              </Typography>
            </Box>
          </Box>

          <Grid container spacing={1} sx={{ mb: 2 }}>
            {TIP_PERCENTAGES.map((pct) => (
              <Grid item xs={4} key={pct}>
                <Button
                  fullWidth
                  variant={
                    groomerTipMode === 'percentage' &&
                    groomerTipPercentage === pct
                      ? 'contained'
                      : 'outlined'
                  }
                  onClick={() => handleGroomerPercentageClick(pct)}
                  sx={{
                    py: 1.5,
                    flexDirection: 'column',
                  }}
                >
                  <Typography variant="h6" component="span">
                    {pct}%
                  </Typography>
                  <Typography variant="caption" component="span">
                    {formatCurrency(subtotal * (pct / 100))}
                  </Typography>
                </Button>
              </Grid>
            ))}
          </Grid>

          <TextField
            fullWidth
            size="small"
            label="Custom Amount"
            placeholder="Enter custom tip"
            value={groomerTipCustom}
            onChange={(e) => handleGroomerCustomChange(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">$</InputAdornment>
              ),
            }}
            type="number"
            inputProps={{ min: 0, step: 0.01 }}
          />

          {groomerTipAmount > 0 && (
            <Box sx={{ mt: 2, textAlign: 'right' }}>
              <Chip
                label={`Groomer tip: ${formatCurrency(groomerTipAmount)}`}
                color="primary"
                variant="filled"
              />
            </Box>
          )}
        </Paper>
      )}

      {/* General Tip Section */}
      <Paper
        elevation={0}
        sx={{
          p: 3,
          mt: 3,
          bgcolor: 'grey.50',
          border: '1px solid',
          borderColor: 'grey.300',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Avatar sx={{ bgcolor: 'secondary.main', mr: 2 }}>
            <GroupsIcon />
          </Avatar>
          <Box>
            <Typography variant="subtitle1" fontWeight={600}>
              General Tip for the Team
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Shared among all staff members
            </Typography>
          </Box>
        </Box>

        <Grid container spacing={1} sx={{ mb: 2 }}>
          {TIP_PERCENTAGES.map((pct) => (
            <Grid item xs={4} key={pct}>
              <Button
                fullWidth
                variant={
                  generalTipMode === 'percentage' &&
                  generalTipPercentage === pct
                    ? 'contained'
                    : 'outlined'
                }
                color="secondary"
                onClick={() => handleGeneralPercentageClick(pct)}
                sx={{
                  py: 1.5,
                  flexDirection: 'column',
                }}
              >
                <Typography variant="h6" component="span">
                  {pct}%
                </Typography>
                <Typography variant="caption" component="span">
                  {formatCurrency(subtotal * (pct / 100))}
                </Typography>
              </Button>
            </Grid>
          ))}
        </Grid>

        <TextField
          fullWidth
          size="small"
          label="Custom Amount"
          placeholder="Enter custom tip"
          value={generalTipCustom}
          onChange={(e) => handleGeneralCustomChange(e.target.value)}
          InputProps={{
            startAdornment: <InputAdornment position="start">$</InputAdornment>,
          }}
          type="number"
          inputProps={{ min: 0, step: 0.01 }}
        />

        {generalTipAmount > 0 && (
          <Box sx={{ mt: 2, textAlign: 'right' }}>
            <Chip
              label={`Team tip: ${formatCurrency(generalTipAmount)}`}
              color="secondary"
              variant="filled"
            />
          </Box>
        )}
      </Paper>

      {/* Summary */}
      {totalTips > 0 && (
        <Paper
          elevation={0}
          sx={{
            p: 2,
            mt: 3,
            bgcolor: 'success.50',
            border: '1px solid',
            borderColor: 'success.200',
          }}
        >
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <Typography variant="subtitle1">Total Tips:</Typography>
            <Typography variant="h5" color="success.main" fontWeight={600}>
              {formatCurrency(totalTips)}
            </Typography>
          </Box>
        </Paper>
      )}

      {/* Actions */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
        {onBack && <Button onClick={onBack}>Back</Button>}
        <Box sx={{ display: 'flex', gap: 1, ml: 'auto' }}>
          {onSkip && (
            <Button variant="text" onClick={onSkip} color="inherit">
              Skip Tips
            </Button>
          )}
          <Button variant="contained" onClick={handleContinue}>
            {totalTips > 0
              ? `Continue with ${formatCurrency(totalTips)} Tip`
              : 'Continue Without Tip'}
          </Button>
        </Box>
      </Box>
    </Box>
  );
};

export default TipSelection;
