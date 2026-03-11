import pool from './src/config/db.js';

async function checkOrphanedRecords() {
  try {
    console.log('🔍 Checking for orphaned student records...\n');
    
    // Check students in users table without profiles
    const orphanQuery = `
      SELECT u.user_key, u.email, u.created_at
      FROM users u
      LEFT JOIN student_profiles sp ON u.user_key = sp.enrollment_id
      WHERE u.role = 'STUDENT' AND sp.enrollment_id IS NULL
    `;
    
    const orphans = await pool.query(orphanQuery);
    
    if (orphans.rows.length > 0) {
      console.log(`❌ Found ${orphans.rows.length} students WITHOUT profiles:`);
      console.table(orphans.rows);
    } else {
      console.log('✅ All students have profiles');
    }
    
    // Check all students with profiles
    const withProfiles = `
      SELECT u.user_key, u.email, sp.full_name
      FROM users u
      INNER JOIN student_profiles sp ON u.user_key = sp.enrollment_id
      WHERE u.role = 'STUDENT'
    `;
    
    const withProfilesResult = await pool.query(withProfiles);
    console.log(`\n✅ ${withProfilesResult.rows.length} students WITH profiles:`);
    console.table(withProfilesResult.rows);
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkOrphanedRecords();
