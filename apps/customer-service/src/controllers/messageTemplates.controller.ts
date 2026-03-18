import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';

/**
 * Get all message templates
 */
export const getAllTemplates = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const tenantId = (req as any).tenantId;
    const { type, category, isActive } = req.query;

    const where: any = { tenantId };

    if (type) where.type = type as string;
    if (category) where.category = category as string;
    if (isActive !== undefined) where.isActive = isActive === 'true';

    const templates = await prisma.messageTemplate.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      status: 'success',
      results: templates.length,
      data: templates,
    });
  } catch (error) {
    console.error('Error fetching message templates:', error);
    next(error);
  }
};

/**
 * Get template by ID
 */
export const getTemplateById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const tenantId = (req as any).tenantId;
    const { id } = req.params;

    const template = await prisma.messageTemplate.findFirst({
      where: { id, tenantId },
    });

    if (!template) {
      return res.status(404).json({
        status: 'error',
        message: 'Template not found',
      });
    }

    res.json({
      status: 'success',
      data: template,
    });
  } catch (error) {
    console.error('Error fetching template:', error);
    next(error);
  }
};

/**
 * Create new template
 */
export const createTemplate = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const tenantId = (req as any).tenantId;
    const { name, type, category, subject, body, variables } = req.body;

    // Validate required fields
    if (!name || !type || !category || !body) {
      return res.status(400).json({
        status: 'error',
        message: 'Missing required fields: name, type, category, body',
      });
    }

    // Validate type
    if (!['SMS', 'EMAIL'].includes(type)) {
      return res.status(400).json({
        status: 'error',
        message: 'Type must be SMS or EMAIL',
      });
    }

    // Validate category
    const validCategories = [
      'APPOINTMENT_REMINDER',
      'MARKETING',
      'CONFIRMATION',
      'FOLLOW_UP',
      'PROMOTIONAL',
    ];
    if (!validCategories.includes(category)) {
      return res.status(400).json({
        status: 'error',
        message: `Category must be one of: ${validCategories.join(', ')}`,
      });
    }

    // Extract variables from body and subject
    const variableRegex = /\{\{(\w+)\}\}/g;
    const bodyMatches = Array.from(body.matchAll(variableRegex));
    const extractedVars = bodyMatches.map(
      (match: RegExpMatchArray) => match[1]
    );

    if (subject) {
      const subjectMatches = Array.from(subject.matchAll(variableRegex));
      const subjectVars = subjectMatches.map(
        (match: RegExpMatchArray) => match[1]
      );
      extractedVars.push(...subjectVars);
    }

    const uniqueVariables = Array.from(new Set(extractedVars));

    const template = await prisma.messageTemplate.create({
      data: {
        tenantId,
        name,
        type,
        category,
        subject: type === 'EMAIL' ? subject : null,
        body,
        variables: variables || uniqueVariables,
        isActive: true,
      },
    });

    res.status(201).json({
      status: 'success',
      data: template,
    });
  } catch (error) {
    console.error('Error creating template:', error);
    next(error);
  }
};

/**
 * Update template
 */
export const updateTemplate = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const tenantId = (req as any).tenantId;
    const { id } = req.params;
    const { name, type, category, subject, body, variables, isActive } =
      req.body;

    // Check if template exists
    const existing = await prisma.messageTemplate.findFirst({
      where: { id, tenantId },
    });

    if (!existing) {
      return res.status(404).json({
        status: 'error',
        message: 'Template not found',
      });
    }

    // Extract variables if body is being updated
    let updatedVariables = variables;
    if (body) {
      const variableRegex = /\{\{(\w+)\}\}/g;
      const bodyMatches = Array.from(body.matchAll(variableRegex));
      const extractedVars = bodyMatches.map(
        (match: RegExpMatchArray) => match[1]
      );

      if (subject) {
        const subjectMatches = Array.from(subject.matchAll(variableRegex));
        const subjectVars = subjectMatches.map(
          (match: RegExpMatchArray) => match[1]
        );
        extractedVars.push(...subjectVars);
      }

      updatedVariables = Array.from(new Set(extractedVars));
    }

    const template = await prisma.messageTemplate.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(type && { type }),
        ...(category && { category }),
        ...(subject !== undefined && { subject }),
        ...(body && { body }),
        ...(updatedVariables && { variables: updatedVariables }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    res.json({
      status: 'success',
      data: template,
    });
  } catch (error) {
    console.error('Error updating template:', error);
    next(error);
  }
};

