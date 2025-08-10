const express = require('express');
const { db } = require('../database/database');
const { authenticateToken, requireTeacherOrAdmin } = require('../middleware/auth');

const router = express.Router();

// Get All Teachers (Admin and Teachers)
router.get('/', authenticateToken, requireTeacherOrAdmin, (req, res) => {
  try {
    const { subject, search } = req.query;

    let query = `
      SELECT t.*, u.username, u.email
      FROM teachers t
      LEFT JOIN users u ON t.user_id = u.id
      WHERE 1=1
    `;
    let params = [];

    if (subject) {
      query += ' AND t.subject = ?';
      params.push(subject);
    }

    if (search) {
      query += ' AND (t.first_name LIKE ? OR t.last_name LIKE ? OR t.subject LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    query += ' ORDER BY t.first_name, t.last_name';

    db.all(query, params, (err, teachers) => {
      if (err) {
        return res.status(500).json({ message: 'Database error' });
      }

      res.json({ teachers });
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get Teacher by ID (Admin and Teachers)
router.get('/:teacherId', authenticateToken, requireTeacherOrAdmin, (req, res) => {
  try {
    const { teacherId } = req.params;

    const query = `
      SELECT t.*, u.username, u.email
      FROM teachers t
      LEFT JOIN users u ON t.user_id = u.id
      WHERE t.id = ?
    `;

    db.get(query, [teacherId], (err, teacher) => {
      if (err) {
        return res.status(500).json({ message: 'Database error' });
      }

      if (!teacher) {
        return res.status(404).json({ message: 'Teacher not found' });
      }

      res.json({ teacher });
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Create New Teacher (Admin only)
router.post('/', authenticateToken, requireTeacherOrAdmin, (req, res) => {
  try {
    const { 
      first_name, last_name, subject, contact, email, hire_date, username, password 
    } = req.body;

    if (!first_name || !last_name || !subject) {
      return res.status(400).json({ 
        message: 'First name, last name, and subject are required' 
      });
    }

    // Create user account if username and password provided
    if (username && password) {
      const bcrypt = require('bcryptjs');
      const hashedPassword = bcrypt.hashSync(password, 10);

      db.run(
        'INSERT INTO users (username, password, role, email) VALUES (?, ?, ?, ?)',
        [username, hashedPassword, 'teacher', email],
        function(err) {
          if (err) {
            if (err.message.includes('UNIQUE constraint failed')) {
              return res.status(400).json({ message: 'Username already exists' });
            }
            return res.status(500).json({ message: 'Database error' });
          }

          const userId = this.lastID;

          // Create teacher record
          db.run(
            'INSERT INTO teachers (user_id, first_name, last_name, subject, contact, email, hire_date) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [userId, first_name, last_name, subject, contact, email, hire_date],
            function(err) {
              if (err) {
                return res.status(500).json({ message: 'Database error' });
              }
              res.status(201).json({ 
                message: 'Teacher created successfully',
                teacherId: this.lastID,
                userId
              });
            }
          );
        }
      );
    } else {
      // Create teacher without user account
      db.run(
        'INSERT INTO teachers (first_name, last_name, subject, contact, email, hire_date) VALUES (?, ?, ?, ?, ?, ?)',
        [first_name, last_name, subject, contact, email, hire_date],
        function(err) {
          if (err) {
            return res.status(500).json({ message: 'Database error' });
          }
          res.status(201).json({ 
            message: 'Teacher created successfully',
            teacherId: this.lastID
          });
        }
      );
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Update Teacher (Admin and Teachers)
router.put('/:teacherId', authenticateToken, requireTeacherOrAdmin, (req, res) => {
  try {
    const { teacherId } = req.params;
    const { 
      first_name, last_name, subject, contact, email, hire_date 
    } = req.body;

    if (!first_name || !last_name || !subject) {
      return res.status(400).json({ 
        message: 'First name, last name, and subject are required' 
      });
    }

    db.run(
      'UPDATE teachers SET first_name = ?, last_name = ?, subject = ?, contact = ?, email = ?, hire_date = ? WHERE id = ?',
      [first_name, last_name, subject, contact, email, hire_date, teacherId],
      function(err) {
        if (err) {
          return res.status(500).json({ message: 'Database error' });
        }

        if (this.changes === 0) {
          return res.status(404).json({ message: 'Teacher not found' });
        }

        res.json({ message: 'Teacher updated successfully' });
      }
    );
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete Teacher (Admin only)
router.delete('/:teacherId', authenticateToken, requireTeacherOrAdmin, (req, res) => {
  try {
    const { teacherId } = req.params;

    // Check if teacher has any related records
    db.get('SELECT COUNT(*) as count FROM teacher_attendance WHERE teacher_id = ?', [teacherId], (err, attendanceCount) => {
      if (err) {
        return res.status(500).json({ message: 'Database error' });
      }

      db.get('SELECT COUNT(*) as count FROM subjects WHERE teacher_id = ?', [teacherId], (err, subjectsCount) => {
        if (err) {
          return res.status(500).json({ message: 'Database error' });
        }

        if (attendanceCount.count > 0 || subjectsCount.count > 0) {
          return res.status(400).json({ 
            message: 'Cannot delete teacher with existing records. Please delete related records first.' 
          });
        }

        // Delete teacher
        db.run('DELETE FROM teachers WHERE id = ?', [teacherId], function(err) {
          if (err) {
            return res.status(500).json({ message: 'Database error' });
          }

          if (this.changes === 0) {
            return res.status(404).json({ message: 'Teacher not found' });
          }

          res.json({ message: 'Teacher deleted successfully' });
        });
      });
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get Teacher Statistics (Admin and Teachers)
router.get('/:teacherId/stats', authenticateToken, requireTeacherOrAdmin, (req, res) => {
  try {
    const { teacherId } = req.params;

    // Get attendance stats
    db.get('SELECT COUNT(*) as total, SUM(CASE WHEN status = "present" THEN 1 ELSE 0 END) as present, SUM(CASE WHEN status = "absent" THEN 1 ELSE 0 END) as absent, SUM(CASE WHEN status = "late" THEN 1 ELSE 0 END) as late FROM teacher_attendance WHERE teacher_id = ?', [teacherId], (err, attendanceStats) => {
      if (err) {
        return res.status(500).json({ message: 'Database error' });
      }

      // Get subjects count
      db.get('SELECT COUNT(*) as total FROM subjects WHERE teacher_id = ?', [teacherId], (err, subjectsCount) => {
        if (err) {
          return res.status(500).json({ message: 'Database error' });
        }

        res.json({
          attendance: {
            total: attendanceStats.total || 0,
            present: attendanceStats.present || 0,
            absent: attendanceStats.absent || 0,
            late: attendanceStats.late || 0,
            percentage: attendanceStats.total > 0 ? ((attendanceStats.present + attendanceStats.late) / attendanceStats.total * 100).toFixed(2) : 0
          },
          subjects: {
            total: subjectsCount.total || 0
          }
        });
      });
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router; 