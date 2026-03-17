/**
 * Staff Step - Add team members and assign roles
 */

import React, { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Grid,
  TextField,
  Card,
  CardContent,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Avatar,
  Chip,
} from '@mui/material';
import {
  ArrowForward,
  ArrowBack,
  Add,
  Delete,
  Edit,
} from '@mui/icons-material';
import { useSetupWizard } from '../SetupWizardContext';
import { StaffMember, StaffRole } from '../types';
import { v4 as uuidv4 } from 'uuid';

const ROLE_LABELS: Record<StaffRole, string> = {
  ADMIN: 'Administrator',
  MANAGER: 'Manager',
  STAFF: 'Staff',
  GROOMER: 'Groomer',
  TRAINER: 'Trainer',
};

const ROLE_COLORS: Record<
  StaffRole,
  'error' | 'warning' | 'info' | 'success' | 'secondary'
> = {
  ADMIN: 'error',
  MANAGER: 'warning',
  STAFF: 'info',
  GROOMER: 'success',
  TRAINER: 'secondary',
};

export default function StaffStep() {
  const { state, setStaff, completeStep, nextStep, prevStep } =
    useSetupWizard();
  const { staff } = state;

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<StaffMember | null>(null);
  const [form, setForm] = useState<Partial<StaffMember>>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    role: 'STAFF',
    isOwner: false,
  });

  const openAdd = () => {
    setEditingMember(null);
    setForm({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      role: 'STAFF',
      isOwner: false,
    });
    setDialogOpen(true);
  };

  const openEdit = (member: StaffMember) => {
    setEditingMember(member);
    setForm(member);
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (form.firstName && form.lastName && form.email) {
      if (editingMember) {
        setStaff({
          members: staff.members.map((m) =>
            m.id === editingMember.id ? ({ ...m, ...form } as StaffMember) : m
          ),
        });
      } else {
        setStaff({
          members: [...staff.members, { ...form, id: uuidv4() } as StaffMember],
        });
      }
      setDialogOpen(false);
    }
  };

  const handleDelete = (id: string) => {
    setStaff({ members: staff.members.filter((m) => m.id !== id) });
  };

  const handleNext = () => {
    if (staff.members.length > 0) {
      completeStep('staff');
      nextStep();
    }
  };

  return (
    <Box>
      <Typography variant="h5" fontWeight="bold" gutterBottom>
        Staff
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
        Add your team members. At least one administrator is required.
      </Typography>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        {staff.members.map((member) => (
          <Grid item xs={12} sm={6} md={4} key={member.id}>
            <Card variant="outlined">
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                    <Avatar>
                      {member.firstName[0]}
                      {member.lastName[0]}
                    </Avatar>
                    <Box>
                      <Typography variant="subtitle1">
                        {member.firstName} {member.lastName}
                        {member.isOwner && (
                          <Chip label="Owner" size="small" sx={{ ml: 1 }} />
                        )}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {member.email}
                      </Typography>
                      <Chip
                        label={ROLE_LABELS[member.role]}
                        size="small"
                        color={ROLE_COLORS[member.role]}
                        sx={{ mt: 0.5 }}
                      />
                    </Box>
                  </Box>
                  <Box>
                    <IconButton size="small" onClick={() => openEdit(member)}>
                      <Edit fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => handleDelete(member.id)}
                      color="error"
                    >
                      <Delete fontSize="small" />
                    </IconButton>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
        <Grid item xs={12} sm={6} md={4}>
          <Card
            variant="outlined"
            sx={{
              height: '100%',
              minHeight: 120,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              borderStyle: 'dashed',
              '&:hover': { bgcolor: 'action.hover' },
            }}
            onClick={openAdd}
          >
            <Box sx={{ textAlign: 'center' }}>
              <Add sx={{ fontSize: 40, color: 'text.secondary' }} />
              <Typography color="text.secondary">Add Staff Member</Typography>
            </Box>
          </Card>
        </Grid>
      </Grid>

      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {editingMember ? 'Edit Staff Member' : 'Add Staff Member'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="First Name"
                value={form.firstName}
                onChange={(e) =>
                  setForm({ ...form, firstName: e.target.value })
                }
                required
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Last Name"
                value={form.lastName}
                onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Phone"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth>
                <InputLabel>Role</InputLabel>
                <Select
                  value={form.role}
                  label="Role"
                  onChange={(e) =>
                    setForm({ ...form, role: e.target.value as StaffRole })
                  }
                >
                  {Object.entries(ROLE_LABELS).map(([value, label]) => (
                    <MenuItem key={value} value={value}>
                      {label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={!form.firstName || !form.lastName || !form.email}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
        <Button startIcon={<ArrowBack />} onClick={prevStep}>
          Back
        </Button>
        <Button
          variant="contained"
          size="large"
          endIcon={<ArrowForward />}
          onClick={handleNext}
          disabled={staff.members.length === 0}
        >
          Continue
        </Button>
      </Box>
    </Box>
  );
}
