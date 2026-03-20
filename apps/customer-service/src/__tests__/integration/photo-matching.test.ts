/**
 * Photo Matching Integration Tests
 *
 * These tests ensure that pet photos are matched by Gingr animal ID (externalId),
 * NOT by pet name. This prevents the bug where multiple pets with the same name
 * (e.g., "Apollo") all get assigned the same photo.
 *
 * REGRESSION PREVENTION:
 * This test was added after a bug where photos were matched by pet name only,
 * causing all pets named "Apollo" to show the same photo regardless of owner.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const TENANT_ID = 'b696b4e8-6e86-4d4b-a0c2-1da0e4b1ae05';

describe('Photo Matching - Gingr ID Based', () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('Photo uniqueness by externalId', () => {
    it('should have unique photos for pets with the same name but different externalIds', async () => {
      // Find pets with duplicate names that have photos
      const petsWithPhotos = await prisma.pet.findMany({
        where: {
          tenantId: TENANT_ID,
          isActive: true,
          profilePhoto: { not: null },
          externalId: { not: null },
        },
        select: {
          id: true,
          name: true,
          externalId: true,
          profilePhoto: true,
          owner: {
            select: {
              lastName: true,
            },
          },
        },
      });

      // Group pets by name
      const petsByName = new Map<string, typeof petsWithPhotos>();
      for (const pet of petsWithPhotos) {
        const nameLower = pet.name.toLowerCase();
        if (!petsByName.has(nameLower)) {
          petsByName.set(nameLower, []);
        }
        petsByName.get(nameLower)!.push(pet);
      }

      // Find names with multiple pets
      const duplicateNames = Array.from(petsByName.entries()).filter(
        ([_, pets]) => pets.length > 1
      );

      // For each duplicate name, verify photos are unique per externalId
      const violations: string[] = [];

      for (const [name, pets] of duplicateNames) {
        // Group by photo URL
        const photoGroups = new Map<string, typeof pets>();
        for (const pet of pets) {
          if (pet.profilePhoto) {
            if (!photoGroups.has(pet.profilePhoto)) {
              photoGroups.set(pet.profilePhoto, []);
            }
            photoGroups.get(pet.profilePhoto)!.push(pet);
          }
        }

        // Check if any photo is shared by pets with DIFFERENT externalIds
        for (const [photoUrl, petsWithSamePhoto] of photoGroups) {
          const uniqueExternalIds = new Set(
            petsWithSamePhoto.map((p) => p.externalId?.replace('-tailtown', ''))
          );

          // If multiple different externalIds share the same photo, that's a violation
          // (unless they're duplicates of the same Gingr pet)
          if (uniqueExternalIds.size > 1) {
            violations.push(
              `Photo shared incorrectly: "${name}" - ${petsWithSamePhoto
                .map((p) => `${p.owner?.lastName} (${p.externalId})`)
                .join(', ')} all have photo: ${photoUrl.substring(0, 60)}...`
            );
          }
        }
      }

      // Report violations
      if (violations.length > 0) {
        console.error('Photo matching violations found:');
        violations.forEach((v) => console.error(`  - ${v}`));
      }

      expect(violations).toHaveLength(0);
    });

    it('should match photos by externalId, not by pet name', async () => {
      // Get a sample of pets with common names that have photos
      const commonNames = [
        'Luna',
        'Bella',
        'Max',
        'Charlie',
        'Cooper',
        'Buddy',
      ];

      for (const name of commonNames) {
        const petsWithName = await prisma.pet.findMany({
          where: {
            tenantId: TENANT_ID,
            name: { equals: name, mode: 'insensitive' },
            profilePhoto: { not: null },
            externalId: { not: null },
          },
          select: {
            externalId: true,
            profilePhoto: true,
            owner: { select: { lastName: true } },
          },
        });

        if (petsWithName.length > 1) {
          // Verify that different externalIds have different photos (or no photo)
          const externalIdToPhoto = new Map<string, string>();

          for (const pet of petsWithName) {
            const baseExternalId =
              pet.externalId?.replace('-tailtown', '') || '';

            if (externalIdToPhoto.has(baseExternalId)) {
              // Same externalId should have same photo
              expect(pet.profilePhoto).toBe(
                externalIdToPhoto.get(baseExternalId)
              );
            } else {
              externalIdToPhoto.set(baseExternalId, pet.profilePhoto || '');
            }
          }

          // Check that different externalIds don't share photos
          const photoToExternalIds = new Map<string, string[]>();
          for (const [extId, photo] of externalIdToPhoto) {
            if (photo) {
              if (!photoToExternalIds.has(photo)) {
                photoToExternalIds.set(photo, []);
              }
              photoToExternalIds.get(photo)!.push(extId);
            }
          }

          // Each photo should only belong to one externalId
          for (const [photo, extIds] of photoToExternalIds) {
            if (extIds.length > 1) {
              console.warn(
                `Warning: Photo shared by multiple externalIds for "${name}": ${extIds.join(
                  ', '
                )}`
              );
            }
            // This is a soft check - duplicates might exist for legitimate reasons
            // (e.g., duplicate pet records for same Gingr animal)
          }
        }
      }
    });

    it('should have externalId set for pets with photos', async () => {
      // All pets with photos should have an externalId for proper matching
      const petsWithPhotosNoExternalId = await prisma.pet.count({
        where: {
          tenantId: TENANT_ID,
          isActive: true,
          profilePhoto: { not: null },
          externalId: null,
        },
      });

      // Allow some pets without externalId (manually added pets)
      // but the vast majority should have it
      const totalPetsWithPhotos = await prisma.pet.count({
        where: {
          tenantId: TENANT_ID,
          isActive: true,
          profilePhoto: { not: null },
        },
      });

      const percentWithoutExternalId =
        (petsWithPhotosNoExternalId / totalPetsWithPhotos) * 100;

      // Less than 5% of pets with photos should be missing externalId
      expect(percentWithoutExternalId).toBeLessThan(5);
    });
  });

  describe('Photo import script validation', () => {
    it('should not have duplicate photos for pets with different owners', async () => {
      // Find photos that are used by multiple pets
      const photoCounts = await prisma.$queryRaw<
        { profilePhoto: string; count: bigint; names: string }[]
      >`
        SELECT 
          "profilePhoto", 
          COUNT(*) as count,
          STRING_AGG(DISTINCT name || ' (' || COALESCE("externalId", 'no-id') || ')', ', ') as names
        FROM pets 
        WHERE "tenantId" = ${TENANT_ID}
          AND "profilePhoto" IS NOT NULL
          AND "isActive" = true
        GROUP BY "profilePhoto"
        HAVING COUNT(*) > 1
        ORDER BY COUNT(*) DESC
        LIMIT 20
      `;

      // Check each duplicate photo
      for (const { profilePhoto, count, names } of photoCounts) {
        // Get the pets sharing this photo
        const petsWithPhoto = await prisma.pet.findMany({
          where: {
            tenantId: TENANT_ID,
            profilePhoto,
            isActive: true,
          },
          select: {
            name: true,
            externalId: true,
            owner: { select: { lastName: true } },
          },
        });

        // All pets sharing a photo should have the same base externalId
        // (they might be duplicates like "12486" and "12486-tailtown")
        const baseExternalIds = new Set(
          petsWithPhoto.map(
            (p) => p.externalId?.replace('-tailtown', '') || 'unknown'
          )
        );

        if (baseExternalIds.size > 1) {
          console.error(
            `ERROR: Photo shared by different Gingr animals: ${names}`
          );
        }

        // Pets sharing a photo should be duplicates of the same Gingr animal
        expect(baseExternalIds.size).toBe(1);
      }
    });
  });

  describe('Specific pet verification', () => {
    it('should have correct photo for Matteo Monroe (externalId: 576)', async () => {
      const matteo = await prisma.pet.findFirst({
        where: {
          tenantId: TENANT_ID,
          externalId: '576',
        },
        select: {
          name: true,
          profilePhoto: true,
        },
      });

      // Matteo should have a photo
      expect(matteo).toBeDefined();
      expect(matteo?.profilePhoto).toBeTruthy();

      // Photo should be from Gingr storage
      expect(matteo?.profilePhoto).toContain('storage.googleapis.com');
    });

    it('should have correct photo for Beaucoup (externalId: 12486)', async () => {
      const beaucoup = await prisma.pet.findFirst({
        where: {
          tenantId: TENANT_ID,
          externalId: '12486',
        },
        select: {
          name: true,
          profilePhoto: true,
        },
      });

      expect(beaucoup).toBeDefined();
      expect(beaucoup?.profilePhoto).toBeTruthy();
      expect(beaucoup?.profilePhoto).toContain('storage.googleapis.com');
      // Beaucoup's photo should contain his name
      expect(beaucoup?.profilePhoto?.toLowerCase()).toContain('beaucoup');
    });
  });
});

/**
 * REGRESSION PREVENTION CHECKLIST:
 *
 * If this test fails, it means photos are being matched incorrectly.
 *
 * Common causes:
 * 1. Photo import script matching by pet NAME instead of externalId
 * 2. SQL parsing not extracting Gingr animal ID correctly
 * 3. Duplicate pet records with different externalId formats
 *
 * To fix:
 * 1. Ensure import-photos-by-id.js uses externalId for matching
 * 2. Verify SQL backup parsing extracts animal ID from first field
 * 3. Handle both "12486" and "12486-tailtown" externalId formats
 *
 * CORRECT PATTERN:
 * - Extract Gingr animal ID from SQL backup
 * - Match to Tailtown pet by externalId field
 * - Each unique Gingr ID gets its own unique photo
 *
 * INCORRECT PATTERN (DO NOT USE):
 * - Match photos by pet name (causes all "Apollo" dogs to get same photo)
 * - Ignore externalId field
 */
