const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'sms.db');
const db = new sqlite3.Database(dbPath);

// Initialize database tables
const initDatabase = () => {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // Users table
      db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT NOT NULL CHECK(role IN ('admin', 'teacher', 'student', 'parent')),
        email TEXT UNIQUE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`);

      // Students table
      db.run(`CREATE TABLE IF NOT EXISTS students (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        first_name TEXT NOT NULL,
        last_name TEXT NOT NULL,
        grade TEXT NOT NULL,
        section TEXT NOT NULL,
        parent_contact TEXT,
        address TEXT,
        admission_date DATE,
        FOREIGN KEY (user_id) REFERENCES users (id)
      )`);

      // Teachers table
      db.run(`CREATE TABLE IF NOT EXISTS teachers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        first_name TEXT NOT NULL,
        last_name TEXT NOT NULL,
        subject TEXT NOT NULL,
        contact TEXT,
        email TEXT,
        hire_date DATE,
        FOREIGN KEY (user_id) REFERENCES users (id)
      )`);

      // Subjects table
      db.run(`CREATE TABLE IF NOT EXISTS subjects (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        grade TEXT NOT NULL,
        teacher_id INTEGER,
        FOREIGN KEY (teacher_id) REFERENCES teachers (id)
      )`);

      // Attendance table
      db.run(`CREATE TABLE IF NOT EXISTS attendance (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id INTEGER NOT NULL,
        subject_id INTEGER,
        date DATE NOT NULL,
        status TEXT NOT NULL CHECK(status IN ('present', 'absent', 'late')),
        marked_by INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (student_id) REFERENCES students (id),
        FOREIGN KEY (subject_id) REFERENCES subjects (id),
        FOREIGN KEY (marked_by) REFERENCES users (id)
      )`);

      // Test Results table
      db.run(`CREATE TABLE IF NOT EXISTS test_results (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id INTEGER NOT NULL,
        subject_id INTEGER NOT NULL,
        test_name TEXT NOT NULL,
        marks_obtained REAL NOT NULL,
        total_marks REAL NOT NULL,
        test_date DATE NOT NULL,
        recorded_by INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (student_id) REFERENCES students (id),
        FOREIGN KEY (subject_id) REFERENCES subjects (id),
        FOREIGN KEY (recorded_by) REFERENCES users (id)
      )`);

      // Fees table
      db.run(`CREATE TABLE IF NOT EXISTS fees (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id INTEGER NOT NULL,
        fee_type TEXT NOT NULL,
        amount REAL NOT NULL,
        due_date DATE NOT NULL,
        status TEXT NOT NULL CHECK(status IN ('paid', 'pending', 'overdue')),
        payment_date DATE,
        payment_method TEXT,
        recorded_by INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (student_id) REFERENCES students (id),
        FOREIGN KEY (recorded_by) REFERENCES users (id)
      )`);

      // Teacher Attendance table
      db.run(`CREATE TABLE IF NOT EXISTS teacher_attendance (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        teacher_id INTEGER NOT NULL,
        date DATE NOT NULL,
        status TEXT NOT NULL CHECK(status IN ('present', 'absent', 'late')),
        marked_by INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (teacher_id) REFERENCES teachers (id),
        FOREIGN KEY (marked_by) REFERENCES users (id)
      )`);

      console.log('Database tables created successfully');
      resolve();
    });
  });
};

// Insert default admin user
const insertDefaultAdmin = () => {
  const bcrypt = require('bcryptjs');
  const hashedPassword = bcrypt.hashSync('admin123', 10);
  
  return new Promise((resolve, reject) => {
    db.get("SELECT id FROM users WHERE username = 'admin'", (err, row) => {
      if (err) {
        reject(err);
        return;
      }
      
      if (!row) {
        db.run(`INSERT INTO users (username, password, role, email) 
                VALUES (?, ?, ?, ?)`, 
                ['admin', hashedPassword, 'admin', 'admin@sms.com'], 
                function(err) {
          if (err) {
            reject(err);
          } else {
            console.log('Default admin user created');
            resolve();
          }
        });
      } else {
        resolve();
      }
    });
  });
};

module.exports = { db, initDatabase, insertDefaultAdmin }; 