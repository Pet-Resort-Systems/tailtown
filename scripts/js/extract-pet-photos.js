/**
 * Extract pet photos and icons from Gingr data
 *
 * Based on earlier API test, Gingr animals have an 'image' field with URLs like:
 * "https://storage.googleapis.com/gingr-app-user-uploads/2020/05/15/c2ed8720-96f2-11ea-a7d5-ef010b7ec138-Screen Shot 2020-05-15 at 2.48.06 PM.png"
 */

const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

const GINGR_CONFIG = {
  subdomain: 'tailtownpetresort',
  apiKey: 'c84c09ecfacdf23a495505d2ae1df533',
};

async function extractPetPhotos() {
  const baseUrl = `https://${GINGR_CONFIG.subdomain}.gingrapp.com/api/v1`;

  try {
    console.log('Fetching animals from Gingr...\n');

    const response = await fetch(`${baseUrl}/animals`, {
      headers: { Authorization: `Bearer ${GINGR_CONFIG.apiKey}` },
    });

    const animals = await response.json();

    if (!Array.isArray(animals)) {
      console.error('Error: Expected array of animals');
      return;
    }

    console.log(`Found ${animals.length} animals\n`);

    // Analyze photo data
    const withPhotos = animals.filter((a) => a.image && a.image.trim() !== '');
    const withoutPhotos = animals.filter(
      (a) => !a.image || a.image.trim() === ''
    );

    console.log('='.repeat(80));
    console.log('PHOTO STATISTICS');
    console.log('='.repeat(80));
    console.log(`Total animals: ${animals.length}`);
    console.log(
      `With photos: ${withPhotos.length} (${Math.round((withPhotos.length / animals.length) * 100)}%)`
    );
    console.log(
      `Without photos: ${withoutPhotos.length} (${Math.round((withoutPhotos.length / animals.length) * 100)}%)`
    );

    // Sample photos
    console.log('\n' + '='.repeat(80));
    console.log('SAMPLE PHOTO URLs (first 10)');
    console.log('='.repeat(80));
    withPhotos.slice(0, 10).forEach((animal, i) => {
      console.log(`${i + 1}. ${animal.first_name} (ID: ${animal.id})`);
      console.log(`   ${animal.image}\n`);
    });

    // Check for icon-related fields
    console.log('='.repeat(80));
    console.log('CHECKING FOR ICON FIELDS');
    console.log('='.repeat(80));

    const sampleAnimal = animals[0];
    const iconFields = [];

    for (const [key, value] of Object.entries(sampleAnimal)) {
      const lowerKey = key.toLowerCase();
      if (
        lowerKey.includes('icon') ||
        lowerKey.includes('flag') ||
        lowerKey.includes('badge') ||
        lowerKey.includes('tag') ||
        lowerKey.includes('vip') ||
        lowerKey.includes('banned')
      ) {
        iconFields.push({ field: key, value, type: typeof value });
      }
    }

    if (iconFields.length > 0) {
      console.log('Found icon-related fields:');
      iconFields.forEach((f) => {
        console.log(`  ${f.field}: ${f.value} (${f.type})`);
      });
    } else {
      console.log('No explicit icon fields found');
      console.log('\nBut we already map these flags to icons:');
      console.log('  - vip: "1" or "0"');
      console.log('  - banned: "1" or "0"');
      console.log('  - medicines: text field');
      console.log('  - allergies: text field');
      console.log('  - temperment: numeric value');
    }

    // Create download script
    console.log('\n' + '='.repeat(80));
    console.log('PHOTO DOWNLOAD OPTIONS');
    console.log('='.repeat(80));
    console.log('\nOption 1: Download all photos now');
    console.log('  - Downloads all images to local storage');
    console.log('  - Updates pet records with local paths');
    console.log('  - Time: ~' + Math.ceil(withPhotos.length / 10) + ' minutes');

    console.log('\nOption 2: Store Gingr URLs');
    console.log('  - Save URLs in pet records');
    console.log('  - Load images on-demand from Gingr');
    console.log('  - Time: ~1 minute');

    console.log('\nOption 3: Manual upload');
    console.log('  - Users upload photos after migration');
    console.log('  - Time: User-dependent');

    // Save photo list to file
    const photoList = withPhotos.map((a) => ({
      id: a.id,
      name: a.first_name,
      imageUrl: a.image,
    }));

    fs.writeFileSync(
      'gingr-pet-photos.json',
      JSON.stringify(photoList, null, 2)
    );

    console.log('\n✅ Saved photo list to: gingr-pet-photos.json');
  } catch (error) {
    console.error('Error:', error.message);
  }
}

extractPetPhotos();
