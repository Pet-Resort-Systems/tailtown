#!/usr/bin/env node

/**
 * Gingr Employee Import Tool
 *
 * Fetches employees from Gingr API and generates SQL to import them into Tailtown
 *
 * Usage:
 *   node scripts/import-gingr-employees.js <subdomain> <api-key>
 *
 * Example:
 *   node scripts/import-gingr-employees.js tailtown abc123xyz456
 */

const fetch = require('node-fetch');

// Parse command line arguments
const args = process.argv.slice(2);
if (args.length < 2) {
  console.error('❌ Error: Missing required arguments');
  console.log('\nUsage:');
  console.log('  node scripts/import-gingr-employees.js <subdomain> <api-key>');
  console.log('\nExample:');
  console.log('  node scripts/import-gingr-employees.js tailtown abc123xyz456');
  process.exit(1);
}

const [subdomain, apiKey] = args;
const BASE_URL = `https://${subdomain}.gingrapp.com/api/v1`;

console.log('\n👥 Gingr Employee Import Tool');
console.log('═══════════════════════════════');
console.log(`Subdomain: ${subdomain}`);
console.log('');

/**
 * Make POST request to Gingr API (using form data with key parameter)
 */
async function makeGingrRequest(endpoint, data = {}) {
  const formData = new URLSearchParams();
  formData.append('key', apiKey);

  Object.entries(data).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      formData.append(key, String(value));
    }
  });

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: formData.toString(),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(
      `Gingr API error: ${response.status} ${response.statusText}\n${text}`
    );
  }

  return response.json();
}

/**
 * Map Gingr role to Tailtown role
 */
function mapRole(gingrRole) {
  if (!gingrRole) return 'Staff';

  const role = gingrRole.toLowerCase();

  if (role.includes('manager') || role.includes('admin')) {
    return 'Manager';
  }
  if (role.includes('owner') || role.includes('director')) {
    return 'Administrator';
  }
  if (role.includes('trainer') || role.includes('instructor')) {
    return 'Instructor';
  }

  return 'Staff';
}

/**
 * Map Gingr department/position to Tailtown values
 */
function mapDepartmentAndPosition(gingrEmployee) {
  const role = (gingrEmployee.role || '').toLowerCase();
  const title = (
    gingrEmployee.title ||
    gingrEmployee.position ||
    ''
  ).toLowerCase();
  const combined = `${role} ${title}`.toLowerCase();

  // Department mapping
  let department = 'Management';
  let position = 'Staff';

  if (combined.includes('groom')) {
    department = 'Grooming';
    if (combined.includes('lead') || combined.includes('manager')) {
      position = 'Lead Groomer';
    } else {
      position = 'Groomer';
    }
  } else if (combined.includes('train') || combined.includes('instructor')) {
    department = 'Training';
    position = 'Dog Trainer';
  } else if (combined.includes('kennel') || combined.includes('attendant')) {
    department = 'Kennel';
    if (combined.includes('manager') || combined.includes('lead')) {
      position = 'Kennel Manager';
    } else {
      position = 'Kennel Technician';
    }
  } else if (
    combined.includes('front') ||
    combined.includes('desk') ||
    combined.includes('reception')
  ) {
    department = 'Front Desk';
    if (combined.includes('manager')) {
      position = 'Front Desk Manager';
    } else {
      position = 'Front Desk Associate';
    }
  } else if (combined.includes('vet')) {
    department = 'Veterinary';
    if (combined.includes('tech')) {
      position = 'Vet Technician';
    } else {
      position = 'Veterinarian';
    }
  } else if (combined.includes('manager')) {
    department = 'Management';
    position = 'General Manager';
  }

  return { department, position };
}

/**
 * Generate SQL for employee import
 */
