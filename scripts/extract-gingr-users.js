#!/usr/bin/env node

/**
 * Extract User Names and Emails from Gingr HTML Options
 *
 * This script parses HTML option elements to extract user data
 * and generates SQL for importing them into Tailtown.
 */

const fs = require('fs');

// The HTML options data you provided
const htmlOptions = `<option value="aidenweinstein@gmail.com">
Aiden Weinstein </option>
<option value="adobedogsco@gmail.com">
Amy Rudd </option>
<option value="corrgiful@gmail.com">
Annie Chavez </option>
<option value="antonia@tailtownpetresort.com">
Antonia Weinstein </option>
<option value="cadencereed9319@gmail.com">
Cadence Reed </option>
<option value="caitlin.mccarthy@hotmail.com">
Caty Mccarthy </option>
<option value="rcristian200@gmail.com">
Cristian Ramirez </option>
<option value="emilyparks9319@gmail.com">
Emily Parks </option>
<option value="encohee@icloud.com">
Emma Cohee </option>
<option value="ezzyhornets@gmail.com">
Esmeralda Hernandez </option>
<option value="appadmin@gingrapp.com">
Gingr Support User </option>
<option value="heather@tailtownpetresort.com">
Heather Webb </option>
<option value="isabelg915@gmail.com">
Isabel Gonzalez </option>
<option value="jeannine@tailtownpetresort.com">
Jeannine Kosel </option>
<option value="jspinola73@outlook.com">
Jenny Spinola </option>
<option value="joannalopez5501@icloud.com">
Joanna Lopez </option>
<option value="kjlew0429@gmail.com">
Kate Lewis </option>
<option value="mich@tailtownpetresort.com">
Mich Cowan </option>
<option value="riogroomer@gingrapp.com">
Rio Rancho House Groomer </option>
<option value="rob@tailtownpetresort.com">
Rob Weinstein </option>
<option value="sadie@tailtownpetresort.com">
Sadie Lott </option>
<option value="slspencer12@comcast.net">
Sydney Spencer </option>
`;

console.log('\n👥 Extracting Users from Gingr HTML Options');
console.log('═════════════════════════════════════════════\n');

/**
 * Parse HTML options to extract user data
 */
function parseHTMLOptions(html) {
  const users = [];
  const optionRegex = /<option value="([^"]+)">\s*([^<]+)\s*<\/option>/g;
  let match;

  while ((match = optionRegex.exec(html)) !== null) {
    const email = match[1].trim();
    const fullName = match[2].trim();

    // Skip if email is empty or invalid
    if (!email || !email.includes('@')) {
      console.log(`⚠️  Skipping invalid email: ${email}`);
      continue;
    }

    // Parse name into first and last name
    const nameParts = fullName.split(' ').filter((part) => part.length > 0);
    let firstName = nameParts[0] || '';
    let lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : '';

    // Handle special cases
    if (fullName.toLowerCase().includes('gingr support')) {
      firstName = 'Gingr';
      lastName = 'Support';
    } else if (fullName.toLowerCase().includes('rio rancho')) {
      firstName = 'Rio';
      lastName = 'Groomer';
    }

    users.push({
      email,
      firstName,
      lastName,
      fullName,
    });
  }

  return users;
}

/**
 * Determine role based on email domain and name
 */
function determineRole(email, name) {
  const emailDomain = email.toLowerCase().split('@')[1];
  const nameLower = name.toLowerCase();

  // Management/Owners
  if (emailDomain === 'tailtownpetresort.com') {
    if (
      nameLower.includes('rob') ||
      nameLower.includes('antonia') ||
      nameLower.includes('jeannine') ||
      nameLower.includes('heather') ||
      nameLower.includes('mich') ||
      nameLower.includes('sadie')
    ) {
      return 'MANAGER';
    }
  }

  // Gingr support
  if (emailDomain === 'gingrapp.com') {
    return 'STAFF';
  }

  // Default to staff for everyone else
  return 'STAFF';
}

/**
 * Determine department based on role and patterns
 */
function determineDepartment(email, name, role) {
  const nameLower = name.toLowerCase();
  const emailLower = email.toLowerCase();

  if (role === 'MANAGER') {
    return 'MANAGEMENT';
  }

  // Look for grooming indicators
  if (nameLower.includes('groomer') || emailLower.includes('groom')) {
    return 'GROOMING';
  }

  // Default to front desk for general staff
  return 'FRONT DESK';
}

/**
 * Determine position based on role and department
 */
function determinePosition(email, name, role, department) {
  if (role === 'MANAGER') {
    return 'GENERAL MANAGER';
  }

  if (department === 'GROOMING') {
    return 'GROOMER';
  }

  if (department === 'FRONT DESK') {
    return 'FRONT DESK ASSOCIATE';
  }

  return 'STAFF';
}

/**
 * Generate permissions based on role
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
 * Generate SQL for user import
 */
function generateUserSQL(users) {
  const sqlStatements = [];

  users.forEach((user) => {
    const role = determineRole(user.email, user.fullName);
    const department = determineDepartment(user.email, user.fullName, role);
    const position = determinePosition(
      user.email,
      user.fullName,
      role,
      department
    );
    const permissions = generatePermissions(role, department);

    const sql = `
-- ${user.fullName} (${user.email})
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
  gen_random_uuid(),
  '${user.firstName.replace(/'/g, "''")}',
  '${user.lastName.replace(/'/g, "''")}',
  '${user.email}',
  '$2b$10$YourHashedPasswordHere', -- Password: TempPass@2024! (must be hashed with bcrypt)
  '${role}',
  '${department}',
  '${position}',
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  ARRAY[]::TEXT[],
  true,
  '${JSON.stringify(permissions).replace(/'/g, "''")}',
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
 * Main execution
 */
function main() {
  // Parse the HTML options
  const users = parseHTMLOptions(htmlOptions);

  console.log(`✅ Extracted ${users.length} users from HTML options\n`);

  // Display summary
  console.log('📊 USER SUMMARY:');
  console.log('═══════════════════════════════\n');

  users.forEach((user, index) => {
    const role = determineRole(user.email, user.fullName);
    const department = determineDepartment(user.email, user.fullName, role);
    console.log(`${index + 1}. ${user.fullName} - ${user.email}`);
    console.log(`   Role: ${role} | Department: ${department}\n`);
  });

  // Generate SQL
  const sql = generateUserSQL(users);

  console.log('💾 GENERATED SQL:');
  console.log('═══════════════════════════════\n');
  console.log(
    '-- IMPORTANT: Passwords must be hashed with bcrypt before inserting'
  );
  console.log(
    '-- The default password "TempPass@2024!" meets all security requirements'
  );
  console.log('-- Users should change their password on first login\n');
  console.log(sql);

  // Save SQL to file
  const sqlFileName = 'gingr-users-import.sql';
  fs.writeFileSync(sqlFileName, sql);

  console.log(`\n💾 SQL saved to: ${sqlFileName}`);

  console.log('\n📝 NEXT STEPS:');
  console.log('═══════════════════════════════');
  console.log('1. Hash the default password: pnpm run hash:password');
  console.log(
    '2. Replace "$2b$10$YourHashedPasswordHere" with the actual hash'
  );
  console.log('3. Run the SQL in your PostgreSQL database:');
  console.log(`   psql -U postgres -d customer -f ${sqlFileName}`);
  console.log('4. Verify users appear in Tailtown Admin → Users');
  console.log('5. Notify users to log in and change their password');
  console.log('\n✅ User extraction complete!');
}

// Run the script
main();
