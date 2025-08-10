const express = require('express');
const { db } = require('../database/database');
const { authenticateToken, requireTeacherOrAdmin } = require('../middleware/auth');

const router = express.Router();

// Record Test Result (Teachers and Admin)
router.post('/', authenticateToken, requireTeacherOrAdmin, (req, res) => {
  try {
    const { student_id, subject_id, test_name, marks_obtained, total_marks, test_date } = req.body;
    const recorded_by = req.user.id;

    if (!student_id || !subject_id || !test_name || !marks_obtained || !total_marks || !test_date) {
      return res.status(400).json({ 
        message: 'Student ID, subject ID, test name, marks obtained, total marks, and test date are required' 
      });
    }

    if (marks_obtained > total_marks) {
      return res.status(400).json({ message: 'Marks obtained cannot exceed total marks' });
    }

    if (marks_obtained < 0 || total_marks <= 0) {
      return res.status(400).json({ message: 'Invalid marks values' });
    }

    // Check if result already exists for this student, subject, and test
    db.get(
      'SELECT id FROM test_results WHERE student_id = ? AND subject_id = ? AND test_name = ? AND test_date = ?',
      [student_id, subject_id, test_name, test_date],
      (err, existing) => {
        if (err) {
          return res.status(500).json({ message: 'Database error' });
        }

        if (existing) {
          // Update existing result
          db.run(
            'UPDATE test_results SET marks_obtained = ?, total_marks = ?, recorded_by = ? WHERE id = ?',
            [marks_obtained, total_marks, recorded_by, existing.id],
            (err) => {
              if (err) {
                return res.status(500).json({ message: 'Database error' });
              }
              res.json({ message: 'Test result updated successfully' });
            }
          );
        } else {
          // Insert new result
          db.run(
            'INSERT INTO test_results (student_id, subject_id, test_name, marks_obtained, total_marks, test_date, recorded_by) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [student_id, subject_id, test_name, marks_obtained, total_marks, test_date, recorded_by],
            function(err) {
              if (err) {
                return res.status(500).json({ message: 'Database error' });
              }
              res.status(201).json({ 
                message: 'Test result recorded successfully',
                resultId: this.lastID
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

// Get Student Test Results (Students, Parents, Teachers, Admin)
router.get('/student/:studentId', authenticateToken, (req, res) => {
  try {
    const { studentId } = req.params;
    const { subject_id, start_date, end_date } = req.query;

    let query = `
      SELECT tr.*, s.first_name, s.last_name, s.grade, s.section, sub.name as subject_name
      FROM test_results tr
      JOIN students s ON tr.student_id = s.id
      JOIN subjects sub ON tr.subject_id = sub.id
      WHERE tr.student_id = ?
    `;
    let params = [studentId];

    if (subject_id) {
      query += ' AND tr.subject_id = ?';
      params.push(subject_id);
    }

    if (start_date && end_date) {
      query += ' AND tr.test_date BETWEEN ? AND ?';
      params.push(start_date, end_date);
    }

    query += ' ORDER BY tr.test_date DESC, sub.name, tr.test_name';

    db.all(query, params, (err, results) => {
      if (err) {
        return res.status(500).json({ message: 'Database error' });
      }

      // Calculate performance summary
      const totalTests = results.length;
      const totalMarks = results.reduce((sum, r) => sum + r.total_marks, 0);
      const obtainedMarks = results.reduce((sum, r) => sum + r.marks_obtained, 0);
      const averagePercentage = totalMarks > 0 ? (obtainedMarks / totalMarks * 100).toFixed(2) : 0;

      // Group by subject
      const subjectWiseResults = {};
      results.forEach(result => {
        if (!subjectWiseResults[result.subject_name]) {
          subjectWiseResults[result.subject_name] = [];
        }
        subjectWiseResults[result.subject_name].push(result);
      });

      res.json({
        results,
        summary: {
          totalTests,
          totalMarks,
          obtainedMarks,
          averagePercentage: parseFloat(averagePercentage)
        },
        subjectWiseResults
      });
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get Class Test Results (Teachers and Admin)
router.get('/class/:grade/:section', authenticateToken, requireTeacherOrAdmin, (req, res) => {
  try {
    const { grade, section } = req.params;
    const { subject_id, test_name, test_date } = req.query;

    if (!subject_id || !test_name || !test_date) {
      return res.status(400).json({ 
        message: 'Subject ID, test name, and test date are required' 
      });
    }

    const query = `
      SELECT tr.*, s.first_name, s.last_name, s.id as student_id
      FROM test_results tr
      JOIN students s ON tr.student_id = s.id
      WHERE s.grade = ? AND s.section = ? AND tr.subject_id = ? AND tr.test_name = ? AND tr.test_date = ?
      ORDER BY s.first_name, s.last_name
    `;

    db.all(query, [grade, section, subject_id, test_name, test_date], (err, results) => {
      if (err) {
        return res.status(500).json({ message: 'Database error' });
      }

      // Calculate class statistics
      const totalStudents = results.length;
      const totalMarks = results.reduce((sum, r) => sum + r.total_marks, 0);
      const obtainedMarks = results.reduce((sum, r) => sum + r.marks_obtained, 0);
      const averagePercentage = totalMarks > 0 ? (obtainedMarks / totalMarks * 100).toFixed(2) : 0;
      const highestScore = results.length > 0 ? Math.max(...results.map(r => r.marks_obtained)) : 0;
      const lowestScore = results.length > 0 ? Math.min(...results.map(r => r.marks_obtained)) : 0;

      res.json({
        results,
        classStats: {
          totalStudents,
          totalMarks,
          obtainedMarks,
          averagePercentage: parseFloat(averagePercentage),
          highestScore,
          lowestScore
        }
      });
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get Subject-wise Results Summary (Teachers and Admin)
router.get('/subject/:subjectId', authenticateToken, requireTeacherOrAdmin, (req, res) => {
  try {
    const { subjectId } = req.params;
    const { start_date, end_date } = req.query;

    let query = `
      SELECT tr.*, s.first_name, s.last_name, s.grade, s.section
      FROM test_results tr
      JOIN students s ON tr.student_id = s.id
      WHERE tr.subject_id = ?
    `;
    let params = [subjectId];

    if (start_date && end_date) {
      query += ' AND tr.test_date BETWEEN ? AND ?';
      params.push(start_date, end_date);
    }

    query += ' ORDER BY tr.test_date DESC, s.grade, s.section, s.first_name';

    db.all(query, params, (err, results) => {
      if (err) {
        return res.status(500).json({ message: 'Database error' });
      }

      // Calculate subject statistics
      const totalTests = results.length;
      const totalMarks = results.reduce((sum, r) => sum + r.total_marks, 0);
      const obtainedMarks = results.reduce((sum, r) => sum + r.marks_obtained, 0);
      const averagePercentage = totalMarks > 0 ? (obtainedMarks / totalMarks * 100).toFixed(2) : 0;

      // Group by grade and section
      const gradeWiseResults = {};
      results.forEach(result => {
        const key = `${result.grade}-${result.section}`;
        if (!gradeWiseResults[key]) {
          gradeWiseResults[key] = [];
        }
        gradeWiseResults[key].push(result);
      });

      res.json({
        results,
        summary: {
          totalTests,
          totalMarks,
          obtainedMarks,
          averagePercentage: parseFloat(averagePercentage)
        },
        gradeWiseResults
      });
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete Test Result (Teachers and Admin)
router.delete('/:resultId', authenticateToken, requireTeacherOrAdmin, (req, res) => {
  try {
    const { resultId } = req.params;

    db.run('DELETE FROM test_results WHERE id = ?', [resultId], function(err) {
      if (err) {
        return res.status(500).json({ message: 'Database error' });
      }

      if (this.changes === 0) {
        return res.status(404).json({ message: 'Test result not found' });
      }

      res.json({ message: 'Test result deleted successfully' });
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router; 