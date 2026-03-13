import mysql from 'mysql2/promise';

const url = process.env.DATABASE_URL || '';
const m = url.match(/mysql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/([^?]+)/);
if (!m) { console.log('No DATABASE_URL'); process.exit(1); }

const c = await mysql.createConnection({
  host: m[3], port: +m[4], user: m[1], password: m[2], database: m[5],
  ssl: { rejectUnauthorized: false }
});

console.log('Connected to DB');

// 1. Create calendar_resources table
await c.query(`
  CREATE TABLE IF NOT EXISTS calendar_resources (
    id INT AUTO_INCREMENT PRIMARY KEY,
    agency_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    color VARCHAR(20) DEFAULT '#3B82F6',
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_agency_id (agency_id)
  )
`);
console.log('✅ calendar_resources table created/verified');

// 2. Add missing columns to appointments table
const [existingCols] = await c.query('DESCRIBE appointments');
const colNames = existingCols.map(r => r.Field);
console.log('Existing appointment columns:', colNames.join(', '));

const toAdd = [
  { name: 'title', sql: 'ADD COLUMN title VARCHAR(500) DEFAULT NULL AFTER id' },
  { name: 'calendar_id', sql: 'ADD COLUMN calendar_id INT DEFAULT NULL AFTER agency_id' },
  { name: 'calendar_name', sql: 'ADD COLUMN calendar_name VARCHAR(255) DEFAULT NULL AFTER calendar_id' },
  { name: 'end_time', sql: 'ADD COLUMN end_time TIMESTAMP DEFAULT NULL AFTER appointment_date' },
  { name: 'meeting_type', sql: "ADD COLUMN meeting_type ENUM('in_person','phone','video') DEFAULT 'phone' AFTER appointment_type" },
  { name: 'location', sql: 'ADD COLUMN location VARCHAR(500) DEFAULT NULL AFTER meeting_type' },
  { name: 'timezone', sql: "ADD COLUMN timezone VARCHAR(100) DEFAULT 'America/New_York' AFTER location" },
  { name: 'assigned_user_id', sql: 'ADD COLUMN assigned_user_id INT DEFAULT NULL AFTER assigned_to' },
  { name: 'assigned_user_name', sql: 'ADD COLUMN assigned_user_name VARCHAR(255) DEFAULT NULL AFTER assigned_user_id' },
  { name: 'contact_name', sql: 'ADD COLUMN contact_name VARCHAR(500) GENERATED ALWAYS AS (CONCAT(first_name, " ", last_name)) VIRTUAL AFTER last_name' },
];

for (const col of toAdd) {
  if (!colNames.includes(col.name)) {
    try {
      await c.query(`ALTER TABLE appointments ${col.sql}`);
      console.log(`✅ Added column: ${col.name}`);
    } catch (e) {
      console.log(`⚠️ Could not add ${col.name}: ${e.message}`);
    }
  } else {
    console.log(`⏭️ Column already exists: ${col.name}`);
  }
}

// 3. Update status enum to include 'unconfirmed' and 'no_show'
try {
  await c.query(`ALTER TABLE appointments MODIFY COLUMN status ENUM('scheduled','confirmed','unconfirmed','completed','cancelled','no_show','no_answer','busy') DEFAULT 'unconfirmed'`);
  console.log('✅ Updated status enum');
} catch (e) {
  console.log('⚠️ Status enum update:', e.message);
}

console.log('Migration complete!');
await c.end();
