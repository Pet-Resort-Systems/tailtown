#!/usr/bin/env node

/**
 * Comprehensive Staff Data Import Tool
 *
 * Imports staff, availability, and permissions from various sources:
 * - Gingr API (employees and availability)
 * - CSV files (staff data, availability schedules)
 * - JSON files (structured data)
 *
 * Usage:
 *   node scripts/import-staff-data.js <source-type> <source-details>
 *
 * Examples:
 *   node scripts/import-staff-data.js gingr <subdomain> <api-key>
 *   node scripts/import-staff-data.js csv staff-data.csv
 *   node scripts/import-staff-data.js json staff-data.json
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const { URL } = require('url');

// Parse command line arguments
const args = process.argv.slice(2);
if (args.length < 1) {
  console.error('❌ Error: Missing required arguments');
  console.log('\nUsage:');
  console.log(
    '  Gingr Import:    node scripts/import-staff-data.js gingr <subdomain> <api-key>'
  );
  console.log(
    '  CSV Import:      node scripts/import-staff-data.js csv <file-path>'
  );
  console.log(
    '  JSON Import:     node scripts/import-staff-data.js json <file-path>'
  );
  console.log(
    '  Hash Password:   node scripts/import-staff-data.js hash-password'
  );
  console.log('\nExamples:');
  console.log(
    '  node scripts/import-staff-data.js gingr tailtown abc123xyz456'
  );
  console.log('  node scripts/import-staff-data.js csv ./staff-data.csv');
  console.log('  node scripts/import-staff-data.js json ./staff-data.json');
  console.log('  node scripts/import-staff-data.js hash-password');
  process.exit(1);
}

const [sourceType, ...sourceArgs] = args;

console.log('\n👥 Comprehensive Staff Data Import Tool');
console.log('═════════════════════════════════════════════');
console.log(`Source Type: ${sourceType.toUpperCase()}`);
console.log('');

/**
 * Make POST request to Gingr API (using built-in https module)
 */
