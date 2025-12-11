import React, { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Paper,
  Divider,
  IconButton,
  Tooltip,
  CircularProgress,
} from "@mui/material";
import PrintIcon from "@mui/icons-material/Print";
import UsbIcon from "@mui/icons-material/Usb";
import DownloadIcon from "@mui/icons-material/Download";
import PreviewIcon from "@mui/icons-material/Preview";
import CloseIcon from "@mui/icons-material/Close";
import {
  KennelLabelData,
  printKennelLabel,
  getZPLPreview,
} from "../../services/labelPrintService";

interface KennelLabelPrintProps {
  open: boolean;
  onClose: () => void;
  initialData?: Partial<KennelLabelData>;
}

const BOARDING_TYPES = [
  "Standard Suite",
  "Standard Plus Suite",
  "VIP Suite",
  "Daycare",
  "Grooming",
  "Training",
];

const KennelLabelPrint: React.FC<KennelLabelPrintProps> = ({
  open,
  onClose,
  initialData,
}) => {
  const [dogName, setDogName] = useState(initialData?.dogName || "");
  const [kennelNumber, setKennelNumber] = useState(
    initialData?.kennelNumber || ""
  );
  const [boardingType, setBoardingType] = useState(
    initialData?.boardingType || "Standard Suite"
  );
  const [showPreview, setShowPreview] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const labelData: KennelLabelData = {
    dogName,
    kennelNumber,
    boardingType,
  };

  const handlePrint = async (method: "usb" | "download" | "raw") => {
    if (!dogName || !kennelNumber) {
      setError("Please fill in dog name and kennel number");
      return;
    }

    setPrinting(true);
    setError(null);
    setSuccess(null);

    try {
      await printKennelLabel(labelData, method);
      setSuccess(
        method === "download"
          ? "ZPL file downloaded! Send it to your Zebra printer."
          : "Label sent to printer!"
      );
    } catch (err: any) {
      setError(err.message || "Failed to print label");
    } finally {
      setPrinting(false);
    }
  };

  const zplPreview = getZPLPreview(labelData);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <PrintIcon />
            <Typography variant="h6">Print Kennel Label</Typography>
          </Box>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}
        {success && (
          <Alert
            severity="success"
            sx={{ mb: 2 }}
            onClose={() => setSuccess(null)}
          >
            {success}
          </Alert>
        )}

        <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 1 }}>
          <TextField
            label="Dog Name"
            value={dogName}
            onChange={(e) => setDogName(e.target.value)}
            fullWidth
            required
            placeholder="e.g., Max"
          />

          <TextField
            label="Kennel Number"
            value={kennelNumber}
            onChange={(e) => setKennelNumber(e.target.value)}
            fullWidth
            required
            placeholder="e.g., A-12"
          />

          <FormControl fullWidth>
            <InputLabel>Boarding Type</InputLabel>
            <Select
              value={boardingType}
              label="Boarding Type"
              onChange={(e) => setBoardingType(e.target.value)}
            >
              {BOARDING_TYPES.map((type) => (
                <MenuItem key={type} value={type}>
                  {type}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Label Preview */}
          <Paper
            elevation={2}
            sx={{
              p: 2,
              bgcolor: "grey.100",
              border: "2px dashed",
              borderColor: "grey.400",
            }}
          >
            <Typography variant="caption" color="text.secondary" gutterBottom>
              Label Preview (1" x 6")
            </Typography>
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                py: 2,
                minHeight: 120,
                bgcolor: "white",
                borderRadius: 1,
                mt: 1,
              }}
            >
              <Typography variant="h5" fontWeight="bold">
                {dogName || "Dog Name"}
              </Typography>
              <Typography
                variant="h3"
                fontWeight="bold"
                color="primary"
                sx={{ my: 1 }}
              >
                #{kennelNumber || "---"}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {boardingType}
              </Typography>
            </Box>
          </Paper>

          {/* ZPL Code Preview */}
          {showPreview && (
            <>
              <Divider />
              <Box>
                <Typography variant="caption" color="text.secondary">
                  ZPL Code (for debugging)
                </Typography>
                <Paper
                  sx={{
                    p: 1,
                    mt: 1,
                    bgcolor: "grey.900",
                    color: "grey.100",
                    fontFamily: "monospace",
                    fontSize: "0.75rem",
                    overflow: "auto",
                    maxHeight: 150,
                  }}
                >
                  <pre style={{ margin: 0, whiteSpace: "pre-wrap" }}>
                    {zplPreview}
                  </pre>
                </Paper>
              </Box>
            </>
          )}
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2, justifyContent: "space-between" }}>
        <Tooltip title="Show ZPL Code">
          <IconButton onClick={() => setShowPreview(!showPreview)} size="small">
            <PreviewIcon />
          </IconButton>
        </Tooltip>

        <Box sx={{ display: "flex", gap: 1 }}>
          <Button onClick={onClose} disabled={printing}>
            Cancel
          </Button>

          <Tooltip title="Download ZPL file">
            <Button
              variant="outlined"
              startIcon={<DownloadIcon />}
              onClick={() => handlePrint("download")}
              disabled={printing || !dogName || !kennelNumber}
            >
              Download
            </Button>
          </Tooltip>

          <Tooltip title="Print via USB (Chrome/Edge only)">
            <Button
              variant="contained"
              startIcon={
                printing ? <CircularProgress size={20} /> : <UsbIcon />
              }
              onClick={() => handlePrint("usb")}
              disabled={printing || !dogName || !kennelNumber}
            >
              {printing ? "Printing..." : "Print USB"}
            </Button>
          </Tooltip>
        </Box>
      </DialogActions>
    </Dialog>
  );
};

export default KennelLabelPrint;
