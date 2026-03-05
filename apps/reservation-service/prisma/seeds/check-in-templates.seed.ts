import { PrismaClient, QuestionType } from '@prisma/client';

const prisma = new PrismaClient();

export async function seedCheckInTemplates() {
  console.log('🌱 Seeding check-in templates...');

  // Create default boarding check-in template
  const boardingTemplate = await prisma.checkInTemplate.create({
    data: {
      tenantId: 'dev',
      name: 'Standard Boarding Check-In',
      description: 'Comprehensive check-in questionnaire for boarding reservations',
      isActive: true,
      isDefault: true,
      sections: {
        create: [
          {
            title: 'Contact & Availability',
            description: 'Emergency contact and reachability information',
            order: 1,
            questions: {
              create: [
                {
                  questionText: 'Will you be reachable during your pet\'s stay?',
                  questionType: QuestionType.YES_NO,
                  isRequired: true,
                  order: 1,
                  helpText: 'We may need to contact you regarding your pet'
                },
                {
                  questionText: 'Best phone number to reach you',
                  questionType: QuestionType.TEXT,
                  isRequired: true,
                  order: 2,
                  placeholder: '(555) 123-4567'
                },
                {
                  questionText: 'Are you traveling to a different time zone?',
                  questionType: QuestionType.YES_NO,
                  isRequired: true,
                  order: 3
                },
                {
                  questionText: 'If yes, what time zone will you be in?',
                  questionType: QuestionType.TEXT,
                  isRequired: false,
                  order: 4,
                  placeholder: 'e.g., Pacific Time, Eastern Time'
                },
                {
                  questionText: 'Emergency contact name',
                  questionType: QuestionType.TEXT,
                  isRequired: true,
                  order: 5,
                  placeholder: 'Full name'
                },
                {
                  questionText: 'Emergency contact phone',
                  questionType: QuestionType.TEXT,
                  isRequired: true,
                  order: 6,
                  placeholder: '(555) 123-4567'
                },
                {
                  questionText: 'Emergency contact relationship',
                  questionType: QuestionType.TEXT,
                  isRequired: false,
                  order: 7,
                  placeholder: 'e.g., Spouse, Friend, Family Member'
                }
              ]
            }
          },
          {
            title: 'Feeding Schedule',
            description: 'Meal times, portions, and dietary information',
            order: 2,
            questions: {
              create: [
                {
                  questionText: 'When is your pet typically fed?',
                  questionType: QuestionType.MULTIPLE_CHOICE,
                  options: {
                    choices: ['Morning only', 'Morning & Evening', 'Morning, Lunch & Evening']
                  },
                  isRequired: true,
                  order: 1
                },
                {
                  questionText: 'Morning feeding time',
                  questionType: QuestionType.TIME,
                  isRequired: true,
                  order: 2,
                  helpText: 'What time do you typically feed your pet in the morning?'
                },
                {
                  questionText: 'Evening feeding time',
                  questionType: QuestionType.TIME,
                  isRequired: false,
                  order: 3,
                  helpText: 'Leave blank if not applicable'
                },
                {
                  questionText: 'Lunch feeding time (if applicable)',
                  questionType: QuestionType.TIME,
                  isRequired: false,
                  order: 4
                },
                {
                  questionText: 'How much food per meal?',
                  questionType: QuestionType.TEXT,
                  isRequired: true,
                  order: 5,
                  placeholder: 'e.g., 1 cup, 2 scoops, 1/2 can',
                  helpText: 'Please include the unit of measurement'
                },
                {
                  questionText: 'Any food toppers or supplements?',
                  questionType: QuestionType.LONG_TEXT,
                  isRequired: false,
                  order: 6,
                  placeholder: 'Describe any toppers, supplements, or special food preparation',
                  helpText: 'Include brand names and amounts if applicable'
                },
                {
                  questionText: 'May we add toppers (cheese, broth, etc.) if your pet isn\'t eating?',
                  questionType: QuestionType.YES_NO,
                  isRequired: true,
                  order: 7,
                  helpText: 'This helps us encourage appetite if needed'
                },
                {
                  questionText: 'May we give probiotics if an upset stomach occurs?',
                  questionType: QuestionType.YES_NO,
                  isRequired: true,
                  order: 8,
                  helpText: 'We use veterinarian-approved probiotics'
                }
              ]
            }
          },
          {
            title: 'Medications',
            description: 'Detailed medication information',
            order: 3,
            questions: {
              create: [
                {
                  questionText: 'Will your pet need any medications during their stay?',
                  questionType: QuestionType.YES_NO,
                  isRequired: true,
                  order: 1,
                  helpText: 'We will track each medication separately in the next step'
                },
                {
                  questionText: 'Number of different medications',
                  questionType: QuestionType.NUMBER,
                  isRequired: false,
                  order: 2,
                  placeholder: '0',
                  helpText: 'We will collect details for each medication during check-in'
                }
              ]
            }
          },
          {
            title: 'Medical & Behavior',
            description: 'Health and behavioral information',
            order: 4,
            questions: {
              create: [
                {
                  questionText: 'Any behavioral concerns we should be aware of?',
                  questionType: QuestionType.LONG_TEXT,
                  isRequired: false,
                  order: 1,
                  placeholder: 'e.g., separation anxiety, fear of loud noises, resource guarding',
                  helpText: 'This helps us provide the best care for your pet'
                },
                {
                  questionText: 'Any medical conditions we should monitor?',
                  questionType: QuestionType.LONG_TEXT,
                  isRequired: false,
                  order: 2,
                  placeholder: 'e.g., arthritis, diabetes, seizures, allergies',
                  helpText: 'Include any symptoms we should watch for'
                }
              ]
            }
          },
          {
            title: 'Additional Information',
            description: 'Special requests and notes',
            order: 5,
            questions: {
              create: [
                {
                  questionText: 'Special instructions or requests',
                  questionType: QuestionType.LONG_TEXT,
                  isRequired: false,
                  order: 1,
                  placeholder: 'Any other information we should know about your pet',
                  helpText: 'Favorite toys, sleeping preferences, etc.'
                }
              ]
            }
          }
        ]
      }
    }
  });

  console.log(`✅ Created boarding template: ${boardingTemplate.name}`);

  // Create default service agreement template
  const agreementTemplate = await prisma.serviceAgreementTemplate.create({
    data: {
      tenantId: 'dev',
      name: 'Standard Boarding Agreement',
      isActive: true,
      isDefault: true,
      content: `
# Boarding Service Agreement

**Effective Date:** {{DATE}}

This agreement is entered into between Tailtown Pet Resort ("Facility") and {{CUSTOMER_NAME}} ("Owner") for the boarding of {{PET_NAME}}.

## 1. Health and Vaccination Requirements

{{INITIAL_1}} I certify that my pet is in good health and has not been ill with any communicable condition in the last 30 days. I further certify that my pet has not harmed or shown aggressive or threatening behavior towards any person or other pet.

{{INITIAL_2}} I certify that my pet has current vaccinations as required by the Facility, and I have provided proof of:
- Rabies vaccination
- DHPP (Distemper, Hepatitis, Parvovirus, Parainfluenza)
- Bordetella (Kennel Cough)
- Fecal test within the last 12 months

## 2. Emergency Medical Care

{{INITIAL_3}} I understand that in the event of an emergency, the Facility will attempt to contact me using the contact information provided. If I cannot be reached, I authorize the Facility to seek emergency veterinary care for my pet at my expense.

{{INITIAL_4}} I agree to pay all costs associated with emergency medical care, including but not limited to examination fees, diagnostic tests, medications, and treatments.

## 3. Personal Belongings

{{INITIAL_5}} I understand that while the Facility will take reasonable care of any personal items left with my pet (bedding, toys, etc.), the Facility is not responsible for loss or damage to these items.

## 4. Feeding and Medication

{{INITIAL_6}} I have provided accurate information about my pet's feeding schedule and any medications required. I understand that the Facility will follow these instructions to the best of their ability.

{{INITIAL_7}} I authorize the Facility to add food toppers or appetite stimulants if my pet is not eating, and to administer probiotics if digestive upset occurs, as indicated in my check-in questionnaire.

## 5. Behavior and Socialization

{{INITIAL_8}} I understand that my pet may interact with other pets during their stay. While the Facility takes precautions to ensure safety, I acknowledge that injuries can occur during normal play and socialization.

## 6. Payment Terms

{{INITIAL_9}} I agree to pay all charges for services rendered at the time of pick-up. I understand that a late pick-up fee may be charged for pets not collected by the agreed-upon time.

## 7. Liability

{{INITIAL_10}} I agree to indemnify and hold harmless the Facility, its owners, employees, and agents from any claims, damages, or expenses arising from my pet's stay, except in cases of gross negligence or willful misconduct by the Facility.

## 8. Cancellation Policy

{{INITIAL_11}} I understand the Facility's cancellation policy and agree to provide at least 48 hours notice for cancellations to avoid charges.

---

## Owner Acknowledgment

By signing below, I acknowledge that I have read, understood, and agree to all terms and conditions outlined in this agreement.

**Owner Name:** {{CUSTOMER_NAME}}

**Pet Name:** {{PET_NAME}}

**Check-In Date:** {{CHECKIN_DATE}}

**Expected Pick-Up Date:** {{CHECKOUT_DATE}}

**Owner Signature:**

{{SIGNATURE}}

**Date Signed:** {{SIGNED_DATE}}
      `.trim()
    }
  });

  console.log(`✅ Created agreement template: ${agreementTemplate.name}`);

  console.log('✅ Check-in templates seeded successfully!');
}

// Run if called directly
if (require.main === module) {
  seedCheckInTemplates()
    .catch((e) => {
      console.error('❌ Error seeding check-in templates:', e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
