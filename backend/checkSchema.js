import { inspectDatabaseSchema, getTableColumns } from './src/utils/dbInspector.js';

async function checkSchema() {
  console.log('🔍 Inspecting database schema...\n');
  
  const schema = await inspectDatabaseSchema();
  
  console.log('\n📊 mentor_profiles columns:');
  const mentorColumns = await getTableColumns('mentor_profiles');
  console.log(mentorColumns);
  
  console.log('\n📊 student_profiles columns:');
  const studentColumns = await getTableColumns('student_profiles');
  console.log(studentColumns);
  
  process.exit(0);
}

checkSchema();
