const express = require('express');
const { db } = require('../database/database');
const { authenticateToken, requireTeacherOrAdmin } = require('../middleware/auth');

const router = express.Router();

// Get All Students (Teachers and Admin)
router.get('/', authenticateToken, requireTeacherOrAdmin, (req, res) => {
  try {
    const { grade, section, search } = req.query;

    let query = `
      SELECT s.*, u.username, u.email
      FROM students s
      LEFT JOIN users u ON s.user_id = u.id
      WHERE 1=1
    `;
    let params = [];

    if (grade) {
      query += ' AND s.grade = ?';
      params.push(grade);
    }

    if (section) {
      query += ' AND s.section = ?';
      params.push(section);
    }

    if (search) {
      query += ' AND (s.first_name LIKE ? OR s.last_name LIKE ? OR s.grade LIKE ? OR s.section LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }

    query += ' ORDER BY s.grade, s.section, s.first_name, s.last_name';

    db.all(query, params, (err, students) => {
      if (err) {
        return res.status(500).json({ message: 'Database error' });
      }

      res.json({ students });
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get Student by ID (Students, Parents, Teachers, Admin)
router.get('/:studentId', authenticateToken, (req, res) => {
  try {
    const { studentId } = req.params;

    const query = `
      SELECT s.*, u.username, u.email
      FROM students s
      LEFT JOIN users u ON s.user_id = u.id
      WHERE s.id = ?
    `;

    db.get(query, [studentId], (err, student) => {
      if (err) {
        return res.status(500).json({ message: 'Database error' });
      }

      if (!student) {
        return res.status(404).json({ message: 'Student not found' });
      }

      res.json({ student });
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Create New Student (Admin only)
router.post('/', authenticateToken, requireTeacherOrAdmin, (req, res) => {
  try {
    const { 
      first_name, last_name, grade, section, parent_contact, address, admission_date, username, password, email 
    } = req.body;

    if (!first_name || !last_name || !grade || !section) {
      return res.status(400).json({ 
        message: 'First name, last name, grade, and section are required' 
      });
    }

    // Create user account if username and password provided
    if (username && password) {
      const bcrypt = require('bcryptjs');
      const hashedPassword = bcrypt.hashSync(password, 10);

      db.run(
        'INSERT INTO users (username, password, role, email) VALUES (?, ?, ?, ?)',
        [username, hashedPassword, 'student', email],
        function(err) {
          if (err) {
            if (err.message.includes('UNIQUE constraint failed')) {
              return res.status(400).json({ message: 'Username already exists' });
            }
            return res.status(500).json({ message: 'Database error' });
          }

          const userId = this.lastID;

          // Create student record
          db.run(
            'INSERT INTO students (user_id, first_name, last_name, grade, section, parent_contact, address, admission_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [userId, first_name, last_name, grade, section, parent_contact, address, admission_date],
            function(err) {
              if (err) {
                return res.status(500).json({ message: 'Database error' });
              }
              res.status(201).json({ 
                message: 'Student created successfully',
                studentId: this.lastID,
                userId
              });
            }
          );
        }
      );
    } else {
      // Create student without user account
      db.run(
        'INSERT INTO students (first_name, last_name, grade, section, parent_contact, address, admission_date) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [first_name, last_name, grade, section, parent_contact, address, admission_date],
        function(err) {
          if (err) {
            return res.status(500).json({ message: 'Database error' });
          }
          res.status(201).json({ 
            message: 'Student created successfully',
            studentId: this.lastID
          });
        }
      );
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Update Student (Admin and Teachers)
router.put('/:studentId', authenticateToken, requireTeacherOrAdmin, (req, res) => {
  try {
    const { studentId } = req.params;
    const { 
      first_name, last_name, grade, section, parent_contact, address, admission_date 
    } = req.body;

    if (!first_name || !last_name || !grade || !section) {
      return res.status(400).json({ 
        message: 'First name, last name, grade, and section are required' 
      });
    }

    db.run(
      'UPDATE students SET first_name = ?, last_name = ?, grade = ?, section = ?, parent_contact = ?, address = ?, admission_date = ? WHERE id = ?',
      [first_name, last_name, grade, section, parent_contact, address, admission_date, studentId],
      function(err) {
        if (err) {
          return res.status(500).json({ message: 'Database error' });
        }

        if (this.changes === 0) {
          return res.status(404).json({ message: 'Student not found' });
        }

        res.json({ message: 'Student updated successfully' });
      }
    );
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete Student (Admin only)
router.delete('/:studentId', authenticateToken, requireTeacherOrAdmin, (req, res) => {
  try {
    const { studentId } = req.params;

    // Check if student has any related records
    db.get('SELECT COUNT(*) as count FROM attendance WHERE student_id = ?', [studentId], (err, attendanceCount) => {
      if (err) {
        return res.status(500).json({ message: 'Database error' });
      }

      db.get('SELECT COUNT(*) as count FROM test_results WHERE student_id = ?', [studentId], (err, resultsCount) => {
        if (err) {
          return res.status(500).json({ message: 'Database error' });
        }

        db.get('SELECT COUNT(*) as count FROM fees WHERE student_id = ?', [studentId], (err, feesCount) => {
          if (err) {
            return res.status(500).json({ message: 'Database error' });
          }

          if (attendanceCount.count > 0 || resultsCount.count > 0 || feesCount.count > 0) {
            return res.status(400).json({ 
              message: 'Cannot delete student with existing records. Please delete related records first.' 
            });
          }

          // Delete student
          db.run('DELETE FROM students WHERE id = ?', [studentId], function(err) {
            if (err) {
              return res.status(500).json({ message: 'Database error' });
            }

            if (this.changes === 0) {
              return res.status(404).json({ message: 'Student not found' });
            }

            res.json({ message: 'Student deleted successfully' });
          });
        });
      });
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get Student Statistics (Teachers and Admin)
router.get('/:studentId/stats', authenticateToken, requireTeacherOrAdmin, (req, res) => {
  try {
    const { studentId } = req.params;

    // Get attendance stats
    db.get('SELECT COUNT(*) as total, SUM(CASE WHEN status = "present" THEN 1 ELSE 0 END) as present, SUM(CASE WHEN status = "absent" THEN 1 ELSE 0 END) as absent, SUM(CASE WHEN status = "late" THEN 1 ELSE 0 END) as late FROM attendance WHERE student_id = ?', [studentId], (err, attendanceStats) => {
      if (err) {
        return res.status(500).json({ message: 'Database error' });
      }

      // Get test results stats
      db.get('SELECT COUNT(*) as total, AVG(marks_obtained * 100.0 / total_marks) as average_percentage FROM test_results WHERE student_id = ?', [studentId], (err, resultsStats) => {
        if (err) {
          return res.status(500).json({ message: 'Database error' });
        }

        // Get fees stats
        db.get('SELECT COUNT(*) as total, SUM(amount) as total_amount, SUM(CASE WHEN status = "paid" THEN amount ELSE 0 END) as paid_amount, SUM(CASE WHEN status = "pending" THEN amount ELSE 0 END) as pending_amount, SUM(CASE WHEN status = "overdue" THEN amount ELSE 0 END) as overdue_amount FROM fees WHERE student_id = ?', [studentId], (err, feesStats) => {
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
            results: {
              total: resultsStats.total || 0,
              averagePercentage: resultsStats.average_percentage ? parseFloat(resultsStats.average_percentage.toFixed(2)) : 0
            },
            fees: {
              total: feesStats.total || 0,
              totalAmount: feesStats.total_amount || 0,
              paidAmount: feesStats.paid_amount || 0,
              pendingAmount: feesStats.pending_amount || 0,
              overdueAmount: feesStats.overdue_amount || 0
            }
          });
        });
      });
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router; 