function generateSQL(employees) {
  const sqlStatements = [];

  employees.forEach((emp) => {
    const { department, position } = mapDepartmentAndPosition(emp);
    const role = mapRole(emp.role);

    // Generate a temporary password (they'll need to reset it)
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
  "isActive", 
  "tenantId", 
  "createdAt", 
  "updatedAt"
)
VALUES (
  gen_random_uuid(),
  '${emp.firstName.replace(/'/g, "''")}',
  '${emp.lastName.replace(/'/g, "''")}',
  '${(emp.email || `${emp.firstName.toLowerCase()}.${emp.lastName.toLowerCase()}@temp.com`).replace(/'/g, "''")}',
  '$2b$10$YourHashedPasswordHere', -- Password: ${tempPassword} (must be hashed with bcrypt)
  '${role}',
  '${department}',
  '${position}',
  ${emp.phone ? `'${emp.phone.replace(/'/g, "''")}'` : 'NULL'},
  ${emp.isActive !== false ? 'true' : 'false'},
  'dev',
  NOW(),
  NOW()
)
ON CONFLICT (email, "tenantId") DO NOTHING;
`;

    sqlStatements.push(sql.trim());
  });

  return sqlStatements.join('\n\n');
}

/**
 * Main function
 */
async function main() {
  try {
    console.log('📥 Fetching employees from Gingr...\n');

    // Try different API endpoints that Gingr might use
    let employees = [];
    let endpoint = '';

    try {
      // Try /get_staff endpoint (common Gingr pattern)
      endpoint = '/get_staff';
      const response = await makeGingrRequest(endpoint);
      employees = response.staff || response.data || response;
      if (Array.isArray(employees)) {
        console.log(
          `✅ Found ${employees.length} employees using ${endpoint} endpoint\n`
        );
      } else {
        throw new Error('Response is not an array');
      }
    } catch (error) {
      try {
        // Try /staff endpoint
        endpoint = '/staff';
        const response = await makeGingrRequest(endpoint);
        employees = response.staff || response.data || response;
        if (Array.isArray(employees)) {
          console.log(
            `✅ Found ${employees.length} employees using ${endpoint} endpoint\n`
          );
        } else {
          throw new Error('Response is not an array');
        }
      } catch (error2) {
        try {
          // Try /get_employees endpoint
          endpoint = '/get_employees';
          const response = await makeGingrRequest(endpoint);
          employees = response.employees || response.data || response;
          if (Array.isArray(employees)) {
            console.log(
              `✅ Found ${employees.length} employees using ${endpoint} endpoint\n`
            );
          } else {
            throw new Error('Response is not an array');
          }
        } catch (error3) {
          console.error('❌ Could not fetch employees from any known endpoint');
          console.error('   Tried: /get_staff, /staff, /get_employees');
          console.error(`   Last error: ${error3.message}`);
          console.error('\n💡 Gingr might not expose employee data via API,');
          console.error(
            '   or your API key may not have permission to access it.'
          );
          process.exit(1);
        }
      }
    }

    if (!employees || employees.length === 0) {
      console.log('⚠️  No employees found in Gingr');
      console.log('   This might mean:');
      console.log('   - No employees are set up in Gingr');
      console.log('   - The API endpoint structure is different');
      console.log(
        "   - Your API key doesn't have permission to access employee data"
      );
      process.exit(0);
    }

    // Display employee summary
    console.log('📊 EMPLOYEE SUMMARY');
    console.log('═══════════════════════════════\n');
    console.log(`Total Employees: ${employees.length}\n`);

    console.log('👥 EMPLOYEES FOUND:');
    console.log('─────────────────────────────\n');

    employees.forEach((emp, index) => {
      const { department, position } = mapDepartmentAndPosition(emp);
      const role = mapRole(emp.role);

      console.log(`${index + 1}. ${emp.firstName} ${emp.lastName}`);
      if (emp.email) console.log(`   Email: ${emp.email}`);
      if (emp.phone) console.log(`   Phone: ${emp.phone}`);
      console.log(`   Gingr Role: ${emp.role || emp.title || 'Not specified'}`);
      console.log(`   → Tailtown Role: ${role}`);
      console.log(`   → Department: ${department}`);
      console.log(`   → Position: ${position}`);
      console.log(
        `   Status: ${emp.isActive !== false ? 'Active' : 'Inactive'}`
      );
      console.log('');
    });

    // Generate SQL
    console.log('\n💾 SQL TO IMPORT EMPLOYEES:');
    console.log('═══════════════════════════════\n');
    console.log(
      '-- IMPORTANT: Passwords must be hashed with bcrypt before inserting'
    );
    console.log(
      '-- The default password "TempPass@2024!" meets all security requirements'
    );
    console.log('-- Employees should change their password on first login\n');

    const sql = generateSQL(employees);
    console.log(sql);

    console.log('\n\n📝 NEXT STEPS:');
    console.log('═══════════════════════════════');
    console.log('1. Review the employee list above');
    console.log('2. Hash the password "TempPass@2024!" with bcrypt');
    console.log('   Example: const bcrypt = require("bcrypt");');
    console.log(
      '           const hash = await bcrypt.hash("TempPass@2024!", 10);'
    );
    console.log(
      '3. Replace "$2b$10$YourHashedPasswordHere" with the actual hash'
    );
    console.log('4. Run the SQL in your PostgreSQL database');
    console.log('5. Notify employees to log in and change their password');
    console.log('\n✅ Import complete!');
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

// Run the script
main();