/**
 * Delete template
 */
export const deleteTemplate = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const tenantId = (req as any).tenantId;
    const { id } = req.params;

    // Check if template exists
    const existing = await prisma.messageTemplate.findFirst({
      where: { id, tenantId },
    });

    if (!existing) {
      return res.status(404).json({
        status: 'error',
        message: 'Template not found',
      });
    }

    await prisma.messageTemplate.delete({
      where: { id },
    });

    res.json({
      status: 'success',
      message: 'Template deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting template:', error);
    next(error);
  }
};

/**
 * Duplicate template
 */
export const duplicateTemplate = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const tenantId = (req as any).tenantId;
    const { id } = req.params;

    // Get original template
    const original = await prisma.messageTemplate.findFirst({
      where: { id, tenantId },
    });

    if (!original) {
      return res.status(404).json({
        status: 'error',
        message: 'Template not found',
      });
    }

    // Create duplicate
    const duplicate = await prisma.messageTemplate.create({
      data: {
        tenantId,
        name: `${original.name} (Copy)`,
        type: original.type,
        category: original.category,
        subject: original.subject,
        body: original.body,
        variables: original.variables,
        isActive: true,
      },
    });

    res.status(201).json({
      status: 'success',
      data: duplicate,
    });
  } catch (error) {
    console.error('Error duplicating template:', error);
    next(error);
  }
};

/**
 * Seed default useful email templates
 */
