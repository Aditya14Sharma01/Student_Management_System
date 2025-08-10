const express = require('express');
const { db } = require('../database/database');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Get System Overview (Admin only)
router.get('/overview', authenticateToken, requireAdmin, (req, res) => {
  try {
    // Get counts for different entities
    db.get('SELECT COUNT(*) as count FROM students', (err, studentsCount) => {
      if (err) {
        return res.status(500).json({ message: 'Database error' });
      }

      db.get('SELECT COUNT(*) as count FROM teachers', (err, teachersCount) => {
        if (err) {
          return res.status(500).json({ message: 'Database error' });
        }

        db.get('SELECT COUNT(*) as count FROM users', (err, usersCount) => {
          if (err) {
            return res.status(500).json({ message: 'Database error' });
          }

          db.get('SELECT COUNT(*) as count FROM subjects', (err, subjectsCount) => {
            if (err) {
              return res.status(500).json({ message: 'Database error' });
            }

            // Get today's attendance summary
            const today = new Date().toISOString().split('T')[0];
            db.get('SELECT COUNT(*) as total, SUM(CASE WHEN status = "present" THEN 1 ELSE 0 END) as present, SUM(CASE WHEN status = "absent" THEN 1 ELSE 0 END) as absent, SUM(CASE WHEN status = "late" THEN 1 ELSE 0 END) as late FROM attendance WHERE date = ?', [today], (err, todayAttendance) => {
              if (err) {
                return res.status(500).json({ message: 'Database error' });
              }

              // Get fee summary
              db.get('SELECT COUNT(*) as total, SUM(amount) as total_amount, SUM(CASE WHEN status = "paid" THEN amount ELSE 0 END) as paid_amount, SUM(CASE WHEN status = "pending" THEN amount ELSE 0 END) as pending_amount, SUM(CASE WHEN status = "overdue" THEN amount ELSE 0 END) as overdue_amount FROM fees', (err, feesSummary) => {
                if (err) {
                  return res.status(500).json({ message: 'Database error' });
                }

                res.json({
                  overview: {
                    students: studentsCount.count || 0,
                    teachers: teachersCount.count || 0,
                    users: usersCount.count || 0,
                    subjects: subjectsCount.count || 0
                  },
                  todayAttendance: {
                    total: todayAttendance.total || 0,
                    present: todayAttendance.present || 0,
                    absent: todayAttendance.absent || 0,
                    late: todayAttendance.late || 0,
                    percentage: todayAttendance.total > 0 ? ((todayAttendance.present + todayAttendance.late) / todayAttendance.total * 100).toFixed(2) : 0
                  },
                  feesSummary: {
                    total: feesSummary.total || 0,
                    totalAmount: feesSummary.total_amount || 0,
                    paidAmount: feesSummary.paid_amount || 0,
                    pendingAmount: feesSummary.pending_amount || 0,
                    overdueAmount: feesSummary.overdue_amount || 0
                  }
                });
              });
            });
          });
        });
      });
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get Attendance Report (Admin only)
router.get('/attendance-report', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { start_date, end_date, grade, section } = req.query;

    if (!start_date || !end_date) {
      return res.status(400).json({ message: 'Start date and end date are required' });
    }

    let query = `
      SELECT 
        s.first_name, s.last_name, s.grade, s.section,
        COUNT(a.id) as total_days,
        SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) as present_days,
        SUM(CASE WHEN a.status = 'absent' THEN 1 ELSE 0 END) as absent_days,
        SUM(CASE WHEN a.status = 'late' THEN 1 ELSE 0 END) as late_days
      FROM students s
      LEFT JOIN attendance a ON s.id = a.student_id AND a.date BETWEEN ? AND ?
      WHERE 1=1
    `;
    let params = [start_date, end_date];

    if (grade) {
      query += ' AND s.grade = ?';
      params.push(grade);
    }

    if (section) {
      query += ' AND s.section = ?';
      params.push(section);
    }

    query += ' GROUP BY s.id, s.first_name, s.last_name, s.grade, s.section ORDER BY s.grade, s.section, s.first_name';

    db.all(query, params, (err, report) => {
      if (err) {
        return res.status(500).json({ message: 'Database error' });
      }

      // Calculate summary statistics
      const totalStudents = report.length;
      const totalDays = report.reduce((sum, r) => sum + r.total_days, 0);
      const totalPresent = report.reduce((sum, r) => sum + r.present_days, 0);
      const totalAbsent = report.reduce((sum, r) => sum + r.absent_days, 0);
      const totalLate = report.reduce((sum, r) => sum + r.late_days, 0);
      const overallPercentage = totalDays > 0 ? ((totalPresent + totalLate) / totalDays * 100).toFixed(2) : 0;

      res.json({
        report,
        summary: {
          totalStudents,
          totalDays,
          totalPresent,
          totalAbsent,
          totalLate,
          overallPercentage: parseFloat(overallPercentage)
        }
      });
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get Academic Performance Report (Admin only)
router.get('/performance-report', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { start_date, end_date, grade, section, subject_id } = req.query;

    if (!start_date || !end_date) {
      return res.status(400).json({ message: 'Start date and end date are required' });
    }

    let query = `
      SELECT 
        s.first_name, s.last_name, s.grade, s.section,
        sub.name as subject_name,
        COUNT(tr.id) as total_tests,
        AVG(tr.marks_obtained * 100.0 / tr.total_marks) as average_percentage,
        MAX(tr.marks_obtained * 100.0 / tr.total_marks) as highest_percentage,
        MIN(tr.marks_obtained * 100.0 / tr.total_marks) as lowest_percentage
      FROM students s
      LEFT JOIN test_results tr ON s.id = tr.student_id AND tr.test_date BETWEEN ? AND ?
      LEFT JOIN subjects sub ON tr.subject_id = sub.id
      WHERE 1=1
    `;
    let params = [start_date, end_date];

    if (grade) {
      query += ' AND s.grade = ?';
      params.push(grade);
    }

    if (section) {
      query += ' AND s.section = ?';
      params.push(section);
    }

    if (subject_id) {
      query += ' AND tr.subject_id = ?';
      params.push(subject_id);
    }

    query += ' GROUP BY s.id, s.first_name, s.last_name, s.grade, s.section, sub.name ORDER BY s.grade, s.section, s.first_name, sub.name';

    db.all(query, params, (err, report) => {
      if (err) {
        return res.status(500).json({ message: 'Database error' });
      }

      // Calculate summary statistics
      const totalStudents = [...new Set(report.map(r => `${r.first_name} ${r.last_name}`))].length;
      const totalTests = report.reduce((sum, r) => sum + r.total_tests, 0);
      const averagePercentage = report.length > 0 ? report.reduce((sum, r) => sum + r.average_percentage, 0) / report.length : 0;

      res.json({
        report,
        summary: {
          totalStudents,
          totalTests,
          averagePercentage: parseFloat(averagePercentage.toFixed(2))
        }
      });
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get Fee Collection Report (Admin only)
router.get('/fee-report', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { start_date, end_date, grade, section, fee_type } = req.query;

    if (!start_date || !end_date) {
      return res.status(400).json({ message: 'Start date and end date are required' });
    }

    let query = `
      SELECT 
        s.first_name, s.last_name, s.grade, s.section,
        f.fee_type,
        COUNT(f.id) as total_fees,
        SUM(f.amount) as total_amount,
        SUM(CASE WHEN f.status = 'paid' THEN f.amount ELSE 0 END) as paid_amount,
        SUM(CASE WHEN f.status = 'pending' THEN f.amount ELSE 0 END) as pending_amount,
        SUM(CASE WHEN f.status = 'overdue' THEN f.amount ELSE 0 END) as overdue_amount
      FROM students s
      LEFT JOIN fees f ON s.id = f.student_id AND f.due_date BETWEEN ? AND ?
      WHERE 1=1
    `;
    let params = [start_date, end_date];

    if (grade) {
      query += ' AND s.grade = ?';
      params.push(grade);
    }

    if (section) {
      query += ' AND s.section = ?';
      params.push(section);
    }

    if (fee_type) {
      query += ' AND f.fee_type = ?';
      params.push(fee_type);
    }

    query += ' GROUP BY s.id, s.first_name, s.last_name, s.grade, s.section, f.fee_type ORDER BY s.grade, s.section, s.first_name, f.fee_type';

    db.all(query, params, (err, report) => {
      if (err) {
        return res.status(500).json({ message: 'Database error' });
      }

      // Calculate summary statistics
      const totalStudents = [...new Set(report.map(r => `${r.first_name} ${r.last_name}`))].length;
      const totalFees = report.reduce((sum, r) => sum + r.total_fees, 0);
      const totalAmount = report.reduce((sum, r) => sum + r.total_amount, 0);
      const totalPaid = report.reduce((sum, r) => sum + r.paid_amount, 0);
      const totalPending = report.reduce((sum, r) => sum + r.pending_amount, 0);
      const totalOverdue = report.reduce((sum, r) => sum + r.overdue_amount, 0);
      const collectionRate = totalAmount > 0 ? (totalPaid / totalAmount * 100).toFixed(2) : 0;

      res.json({
        report,
        summary: {
          totalStudents,
          totalFees,
          totalAmount,
          totalPaid,
          totalPending,
          totalOverdue,
          collectionRate: parseFloat(collectionRate)
        }
      });
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get Teacher Performance Report (Admin only)
router.get('/teacher-performance', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { start_date, end_date, subject } = req.query;

    if (!start_date || !end_date) {
      return res.status(400).json({ message: 'Start date and end date are required' });
    }

    let query = `
      SELECT 
        t.first_name, t.last_name, t.subject,
        COUNT(DISTINCT ta.id) as total_days,
        SUM(CASE WHEN ta.status = 'present' THEN 1 ELSE 0 END) as present_days,
        SUM(CASE WHEN ta.status = 'absent' THEN 1 ELSE 0 END) as absent_days,
        SUM(CASE WHEN ta.status = 'late' THEN 1 ELSE 0 END) as late_days,
        COUNT(DISTINCT s.id) as total_subjects
      FROM teachers t
      LEFT JOIN teacher_attendance ta ON t.id = ta.teacher_id AND ta.date BETWEEN ? AND ?
      LEFT JOIN subjects s ON t.id = s.teacher_id
      WHERE 1=1
    `;
    let params = [start_date, end_date];

    if (subject) {
      query += ' AND t.subject = ?';
      params.push(subject);
    }

    query += ' GROUP BY t.id, t.first_name, t.last_name, t.subject ORDER BY t.first_name, t.last_name';

    db.all(query, params, (err, report) => {
      if (err) {
        return res.status(500).json({ message: 'Database error' });
      }

      // Calculate summary statistics
      const totalTeachers = report.length;
      const totalDays = report.reduce((sum, r) => sum + r.total_days, 0);
      const totalPresent = report.reduce((sum, r) => sum + r.present_days, 0);
      const totalAbsent = report.reduce((sum, r) => sum + r.absent_days, 0);
      const totalLate = report.reduce((sum, r) => sum + r.late_days, 0);
      const overallPercentage = totalDays > 0 ? ((totalPresent + totalLate) / totalDays * 100).toFixed(2) : 0;

      res.json({
        report,
        summary: {
          totalTeachers,
          totalDays,
          totalPresent,
          totalAbsent,
          totalLate,
          overallPercentage: parseFloat(overallPercentage)
        }
      });
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get System Logs (Admin only)
router.get('/logs', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { limit = 100, offset = 0 } = req.query;

    // This is a placeholder for system logs
    // In a real system, you would have a logs table
    res.json({
      message: 'System logs feature not implemented yet',
      logs: [],
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        total: 0
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router; 