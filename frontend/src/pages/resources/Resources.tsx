import React, { useState, useEffect, useCallback, useMemo } from "react";
import debounce from "lodash/debounce";
import { useNavigate } from "react-router-dom";
import {
  Container,
  Box,
  Typography,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Snackbar,
  Alert,
  TextField,
  MenuItem,
  Grid,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import * as resourceManagement from "../../services/resourceManagement";
import {
  Resource,
  getResourceTypeName,
  getResourceTypeCategory,
} from "../../types/resource";

const Resources: React.FC = () => {
  const navigate = useNavigate();
  const [resources, setResources] = useState<Resource[]>([]);
  const [, setLoading] = useState(true);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success" as "success" | "error",
  });
  const [filterType, setFilterType] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");

  const debouncedFilter = useMemo(
    () =>
      debounce((term: string, type: string) => {
        try {
          // First check if we have any resources
          if (resources.length === 0) {
            setFilteredResources([]);
            return;
          }

          const filtered = resources.filter((resource) => {
            // Safely get the category
            let category;
            try {
              category = getResourceTypeCategory(resource.type);
            } catch (err) {
              console.warn(
                `Error getting category for resource type ${resource.type}:`,
                err
              );
              category = "other"; // Default to other if we can't determine the category
            }

            const matchesType = type === "all" || category === type;
            const matchesSearch =
              resource.name?.toLowerCase().includes(term.toLowerCase()) ||
              (resource.description?.toLowerCase() || "").includes(
                term.toLowerCase()
              ) ||
              (resource.location?.toLowerCase() || "").includes(
                term.toLowerCase()
              );

            return matchesType && matchesSearch;
          });

          setFilteredResources(filtered);
        } catch (error) {
          console.error("Error filtering resources:", error);
          setFilteredResources([]);
        }
      }, 300),
    [resources]
  );

  useEffect(() => {
    debouncedFilter(searchTerm, filterType);
    return () => {
      debouncedFilter.cancel();
    };
  }, [searchTerm, filterType, debouncedFilter, resources.length]);

  const loadResources = useCallback(async () => {
    try {
      const response = await resourceManagement.getAllResources();

      // Direct response from the service should already be the data array
      if (Array.isArray(response)) {
        setResources(response);
      } else {
        console.error("Invalid resources response format:", response);
        setResources([]);
      }
      setLoading(false);
    } catch (err: any) {
      console.error("Error loading resources:", err);
      if (err.response) {
        console.error("Response error:", err.response.data);
      }
      setSnackbar({
        open: true,
        message: "Failed to load resources",
        severity: "error",
      });
      setResources([]);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadResources();
  }, [loadResources]);

  const handleDelete = useCallback(
    async (id: string) => {
      if (window.confirm("Are you sure you want to delete this resource?")) {
        try {
          await resourceManagement.deleteResource(id);
          setSnackbar({
            open: true,
            message: "Resource deleted successfully",
            severity: "success",
          });
          loadResources();
        } catch (err) {
          setSnackbar({
            open: true,
            message: "Failed to delete resource",
            severity: "error",
          });
        }
      }
    },
    [loadResources, setSnackbar]
  );

  const handleSnackbarClose = useCallback(() => {
    setSnackbar((prev) => ({ ...prev, open: false }));
  }, []);

  const [filteredResources, setFilteredResources] = useState<Resource[]>([]);

  useEffect(() => {
    setFilteredResources(resources);
  }, [resources]);

  const resourceCategories = [
    "all",
    "housing",
    "play areas",
    "grooming",
    "training",
    "staff",
    "other",
  ];

  return (
    <Container>
      <Box sx={{ mt: 4, mb: 4 }}>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 3,
          }}
        >
          <Typography variant="h4">Resources</Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => {
              navigate("/resources/new");
            }}
          >
            Add Resource
          </Button>
        </Box>

        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Search resources"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              size="small"
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              select
              label="Filter by type"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              size="small"
            >
              {resourceCategories.map((category) => (
                <MenuItem key={category} value={category}>
                  {category === "all"
                    ? "All Types"
                    : category.charAt(0).toUpperCase() + category.slice(1)}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
        </Grid>

        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Location</TableCell>
                <TableCell>Max Pets</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredResources.map((resource) => (
                <TableRow key={resource.id}>
                  <TableCell>{resource.name}</TableCell>
                  <TableCell>
                    <Chip
                      label={(() => {
                        try {
                          return getResourceTypeName(resource.type);
                        } catch (err) {
                          console.warn(
                            `Error getting type name for ${resource.type}:`,
                            err
                          );
                          return String(resource.type).replace(/_/g, " ");
                        }
                      })()}
                      color={resource.isActive ? "primary" : "default"}
                      variant="outlined"
                      size="small"
                    />
                  </TableCell>
                  <TableCell>{resource.location || "-"}</TableCell>
                  <TableCell>{resource.maxPets || "-"}</TableCell>
                  <TableCell>
                    <Chip
                      label={resource.isActive ? "Active" : "Inactive"}
                      color={resource.isActive ? "success" : "error"}
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="right">
                    <IconButton
                      size="small"
                      onClick={() => navigate(`/resources/${resource.id}`)}
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => handleDelete(resource.id)}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleSnackbarClose}
      >
        <Alert
          onClose={handleSnackbarClose}
          severity={snackbar.severity}
          sx={{ width: "100%" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default Resources;