function makeGingrRequest(url, data = {}) {
  return new Promise((resolve, reject) => {
    const formData = new URLSearchParams();

    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        formData.append(key, String(value));
      }
    });

    const postData = formData.toString();
    const parsedUrl = new URL(url);

    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || 443,
      path: parsedUrl.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData),
      },
    };

    const req = https.request(options, (res) => {
      let responseData = '';

      res.on('data', (chunk) => {
        responseData += chunk;
      });

      res.on('end', () => {
        try {
          if (res.statusCode !== 200) {
            reject(
              new Error(
                `Gingr API error: ${res.statusCode} ${res.statusMessage}\n${responseData}`
              )
            );
            return;
          }

          const jsonData = JSON.parse(responseData);
          resolve(jsonData);
        } catch (error) {
          reject(new Error(`Failed to parse response: ${error.message}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.write(postData);
    req.end();
  });
}

/**
 * Read and parse CSV file (simple implementation)
 */
function readCSVFile(filePath) {
  try {
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const lines = fileContent.split('\n').filter((line) => line.trim());

    if (lines.length < 2) {
      throw new Error('CSV file must have at least a header and one data row');
    }

    const headers = lines[0].split(',').map((h) => h.trim());
    const records = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i]
        .split(',')
        .map((v) => v.trim().replace(/^"|"$/g, ''));
      const record = {};

      headers.forEach((header, index) => {
        record[header] = values[index] || '';
      });

      records.push(record);
    }

    return records;
  } catch (error) {
    throw new Error(`Failed to read CSV file: ${error.message}`);
  }
}

/**
 * Read and parse JSON file
 */
function readJSONFile(filePath) {
  try {
    const fileContent = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(fileContent);
  } catch (error) {
    throw new Error(`Failed to read JSON file: ${error.message}`);
  }
}

/**
 * Map Gingr role to Tailtown role
 */
function mapRole(gingrRole) {
  if (!gingrRole) return 'STAFF';

  const role = gingrRole.toLowerCase();

  if (role.includes('manager') || role.includes('admin')) {
    return 'MANAGER';
  }
  if (role.includes('owner') || role.includes('director')) {
    return 'ADMINISTRATOR';
  }
  if (role.includes('trainer') || role.includes('instructor')) {
    return 'INSTRUCTOR';
  }

  return 'STAFF';
}

/**
 * Map department and position from role/title
 */
function mapDepartmentAndPosition(role, title = '') {
  const combined = `${role} ${title}`.toLowerCase();

  let department = 'MANAGEMENT';
  let position = 'STAFF';

  if (combined.includes('groom')) {
    department = 'GROOMING';
    if (combined.includes('lead') || combined.includes('manager')) {
      position = 'LEAD GROOMER';
    } else {
      position = 'GROOMER';
    }
  } else if (combined.includes('train') || combined.includes('instructor')) {
    department = 'TRAINING';
    position = 'DOG TRAINER';
  } else if (combined.includes('kennel') || combined.includes('attendant')) {
    department = 'KENNEL';
    if (combined.includes('manager') || combined.includes('lead')) {
      position = 'KENNEL MANAGER';
    } else {
      position = 'KENNEL TECHNICIAN';
    }
  } else if (
    combined.includes('front') ||
    combined.includes('desk') ||
    combined.includes('reception')
  ) {
    department = 'FRONT DESK';
    if (combined.includes('manager')) {
      position = 'FRONT DESK MANAGER';
    } else {
      position = 'FRONT DESK ASSOCIATE';
    }
  } else if (combined.includes('vet')) {
    department = 'VETERINARY';
    if (combined.includes('tech')) {
      position = 'VET TECHNICIAN';
    } else {
      position = 'VETERINARIAN';
    }
  } else if (combined.includes('manager')) {
    department = 'MANAGEMENT';
    position = 'GENERAL MANAGER';
  }

  return { department, position };
}

/**
 * Parse availability data
 */
function parseAvailabilityData(availabilityRecords, staffIdMap) {
  const availabilitySQL = [];

  availabilityRecords.forEach((record) => {
    const staffEmail = record.email || record.staffEmail;
    const staffId = staffIdMap[staffEmail];

    if (!staffId) {
      console.warn(
        `⚠️  Skipping availability for unknown staff: ${staffEmail}`
      );
      return;
    }

    // Parse day of week (0-6 for Sunday-Saturday)
    const dayOfWeek = parseInt(record.dayOfWeek || record.day);
    if (isNaN(dayOfWeek) || dayOfWeek < 0 || dayOfWeek > 6) {
      console.warn(
        `⚠️  Invalid day of week: ${record.dayOfWeek} for ${staffEmail}`
      );
      return;
    }

    const startTime = record.startTime || record.start;
    const endTime = record.endTime || record.end;

    if (!startTime || !endTime) {
      console.warn(`⚠️  Missing start/end time for ${staffEmail}`);
      return;
    }

    const sql = `
-- Availability for ${staffEmail}
INSERT INTO "StaffAvailability" (
  id,
  "staffId",
  "dayOfWeek",
  "startTime",
  "endTime",
  "isAvailable",
  "isRecurring",
  "createdAt",
  "updatedAt"
)
VALUES (
  gen_random_uuid(),
  '${staffId}',
  ${dayOfWeek},
  '${startTime}',
  '${endTime}',
  ${record.isAvailable !== false ? 'true' : 'false'},
  ${record.isRecurring !== false ? 'true' : 'false'},
  NOW(),
  NOW()
)
ON CONFLICT DO NOTHING;
`;

    availabilitySQL.push(sql.trim());
  });

  return availabilitySQL.join('\n\n');
}

/**
 * Generate user permissions based on role
 */
function generatePermissions(role, department) {
  const permissions = {
    canManageStaff: role === 'ADMINISTRATOR' || role === 'MANAGER',
    canManageCustomers: role !== 'STAFF',
    canManageReservations: true,
    canManageBilling: role === 'ADMINISTRATOR' || role === 'MANAGER',
    canManageReports: role !== 'STAFF',
    canManageSchedule: role !== 'STAFF',
    canViewReports: true,
    canCheckInPets: true,
    canManageInventory: role === 'ADMINISTRATOR' || role === 'MANAGER',
    canManageGrooming:
      department === 'GROOMING' ||
      role === 'ADMINISTRATOR' ||
      role === 'MANAGER',
    canManageTraining:
      department === 'TRAINING' ||
      role === 'ADMINISTRATOR' ||
      role === 'MANAGER',
    canManageKennels:
      department === 'KENNEL' || role === 'ADMINISTRATOR' || role === 'MANAGER',
  };

  return permissions;
}

/**
 * Generate SQL for staff import
 */
function generateStaffSQL(
  staffRecords,
  includeAvailability = false,
  availabilityRecords = []
) {
  const sqlStatements = [];
  const staffIdMap = {};

  // Generate staff records
  staffRecords.forEach((emp) => {
    const { department, position } = mapDepartmentAndPosition(
      emp.role,
      emp.title || emp.position
    );
    const role = mapRole(emp.role || emp.roleTitle);
    const permissions = generatePermissions(role, department);

    // Parse specialties from CSV/JSON (handle array format)
    let specialties = [];
    if (emp.specialties) {
      if (Array.isArray(emp.specialties)) {
        // Already an array
        specialties = emp.specialties;
      } else if (typeof emp.specialties === 'string') {
        try {
          // Try to parse as JSON array
          specialties = JSON.parse(emp.specialties.replace(/"/g, '"'));
        } catch {
          // If not JSON, split by comma
          specialties = emp.specialties
            .split(',')
            .map((s) => s.trim())
            .filter((s) => s);
        }
      }
    }

    // Generate UUID for this staff member
    const staffId = emp.id || 'gen_random_uuid()';
    staffIdMap[emp.email] = staffId;

    // Generate a temporary password
    const tempPassword = 'TempPass@2024!';

    const sql = `
-- ${emp.firstName} ${emp.lastName}${emp.email ? ` (${emp.email})` : ''}
INSERT INTO staff (
  id, 
  "firstName", 
  "lastName", 
  email, 
  password, 
  role, 
  department, 
  position,
  phone,
  address,
  city,
  state,
  "zipCode",
  specialties,
  "isActive", 
  "permissions",
  "tenantId", 
  "createdAt", 
  "updatedAt"
)
VALUES (
  ${emp.id ? `'${emp.id}'` : 'gen_random_uuid()'},
  '${(emp.firstName || '').replace(/'/g, "''")}',
  '${(emp.lastName || '').replace(/'/g, "''")}',
  '${(emp.email || '').replace(/'/g, "''")}',
  '$2b$10$YourHashedPasswordHere', -- Password: ${tempPassword} (must be hashed with bcrypt)
  '${role}',
  '${department}',
  '${position}',
  ${emp.phone ? `'${emp.phone.replace(/'/g, "''")}'` : 'NULL'},
  ${emp.address ? `'${emp.address.replace(/'/g, "''")}'` : 'NULL'},
  ${emp.city ? `'${emp.city.replace(/'/g, "''")}'` : 'NULL'},
  ${emp.state ? `'${emp.state.replace(/'/g, "''")}'` : 'NULL'},
  ${emp.zipCode ? `'${emp.zipCode.replace(/'/g, "''")}'` : 'NULL'},
  ${specialties.length > 0 ? `ARRAY[${specialties.map((s) => `'${s.replace(/'/g, "''")}'`).join(',')}]` : 'ARRAY[]::TEXT[]'},
  ${emp.isActive !== false ? 'true' : 'false'},
  '${JSON.stringify(permissions).replace(/'/g, "''")}',
  'dev',
  NOW(),
  NOW()
)
ON CONFLICT (email, "tenantId") DO NOTHING;
`;

    sqlStatements.push(sql.trim());
  });

  // Add availability if requested
  if (includeAvailability && availabilityRecords.length > 0) {
    const availabilitySQL = parseAvailabilityData(
      availabilityRecords,
      staffIdMap
    );
    if (availabilitySQL) {
      sqlStatements.push(availabilitySQL);
    }
  }

  return sqlStatements.join('\n\n');
}

/**
 * Import from Gingr API
 */
async function importFromGingr(subdomain, apiKey) {
  console.log('📥 Fetching data from Gingr API...\n');

  const BASE_URL = `https://${subdomain}.gingrapp.com/api/v1`;

  try {
    // Fetch employees
    console.log('👥 Fetching employees...');
    let employees = [];

    try {
      const response = await makeGingrRequest(`${BASE_URL}/get_staff`, {
        key: apiKey,
      });
      employees = response.staff || response.data || response;
    } catch (error) {
      try {
        const response = await makeGingrRequest(`${BASE_URL}/staff`, {
          key: apiKey,
        });
        employees = response.staff || response.data || response;
      } catch (error2) {
        console.error('❌ Could not fetch employees from Gingr API');
        console.error('   Tried: /get_staff, /staff');
        throw error2;
      }
    }

    if (!Array.isArray(employees) || employees.length === 0) {
      console.log('⚠️  No employees found in Gingr');
      return;
    }

    console.log(`✅ Found ${employees.length} employees\n`);

    // Try to fetch availability (if available)
    let availability = [];
    try {
      console.log('📅 Fetching availability...');
      const availResponse = await makeGingrRequest(
        `${BASE_URL}/get_availability`,
        { key: apiKey }
      );
      availability = availResponse.availability || availResponse.data || [];
      console.log(`✅ Found ${availability.length} availability records\n`);
    } catch (error) {
      console.log('⚠️  Could not fetch availability (may not be supported)\n');
    }

    // Display summary
    console.log('📊 IMPORT SUMMARY');
    console.log('═══════════════════════════════\n');
    console.log(`Employees: ${employees.length}`);
    console.log(`Availability Records: ${availability.length}\n`);

    // Generate SQL
    const sql = generateStaffSQL(employees, true, availability);

    console.log('💾 GENERATED SQL:');
    console.log('═══════════════════════════════\n');
    console.log(
      '-- IMPORTANT: Passwords must be hashed with bcrypt before inserting'
    );
    console.log(
      '-- The default password "TempPass@2024!" meets all security requirements'
    );
    console.log('-- Employees should change their password on first login\n');
    console.log(sql);
  } catch (error) {
    console.error('❌ Gingr import failed:', error.message);
    throw error;
  }
}

