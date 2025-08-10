const express = require('express');
const { db } = require('../database/database');
const { authenticateToken, requireTeacherOrAdmin } = require('../middleware/auth');

const router = express.Router();

// Record Fee Payment (Admin and Teachers)
router.post('/', authenticateToken, requireTeacherOrAdmin, (req, res) => {
  try {
    const { student_id, fee_type, amount, due_date, status, payment_date, payment_method } = req.body;
    const recorded_by = req.user.id;

    if (!student_id || !fee_type || !amount || !due_date || !status) {
      return res.status(400).json({ 
        message: 'Student ID, fee type, amount, due date, and status are required' 
      });
    }

    if (!['paid', 'pending', 'overdue'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status. Must be paid, pending, or overdue' });
    }

    if (amount <= 0) {
      return res.status(400).json({ message: 'Amount must be greater than 0' });
    }

    // If status is paid, payment_date is required
    if (status === 'paid' && !payment_date) {
      return res.status(400).json({ message: 'Payment date is required when status is paid' });
    }

    db.run(
      'INSERT INTO fees (student_id, fee_type, amount, due_date, status, payment_date, payment_method, recorded_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [student_id, fee_type, amount, due_date, status, payment_date, payment_method, recorded_by],
      function(err) {
        if (err) {
          return res.status(500).json({ message: 'Database error' });
        }
        res.status(201).json({ 
          message: 'Fee record created successfully',
          feeId: this.lastID
        });
      }
    );
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Update Fee Status (Admin and Teachers)
router.put('/:feeId', authenticateToken, requireTeacherOrAdmin, (req, res) => {
  try {
    const { feeId } = req.params;
    const { status, payment_date, payment_method } = req.body;

    if (!status) {
      return res.status(400).json({ message: 'Status is required' });
    }

    if (!['paid', 'pending', 'overdue'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status. Must be paid, pending, or overdue' });
    }

    // If status is paid, payment_date is required
    if (status === 'paid' && !payment_date) {
      return res.status(400).json({ message: 'Payment date is required when status is paid' });
    }

    let query = 'UPDATE fees SET status = ?';
    let params = [status];

    if (status === 'paid') {
      query += ', payment_date = ?, payment_method = ?';
      params.push(payment_date, payment_method);
    } else {
      query += ', payment_date = NULL, payment_method = NULL';
    }

    query += ' WHERE id = ?';
    params.push(feeId);

    db.run(query, params, function(err) {
      if (err) {
        return res.status(500).json({ message: 'Database error' });
      }

      if (this.changes === 0) {
        return res.status(404).json({ message: 'Fee record not found' });
      }

      res.json({ message: 'Fee status updated successfully' });
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get Student Fees (Students, Parents, Teachers, Admin)
router.get('/student/:studentId', authenticateToken, (req, res) => {
  try {
    const { studentId } = req.params;
    const { status, fee_type, start_date, end_date } = req.query;

    let query = `
      SELECT f.*, s.first_name, s.last_name, s.grade, s.section
      FROM fees f
      JOIN students s ON f.student_id = s.id
      WHERE f.student_id = ?
    `;
    let params = [studentId];

    if (status) {
      query += ' AND f.status = ?';
      params.push(status);
    }

    if (fee_type) {
      query += ' AND f.fee_type = ?';
      params.push(fee_type);
    }

    if (start_date && end_date) {
      query += ' AND f.due_date BETWEEN ? AND ?';
      params.push(start_date, end_date);
    }

    query += ' ORDER BY f.due_date DESC, f.fee_type';

    db.all(query, params, (err, fees) => {
      if (err) {
        return res.status(500).json({ message: 'Database error' });
      }

      // Calculate fee summary
      const totalFees = fees.length;
      const totalAmount = fees.reduce((sum, f) => sum + f.amount, 0);
      const paidAmount = fees.filter(f => f.status === 'paid').reduce((sum, f) => sum + f.amount, 0);
      const pendingAmount = fees.filter(f => f.status === 'pending').reduce((sum, f) => sum + f.amount, 0);
      const overdueAmount = fees.filter(f => f.status === 'overdue').reduce((sum, f) => sum + f.amount, 0);

      // Group by fee type
      const feeTypeSummary = {};
      fees.forEach(fee => {
        if (!feeTypeSummary[fee.fee_type]) {
          feeTypeSummary[fee.fee_type] = {
            total: 0,
            paid: 0,
            pending: 0,
            overdue: 0
          };
        }
        feeTypeSummary[fee.fee_type].total += fee.amount;
        if (fee.status === 'paid') {
          feeTypeSummary[fee.fee_type].paid += fee.amount;
        } else if (fee.status === 'pending') {
          feeTypeSummary[fee.fee_type].pending += fee.amount;
        } else if (fee.status === 'overdue') {
          feeTypeSummary[fee.fee_type].overdue += fee.amount;
        }
      });

      res.json({
        fees,
        summary: {
          totalFees,
          totalAmount,
          paidAmount,
          pendingAmount,
          overdueAmount
        },
        feeTypeSummary
      });
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get Class Fees Summary (Teachers and Admin)
router.get('/class/:grade/:section', authenticateToken, requireTeacherOrAdmin, (req, res) => {
  try {
    const { grade, section } = req.params;
    const { fee_type, status } = req.query;

    let query = `
      SELECT f.*, s.first_name, s.last_name, s.id as student_id
      FROM fees f
      JOIN students s ON f.student_id = s.id
      WHERE s.grade = ? AND s.section = ?
    `;
    let params = [grade, section];

    if (fee_type) {
      query += ' AND f.fee_type = ?';
      params.push(fee_type);
    }

    if (status) {
      query += ' AND f.status = ?';
      params.push(status);
    }

    query += ' ORDER BY s.first_name, s.last_name, f.due_date DESC';

    db.all(query, params, (err, fees) => {
      if (err) {
        return res.status(500).json({ message: 'Database error' });
      }

      // Calculate class fee statistics
      const totalStudents = [...new Set(fees.map(f => f.student_id))].length;
      const totalFees = fees.length;
      const totalAmount = fees.reduce((sum, f) => sum + f.amount, 0);
      const paidAmount = fees.filter(f => f.status === 'paid').reduce((sum, f) => sum + f.amount, 0);
      const pendingAmount = fees.filter(f => f.status === 'pending').reduce((sum, f) => sum + f.amount, 0);
      const overdueAmount = fees.filter(f => f.status === 'overdue').reduce((sum, f) => sum + f.amount, 0);

      // Group by student
      const studentWiseFees = {};
      fees.forEach(fee => {
        if (!studentWiseFees[fee.student_id]) {
          studentWiseFees[fee.student_id] = {
            name: `${fee.first_name} ${fee.last_name}`,
            fees: []
          };
        }
        studentWiseFees[fee.student_id].fees.push(fee);
      });

      res.json({
        fees,
        classStats: {
          totalStudents,
          totalFees,
          totalAmount,
          paidAmount,
          pendingAmount,
          overdueAmount
        },
        studentWiseFees
      });
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get Overdue Fees (Admin and Teachers)
router.get('/overdue', authenticateToken, requireTeacherOrAdmin, (req, res) => {
  try {
    const { grade, section, fee_type } = req.query;

    let query = `
      SELECT f.*, s.first_name, s.last_name, s.grade, s.section
      FROM fees f
      JOIN students s ON f.student_id = s.id
      WHERE f.status = 'overdue'
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

    if (fee_type) {
      query += ' AND f.fee_type = ?';
      params.push(fee_type);
    }

    query += ' ORDER BY f.due_date ASC, s.grade, s.section, s.first_name';

    db.all(query, params, (err, fees) => {
      if (err) {
        return res.status(500).json({ message: 'Database error' });
      }

      const totalOverdue = fees.length;
      const totalOverdueAmount = fees.reduce((sum, f) => sum + f.amount, 0);

      res.json({
        fees,
        summary: {
          totalOverdue,
          totalOverdueAmount
        }
      });
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete Fee Record (Admin only)
router.delete('/:feeId', authenticateToken, requireTeacherOrAdmin, (req, res) => {
  try {
    const { feeId } = req.params;

    db.run('DELETE FROM fees WHERE id = ?', [feeId], function(err) {
      if (err) {
        return res.status(500).json({ message: 'Database error' });
      }

      if (this.changes === 0) {
        return res.status(404).json({ message: 'Fee record not found' });
      }

      res.json({ message: 'Fee record deleted successfully' });
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router; 