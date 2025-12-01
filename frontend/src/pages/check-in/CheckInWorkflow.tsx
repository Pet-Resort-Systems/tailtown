import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Container,
  Box,
  Paper,
  Stepper,
  Step,
  StepLabel,
  Button,
  Typography,
  CircularProgress,
  Alert,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Divider,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import checkInService, {
  CheckInTemplate,
  CheckInResponse,
  CheckInMedication,
  CheckInBelonging,
} from "../../services/checkInService";
import { reservationService } from "../../services/reservationService";
import MedicationForm from "../../components/check-in/MedicationForm";
import BelongingsForm from "../../components/check-in/BelongingsForm";
import SignatureCapture from "../../components/check-in/SignatureCapture";

const STEPS = [
  "Questionnaire",
  "Medications",
  "Belongings",
  "Service Agreement",
  "Review & Complete",
];

const CheckInWorkflow: React.FC = () => {
  const { reservationId } = useParams<{ reservationId: string }>();
  const navigate = useNavigate();

  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Data
  const [reservation, setReservation] = useState<any>(null);
  const [template, setTemplate] = useState<CheckInTemplate | null>(null);
  const [agreementTemplate, setAgreementTemplate] = useState<any>(null);
  const [responses, setResponses] = useState<{ [key: string]: any }>({});
  const [medications, setMedications] = useState<CheckInMedication[]>([]);
  const [belongings, setBelongings] = useState<CheckInBelonging[]>([]);
  const [signature, setSignature] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [initials, setInitials] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reservationId]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load reservation
      const resData = await reservationService.getReservationById(
        reservationId!
      );
      setReservation(resData);
      setCustomerName(
        `${resData.customer?.firstName} ${resData.customer?.lastName}`
      );

      // Load check-in template
      const templateData = await checkInService.getDefaultTemplate();
      setTemplate(templateData.data);

      // Load service agreement template
      const agreementData = await checkInService.getDefaultAgreementTemplate();
      setAgreementTemplate(agreementData.data);
    } catch (err: any) {
      console.error("Error loading check-in data:", err);
      setError(err.response?.data?.message || "Failed to load check-in data");
    } finally {
      setLoading(false);
    }
  };

  const handleNext = () => {
    // Validate current step
    if (activeStep === 0 && !validateQuestionnaire()) {
      setError("Please answer all required questions");
      return;
    }
    if (activeStep === 3 && !validateAgreement()) {
      setError("Please complete the service agreement");
      return;
    }

    setError(null);
    setActiveStep((prev) => prev + 1);
  };

  const handleBack = () => {
    setError(null);
    setActiveStep((prev) => prev - 1);
  };

  const validateQuestionnaire = () => {
    if (!template) return false;

    for (const section of template.sections) {
      for (const question of section.questions) {
        if (question.isRequired && !responses[question.id]) {
          return false;
        }
      }
    }
    return true;
  };

  const validateAgreement = () => {
    return signature && customerName;
  };

  const handleSubmit = async () => {
    try {
      setSubmitting(true);
      setError(null);

      // Prepare responses array
      const responseArray: CheckInResponse[] = Object.entries(responses).map(
        ([questionId, response]) => ({
          questionId,
          response,
        })
      );

      // Create check-in
      const checkInData = {
        petId: reservation.petId,
        customerId: reservation.customerId,
        reservationId: reservation.id,
        templateId: template?.id,
        checkInBy: "staff", // TODO: Get from auth context
        responses: responseArray,
        medications,
        belongings,
      };

      const checkInResult = await checkInService.createCheckIn(checkInData);

      // Create service agreement
      const agreementData = {
        checkInId: checkInResult.data.id,
        agreementText: agreementTemplate.content,
        initials: Object.entries(initials).map(([section, value]) => ({
          section,
          initials: value,
          timestamp: new Date().toISOString(),
        })),
        signature,
        signedBy: customerName,
      };

      await checkInService.createServiceAgreement(agreementData);

      // Update reservation status to CHECKED_IN
      await reservationService.updateReservation(reservationId!, {
        status: "CHECKED_IN",
      });

      // Success! Navigate to confirmation
      navigate(`/check-in/${checkInResult.data.id}/complete`);
    } catch (err: any) {
      console.error("Error creating check-in:", err);
      setError(err.response?.data?.message || "Failed to create check-in");
    } finally {
      setSubmitting(false);
    }
  };

  const renderQuestionnaireStep = () => {
    if (!template) return null;

    return (
      <Box>
        {template.sections.map((section) => (
          <Paper key={section.id} sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              {section.title}
            </Typography>
            {section.description && (
              <Typography variant="body2" color="text.secondary" paragraph>
                {section.description}
              </Typography>
            )}

            <Grid container spacing={2}>
              {section.questions.map((question) => (
                <Grid item xs={12} key={question.id}>
                  {renderQuestion(question)}
                </Grid>
              ))}
            </Grid>
          </Paper>
        ))}
      </Box>
    );
  };

  const renderQuestion = (question: any) => {
    const value = responses[question.id] || "";

    switch (question.questionType) {
      case "TEXT":
        return (
          <TextField
            fullWidth
            label={question.questionText}
            value={value}
            onChange={(e) =>
              setResponses({ ...responses, [question.id]: e.target.value })
            }
            placeholder={question.placeholder}
            helperText={question.helpText}
            required={question.isRequired}
          />
        );

      case "LONG_TEXT":
        return (
          <TextField
            fullWidth
            multiline
            rows={3}
            label={question.questionText}
            value={value}
            onChange={(e) =>
              setResponses({ ...responses, [question.id]: e.target.value })
            }
            placeholder={question.placeholder}
            helperText={question.helpText}
            required={question.isRequired}
          />
        );

      case "NUMBER":
        return (
          <TextField
            fullWidth
            type="number"
            label={question.questionText}
            value={value}
            onChange={(e) =>
              setResponses({ ...responses, [question.id]: e.target.value })
            }
            placeholder={question.placeholder}
            helperText={question.helpText}
            required={question.isRequired}
          />
        );

      case "YES_NO":
        return (
          <FormControl fullWidth required={question.isRequired}>
            <InputLabel>{question.questionText}</InputLabel>
            <Select
              value={value}
              onChange={(e) =>
                setResponses({ ...responses, [question.id]: e.target.value })
              }
              label={question.questionText}
            >
              <MenuItem value="yes">Yes</MenuItem>
              <MenuItem value="no">No</MenuItem>
            </Select>
            {question.helpText && (
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ mt: 0.5 }}
              >
                {question.helpText}
              </Typography>
            )}
          </FormControl>
        );

      case "MULTIPLE_CHOICE":
        return (
          <FormControl fullWidth required={question.isRequired}>
            <InputLabel>{question.questionText}</InputLabel>
            <Select
              value={value}
              onChange={(e) =>
                setResponses({ ...responses, [question.id]: e.target.value })
              }
              label={question.questionText}
            >
              {question.options?.choices?.map((choice: string) => (
                <MenuItem key={choice} value={choice}>
                  {choice}
                </MenuItem>
              ))}
            </Select>
            {question.helpText && (
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ mt: 0.5 }}
              >
                {question.helpText}
              </Typography>
            )}
          </FormControl>
        );

      case "TIME":
        return (
          <TextField
            fullWidth
            type="time"
            label={question.questionText}
            value={value}
            onChange={(e) =>
              setResponses({ ...responses, [question.id]: e.target.value })
            }
            helperText={question.helpText}
            required={question.isRequired}
            InputLabelProps={{ shrink: true }}
          />
        );

      case "DATE":
        return (
          <TextField
            fullWidth
            type="date"
            label={question.questionText}
            value={value}
            onChange={(e) =>
              setResponses({ ...responses, [question.id]: e.target.value })
            }
            helperText={question.helpText}
            required={question.isRequired}
            InputLabelProps={{ shrink: true }}
          />
        );

      default:
        return null;
    }
  };

  const renderAgreementStep = () => {
    if (!agreementTemplate) return null;

    return (
      <Box>
        <Paper sx={{ p: 3, mb: 3, maxHeight: "400px", overflow: "auto" }}>
          <Typography variant="body1" sx={{ whiteSpace: "pre-line" }}>
            {agreementTemplate.content
              .replace(/{{CUSTOMER_NAME}}/g, customerName)
              .replace(/{{PET_NAME}}/g, reservation?.pet?.name || "")
              .replace(/{{DATE}}/g, new Date().toLocaleDateString())
              .replace(
                /{{CHECKIN_DATE}}/g,
                new Date(reservation?.startDate).toLocaleDateString()
              )
              .replace(
                /{{CHECKOUT_DATE}}/g,
                new Date(reservation?.endDate).toLocaleDateString()
              )
              .replace(/{{INITIAL_\d+}}/g, "[_____]")
              .replace(/{{SIGNATURE}}/g, "")}
          </Typography>
        </Paper>

        <Paper sx={{ p: 3, mb: 3 }}>
          <TextField
            fullWidth
            label="Your Full Name *"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            required
            sx={{ mb: 3 }}
          />

          <SignatureCapture onSignature={setSignature} label="Sign Below *" />
        </Paper>
      </Box>
    );
  };

  const renderReviewStep = () => {
    return (
      <Box>
        <Paper sx={{ p: 3, mb: 2 }}>
          <Typography variant="h6" gutterBottom>
            Check-In Summary
          </Typography>
          <Divider sx={{ my: 2 }} />

          <Grid container spacing={2}>
            <Grid item xs={6}>
              <Typography variant="subtitle2" color="text.secondary">
                Pet
              </Typography>
              <Typography>{reservation?.pet?.name}</Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography variant="subtitle2" color="text.secondary">
                Customer
              </Typography>
              <Typography>{customerName}</Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography variant="subtitle2" color="text.secondary">
                Check-In Date
              </Typography>
              <Typography>
                {new Date(reservation?.startDate).toLocaleDateString()}
              </Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography variant="subtitle2" color="text.secondary">
                Check-Out Date
              </Typography>
              <Typography>
                {new Date(reservation?.endDate).toLocaleDateString()}
              </Typography>
            </Grid>
          </Grid>
        </Paper>

        <Paper sx={{ p: 3, mb: 2 }}>
          <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
            Medications: {medications.length}
          </Typography>
          {medications.map((med, i) => (
            <Typography key={i} variant="body2">
              • {med.medicationName} - {med.dosage} - {med.frequency}
            </Typography>
          ))}
        </Paper>

        <Paper sx={{ p: 3, mb: 2 }}>
          <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
            Belongings: {belongings.length}
          </Typography>
          {belongings.map((item, i) => (
            <Typography key={i} variant="body2">
              • {item.quantity}x {item.itemType} - {item.description}
            </Typography>
          ))}
        </Paper>

        <Paper sx={{ p: 3 }}>
          <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
            Service Agreement
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Signed by: {customerName}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Signature: {signature ? "✓ Captured" : "✗ Missing"}
          </Typography>
        </Paper>
      </Box>
    );
  };

  if (loading) {
    return (
      <Container>
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            minHeight: "400px",
          }}
        >
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg">
      <Box sx={{ py: 4 }}>
        <Typography variant="h4" gutterBottom>
          Pet Check-In
        </Typography>
        <Typography variant="subtitle1" color="text.secondary" paragraph>
          {reservation?.pet?.name} - {customerName}
        </Typography>

        <Paper sx={{ p: 3, mb: 3 }}>
          <Stepper activeStep={activeStep}>
            {STEPS.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>
        </Paper>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {activeStep === 0 && renderQuestionnaireStep()}
        {activeStep === 1 && (
          <MedicationForm medications={medications} onChange={setMedications} />
        )}
        {activeStep === 2 && (
          <BelongingsForm belongings={belongings} onChange={setBelongings} />
        )}
        {activeStep === 3 && renderAgreementStep()}
        {activeStep === 4 && renderReviewStep()}

        <Box sx={{ display: "flex", justifyContent: "space-between", mt: 3 }}>
          <Button
            disabled={activeStep === 0}
            onClick={handleBack}
            startIcon={<ArrowBackIcon />}
          >
            Back
          </Button>

          {activeStep < STEPS.length - 1 ? (
            <Button
              variant="contained"
              onClick={handleNext}
              endIcon={<ArrowForwardIcon />}
            >
              Next
            </Button>
          ) : (
            <Button
              variant="contained"
              color="success"
              onClick={handleSubmit}
              disabled={submitting}
              startIcon={
                submitting ? (
                  <CircularProgress size={20} />
                ) : (
                  <CheckCircleIcon />
                )
              }
            >
              {submitting ? "Completing..." : "Complete Check-In"}
            </Button>
          )}
        </Box>
      </Box>
    </Container>
  );
};

export default CheckInWorkflow;
