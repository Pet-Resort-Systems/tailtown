/**
 * Schedule Templates Component
 * Manage recurring schedule templates for a staff member
 */

import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Paper,
  Button,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Chip,
  Alert,
  CircularProgress,
  Tooltip,
  Collapse,
  Grid,
} from "@mui/material";
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  PlayArrow as GenerateIcon,
  ExpandMore as ExpandIcon,
  ExpandLess as CollapseIcon,
  Schedule as ScheduleIcon,
  Event as EventIcon,
} from "@mui/icons-material";
import scheduleTemplateService, {
  ScheduleTemplate,
  ScheduleTemplateEntry,
  ScheduleRotationType,
} from "../../services/scheduleTemplateService";

interface ScheduleTemplatesProps {
  staffId: string;
  staffName: string;
}

const DAYS_OF_WEEK = [
  { value: 0, label: "Sunday", short: "Sun" },
  { value: 1, label: "Monday", short: "Mon" },
  { value: 2, label: "Tuesday", short: "Tue" },
  { value: 3, label: "Wednesday", short: "Wed" },
  { value: 4, label: "Thursday", short: "Thu" },
  { value: 5, label: "Friday", short: "Fri" },
  { value: 6, label: "Saturday", short: "Sat" },
];

const ScheduleTemplates: React.FC<ScheduleTemplatesProps> = ({
  staffId,
  staffName,
}) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [templates, setTemplates] = useState<ScheduleTemplate[]>([]);
  const [expandedTemplate, setExpandedTemplate] = useState<string | null>(null);

  // Template dialog state
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] =
    useState<ScheduleTemplate | null>(null);
  const [templateForm, setTemplateForm] = useState({
    name: "",
    rotationType: "WEEKLY" as ScheduleRotationType,
    rotationWeeks: 1,
    effectiveFrom: new Date().toISOString().split("T")[0],
    effectiveUntil: "",
    generateAheadDays: 14,
    skipHolidays: true,
    notes: "",
  });

  // Entry dialog state
  const [entryDialogOpen, setEntryDialogOpen] = useState(false);
  const [editingEntry, setEditingEntry] =
    useState<ScheduleTemplateEntry | null>(null);
  const [entryTemplateId, setEntryTemplateId] = useState<string | null>(null);
  const [entryForm, setEntryForm] = useState({
    dayOfWeek: 1,
    rotationWeek: 0,
    startTime: "09:00",
    endTime: "17:00",
    location: "",
    role: "",
    notes: "",
  });

  // Load templates
  useEffect(() => {
    const loadTemplates = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await scheduleTemplateService.getStaffTemplates(staffId);
        setTemplates(data);
      } catch (err: any) {
        console.error("Error loading templates:", err);
        setError("Failed to load schedule templates");
      } finally {
        setLoading(false);
      }
    };
    loadTemplates();
  }, [staffId]);

  // Template CRUD
  const handleOpenTemplateDialog = (template?: ScheduleTemplate) => {
    if (template) {
      setEditingTemplate(template);
      setTemplateForm({
        name: template.name,
        rotationType: template.rotationType,
        rotationWeeks: template.rotationWeeks,
        effectiveFrom: template.effectiveFrom.split("T")[0],
        effectiveUntil: template.effectiveUntil?.split("T")[0] || "",
        generateAheadDays: template.generateAheadDays,
        skipHolidays: template.skipHolidays,
        notes: template.notes || "",
      });
    } else {
      setEditingTemplate(null);
      setTemplateForm({
        name: "",
        rotationType: "WEEKLY",
        rotationWeeks: 1,
        effectiveFrom: new Date().toISOString().split("T")[0],
        effectiveUntil: "",
        generateAheadDays: 14,
        skipHolidays: true,
        notes: "",
      });
    }
    setTemplateDialogOpen(true);
  };

  const handleSaveTemplate = async () => {
    try {
      setSaving(true);
      setError(null);

      if (editingTemplate) {
        await scheduleTemplateService.updateTemplate(editingTemplate.id, {
          ...templateForm,
          effectiveUntil: templateForm.effectiveUntil || undefined,
        });
        setSuccess("Template updated successfully");
      } else {
        await scheduleTemplateService.createTemplate(staffId, {
          ...templateForm,
          effectiveUntil: templateForm.effectiveUntil || undefined,
        });
        setSuccess("Template created successfully");
      }

      const data = await scheduleTemplateService.getStaffTemplates(staffId);
      setTemplates(data);
      setTemplateDialogOpen(false);
    } catch (err: any) {
      console.error("Error saving template:", err);
      setError("Failed to save template");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    if (!window.confirm("Are you sure you want to delete this template?"))
      return;

    try {
      setSaving(true);
      await scheduleTemplateService.deleteTemplate(templateId);
      setTemplates((prev) => prev.filter((t) => t.id !== templateId));
      setSuccess("Template deleted successfully");
    } catch (err: any) {
      console.error("Error deleting template:", err);
      setError("Failed to delete template");
    } finally {
      setSaving(false);
    }
  };

  const handleGenerateSchedules = async (templateId: string) => {
    try {
      setSaving(true);
      setError(null);
      const result = await scheduleTemplateService.generateSchedules(
        templateId
      );
      setSuccess(
        `Generated ${result.created} schedules (${result.skipped} skipped)`
      );

      // Refresh templates to get updated lastGeneratedDate
      const data = await scheduleTemplateService.getStaffTemplates(staffId);
      setTemplates(data);
    } catch (err: any) {
      console.error("Error generating schedules:", err);
      setError("Failed to generate schedules");
    } finally {
      setSaving(false);
    }
  };

  // Entry CRUD
  const handleOpenEntryDialog = (
    templateId: string,
    entry?: ScheduleTemplateEntry
  ) => {
    setEntryTemplateId(templateId);
    if (entry) {
      setEditingEntry(entry);
      setEntryForm({
        dayOfWeek: entry.dayOfWeek,
        rotationWeek: entry.rotationWeek,
        startTime: entry.startTime,
        endTime: entry.endTime,
        location: entry.location || "",
        role: entry.role || "",
        notes: entry.notes || "",
      });
    } else {
      setEditingEntry(null);
      setEntryForm({
        dayOfWeek: 1,
        rotationWeek: 0,
        startTime: "09:00",
        endTime: "17:00",
        location: "",
        role: "",
        notes: "",
      });
    }
    setEntryDialogOpen(true);
  };

  const handleSaveEntry = async () => {
    if (!entryTemplateId) return;

    try {
      setSaving(true);
      setError(null);

      if (editingEntry) {
        await scheduleTemplateService.updateEntry(editingEntry.id, entryForm);
        setSuccess("Entry updated successfully");
      } else {
        await scheduleTemplateService.addEntry(entryTemplateId, entryForm);
        setSuccess("Entry added successfully");
      }

      const data = await scheduleTemplateService.getStaffTemplates(staffId);
      setTemplates(data);
      setEntryDialogOpen(false);
    } catch (err: any) {
      console.error("Error saving entry:", err);
      setError("Failed to save entry");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteEntry = async (entryId: string) => {
    if (!window.confirm("Are you sure you want to delete this entry?")) return;

    try {
      setSaving(true);
      await scheduleTemplateService.deleteEntry(entryId);
      const data = await scheduleTemplateService.getStaffTemplates(staffId);
      setTemplates(data);
      setSuccess("Entry deleted successfully");
    } catch (err: any) {
      console.error("Error deleting entry:", err);
      setError("Failed to delete entry");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 2,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <ScheduleIcon color="primary" />
          <Typography variant="h6">
            Schedule Templates for {staffName}
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenTemplateDialog()}
        >
          Add Template
        </Button>
      </Box>

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

      {/* Templates List */}
      {templates.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: "center" }}>
          <EventIcon sx={{ fontSize: 48, color: "text.secondary", mb: 1 }} />
          <Typography color="text.secondary">
            No schedule templates yet
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Create a template to auto-generate recurring schedules
          </Typography>
        </Paper>
      ) : (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {templates.map((template) => {
            const isExpanded = expandedTemplate === template.id;

            return (
              <Paper key={template.id} elevation={2}>
                {/* Template Header */}
                <Box
                  sx={{
                    p: 2,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    cursor: "pointer",
                  }}
                  onClick={() =>
                    setExpandedTemplate(isExpanded ? null : template.id)
                  }
                >
                  <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                    <IconButton size="small">
                      {isExpanded ? <CollapseIcon /> : <ExpandIcon />}
                    </IconButton>
                    <Box>
                      <Box
                        sx={{ display: "flex", alignItems: "center", gap: 1 }}
                      >
                        <Typography variant="subtitle1" fontWeight="bold">
                          {template.name}
                        </Typography>
                        <Chip
                          label={template.isActive ? "Active" : "Inactive"}
                          size="small"
                          color={template.isActive ? "success" : "default"}
                        />
                        <Chip
                          label={scheduleTemplateService.formatRotationType(
                            template.rotationType
                          )}
                          size="small"
                          variant="outlined"
                        />
                      </Box>
                      <Typography variant="body2" color="text.secondary">
                        {template.entries.length} entries •{" "}
                        {template.lastGeneratedDate
                          ? `Last generated: ${new Date(
                              template.lastGeneratedDate
                            ).toLocaleDateString()}`
                          : "Never generated"}
                      </Typography>
                    </Box>
                  </Box>
                  <Box
                    sx={{ display: "flex", gap: 1 }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Tooltip title="Generate Schedules">
                      <IconButton
                        color="primary"
                        onClick={() => handleGenerateSchedules(template.id)}
                        disabled={saving}
                      >
                        <GenerateIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Edit Template">
                      <IconButton
                        onClick={() => handleOpenTemplateDialog(template)}
                      >
                        <EditIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete Template">
                      <IconButton
                        color="error"
                        onClick={() => handleDeleteTemplate(template.id)}
                        disabled={saving}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Box>

                {/* Template Entries */}
                <Collapse in={isExpanded}>
                  <Box sx={{ px: 2, pb: 2 }}>
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        mb: 1,
                      }}
                    >
                      <Typography variant="subtitle2" color="text.secondary">
                        Schedule Entries
                      </Typography>
                      <Button
                        size="small"
                        startIcon={<AddIcon />}
                        onClick={() => handleOpenEntryDialog(template.id)}
                      >
                        Add Entry
                      </Button>
                    </Box>

                    {template.entries.length === 0 ? (
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ py: 2, textAlign: "center" }}
                      >
                        No entries yet. Add entries to define the schedule
                        pattern.
                      </Typography>
                    ) : (
                      <TableContainer>
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell>Day</TableCell>
                              {template.rotationWeeks > 1 && (
                                <TableCell>Week</TableCell>
                              )}
                              <TableCell>Start</TableCell>
                              <TableCell>End</TableCell>
                              <TableCell>Location</TableCell>
                              <TableCell>Role</TableCell>
                              <TableCell align="right">Actions</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {template.entries.map((entry) => (
                              <TableRow key={entry.id}>
                                <TableCell>
                                  {scheduleTemplateService.getDayName(
                                    entry.dayOfWeek
                                  )}
                                </TableCell>
                                {template.rotationWeeks > 1 && (
                                  <TableCell>
                                    Week {entry.rotationWeek + 1}
                                  </TableCell>
                                )}
                                <TableCell>{entry.startTime}</TableCell>
                                <TableCell>{entry.endTime}</TableCell>
                                <TableCell>{entry.location || "-"}</TableCell>
                                <TableCell>{entry.role || "-"}</TableCell>
                                <TableCell align="right">
                                  <IconButton
                                    size="small"
                                    onClick={() =>
                                      handleOpenEntryDialog(template.id, entry)
                                    }
                                  >
                                    <EditIcon fontSize="small" />
                                  </IconButton>
                                  <IconButton
                                    size="small"
                                    color="error"
                                    onClick={() => handleDeleteEntry(entry.id)}
                                  >
                                    <DeleteIcon fontSize="small" />
                                  </IconButton>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    )}
                  </Box>
                </Collapse>
              </Paper>
            );
          })}
        </Box>
      )}

      {/* Template Dialog */}
      <Dialog
        open={templateDialogOpen}
        onClose={() => setTemplateDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {editingTemplate ? "Edit Template" : "Create Template"}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                label="Template Name"
                value={templateForm.name}
                onChange={(e) =>
                  setTemplateForm({ ...templateForm, name: e.target.value })
                }
                fullWidth
                required
                placeholder="e.g., Regular Week, Week A"
              />
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth>
                <InputLabel>Rotation Type</InputLabel>
                <Select
                  value={templateForm.rotationType}
                  label="Rotation Type"
                  onChange={(e) =>
                    setTemplateForm({
                      ...templateForm,
                      rotationType: e.target.value as ScheduleRotationType,
                      rotationWeeks: e.target.value === "BIWEEKLY" ? 2 : 1,
                    })
                  }
                >
                  <MenuItem value="WEEKLY">Weekly (same every week)</MenuItem>
                  <MenuItem value="BIWEEKLY">Bi-Weekly (alternating)</MenuItem>
                  <MenuItem value="MONTHLY">Monthly</MenuItem>
                  <MenuItem value="CUSTOM">Custom</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <TextField
                label="Rotation Weeks"
                type="number"
                value={templateForm.rotationWeeks}
                onChange={(e) =>
                  setTemplateForm({
                    ...templateForm,
                    rotationWeeks: parseInt(e.target.value) || 1,
                  })
                }
                fullWidth
                inputProps={{ min: 1, max: 8 }}
                disabled={templateForm.rotationType === "WEEKLY"}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                label="Effective From"
                type="date"
                value={templateForm.effectiveFrom}
                onChange={(e) =>
                  setTemplateForm({
                    ...templateForm,
                    effectiveFrom: e.target.value,
                  })
                }
                fullWidth
                required
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                label="Effective Until (optional)"
                type="date"
                value={templateForm.effectiveUntil}
                onChange={(e) =>
                  setTemplateForm({
                    ...templateForm,
                    effectiveUntil: e.target.value,
                  })
                }
                fullWidth
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                label="Generate Ahead (days)"
                type="number"
                value={templateForm.generateAheadDays}
                onChange={(e) =>
                  setTemplateForm({
                    ...templateForm,
                    generateAheadDays: parseInt(e.target.value) || 14,
                  })
                }
                fullWidth
                inputProps={{ min: 1, max: 90 }}
              />
            </Grid>
            <Grid item xs={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={templateForm.skipHolidays}
                    onChange={(e) =>
                      setTemplateForm({
                        ...templateForm,
                        skipHolidays: e.target.checked,
                      })
                    }
                  />
                }
                label="Skip Holidays"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Notes"
                value={templateForm.notes}
                onChange={(e) =>
                  setTemplateForm({ ...templateForm, notes: e.target.value })
                }
                fullWidth
                multiline
                rows={2}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTemplateDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleSaveTemplate}
            disabled={
              saving || !templateForm.name || !templateForm.effectiveFrom
            }
          >
            {saving ? (
              <CircularProgress size={20} />
            ) : editingTemplate ? (
              "Update"
            ) : (
              "Create"
            )}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Entry Dialog */}
      <Dialog
        open={entryDialogOpen}
        onClose={() => setEntryDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>{editingEntry ? "Edit Entry" : "Add Entry"}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={6}>
              <FormControl fullWidth>
                <InputLabel>Day of Week</InputLabel>
                <Select
                  value={entryForm.dayOfWeek}
                  label="Day of Week"
                  onChange={(e) =>
                    setEntryForm({
                      ...entryForm,
                      dayOfWeek: e.target.value as number,
                    })
                  }
                >
                  {DAYS_OF_WEEK.map((day) => (
                    <MenuItem key={day.value} value={day.value}>
                      {day.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <TextField
                label="Rotation Week"
                type="number"
                value={entryForm.rotationWeek}
                onChange={(e) =>
                  setEntryForm({
                    ...entryForm,
                    rotationWeek: parseInt(e.target.value) || 0,
                  })
                }
                fullWidth
                inputProps={{ min: 0 }}
                helperText="0 for Week 1, 1 for Week 2, etc."
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                label="Start Time"
                type="time"
                value={entryForm.startTime}
                onChange={(e) =>
                  setEntryForm({ ...entryForm, startTime: e.target.value })
                }
                fullWidth
                required
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                label="End Time"
                type="time"
                value={entryForm.endTime}
                onChange={(e) =>
                  setEntryForm({ ...entryForm, endTime: e.target.value })
                }
                fullWidth
                required
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                label="Location"
                value={entryForm.location}
                onChange={(e) =>
                  setEntryForm({ ...entryForm, location: e.target.value })
                }
                fullWidth
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                label="Role"
                value={entryForm.role}
                onChange={(e) =>
                  setEntryForm({ ...entryForm, role: e.target.value })
                }
                fullWidth
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Notes"
                value={entryForm.notes}
                onChange={(e) =>
                  setEntryForm({ ...entryForm, notes: e.target.value })
                }
                fullWidth
                multiline
                rows={2}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEntryDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleSaveEntry}
            disabled={saving || !entryForm.startTime || !entryForm.endTime}
          >
            {saving ? (
              <CircularProgress size={20} />
            ) : editingEntry ? (
              "Update"
            ) : (
              "Add"
            )}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ScheduleTemplates;
