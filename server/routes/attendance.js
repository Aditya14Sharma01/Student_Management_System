const express = require('express');
const { db } = require('../database/database');
const { authenticateToken, requireTeacherOrAdmin } = require('../middleware/auth');

const router = express.Router();

// Mark Student Attendance (Teachers and Admin)
router.post('/student', authenticateToken, requireTeacherOrAdmin, (req, res) => {
  try {
    const { student_id, subject_id, date, status } = req.body;
    const marked_by = req.user.id;

    if (!student_id || !date || !status) {
      return res.status(400).json({ message: 'Student ID, date, and status are required' });
    }

    if (!['present', 'absent', 'late'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status. Must be present, absent, or late' });
    }

    // Check if attendance already exists for this student on this date
    db.get(
      'SELECT id FROM attendance WHERE student_id = ? AND date = ? AND subject_id = ?',
      [student_id, date, subject_id],
      (err, existing) => {
        if (err) {
          return res.status(500).json({ message: 'Database error' });
        }

        if (existing) {
          // Update existing attendance
          db.run(
            'UPDATE attendance SET status = ?, marked_by = ? WHERE id = ?',
            [status, marked_by, existing.id],
            (err) => {
              if (err) {
                return res.status(500).json({ message: 'Database error' });
              }
              res.json({ message: 'Attendance updated successfully' });
            }
          );
        } else {
          // Insert new attendance
          db.run(
            'INSERT INTO attendance (student_id, subject_id, date, status, marked_by) VALUES (?, ?, ?, ?, ?)',
            [student_id, subject_id, date, status, marked_by],
            function(err) {
              if (err) {
                return res.status(500).json({ message: 'Database error' });
              }
              res.status(201).json({ 
                message: 'Attendance marked successfully',
                attendanceId: this.lastID
              });
            }
          );
        }
      }
    );
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Mark Teacher Attendance (Admin only)
router.post('/teacher', authenticateToken, requireTeacherOrAdmin, (req, res) => {
  try {
    const { teacher_id, date, status } = req.body;
    const marked_by = req.user.id;

    if (!teacher_id || !date || !status) {
      return res.status(400).json({ message: 'Teacher ID, date, and status are required' });
    }

    if (!['present', 'absent', 'late'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status. Must be present, absent, or late' });
    }

    // Check if attendance already exists for this teacher on this date
    db.get(
      'SELECT id FROM teacher_attendance WHERE teacher_id = ? AND date = ?',
      [teacher_id, date],
      (err, existing) => {
        if (err) {
          return res.status(500).json({ message: 'Database error' });
        }

        if (existing) {
          // Update existing attendance
          db.run(
            'UPDATE teacher_attendance SET status = ?, marked_by = ? WHERE id = ?',
            [status, marked_by, existing.id],
            (err) => {
              if (err) {
                return res.status(500).json({ message: 'Database error' });
              }
              res.json({ message: 'Teacher attendance updated successfully' });
            }
          );
        } else {
          // Insert new attendance
          db.run(
            'INSERT INTO teacher_attendance (teacher_id, date, status, marked_by) VALUES (?, ?, ?, ?)',
            [teacher_id, date, status, marked_by],
            function(err) {
              if (err) {
                return res.status(500).json({ message: 'Database error' });
              }
              res.status(201).json({ 
                message: 'Teacher attendance marked successfully',
                attendanceId: this.lastID
              });
            }
          );
        }
      }
    );
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get Student Attendance (Students, Parents, Teachers, Admin)
router.get('/student/:studentId', authenticateToken, (req, res) => {
  try {
    const { studentId } = req.params;
    const { start_date, end_date, subject_id } = req.query;

    let query = `
      SELECT a.*, s.first_name, s.last_name, s.grade, s.section, sub.name as subject_name
      FROM attendance a
      JOIN students s ON a.student_id = s.id
      LEFT JOIN subjects sub ON a.subject_id = sub.id
      WHERE a.student_id = ?
    `;
    let params = [studentId];

    if (start_date && end_date) {
      query += ' AND a.date BETWEEN ? AND ?';
      params.push(start_date, end_date);
    }

    if (subject_id) {
      query += ' AND a.subject_id = ?';
      params.push(subject_id);
    }

    query += ' ORDER BY a.date DESC';

    db.all(query, params, (err, attendance) => {
      if (err) {
        return res.status(500).json({ message: 'Database error' });
      }

      // Calculate attendance percentage
      const total = attendance.length;
      const present = attendance.filter(a => a.status === 'present').length;
      const absent = attendance.filter(a => a.status === 'absent').length;
      const late = attendance.filter(a => a.status === 'late').length;
      const percentage = total > 0 ? ((present + late) / total * 100).toFixed(2) : 0;

      res.json({
        attendance,
        summary: {
          total,
          present,
          absent,
          late,
          percentage: parseFloat(percentage)
        }
      });
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get Teacher Attendance (Admin and Teachers)
router.get('/teacher/:teacherId', authenticateToken, (req, res) => {
  try {
    const { teacherId } = req.params;
    const { start_date, end_date } = req.query;

    let query = `
      SELECT ta.*, t.first_name, t.last_name, t.subject
      FROM teacher_attendance ta
      JOIN teachers t ON ta.teacher_id = t.id
      WHERE ta.teacher_id = ?
    `;
    let params = [teacherId];

    if (start_date && end_date) {
      query += ' AND ta.date BETWEEN ? AND ?';
      params.push(start_date, end_date);
    }

    query += ' ORDER BY ta.date DESC';

    db.all(query, params, (err, attendance) => {
      if (err) {
        return res.status(500).json({ message: 'Database error' });
      }

      // Calculate attendance percentage
      const total = attendance.length;
      const present = attendance.filter(a => a.status === 'present').length;
      const absent = attendance.filter(a => a.status === 'absent').length;
      const late = attendance.filter(a => a.status === 'late').length;
      const percentage = total > 0 ? ((present + late) / total * 100).toFixed(2) : 0;

      res.json({
        attendance,
        summary: {
          total,
          present,
          absent,
          late,
          percentage: parseFloat(percentage)
        }
      });
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get Class Attendance (Teachers and Admin)
router.get('/class/:grade/:section', authenticateToken, requireTeacherOrAdmin, (req, res) => {
  try {
    const { grade, section } = req.params;
    const { date, subject_id } = req.query;

    if (!date) {
      return res.status(400).json({ message: 'Date is required' });
    }

    const query = `
      SELECT s.id, s.first_name, s.last_name, a.status, a.id as attendance_id
      FROM students s
      LEFT JOIN attendance a ON s.id = a.student_id AND a.date = ? AND a.subject_id = ?
      WHERE s.grade = ? AND s.section = ?
      ORDER BY s.first_name, s.last_name
    `;

    db.all(query, [date, subject_id, grade, section], (err, students) => {
      if (err) {
        return res.status(500).json({ message: 'Database error' });
      }

      res.json({ students, date, subject_id });
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router; 