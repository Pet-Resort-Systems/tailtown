import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedCheckInTemplates() {
  console.log('Seeding check-in templates...');

  try {
    // Check if default template already exists
    const existingTemplate = await prisma.checkInTemplate.findFirst({
      where: {
        tenantId: 'dev',
        isDefault: true
      }
    });

    if (existingTemplate) {
      console.log('Default check-in template already exists. Skipping...');
    } else {
      // Create default boarding check-in template
      const template = await prisma.checkInTemplate.create({
        data: {
          tenantId: 'dev',
          name: 'Standard Boarding Check-In',
          description: 'Default check-in questionnaire for boarding services',
          isDefault: true,
          isActive: true,
          sections: {
            create: [
              {
                title: 'Contact Information',
                description: 'Emergency contact and availability during stay',
                order: 1,
                questions: {
                  create: [
                    {
                      questionText: 'Emergency Contact Name',
                      questionType: 'TEXT',
                      isRequired: true,
                      order: 1,
                      placeholder: 'Full name',
                      helpText: 'Primary emergency contact while pet is boarding'
                    },
                    {
                      questionText: 'Emergency Contact Phone',
                      questionType: 'TEXT',
                      isRequired: true,
                      order: 2,
                      placeholder: '(555) 555-5555',
                      helpText: 'Best number to reach emergency contact'
                    },
                    {
                      questionText: 'Relationship to Pet Owner',
                      questionType: 'TEXT',
                      isRequired: false,
                      order: 3,
                      placeholder: 'e.g., Spouse, Parent, Friend'
                    },
                    {
                      questionText: 'Will you be reachable during your pet\'s stay?',
                      questionType: 'YES_NO',
                      isRequired: true,
                      order: 4
                    },
                    {
                      questionText: 'Best way to contact you',
                      questionType: 'MULTIPLE_CHOICE',
                      isRequired: true,
                      order: 5,
                      options: {
                        choices: ['Phone Call', 'Text Message', 'Email']
                      } as any
                    }
                  ]
                }
              },
              {
                title: 'Feeding Schedule',
                description: 'Meal times and dietary preferences',
                order: 2,
                questions: {
                  create: [
                    {
                      questionText: 'Morning feeding time',
                      questionType: 'TIME',
                      isRequired: true,
                      order: 1,
                      helpText: 'Preferred time for morning meal'
                    },
                    {
                      questionText: 'Evening feeding time',
                      questionType: 'TIME',
                      isRequired: true,
                      order: 2,
                      helpText: 'Preferred time for evening meal'
                    },
                    {
                      questionText: 'Food amount per meal',
                      questionType: 'TEXT',
                      isRequired: true,
                      order: 3,
                      placeholder: 'e.g., 1 cup, 2 scoops',
                      helpText: 'How much food per feeding'
                    },
                    {
                      questionText: 'Does your pet get food toppers or supplements?',
                      questionType: 'YES_NO',
                      isRequired: true,
                      order: 4
                    },
                    {
                      questionText: 'May we use appetite incentives (cheese, chicken, etc.) if needed?',
                      questionType: 'YES_NO',
                      isRequired: true,
                      order: 5
                    },
                    {
                      questionText: 'May we add probiotics to meals if needed?',
                      questionType: 'YES_NO',
                      isRequired: true,
                      order: 6
                    }
                  ]
                }
              },
              {
                title: 'Medical & Behavioral',
                description: 'Health and behavior information',
                order: 3,
                questions: {
                  create: [
                    {
                      questionText: 'Any medical conditions we should be aware of?',
                      questionType: 'LONG_TEXT',
                      isRequired: false,
                      order: 1,
                      placeholder: 'Describe any health issues, allergies, or concerns'
                    },
                    {
                      questionText: 'Any behavioral concerns?',
                      questionType: 'LONG_TEXT',
                      isRequired: false,
                      order: 2,
                      placeholder: 'Anxiety, aggression, fear of loud noises, etc.'
                    },
                    {
                      questionText: 'Is your pet comfortable with other dogs?',
                      questionType: 'YES_NO',
                      isRequired: true,
                      order: 3
                    },
                    {
                      questionText: 'Special instructions or requests',
                      questionType: 'LONG_TEXT',
                      isRequired: false,
                      order: 4,
                      placeholder: 'Any other information we should know'
                    }
                  ]
                }
              }
            ]
          }
        } as any
      });

      console.log('✓ Created default check-in template');
    }

    // Check if default service agreement template exists
    const existingAgreement = await prisma.serviceAgreementTemplate.findFirst({
      where: {
        tenantId: 'dev',
        isDefault: true
      }
    });

    if (existingAgreement) {
      console.log('Default service agreement template already exists. Skipping...');
    } else {
      // Create default service agreement template
      const agreementTemplate = await prisma.serviceAgreementTemplate.create({
        data: {
          tenantId: 'dev',
          name: 'Standard Boarding Agreement',
          content: `BOARDING SERVICE AGREEMENT

This agreement is entered into on {{DATE}} between Tailtown Pet Resort ("Facility") and {{CUSTOMER_NAME}} ("Owner") for the boarding of {{PET_NAME}}.

BOARDING PERIOD
Check-in Date: {{CHECKIN_DATE}}
Check-out Date: {{CHECKOUT_DATE}}

TERMS AND CONDITIONS

1. HEALTH REQUIREMENTS
Owner certifies that {{PET_NAME}} is in good health and has not been exposed to any contagious diseases within the past 30 days. All vaccinations are current and up to date.

2. MEDICAL CARE
In the event of illness or injury, the Facility will attempt to contact the Owner immediately. If the Owner cannot be reached, the Facility is authorized to obtain necessary veterinary care. Owner agrees to pay all veterinary costs incurred.

3. PERSONAL BELONGINGS
The Facility is not responsible for loss or damage to any personal items left with the pet, including but not limited to: bedding, toys, collars, or leashes.

4. BEHAVIOR
Owner certifies that {{PET_NAME}} has not harmed or shown aggression toward any person or other animal. The Facility reserves the right to refuse service or separate pets that display aggressive behavior.

5. LIABILITY
Owner agrees to indemnify and hold harmless the Facility from any claims, damages, or expenses arising from the pet's stay, except in cases of negligence or willful misconduct by the Facility.

6. PAYMENT
Owner agrees to pay all boarding fees and any additional charges for services rendered. Payment is due at time of check-out.

7. ABANDONMENT
If pet is not picked up within 7 days of the scheduled check-out date and the Owner cannot be contacted, the pet will be considered abandoned and may be turned over to local animal control.

ACKNOWLEDGMENT
By signing below, Owner acknowledges that they have read, understood, and agree to all terms and conditions of this agreement.

Owner Signature: {{SIGNATURE}}
Owner Name: {{CUSTOMER_NAME}}
Date: {{DATE}}`,
          isDefault: true,
          isActive: true
        }
      });

      console.log('✓ Created default service agreement template');
    }

    console.log('\n✓ Seeding completed successfully!');
  } catch (error) {
    console.error('Error seeding templates:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

seedCheckInTemplates()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