/**
 * Import from CSV file
 */
async function importFromCSV(filePath) {
  console.log(`📄 Reading CSV file: ${filePath}\n`);

  try {
    const records = readCSVFile(filePath);
    console.log(`✅ Found ${records.length} records in CSV\n`);

    // Check if this is staff data or availability data
    const hasStaffFields = records.some(
      (r) => r.firstName || r.lastName || r.email
    );
    const hasAvailabilityFields = records.some(
      (r) => r.dayOfWeek || r.startTime || r.endTime
    );

    if (hasStaffFields) {
      // Process as staff data
      console.log('👥 Processing staff data...\n');
      const sql = generateStaffSQL(records);

      console.log('💾 GENERATED SQL:');
      console.log('═══════════════════════════════\n');
      console.log(sql);
    } else if (hasAvailabilityFields) {
      console.log('📅 Processing availability data...\n');
      console.log('⚠️  Availability import requires existing staff mapping');
      console.log('   Please ensure staff records exist first');
    } else {
      throw new Error(
        'CSV file does not contain recognizable staff or availability data'
      );
    }
  } catch (error) {
    console.error('❌ CSV import failed:', error.message);
    throw error;
  }
}

/**
 * Import from JSON file
 */
async function importFromJSON(filePath) {
  console.log(`📄 Reading JSON file: ${filePath}\n`);

  try {
    const data = readJSONFile(filePath);

    let staffRecords = [];
    let availabilityRecords = [];

    if (Array.isArray(data)) {
      // Simple array of staff records
      staffRecords = data;
    } else if (data.staff && Array.isArray(data.staff)) {
      // Structured data with staff and availability
      staffRecords = data.staff;
      availabilityRecords = data.availability || [];
    } else {
      throw new Error(
        'JSON file must contain an array of staff records or {staff: [], availability: []}'
      );
    }

    console.log(`✅ Found ${staffRecords.length} staff records`);
    console.log(
      `✅ Found ${availabilityRecords.length} availability records\n`
    );

    // Generate SQL
    const sql = generateStaffSQL(staffRecords, true, availabilityRecords);

    console.log('💾 GENERATED SQL:');
    console.log('═══════════════════════════════\n');
    console.log(
      '-- IMPORTANT: Passwords must be hashed with bcrypt before inserting'
    );
    console.log(
      '-- The default password "TempPass@2024!" meets all security requirements'
    );
    console.log('-- Employees should change their password on first login\n');
    console.log(sql);
  } catch (error) {
    console.error('❌ JSON import failed:', error.message);
    throw error;
  }
}

