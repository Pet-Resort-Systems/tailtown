import React, { useState } from 'react';
import {
  Box,
  TextField,
  Button,
  Paper,
  Typography,
  IconButton,
  Switch,
  FormControlLabel,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Grid,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';

interface TemplateEditorProps {
  template: any;
  onSave: (template: any) => void;
  onCancel: () => void;
}

const QUESTION_TYPES = [
  { value: 'TEXT', label: 'Short Text' },
  { value: 'LONG_TEXT', label: 'Long Text' },
  { value: 'YES_NO', label: 'Yes/No' },
  { value: 'MULTIPLE_CHOICE', label: 'Multiple Choice' },
  { value: 'TIME', label: 'Time' },
  { value: 'DATE', label: 'Date' },
];

const TemplateEditor: React.FC<TemplateEditorProps> = ({
  template: initialTemplate,
  onSave,
  onCancel,
}) => {
  const [template, setTemplate] = useState(initialTemplate);

  const handleTemplateChange = (field: string, value: any) => {
    setTemplate({ ...template, [field]: value });
  };

  const handleAddSection = () => {
    const newSection = {
      title: 'New Section',
      description: '',
      order: (template.sections?.length || 0) + 1,
      questions: [],
    };
    setTemplate({
      ...template,
      sections: [...(template.sections || []), newSection],
    });
  };

  const handleUpdateSection = (index: number, field: string, value: any) => {
    const updated = [...template.sections];
    updated[index] = { ...updated[index], [field]: value };
    setTemplate({ ...template, sections: updated });
  };

  const handleDeleteSection = (index: number) => {
    const updated = template.sections.filter(
      (_: any, i: number) => i !== index
    );
    setTemplate({ ...template, sections: updated });
  };

  const handleAddQuestion = (sectionIndex: number) => {
    const newQuestion = {
      questionText: 'New Question',
      questionType: 'TEXT',
      isRequired: false,
      order: (template.sections[sectionIndex].questions?.length || 0) + 1,
      placeholder: '',
      helpText: '',
      options: null,
    };
    const updated = [...template.sections];
    updated[sectionIndex].questions = [
      ...(updated[sectionIndex].questions || []),
      newQuestion,
    ];
    setTemplate({ ...template, sections: updated });
  };

  const handleUpdateQuestion = (
    sectionIndex: number,
    questionIndex: number,
    field: string,
    value: any
  ) => {
    const updated = [...template.sections];
    updated[sectionIndex].questions[questionIndex] = {
      ...updated[sectionIndex].questions[questionIndex],
      [field]: value,
    };
    setTemplate({ ...template, sections: updated });
  };

  const handleDeleteQuestion = (
    sectionIndex: number,
    questionIndex: number
  ) => {
    const updated = [...template.sections];
    updated[sectionIndex].questions = updated[sectionIndex].questions.filter(
      (_: any, i: number) => i !== questionIndex
    );
    setTemplate({ ...template, sections: updated });
  };

  const handleAddChoice = (sectionIndex: number, questionIndex: number) => {
    const updated = [...template.sections];
    const question = updated[sectionIndex].questions[questionIndex];
    const choices = question.options?.choices || [];
    question.options = { choices: [...choices, 'New Option'] };
    setTemplate({ ...template, sections: updated });
  };

  const handleUpdateChoice = (
    sectionIndex: number,
    questionIndex: number,
    choiceIndex: number,
    value: string
  ) => {
    const updated = [...template.sections];
    const question = updated[sectionIndex].questions[questionIndex];
    question.options.choices[choiceIndex] = value;
    setTemplate({ ...template, sections: updated });
  };

  const handleDeleteChoice = (
    sectionIndex: number,
    questionIndex: number,
    choiceIndex: number
  ) => {
    const updated = [...template.sections];
    const question = updated[sectionIndex].questions[questionIndex];
    question.options.choices = question.options.choices.filter(
      (_: any, i: number) => i !== choiceIndex
    );
    setTemplate({ ...template, sections: updated });
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" gutterBottom>
          {template.id ? 'Edit Template' : 'Create Template'}
        </Typography>

        <Grid container spacing={2} sx={{ mt: 2 }}>
          <Grid
            size={{
              xs: 12,
              md: 6
            }}>
            <TextField
              fullWidth
              label="Template Name"
              value={template.name}
              onChange={(e) => handleTemplateChange('name', e.target.value)}
              required
            />
          </Grid>
          <Grid
            size={{
              xs: 12,
              md: 6
            }}>
            <Box
              sx={{
                display: 'flex',
                gap: 2,
                alignItems: 'center',
                height: '100%',
              }}
            >
              <FormControlLabel
                control={
                  <Switch
                    checked={template.isDefault}
                    onChange={(e) =>
                      handleTemplateChange('isDefault', e.target.checked)
                    }
                  />
                }
                label="Default Template"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={template.isActive}
                    onChange={(e) =>
                      handleTemplateChange('isActive', e.target.checked)
                    }
                  />
                }
                label="Active"
              />
            </Box>
          </Grid>
          <Grid size={12}>
            <TextField
              fullWidth
              multiline
              rows={2}
              label="Description"
              value={template.description}
              onChange={(e) =>
                handleTemplateChange('description', e.target.value)
              }
            />
          </Grid>
        </Grid>
      </Box>
      <Box sx={{ mb: 3 }}>
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            mb: 2,
          }}
        >
          <Typography variant="h6">Sections</Typography>
          <Button
            startIcon={<AddIcon />}
            onClick={handleAddSection}
            variant="outlined"
          >
            Add Section
          </Button>
        </Box>

        {template.sections?.map((section: any, sectionIndex: number) => (
          <Accordion key={sectionIndex} defaultExpanded={sectionIndex === 0}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Box
                sx={{ display: 'flex', alignItems: 'center', width: '100%' }}
              >
                <DragIndicatorIcon sx={{ mr: 1, color: 'text.secondary' }} />
                <Typography sx={{ flexGrow: 1 }}>{section.title}</Typography>
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteSection(sectionIndex);
                  }}
                >
                  <DeleteIcon />
                </IconButton>
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <TextField
                  fullWidth
                  label="Section Title"
                  value={section.title}
                  onChange={(e) =>
                    handleUpdateSection(sectionIndex, 'title', e.target.value)
                  }
                />
                <TextField
                  fullWidth
                  label="Section Description"
                  value={section.description}
                  onChange={(e) =>
                    handleUpdateSection(
                      sectionIndex,
                      'description',
                      e.target.value
                    )
                  }
                />

                <Box sx={{ mt: 2 }}>
                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      mb: 2,
                    }}
                  >
                    <Typography variant="subtitle1">Questions</Typography>
                    <Button
                      size="small"
                      startIcon={<AddIcon />}
                      onClick={() => handleAddQuestion(sectionIndex)}
                    >
                      Add Question
                    </Button>
                  </Box>

                  {section.questions?.map(
                    (question: any, questionIndex: number) => (
                      <Paper
                        key={questionIndex}
                        sx={{ p: 2, mb: 2, bgcolor: 'grey.50' }}
                      >
                        <Box
                          sx={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            mb: 2,
                          }}
                        >
                          <Typography variant="subtitle2">
                            Question {questionIndex + 1}
                          </Typography>
                          <IconButton
                            size="small"
                            onClick={() =>
                              handleDeleteQuestion(sectionIndex, questionIndex)
                            }
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Box>

                        <Grid container spacing={2}>
                          <Grid size={12}>
                            <TextField
                              fullWidth
                              label="Question Text"
                              value={question.questionText}
                              onChange={(e) =>
                                handleUpdateQuestion(
                                  sectionIndex,
                                  questionIndex,
                                  'questionText',
                                  e.target.value
                                )
                              }
                            />
                          </Grid>
                          <Grid
                            size={{
                              xs: 12,
                              md: 6
                            }}>
                            <FormControl fullWidth>
                              <InputLabel>Question Type</InputLabel>
                              <Select
                                value={question.questionType}
                                label="Question Type"
                                onChange={(e) =>
                                  handleUpdateQuestion(
                                    sectionIndex,
                                    questionIndex,
                                    'questionType',
                                    e.target.value
                                  )
                                }
                              >
                                {QUESTION_TYPES.map((type) => (
                                  <MenuItem key={type.value} value={type.value}>
                                    {type.label}
                                  </MenuItem>
                                ))}
                              </Select>
                            </FormControl>
                          </Grid>
                          <Grid
                            size={{
                              xs: 12,
                              md: 6
                            }}>
                            <FormControlLabel
                              control={
                                <Switch
                                  checked={question.isRequired}
                                  onChange={(e) =>
                                    handleUpdateQuestion(
                                      sectionIndex,
                                      questionIndex,
                                      'isRequired',
                                      e.target.checked
                                    )
                                  }
                                />
                              }
                              label="Required"
                            />
                          </Grid>
                          <Grid
                            size={{
                              xs: 12,
                              md: 6
                            }}>
                            <TextField
                              fullWidth
                              label="Placeholder"
                              value={question.placeholder || ''}
                              onChange={(e) =>
                                handleUpdateQuestion(
                                  sectionIndex,
                                  questionIndex,
                                  'placeholder',
                                  e.target.value
                                )
                              }
                            />
                          </Grid>
                          <Grid
                            size={{
                              xs: 12,
                              md: 6
                            }}>
                            <TextField
                              fullWidth
                              label="Help Text"
                              value={question.helpText || ''}
                              onChange={(e) =>
                                handleUpdateQuestion(
                                  sectionIndex,
                                  questionIndex,
                                  'helpText',
                                  e.target.value
                                )
                              }
                            />
                          </Grid>

                          {question.questionType === 'MULTIPLE_CHOICE' && (
                            <Grid size={12}>
                              <Box
                                sx={{
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center',
                                  mb: 1,
                                }}
                              >
                                <Typography variant="body2" fontWeight="bold">
                                  Answer Choices
                                </Typography>
                                <Button
                                  size="small"
                                  onClick={() =>
                                    handleAddChoice(sectionIndex, questionIndex)
                                  }
                                >
                                  Add Choice
                                </Button>
                              </Box>
                              {question.options?.choices?.map(
                                (choice: string, choiceIndex: number) => (
                                  <Box
                                    key={choiceIndex}
                                    sx={{ display: 'flex', gap: 1, mb: 1 }}
                                  >
                                    <TextField
                                      fullWidth
                                      size="small"
                                      value={choice}
                                      onChange={(e) =>
                                        handleUpdateChoice(
                                          sectionIndex,
                                          questionIndex,
                                          choiceIndex,
                                          e.target.value
                                        )
                                      }
                                    />
                                    <IconButton
                                      size="small"
                                      onClick={() =>
                                        handleDeleteChoice(
                                          sectionIndex,
                                          questionIndex,
                                          choiceIndex
                                        )
                                      }
                                    >
                                      <DeleteIcon />
                                    </IconButton>
                                  </Box>
                                )
                              )}
                            </Grid>
                          )}
                        </Grid>
                      </Paper>
                    )
                  )}
                </Box>
              </Box>
            </AccordionDetails>
          </Accordion>
        ))}
      </Box>
      <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', mt: 4 }}>
        <Button variant="outlined" onClick={onCancel}>
          Cancel
        </Button>
        <Button variant="contained" onClick={() => onSave(template)}>
          Save Template
        </Button>
      </Box>
    </Box>
  );
};

export default TemplateEditor;
