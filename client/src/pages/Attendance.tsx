import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Calendar, Users, CheckCircle, XCircle, Clock, Plus } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';

interface Student {
  id: number;
  first_name: string;
  last_name: string;
  grade: string;
  section: string;
}

interface Teacher {
  id: number;
  first_name: string;
  last_name: string;
  subject: string;
}

interface AttendanceRecord {
  id?: number;
  student_id?: number;
  teacher_id?: number;
  subject_id?: number;
  date: string;
  status: 'present' | 'absent' | 'late';
}

const Attendance: React.FC = () => {
  const { user, isAdmin, isTeacher } = useAuth();
  const [activeTab, setActiveTab] = useState<'student' | 'teacher'>('student');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedGrade, setSelectedGrade] = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [students, setStudents] = useState<Student[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [showMarkAttendance, setShowMarkAttendance] = useState(false);

  const grades = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];
  const sections = ['A', 'B', 'C', 'D'];
  const subjects = ['Mathematics', 'Science', 'English', 'History', 'Geography', 'Computer Science'];

  useEffect(() => {
    if (selectedGrade && selectedSection) {
      fetchStudents();
    }
  }, [selectedGrade, selectedSection]);

  useEffect(() => {
    fetchTeachers();
  }, []);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      // In a real app, you'd fetch students from the API
      const mockStudents: Student[] = [
        { id: 1, first_name: 'John', last_name: 'Doe', grade: selectedGrade, section: selectedSection },
        { id: 2, first_name: 'Jane', last_name: 'Smith', grade: selectedGrade, section: selectedSection },
        { id: 3, first_name: 'Mike', last_name: 'Johnson', grade: selectedGrade, section: selectedSection },
        { id: 4, first_name: 'Sarah', last_name: 'Williams', grade: selectedGrade, section: selectedSection },
        { id: 5, first_name: 'David', last_name: 'Brown', grade: selectedGrade, section: selectedSection },
      ];
      setStudents(mockStudents);
      
      // Initialize attendance records
      const records: AttendanceRecord[] = mockStudents.map(student => ({
        student_id: student.id,
        subject_id: 1, // Default subject
        date: selectedDate,
        status: 'present'
      }));
      setAttendanceRecords(records);
    } catch (error) {
      toast.error('Error fetching students');
    } finally {
      setLoading(false);
    }
  };

  const fetchTeachers = async () => {
    try {
      // In a real app, you'd fetch teachers from the API
      const mockTeachers: Teacher[] = [
        { id: 1, first_name: 'Dr. Robert', last_name: 'Wilson', subject: 'Mathematics' },
        { id: 2, first_name: 'Ms. Emily', last_name: 'Davis', subject: 'Science' },
        { id: 3, first_name: 'Mr. James', last_name: 'Miller', subject: 'English' },
        { id: 4, first_name: 'Mrs. Lisa', last_name: 'Anderson', subject: 'History' },
      ];
      setTeachers(mockTeachers);
    } catch (error) {
      toast.error('Error fetching teachers');
    }
  };

  const handleAttendanceChange = (id: number, status: 'present' | 'absent' | 'late') => {
    setAttendanceRecords(prev => 
      prev.map(record => 
        record.student_id === id || record.teacher_id === id
          ? { ...record, status }
          : record
      )
    );
  };

  const submitAttendance = async () => {
    try {
      setLoading(true);
      
      if (activeTab === 'student') {
        // Submit student attendance
        for (const record of attendanceRecords) {
          if (record.student_id) {
            await axios.post('/api/attendance/student', {
              student_id: record.student_id,
              subject_id: record.subject_id,
              date: record.date,
              status: record.status
            });
          }
        }
        toast.success('Student attendance submitted successfully');
      } else {
        // Submit teacher attendance
        for (const record of attendanceRecords) {
          if (record.teacher_id) {
            await axios.post('/api/attendance/teacher', {
              teacher_id: record.teacher_id,
              date: record.date,
              status: record.status
            });
          }
        }
        toast.success('Teacher attendance submitted successfully');
      }
      
      setShowMarkAttendance(false);
    } catch (error) {
      toast.error('Error submitting attendance');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'present': return 'text-green-600 bg-green-100';
      case 'absent': return 'text-red-600 bg-red-100';
      case 'late': return 'text-yellow-600 bg-yellow-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'present': return <CheckCircle className="h-4 w-4" />;
      case 'absent': return <XCircle className="h-4 w-4" />;
      case 'late': return <Clock className="h-4 w-4" />;
      default: return null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Attendance Management</h1>
          <p className="text-gray-600">Track daily attendance for students and teachers</p>
        </div>
        <button
          onClick={() => setShowMarkAttendance(true)}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Mark Attendance
        </button>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('student')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'student'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Users className="inline h-4 w-4 mr-2" />
            Student Attendance
          </button>
          <button
            onClick={() => setActiveTab('teacher')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'teacher'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Calendar className="inline h-4 w-4 mr-2" />
            Teacher Attendance
          </button>
        </nav>
      </div>

      {/* Attendance Form */}
      {showMarkAttendance && (
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-900">
              Mark {activeTab === 'student' ? 'Student' : 'Teacher'} Attendance
            </h3>
            <button
              onClick={() => setShowMarkAttendance(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <XCircle className="h-6 w-6" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="input-field"
              />
            </div>
            
            {activeTab === 'student' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Grade</label>
                  <select
                    value={selectedGrade}
                    onChange={(e) => setSelectedGrade(e.target.value)}
                    className="input-field"
                  >
                    <option value="">Select Grade</option>
                    {grades.map(grade => (
                      <option key={grade} value={grade}>{grade}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Section</label>
                  <select
                    value={selectedSection}
                    onChange={(e) => setSelectedSection(e.target.value)}
                    className="input-field"
                  >
                    <option value="">Select Section</option>
                    {sections.map(section => (
                      <option key={section} value={section}>{section}</option>
                    ))}
                  </select>
                </div>
              </>
            )}
          </div>

          {activeTab === 'student' && selectedGrade && selectedSection && (
            <div className="space-y-4">
              <h4 className="font-medium text-gray-900">Class {selectedGrade}-{selectedSection}</h4>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="table-header">Student</th>
                      <th className="table-header">Status</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {students.map((student) => (
                      <tr key={student.id}>
                        <td className="table-cell">
                          {student.first_name} {student.last_name}
                        </td>
                        <td className="table-cell">
                          <div className="flex space-x-2">
                            {(['present', 'absent', 'late'] as const).map((status) => (
                              <button
                                key={status}
                                onClick={() => handleAttendanceChange(student.id, status)}
                                className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${
                                  attendanceRecords.find(r => r.student_id === student.id)?.status === status
                                    ? getStatusColor(status)
                                    : 'text-gray-500 hover:bg-gray-100'
                                }`}
                              >
                                {getStatusIcon(status)}
                                {status.charAt(0).toUpperCase() + status.slice(1)}
                              </button>
                            ))}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'teacher' && (
            <div className="space-y-4">
              <h4 className="font-medium text-gray-900">Teachers</h4>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="table-header">Teacher</th>
                      <th className="table-header">Subject</th>
                      <th className="table-header">Status</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {teachers.map((teacher) => (
                      <tr key={teacher.id}>
                        <td className="table-cell">
                          {teacher.first_name} {teacher.last_name}
                        </td>
                        <td className="table-cell">{teacher.subject}</td>
                        <td className="table-cell">
                          <div className="flex space-x-2">
                            {(['present', 'absent', 'late'] as const).map((status) => (
                              <button
                                key={status}
                                onClick={() => handleAttendanceChange(teacher.id, status)}
                                className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${
                                  attendanceRecords.find(r => r.teacher_id === teacher.id)?.status === status
                                    ? getStatusColor(status)
                                    : 'text-gray-500 hover:bg-gray-100'
                                }`}
                              >
                                {getStatusIcon(status)}
                                {status.charAt(0).toUpperCase() + status.slice(1)}
                              </button>
                            ))}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="flex justify-end space-x-3 mt-6">
            <button
              onClick={() => setShowMarkAttendance(false)}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              onClick={submitAttendance}
              disabled={loading}
              className="btn-primary"
            >
              {loading ? 'Submitting...' : 'Submit Attendance'}
            </button>
          </div>
        </div>
      )}

      {/* Attendance Summary */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Today's Attendance Summary</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-green-50 p-4 rounded-lg">
            <div className="flex items-center">
              <CheckCircle className="h-8 w-8 text-green-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-green-800">Present</p>
                <p className="text-2xl font-bold text-green-900">
                  {attendanceRecords.filter(r => r.status === 'present').length}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-red-50 p-4 rounded-lg">
            <div className="flex items-center">
              <XCircle className="h-8 w-8 text-red-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-red-800">Absent</p>
                <p className="text-2xl font-bold text-red-900">
                  {attendanceRecords.filter(r => r.status === 'absent').length}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-yellow-50 p-4 rounded-lg">
            <div className="flex items-center">
              <Clock className="h-8 w-8 text-yellow-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-yellow-800">Late</p>
                <p className="text-2xl font-bold text-yellow-900">
                  {attendanceRecords.filter(r => r.status === 'late').length}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Attendance; 