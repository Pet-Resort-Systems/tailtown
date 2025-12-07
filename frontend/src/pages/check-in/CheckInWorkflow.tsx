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
import PetSummaryCard from "../../components/check-in/PetSummaryCard";
import MultiPetCheckIn from "../../components/check-in/MultiPetCheckIn";
import { customerService } from "../../services/customerService";

const STEPS = [
  "Pet Summary",
  "Questionnaire",
  "Medications",
  "Belongings",
  "Service Agreement",
  "Review & Complete",
];

// Local storage key for draft check-ins
const DRAFT_STORAGE_KEY = "tailtown_checkin_draft_";

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
  const [pet, setPet] = useState<any>(null);
  const [hasDraft, setHasDraft] = useState(false);
  const [stepCompletion, setStepCompletion] = useState<{
    [key: number]: boolean;
  }>({});
  const [isMultiPet, setIsMultiPet] = useState(false);
  const [selectedPetIds, setSelectedPetIds] = useState<string[]>([]);
  const [selectedReservationIds, setSelectedReservationIds] = useState<
    string[]
  >([]);
  const [allPets, setAllPets] = useState<any[]>([]);

  useEffect(() => {
    loadData();
    checkForDraft();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reservationId]);

  // Auto-save draft on data changes
  useEffect(() => {
    if (reservation && !loading) {
      saveDraft();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [responses, medications, belongings, activeStep]);

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

      // Load pet details
      if (resData.petId) {
        try {
          const petData = await customerService.getPetById(resData.petId);
          setPet(petData);
        } catch (petErr) {
          console.error("Error loading pet:", petErr);
        }
      }
    } catch (err: any) {
      console.error("Error loading check-in data:", err);
      setError(err.response?.data?.message || "Failed to load check-in data");
    } finally {
      setLoading(false);
    }
  };

  const handleNext = () => {
    // Validate current step
    if (activeStep === 1 && !validateQuestionnaire()) {
      setError("Please answer all required questions");
      return;
    }
    if (activeStep === 4 && !validateAgreement()) {
      setError("Please complete the service agreement");
      return;
    }

    // Mark current step as complete
    setStepCompletion((prev) => ({ ...prev, [activeStep]: true }));
    setError(null);
    setActiveStep((prev) => prev + 1);
  };

  const handleBack = () => {
    setError(null);
    setActiveStep((prev) => prev - 1);
  };

  // Draft management functions
  const getDraftKey = () => `${DRAFT_STORAGE_KEY}${reservationId}`;

  const saveDraft = () => {
    const draft = {
      activeStep,
      responses,
      medications,
      belongings,
      initials,
      stepCompletion,
      savedAt: new Date().toISOString(),
    };
    localStorage.setItem(getDraftKey(), JSON.stringify(draft));
  };

  const checkForDraft = () => {
    const draftStr = localStorage.getItem(getDraftKey());
    if (draftStr) {
      setHasDraft(true);
    }
  };

  const loadDraft = () => {
    const draftStr = localStorage.getItem(getDraftKey());
    if (draftStr) {
      try {
        const draft = JSON.parse(draftStr);
        setActiveStep(draft.activeStep || 0);
        setResponses(draft.responses || {});
        setMedications(draft.medications || []);
        setBelongings(draft.belongings || []);
        setInitials(draft.initials || {});
        setStepCompletion(draft.stepCompletion || {});
        setHasDraft(false);
      } catch (e) {
        console.error("Error loading draft:", e);
      }
    }
  };

  const clearDraft = () => {
    localStorage.removeItem(getDraftKey());
    setHasDraft(false);
  };

  const handleUpdatePet = async (updates: Partial<any>) => {
    if (!pet) return;
    try {
      await customerService.updatePet(pet.id, updates);
      setPet({ ...pet, ...updates });
    } catch (err) {
      console.error("Error updating pet:", err);
    }
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

      // Check if this is a multi-pet check-in
      if (isMultiPet && selectedPetIds.length > 1) {
        // Batch check-in for multiple pets
        const checkIns = selectedReservationIds.map((resId, index) => ({
          petId: selectedPetIds[index],
          customerId: reservation.customerId,
          reservationId: resId,
          responses: responseArray,
        }));

        const sharedData = {
          templateId: template?.id,
          checkInBy: "staff",
          medications,
          belongings,
        };

        const batchResult = await checkInService.batchCheckIn(
          checkIns,
          sharedData
        );

        // Create service agreement for primary pet
        if (batchResult.data.successful.length > 0) {
          const primaryCheckIn = batchResult.data.successful[0];
          const agreementData = {
            checkInId: primaryCheckIn.checkIn.id,
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
        }

        // Navigate to confirmation
        navigate(
          `/check-in/batch-complete?count=${batchResult.data.successCount}`
        );
      } else {
        // Single pet check-in
        const checkInData = {
          petId: reservation.petId,
          customerId: reservation.customerId,
          reservationId: reservation.id,
          templateId: template?.id,
          checkInBy: "staff",
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
      }

      // Clear draft on successful submission
      clearDraft();
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
          {pet?.name || reservation?.pet?.name} - {customerName}
        </Typography>

        {/* Draft Resume Banner */}
        {hasDraft && (
          <Alert
            severity="info"
            sx={{ mb: 3 }}
            action={
              <Box>
                <Button
                  color="inherit"
                  size="small"
                  onClick={loadDraft}
                  sx={{ mr: 1 }}
                >
                  Resume
                </Button>
                <Button color="inherit" size="small" onClick={clearDraft}>
                  Start Fresh
                </Button>
              </Box>
            }
          >
            You have an unfinished check-in. Would you like to resume where you
            left off?
          </Alert>
        )}

        {/* Step Progress Indicator */}
        <Paper sx={{ p: 3, mb: 3 }}>
          <Stepper activeStep={activeStep}>
            {STEPS.map((label, index) => (
              <Step key={label} completed={stepCompletion[index]}>
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

        {/* Step 0: Pet Summary with Multi-Pet Detection */}
        {activeStep === 0 && (
          <>
            {/* Multi-pet check-in selector */}
            <MultiPetCheckIn
              reservationId={reservationId!}
              onSelectPets={(petIds, reservationIds) => {
                setSelectedPetIds(petIds);
                setSelectedReservationIds(reservationIds);
                setIsMultiPet(petIds.length > 1);
                // Load all selected pets
                Promise.all(
                  petIds.map((id) => customerService.getPetById(id))
                ).then((pets) => setAllPets(pets));
              }}
              onSinglePetCheckIn={() => {
                setIsMultiPet(false);
                setSelectedPetIds([reservation?.petId]);
                setSelectedReservationIds([reservationId!]);
              }}
            />
            {/* Current pet summary */}
            {pet && (
              <PetSummaryCard
                pet={pet}
                onUpdatePet={handleUpdatePet}
                showEditButtons={true}
              />
            )}
            {/* Show other selected pets if multi-pet */}
            {isMultiPet && allPets.length > 1 && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle1" gutterBottom>
                  Additional Pets Being Checked In:
                </Typography>
                {allPets
                  .filter((p) => p.id !== pet?.id)
                  .map((otherPet) => (
                    <PetSummaryCard
                      key={otherPet.id}
                      pet={otherPet}
                      showEditButtons={false}
                    />
                  ))}
              </Box>
            )}
          </>
        )}
        {activeStep === 1 && renderQuestionnaireStep()}
        {activeStep === 2 && (
          <MedicationForm medications={medications} onChange={setMedications} />
        )}
        {activeStep === 3 && (
          <BelongingsForm belongings={belongings} onChange={setBelongings} />
        )}
        {activeStep === 4 && renderAgreementStep()}
        {activeStep === 5 && renderReviewStep()}

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
