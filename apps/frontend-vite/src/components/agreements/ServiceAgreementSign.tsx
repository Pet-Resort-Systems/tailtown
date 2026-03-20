import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  TextField,
  Checkbox,
  FormControlLabel,
  Alert,
  CircularProgress,
  Divider,
  Stepper,
  Step,
  StepLabel,
  StepContent,
} from '@mui/material';
import { Check as CheckIcon } from '@mui/icons-material';
import SignatureCapture from './SignatureCapture';
import serviceAgreementService, {
  ServiceAgreementTemplate,
  CreateAgreementData,
  CustomQuestion,
  QuestionResponse,
} from '../../services/serviceAgreementService';

interface ServiceAgreementSignProps {
  customerId: string;
  customerName: string;
  petId?: string;
  checkInId?: string;
  templateId?: string;
  onComplete: (agreementId: string) => void;
  onCancel?: () => void;
}

interface Section {
  id: string;
  title: string;
  content: string;
  initialed: boolean;
  initials: string;
}

const ServiceAgreementSign: React.FC<ServiceAgreementSignProps> = ({
  customerId,
  customerName,
  petId,
  checkInId,
  templateId,
  onComplete,
  onCancel,
}) => {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [template, setTemplate] = useState<ServiceAgreementTemplate | null>(
    null
  );
  const [availableTemplates, setAvailableTemplates] = useState<
    ServiceAgreementTemplate[]
  >([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [activeStep, setActiveStep] = useState(0);
  const [signature, setSignature] = useState<string | null>(null);
  const [signerName, setSignerName] = useState(customerName);
  const [acknowledged, setAcknowledged] = useState(false);
  const [questionResponses, setQuestionResponses] = useState<
    Record<string, string | number | boolean>
  >({});

  // Parse HTML content into sections
  const parseContentIntoSections = useCallback((content: string): Section[] => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(content, 'text/html');
    const headings = doc.querySelectorAll('h2, h3');
    const parsedSections: Section[] = [];

    headings.forEach((heading, index) => {
      let sectionContent = '';
      let sibling = heading.nextElementSibling;

      while (sibling && !['H2', 'H3'].includes(sibling.tagName)) {
        sectionContent += sibling.outerHTML;
        sibling = sibling.nextElementSibling;
      }

      if (sectionContent) {
        parsedSections.push({
          id: `section-${index}`,
          title: heading.textContent || `Section ${index + 1}`,
          content: sectionContent,
          initialed: false,
          initials: '',
        });
      }
    });

    // If no sections found, treat entire content as one section
    if (parsedSections.length === 0) {
      parsedSections.push({
        id: 'section-0',
        title: 'Agreement Terms',
        content: content,
        initialed: false,
        initials: '',
      });
    }

    return parsedSections;
  }, []);

  // Load template
  useEffect(() => {
    const loadTemplate = async () => {
      try {
        setLoading(true);
        let loadedTemplate: ServiceAgreementTemplate | null = null;

        if (templateId) {
          loadedTemplate =
            await serviceAgreementService.getTemplateById(templateId);
        } else {
          // Try to get default template first
          loadedTemplate = await serviceAgreementService.getDefaultTemplate();

          // If no default, get all active templates
          if (!loadedTemplate) {
            const allTemplates =
              await serviceAgreementService.getAllTemplates(true);
            if (allTemplates.length > 0) {
              // If only one template, use it automatically
              if (allTemplates.length === 1) {
                loadedTemplate = allTemplates[0];
              } else {
                // Multiple templates - let user choose
                setAvailableTemplates(allTemplates);
                setLoading(false);
                return;
              }
            }
          }
        }

        if (!loadedTemplate) {
          setError(
            'No service agreement template found. Please create one in Settings > Service Agreements.'
          );
          return;
        }

        setTemplate(loadedTemplate);

        if (loadedTemplate.requiresInitials) {
          setSections(parseContentIntoSections(loadedTemplate.content));
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load agreement');
      } finally {
        setLoading(false);
      }
    };

    loadTemplate();
  }, [templateId, parseContentIntoSections]);

  // Handle template selection when multiple are available
  const handleSelectTemplate = (selectedTemplate: ServiceAgreementTemplate) => {
    setTemplate(selectedTemplate);
    setAvailableTemplates([]);
    if (selectedTemplate.requiresInitials) {
      setSections(parseContentIntoSections(selectedTemplate.content));
    }
  };

  const handleInitialSection = (sectionId: string, initials: string) => {
    setSections((prev) =>
      prev.map((section) =>
        section.id === sectionId
          ? { ...section, initials, initialed: initials.length >= 2 }
          : section
      )
    );
  };

  const handleNext = () => {
    setActiveStep((prev) => prev + 1);
  };

  const handleBack = () => {
    setActiveStep((prev) => prev - 1);
  };

  const canProceedToSignature = () => {
    if (!template?.requiresInitials) return true;
    return sections.every((section) => section.initialed);
  };

  const canSubmit = () => {
    if (!acknowledged) return false;
    if (!signerName.trim()) return false;
    if (template?.requiresSignature && !signature) return false;
    return canProceedToSignature();
  };

  const handleSubmit = async () => {
    if (!template || !canSubmit()) return;

    try {
      setSubmitting(true);
      setError(null);

      const initialsData = sections.map((section) => ({
        section: section.title,
        initials: section.initials,
        timestamp: new Date().toISOString(),
      }));

      // Build question responses array
      const questionResponsesArray: QuestionResponse[] = template.questions
        ? template.questions.map((q: CustomQuestion) => ({
            questionId: q.id,
            question: q.question,
            response: questionResponses[q.id] ?? '',
            answeredAt: new Date().toISOString(),
          }))
        : [];

      const agreementData: CreateAgreementData = {
        customerId,
        petId,
        checkInId,
        templateId: template.id,
        agreementText: template.content,
        initials: initialsData,
        signature: signature || '',
        signedBy: signerName,
        questionResponses: questionResponsesArray,
        signatureMethod: 'device',
      };

      const agreement =
        await serviceAgreementService.createAgreement(agreementData);
      onComplete(agreement.id);
    } catch (err: any) {
      setError(err.message || 'Failed to save agreement');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="300px"
      >
        <CircularProgress />
      </Box>
    );
  }

  if (error && !template) {
    return <Alert severity="error">{error}</Alert>;
  }

  if (!template) {
    return <Alert severity="warning">No agreement template available.</Alert>;
  }

  // Simple view without initials
  if (!template.requiresInitials) {
    return (
      <Box>
        <Typography variant="h6" gutterBottom>
          Service Agreement
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <Paper
          variant="outlined"
          sx={{ p: 3, mb: 3, maxHeight: '400px', overflow: 'auto' }}
        >
          <div dangerouslySetInnerHTML={{ __html: template.content }} />
        </Paper>

        {/* Custom Questions */}
        {template.questions && template.questions.length > 0 && (
          <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
            <Typography variant="subtitle1" gutterBottom fontWeight="medium">
              Please answer the following questions:
            </Typography>
            {template.questions.map((q: CustomQuestion) => (
              <Box key={q.id} sx={{ mb: 2 }}>
                <Typography variant="body2" gutterBottom>
                  {q.question}
                  {q.required && <span style={{ color: 'red' }}> *</span>}
                </Typography>
                {q.type === 'YES_NO' ? (
                  <Box display="flex" gap={2}>
                    <Button
                      variant={
                        questionResponses[q.id] === true
                          ? 'contained'
                          : 'outlined'
                      }
                      size="small"
                      onClick={() =>
                        setQuestionResponses((prev) => ({
                          ...prev,
                          [q.id]: true,
                        }))
                      }
                    >
                      Yes
                    </Button>
                    <Button
                      variant={
                        questionResponses[q.id] === false
                          ? 'contained'
                          : 'outlined'
                      }
                      size="small"
                      onClick={() =>
                        setQuestionResponses((prev) => ({
                          ...prev,
                          [q.id]: false,
                        }))
                      }
                    >
                      No
                    </Button>
                  </Box>
                ) : q.type === 'LONG_TEXT' ? (
                  <TextField
                    fullWidth
                    multiline
                    rows={3}
                    placeholder={q.placeholder}
                    value={questionResponses[q.id] || ''}
                    onChange={(e) =>
                      setQuestionResponses((prev) => ({
                        ...prev,
                        [q.id]: e.target.value,
                      }))
                    }
                    size="small"
                  />
                ) : q.type === 'NUMBER' ? (
                  <TextField
                    type="number"
                    placeholder={q.placeholder}
                    value={questionResponses[q.id] || ''}
                    onChange={(e) =>
                      setQuestionResponses((prev) => ({
                        ...prev,
                        [q.id]: e.target.value,
                      }))
                    }
                    size="small"
                    sx={{ width: 200 }}
                  />
                ) : q.type === 'CURRENCY' ? (
                  <TextField
                    type="number"
                    placeholder={q.placeholder || '$0.00'}
                    value={questionResponses[q.id] || ''}
                    onChange={(e) =>
                      setQuestionResponses((prev) => ({
                        ...prev,
                        [q.id]: e.target.value,
                      }))
                    }
                    size="small"
                    sx={{ width: 200 }}
                    InputProps={{
                      startAdornment: <Typography sx={{ mr: 1 }}>$</Typography>,
                    }}
                  />
                ) : (
                  <TextField
                    fullWidth
                    placeholder={q.placeholder}
                    value={questionResponses[q.id] || ''}
                    onChange={(e) =>
                      setQuestionResponses((prev) => ({
                        ...prev,
                        [q.id]: e.target.value,
                      }))
                    }
                    size="small"
                  />
                )}
              </Box>
            ))}
          </Paper>
        )}

        {template.requiresSignature && (
          <Box mb={3}>
            <SignatureCapture onSignatureChange={setSignature} />
          </Box>
        )}

        <TextField
          label="Full Name"
          value={signerName}
          onChange={(e) => setSignerName(e.target.value)}
          fullWidth
          sx={{ mb: 2 }}
        />

        <FormControlLabel
          control={
            <Checkbox
              checked={acknowledged}
              onChange={(e) => setAcknowledged(e.target.checked)}
            />
          }
          label="I have read and agree to the terms and conditions above"
        />

        <Box display="flex" justifyContent="flex-end" gap={2} mt={3}>
          {onCancel && (
            <Button onClick={onCancel} disabled={submitting}>
              Cancel
            </Button>
          )}
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={!canSubmit() || submitting}
            startIcon={
              submitting ? <CircularProgress size={20} /> : <CheckIcon />
            }
          >
            {submitting ? 'Submitting...' : 'Sign Agreement'}
          </Button>
        </Box>
      </Box>
    );
  }

  // Stepper view with initials per section
  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Service Agreement
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Stepper activeStep={activeStep} orientation="vertical">
        {sections.map((section, index) => (
          <Step key={section.id}>
            <StepLabel
              optional={
                section.initialed ? (
                  <Typography variant="caption" color="success.main">
                    Initialed: {section.initials}
                  </Typography>
                ) : null
              }
            >
              {section.title}
            </StepLabel>
            <StepContent>
              <Paper
                variant="outlined"
                sx={{ p: 2, mb: 2, maxHeight: '200px', overflow: 'auto' }}
              >
                <div dangerouslySetInnerHTML={{ __html: section.content }} />
              </Paper>

              <Box display="flex" alignItems="center" gap={2} mb={2}>
                <TextField
                  label="Your Initials"
                  value={section.initials}
                  onChange={(e) =>
                    handleInitialSection(
                      section.id,
                      e.target.value.toUpperCase()
                    )
                  }
                  size="small"
                  sx={{ width: 100 }}
                  inputProps={{
                    maxLength: 4,
                    style: { textTransform: 'uppercase' },
                  }}
                />
                <Typography variant="body2" color="textSecondary">
                  Enter your initials to acknowledge this section
                </Typography>
              </Box>

              <Box display="flex" gap={1}>
                <Button disabled={index === 0} onClick={handleBack}>
                  Back
                </Button>
                <Button
                  variant="contained"
                  onClick={handleNext}
                  disabled={!section.initialed}
                >
                  {index === sections.length - 1
                    ? 'Continue to Signature'
                    : 'Next'}
                </Button>
              </Box>
            </StepContent>
          </Step>
        ))}

        {/* Signature Step */}
        <Step>
          <StepLabel>Sign Agreement</StepLabel>
          <StepContent>
            <Box mb={3}>
              <Typography variant="body2" color="textSecondary" gutterBottom>
                Please review your initials and sign below to complete the
                agreement.
              </Typography>

              <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Sections Acknowledged:
                </Typography>
                {sections.map((section) => (
                  <Box
                    key={section.id}
                    display="flex"
                    alignItems="center"
                    gap={1}
                  >
                    <CheckIcon color="success" fontSize="small" />
                    <Typography variant="body2">
                      {section.title} - {section.initials}
                    </Typography>
                  </Box>
                ))}
              </Paper>
            </Box>

            {template.requiresSignature && (
              <Box mb={3}>
                <SignatureCapture onSignatureChange={setSignature} />
              </Box>
            )}

            <TextField
              label="Full Name"
              value={signerName}
              onChange={(e) => setSignerName(e.target.value)}
              fullWidth
              sx={{ mb: 2 }}
            />

            <FormControlLabel
              control={
                <Checkbox
                  checked={acknowledged}
                  onChange={(e) => setAcknowledged(e.target.checked)}
                />
              }
              label="I have read and agree to all terms and conditions"
            />

            <Divider sx={{ my: 2 }} />

            <Box display="flex" gap={1}>
              <Button onClick={handleBack}>Back</Button>
              {onCancel && (
                <Button onClick={onCancel} disabled={submitting}>
                  Cancel
                </Button>
              )}
              <Button
                variant="contained"
                onClick={handleSubmit}
                disabled={!canSubmit() || submitting}
                startIcon={
                  submitting ? <CircularProgress size={20} /> : <CheckIcon />
                }
              >
                {submitting ? 'Submitting...' : 'Sign Agreement'}
              </Button>
            </Box>
          </StepContent>
        </Step>
      </Stepper>
    </Box>
  );
};

export default ServiceAgreementSign;
