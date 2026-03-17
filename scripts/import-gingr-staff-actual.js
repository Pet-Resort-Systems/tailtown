#!/usr/bin/env node

/**
 * Import Actual Gingr Staff Data into Tailtown
 *
 * Based on the real staff data extracted from Gingr interface
 */

const fs = require('fs');

console.log('\n👥 Importing Actual Gingr Staff Data');
console.log('═════════════════════════════════════════════\n');

// Actual staff data from Gingr
const staffData = [
  {
    firstName: 'Aiden',
    lastName: 'Weinstein',
    email: 'aidenweinstein@gmail.com',
    phone: '5054000295',
    group: 'admin',
    specialties: [],
    status: 'Active',
  },
  {
    firstName: 'Amy',
    lastName: 'Rudd',
    email: 'adobedogsco@gmail.com',
    phone: '505-600-1312',
    group: 'Trainer',
    specialties: ['Individual Training', 'Amy Grace Rudd'],
    status: 'Active',
  },
  {
    firstName: 'Annie',
    lastName: 'Chavez',
    email: 'corrgiful@gmail.com',
    phone: '5052363310',
    group: 'admin',
    specialties: [
      'Grooming | Dog - Complete Groom',
      'Grooming | Dog - Mini Groom',
      'Grooming | Dog - Ultimate Bath',
      'Grooming | Dog - Wash and Go',
      'Grooming | Dog - A La Carte Groomer Services',
      'Grooming | Dog - A La Carte House Services',
      'Grooming | VIP Wash and Go',
    ],
    status: 'Active',
  },
  {
    firstName: 'Antonia',
    lastName: 'Weinstein',
    email: 'antonia@tailtownpetresort.com',
    phone: '505-410-9618',
    group: 'admin',
    specialties: [],
    status: 'Active',
  },
  {
    firstName: 'Cadence',
    lastName: 'Reed',
    email: 'cadencereed9319@gmail.com',
    phone: '5059333169',
    group: 'Employee',
    specialties: [],
    status: 'Active',
  },
  {
    firstName: 'Caty',
    lastName: 'McCarthy',
    email: 'caitlin.mccarthy@hotmail.com',
    phone: '5059332917',
    group: 'Manager',
    specialties: [],
    status: 'Active',
  },
  {
    firstName: 'Cristian',
    lastName: 'Ramirez',
    email: 'rcristian200@gmail.com',
    phone: '5052259827',
    group: 'Manager',
    specialties: [],
    status: 'Active',
  },
  {
    firstName: 'Emily',
    lastName: 'Parks',
    email: 'emilyparks9319@gmail.com',
    phone: '5054536547',
    group: 'Groomer',
    specialties: [],
    status: 'Active',
  },
  {
    firstName: 'Emma',
    lastName: 'Cohee',
    email: 'encohee@icloud.com',
    phone: '5056047858',
    group: 'Employee',
    specialties: [],
    status: 'Active',
  },
  {
    firstName: 'Esmeralda',
    lastName: 'Hernandez',
    email: 'ezzyhornets@gmail.com',
    phone: '5059743063',
    group: 'Manager',
    specialties: [],
    status: 'Active',
  },
  {
    firstName: 'Heather',
    lastName: 'Webb',
    email: 'heather@tailtownpetresort.com',
    phone: '',
    group: 'admin',
    specialties: [],
    status: 'Active',
  },
  {
    firstName: 'Isabel',
    lastName: 'Gonzalez',
    email: 'isabelg915@gmail.com',
    phone: '19152281107',
    group: 'Groomer',
    specialties: [
      'Grooming | Dog - Complete Groom',
      'Grooming | Dog - Ultimate Bath',
      'Grooming | Dog - A La Carte Groomer Services',
      'Grooming | Dog - A La Carte House Services',
      'Grooming | VIP Wash and Go',
      'Grooming | Dog - Mini Groom',
    ],
    status: 'Active',
  },
  {
    firstName: 'Jeannine',
    lastName: 'Kosel',
    email: 'jeannine@tailtownpetresort.com',
    phone: '505-280-5665',
    group: 'admin',
    specialties: [],
    status: 'Active',
  },
  {
    firstName: 'Jenny',
    lastName: 'Spinola',
    email: 'jspinola73@outlook.com',
    phone: '5054351668',
    group: 'Manager',
    specialties: [
      'Grooming | Dog - Ultimate Bath',
      'Grooming | Dog - Complete Groom',
      'Grooming | Dog - A La Carte Groomer Services',
      'Grooming | Dog - A La Carte House Services',
      'Grooming | Dog - Wash and Go',
      'Grooming | VIP Wash and Go',
      'Grooming | Dog - Mini Groom',
    ],
    status: 'Active',
  },
  {
    firstName: 'Joanna',
    lastName: 'Lopez',
    email: 'joannalopez5501@icloud.com',
    phone: '5056591215',
    group: 'Groomer',
    specialties: [],
    status: 'Active',
  },
  {
    firstName: 'Kate',
    lastName: 'Lewis',
    email: 'kjlew0429@gmail.com',
    phone: '5053075512',
    group: 'Employee',
    specialties: [],
    status: 'Active',
  },
  {
    firstName: 'Mich',
    lastName: 'Cowan',
    email: 'mich@tailtownpetresort.com',
    phone: '505-450-2563',
    group: 'Manager',
    specialties: [],
    status: 'Active',
  },
  {
    firstName: 'Rio Rancho',
    lastName: 'House Groomer',
    email: 'riogroomer@gingrapp.com',
    phone: '',
    group: 'Groomer',
    specialties: [],
    status: 'Active',
  },
  {
    firstName: 'Rob',
    lastName: 'Weinstein',
    email: 'rob@tailtownpetresort.com',
    phone: '5055536754',
    group: 'admin',
    specialties: [],
    status: 'Active',
  },
  {
    firstName: 'Sadie',
    lastName: 'Lott',
    email: 'sadie@tailtownpetresort.com',
    phone: '4437714975',
    group: 'Manager',
    specialties: [],
    status: 'Active',
  },
  {
    firstName: 'Sydney',
    lastName: 'Spencer',
    email: 'slspencer12@comcast.net',
    phone: '5056106642',
    group: 'Manager',
    specialties: [],
    status: 'Active',
  },
];

