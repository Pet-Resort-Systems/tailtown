import React, { useState, useEffect } from "react";
import {
  Box,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  IconButton,
  Chip,
  Alert,
  CircularProgress,
  Tooltip,
  Tabs,
  Tab,
} from "@mui/material";
import {
  CheckCircle as CompleteIcon,
  Cancel as CancelIcon,
  EmojiEvents as CertificateIcon,
} from "@mui/icons-material";
import { useParams, useNavigate } from "react-router-dom";
import schedulingService from "../../services/schedulingService";
import { ClassEnrollment, TrainingClass } from "../../types/scheduling";

const ClassEnrollments: React.FC = () => {
  const { classId } = useParams<{ classId: string }>();
  const navigate = useNavigate();
  const [trainingClass, setTrainingClass] = useState<TrainingClass | null>(
    null
  );
  const [enrollments, setEnrollments] = useState<ClassEnrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTab, setSelectedTab] = useState(0);

  useEffect(() => {
    if (classId) {
      loadData();
    }
  }, [classId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const classData = await schedulingService.trainingClasses.getById(
        classId!
      );
      setTrainingClass(classData);
      // For now, show empty enrollments - this will be populated when we add the enroll functionality
      setEnrollments([]);
      setError(null);
    } catch (err: any) {
      setError(err.message || "Failed to load data");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = async (enrollmentId: string) => {
    if (window.confirm("Mark this enrollment as completed?")) {
      try {
        await schedulingService.enrollments.update(enrollmentId, {
          status: "COMPLETED",
        });
        await loadData();
      } catch (err: any) {
        setError(err.message || "Failed to complete enrollment");
      }
    }
  };

  const handleCancel = async (enrollmentId: string) => {
    if (window.confirm("Are you sure you want to drop this enrollment?")) {
      try {
        await schedulingService.enrollments.drop(enrollmentId);
        await loadData();
      } catch (err: any) {
        setError(err.message || "Failed to drop enrollment");
      }
    }
  };

  const handleIssueCertificate = async (enrollmentId: string) => {
    try {
      await schedulingService.enrollments.issueCertificate(enrollmentId);
      await loadData();
      alert("Certificate issued successfully!");
    } catch (err: any) {
      setError(err.message || "Failed to issue certificate");
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return "success";
      case "COMPLETED":
        return "info";
      case "CANCELLED":
        return "error";
      case "PENDING":
        return "warning";
      default:
        return "default";
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case "PAID":
        return "success";
      case "PARTIAL":
        return "warning";
      case "PENDING":
        return "error";
      default:
        return "default";
    }
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

  if (!trainingClass) {
    return (
      <Box p={3}>
        <Alert severity="error">Training class not found</Alert>
      </Box>
    );
  }

  const activeEnrollments = enrollments.filter(
    (e) => e.status === "ACTIVE" || e.status === "ENROLLED"
  );
  const completedEnrollments = enrollments.filter(
    (e) => e.status === "COMPLETED"
  );
  const cancelledEnrollments = enrollments.filter(
    (e) => e.status === "DROPPED"
  );

  return (
    <Box>
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb={3}
      >
        <Box>
          <Typography variant="h4">{trainingClass.name}</Typography>
          <Typography variant="body2" color="textSecondary">
            Enrollments: {activeEnrollments.length} /{" "}
            {trainingClass.maxCapacity}
          </Typography>
        </Box>
        <Button
          variant="outlined"
          onClick={() => navigate("/training/classes")}
        >
          Back to Classes
        </Button>
      </Box>

      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Class Info */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Box display="flex" gap={3}>
          <Box>
            <Typography variant="caption" color="textSecondary">
              Category
            </Typography>
            <Typography variant="body1">{trainingClass.category}</Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="textSecondary">
              Level
            </Typography>
            <Typography variant="body1">{trainingClass.level}</Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="textSecondary">
              Schedule
            </Typography>
            <Typography variant="body1">
              {trainingClass.startTime} - {trainingClass.endTime}
            </Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="textSecondary">
              Duration
            </Typography>
            <Typography variant="body1">
              {trainingClass.totalWeeks} weeks
            </Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="textSecondary">
              Price
            </Typography>
            <Typography variant="body1">
              ${trainingClass.pricePerSeries}
            </Typography>
          </Box>
        </Box>
      </Paper>

      {/* Tabs */}
      <Paper sx={{ mb: 2 }}>
        <Tabs value={selectedTab} onChange={(e, v) => setSelectedTab(v)}>
          <Tab label={`Active (${activeEnrollments.length})`} />
          <Tab label={`Completed (${completedEnrollments.length})`} />
          <Tab label={`Cancelled (${cancelledEnrollments.length})`} />
        </Tabs>
      </Paper>

      {/* Enrollment List */}
      <Paper>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Pet</TableCell>
                <TableCell>Customer</TableCell>
                <TableCell>Enrolled Date</TableCell>
                <TableCell>Payment</TableCell>
                <TableCell>Progress</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(selectedTab === 0
                ? activeEnrollments
                : selectedTab === 1
                ? completedEnrollments
                : cancelledEnrollments
              ).length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    <Typography color="textSecondary" py={4}>
                      No enrollments in this category
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                (selectedTab === 0
                  ? activeEnrollments
                  : selectedTab === 1
                  ? completedEnrollments
                  : cancelledEnrollments
                ).map((enrollment) => (
                  <TableRow key={enrollment.id}>
                    <TableCell>{enrollment.pet?.name || "Unknown"}</TableCell>
                    <TableCell>
                      {enrollment.customer
                        ? `${enrollment.customer.firstName} ${enrollment.customer.lastName}`
                        : "Unknown"}
                    </TableCell>
                    <TableCell>
                      {new Date(enrollment.enrollmentDate).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={enrollment.paymentStatus}
                        color={getPaymentStatusColor(enrollment.paymentStatus)}
                        size="small"
                      />
                      <Typography variant="caption" display="block">
                        ${enrollment.amountPaid}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {enrollment.sessionsAttended || 0} /{" "}
                        {trainingClass.totalWeeks} sessions
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={enrollment.status}
                        color={getStatusColor(enrollment.status)}
                        size="small"
                      />
                      {enrollment.certificateIssued && (
                        <Chip
                          icon={<CertificateIcon />}
                          label="Certified"
                          size="small"
                          color="success"
                          sx={{ ml: 1 }}
                        />
                      )}
                    </TableCell>
                    <TableCell align="right">
                      {enrollment.status === "ACTIVE" && (
                        <>
                          <Tooltip title="Mark Complete">
                            <IconButton
                              size="small"
                              onClick={() => handleComplete(enrollment.id)}
                              color="success"
                            >
                              <CompleteIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Cancel">
                            <IconButton
                              size="small"
                              onClick={() => handleCancel(enrollment.id)}
                              color="error"
                            >
                              <CancelIcon />
                            </IconButton>
                          </Tooltip>
                        </>
                      )}
                      {enrollment.status === "COMPLETED" &&
                        !enrollment.certificateIssued && (
                          <Tooltip title="Issue Certificate">
                            <IconButton
                              size="small"
                              onClick={() =>
                                handleIssueCertificate(enrollment.id)
                              }
                              color="primary"
                            >
                              <CertificateIcon />
                            </IconButton>
                          </Tooltip>
                        )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
};

export default ClassEnrollments;
