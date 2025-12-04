import React, { useState, useEffect, useCallback } from "react";
import {
  Box,
  Typography,
  Paper,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControlLabel,
  Switch,
  Alert,
  CircularProgress,
  Tooltip,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Select,
  InputLabel,
  FormControl,
  Divider,
} from "@mui/material";
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  History as HistoryIcon,
  MoreVert as MoreVertIcon,
  Star as StarIcon,
  StarBorder as StarBorderIcon,
  Visibility as ViewIcon,
  ContentCopy as CopyIcon,
  ExpandMore as ExpandMoreIcon,
  Info as InfoIcon,
  Create as SignIcon,
} from "@mui/icons-material";
import { format } from "date-fns";
import serviceAgreementService, {
  ServiceAgreementTemplate,
  ServiceAgreementVersion,
  CreateTemplateData,
  UpdateTemplateData,
  CustomQuestion,
  QuestionType,
} from "../../services/serviceAgreementService";
import { tenantService } from "../../services/tenantService";
import { ServiceAgreementSign } from "../../components/agreements";

// Merge field replacement utility
const replaceMergeFields = (
  content: string,
  mergeData: Record<string, string>
): string => {
  let result = content;
  Object.entries(mergeData).forEach(([field, value]) => {
    // Replace [Field Name] format
    const regex = new RegExp(`\\[${field}\\]`, "gi");
    result = result.replace(regex, value);
  });
  return result;
};

