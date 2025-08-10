import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { BookOpen, Plus, Search, BarChart3, TrendingUp, TrendingDown } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';

interface TestResult {
  id?: number;
  student_id: number;
  subject_id: number;
  test_name: string;
  marks_obtained: number;
  total_marks: number;
  test_date: string;
  student_name?: string;
  subject_name?: string;
  grade?: string;
  section?: string;
}

interface Student {
  id: number;
  first_name: string;
  last_name: string;
  grade: string;
  section: string;
}

interface Subject {
  id: number;
  name: string;
  grade: string;
}

const Results: React.FC = () => {
  const { user, isAdmin, isTeacher } = useAuth();
  const [activeTab, setActiveTab] = useState<'record' | 'view'>('record');
  const [showRecordForm, setShowRecordForm] = useState(false);
  const [results, setResults] = useState<TestResult[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGrade, setSelectedGrade] = useState('');
  const [selectedSection, setSelectedGrade] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');

  // Form state
  const [formData, setFormData] = useState<TestResult>({
    student_id: 0,
    subject_id: 0,
    test_name: '',
    marks_obtained: 0,
    total_marks: 0,
    test_date: new Date().toISOString().split('T')[0]
  });

  const grades = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];
  const sections = ['A', 'B', 'C', 'D'];
  const testTypes = ['Unit Test', 'Mid Term', 'Final Exam', 'Quiz', 'Assignment'];

  useEffect(() => {
    fetchStudents();
    fetchSubjects();
    fetchResults();
  }, []);

  const fetchStudents = async () => {
    try {
      // In a real app, you'd fetch from API
      const mockStudents: Student[] = [
        { id: 1, first_name: 'John', last_name: 'Doe', grade: '10', section: 'A' },
        { id: 2, first_name: 'Jane', last_name: 'Smith', grade: '10', section: 'A' },
        { id: 3, first_name: 'Mike', last_name: 'Johnson', grade: '10', section: 'A' },
        { id: 4, first_name: 'Sarah', last_name: 'Williams', grade: '10', section: 'A' },
        { id: 5, first_name: 'David', last_name: 'Brown', grade: '10', section: 'A' },
      ];
      setStudents(mockStudents);
    } catch (error) {
      toast.error('Error fetching students');
    }
  };

  const fetchSubjects = async () => {
    try {
      // In a real app, you'd fetch from API
      const mockSubjects: Subject[] = [
        { id: 1, name: 'Mathematics', grade: '10' },
        { id: 2, name: 'Science', grade: '10' },
        { id: 3, name: 'English', grade: '10' },
        { id: 4, name: 'History', grade: '10' },
        { id: 5, name: 'Geography', grade: '10' },
      ];
      setSubjects(mockSubjects);
    } catch (error) {
      toast.error('Error fetching subjects');
    }
  };

  const fetchResults = async () => {
    try {
      setLoading(true);
      // In a real app, you'd fetch from API
      const mockResults: TestResult[] = [
        {
          id: 1,
          student_id: 1,
          subject_id: 1,
          test_name: 'Unit Test 1',
          marks_obtained: 85,
          total_marks: 100,
          test_date: '2024-01-15',
          student_name: 'John Doe',
          subject_name: 'Mathematics',
          grade: '10',
          section: 'A'
        },
        {
          id: 2,
          student_id: 2,
          subject_id: 1,
          test_name: 'Unit Test 1',
          marks_obtained: 92,
          total_marks: 100,
          test_date: '2024-01-15',
          student_name: 'Jane Smith',
          subject_name: 'Mathematics',
          grade: '10',
          section: 'A'
        },
        {
          id: 3,
          student_id: 1,
          subject_id: 2,
          test_name: 'Mid Term',
          marks_obtained: 78,
          total_marks: 100,
          test_date: '2024-01-20',
          student_name: 'John Doe',
          subject_name: 'Science',
          grade: '10',
          section: 'A'
        }
      ];
      setResults(mockResults);
    } catch (error) {
      toast.error('Error fetching results');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'marks_obtained' || name === 'total_marks' ? parseFloat(value) || 0 : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.student_id || !formData.subject_id || !formData.test_name) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (formData.marks_obtained > formData.total_marks) {
      toast.error('Marks obtained cannot exceed total marks');
      return;
    }

    try {
      setLoading(true);
      
      if (formData.id) {
        // Update existing result
        await axios.put(`/api/results/${formData.id}`, formData);
        toast.success('Test result updated successfully');
      } else {
        // Create new result
        await axios.post('/api/results', formData);
        toast.success('Test result recorded successfully');
      }
      
      setShowRecordForm(false);
      setFormData({
        student_id: 0,
        subject_id: 0,
        test_name: '',
        marks_obtained: 0,
        total_marks: 0,
        test_date: new Date().toISOString().split('T')[0]
      });
      fetchResults();
    } catch (error) {
      toast.error('Error saving test result');
    } finally {
      setLoading(false);
    }
  };

  const editResult = (result: TestResult) => {
    setFormData(result);
    setShowRecordForm(true);
  };

  const deleteResult = async (id: number) => {
    if (!confirm('Are you sure you want to delete this result?')) return;
    
    try {
      await axios.delete(`/api/results/${id}`);
      toast.success('Test result deleted successfully');
      fetchResults();
    } catch (error) {
      toast.error('Error deleting test result');
    }
  };

  const filteredResults = results.filter(result => {
    const matchesSearch = result.student_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         result.subject_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         result.test_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesGrade = !selectedGrade || result.grade === selectedGrade;
    const matchesSection = !selectedSection || result.section === selectedSection;
    const matchesSubject = !selectedSubject || result.subject_name === selectedSubject;
    
    return matchesSearch && matchesGrade && matchesSection && matchesSubject;
  });

  const getPerformanceColor = (percentage: number) => {
    if (percentage >= 90) return 'text-green-600 bg-green-100';
    if (percentage >= 80) return 'text-blue-600 bg-blue-100';
    if (percentage >= 70) return 'text-yellow-600 bg-yellow-100';
    if (percentage >= 60) return 'text-orange-600 bg-orange-100';
    return 'text-red-600 bg-red-100';
  };

  const getPerformanceIcon = (percentage: number) => {
    if (percentage >= 80) return <TrendingUp className="h-4 w-4" />;
    if (percentage >= 60) return <BarChart3 className="h-4 w-4" />;
    return <TrendingDown className="h-4 w-4" />;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Test Results Management</h1>
          <p className="text-gray-600">Record and view student test results</p>
        </div>
        <button
          onClick={() => setShowRecordForm(true)}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Record Result
        </button>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('record')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'record'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Plus className="inline h-4 w-4 mr-2" />
            Record Results
          </button>
          <button
            onClick={() => setActiveTab('view')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'view'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <BookOpen className="inline h-4 w-4 mr-2" />
            View Results
          </button>
        </nav>
      </div>

      {/* Record Results Form */}
      {activeTab === 'record' && showRecordForm && (
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-900">
              {formData.id ? 'Edit Test Result' : 'Record New Test Result'}
            </h3>
            <button
              onClick={() => setShowRecordForm(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <XCircle className="h-6 w-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Student</label>
                <select
                  name="student_id"
                  value={formData.student_id}
                  onChange={handleInputChange}
                  className="input-field"
                  required
                >
                  <option value="">Select Student</option>
                  {students.map(student => (
                    <option key={student.id} value={student.id}>
                      {student.first_name} {student.last_name} - {student.grade}{student.section}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Subject</label>
                <select
                  name="subject_id"
                  value={formData.subject_id}
                  onChange={handleInputChange}
                  className="input-field"
                  required
                >
                  <option value="">Select Subject</option>
                  {subjects.map(subject => (
                    <option key={subject.id} value={subject.id}>
                      {subject.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Test Name</label>
                <select
                  name="test_name"
                  value={formData.test_name}
                  onChange={handleInputChange}
                  className="input-field"
                  required
                >
                  <option value="">Select Test Type</option>
                  {testTypes.map(test => (
                    <option key={test} value={test}>{test}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Test Date</label>
                <input
                  type="date"
                  name="test_date"
                  value={formData.test_date}
                  onChange={handleInputChange}
                  className="input-field"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Marks Obtained</label>
                <input
                  type="number"
                  name="marks_obtained"
                  value={formData.marks_obtained}
                  onChange={handleInputChange}
                  className="input-field"
                  min="0"
                  step="0.01"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Total Marks</label>
                <input
                  type="number"
                  name="total_marks"
                  value={formData.total_marks}
                  onChange={handleInputChange}
                  className="input-field"
                  min="1"
                  step="0.01"
                  required
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setShowRecordForm(false)}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="btn-primary"
              >
                {loading ? 'Saving...' : (formData.id ? 'Update Result' : 'Record Result')}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* View Results */}
      {activeTab === 'view' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="bg-white shadow rounded-lg p-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by name, subject, or test..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="input-field pl-10"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Grade</label>
                <select
                  value={selectedGrade}
                  onChange={(e) => setSelectedGrade(e.target.value)}
                  className="input-field"
                >
                  <option value="">All Grades</option>
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
                  <option value="">All Sections</option>
                  {sections.map(section => (
                    <option key={section} value={section}>{section}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Subject</label>
                <select
                  value={selectedSubject}
                  onChange={(e) => setSelectedSubject(e.target.value)}
                  className="input-field"
                >
                  <option value="">All Subjects</option>
                  {subjects.map(subject => (
                    <option key={subject.id} value={subject.name}>{subject.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Results Table */}
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Test Results</h3>
              
              {loading ? (
                <div className="flex items-center justify-center h-32">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="table-header">Student</th>
                        <th className="table-header">Subject</th>
                        <th className="table-header">Test</th>
                        <th className="table-header">Date</th>
                        <th className="table-header">Marks</th>
                        <th className="table-header">Percentage</th>
                        <th className="table-header">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredResults.map((result) => {
                        const percentage = (result.marks_obtained / result.total_marks) * 100;
                        return (
                          <tr key={result.id}>
                            <td className="table-cell">
                              <div>
                                <div className="text-sm font-medium text-gray-900">
                                  {result.student_name}
                                </div>
                                <div className="text-sm text-gray-500">
                                  {result.grade}-{result.section}
                                </div>
                              </div>
                            </td>
                            <td className="table-cell">{result.subject_name}</td>
                            <td className="table-cell">{result.test_name}</td>
                            <td className="table-cell">{new Date(result.test_date).toLocaleDateString()}</td>
                            <td className="table-cell">
                              {result.marks_obtained}/{result.total_marks}
                            </td>
                            <td className="table-cell">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPerformanceColor(percentage)}`}>
                                {getPerformanceIcon(percentage)}
                                <span className="ml-1">{percentage.toFixed(1)}%</span>
                              </span>
                            </td>
                            <td className="table-cell">
                              <div className="flex space-x-2">
                                <button
                                  onClick={() => editResult(result)}
                                  className="text-blue-600 hover:text-blue-900 text-sm font-medium"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => result.id && deleteResult(result.id)}
                                  className="text-red-600 hover:text-red-900 text-sm font-medium"
                                >
                                  Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  
                  {filteredResults.length === 0 && (
                    <div className="text-center py-8">
                      <BookOpen className="mx-auto h-12 w-12 text-gray-400" />
                      <h3 className="mt-2 text-sm font-medium text-gray-900">No results found</h3>
                      <p className="mt-1 text-sm text-gray-500">
                        Try adjusting your search or filter criteria.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Results; 