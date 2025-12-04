import React, { useState, useEffect } from "react";
import { getApiBaseUrl } from "../services/api";
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  LinearProgress,
  Alert,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import {
  CloudUpload as UploadIcon,
  Delete as DeleteIcon,
  Download as DownloadIcon,
  Description as FileIcon,
  Image as ImageIcon,
} from "@mui/icons-material";
import axios from "axios";

interface VaccineFile {
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  uploadedAt: string;
  uploadedBy?: string;
  url: string;
}

interface VaccineRecordUploadProps {
  petId: string;
  petName: string;
}

const VaccineRecordUpload: React.FC<VaccineRecordUploadProps> = ({
  petId,
  petName,
}) => {
  const [files, setFiles] = useState<VaccineFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const API_BASE_URL = getApiBaseUrl();

  // Fetch existing vaccine records
  const fetchVaccineRecords = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get(
        `${API_BASE_URL}/api/pets/${petId}/vaccine-records`
      );
      if (response.data.success) {
        setFiles(response.data.data.files || []);
      }
    } catch (err: any) {
      console.error("Error fetching vaccine records:", err);
      setError(err.response?.data?.message || "Failed to load vaccine records");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVaccineRecords();
  }, [petId]);

  // Handle file selection
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      const allowedTypes = [
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/gif",
        "image/webp",
        "image/heic",
        "image/heif",
        "application/pdf",
      ];
      if (!allowedTypes.includes(file.type)) {
        setError(
          "Invalid file type. Please upload an image (JPEG, PNG, GIF, WebP, HEIC) or PDF file."
        );
        return;
      }

      // Validate file size (10MB max)
      if (file.size > 10 * 1024 * 1024) {
        setError("File size exceeds 10MB limit.");
        return;
      }

      setSelectedFile(file);
      setError(null);
    }
  };

  // Upload file
  const handleUpload = async () => {
    if (!selectedFile) return;

    setUploading(true);
    setError(null);
    setSuccess(null);

    const formData = new FormData();
    formData.append("file", selectedFile);

    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/pets/${petId}/vaccine-records/upload`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      if (response.data.success) {
        setSuccess("Vaccine record uploaded successfully!");
        setSelectedFile(null);
        // Reset file input
        const fileInput = document.getElementById(
          "vaccine-file-input"
        ) as HTMLInputElement;
        if (fileInput) fileInput.value = "";
        // Refresh the list
        await fetchVaccineRecords();
      }
    } catch (err: any) {
      console.error("Error uploading file:", err);
      setError(err.response?.data?.message || "Failed to upload file");
    } finally {
      setUploading(false);
    }
  };

  // Delete file
  const handleDelete = async (filename: string) => {
    if (
      !window.confirm("Are you sure you want to delete this vaccine record?")
    ) {
      return;
    }

    try {
      const response = await axios.delete(
        `${API_BASE_URL}/api/pets/${petId}/vaccine-records/${filename}`
      );
      if (response.data.success) {
        setSuccess("Vaccine record deleted successfully!");
        await fetchVaccineRecords();
      }
    } catch (err: any) {
      console.error("Error deleting file:", err);
      setError(err.response?.data?.message || "Failed to delete file");
    }
  };

  // Download file
  const handleDownload = (filename: string, originalName: string) => {
    const downloadUrl = `${API_BASE_URL}/api/pets/${petId}/vaccine-records/${filename}/download`;
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = originalName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Preview/View file
  const handlePreview = (file: VaccineFile) => {
    // For PDFs, open in new tab
    if (file.mimeType === "application/pdf") {
      window.open(file.url, "_blank");
    } else {
      // For images, show in preview dialog
      setPreviewUrl(file.url);
      setPreviewOpen(true);
    }
  };

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  // Format date
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + " " + date.toLocaleTimeString();
  };

  // Get file icon
  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith("image/")) {
      return <ImageIcon color="primary" />;
    }
    return <FileIcon color="secondary" />;
  };

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Vaccine Records for {petName}
        </Typography>

        {error && (
          <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert
            severity="success"
            onClose={() => setSuccess(null)}
            sx={{ mb: 2 }}
          >
            {success}
          </Alert>
        )}

        {/* Upload Section */}
        <Box sx={{ mb: 3 }}>
          <input
            accept=".jpg,.jpeg,.png,.gif,.webp,.heic,.heif,.pdf"
            style={{ display: "none" }}
            id="vaccine-file-input"
            type="file"
            onChange={handleFileSelect}
          />
          <label htmlFor="vaccine-file-input">
            <Button
              variant="outlined"
              component="span"
              startIcon={<UploadIcon />}
              disabled={uploading}
            >
              Select File
            </Button>
          </label>

          {selectedFile && (
            <Box sx={{ mt: 2, display: "flex", alignItems: "center", gap: 2 }}>
              <Typography variant="body2">
                Selected: {selectedFile.name} (
                {formatFileSize(selectedFile.size)})
              </Typography>
              <Button
                variant="contained"
                color="primary"
                onClick={handleUpload}
                disabled={uploading}
                startIcon={<UploadIcon />}
              >
                {uploading ? "Uploading..." : "Upload"}
              </Button>
            </Box>
          )}

          {uploading && <LinearProgress sx={{ mt: 2 }} />}
        </Box>

        {/* Files List */}
        <Typography variant="subtitle1" gutterBottom>
          Uploaded Records ({files.length})
        </Typography>

        {loading ? (
          <LinearProgress />
        ) : files.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No vaccine records uploaded yet.
          </Typography>
        ) : (
          <List>
            {files.map((file) => (
              <ListItem key={file.filename} divider>
                <Box sx={{ mr: 2 }}>{getFileIcon(file.mimeType)}</Box>
                <ListItemText
                  primary={file.originalName}
                  secondary={
                    <>
                      {formatFileSize(file.size)} • Uploaded{" "}
                      {formatDate(file.uploadedAt)}
                      <Chip
                        label={
                          file.mimeType === "application/pdf"
                            ? "View PDF"
                            : "Preview"
                        }
                        size="small"
                        onClick={() => handlePreview(file)}
                        sx={{ ml: 1, cursor: "pointer" }}
                        color="primary"
                        variant="outlined"
                      />
                    </>
                  }
                />
                <ListItemSecondaryAction>
                  <IconButton
                    edge="end"
                    aria-label="download"
                    onClick={() =>
                      handleDownload(file.filename, file.originalName)
                    }
                    sx={{ mr: 1 }}
                  >
                    <DownloadIcon />
                  </IconButton>
                  <IconButton
                    edge="end"
                    aria-label="delete"
                    onClick={() => handleDelete(file.filename)}
                    color="error"
                  >
                    <DeleteIcon />
                  </IconButton>
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>
        )}

        {/* Preview Dialog for Images */}
        <Dialog
          open={previewOpen}
          onClose={() => setPreviewOpen(false)}
          maxWidth="lg"
          fullWidth
        >
          <DialogTitle>Vaccine Record Preview</DialogTitle>
          <DialogContent>
            {previewUrl && (
              <Box sx={{ textAlign: "center", p: 2 }}>
                <img
                  src={previewUrl}
                  alt="Vaccine record"
                  style={{
                    maxWidth: "100%",
                    maxHeight: "80vh",
                    objectFit: "contain",
                  }}
                />
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setPreviewOpen(false)} variant="contained">
              Close
            </Button>
          </DialogActions>
        </Dialog>
      </CardContent>
    </Card>
  );
};

export default VaccineRecordUpload;