const ServiceAgreements: React.FC = () => {
  const [templates, setTemplates] = useState<ServiceAgreementTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [businessName, setBusinessName] = useState<string>("");

  // Dialog states
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [versionDialogOpen, setVersionDialogOpen] = useState(false);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [testSignDialogOpen, setTestSignDialogOpen] = useState(false);

  // Selected items
  const [selectedTemplate, setSelectedTemplate] =
    useState<ServiceAgreementTemplate | null>(null);
  const [versions, setVersions] = useState<ServiceAgreementVersion[]>([]);
  const [versionsLoading, setVersionsLoading] = useState(false);

  // Form state
  const [formData, setFormData] = useState<CreateTemplateData>({
    name: "",
    content: "",
    isDefault: false,
    requiresInitials: true,
    requiresSignature: true,
    questions: [],
  });
  const [changeNotes, setChangeNotes] = useState("");
  const [newQuestion, setNewQuestion] = useState({
    question: "",
    type: "TEXT" as
      | "TEXT"
      | "NUMBER"
      | "YES_NO"
      | "MULTIPLE_CHOICE"
      | "CURRENCY"
      | "LONG_TEXT",
    required: true,
    placeholder: "",
  });

  // Menu state
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [menuTemplate, setMenuTemplate] =
    useState<ServiceAgreementTemplate | null>(null);

  const loadTemplates = useCallback(async () => {
    try {
      setLoading(true);
      const data = await serviceAgreementService.getAllTemplates();
      setTemplates(data || []);
      setError(null);
    } catch (err: any) {
      setError(err.message || "Failed to load templates");
      setTemplates([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTemplates();
    // Load business name for merge fields
    const loadBusinessName = async () => {
      try {
        const tenant = await tenantService.getCurrentTenant();
        if (tenant?.businessName) {
          setBusinessName(tenant.businessName);
        }
      } catch (err) {
        console.warn("Could not load business name for merge fields");
      }
    };
    loadBusinessName();
  }, [loadTemplates]);

  // Get content with merge fields replaced (preview mode - uses sample data)
  const getPreviewContent = (content: string): string => {
    const today = new Date().toLocaleDateString();
    return replaceMergeFields(content, {
      "Business Name": businessName || "DEVELOPMENT TENANT",
      "Company Name": businessName || "DEVELOPMENT TENANT",
      "Customer Name": "John Smith",
      "Customer First Name": "John",
      "Customer Last Name": "Smith",
      "Customer Email": "john.smith@example.com",
      "Customer Phone": "(555) 123-4567",
      "Pet Name": "Buddy",
      "Pet Names": "Buddy, Max",
      "Today's Date": today,
      "Reservation Date": today,
      "Service Name": "Daycare",
    });
  };

  const handleOpenMenu = (
    event: React.MouseEvent<HTMLElement>,
    template: ServiceAgreementTemplate
  ) => {
    setMenuAnchor(event.currentTarget);
    setMenuTemplate(template);
  };

  const handleCloseMenu = () => {
    setMenuAnchor(null);
    setMenuTemplate(null);
  };

  const handleCreateNew = () => {
    setSelectedTemplate(null);
    setFormData({
      name: "",
      content: getDefaultContent(),
      isDefault: false,
      requiresInitials: true,
      requiresSignature: true,
      questions: [],
    });
    setChangeNotes("");
    setNewQuestion({
      question: "",
      type: "TEXT",
      required: true,
      placeholder: "",
    });
    setEditDialogOpen(true);
  };

  const handleEdit = (template: ServiceAgreementTemplate) => {
    setSelectedTemplate(template);
    setFormData({
      name: template.name,
      content: template.content,
      isDefault: template.isDefault,
      requiresInitials: template.requiresInitials,
      requiresSignature: template.requiresSignature,
      questions: template.questions || [],
      effectiveDate: template.effectiveDate,
      expiresAt: template.expiresAt,
    });
    setChangeNotes("");
    setEditDialogOpen(true);
    handleCloseMenu();
  };

  const handleDelete = (template: ServiceAgreementTemplate) => {
    setSelectedTemplate(template);
    setDeleteDialogOpen(true);
    handleCloseMenu();
  };

  const handleViewVersions = async (template: ServiceAgreementTemplate) => {
    setSelectedTemplate(template);
    setVersionsLoading(true);
    setVersionDialogOpen(true);
    handleCloseMenu();

    try {
      const data = await serviceAgreementService.getTemplateVersions(
        template.id
      );
      setVersions(data);
    } catch (err: any) {
      setError(err.message || "Failed to load versions");
    } finally {
      setVersionsLoading(false);
    }
  };

  const handlePreview = (template: ServiceAgreementTemplate) => {
    setSelectedTemplate(template);
    setPreviewDialogOpen(true);
    handleCloseMenu();
  };

  const handleDuplicate = async (template: ServiceAgreementTemplate) => {
    handleCloseMenu();
    try {
      await serviceAgreementService.createTemplate({
        name: `${template.name} (Copy)`,
        content: template.content,
        isDefault: false,
        requiresInitials: template.requiresInitials,
        requiresSignature: template.requiresSignature,
      });
      setSuccess("Template duplicated successfully");
      loadTemplates();
    } catch (err: any) {
      setError(err.message || "Failed to duplicate template");
    }
  };

  const handleSetDefault = async (template: ServiceAgreementTemplate) => {
    handleCloseMenu();
    try {
      await serviceAgreementService.updateTemplate(template.id, {
        isDefault: true,
      });
      setSuccess("Default template updated");
      loadTemplates();
    } catch (err: any) {
      setError(err.message || "Failed to set default template");
    }
  };

  const handleSave = async () => {
    try {
      if (selectedTemplate) {
        const updateData: UpdateTemplateData = {
          ...formData,
          changeNotes: changeNotes || undefined,
        };
        await serviceAgreementService.updateTemplate(
          selectedTemplate.id,
          updateData
        );
        setSuccess("Template updated successfully");
      } else {
        await serviceAgreementService.createTemplate(formData);
        setSuccess("Template created successfully");
      }
      setEditDialogOpen(false);
      loadTemplates();
    } catch (err: any) {
      setError(err.message || "Failed to save template");
    }
  };

  const handleConfirmDelete = async () => {
    if (!selectedTemplate) return;

    try {
      await serviceAgreementService.deleteTemplate(selectedTemplate.id);
      setSuccess("Template deleted successfully");
      setDeleteDialogOpen(false);
      loadTemplates();
    } catch (err: any) {
      setError(err.message || "Failed to delete template");
    }
  };

  const getDefaultContent = () => {
    return `<h2>Service Agreement</h2>

<p>By signing this agreement, I acknowledge and agree to the following terms and conditions:</p>

<h3>1. Pet Care Services</h3>
<p>I authorize [Business Name] to provide boarding, daycare, grooming, and/or training services for my pet(s) as requested.</p>

<h3>2. Health & Vaccination Requirements</h3>
<p>I certify that my pet(s) are current on all required vaccinations including Rabies, DHPP/FVRCP, and Bordetella. I understand that my pet(s) must be free of parasites and contagious diseases.</p>

<h3>3. Emergency Medical Care</h3>
<p>In the event of a medical emergency, I authorize [Business Name] to seek veterinary care for my pet(s). I agree to be responsible for all veterinary expenses incurred.</p>

<h3>4. Liability Release</h3>
<p>I understand that while every precaution will be taken, there are inherent risks in group play and boarding environments. I release [Business Name] from liability for any injury, illness, or damage that may occur during my pet's stay.</p>

<h3>5. Personal Property</h3>
<p>I understand that [Business Name] is not responsible for lost, damaged, or destroyed personal items left with my pet(s).</p>

<h3>6. Payment Terms</h3>
<p>I agree to pay all fees at the time services are rendered unless other arrangements have been made in advance.</p>

<p><strong>By signing below, I confirm that I have read, understand, and agree to all terms and conditions outlined in this agreement.</strong></p>`;
  };

  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="400px"
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb={3}
      >
        <Typography variant="h5">Service Agreement Templates</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleCreateNew}
        >
          New Template
        </Button>
      </Box>

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

      {/* Merge Fields Reference */}
      <Accordion sx={{ mb: 2 }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Box display="flex" alignItems="center" gap={1}>
            <InfoIcon fontSize="small" color="primary" />
            <Typography variant="subtitle1">Available Merge Fields</Typography>
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Use these placeholders in your templates, emails, and text messages.
            They will be automatically replaced with actual customer and
            business data.
          </Typography>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Business
              </Typography>
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                <Chip label="[Business Name]" size="small" />
              </Box>
            </Box>
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Customer
              </Typography>
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                <Chip label="[Customer Name]" size="small" />
                <Chip label="[Customer First Name]" size="small" />
                <Chip label="[Customer Last Name]" size="small" />
                <Chip label="[Customer Email]" size="small" />
                <Chip label="[Customer Phone]" size="small" />
              </Box>
            </Box>
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Pet
              </Typography>
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                <Chip label="[Pet Name]" size="small" />
                <Chip label="[Pet Names]" size="small" />
              </Box>
            </Box>
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Dates & Services
              </Typography>
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                <Chip label="[Today's Date]" size="small" />
                <Chip label="[Reservation Date]" size="small" />
                <Chip label="[Service Name]" size="small" />
              </Box>
            </Box>
          </Box>
        </AccordionDetails>
      </Accordion>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Version</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Requirements</TableCell>
              <TableCell>Last Updated</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {templates.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  <Typography color="textSecondary" py={4}>
                    No templates found. Create your first service agreement
                    template.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              templates.map((template) => (
                <TableRow key={template.id}>
                  <TableCell>
                    <Box display="flex" alignItems="center" gap={1}>
                      {template.isDefault && (
                        <Tooltip title="Default Template">
                          <StarIcon color="primary" fontSize="small" />
                        </Tooltip>
                      )}
                      <Typography>{template.name}</Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip label={`v${template.version}`} size="small" />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={template.isActive ? "Active" : "Inactive"}
                      color={template.isActive ? "success" : "default"}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Box display="flex" gap={0.5}>
                      {template.requiresInitials && (
                        <Chip
                          label="Initials"
                          size="small"
                          variant="outlined"
                        />
                      )}
                      {template.requiresSignature && (
                        <Chip
                          label="Signature"
                          size="small"
                          variant="outlined"
                        />
                      )}
                    </Box>
                  </TableCell>
                  <TableCell>
                    {format(new Date(template.updatedAt), "MMM d, yyyy")}
                  </TableCell>
                  <TableCell align="right">
                    <Tooltip title="Edit">
                      <IconButton
                        size="small"
                        onClick={() => handleEdit(template)}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Preview">
                      <IconButton
                        size="small"
                        onClick={() => handlePreview(template)}
                      >
                        <ViewIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <IconButton
                      size="small"
                      onClick={(e) => handleOpenMenu(e, template)}
                    >
                      <MoreVertIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Actions Menu */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={handleCloseMenu}
      >
        <MenuItem
          onClick={() => menuTemplate && handleViewVersions(menuTemplate)}
        >
          <ListItemIcon>
            <HistoryIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Version History</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => menuTemplate && handleDuplicate(menuTemplate)}>
          <ListItemIcon>
            <CopyIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Duplicate</ListItemText>
        </MenuItem>
        <MenuItem
          onClick={() => {
            if (menuTemplate) {
              setSelectedTemplate(menuTemplate);
              setTestSignDialogOpen(true);
              handleCloseMenu();
            }
          }}
        >
          <ListItemIcon>
            <SignIcon fontSize="small" color="primary" />
          </ListItemIcon>
          <ListItemText>Test Signing</ListItemText>
        </MenuItem>
        {menuTemplate && !menuTemplate.isDefault && (
          <MenuItem onClick={() => handleSetDefault(menuTemplate)}>
            <ListItemIcon>
              <StarBorderIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Set as Default</ListItemText>
          </MenuItem>
        )}
        <MenuItem onClick={() => menuTemplate && handleDelete(menuTemplate)}>
          <ListItemIcon>
            <DeleteIcon fontSize="small" color="error" />
          </ListItemIcon>
          <ListItemText sx={{ color: "error.main" }}>Delete</ListItemText>
        </MenuItem>
      </Menu>

      {/* Edit/Create Dialog */}
      <Dialog
        open={editDialogOpen}
        onClose={() => setEditDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {selectedTemplate ? "Edit Template" : "Create New Template"}
        </DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={2} mt={1}>
            <TextField
              label="Template Name"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              fullWidth
              placeholder="Optional - leave blank if not needed"
            />

            <TextField
              label="Agreement Content (HTML)"
              value={formData.content}
              onChange={(e) =>
                setFormData({ ...formData, content: e.target.value })
              }
              multiline
              rows={15}
              fullWidth
              required
              helperText="You can use HTML tags for formatting (h2, h3, p, strong, ul, li, etc.) and merge fields like [Business Name]"
            />

            {selectedTemplate && (
              <TextField
                label="Change Notes (optional)"
                value={changeNotes}
                onChange={(e) => setChangeNotes(e.target.value)}
                fullWidth
                placeholder="Describe what changed in this version"
              />
            )}

            {/* Merge Fields Reference */}
            <Paper variant="outlined" sx={{ p: 2, bgcolor: "grey.50" }}>
              <Typography variant="subtitle2" gutterBottom>
                Available Merge Fields
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Use these placeholders in your content - they will be replaced
                with actual values:
              </Typography>
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                <Chip label="[Business Name]" size="small" variant="outlined" />
                <Chip label="[Customer Name]" size="small" variant="outlined" />
                <Chip
                  label="[Customer First Name]"
                  size="small"
                  variant="outlined"
                />
                <Chip
                  label="[Customer Last Name]"
                  size="small"
                  variant="outlined"
                />
                <Chip
                  label="[Customer Email]"
                  size="small"
                  variant="outlined"
                />
                <Chip
                  label="[Customer Phone]"
                  size="small"
                  variant="outlined"
                />
                <Chip label="[Pet Name]" size="small" variant="outlined" />
                <Chip label="[Pet Names]" size="small" variant="outlined" />
                <Chip label="[Today's Date]" size="small" variant="outlined" />
                <Chip
                  label="[Reservation Date]"
                  size="small"
                  variant="outlined"
                />
                <Chip label="[Service Name]" size="small" variant="outlined" />
              </Box>
            </Paper>

            <Box display="flex" gap={2}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.requiresInitials}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        requiresInitials: e.target.checked,
                      })
                    }
                  />
                }
                label="Require Initials"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.requiresSignature}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        requiresSignature: e.target.checked,
                      })
                    }
                  />
                }
                label="Require Signature"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.isDefault}
                    onChange={(e) =>
                      setFormData({ ...formData, isDefault: e.target.checked })
                    }
                  />
                }
                label="Set as Default"
              />
            </Box>

            <Divider sx={{ my: 2 }} />

            {/* Custom Questions Section */}
            <Typography variant="subtitle1" gutterBottom>
              Custom Questions
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Add questions that customers must answer when signing the
              agreement. Responses are stored and can be reviewed at any time.
            </Typography>

            {/* Existing Questions */}
            {formData.questions && formData.questions.length > 0 && (
              <Box sx={{ mb: 2 }}>
                {formData.questions.map((q, index) => (
                  <Paper key={q.id} variant="outlined" sx={{ p: 2, mb: 1 }}>
                    <Box
                      display="flex"
                      justifyContent="space-between"
                      alignItems="flex-start"
                    >
                      <Box flex={1}>
                        <Typography variant="body1" fontWeight="medium">
                          {q.question}
                          {q.required && (
                            <span style={{ color: "red" }}> *</span>
                          )}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Type: {q.type.replace("_", " ")}
                          {q.placeholder &&
                            ` • Placeholder: "${q.placeholder}"`}
                        </Typography>
                      </Box>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => {
                          const updated = [...(formData.questions || [])];
                          updated.splice(index, 1);
                          setFormData({ ...formData, questions: updated });
                        }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </Paper>
                ))}
              </Box>
            )}

            {/* Add New Question Form */}
            <Paper
              variant="outlined"
              sx={{
                p: 2,
                bgcolor: "grey.50",
                border: "1px dashed",
                borderColor: "grey.400",
              }}
            >
              <Typography
                variant="subtitle2"
                gutterBottom
                color="text.secondary"
              >
                Create a New Question
              </Typography>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: "block", mb: 2 }}
              >
                Fill out the fields below and click "Add Question to List" to
                add it.
              </Typography>
              <Box display="flex" flexDirection="column" gap={2}>
                <TextField
                  label="Question"
                  value={newQuestion.question}
                  onChange={(e) =>
                    setNewQuestion({ ...newQuestion, question: e.target.value })
                  }
                  fullWidth
                  placeholder="e.g., If veterinary care is required, what is the max you're willing to spend?"
                  size="small"
                />
                <Box display="flex" gap={2}>
                  <FormControl size="small" sx={{ minWidth: 150 }}>
                    <InputLabel>Type</InputLabel>
                    <Select
                      value={newQuestion.type}
                      label="Type"
                      onChange={(e) =>
                        setNewQuestion({
                          ...newQuestion,
                          type: e.target.value as QuestionType,
                        })
                      }
                    >
                      <MenuItem value="TEXT">Text</MenuItem>
                      <MenuItem value="LONG_TEXT">Long Text</MenuItem>
                      <MenuItem value="NUMBER">Number</MenuItem>
                      <MenuItem value="CURRENCY">Currency ($)</MenuItem>
                      <MenuItem value="YES_NO">Yes/No</MenuItem>
                    </Select>
                  </FormControl>
                  <TextField
                    label="Placeholder (optional)"
                    value={newQuestion.placeholder}
                    onChange={(e) =>
                      setNewQuestion({
                        ...newQuestion,
                        placeholder: e.target.value,
                      })
                    }
                    size="small"
                    sx={{ flex: 1 }}
                    placeholder="e.g., $500"
                  />
                  <FormControlLabel
                    control={
                      <Switch
                        checked={newQuestion.required}
                        onChange={(e) =>
                          setNewQuestion({
                            ...newQuestion,
                            required: e.target.checked,
                          })
                        }
                        size="small"
                      />
                    }
                    label="Required"
                  />
                </Box>
                <Button
                  variant="contained"
                  color="secondary"
                  startIcon={<AddIcon />}
                  onClick={() => {
                    if (!newQuestion.question.trim()) return;
                    const question: CustomQuestion = {
                      id: `q_${Date.now()}`,
                      question: newQuestion.question.trim(),
                      type: newQuestion.type,
                      required: newQuestion.required,
                      placeholder: newQuestion.placeholder || undefined,
                    };
                    const updatedQuestions = [
                      ...(formData.questions || []),
                      question,
                    ];
                    setFormData({
                      ...formData,
                      questions: updatedQuestions,
                    });
                    setNewQuestion({
                      question: "",
                      type: "TEXT",
                      required: true,
                      placeholder: "",
                    });
                  }}
                  disabled={!newQuestion.question.trim()}
                  sx={{ alignSelf: "flex-start" }}
                >
                  Add Question to List
                </Button>
              </Box>
            </Paper>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleSave}
            variant="contained"
            disabled={!formData.content}
          >
            {selectedTemplate ? "Save Changes" : "Create Template"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>Delete Template</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete "{selectedTemplate?.name}"? This
            action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleConfirmDelete}
            color="error"
            variant="contained"
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Version History Dialog */}
      <Dialog
        open={versionDialogOpen}
        onClose={() => setVersionDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Version History - {selectedTemplate?.name}</DialogTitle>
        <DialogContent>
          {versionsLoading ? (
            <Box display="flex" justifyContent="center" py={4}>
              <CircularProgress />
            </Box>
          ) : versions.length === 0 ? (
            <Typography color="textSecondary" py={4} textAlign="center">
              No version history available.
            </Typography>
          ) : (
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Version</TableCell>
                  <TableCell>Change Notes</TableCell>
                  <TableCell>Created</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {versions.map((version) => (
                  <TableRow key={version.id}>
                    <TableCell>
                      <Chip label={`v${version.version}`} size="small" />
                    </TableCell>
                    <TableCell>{version.changeNotes || "-"}</TableCell>
                    <TableCell>
                      {format(
                        new Date(version.createdAt),
                        "MMM d, yyyy h:mm a"
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setVersionDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog
        open={previewDialogOpen}
        onClose={() => setPreviewDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Preview - {selectedTemplate?.name}</DialogTitle>
        <DialogContent>
          <Paper
            variant="outlined"
            sx={{ p: 3, mt: 1, maxHeight: "60vh", overflow: "auto" }}
          >
            <div
              dangerouslySetInnerHTML={{
                __html: getPreviewContent(selectedTemplate?.content || ""),
              }}
            />
          </Paper>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPreviewDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Test Signing Dialog */}
      <Dialog
        open={testSignDialogOpen}
        onClose={() => setTestSignDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Test Signing - {selectedTemplate?.name || "Service Agreement"}
        </DialogTitle>
        <DialogContent>
          {selectedTemplate && (
            <ServiceAgreementSign
              customerId="test-customer-id"
              customerName="Test Customer"
              templateId={selectedTemplate.id}
              onComplete={(agreement) => {
                console.log("Agreement signed:", agreement);
                setTestSignDialogOpen(false);
                setSuccess("Test agreement signed successfully!");
              }}
              onCancel={() => setTestSignDialogOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default ServiceAgreements;
