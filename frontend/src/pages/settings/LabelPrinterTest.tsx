import React, { useState } from "react";
import {
  Container,
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Alert,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
} from "@mui/material";
import PrintIcon from "@mui/icons-material/Print";
import UsbIcon from "@mui/icons-material/Usb";
import DownloadIcon from "@mui/icons-material/Download";
import SettingsIcon from "@mui/icons-material/Settings";
import {
  KennelLabelData,
  printKennelLabel,
  getZPLPreview,
} from "../../services/labelPrintService";

const BOARDING_TYPES = [
  "Standard Suite",
  "Standard Plus Suite",
  "VIP Suite",
  "Daycare",
  "Grooming",
  "Training",
];

const LabelPrinterTest: React.FC = () => {
  const [dogName, setDogName] = useState("Max");
  const [kennelNumber, setKennelNumber] = useState("A-12");
  const [boardingType, setBoardingType] = useState("Standard Suite");
  const [printing, setPrinting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showZPL, setShowZPL] = useState(false);

  const labelData: KennelLabelData = {
    dogName,
    kennelNumber,
    boardingType,
  };

  const handlePrint = async (method: "usb" | "download") => {
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

  const zplCode = getZPLPreview(labelData);

  return (
    <Container maxWidth="md">
      <Box sx={{ py: 4 }}>
        <Paper sx={{ p: 3, mb: 3 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 3 }}>
            <SettingsIcon color="primary" />
            <Typography variant="h5">Zebra Label Printer Test</Typography>
          </Box>

          <Alert severity="info" sx={{ mb: 3 }}>
            <Typography variant="body2">
              <strong>Printer:</strong> Zebra GK420d
              <br />
              <strong>Label Size:</strong> 1" wide × 6" tall
              <br />
              <strong>Connection:</strong> USB (Web Serial API - Chrome/Edge
              only)
            </Typography>
          </Alert>

          {error && (
            <Alert
              severity="error"
              sx={{ mb: 2 }}
              onClose={() => setError(null)}
            >
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

          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Typography variant="h6" gutterBottom>
                Label Content
              </Typography>

              <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <TextField
                  label="Dog Name"
                  value={dogName}
                  onChange={(e) => setDogName(e.target.value)}
                  fullWidth
                  placeholder="e.g., Max, Bella, Charlie"
                />

                <TextField
                  label="Kennel Number"
                  value={kennelNumber}
                  onChange={(e) => setKennelNumber(e.target.value)}
                  fullWidth
                  placeholder="e.g., A-12, B-5, VIP-1"
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
              </Box>
            </Grid>

            <Grid item xs={12} md={6}>
              <Typography variant="h6" gutterBottom>
                Label Preview
              </Typography>

              <Paper
                elevation={3}
                sx={{
                  p: 2,
                  bgcolor: "white",
                  border: "2px solid",
                  borderColor: "grey.400",
                  minHeight: 200,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Typography variant="h5" fontWeight="bold" sx={{ mb: 1 }}>
                  {dogName || "Dog Name"}
                </Typography>
                <Typography
                  variant="h3"
                  fontWeight="bold"
                  color="primary"
                  sx={{ my: 2 }}
                >
                  #{kennelNumber || "---"}
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  {boardingType}
                </Typography>
              </Paper>

              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ mt: 1, display: "block" }}
              >
                Actual label prints vertically on 1" × 6" label
              </Typography>
            </Grid>
          </Grid>

          <Divider sx={{ my: 3 }} />

          <Box
            sx={{
              display: "flex",
              gap: 2,
              justifyContent: "center",
              flexWrap: "wrap",
            }}
          >
            <Button
              variant="contained"
              size="large"
              startIcon={<UsbIcon />}
              onClick={() => handlePrint("usb")}
              disabled={printing || !dogName || !kennelNumber}
            >
              {printing ? "Printing..." : "Print via USB"}
            </Button>

            <Button
              variant="outlined"
              size="large"
              startIcon={<DownloadIcon />}
              onClick={() => handlePrint("download")}
              disabled={printing || !dogName || !kennelNumber}
            >
              Download ZPL File
            </Button>

            <Button variant="text" onClick={() => setShowZPL(!showZPL)}>
              {showZPL ? "Hide" : "Show"} ZPL Code
            </Button>
          </Box>

          {showZPL && (
            <Box sx={{ mt: 3 }}>
              <Typography variant="subtitle2" gutterBottom>
                ZPL Code (for debugging):
              </Typography>
              <Paper
                sx={{
                  p: 2,
                  bgcolor: "grey.900",
                  color: "grey.100",
                  fontFamily: "monospace",
                  fontSize: "0.8rem",
                  overflow: "auto",
                  maxHeight: 300,
                }}
              >
                <pre style={{ margin: 0, whiteSpace: "pre-wrap" }}>
                  {zplCode}
                </pre>
              </Paper>
            </Box>
          )}
        </Paper>

        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            <PrintIcon sx={{ mr: 1, verticalAlign: "middle" }} />
            Troubleshooting
          </Typography>

          <Typography variant="body2" paragraph>
            <strong>USB Print not working?</strong>
          </Typography>
          <ul style={{ margin: 0, paddingLeft: 20 }}>
            <li>Make sure you're using Chrome or Edge browser</li>
            <li>The printer must be connected via USB and powered on</li>
            <li>When prompted, select the Zebra printer from the port list</li>
            <li>
              If the printer doesn't appear, try unplugging and reconnecting it
            </li>
          </ul>

          <Typography variant="body2" paragraph sx={{ mt: 2 }}>
            <strong>Using the downloaded ZPL file (Recommended):</strong>
          </Typography>
          <Paper
            sx={{
              p: 2,
              bgcolor: "grey.100",
              fontFamily: "monospace",
              fontSize: "0.8rem",
            }}
          >
            <strong># Option 1: Use lp command (easiest)</strong>
            <br />
            lpstat -p # List available printers
            <br />
            lp -d Zebra_GK420d ~/Downloads/kennel-label-*.zpl
            <br />
            <br />
            <strong># Option 2: Direct USB device</strong>
            <br />
            ls /dev/cu.usb* # Find your printer
            <br />
            cat ~/Downloads/kennel-label-*.zpl {">"} /dev/cu.usbmodemXXXX
            <br />
            <br />
            <strong># Option 3: Use Zebra Browser Print (if installed)</strong>
            <br /># Download from zebra.com/browserprint
          </Paper>

          <Alert severity="warning" sx={{ mt: 2 }}>
            <Typography variant="body2">
              <strong>Note:</strong> The "Print via USB" button uses Web Serial
              API which works with serial ports, not USB printers. For
              USB-connected Zebra printers, download the ZPL file and use the lp
              command above.
            </Typography>
          </Alert>
        </Paper>
      </Box>
    </Container>
  );
};

export default LabelPrinterTest;
