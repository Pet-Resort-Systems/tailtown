import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { useShoppingCart } from '../../contexts/ShoppingCartContext';

// Define the props interface
interface OrderSummaryProps {
  taxRate: number;
}

// Define a minimal implementation of OrderSummary that doesn't change functionality
const OrderSummary: React.FC<OrderSummaryProps> = ({ taxRate }) => {
  // Access the cart state
  const { state } = useShoppingCart();

  // Calculate subtotal including add-ons
  const subtotal = state.items.reduce((total, item) => {
    let itemTotal = item.price || 0;

    // Add add-ons to the item total
    if (item.addOns && item.addOns.length > 0) {
      itemTotal += item.addOns.reduce(
        (addOnTotal, addOn) => addOnTotal + addOn.price * addOn.quantity,
        0
      );
    }

    return total + itemTotal;
  }, 0);

  // Calculate tax
  const tax = subtotal * taxRate;

  // Calculate total
  const total = subtotal + tax;

  return (
    <TableContainer>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Item</TableCell>
            <TableCell>Type</TableCell>
            <TableCell>Details</TableCell>
            <TableCell align="right">Price</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {state.items.map((item) => (
            <React.Fragment key={item.id}>
              {/* Main service row */}
              <TableRow>
                <TableCell>{item.serviceName || 'Service'}</TableCell>
                <TableCell>Service</TableCell>
                <TableCell>
                  {item.petName ? `for ${item.petName}` : '-'}
                </TableCell>
                <TableCell align="right">
                  ${(item.price || 0).toFixed(2)}
                </TableCell>
              </TableRow>

              {/* Add-on rows */}
              {item.addOns &&
                item.addOns.map((addOn, index) => (
                  <TableRow key={`${item.id}-addon-${index}`}>
                    <TableCell sx={{ pl: 4 }}>+ {addOn.name}</TableCell>
                    <TableCell>Add-on</TableCell>
                    <TableCell>Qty: {addOn.quantity}</TableCell>
                    <TableCell align="right">
                      ${(addOn.price * addOn.quantity).toFixed(2)}
                    </TableCell>
                  </TableRow>
                ))}
            </React.Fragment>
          ))}

          {/* Summary rows */}
          <TableRow>
            <TableCell colSpan={3}>Subtotal</TableCell>
            <TableCell align="right">${subtotal.toFixed(2)}</TableCell>
          </TableRow>
          <TableRow>
            <TableCell colSpan={3}>
              Tax ({(taxRate * 100).toFixed(2)}%)
            </TableCell>
            <TableCell align="right">${tax.toFixed(2)}</TableCell>
          </TableRow>
          <TableRow>
            <TableCell colSpan={3}>
              <Typography variant="subtitle1" fontWeight="bold">
                Total
              </Typography>
            </TableCell>
            <TableCell align="right">
              <Typography variant="subtitle1" fontWeight="bold">
                ${total.toFixed(2)}
              </Typography>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default OrderSummary;
