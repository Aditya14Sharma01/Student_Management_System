import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Users, Plus, Search, Edit, Trash2, Eye, Filter, XCircle } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';

interface Student {
  id: number;
  first_name: string;
  last_name: string;
  grade: string;
  section: string;
  parent_contact?: string;
  address?: string;
  admission_date?: string;
  email?: string;
}

const Students: React.FC = () => {
  const { user, isAdmin, isTeacher } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGrade, setSelectedGrade] = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);

  // Form state
  const [formData, setFormData] = useState<Student>({
    id: 0,
    first_name: '',
    last_name: '',
    grade: '',
    section: '',
    parent_contact: '',
    address: '',
    admission_date: new Date().toISOString().split('T')[0],
    email: ''
  });

  const grades = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];
  const sections = ['A', 'B', 'C', 'D'];

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      // In a real app, you'd fetch from API
      const mockStudents: Student[] = [
        {
          id: 1,
          first_name: 'John',
          last_name: 'Doe',
          grade: '10',
          section: 'A',
          parent_contact: '+91 98765 43210',
          address: '123 Main St, City',
          admission_date: '2023-06-01',
          email: 'john.doe@email.com'
        },
        {
          id: 2,
          first_name: 'Jane',
          last_name: 'Smith',
          grade: '10',
          section: 'A',
          parent_contact: '+91 98765 43211',
          address: '456 Oak Ave, City',
          admission_date: '2023-06-01',
          email: 'jane.smith@email.com'
        },
        {
          id: 3,
          first_name: 'Mike',
          last_name: 'Johnson',
          grade: '10',
          section: 'A',
          parent_contact: '+91 98765 43212',
          address: '789 Pine Rd, City',
          admission_date: '2023-06-01',
          email: 'mike.johnson@email.com'
        },
        {
          id: 4,
          first_name: 'Sarah',
          last_name: 'Williams',
          grade: '10',
          section: 'A',
          parent_contact: '+91 98765 43213',
          address: '321 Elm St, City',
          admission_date: '2023-06-01',
          email: 'sarah.williams@email.com'
        },
        {
          id: 5,
          first_name: 'David',
          last_name: 'Brown',
          grade: '10',
          section: 'A',
          parent_contact: '+91 98765 43214',
          address: '654 Maple Dr, City',
          admission_date: '2023-06-01',
          email: 'david.brown@email.com'
        }
      ];
      setStudents(mockStudents);
    } catch (error) {
      toast.error('Error fetching students');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.first_name || !formData.last_name || !formData.grade || !formData.section) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      setLoading(true);
      
      if (editingStudent) {
        // Update existing student
        await axios.put(`/api/students/${editingStudent.id}`, formData);
        toast.success('Student updated successfully');
      } else {
        // Create new student
        await axios.post('/api/students', formData);
        toast.success('Student added successfully');
      }
      
      setShowAddForm(false);
      setEditingStudent(null);
      setFormData({
        id: 0,
        first_name: '',
        last_name: '',
        grade: '',
        section: '',
        parent_contact: '',
        address: '',
        admission_date: new Date().toISOString().split('T')[0],
        email: ''
      });
      fetchStudents();
    } catch (error) {
      toast.error('Error saving student');
    } finally {
      setLoading(false);
    }
  };

  const editStudent = (student: Student) => {
    setEditingStudent(student);
    setFormData(student);
    setShowAddForm(true);
  };

  const deleteStudent = async (id: number) => {
    if (!confirm('Are you sure you want to delete this student?')) return;
    
    try {
      await axios.delete(`/api/students/${id}`);
      toast.success('Student deleted successfully');
      fetchStudents();
    } catch (error) {
      toast.error('Error deleting student');
    }
  };

  const filteredStudents = students.filter(student => {
    const matchesSearch = student.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         student.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         student.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesGrade = !selectedGrade || student.grade === selectedGrade;
    const matchesSection = !selectedSection || student.section === selectedSection;
    
    return matchesSearch && matchesGrade && matchesSection;
  });

  const resetForm = () => {
    setFormData({
      id: 0,
      first_name: '',
      last_name: '',
      grade: '',
      section: '',
      parent_contact: '',
      address: '',
      admission_date: new Date().toISOString().split('T')[0],
      email: ''
    });
    setEditingStudent(null);
    setShowAddForm(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Student Management</h1>
          <p className="text-gray-600">Manage student information and records</p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Add Student
        </button>
      </div>

      {/* Student Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white shadow rounded-lg p-4">
          <div className="flex items-center">
            <Users className="h-8 w-8 text-blue-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Total Students</p>
              <p className="text-2xl font-bold text-gray-900">{students.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white shadow rounded-lg p-4">
          <div className="flex items-center">
            <Users className="h-8 w-8 text-green-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Grade 10</p>
              <p className="text-2xl font-bold text-green-900">
                {students.filter(s => s.grade === '10').length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white shadow rounded-lg p-4">
          <div className="flex items-center">
            <Users className="h-8 w-8 text-yellow-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Section A</p>
              <p className="text-2xl font-bold text-yellow-900">
                {students.filter(s => s.section === 'A').length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white shadow rounded-lg p-4">
          <div className="flex items-center">
            <Users className="h-8 w-8 text-purple-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">New This Month</p>
              <p className="text-2xl font-bold text-purple-900">
                {students.filter(s => {
                  const admissionDate = new Date(s.admission_date || '');
                  const currentDate = new Date();
                  return admissionDate.getMonth() === currentDate.getMonth() &&
                         admissionDate.getFullYear() === currentDate.getFullYear();
                }).length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Add/Edit Student Form */}
      {showAddForm && (
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-900">
              {editingStudent ? 'Edit Student' : 'Add New Student'}
            </h3>
            <button
              onClick={resetForm}
              className="text-gray-400 hover:text-gray-600"
            >
              <XCircle className="h-6 w-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">First Name *</label>
                <input
                  type="text"
                  name="first_name"
                  value={formData.first_name}
                  onChange={handleInputChange}
                  className="input-field"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Last Name *</label>
                <input
                  type="text"
                  name="last_name"
                  value={formData.last_name}
                  onChange={handleInputChange}
                  className="input-field"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Grade *</label>
                <select
                  name="grade"
                  value={formData.grade}
                  onChange={handleInputChange}
                  className="input-field"
                  required
                >
                  <option value="">Select Grade</option>
                  {grades.map(grade => (
                    <option key={grade} value={grade}>{grade}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Section *</label>
                <select
                  name="section"
                  value={formData.section}
                  onChange={handleInputChange}
                  className="input-field"
                  required
                >
                  <option value="">Select Section</option>
                  {sections.map(section => (
                    <option key={section} value={section}>{section}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="input-field"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Parent Contact</label>
                <input
                  type="tel"
                  name="parent_contact"
                  value={formData.parent_contact}
                  onChange={handleInputChange}
                  className="input-field"
                  placeholder="+91 98765 43210"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Admission Date</label>
                <input
                  type="date"
                  name="admission_date"
                  value={formData.admission_date}
                  onChange={handleInputChange}
                  className="input-field"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
                <textarea
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  rows={3}
                  className="input-field"
                  placeholder="Enter full address"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={resetForm}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="btn-primary"
              >
                {loading ? 'Saving...' : (editingStudent ? 'Update Student' : 'Add Student')}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filters and Search */}
      <div className="bg-white shadow rounded-lg p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name or email..."
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

          <div className="flex items-end">
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedGrade('');
                setSelectedSection('');
              }}
              className="btn-secondary w-full"
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* Students Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Student List</h3>
          
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
                    <th className="table-header">Grade & Section</th>
                    <th className="table-header">Contact Info</th>
                    <th className="table-header">Admission Date</th>
                    <th className="table-header">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredStudents.map((student) => (
                    <tr key={student.id}>
                      <td className="table-cell">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {student.first_name} {student.last_name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {student.email}
                          </div>
                        </div>
                      </td>
                      <td className="table-cell">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {student.grade}-{student.section}
                        </span>
                      </td>
                      <td className="table-cell">
                        <div className="text-sm text-gray-900">
                          <div>{student.parent_contact || '-'}</div>
                          <div className="text-gray-500">{student.address || '-'}</div>
                        </div>
                      </td>
                      <td className="table-cell">
                        {student.admission_date ? new Date(student.admission_date).toLocaleDateString() : '-'}
                      </td>
                      <td className="table-cell">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => editStudent(student)}
                            className="text-blue-600 hover:text-blue-900 text-sm font-medium"
                          >
                            <Edit className="h-4 w-4 inline mr-1" />
                            Edit
                          </button>
                          <button
                            onClick={() => deleteStudent(student.id)}
                            className="text-red-600 hover:text-red-900 text-sm font-medium"
                          >
                            <Trash2 className="h-4 w-4 inline mr-1" />
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              {filteredStudents.length === 0 && (
                <div className="text-center py-8">
                  <Users className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No students found</h3>
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
  );
};

export default Students; 