export const seedDefaultTemplates = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const tenantId = (req as any).tenantId;

    const defaultTemplates = [
      {
        name: 'Welcome New Customer',
        type: 'EMAIL',
        category: 'MARKETING',
        subject: 'Welcome to {{businessName}}! 🐾',
        body: `<h2>Welcome to the Family, {{customerName}}!</h2>
<p>Thank you for choosing {{businessName}} for your pet care needs. We're thrilled to have you and {{petName}} as part of our family!</p>
<h3>What's Next?</h3>
<ul>
<li>📅 <strong>Book your first appointment</strong> - Call us or use our online booking</li>
<li>📋 <strong>Complete your pet profile</strong> - Help us get to know {{petName}} better</li>
<li>💉 <strong>Upload vaccination records</strong> - Keep everything in one place</li>
</ul>
<p>If you have any questions, don't hesitate to reach out!</p>
<p>Best regards,<br>The {{businessName}} Team</p>`,
        variables: ['businessName', 'customerName', 'petName'],
      },
      {
        name: 'Reservation Confirmation',
        type: 'EMAIL',
        category: 'CONFIRMATION',
        subject: 'Reservation Confirmed for {{petName}} - {{serviceName}}',
        body: `<h2>Your Reservation is Confirmed! ✅</h2>
<p>Hi {{customerName}},</p>
<p>We're excited to confirm your upcoming reservation:</p>
<div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 15px 0;">
<p><strong>Pet:</strong> {{petName}}</p>
<p><strong>Service:</strong> {{serviceName}}</p>
<p><strong>Check-in:</strong> {{startDate}}</p>
<p><strong>Check-out:</strong> {{endDate}}</p>
</div>
<h3>What to Bring:</h3>
<ul>
<li>Current vaccination records (if not on file)</li>
<li>Any medications with instructions</li>
<li>{{petName}}'s favorite food and treats</li>
<li>A familiar toy or blanket (optional)</li>
</ul>
<p>See you soon!</p>
<p>{{businessName}}</p>`,
        variables: [
          'customerName',
          'petName',
          'serviceName',
          'startDate',
          'endDate',
          'businessName',
        ],
      },
      {
        name: 'Appointment Reminder',
        type: 'EMAIL',
        category: 'APPOINTMENT_REMINDER',
        subject: "Reminder: {{petName}}'s appointment tomorrow!",
        body: `<h2>Appointment Reminder 📅</h2>
<p>Hi {{customerName}},</p>
<p>This is a friendly reminder that {{petName}} has an appointment scheduled for tomorrow:</p>
<div style="background: #e3f2fd; padding: 15px; border-radius: 8px; margin: 15px 0;">
<p><strong>Date:</strong> {{appointmentDate}}</p>
<p><strong>Time:</strong> {{appointmentTime}}</p>
<p><strong>Service:</strong> {{serviceName}}</p>
</div>
<p>Please arrive 10-15 minutes early to complete check-in.</p>
<p>Need to reschedule? Please call us at {{businessPhone}} or reply to this email.</p>
<p>See you tomorrow!</p>
<p>{{businessName}}</p>`,
        variables: [
          'customerName',
          'petName',
          'appointmentDate',
          'appointmentTime',
          'serviceName',
          'businessPhone',
          'businessName',
        ],
      },
      {
        name: 'Thank You - Post Visit',
        type: 'EMAIL',
        category: 'FOLLOW_UP',
        subject: 'Thank you for visiting {{businessName}}!',
        body: `<h2>Thank You for Your Visit! 🙏</h2>
<p>Hi {{customerName}},</p>
<p>Thank you for trusting us with {{petName}}'s care! We hope you both had a great experience.</p>
<p>We'd love to hear your feedback - your opinion helps us improve and serve you better.</p>
<h3>Book Your Next Visit</h3>
<p>Ready to schedule {{petName}}'s next appointment? We're here when you need us!</p>
<p>Thank you for being a valued member of our family.</p>
<p>Warm regards,<br>{{businessName}}</p>`,
        variables: ['customerName', 'petName', 'businessName'],
      },
      {
        name: 'Monthly Newsletter',
        type: 'EMAIL',
        category: 'MARKETING',
        subject: '{{businessName}} Newsletter - {{monthYear}}',
        body: `<h2>{{businessName}} Monthly Update 📰</h2>
<p>Hi {{customerName}},</p>
<p>Here's what's happening at {{businessName}} this month!</p>
<h3>🎉 Special Offers</h3>
<p>[Add your current promotions here]</p>
<h3>📅 Upcoming Events</h3>
<p>[Add upcoming events or holiday schedules]</p>
<h3>💡 Pet Care Tip of the Month</h3>
<p>[Add a helpful pet care tip]</p>
<h3>📸 Pet Spotlight</h3>
<p>[Feature a pet of the month or fun photos]</p>
<p>Thank you for being part of our community!</p>
<p>{{businessName}}</p>`,
        variables: ['businessName', 'customerName', 'monthYear'],
      },
      {
        name: 'Holiday Schedule Notice',
        type: 'EMAIL',
        category: 'MARKETING',
        subject: '{{businessName}} Holiday Hours & Booking Reminder',
        body: `<h2>Holiday Schedule Update 🎄</h2>
<p>Hi {{customerName}},</p>
<p>The holidays are approaching! Here's important information about our schedule:</p>
<h3>Holiday Hours</h3>
<div style="background: #fff3e0; padding: 15px; border-radius: 8px; margin: 15px 0;">
<p>[Add your holiday schedule here]</p>
</div>
<h3>🐾 Book Early!</h3>
<p>Holiday boarding fills up fast. If you're planning to travel, we recommend booking {{petName}}'s stay as soon as possible to secure your spot.</p>
<p>Questions? Give us a call at {{businessPhone}}.</p>
<p>Happy Holidays from the {{businessName}} family!</p>`,
        variables: ['customerName', 'petName', 'businessPhone', 'businessName'],
      },
      {
        name: 'Vaccination Reminder',
        type: 'EMAIL',
        category: 'APPOINTMENT_REMINDER',
        subject: 'Vaccination Update Needed for {{petName}}',
        body: `<h2>Vaccination Reminder 💉</h2>
<p>Hi {{customerName}},</p>
<p>Our records show that {{petName}}'s vaccinations may need to be updated soon.</p>
<p>To ensure {{petName}} can continue enjoying our services, please update the following:</p>
<ul>
<li>Rabies vaccination</li>
<li>DHPP/Distemper</li>
<li>Bordetella (Kennel Cough)</li>
</ul>
<p>Please send us updated vaccination records or schedule an appointment with your vet.</p>
<p>Questions? Contact us at {{businessPhone}}.</p>
<p>Thank you,<br>{{businessName}}</p>`,
        variables: ['customerName', 'petName', 'businessPhone', 'businessName'],
      },
      {
        name: 'Special Promotion',
        type: 'EMAIL',
        category: 'PROMOTIONAL',
        subject: '🎁 Special Offer for {{customerName}}!',
        body: `<h2>Exclusive Offer Just for You! 🎁</h2>
<p>Hi {{customerName}},</p>
<p>As a valued customer, we wanted to share a special offer with you:</p>
<div style="background: #e8f5e9; padding: 20px; border-radius: 8px; margin: 15px 0; text-align: center;">
<h3 style="color: #2e7d32; margin: 0;">{{promotionTitle}}</h3>
<p style="font-size: 24px; font-weight: bold; color: #1b5e20;">{{promotionDetails}}</p>
<p style="color: #666;">Valid through {{expirationDate}}</p>
</div>
<p>Book now to take advantage of this offer!</p>
<p>{{businessName}}</p>`,
        variables: [
          'customerName',
          'promotionTitle',
          'promotionDetails',
          'expirationDate',
          'businessName',
        ],
      },
      // SMS Templates
      {
        name: 'SMS - Welcome',
        type: 'SMS',
        category: 'MARKETING',
        body: `Welcome to {{businessName}}! 🐾 We're excited to have you & {{petName}} join our family. Questions? Reply to this text or call {{businessPhone}}.`,
        variables: ['businessName', 'petName', 'businessPhone'],
      },
      {
        name: 'SMS - Reservation Confirmed',
        type: 'SMS',
        category: 'CONFIRMATION',
        body: `✅ Confirmed! {{petName}}'s {{serviceName}} is booked for {{startDate}}. Check-in time: {{checkInTime}}. See you soon! - {{businessName}}`,
        variables: [
          'petName',
          'serviceName',
          'startDate',
          'checkInTime',
          'businessName',
        ],
      },
      {
        name: 'SMS - Appointment Reminder',
        type: 'SMS',
        category: 'APPOINTMENT_REMINDER',
        body: `📅 Reminder: {{petName}} has an appointment tomorrow at {{appointmentTime}} for {{serviceName}}. Please arrive 10 min early. Reply C to confirm or R to reschedule.`,
        variables: ['petName', 'appointmentTime', 'serviceName'],
      },
      {
        name: 'SMS - Ready for Pickup',
        type: 'SMS',
        category: 'CONFIRMATION',
        body: `🐕 {{petName}} is ready for pickup! We're open until {{closeTime}}. Can't wait to tell you about their stay! - {{businessName}}`,
        variables: ['petName', 'closeTime', 'businessName'],
      },
      {
        name: 'SMS - Thank You',
        type: 'SMS',
        category: 'FOLLOW_UP',
        body: `Thanks for visiting {{businessName}}! 🙏 We loved having {{petName}}. Book your next visit at {{bookingUrl}} or reply for assistance.`,
        variables: ['businessName', 'petName', 'bookingUrl'],
      },
      {
        name: 'SMS - Vaccination Reminder',
        type: 'SMS',
        category: 'APPOINTMENT_REMINDER',
        body: `⚠️ Hi {{customerName}}, {{petName}}'s vaccinations need updating before their next visit. Please send updated records or call {{businessPhone}}.`,
        variables: ['customerName', 'petName', 'businessPhone'],
      },
      {
        name: 'SMS - Holiday Booking',
        type: 'SMS',
        category: 'MARKETING',
        body: `🎄 Holiday boarding fills fast! Book {{petName}}'s stay now to secure your spot. Call {{businessPhone}} or book online. - {{businessName}}`,
        variables: ['petName', 'businessPhone', 'businessName'],
      },
      {
        name: 'SMS - Special Offer',
        type: 'SMS',
        category: 'PROMOTIONAL',
        body: `🎁 {{customerName}}, enjoy {{promotionDetails}}! Valid thru {{expirationDate}}. Book now: {{businessPhone}}. - {{businessName}}`,
        variables: [
          'customerName',
          'promotionDetails',
          'expirationDate',
          'businessPhone',
          'businessName',
        ],
      },
    ];

    const createdTemplates = [];

    for (const template of defaultTemplates) {
      // Check if template with same name exists
      const existing = await prisma.messageTemplate.findFirst({
        where: { tenantId, name: template.name },
      });

      if (!existing) {
        const created = await prisma.messageTemplate.create({
          data: {
            tenantId,
            ...template,
            isActive: true,
          },
        });
        createdTemplates.push(created);
      }
    }

    res.status(201).json({
      status: 'success',
      message: `Created ${createdTemplates.length} new templates`,
      data: createdTemplates,
    });
  } catch (error) {
    console.error('Error seeding templates:', error);
    next(error);
  }
};
