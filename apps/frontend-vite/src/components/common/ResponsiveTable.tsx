/**
 * ResponsiveTable Component
 * 
 * A table component that adapts to screen size:
 * - Desktop: Traditional table layout
 * - Tablet: Compact table with smaller fonts
 * - Mobile: Card-based layout (stacked rows)
 */

import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Card,
  CardContent,
  Typography,
  Box
} from '@mui/material';
import { useResponsive } from '../../utils/responsive';

export interface Column {
  /**
   * Unique identifier for the column
   */
  id: string;
  
  /**
   * Display label for the column header
   */
  label: string;
  
  /**
   * Minimum width for the column (desktop only)
   */
  minWidth?: number;
  
  /**
   * Alignment of the column content
   */
  align?: 'left' | 'right' | 'center';
  
  /**
   * Custom formatter function for the cell value
   */
  format?: (value: any, row: any) => React.ReactNode;
  
  /**
   * Whether to hide this column on mobile
   */
  hideOnMobile?: boolean;
  
  /**
   * Whether this is a primary field (shown prominently on mobile)
   */
  primary?: boolean;
}

interface ResponsiveTableProps {
  /**
   * Column definitions
   */
  columns: Column[];
  
  /**
   * Data rows
   */
  rows: any[];
  
  /**
   * Optional click handler for rows
   */
  onRowClick?: (row: any) => void;
  
  /**
   * Optional empty state message
   */
  emptyMessage?: string;
  
  /**
   * Whether to show hover effect on rows
   */
  hover?: boolean;
}

const ResponsiveTable: React.FC<ResponsiveTableProps> = ({
  columns,
  rows,
  onRowClick,
  emptyMessage = 'No data available',
  hover = true
}) => {
  const { isMobile } = useResponsive();
  
  // Get primary column (first column marked as primary, or first column)
  const primaryColumn = columns.find(col => col.primary) || columns[0];
  
  // Get visible columns for mobile (exclude hideOnMobile)
  const mobileColumns = columns.filter(col => !col.hideOnMobile);
  
  if (rows.length === 0) {
    return (
      <Paper sx={{ p: 3, textAlign: 'center' }}>
        <Typography color="text.secondary">{emptyMessage}</Typography>
      </Paper>
    );
  }
  
  // Mobile card layout
  if (isMobile) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {rows.map((row, index) => (
          <Card
            key={index}
            sx={{
              cursor: onRowClick ? 'pointer' : 'default',
              '&:hover': onRowClick ? {
                boxShadow: 3,
                transform: 'translateY(-2px)',
                transition: 'all 0.2s'
              } : {}
            }}
            onClick={() => onRowClick?.(row)}
          >
            <CardContent>
              {/* Primary field - larger and bold */}
              <Typography variant="h6" gutterBottom>
                {primaryColumn.format 
                  ? primaryColumn.format(row[primaryColumn.id], row)
                  : row[primaryColumn.id]
                }
              </Typography>
              
              {/* Other fields - smaller */}
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mt: 1 }}>
                {mobileColumns
                  .filter(col => col.id !== primaryColumn.id)
                  .map(column => (
                    <Box 
                      key={column.id}
                      sx={{ 
                        display: 'flex', 
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}
                    >
                      <Typography 
                        variant="caption" 
                        color="text.secondary"
                        sx={{ fontWeight: 'bold', minWidth: 100 }}
                      >
                        {column.label}:
                      </Typography>
                      <Typography variant="body2">
                        {column.format 
                          ? column.format(row[column.id], row)
                          : row[column.id]
                        }
                      </Typography>
                    </Box>
                  ))
                }
              </Box>
            </CardContent>
          </Card>
        ))}
      </Box>
    );
  }
  
  // Desktop/Tablet table layout
  return (
    <TableContainer component={Paper}>
      <Table stickyHeader>
        <TableHead>
          <TableRow>
            {columns.map((column) => (
              <TableCell
                key={column.id}
                align={column.align}
                style={{ minWidth: column.minWidth }}
                sx={{ fontWeight: 'bold' }}
              >
                {column.label}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row, index) => (
            <TableRow
              key={index}
              hover={hover}
              onClick={() => onRowClick?.(row)}
              sx={{
                cursor: onRowClick ? 'pointer' : 'default',
                '&:last-child td, &:last-child th': { border: 0 }
              }}
            >
              {columns.map((column) => (
                <TableCell key={column.id} align={column.align}>
                  {column.format 
                    ? column.format(row[column.id], row)
                    : row[column.id]
                  }
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default ResponsiveTable;

/**
 * Example usage:
 * 
 * const columns: Column[] = [
 *   { 
 *     id: 'name', 
 *     label: 'Name', 
 *     primary: true,
 *     minWidth: 170 
 *   },
 *   { 
 *     id: 'email', 
 *     label: 'Email',
 *     hideOnMobile: true 
 *   },
 *   { 
 *     id: 'status', 
 *     label: 'Status',
 *     format: (value) => (
 *       <Chip 
 *         label={value} 
 *         color={value === 'active' ? 'success' : 'default'}
 *         size="small"
 *       />
 *     )
 *   },
 *   { 
 *     id: 'amount', 
 *     label: 'Amount',
 *     align: 'right',
 *     format: (value) => `$${value.toFixed(2)}`
 *   }
 * ];
 * 
 * <ResponsiveTable
 *   columns={columns}
 *   rows={data}
 *   onRowClick={(row) => console.log('Clicked:', row)}
 *   emptyMessage="No customers found"
 * />
 */
