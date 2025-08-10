import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Users, Plus, Search, Edit, Trash2, Filter, XCircle, GraduationCap, Mail, Phone } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';

interface Teacher {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  subject: string;
  qualification: string;
  joining_date: string;
  status: 'active' | 'inactive';
}

const Teachers: React.FC = () => {
  const { user, isAdmin, isTeacher } = useAuth();
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);

  // Form state
  const [formData, setFormData] = useState<Teacher>({
    id: 0,
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    subject: '',
    qualification: '',
    joining_date: new Date().toISOString().split('T')[0],
    status: 'active'
  });

  const subjects = [
    'Mathematics', 'Science', 'English', 'History', 'Geography',
    'Physics', 'Chemistry', 'Biology', 'Computer Science', 'Physical Education',
    'Art', 'Music', 'Economics', 'Commerce', 'Literature'
  ];

  const qualifications = [
    'B.Ed', 'M.Ed', 'B.Sc', 'M.Sc', 'B.A', 'M.A',
    'Ph.D', 'Diploma', 'Certificate Course'
  ];

  useEffect(() => {
    fetchTeachers();
  }, []);

  const fetchTeachers = async () => {
    try {
      setLoading(true);
      // In a real app, you'd fetch from API
      const mockTeachers: Teacher[] = [
        {
          id: 1,
          first_name: 'Dr. Sarah',
          last_name: 'Johnson',
          email: 'sarah.johnson@school.com',
          phone: '+91 98765 43210',
          subject: 'Mathematics',
          qualification: 'Ph.D',
          joining_date: '2020-06-01',
          status: 'active'
        },
        {
          id: 2,
          first_name: 'Prof. Michael',
          last_name: 'Chen',
          email: 'michael.chen@school.com',
          phone: '+91 98765 43211',
          subject: 'Physics',
          qualification: 'M.Sc',
          joining_date: '2019-08-15',
          status: 'active'
        },
        {
          id: 3,
          first_name: 'Ms. Emily',
          last_name: 'Davis',
          email: 'emily.davis@school.com',
          phone: '+91 98765 43212',
          subject: 'English',
          qualification: 'M.A',
          joining_date: '2021-03-10',
          status: 'active'
        },
        {
          id: 4,
          first_name: 'Mr. Robert',
          last_name: 'Wilson',
          email: 'robert.wilson@school.com',
          phone: '+91 98765 43213',
          subject: 'History',
          qualification: 'B.A',
          joining_date: '2018-09-01',
          status: 'active'
        },
        {
          id: 5,
          first_name: 'Dr. Lisa',
          last_name: 'Brown',
          email: 'lisa.brown@school.com',
          phone: '+91 98765 43214',
          subject: 'Biology',
          qualification: 'Ph.D',
          joining_date: '2020-01-15',
          status: 'inactive'
        }
      ];
      setTeachers(mockTeachers);
    } catch (error) {
      toast.error('Error fetching teachers');
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
    
    if (!formData.first_name || !formData.last_name || !formData.email || !formData.subject) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      setLoading(true);
      
      if (editingTeacher) {
        // Update existing teacher
        await axios.put(`/api/teachers/${editingTeacher.id}`, formData);
        toast.success('Teacher updated successfully');
      } else {
        // Create new teacher
        await axios.post('/api/teachers', formData);
        toast.success('Teacher added successfully');
      }
      
      setShowAddForm(false);
      setEditingTeacher(null);
      setFormData({
        id: 0,
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        subject: '',
        qualification: '',
        joining_date: new Date().toISOString().split('T')[0],
        status: 'active'
      });
      fetchTeachers();
    } catch (error) {
      toast.error('Error saving teacher');
    } finally {
      setLoading(false);
    }
  };

  const editTeacher = (teacher: Teacher) => {
    setEditingTeacher(teacher);
    setFormData(teacher);
    setShowAddForm(true);
  };

  const deleteTeacher = async (id: number) => {
    if (!confirm('Are you sure you want to delete this teacher?')) return;
    
    try {
      await axios.delete(`/api/teachers/${id}`);
      toast.success('Teacher deleted successfully');
      fetchTeachers();
    } catch (error) {
      toast.error('Error deleting teacher');
    }
  };

  const filteredTeachers = teachers.filter(teacher => {
    const matchesSearch = teacher.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         teacher.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         teacher.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSubject = !selectedSubject || teacher.subject === selectedSubject;
    const matchesStatus = !selectedStatus || teacher.status === selectedStatus;
    
    return matchesSearch && matchesSubject && matchesStatus;
  });

  const resetForm = () => {
    setFormData({
      id: 0,
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      subject: '',
      qualification: '',
      joining_date: new Date().toISOString().split('T')[0],
      status: 'active'
    });
    setEditingTeacher(null);
    setShowAddForm(false);
  };

  // Calculate summary statistics
  const totalTeachers = teachers.length;
  const activeTeachers = teachers.filter(t => t.status === 'active').length;
  const inactiveTeachers = teachers.filter(t => t.status === 'inactive').length;
  const subjectCounts = subjects.reduce((acc, subject) => {
    acc[subject] = teachers.filter(t => t.subject === subject).length;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Teacher Management</h1>
          <p className="text-gray-600">Manage teacher information and records</p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Add Teacher
        </button>
      </div>

      {/* Teacher Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white shadow rounded-lg p-4">
          <div className="flex items-center">
            <Users className="h-8 w-8 text-blue-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Total Teachers</p>
              <p className="text-2xl font-bold text-gray-900">{totalTeachers}</p>
            </div>
          </div>
        </div>
        <div className="bg-white shadow rounded-lg p-4">
          <div className="flex items-center">
            <GraduationCap className="h-8 w-8 text-green-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Active Teachers</p>
              <p className="text-2xl font-bold text-green-900">{activeTeachers}</p>
            </div>
          </div>
        </div>
        <div className="bg-white shadow rounded-lg p-4">
          <div className="flex items-center">
            <Users className="h-8 w-8 text-yellow-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Inactive Teachers</p>
              <p className="text-2xl font-bold text-yellow-900">{inactiveTeachers}</p>
            </div>
          </div>
        </div>
        <div className="bg-white shadow rounded-lg p-4">
          <div className="flex items-center">
            <GraduationCap className="h-8 w-8 text-purple-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Subjects Covered</p>
              <p className="text-2xl font-bold text-purple-900">
                {Object.values(subjectCounts).filter(count => count > 0).length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Add/Edit Teacher Form */}
      {showAddForm && (
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-900">
              {editingTeacher ? 'Edit Teacher' : 'Add New Teacher'}
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
                <label className="block text-sm font-medium text-gray-700 mb-2">Email *</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="input-field"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  className="input-field"
                  placeholder="+91 98765 43210"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Subject *</label>
                <select
                  name="subject"
                  value={formData.subject}
                  onChange={handleInputChange}
                  className="input-field"
                  required
                >
                  <option value="">Select Subject</option>
                  {subjects.map(subject => (
                    <option key={subject} value={subject}>{subject}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Qualification</label>
                <select
                  name="qualification"
                  value={formData.qualification}
                  onChange={handleInputChange}
                  className="input-field"
                >
                  <option value="">Select Qualification</option>
                  {qualifications.map(qual => (
                    <option key={qual} value={qual}>{qual}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Joining Date</label>
                <input
                  type="date"
                  name="joining_date"
                  value={formData.joining_date}
                  onChange={handleInputChange}
                  className="input-field"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleInputChange}
                  className="input-field"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
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
                {loading ? 'Saving...' : (editingTeacher ? 'Update Teacher' : 'Add Teacher')}
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
            <label className="block text-sm font-medium text-gray-700 mb-2">Subject</label>
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="input-field"
            >
              <option value="">All Subjects</option>
              {subjects.map(subject => (
                <option key={subject} value={subject}>{subject}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="input-field"
            >
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedSubject('');
                setSelectedStatus('');
              }}
              className="btn-secondary w-full"
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* Teachers Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Teacher List</h3>
          
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="table-header">Teacher</th>
                    <th className="table-header">Subject</th>
                    <th className="table-header">Contact Info</th>
                    <th className="table-header">Qualification</th>
                    <th className="table-header">Joining Date</th>
                    <th className="table-header">Status</th>
                    <th className="table-header">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredTeachers.map((teacher) => (
                    <tr key={teacher.id}>
                      <td className="table-cell">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {teacher.first_name} {teacher.last_name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {teacher.email}
                          </div>
                        </div>
                      </td>
                      <td className="table-cell">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {teacher.subject}
                        </span>
                      </td>
                      <td className="table-cell">
                        <div className="text-sm text-gray-900">
                          <div className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {teacher.phone || '-'}
                          </div>
                          <div className="flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {teacher.email}
                          </div>
                        </div>
                      </td>
                      <td className="table-cell">
                        <span className="text-sm text-gray-900">
                          {teacher.qualification || '-'}
                        </span>
                      </td>
                      <td className="table-cell">
                        {teacher.joining_date ? new Date(teacher.joining_date).toLocaleDateString() : '-'}
                      </td>
                      <td className="table-cell">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          teacher.status === 'active' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {teacher.status.charAt(0).toUpperCase() + teacher.status.slice(1)}
                        </span>
                      </td>
                      <td className="table-cell">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => editTeacher(teacher)}
                            className="text-blue-600 hover:text-blue-900 text-sm font-medium"
                          >
                            <Edit className="h-4 w-4 inline mr-1" />
                            Edit
                          </button>
                          <button
                            onClick={() => deleteTeacher(teacher.id)}
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
              
              {filteredTeachers.length === 0 && (
                <div className="text-center py-8">
                  <Users className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No teachers found</h3>
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

export default Teachers; 