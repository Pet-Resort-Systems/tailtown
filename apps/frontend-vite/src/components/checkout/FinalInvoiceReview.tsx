import React from "react";
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Divider,
  Chip,
} from "@mui/material";

interface FinalInvoiceReviewProps {
  invoice: any;
  onContinue: (invoiceData: any) => void;
}

const FinalInvoiceReview: React.FC<FinalInvoiceReviewProps> = ({
  invoice,
  onContinue,
}) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount || 0);
  };

  // Calculate paid amount from payments array if depositPaid isn't set
  const calculatePaidAmount = () => {
    // First check if depositPaid is set on the invoice
    if (invoice?.depositPaid && invoice.depositPaid > 0) {
      return invoice.depositPaid;
    }
    // Otherwise calculate from payments array
    if (invoice?.payments && Array.isArray(invoice.payments)) {
      return invoice.payments.reduce((sum: number, payment: any) => {
        if (payment.status === "PAID") {
          return sum + (payment.amount || 0);
        }
        return sum;
      }, 0);
    }
    return 0;
  };

  const paidAmount = calculatePaidAmount();
  const balanceDue =
    invoice?.balanceDue ?? Math.max(0, (invoice?.total || 0) - paidAmount);

  const getPaymentStatusColor = (status: string) => {
    switch (status?.toUpperCase()) {
      case "PAID":
        return "success";
      case "DEPOSIT_PAID":
      case "PARTIALLY_PAID":
        return "warning";
      case "PENDING":
      case "DRAFT":
        return "default";
      default:
        return "default";
    }
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Final Invoice Review
      </Typography>
      <Typography variant="body2" color="text.secondary" gutterBottom>
        Review the final charges before proceeding with checkout
      </Typography>

      <Paper elevation={0} sx={{ p: 3, mt: 3, bgcolor: "grey.50" }}>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 2,
          }}
        >
          <Typography variant="subtitle1">
            Invoice #{invoice?.invoiceNumber || "N/A"}
          </Typography>
          <Chip
            label={invoice?.status || "PENDING"}
            color={getPaymentStatusColor(invoice?.status)}
            size="small"
          />
        </Box>

        <Divider sx={{ my: 2 }} />

        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Description</TableCell>
                <TableCell align="right">Amount</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              <TableRow>
                <TableCell>Service Charges</TableCell>
                <TableCell align="right">
                  {formatCurrency(invoice?.subtotal || 0)}
                </TableCell>
              </TableRow>

              {invoice?.taxAmount > 0 && (
                <TableRow>
                  <TableCell>
                    Tax ({((invoice?.taxRate || 0) * 100).toFixed(2)}%)
                  </TableCell>
                  <TableCell align="right">
                    {formatCurrency(invoice?.taxAmount || 0)}
                  </TableCell>
                </TableRow>
              )}

              {invoice?.discount > 0 && (
                <TableRow>
                  <TableCell>Discount</TableCell>
                  <TableCell align="right" sx={{ color: "error.main" }}>
                    -{formatCurrency(invoice?.discount || 0)}
                  </TableCell>
                </TableRow>
              )}

              <TableRow>
                <TableCell colSpan={2}>
                  <Divider sx={{ my: 1 }} />
                </TableCell>
              </TableRow>

              <TableRow>
                <TableCell>
                  <strong>Total</strong>
                </TableCell>
                <TableCell align="right">
                  <strong>{formatCurrency(invoice?.total || 0)}</strong>
                </TableCell>
              </TableRow>

              {paidAmount > 0 && (
                <>
                  <TableRow>
                    <TableCell sx={{ color: "success.main" }}>
                      Amount Paid
                    </TableCell>
                    <TableCell align="right" sx={{ color: "success.main" }}>
                      -{formatCurrency(paidAmount)}
                    </TableCell>
                  </TableRow>

                  <TableRow>
                    <TableCell colSpan={2}>
                      <Divider sx={{ my: 1 }} />
                    </TableCell>
                  </TableRow>

                  <TableRow>
                    <TableCell>
                      <Typography variant="h6" color="primary">
                        Balance Due
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="h6" color="primary">
                        {formatCurrency(balanceDue)}
                      </Typography>
                    </TableCell>
                  </TableRow>
                </>
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {invoice?.notes && (
          <Box sx={{ mt: 3 }}>
            <Typography variant="subtitle2" gutterBottom>
              Notes:
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {invoice.notes}
            </Typography>
          </Box>
        )}
      </Paper>

      <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 3 }}>
        <Button variant="contained" onClick={() => onContinue(invoice)}>
          Continue to Return Items
        </Button>
      </Box>
    </Box>
  );
};

export default FinalInvoiceReview;
