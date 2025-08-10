import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { DollarSign, Plus, Search, CheckCircle, Clock, AlertTriangle, Filter, XCircle } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';

interface FeeRecord {
  id?: number;
  student_id: number;
  fee_type: string;
  amount: number;
  due_date: string;
  status: 'paid' | 'pending' | 'overdue';
  payment_date?: string;
  payment_method?: string;
  student_name?: string;
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

const Fees: React.FC = () => {
  const { user, isAdmin, isTeacher } = useAuth();
  const [activeTab, setActiveTab] = useState<'record' | 'view'>('record');
  const [showRecordForm, setShowRecordForm] = useState(false);
  const [fees, setFees] = useState<FeeRecord[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGrade, setSelectedGrade] = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedFeeType, setSelectedFeeType] = useState('');

  // Form state
  const [formData, setFormData] = useState<FeeRecord>({
    student_id: 0,
    fee_type: '',
    amount: 0,
    due_date: new Date().toISOString().split('T')[0],
    status: 'pending'
  });

  const grades = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];
  const sections = ['A', 'B', 'C', 'D'];
  const feeTypes = ['Tuition Fee', 'Library Fee', 'Laboratory Fee', 'Transport Fee', 'Examination Fee', 'Other'];
  const paymentMethods = ['Cash', 'Bank Transfer', 'Credit Card', 'Debit Card', 'Check', 'Online Payment'];

  useEffect(() => {
    fetchStudents();
    fetchFees();
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

  const fetchFees = async () => {
    try {
      setLoading(true);
      // In a real app, you'd fetch from API
      const mockFees: FeeRecord[] = [
        {
          id: 1,
          student_id: 1,
          fee_type: 'Tuition Fee',
          amount: 5000,
          due_date: '2024-01-31',
          status: 'paid',
          payment_date: '2024-01-15',
          payment_method: 'Bank Transfer',
          student_name: 'John Doe',
          grade: '10',
          section: 'A'
        },
        {
          id: 2,
          student_id: 2,
          fee_type: 'Tuition Fee',
          amount: 5000,
          due_date: '2024-01-31',
          status: 'pending',
          student_name: 'Jane Smith',
          grade: '10',
          section: 'A'
        },
        {
          id: 3,
          student_id: 3,
          fee_type: 'Library Fee',
          amount: 500,
          due_date: '2024-01-15',
          status: 'overdue',
          student_name: 'Mike Johnson',
          grade: '10',
          section: 'A'
        }
      ];
      setFees(mockFees);
    } catch (error) {
      toast.error('Error fetching fees');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'amount' ? parseFloat(value) || 0 : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.student_id || !formData.fee_type || !formData.amount || !formData.due_date) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (formData.amount <= 0) {
      toast.error('Amount must be greater than 0');
      return;
    }

    try {
      setLoading(true);
      
      if (formData.id) {
        // Update existing fee record
        await axios.put(`/api/fees/${formData.id}`, formData);
        toast.success('Fee record updated successfully');
      } else {
        // Create new fee record
        await axios.post('/api/fees', formData);
        toast.success('Fee record created successfully');
      }
      
      setShowRecordForm(false);
      setFormData({
        student_id: 0,
        fee_type: '',
        amount: 0,
        due_date: new Date().toISOString().split('T')[0],
        status: 'pending'
      });
      fetchFees();
    } catch (error) {
      toast.error('Error saving fee record');
    } finally {
      setLoading(false);
    }
  };

  const updateFeeStatus = async (feeId: number, status: 'paid' | 'pending' | 'overdue', paymentDate?: string, paymentMethod?: string) => {
    try {
      const updateData: any = { status };
      if (status === 'paid') {
        updateData.payment_date = paymentDate || new Date().toISOString().split('T')[0];
        updateData.payment_method = paymentMethod || 'Cash';
      }

      await axios.put(`/api/fees/${feeId}`, updateData);
      toast.success('Fee status updated successfully');
      fetchFees();
    } catch (error) {
      toast.error('Error updating fee status');
    }
  };

  const deleteFee = async (id: number) => {
    if (!confirm('Are you sure you want to delete this fee record?')) return;
    
    try {
      await axios.delete(`/api/fees/${id}`);
      toast.success('Fee record deleted successfully');
      fetchFees();
    } catch (error) {
      toast.error('Error deleting fee record');
    }
  };

  const filteredFees = fees.filter(fee => {
    const matchesSearch = fee.student_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         fee.fee_type.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesGrade = !selectedGrade || fee.grade === selectedGrade;
    const matchesSection = !selectedSection || fee.section === selectedSection;
    const matchesStatus = !selectedStatus || fee.status === selectedStatus;
    const matchesFeeType = !selectedFeeType || fee.fee_type === selectedFeeType;
    
    return matchesSearch && matchesGrade && matchesSection && matchesStatus && matchesFeeType;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'text-green-600 bg-green-100';
      case 'pending': return 'text-yellow-600 bg-yellow-100';
      case 'overdue': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid': return <CheckCircle className="h-4 w-4" />;
      case 'pending': return <Clock className="h-4 w-4" />;
      case 'overdue': return <AlertTriangle className="h-4 w-4" />;
      default: return null;
    }
  };

  // Calculate summary statistics
  const totalFees = fees.length;
  const totalAmount = fees.reduce((sum, f) => sum + f.amount, 0);
  const paidAmount = fees.filter(f => f.status === 'paid').reduce((sum, f) => sum + f.amount, 0);
  const pendingAmount = fees.filter(f => f.status === 'pending').reduce((sum, f) => sum + f.amount, 0);
  const overdueAmount = fees.filter(f => f.status === 'overdue').reduce((sum, f) => sum + f.amount, 0);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Fee Management</h1>
          <p className="text-gray-600">Record and manage student fee payments</p>
        </div>
        <button
          onClick={() => setShowRecordForm(true)}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Record Fee
        </button>
      </div>

      {/* Fee Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white shadow rounded-lg p-4">
          <div className="flex items-center">
            <DollarSign className="h-8 w-8 text-blue-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Total Fees</p>
              <p className="text-2xl font-bold text-gray-900">{totalFees}</p>
            </div>
          </div>
        </div>
        <div className="bg-white shadow rounded-lg p-4">
          <div className="flex items-center">
            <CheckCircle className="h-8 w-8 text-green-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Paid Amount</p>
              <p className="text-2xl font-bold text-green-900">₹{paidAmount.toLocaleString()}</p>
            </div>
          </div>
        </div>
        <div className="bg-white shadow rounded-lg p-4">
          <div className="flex items-center">
            <Clock className="h-8 w-8 text-yellow-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Pending Amount</p>
              <p className="text-2xl font-bold text-yellow-900">₹{pendingAmount.toLocaleString()}</p>
            </div>
          </div>
        </div>
        <div className="bg-white shadow rounded-lg p-4">
          <div className="flex items-center">
            <AlertTriangle className="h-8 w-8 text-red-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Overdue Amount</p>
              <p className="text-2xl font-bold text-red-900">₹{overdueAmount.toLocaleString()}</p>
            </div>
          </div>
        </div>
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
            Record Fees
          </button>
          <button
            onClick={() => setActiveTab('view')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'view'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <DollarSign className="inline h-4 w-4 mr-2" />
            View Fees
          </button>
        </nav>
      </div>

      {/* Record Fees Form */}
      {activeTab === 'record' && showRecordForm && (
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-900">
              {formData.id ? 'Edit Fee Record' : 'Record New Fee'}
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
                <label className="block text-sm font-medium text-gray-700 mb-2">Fee Type</label>
                <select
                  name="fee_type"
                  value={formData.fee_type}
                  onChange={handleInputChange}
                  className="input-field"
                  required
                >
                  <option value="">Select Fee Type</option>
                  {feeTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Amount (₹)</label>
                <input
                  type="number"
                  name="amount"
                  value={formData.amount}
                  onChange={handleInputChange}
                  className="input-field"
                  min="0"
                  step="0.01"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Due Date</label>
                <input
                  type="date"
                  name="due_date"
                  value={formData.due_date}
                  onChange={handleInputChange}
                  className="input-field"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleInputChange}
                  className="input-field"
                  required
                >
                  <option value="pending">Pending</option>
                  <option value="paid">Paid</option>
                  <option value="overdue">Overdue</option>
                </select>
              </div>

              {formData.status === 'paid' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Payment Method</label>
                  <select
                    name="payment_method"
                    value={formData.payment_method || ''}
                    onChange={handleInputChange}
                    className="input-field"
                  >
                    <option value="">Select Payment Method</option>
                    {paymentMethods.map(method => (
                      <option key={method} value={method}>{method}</option>
                    ))}
                  </select>
                </div>
              )}
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
                {loading ? 'Saving...' : (formData.id ? 'Update Fee' : 'Record Fee')}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* View Fees */}
      {activeTab === 'view' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="bg-white shadow rounded-lg p-4">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by name or fee type..."
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
                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="input-field"
                >
                  <option value="">All Status</option>
                  <option value="paid">Paid</option>
                  <option value="pending">Pending</option>
                  <option value="overdue">Overdue</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Fee Type</label>
                <select
                  value={selectedFeeType}
                  onChange={(e) => setSelectedFeeType(e.target.value)}
                  className="input-field"
                >
                  <option value="">All Types</option>
                  {feeTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Fees Table */}
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Fee Records</h3>
              
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
                        <th className="table-header">Fee Type</th>
                        <th className="table-header">Amount</th>
                        <th className="table-header">Due Date</th>
                        <th className="table-header">Status</th>
                        <th className="table-header">Payment Details</th>
                        <th className="table-header">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredFees.map((fee) => (
                        <tr key={fee.id}>
                          <td className="table-cell">
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {fee.student_name}
                              </div>
                              <div className="text-sm text-gray-500">
                                {fee.grade}-{fee.section}
                              </div>
                            </div>
                          </td>
                          <td className="table-cell">{fee.fee_type}</td>
                          <td className="table-cell">₹{fee.amount.toLocaleString()}</td>
                          <td className="table-cell">
                            <span className={new Date(fee.due_date) < new Date() && fee.status !== 'paid' ? 'text-red-600' : ''}>
                              {new Date(fee.due_date).toLocaleDateString()}
                            </span>
                          </td>
                          <td className="table-cell">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(fee.status)}`}>
                              {getStatusIcon(fee.status)}
                              <span className="ml-1">{fee.status.charAt(0).toUpperCase() + fee.status.slice(1)}</span>
                            </span>
                          </td>
                          <td className="table-cell">
                            {fee.status === 'paid' ? (
                              <div className="text-sm text-gray-900">
                                <div>{fee.payment_date && new Date(fee.payment_date).toLocaleDateString()}</div>
                                <div className="text-gray-500">{fee.payment_method}</div>
                              </div>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className="table-cell">
                            <div className="flex space-x-2">
                              {fee.status !== 'paid' && (
                                <button
                                  onClick={() => updateFeeStatus(fee.id!, 'paid')}
                                  className="text-green-600 hover:text-green-900 text-sm font-medium"
                                >
                                  Mark Paid
                                </button>
                              )}
                              <button
                                onClick={() => deleteFee(fee.id!)}
                                className="text-red-600 hover:text-red-900 text-sm font-medium"
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  
                  {filteredFees.length === 0 && (
                    <div className="text-center py-8">
                      <DollarSign className="mx-auto h-12 w-12 text-gray-400" />
                      <h3 className="mt-2 text-sm font-medium text-gray-900">No fee records found</h3>
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

export default Fees; 