/**
 * Map Gingr group to Tailtown role
 */
function mapRole(group) {
  switch (group.toLowerCase()) {
    case 'admin':
      return 'ADMINISTRATOR';
    case 'manager':
      return 'MANAGER';
    case 'trainer':
      return 'INSTRUCTOR';
    case 'groomer':
    case 'employee':
    default:
      return 'STAFF';
  }
}

/**
 * Determine department based on role and specialties
 */
function determineDepartment(group, specialties) {
  const groupLower = group.toLowerCase();
  const hasGrooming = specialties.some((s) =>
    s.toLowerCase().includes('grooming')
  );
  const hasTraining = specialties.some((s) =>
    s.toLowerCase().includes('training')
  );

  if (groupLower === 'admin' || groupLower === 'manager') {
    return 'MANAGEMENT';
  }

  if (hasGrooming || groupLower === 'groomer') {
    return 'GROOMING';
  }

  if (hasTraining || groupLower === 'trainer') {
    return 'TRAINING';
  }

  return 'FRONT DESK';
}

/**
 * Determine position based on role and department
 */
function determinePosition(role, department) {
  switch (role) {
    case 'ADMINISTRATOR':
      return 'GENERAL MANAGER';
    case 'MANAGER':
      return 'GENERAL MANAGER';
    case 'INSTRUCTOR':
      return 'DOG TRAINER';
    case 'STAFF':
      if (department === 'GROOMING') return 'GROOMER';
      if (department === 'TRAINING') return 'DOG TRAINER';
      return 'FRONT DESK ASSOCIATE';
    default:
      return 'STAFF';
  }
}

/**
 * Generate permissions based on role
 */
function generatePermissions(role) {
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
    canManageGrooming: role === 'ADMINISTRATOR' || role === 'MANAGER',
    canManageTraining: role === 'ADMINISTRATOR' || role === 'MANAGER',
    canManageKennels: role === 'ADMINISTRATOR' || role === 'MANAGER',
  };

  return permissions;
}

/**
 * Generate SQL for staff import
 */
function generateStaffSQL(staff) {
  const sqlStatements = [];

  staff.forEach((person) => {
    const role = mapRole(person.group);
    const department = determineDepartment(person.group, person.specialties);
    const position = determinePosition(role, department);
    const permissions = generatePermissions(role);

    // Clean phone number
    const cleanPhone = person.phone
      ? person.phone.replace(/[^0-9]/g, '')
      : null;

    const sql = `
-- ${person.firstName} ${person.lastName} (${person.email})
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
  '${person.firstName.replace(/'/g, "''")}',
  '${person.lastName.replace(/'/g, "''")}',
  '${person.email}',
  '$2b$10$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj6ukx.LrUpm', -- Password: TempPass@2024!
  '${role}',
  '${department}',
  '${position}',
  ${cleanPhone ? `'${cleanPhone}'` : 'NULL'},
  NULL,
  NULL,
  NULL,
  NULL,
  ${person.specialties.length > 0 ? `ARRAY[${person.specialties.map((s) => `'${s.replace(/'/g, "''")}'`).join(',')}]` : 'ARRAY[]::TEXT[]'},
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
  console.log(`✅ Processing ${staffData.length} staff members from Gingr\n`);

  // Display summary
  console.log('📊 STAFF SUMMARY:');
  console.log('═══════════════════════════════\n');

  const summary = {};
  staffData.forEach((person) => {
    const role = mapRole(person.group);
    summary[role] = (summary[role] || 0) + 1;
    console.log(`${person.firstName} ${person.lastName} - ${person.email}`);
    console.log(`   Group: ${person.group} → Role: ${role}\n`);
  });

  console.log('📈 ROLE BREAKDOWN:');
  Object.entries(summary).forEach(([role, count]) => {
    console.log(`   ${role}: ${count}`);
  });
  console.log('');

  // Generate SQL
  const sql = generateStaffSQL(staffData);

  console.log('💾 GENERATED SQL:');
  console.log('═══════════════════════════════\n');
  console.log('-- Password: TempPass@2024!');
  console.log('-- All users will need to change password on first login\n');
  console.log(sql);

  // Save SQL to file
  const sqlFileName = 'gingr-staff-actual-import.sql';
  fs.writeFileSync(sqlFileName, sql);

  console.log(`\n💾 SQL saved to: ${sqlFileName}`);

  console.log('\n📝 NEXT STEPS:');
  console.log('═══════════════════════════════');
  console.log('1. Run the SQL in your PostgreSQL database:');
  console.log(
    `   docker exec -i tailtown-customer-db-1 psql -U postgres -d customer < ${sqlFileName}`
  );
  console.log('2. Verify staff members appear in Tailtown Admin → Users');
  console.log(
    '3. Notify staff to log in with TempPass@2024! and change password'
  );
  console.log('\n✅ Staff import ready!');
}

// Run the script
main();