/**
 * Hash password utility (placeholder - use proper bcrypt in production)
 */
async function hashPassword(password) {
  console.log(`\n🔐 Password to hash: "${password}"`);
  console.log('⚠️  Please use a proper bcrypt library to hash this password');
  console.log('Example: const bcrypt = require("bcrypt");');
  console.log('         const hash = await bcrypt.hash(password, 10);');
  console.log('');
  console.log('For development, you can use an online bcrypt generator:');
  console.log('https://bcrypt-generator.com/');
  console.log('');
  console.log('Or install bcrypt separately:');
  console.log('pnpm install bcrypt');
  console.log(
    'node -e "const bcrypt = require(\"bcrypt\"); bcrypt.hash(\"TempPass@2024!\", 10).then(console.log)"'
  );
  return '$2b$10$YourHashedPasswordHere';
}

/**
 * Main function
 */
async function main() {
  try {
    switch (sourceType.toLowerCase()) {
      case 'gingr':
        if (sourceArgs.length < 2) {
          console.error('❌ Gingr import requires subdomain and API key');
          console.log(
            'Usage: node scripts/import-staff-data.js gingr <subdomain> <api-key>'
          );
          process.exit(1);
        }
        await importFromGingr(sourceArgs[0], sourceArgs[1]);
        break;

      case 'csv':
        if (sourceArgs.length < 1) {
          console.error('❌ CSV import requires file path');
          console.log(
            'Usage: node scripts/import-staff-data.js csv <file-path>'
          );
          process.exit(1);
        }
        await importFromCSV(sourceArgs[0]);
        break;

      case 'json':
        if (sourceArgs.length < 1) {
          console.error('❌ JSON import requires file path');
          console.log(
            'Usage: node scripts/import-staff-data.js json <file-path>'
          );
          process.exit(1);
        }
        await importFromJSON(sourceArgs[0]);
        break;

      case 'hash-password':
        // Utility to hash the default password
        await hashPassword('TempPass@2024!');
        break;

      default:
        console.error(`❌ Unknown source type: ${sourceType}`);
        console.log('Supported types: gingr, csv, json, hash-password');
        process.exit(1);
    }

    console.log('\n📝 NEXT STEPS:');
    console.log('═══════════════════════════════');
    console.log(
      '1. Hash the default password: node scripts/import-staff-data.js hash-password'
    );
    console.log(
      '2. Replace "$2b$10$YourHashedPasswordHere" with the actual hash'
    );
    console.log('3. Run the SQL in your PostgreSQL database');
    console.log('4. Verify staff members appear in Tailtown Admin → Users');
    console.log('5. Notify staff to log in and change their password');
    console.log('\n✅ Import complete!');
  } catch (error) {
    console.error('\n❌ Import failed:', error.message);
    process.exit(1);
  }
}

// Run the script
main();
