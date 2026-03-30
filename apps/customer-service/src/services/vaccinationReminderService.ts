/**
 * Vaccination Reminder Service
 * Sends automated email reminders for expiring vaccinations
 */

import { prisma } from '../config/prisma.js';
import { EmailService } from './email.service.js';
import { logger } from '../utils/logger.js';
const emailService = new EmailService();

interface ExpiringVaccine {
  petId: string;
  petName: string;
  customerId: string;
  customerEmail: string;
  customerFirstName: string;
  vaccineName: string;
  expirationDate: Date;
  daysUntilExpiration: number;
}

/**
 * Find pets with vaccines expiring within the specified number of days
 */
export async function findExpiringVaccines(
  tenantId: string,
  daysAhead: number = 30
): Promise<ExpiringVaccine[]> {
  const today = new Date();
  const futureDate = new Date();
  futureDate.setDate(today.getDate() + daysAhead);

  const pets = await prisma.pet.findMany({
    where: {
      tenantId,
      isActive: true,
      vaccineExpirations: {
        not: null,
      },
    },
    include: {
      owner: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
        },
      },
    },
  });

  const expiringVaccines: ExpiringVaccine[] = [];

  for (const pet of pets) {
    if (!pet.vaccineExpirations || !pet.owner?.email) continue;

    const expirations = pet.vaccineExpirations as Record<string, string>;

    for (const [vaccineName, expirationStr] of Object.entries(expirations)) {
      const expirationDate = new Date(expirationStr);

      if (expirationDate >= today && expirationDate <= futureDate) {
        const daysUntilExpiration = Math.ceil(
          (expirationDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
        );

        expiringVaccines.push({
          petId: pet.id,
          petName: pet.name,
          customerId: pet.owner.id,
          customerEmail: pet.owner.email,
          customerFirstName: pet.owner.firstName,
          vaccineName,
          expirationDate,
          daysUntilExpiration,
        });
      }
    }
  }

  return expiringVaccines;
}

/**
 * Send vaccination reminder emails
 */
export async function sendVaccinationReminders(tenantId: string): Promise<{
  sent: number;
  failed: number;
  errors: string[];
}> {
  const results = {
    sent: 0,
    failed: 0,
    errors: [] as string[],
  };

  try {
    // Get vaccines expiring in next 30 days
    const expiringVaccines = await findExpiringVaccines(tenantId, 30);

    // Group by customer to send one email per customer
    const byCustomer = new Map<string, ExpiringVaccine[]>();
    for (const vaccine of expiringVaccines) {
      const existing = byCustomer.get(vaccine.customerId) || [];
      existing.push(vaccine);
      byCustomer.set(vaccine.customerId, existing);
    }

    // Send emails
    for (const [customerId, vaccines] of byCustomer) {
      try {
        const firstVaccine = vaccines[0];

        // Build vaccine list HTML
        const vaccineListHtml = vaccines
          .map(
            (v) =>
              `<li><strong>${v.petName}</strong>: ${v.vaccineName} expires in ${
                v.daysUntilExpiration
              } days (${v.expirationDate.toLocaleDateString()})</li>`
          )
          .join('\n');

        await emailService.sendEmail({
          to: firstVaccine.customerEmail,
          subject: `Vaccination Reminder for Your Pet${
            vaccines.length > 1 ? 's' : ''
          }`,
          html: `
            <h2>Vaccination Reminder</h2>
            <p>Hi ${firstVaccine.customerFirstName},</p>
            <p>This is a friendly reminder that the following vaccinations are expiring soon:</p>
            <ul>
              ${vaccineListHtml}
            </ul>
            <p>Please schedule an appointment with your veterinarian to keep your pet's vaccinations up to date.</p>
            <p>Updated vaccination records can be uploaded through our customer portal or brought to your next visit.</p>
            <p>Thank you for keeping your pets healthy!</p>
          `,
        });

        results.sent++;
        logger.info(
          `Vaccination reminder sent to ${firstVaccine.customerEmail}`
        );
      } catch (err: any) {
        results.failed++;
        results.errors.push(
          `Failed to send to customer ${customerId}: ${err.message}`
        );
        logger.error(`Failed to send vaccination reminder: ${err.message}`);
      }
    }
  } catch (err: any) {
    results.errors.push(`Service error: ${err.message}`);
    logger.error(`Vaccination reminder service error: ${err.message}`);
  }

  return results;
}

/**
 * Get vaccination reminder stats for dashboard
 */
export async function getVaccinationReminderStats(tenantId: string): Promise<{
  expiringIn7Days: number;
  expiringIn30Days: number;
  expired: number;
}> {
  const pets = await prisma.pet.findMany({
    where: {
      tenantId,
      isActive: true,
      vaccineExpirations: {
        not: null,
      },
    },
  });

  const today = new Date();
  const in7Days = new Date();
  in7Days.setDate(today.getDate() + 7);
  const in30Days = new Date();
  in30Days.setDate(today.getDate() + 30);

  let expiringIn7Days = 0;
  let expiringIn30Days = 0;
  let expired = 0;

  for (const pet of pets) {
    if (!pet.vaccineExpirations) continue;

    const expirations = pet.vaccineExpirations as Record<string, string>;

    for (const expirationStr of Object.values(expirations)) {
      const expirationDate = new Date(expirationStr);

      if (expirationDate < today) {
        expired++;
      } else if (expirationDate <= in7Days) {
        expiringIn7Days++;
      } else if (expirationDate <= in30Days) {
        expiringIn30Days++;
      }
    }
  }

  return { expiringIn7Days, expiringIn30Days, expired };
}

export default {
  findExpiringVaccines,
  sendVaccinationReminders,
  getVaccinationReminderStats,
};
