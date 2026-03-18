import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
  Link,
  Tooltip,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningIcon from '@mui/icons-material/Warning';
import InfoIcon from '@mui/icons-material/Info';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import RestaurantIcon from '@mui/icons-material/Restaurant';
import GroupsIcon from '@mui/icons-material/Groups';
import checkInService, {
  CheckInTemplate,
  CheckInResponse,
  CheckInMedication,
  CheckInBelonging,
} from '../../services/checkInService';
import { reservationService } from '../../services/reservationService';
import MedicationForm from '../../components/check-in/MedicationForm';
import BelongingsForm from '../../components/check-in/BelongingsForm';
import SignatureCapture from '../../components/check-in/SignatureCapture';
import PetSummaryCard from '../../components/check-in/PetSummaryCard';
import MultiPetCheckIn from '../../components/check-in/MultiPetCheckIn';
import { customerService } from '../../services/customerService';

const STEPS = [
  'Pet Summary',
  'Questionnaire',
  'Medications',
  'Belongings',
  'Service Agreement',
  'Review & Complete',
];

// Local storage key for draft check-ins
const DRAFT_STORAGE_KEY = 'tailtown_checkin_draft_';

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
  const [signature, setSignature] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [initials, setInitials] = useState<{ [key: string]: string }>({});
  const [pet, setPet] = useState<any>(null);
  const [existingAgreement, setExistingAgreement] = useState<any>(null);
  const [hasDraft, setHasDraft] = useState(false);
  const [draftCheckInId, setDraftCheckInId] = useState<string | null>(null);
  const [savingDraft, setSavingDraft] = useState(false);
  const [stepCompletion, setStepCompletion] = useState<{
    [key: number]: boolean;
  }>({});
  const [isMultiPet, setIsMultiPet] = useState(false);
  const [selectedPetIds, setSelectedPetIds] = useState<string[]>([]);
  const [selectedReservationIds, setSelectedReservationIds] = useState<
    string[]
  >([]);
  const [allPets, setAllPets] = useState<any[]>([]);
  const [customer, setCustomer] = useState<any>(null);

  useEffect(() => {
    loadData();
    loadServerDraft();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reservationId]);

  // Auto-save draft to server on step changes
  useEffect(() => {
    if (reservation && !loading && activeStep > 0) {
      saveDraftToServer();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeStep]);

  // Auto-save when signature is captured
  useEffect(() => {
    if (reservation && !loading && signature) {
      saveDraftToServer();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature]);

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
          console.error('Error loading pet:', petErr);
        }
      }

      // Load customer details for emergency contact
      if (resData.customerId) {
        try {
          const customerData = await customerService.getCustomerById(
            resData.customerId
          );
          setCustomer(customerData);
        } catch (custErr) {
          console.error('Error loading customer:', custErr);
        }
      }

      // Check if there's an existing completed check-in with a service agreement
      try {
        const checkInsResponse = await checkInService.getCheckInsByReservation(
          reservationId!
        );
        const completedCheckIn = checkInsResponse.data?.find(
          (c: any) => c.status === 'COMPLETED'
        );
        if (completedCheckIn) {
          // Try to load the service agreement for this check-in
          try {
            const agreementResponse =
              await checkInService.getAgreementByCheckIn(completedCheckIn.id);
            if (agreementResponse?.data?.signature) {
              setExistingAgreement(agreementResponse.data);
              setSignature(agreementResponse.data.signature);
              setCustomerName(agreementResponse.data.signedBy || '');
            }
          } catch (agreementErr) {
            // No agreement found, that's ok
          }
        }
      } catch (checkInErr) {
        // No check-ins found, that's ok
      }
    } catch (err: any) {
      console.error('Error loading check-in data:', err);
      setError(err.response?.data?.message || 'Failed to load check-in data');
    } finally {
      setLoading(false);
    }
  };

  const handleNext = () => {
    // Validate current step
    if (activeStep === 1 && !validateQuestionnaire()) {
      setError('Please answer all required questions');
      return;
    }
    if (activeStep === 4 && !validateAgreement()) {
      setError('Please complete the service agreement');
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

  // Draft management functions - now uses server-side storage
  const getDraftKey = () => `${DRAFT_STORAGE_KEY}${reservationId}`;

  const saveDraftToServer = async () => {
    if (!reservation || savingDraft) return;

    try {
      setSavingDraft(true);
      const responseArray = Object.entries(responses).map(
        ([questionId, response]) => ({ questionId, response })
      );

      const result = await checkInService.saveDraft({
        checkInId: draftCheckInId || undefined,
        petId: reservation.petId,
        customerId: reservation.customerId,
        reservationId: reservationId!,
        templateId: template?.id,
        currentStep: activeStep,
        responses: responseArray.length > 0 ? responseArray : undefined,
        medications: medications.length > 0 ? medications : undefined,
        belongings: belongings.length > 0 ? belongings : undefined,
      });

      if (result.data?.id) {
        setDraftCheckInId(result.data.id);
      }

      // Also save to localStorage as backup
      const draft = {
        activeStep,
        responses,
        medications,
        belongings,
        initials,
        stepCompletion,
        signature,
        customerName,
        savedAt: new Date().toISOString(),
      };
      localStorage.setItem(getDraftKey(), JSON.stringify(draft));
    } catch (err) {
      console.error('Error saving draft to server:', err);
      // Fall back to localStorage only
      const draft = {
        activeStep,
        responses,
        medications,
        belongings,
        initials,
        stepCompletion,
        signature,
        customerName,
        savedAt: new Date().toISOString(),
      };
      localStorage.setItem(getDraftKey(), JSON.stringify(draft));
    } finally {
      setSavingDraft(false);
    }
  };

  const loadServerDraft = async () => {
    try {
      const result = await checkInService.getDraft(reservationId!);
      if (result.data) {
        const draft = result.data;
        setDraftCheckInId(draft.id);
        setActiveStep(draft.currentStep || 0);
        setHasDraft(true);

        // Load responses
        if (draft.responses && draft.responses.length > 0) {
          const respObj: { [key: string]: any } = {};
          draft.responses.forEach((r: any) => {
            respObj[r.questionId] = r.response;
          });
          setResponses(respObj);
        }

        // Load medications
        if (draft.medications && draft.medications.length > 0) {
          setMedications(draft.medications);
        }

        // Load belongings
        if (draft.belongings && draft.belongings.length > 0) {
          setBelongings(draft.belongings);
        }

        // Mark completed steps
        const completion: { [key: number]: boolean } = {};
        for (let i = 0; i < draft.currentStep; i++) {
          completion[i] = true;
        }
        setStepCompletion(completion);

        // Load signature from localStorage (not stored on server)
        const localDraftStr = localStorage.getItem(getDraftKey());
        if (localDraftStr) {
          try {
            const localDraft = JSON.parse(localDraftStr);
            if (localDraft.signature) setSignature(localDraft.signature);
            if (localDraft.customerName)
              setCustomerName(localDraft.customerName);
            if (localDraft.initials) setInitials(localDraft.initials);
          } catch (e) {
            console.error('Error loading signature from localStorage:', e);
          }
        }
      } else {
        // Check localStorage as fallback
        checkForLocalDraft();
      }
    } catch (err) {
      console.error('Error loading server draft:', err);
      checkForLocalDraft();
    }
  };

  const checkForLocalDraft = () => {
    const draftStr = localStorage.getItem(getDraftKey());
    if (draftStr) {
      setHasDraft(true);
    }
  };

  const loadDraft = () => {
    // If we have a server draft, it's already loaded
    if (draftCheckInId) {
      setHasDraft(false);
      return;
    }

    // Fall back to localStorage
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
        if (draft.signature) setSignature(draft.signature);
        if (draft.customerName) setCustomerName(draft.customerName);
        setHasDraft(false);
      } catch (e) {
        console.error('Error loading draft:', e);
      }
    }
  };

  const clearDraft = () => {
    localStorage.removeItem(getDraftKey());
    setDraftCheckInId(null);
    setHasDraft(false);
  };

  const handleUpdatePet = async (updates: Partial<any>) => {
    if (!pet) return;
    try {
      await customerService.updatePet(pet.id, updates);
      setPet({ ...pet, ...updates });
    } catch (err) {
      console.error('Error updating pet:', err);
    }
  };

  const handleUpdateCustomer = async (updates: {
    emergencyContact?: string;
    emergencyPhone?: string;
  }) => {
    if (!customer) return;
    try {
      await customerService.updateCustomer(customer.id, updates);
      setCustomer({ ...customer, ...updates });
    } catch (err) {
      console.error('Error updating customer:', err);
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

  // Get validation status for each step
  const getStepStatus = (
    stepIndex: number
  ): 'complete' | 'error' | 'warning' | 'pending' => {
    if (stepCompletion[stepIndex]) return 'complete';

    switch (stepIndex) {
      case 0: // Pet Summary - check for expired vaccines
        if (pet?.vaccineExpirations) {
          const today = new Date();
          const hasExpired = Object.values(pet.vaccineExpirations).some(
            (expDate: any) => new Date(expDate) < today
          );
          if (hasExpired) return 'error';
        }
        return 'pending';
      case 1: // Questionnaire
        if (Object.keys(responses).length > 0 && !validateQuestionnaire()) {
          return 'warning'; // Partially filled
        }
        return Object.keys(responses).length > 0 ? 'complete' : 'pending';
      case 2: // Medications
        return medications.length > 0 ? 'complete' : 'pending';
      case 3: // Belongings
        return belongings.length > 0 ? 'complete' : 'pending';
      case 4: // Service Agreement
        if (existingAgreement) return 'complete';
        if (signature && customerName) return 'complete';
        if (signature || customerName) return 'warning';
        return 'pending';
      case 5: // Review
        return 'pending';
      default:
        return 'pending';
    }
  };

  // Extract feeding schedule summary from questionnaire responses
  const getFeedingScheduleSummary = (): string | null => {
    if (!template || Object.keys(responses).length === 0) return null;

    const feedingSection = template.sections.find((s) =>
      s.title.toLowerCase().includes('feeding')
    );
    if (!feedingSection) return null;

    const parts: string[] = [];

    for (const question of feedingSection.questions) {
      const response = responses[question.id];
      if (!response) continue;

      const qText = question.questionText.toLowerCase();

      if (qText.includes('when') && qText.includes('fed')) {
        parts.push(response);
      } else if (qText.includes('how much') || qText.includes('per meal')) {
        parts.push(response);
      } else if (qText.includes('meals per day')) {
        parts.push(`${response} meals/day`);
      }
    }

    return parts.length > 0 ? parts.join(', ') : null;
  };

  // Check if all required steps are complete for final submission
  const canSubmit = () => {
    // Questionnaire must be valid
    if (!validateQuestionnaire()) return false;
    // Agreement must be signed (unless already exists)
    if (!existingAgreement && !validateAgreement()) return false;
    return true;
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
          checkInBy: 'staff',
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
            customerId: reservation.customerId,
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
          checkInBy: 'staff',
          responses: responseArray,
          medications,
          belongings,
        };

        const checkInResult = await checkInService.createCheckIn(checkInData);

        // Create service agreement
        const agreementData = {
          checkInId: checkInResult.data.id,
          customerId: reservation.customerId,
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
          status: 'CHECKED_IN',
        });

        // Success! Navigate to confirmation
        navigate(`/check-in/${checkInResult.data.id}/complete`);
      }

      // Don't clear draft immediately - keep signature visible if user navigates back
      // Draft will be overwritten on next check-in for this reservation
    } catch (err: any) {
      console.error('Error creating check-in:', err);
      setError(err.response?.data?.message || 'Failed to create check-in');
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
    const value = responses[question.id] || '';

    switch (question.questionType) {
      case 'TEXT':
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

      case 'LONG_TEXT':
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

      case 'NUMBER':
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

      case 'YES_NO':
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

      case 'MULTIPLE_CHOICE':
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

      case 'TIME':
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

      case 'DATE':
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
        <Paper sx={{ p: 3, mb: 3, maxHeight: '400px', overflow: 'auto' }}>
          <Typography variant="body1" sx={{ whiteSpace: 'pre-line' }}>
            {agreementTemplate.content
              .replace(/{{CUSTOMER_NAME}}/g, customerName)
              .replace(/{{PET_NAME}}/g, reservation?.pet?.name || '')
              .replace(/{{DATE}}/g, new Date().toLocaleDateString())
              .replace(
                /{{CHECKIN_DATE}}/g,
                new Date(reservation?.startDate).toLocaleDateString()
              )
              .replace(
                /{{CHECKOUT_DATE}}/g,
                new Date(reservation?.endDate).toLocaleDateString()
              )
              .replace(/{{INITIAL_\d+}}/g, '[_____]')
              .replace(/{{SIGNATURE}}/g, '')}
          </Typography>
        </Paper>

        <Paper sx={{ p: 3, mb: 3 }}>
          <TextField
            fullWidth
            label="Your Full Name *"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            required
            disabled={!!existingAgreement}
            sx={{ mb: 3 }}
          />

          {existingAgreement ? (
            <Box>
              <Typography
                variant="subtitle2"
                color="text.secondary"
                gutterBottom
              >
                Signature (Already Signed)
              </Typography>
              <Paper
                variant="outlined"
                sx={{
                  p: 2,
                  backgroundColor: 'grey.50',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                }}
              >
                <img
                  src={existingAgreement.signature}
                  alt="Signature"
                  style={{
                    maxWidth: '100%',
                    maxHeight: '150px',
                    objectFit: 'contain',
                  }}
                />
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ mt: 1 }}
                >
                  Signed by {existingAgreement.signedBy} on{' '}
                  {new Date(existingAgreement.signedAt).toLocaleString()}
                </Typography>
              </Paper>
            </Box>
          ) : (
            <SignatureCapture
              onSignature={setSignature}
              label="Sign Below *"
              initialSignature={signature}
            />
          )}
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
            Signature: {signature ? '✓ Captured' : '✗ Missing'}
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
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '400px',
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

        {/* Step Progress Indicator with Status Icons */}
        <Paper sx={{ p: 3, mb: 3 }}>
          <Stepper activeStep={activeStep}>
            {STEPS.map((label, index) => {
              const status = getStepStatus(index);
              return (
                <Step
                  key={label}
                  completed={status === 'complete'}
                  sx={{ cursor: 'pointer' }}
                  onClick={() => setActiveStep(index)}
                >
                  <StepLabel
                    error={status === 'error'}
                    optional={
                      status === 'warning' ? (
                        <Typography variant="caption" color="warning.main">
                          Incomplete
                        </Typography>
                      ) : status === 'error' ? (
                        <Typography variant="caption" color="error">
                          Action Required
                        </Typography>
                      ) : null
                    }
                    StepIconProps={{
                      sx: {
                        color:
                          status === 'error'
                            ? 'error.main'
                            : status === 'warning'
                              ? 'warning.main'
                              : undefined,
                        cursor: 'pointer',
                      },
                    }}
                    sx={{
                      cursor: 'pointer',
                      '& .MuiStepLabel-label': {
                        cursor: 'pointer',
                      },
                    }}
                  >
                    {label}
                  </StepLabel>
                </Step>
              );
            })}
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
            {/* Integration Points - Quick Links */}
            <Paper sx={{ p: 2, mb: 3, bgcolor: 'grey.50' }}>
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} sm={6} md={3}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Reservation
                  </Typography>
                  <Link
                    href={`/reservations/${reservationId}`}
                    target="_blank"
                    sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
                  >
                    #{reservationId?.slice(0, 8)}...
                    <OpenInNewIcon fontSize="small" />
                  </Link>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Customer
                  </Typography>
                  <Link
                    href={`/customers/${reservation?.customerId}`}
                    target="_blank"
                    sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
                  >
                    {customerName}
                    <OpenInNewIcon fontSize="small" />
                  </Link>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Stay Dates
                  </Typography>
                  <Typography variant="body2">
                    {new Date(reservation?.startDate).toLocaleDateString()} -{' '}
                    {new Date(reservation?.endDate).toLocaleDateString()}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Assigned Room
                  </Typography>
                  <Typography variant="body2">
                    {reservation?.resource?.name || 'Not assigned'}
                  </Typography>
                </Grid>
              </Grid>
            </Paper>

            {/* Auto-populated Pet Profile Info */}
            {pet && (
              <Paper sx={{ p: 2, mb: 3 }}>
                <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                  <InfoIcon
                    sx={{ mr: 1, verticalAlign: 'middle', fontSize: 20 }}
                  />
                  Pet Profile (Auto-populated)
                </Typography>
                <Grid container spacing={2}>
                  {/* Playgroup */}
                  {(pet.playgroupCompatibility || pet.idealPlayGroup) && (
                    <Grid item xs={12} sm={6} md={4}>
                      <Box
                        sx={{ p: 1.5, bgcolor: 'primary.50', borderRadius: 1 }}
                      >
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          display="block"
                        >
                          <GroupsIcon
                            sx={{
                              fontSize: 14,
                              verticalAlign: 'middle',
                              mr: 0.5,
                            }}
                          />
                          Play Group
                        </Typography>
                        <Typography variant="body2" fontWeight="medium">
                          {pet.playgroupCompatibility?.replace(/_/g, ' ') ||
                            pet.idealPlayGroup}
                        </Typography>
                      </Box>
                    </Grid>
                  )}

                  {/* Feeding - prioritize questionnaire responses over stale pet data */}
                  {(getFeedingScheduleSummary() || pet.foodNotes) && (
                    <Grid item xs={12} sm={6} md={4}>
                      <Box sx={{ p: 1.5, bgcolor: 'info.50', borderRadius: 1 }}>
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          display="block"
                        >
                          <RestaurantIcon
                            sx={{
                              fontSize: 14,
                              verticalAlign: 'middle',
                              mr: 0.5,
                            }}
                          />
                          {getFeedingScheduleSummary()
                            ? 'Feeding Schedule'
                            : 'Feeding Notes (from profile)'}
                        </Typography>
                        <Typography variant="body2" fontWeight="medium">
                          {getFeedingScheduleSummary() || pet.foodNotes}
                        </Typography>
                      </Box>
                    </Grid>
                  )}

                  {/* Allergies */}
                  {pet.allergies && (
                    <Grid item xs={12} sm={6} md={4}>
                      <Box
                        sx={{ p: 1.5, bgcolor: 'error.50', borderRadius: 1 }}
                      >
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          display="block"
                        >
                          <WarningIcon
                            sx={{
                              fontSize: 14,
                              verticalAlign: 'middle',
                              mr: 0.5,
                            }}
                          />
                          Allergies
                        </Typography>
                        <Typography
                          variant="body2"
                          fontWeight="medium"
                          color="error.dark"
                        >
                          {pet.allergies}
                        </Typography>
                      </Box>
                    </Grid>
                  )}

                  {/* Medications */}
                  {pet.medicationNotes && (
                    <Grid item xs={12} sm={6} md={4}>
                      <Box
                        sx={{ p: 1.5, bgcolor: 'warning.50', borderRadius: 1 }}
                      >
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          display="block"
                        >
                          💊 Medications
                        </Typography>
                        <Typography variant="body2" fontWeight="medium">
                          {pet.medicationNotes}
                        </Typography>
                      </Box>
                    </Grid>
                  )}

                  {/* Behavior Notes */}
                  {pet.behaviorNotes && (
                    <Grid item xs={12} sm={6} md={4}>
                      <Box
                        sx={{ p: 1.5, bgcolor: 'warning.50', borderRadius: 1 }}
                      >
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          display="block"
                        >
                          ⚠️ Behavior Notes
                        </Typography>
                        <Typography variant="body2" fontWeight="medium">
                          {pet.behaviorNotes}
                        </Typography>
                      </Box>
                    </Grid>
                  )}

                  {/* Special Needs */}
                  {pet.specialNeeds && (
                    <Grid item xs={12} sm={6} md={4}>
                      <Box
                        sx={{ p: 1.5, bgcolor: 'warning.50', borderRadius: 1 }}
                      >
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          display="block"
                        >
                          🏥 Special Needs
                        </Typography>
                        <Typography variant="body2" fontWeight="medium">
                          {pet.specialNeeds}
                        </Typography>
                      </Box>
                    </Grid>
                  )}
                </Grid>
                {!pet.playgroupCompatibility &&
                  !pet.idealPlayGroup &&
                  !pet.foodNotes &&
                  !pet.allergies &&
                  !pet.medicationNotes &&
                  !pet.behaviorNotes &&
                  !pet.specialNeeds && (
                    <Typography variant="body2" color="text.secondary">
                      No special preferences on file for this pet.
                    </Typography>
                  )}
              </Paper>
            )}

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
                emergencyContact={customer?.emergencyContact}
                emergencyPhone={customer?.emergencyPhone}
                onUpdateCustomer={handleUpdateCustomer}
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
          <BelongingsForm
            belongings={belongings}
            onChange={setBelongings}
            petId={pet?.id || reservation?.petId}
          />
        )}
        {activeStep === 4 && renderAgreementStep()}
        {activeStep === 5 && renderReviewStep()}

        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
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
            <Tooltip
              title={
                !canSubmit()
                  ? 'Please complete all required fields (questionnaire and service agreement)'
                  : ''
              }
            >
              <span>
                <Button
                  variant="contained"
                  color="success"
                  onClick={handleSubmit}
                  disabled={submitting || !canSubmit()}
                  startIcon={
                    submitting ? (
                      <CircularProgress size={20} />
                    ) : (
                      <CheckCircleIcon />
                    )
                  }
                >
                  {submitting ? 'Completing...' : 'Complete Check-In'}
                </Button>
              </span>
            </Tooltip>
          )}
        </Box>
      </Box>
    </Container>
  );
};

export default CheckInWorkflow;
