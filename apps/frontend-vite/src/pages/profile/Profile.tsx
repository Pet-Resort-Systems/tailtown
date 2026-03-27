import React, { useState, useEffect } from 'react';
import { getApiBaseUrl } from '../../services/api';
import { useNavigate } from 'react-router-dom';
import {
  Formik,
  Form,
  Field,
  FormikHelpers,
  FormikErrors,
  FormikTouched,
} from 'formik';
import * as Yup from 'yup';
import {
  Box,
  Typography,
  TextField,
  Button,
  Avatar,
  Divider,
  Alert,
  CircularProgress,
  Grid,
  Card,
  CardContent,
  IconButton,
  InputAdornment,
} from '@mui/material';
import {
  Person as PersonIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  Save as SaveIcon,
  Lock as LockIcon,
  Visibility,
  VisibilityOff,
  PhotoCamera as PhotoCameraIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';

interface ProfileFormValues {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}

interface PasswordFormValues {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

const ProfileSchema = Yup.object().shape({
  firstName: Yup.string().required('First name is required'),
  lastName: Yup.string().required('Last name is required'),
  email: Yup.string().email('Invalid email').required('Email is required'),
  phone: Yup.string(),
});

const PasswordSchema = Yup.object().shape({
  currentPassword: Yup.string().required('Current password is required'),
  newPassword: Yup.string()
    .min(8, 'Password must be at least 8 characters')
    .matches(/[a-z]/, 'Password must contain at least one lowercase letter')
    .matches(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .matches(/[0-9]/, 'Password must contain at least one number')
    .matches(
      /[^a-zA-Z0-9]/,
      'Password must contain at least one special character'
    )
    .required('New password is required'),
  confirmPassword: Yup.string()
    .oneOf([Yup.ref('newPassword')], 'Passwords must match')
    .required('Please confirm your password'),
});

const Profile = () => {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  const [profileData, setProfileData] = useState<ProfileFormValues>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
  });

  /**
   * Safely construct profile photo URL with error handling
   * @param profilePhoto - Relative path to profile photo
   * @returns Full URL to profile photo or undefined if invalid
   */
  const getProfilePhotoUrl = (
    profilePhoto: string | null | undefined
  ): string | undefined => {
    if (!profilePhoto) return undefined;

    try {
      const baseUrl = getApiBaseUrl();

      // Ensure profilePhoto starts with /
      const path = profilePhoto.startsWith('/')
        ? profilePhoto
        : `/${profilePhoto}`;
      return `${baseUrl}${path}`;
    } catch (error) {
      console.error('Error constructing profile photo URL:', error);
      return undefined;
    }
  };

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        // Fetch fresh profile data from server
        if (user?.id) {
          const response = await api.get(`/api/staff/${user.id}`);
          // Backend returns { status: 'success', data: staff }
          const freshData = response.data.data || response.data;

          // Update local state
          setProfileData({
            firstName: freshData.firstName || '',
            lastName: freshData.lastName || '',
            email: freshData.email || '',
            phone: freshData.phone || '',
          });

          // Set profile photo if exists - construct full URL
          if (freshData.profilePhoto) {
            const fullPhotoUrl = getProfilePhotoUrl(freshData.profilePhoto);
            setProfilePhoto(fullPhotoUrl || null);
          }

          // Update user context with fresh data
          if (updateUser) {
            updateUser({
              firstName: freshData.firstName,
              lastName: freshData.lastName,
              email: freshData.email,
              phone: freshData.phone,
              isActive: freshData.isActive,
              lastLogin: freshData.lastLogin,
            });
          }
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
        // Fallback to cached user data
        if (user) {
          setProfileData({
            firstName: user.firstName || '',
            lastName: user.lastName || '',
            email: user.email || '',
            phone: user.phone || '',
          });
        }
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const handleProfileSubmit = async (
    values: ProfileFormValues,
    { setSubmitting }: FormikHelpers<ProfileFormValues>
  ) => {
    try {
      setProfileError(null);
      setProfileSuccess(null);

      // Update profile via API
      const response = await api.put(`/api/staff/${user?.id}`, values);

      // Update user context with the returned data
      if (updateUser && response.data) {
        const updatedData = response.data.data || response.data;
        updateUser({
          firstName: updatedData.firstName,
          lastName: updatedData.lastName,
          email: updatedData.email,
          phone: updatedData.phone,
          isActive: updatedData.isActive,
        });
      }

      setProfileSuccess('Profile updated successfully!');
    } catch (error: any) {
      console.error('Profile update error:', error);
      const message =
        error.response?.data?.error ||
        error.response?.data?.message ||
        error.message ||
        'Failed to update profile';
      setProfileError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handlePhotoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setProfileError('Please select an image file');
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setProfileError('Image size must be less than 5MB');
        return;
      }

      setPhotoFile(file);

      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePhotoUpload = async () => {
    if (!photoFile) return;

    try {
      setProfileError(null);
      const formData = new FormData();
      formData.append('photo', photoFile);

      const response = await api.post(
        `/api/staff/${user?.id}/photo`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      const photoPath =
        response.data.data?.profilePhoto || response.data.profilePhoto;
      const fullPhotoUrl = getProfilePhotoUrl(photoPath);
      setProfilePhoto(fullPhotoUrl || null);
      setPhotoPreview(null);
      setPhotoFile(null);
      setProfileSuccess('Profile photo updated successfully!');

      // Update user context with the relative path (backend format)
      if (updateUser) {
        updateUser({ profilePhoto: photoPath });
      }
    } catch (error: any) {
      console.error('Photo upload error:', error);
      const message = error.response?.data?.message || 'Failed to upload photo';
      setProfileError(message);
    }
  };

  const handlePhotoDelete = async () => {
    try {
      setProfileError(null);
      await api.delete(`/api/staff/${user?.id}/photo`);

      setProfilePhoto(null);
      setPhotoPreview(null);
      setPhotoFile(null);
      setProfileSuccess('Profile photo removed successfully!');

      // Update user context
      if (updateUser) {
        updateUser({ profilePhoto: null });
      }
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to remove photo';
      setProfileError(message);
    }
  };

  const handlePasswordSubmit = async (
    values: PasswordFormValues,
    { setSubmitting, resetForm }: FormikHelpers<PasswordFormValues>
  ) => {
    try {
      setPasswordError(null);
      setPasswordSuccess(null);

      // Change password via API
      await api.post('/staff/change-password', {
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });

      setPasswordSuccess('Password changed successfully!');
      resetForm();
    } catch (error: any) {
      const message =
        error.response?.data?.message || 'Failed to change password';
      setPasswordError(message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '400px',
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', p: 3 }}>
      {/* Header with Photo */}
      <Box sx={{ mb: 4, display: 'flex', alignItems: 'center', gap: 3 }}>
        <Box sx={{ position: 'relative' }}>
          <Avatar
            key={profilePhoto || 'no-photo'}
            src={photoPreview || profilePhoto || undefined}
            sx={{
              width: 120,
              height: 120,
              bgcolor: 'primary.main',
              fontSize: '2.5rem',
              border: '4px solid',
              borderColor: 'background.paper',
              boxShadow: 3,
            }}
          >
            {!photoPreview && !profilePhoto && (
              <>
                {user?.firstName?.[0]}
                {user?.lastName?.[0]}
              </>
            )}
          </Avatar>
          <input
            accept="image/*"
            style={{ display: 'none' }}
            id="profile-photo-upload"
            type="file"
            onChange={handlePhotoChange}
          />
          <label htmlFor="profile-photo-upload">
            <IconButton
              component="span"
              sx={{
                position: 'absolute',
                bottom: 0,
                right: 0,
                bgcolor: 'primary.main',
                color: 'white',
                '&:hover': {
                  bgcolor: 'primary.dark',
                },
                boxShadow: 2,
              }}
            >
              <PhotoCameraIcon />
            </IconButton>
          </label>
        </Box>
        <Box sx={{ flexGrow: 1 }}>
          <Typography variant="h4" component="h1">
            {user?.firstName} {user?.lastName}
          </Typography>
          <Typography variant="body1" color="text.secondary" gutterBottom>
            {user?.email}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage your account settings and preferences
          </Typography>
          {photoPreview && (
            <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
              <Button
                size="small"
                variant="contained"
                onClick={handlePhotoUpload}
                startIcon={<SaveIcon />}
              >
                Save Photo
              </Button>
              <Button
                size="small"
                variant="outlined"
                onClick={() => {
                  setPhotoPreview(null);
                  setPhotoFile(null);
                }}
              >
                Cancel
              </Button>
            </Box>
          )}
          {profilePhoto && !photoPreview && (
            <Button
              size="small"
              variant="outlined"
              color="error"
              onClick={handlePhotoDelete}
              startIcon={<DeleteIcon />}
              sx={{ mt: 2 }}
            >
              Remove Photo
            </Button>
          )}
        </Box>
      </Box>
      <Grid container spacing={3}>
        {/* Profile Information */}
        <Grid
          size={{
            xs: 12,
            md: 6
          }}>
          <Card>
            <CardContent>
              <Box
                sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}
              >
                <PersonIcon color="primary" />
                <Typography variant="h6">Profile Information</Typography>
              </Box>

              {profileSuccess && (
                <Alert severity="success" sx={{ mb: 2 }}>
                  {profileSuccess}
                </Alert>
              )}

              {profileError && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {profileError}
                </Alert>
              )}

              <Formik
                initialValues={profileData}
                validationSchema={ProfileSchema}
                onSubmit={handleProfileSubmit}
                enableReinitialize
              >
                {({
                  errors,
                  touched,
                  isSubmitting,
                }: {
                  errors: FormikErrors<ProfileFormValues>;
                  touched: FormikTouched<ProfileFormValues>;
                  isSubmitting: boolean;
                }) => (
                  <Form>
                    <Field
                      as={TextField}
                      name="firstName"
                      label="First Name"
                      fullWidth
                      margin="normal"
                      variant="outlined"
                      error={touched.firstName && Boolean(errors.firstName)}
                      helperText={touched.firstName && errors.firstName}
                      disabled={isSubmitting}
                    />

                    <Field
                      as={TextField}
                      name="lastName"
                      label="Last Name"
                      fullWidth
                      margin="normal"
                      variant="outlined"
                      error={touched.lastName && Boolean(errors.lastName)}
                      helperText={touched.lastName && errors.lastName}
                      disabled={isSubmitting}
                    />

                    <Field
                      as={TextField}
                      name="email"
                      label="Email Address"
                      fullWidth
                      margin="normal"
                      variant="outlined"
                      error={touched.email && Boolean(errors.email)}
                      helperText={touched.email && errors.email}
                      disabled={isSubmitting}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <EmailIcon />
                          </InputAdornment>
                        ),
                      }}
                    />

                    <Field
                      as={TextField}
                      name="phone"
                      label="Phone Number"
                      fullWidth
                      margin="normal"
                      variant="outlined"
                      error={touched.phone && Boolean(errors.phone)}
                      helperText={touched.phone && errors.phone}
                      disabled={isSubmitting}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <PhoneIcon />
                          </InputAdornment>
                        ),
                      }}
                    />

                    <Button
                      type="submit"
                      variant="contained"
                      color="primary"
                      fullWidth
                      disabled={isSubmitting}
                      startIcon={
                        isSubmitting ? (
                          <CircularProgress size={20} />
                        ) : (
                          <SaveIcon />
                        )
                      }
                      sx={{ mt: 3 }}
                    >
                      {isSubmitting ? 'Saving...' : 'Save Changes'}
                    </Button>
                  </Form>
                )}
              </Formik>
            </CardContent>
          </Card>
        </Grid>

        {/* Change Password */}
        <Grid
          size={{
            xs: 12,
            md: 6
          }}>
          <Card>
            <CardContent>
              <Box
                sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}
              >
                <LockIcon color="primary" />
                <Typography variant="h6">Change Password</Typography>
              </Box>

              {passwordSuccess && (
                <Alert severity="success" sx={{ mb: 2 }}>
                  {passwordSuccess}
                </Alert>
              )}

              {passwordError && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {passwordError}
                </Alert>
              )}

              <Formik
                initialValues={{
                  currentPassword: '',
                  newPassword: '',
                  confirmPassword: '',
                }}
                validationSchema={PasswordSchema}
                onSubmit={handlePasswordSubmit}
              >
                {({
                  errors,
                  touched,
                  isSubmitting,
                }: {
                  errors: FormikErrors<PasswordFormValues>;
                  touched: FormikTouched<PasswordFormValues>;
                  isSubmitting: boolean;
                }) => (
                  <Form>
                    <Field
                      as={TextField}
                      name="currentPassword"
                      label="Current Password"
                      type={showCurrentPassword ? 'text' : 'password'}
                      fullWidth
                      margin="normal"
                      variant="outlined"
                      error={
                        touched.currentPassword &&
                        Boolean(errors.currentPassword)
                      }
                      helperText={
                        touched.currentPassword && errors.currentPassword
                      }
                      disabled={isSubmitting}
                      InputProps={{
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton
                              onClick={() =>
                                setShowCurrentPassword(!showCurrentPassword)
                              }
                              edge="end"
                            >
                              {showCurrentPassword ? (
                                <VisibilityOff />
                              ) : (
                                <Visibility />
                              )}
                            </IconButton>
                          </InputAdornment>
                        ),
                      }}
                    />

                    <Field
                      as={TextField}
                      name="newPassword"
                      label="New Password"
                      type={showNewPassword ? 'text' : 'password'}
                      fullWidth
                      margin="normal"
                      variant="outlined"
                      error={touched.newPassword && Boolean(errors.newPassword)}
                      helperText={touched.newPassword && errors.newPassword}
                      disabled={isSubmitting}
                      InputProps={{
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton
                              onClick={() =>
                                setShowNewPassword(!showNewPassword)
                              }
                              edge="end"
                            >
                              {showNewPassword ? (
                                <VisibilityOff />
                              ) : (
                                <Visibility />
                              )}
                            </IconButton>
                          </InputAdornment>
                        ),
                      }}
                    />

                    <Field
                      as={TextField}
                      name="confirmPassword"
                      label="Confirm New Password"
                      type={showConfirmPassword ? 'text' : 'password'}
                      fullWidth
                      margin="normal"
                      variant="outlined"
                      error={
                        touched.confirmPassword &&
                        Boolean(errors.confirmPassword)
                      }
                      helperText={
                        touched.confirmPassword && errors.confirmPassword
                      }
                      disabled={isSubmitting}
                      InputProps={{
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton
                              onClick={() =>
                                setShowConfirmPassword(!showConfirmPassword)
                              }
                              edge="end"
                            >
                              {showConfirmPassword ? (
                                <VisibilityOff />
                              ) : (
                                <Visibility />
                              )}
                            </IconButton>
                          </InputAdornment>
                        ),
                      }}
                    />

                    {/* Password Requirements */}
                    <Box sx={{ mt: 2, mb: 2 }}>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        component="div"
                      >
                        Password must contain:
                      </Typography>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        component="div"
                      >
                        • At least 8 characters
                      </Typography>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        component="div"
                      >
                        • One uppercase and lowercase letter
                      </Typography>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        component="div"
                      >
                        • One number and one special character
                      </Typography>
                    </Box>

                    <Button
                      type="submit"
                      variant="contained"
                      color="primary"
                      fullWidth
                      disabled={isSubmitting}
                      startIcon={
                        isSubmitting ? (
                          <CircularProgress size={20} />
                        ) : (
                          <LockIcon />
                        )
                      }
                      sx={{ mt: 3 }}
                    >
                      {isSubmitting
                        ? 'Changing Password...'
                        : 'Change Password'}
                    </Button>
                  </Form>
                )}
              </Formik>
            </CardContent>
          </Card>
        </Grid>

        {/* Account Information */}
        <Grid size={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Account Information
              </Typography>
              <Divider sx={{ my: 2 }} />
              <Grid container spacing={2}>
                <Grid
                  size={{
                    xs: 12,
                    sm: 4
                  }}>
                  <Typography variant="body2" color="text.secondary">
                    Account Type
                  </Typography>
                  <Typography variant="body1">
                    {user?.role || 'Staff'}
                  </Typography>
                </Grid>
                <Grid
                  size={{
                    xs: 12,
                    sm: 4
                  }}>
                  <Typography variant="body2" color="text.secondary">
                    Status
                  </Typography>
                  <Typography
                    variant="body1"
                    sx={{
                      color: user?.isActive ? 'success.main' : 'error.main',
                      fontWeight: 'medium',
                    }}
                  >
                    {user?.isActive ? 'Active' : 'Inactive'}
                  </Typography>
                </Grid>
                <Grid
                  size={{
                    xs: 12,
                    sm: 4
                  }}>
                  <Typography variant="body2" color="text.secondary">
                    Last Login
                  </Typography>
                  <Typography variant="body1">
                    {user?.lastLogin
                      ? new Date(user.lastLogin).toLocaleString()
                      : 'Just now'}
                  </Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Profile;
