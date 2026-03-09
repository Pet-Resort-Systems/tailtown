import React from 'react';
import { Alert, AlertTitle, Box, Typography, Paper, Button } from '@mui/material';
import { AppError } from '../../utils/errorHandling';

interface ErrorDisplayProps {
  error?: string | AppError | null;
  variant?: 'alert' | 'box' | 'inline' | 'minimal';
  severity?: 'error' | 'warning' | 'info' | 'success';
  onRetry?: () => void;
  onDismiss?: () => void;
}

/**
 * A reusable component for displaying errors in a consistent way
 */
const ErrorDisplay: React.FC<ErrorDisplayProps> = ({
  error,
  variant = 'alert',
  severity = 'error',
  onRetry,
  onDismiss
}) => {
  if (!error) return null;
  
  // Convert error to a string if it's an AppError object
  const errorMessage = typeof error === 'string' 
    ? error 
    : ((error as AppError)?.message || 'An unknown error occurred');
  
  const errorDetails = typeof error !== 'string' ? (error as AppError) : undefined;
  
  // Different display variants
  switch (variant) {
    // Standard MUI Alert
    case 'alert':
      return (
        <Alert
          severity={severity}
          action={
            (onDismiss || onRetry) && (
              <Box sx={{ display: 'flex', gap: 1 }}>
                {onRetry && (
                  <Button color="inherit" size="small" onClick={onRetry}>
                    Retry
                  </Button>
                )}
                {onDismiss && (
                  <Button color="inherit" size="small" onClick={onDismiss}>
                    Dismiss
                  </Button>
                )}
              </Box>
            )
          }
          sx={{ mb: 2 }}
        >
          <AlertTitle>{severity === 'error' ? 'Error' : (severity === 'warning' ? 'Warning' : 'Note')}</AlertTitle>
          {errorMessage}
          
          {errorDetails?.statusCode && (
            <Typography variant="caption" component="div" sx={{ mt: 1 }}>
              Status: {errorDetails.statusCode}
            </Typography>
          )}
        </Alert>
      );
      
    // Box with more details, good for debugging
    case 'box':
      return (
        <Paper 
          elevation={1} 
          sx={{ 
            p: 2, 
            mb: 2, 
            bgcolor: severity === 'error' 
              ? 'rgba(211, 47, 47, 0.04)' 
              : (severity === 'warning' 
                ? 'rgba(237, 108, 2, 0.04)' 
                : 'rgba(2, 136, 209, 0.04)'),
            border: 1,
            borderColor: severity === 'error' 
              ? 'error.light' 
              : (severity === 'warning' 
                ? 'warning.light' 
                : 'info.light')
          }}
        >
          <Typography variant="subtitle1" color={`${severity}.main`} gutterBottom>
            {severity === 'error' ? 'Error' : (severity === 'warning' ? 'Warning' : 'Note')}
          </Typography>
          
          <Typography variant="body2" color="text.primary" paragraph>
            {errorMessage}
          </Typography>
          
          {errorDetails && (
            <>
              {errorDetails.code && (
                <Typography variant="caption" component="div" sx={{ mt: 1 }}>
                  Code: {errorDetails.code}
                </Typography>
              )}
              
              {errorDetails.statusCode && (
                <Typography variant="caption" component="div">
                  Status: {errorDetails.statusCode}
                </Typography>
              )}
              
              {errorDetails.context && (
                <Typography variant="caption" component="div">
                  Context: {errorDetails.context}
                </Typography>
              )}
              
              {process.env.NODE_ENV === 'development' && errorDetails.details && (
                <Box sx={{ mt: 1 }}>
                  <Typography variant="caption" component="div">
                    Details:
                  </Typography>
                  <pre style={{ 
                    fontSize: '0.75rem', 
                    overflow: 'auto', 
                    maxHeight: '200px', 
                    backgroundColor: 'rgba(0, 0, 0, 0.04)',
                    padding: '8px',
                    borderRadius: '4px'
                  }}>
                    {JSON.stringify(errorDetails.details, null, 2)}
                  </pre>
                </Box>
              )}
            </>
          )}
          
          {(onDismiss || onRetry) && (
            <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
              {onRetry && (
                <Button 
                  variant="outlined" 
                  size="small" 
                  onClick={onRetry}
                  color={severity}
                >
                  Retry
                </Button>
              )}
              {onDismiss && (
                <Button 
                  variant="text" 
                  size="small" 
                  onClick={onDismiss}
                >
                  Dismiss
                </Button>
              )}
            </Box>
          )}
        </Paper>
      );
      
    // Simple inline error text
    case 'inline':
      return (
        <Box 
          sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 1, 
            color: severity === 'error' 
              ? 'error.main' 
              : (severity === 'warning' 
                ? 'warning.main' 
                : 'info.main')
          }}
        >
          <Typography variant="body2" component="span">
            {errorMessage}
          </Typography>
          
          {onRetry && (
            <Button 
              color={severity}
              size="small"
              onClick={onRetry}
              sx={{ minWidth: 'auto', p: '2px 8px' }}
            >
              Retry
            </Button>
          )}
        </Box>
      );
      
    // Minimal text-only display
    case 'minimal':
    default:
      return (
        <Typography 
          variant="body2" 
          color={severity === 'error' 
            ? 'error.main' 
            : (severity === 'warning' 
              ? 'warning.main' 
              : 'info.main')
          }
        >
          {errorMessage}
        </Typography>
      );
  }
};

export default ErrorDisplay;
