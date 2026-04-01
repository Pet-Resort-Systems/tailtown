/**
 * Unit tests for getFeedingScheduleSummary helper function
 *
 * This function extracts feeding schedule data from questionnaire responses
 * to display in the Pet Profile section during check-in.
 */

interface Question {
  id: string;
  questionText: string;
  questionType: string;
  isRequired: boolean;
  order: number;
}

interface Section {
  id: string;
  title: string;
  order: number;
  questions: Question[];
}

interface Template {
  id: string;
  name: string;
  sections: Section[];
}

// Extract the helper function logic for testing
const getFeedingScheduleSummary = (
  template: Template | null,
  responses: Record<string, string>
): string | null => {
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

const mockTemplate: Template = {
  id: 'template-123',
  name: 'Standard Check-In',
  sections: [
    {
      id: 'section-contact',
      title: 'Contact Information',
      order: 1,
      questions: [
        {
          id: 'q-phone',
          questionText: 'Best phone number',
          questionType: 'TEXT',
          isRequired: true,
          order: 1,
        },
      ],
    },
    {
      id: 'section-feeding',
      title: 'Feeding Schedule',
      order: 2,
      questions: [
        {
          id: 'q-meals',
          questionText: 'How many meals per day do they get?',
          questionType: 'MULTIPLE_CHOICE',
          isRequired: true,
          order: 1,
        },
        {
          id: 'q-amount',
          questionText: 'How much food per meal?',
          questionType: 'TEXT',
          isRequired: true,
          order: 2,
        },
        {
          id: 'q-when',
          questionText: 'When is your pet typically fed?',
          questionType: 'MULTIPLE_CHOICE',
          isRequired: true,
          order: 3,
        },
      ],
    },
  ],
};

describe('getFeedingScheduleSummary', () => {
  it('returns null when template is null', () => {
    const result = getFeedingScheduleSummary(null, { 'q-meals': '2' });
    expect(result).toBeNull();
  });

  it('returns null when responses are empty', () => {
    const result = getFeedingScheduleSummary(mockTemplate, {});
    expect(result).toBeNull();
  });

  it('returns null when no feeding section exists', () => {
    const templateWithoutFeeding: Template = {
      ...mockTemplate,
      sections: [mockTemplate.sections[0]], // Only contact section
    };
    const result = getFeedingScheduleSummary(templateWithoutFeeding, {
      'q-phone': '555-1234',
    });
    expect(result).toBeNull();
  });

  it('extracts meals per day correctly', () => {
    const responses = {
      'q-meals': '2',
    };
    const result = getFeedingScheduleSummary(mockTemplate, responses);
    expect(result).toBe('2 meals/day');
  });

  it('extracts food amount correctly', () => {
    const responses = {
      'q-amount': '1/3 cup',
    };
    const result = getFeedingScheduleSummary(mockTemplate, responses);
    expect(result).toBe('1/3 cup');
  });

  it('extracts feeding time correctly', () => {
    const responses = {
      'q-when': 'Morning & Evening',
    };
    const result = getFeedingScheduleSummary(mockTemplate, responses);
    expect(result).toBe('Morning & Evening');
  });

  it('combines multiple feeding responses', () => {
    const responses = {
      'q-meals': '2',
      'q-amount': '1/3 cup',
      'q-when': 'Morning & Evening',
    };
    const result = getFeedingScheduleSummary(mockTemplate, responses);
    expect(result).toBe('2 meals/day, 1/3 cup, Morning & Evening');
  });

  it('ignores unrelated responses from other sections', () => {
    const responses = {
      'q-phone': '555-1234',
      'q-meals': '2',
    };
    const result = getFeedingScheduleSummary(mockTemplate, responses);
    expect(result).toBe('2 meals/day');
  });

  it('handles template with case-insensitive feeding section title', () => {
    const templateWithDifferentCase: Template = {
      ...mockTemplate,
      sections: [
        {
          ...mockTemplate.sections[1],
          title: 'FEEDING SCHEDULE',
        },
      ],
    };
    const responses = {
      'q-meals': '3',
    };
    const result = getFeedingScheduleSummary(
      templateWithDifferentCase,
      responses
    );
    expect(result).toBe('3 meals/day');
  });

  it('returns null when feeding section exists but no matching responses', () => {
    const responses = {
      'q-unrelated': 'some value',
    };
    const result = getFeedingScheduleSummary(mockTemplate, responses);
    expect(result).toBeNull();
  });
});
