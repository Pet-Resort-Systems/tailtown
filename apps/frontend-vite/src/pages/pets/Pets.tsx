import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Container,
  Typography,
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  TextField,
  InputAdornment,
  Alert,
  Skeleton,
  Snackbar,
  TablePagination,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";
import { Search as SearchIcon } from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { Pet, petService } from "../../services/petService";
import PetNameWithIcons from "../../components/pets/PetNameWithIcons";
import SimpleVaccinationBadge from "../../components/pets/SimpleVaccinationBadge";
import { PlaygroupBadge } from "../../components/compatibility";
import { debounce } from "lodash";

const DEFAULT_PAGE_SIZE = 50;

const Pets = () => {
  const navigate = useNavigate();
  const [pets, setPets] = useState<Pet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success" as "success" | "error",
  });
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [initialLoad, setInitialLoad] = useState(true);

  const loadPets = useCallback(
    async (pageNum: number, search: string, size?: number) => {
      try {
        setLoading(true);
        const response = await petService.getAllPets(
          pageNum + 1,
          size || pageSize,
          search
        );
        setPets(response.data);
        setTotalCount(response.results);
        setError(null);
      } catch (err) {
        console.error("Error loading pets:", err);
        setError("Failed to load pets");
        setPets([]);
      } finally {
        setLoading(false);
        if (initialLoad) setInitialLoad(false);
      }
    },
    [initialLoad, pageSize]
  );

  const debouncedSearch = useMemo(
    () =>
      debounce((value: string) => {
        setPage(0);
        loadPets(0, value);
      }, 500),
    [loadPets]
  );

  useEffect(() => {
    loadPets(page, searchTerm);
  }, [page, searchTerm, pageSize, loadPets]);

  useEffect(() => {
    if (!initialLoad) {
      debouncedSearch(searchTerm);
    }
    return () => debouncedSearch.cancel();
  }, [searchTerm, initialLoad, debouncedSearch]);

  const handleRowClick = (id: string) => {
    navigate(`/pets/${id}`);
  };

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setPage(0);
    loadPets(0, searchTerm, newSize);
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation(); // Prevent row click
    if (
      window.confirm(
        "Are you sure you want to permanently delete this pet? This action cannot be undone."
      )
    ) {
      try {
        await petService.deletePet(id);

        // Refresh the pet list after deletion
        const response = await petService.getAllPets(
          page + 1,
          pageSize,
          searchTerm
        );
        setPets(response.data);
        setTotalCount(response.results);

        setSnackbar({
          open: true,
          message: "Pet permanently deleted",
          severity: "success",
        });
      } catch (err) {
        console.error("Error deleting pet:", err);
        setSnackbar({
          open: true,
          message: "Error deleting pet. Please try again.",
          severity: "error",
        });

        // Refresh list to ensure UI is in sync with backend
        const response = await petService.getAllPets(
          page + 1,
          pageSize,
          searchTerm
        );
        if (!response?.data || !Array.isArray(response.data)) {
          throw new Error("Invalid response format");
        }
        setPets(response.data);
        setTotalCount(response.results);
      }
    }
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ mt: 4, mb: 4 }}>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 3,
          }}
        >
          <Typography variant="h4" gutterBottom>
            Pets
          </Typography>
          <Button
            variant="contained"
            color="primary"
            onClick={() => navigate("/pets/new")}
          >
            Add New Pet
          </Button>
        </Box>

        <Box sx={{ display: "flex", gap: 2, mb: 3, alignItems: "center" }}>
          <TextField
            fullWidth
            placeholder="Search pets by name or breed..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Show</InputLabel>
            <Select
              value={pageSize}
              label="Show"
              onChange={(e) => handlePageSizeChange(Number(e.target.value))}
            >
              <MenuItem value={25}>25</MenuItem>
              <MenuItem value={50}>50</MenuItem>
              <MenuItem value={100}>100</MenuItem>
              <MenuItem value={200}>200</MenuItem>
            </Select>
          </FormControl>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {loading && initialLoad ? (
          <Box sx={{ mb: 2 }}>
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} height={53} sx={{ mb: 1 }} />
            ))}
          </Box>
        ) : (
          <TableContainer component={Paper}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ py: 1 }}>Name</TableCell>
                  <TableCell sx={{ py: 1 }}>Type</TableCell>
                  <TableCell sx={{ py: 1 }}>Breed</TableCell>
                  <TableCell sx={{ py: 1 }}>Gender</TableCell>
                  <TableCell sx={{ py: 1 }}>Weight</TableCell>
                  <TableCell sx={{ py: 1 }}>Playgroup</TableCell>
                  <TableCell sx={{ py: 1 }}>Special Requirements</TableCell>
                  <TableCell sx={{ py: 1 }}>Vaccination</TableCell>
                  <TableCell sx={{ py: 1 }} align="right">
                    Actions
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {pets.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} align="center">
                      No pets registered
                    </TableCell>
                  </TableRow>
                ) : (
                  pets.map((pet) => (
                    <TableRow
                      key={pet.id}
                      sx={{
                        "&:hover": { backgroundColor: "rgba(0, 0, 0, 0.04)" },
                      }}
                    >
                      <TableCell
                        onClick={() => handleRowClick(pet.id)}
                        sx={{ cursor: "pointer", py: 0.5 }}
                      >
                        <PetNameWithIcons
                          petName={`${pet.name}${
                            pet.owner ? ` (${pet.owner.lastName})` : ""
                          }`}
                          petIcons={pet.petIcons}
                          iconNotes={pet.iconNotes}
                          petType={pet.type}
                          profilePhoto={pet.profilePhoto}
                          size="small"
                          nameVariant="body2"
                          showPhoto={true}
                        />
                      </TableCell>
                      <TableCell
                        onClick={() => handleRowClick(pet.id)}
                        sx={{ cursor: "pointer", py: 0.5 }}
                      >
                        {pet.type}
                      </TableCell>
                      <TableCell
                        onClick={() => handleRowClick(pet.id)}
                        sx={{ cursor: "pointer", py: 0.5 }}
                      >
                        {pet.breed || "N/A"}
                      </TableCell>
                      <TableCell
                        onClick={() => handleRowClick(pet.id)}
                        sx={{ cursor: "pointer", py: 0.5 }}
                      >
                        {pet.gender || "N/A"}
                      </TableCell>
                      <TableCell
                        onClick={() => handleRowClick(pet.id)}
                        sx={{ cursor: "pointer", py: 0.5 }}
                      >
                        {pet.weight ? `${pet.weight} lbs` : "N/A"}
                      </TableCell>
                      <TableCell
                        onClick={() => handleRowClick(pet.id)}
                        sx={{ cursor: "pointer", py: 0.5 }}
                      >
                        <PlaygroupBadge
                          compatibility={pet.playgroupCompatibility || null}
                        />
                      </TableCell>
                      <TableCell
                        onClick={() => handleRowClick(pet.id)}
                        sx={{ cursor: "pointer", py: 0.5 }}
                      >
                        {/* Icons removed */}
                      </TableCell>
                      <TableCell
                        onClick={() => handleRowClick(pet.id)}
                        sx={{ cursor: "pointer", py: 0.5 }}
                      >
                        <SimpleVaccinationBadge pet={pet} showDetails={true} />
                      </TableCell>
                      <TableCell align="right" sx={{ py: 0.5 }}>
                        <Box
                          sx={{
                            display: "flex",
                            gap: 0.5,
                            justifyContent: "flex-end",
                          }}
                        >
                          <Button
                            variant="outlined"
                            size="small"
                            onClick={() => navigate(`/pets/${pet.id}`)}
                            sx={{ minWidth: "auto", px: 1 }}
                          >
                            Edit
                          </Button>
                          <Button
                            variant="outlined"
                            color="error"
                            size="small"
                            onClick={(e) => handleDelete(e, pet.id)}
                            sx={{ minWidth: "auto", px: 1 }}
                          >
                            Delete
                          </Button>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {!loading && !error && (
          <TablePagination
            component="div"
            count={totalCount}
            page={page}
            onPageChange={(_, newPage) => setPage(newPage)}
            rowsPerPage={pageSize}
            rowsPerPageOptions={[25, 50, 100, 200]}
            onRowsPerPageChange={(e) => {
              const newSize = parseInt(e.target.value, 10);
              handlePageSizeChange(newSize);
            }}
          />
        )}
      </Box>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
      >
        <Alert
          onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
          severity={snackbar.severity}
          sx={{ width: "100%" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default Pets;
