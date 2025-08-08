import React, { useState, useEffect } from 'react';
import { Search, Filter, Bell, User, FileText, Clock, CheckCircle, AlertCircle, Send, Upload, Plus, Calendar } from 'lucide-react';
import { format, isSameDay } from 'date-fns';
// Import the header component
import LabHeader from './header';


const LabTechnicianDashboard = () => {
  // Date management states
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  
  const [activeTab, setActiveTab] = useState('pending');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showResultEntry, setShowResultEntry] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Mock data
  const [labOrders, setLabOrders] = useState([
    {
      id: 'LO-001',
      patientName: 'John Smith',
      patientId: 'P-12345',
      age: 45,
      gender: 'Male',
      orderDate: '2025-06-28',
      orderTime: '10:00',
      priority: 'urgent',
      status: 'not-received',
      tests: [
        { id: 'T-001', name: 'Complete Blood Count', type: 'CBC', unit: 'cells/μL', normalRange: '4.5-11.0' },
        { id: 'T-002', name: 'Blood Glucose', type: 'GLU', unit: 'mg/dL', normalRange: '70-100' }
      ],
      physician: 'Dr. Johnson',
      notes: 'Patient fasting for 12 hours',
      description: 'Routine blood work for annual checkup'
    },
    {
      id: 'LO-002',
      patientName: 'Sarah Davis',
      patientId: 'P-12346',
      age: 32,
      gender: 'Female',
      orderDate: '2025-06-28',
      orderTime: '10:30',
      priority: 'routine',
      status: 'received',
      tests: [
        { id: 'T-003', name: 'Lipid Panel', type: 'LIPID', unit: 'mg/dL', normalRange: 'Various' }
      ],
      physician: 'Dr. Wilson',
      notes: '',
      description: 'Cholesterol screening'
    },
    {
      id: 'LO-003',
      patientName: 'Mike Johnson',
      patientId: 'P-12347',
      age: 28,
      gender: 'Male',
      orderDate: '2025-06-28',
      orderTime: '11:00',
      priority: 'routine',
      status: 'pending',
      tests: [
        { id: 'T-004', name: 'Hemoglobin A1C', type: 'HBA1C', unit: '%', normalRange: '<5.7' }
      ],
      physician: 'Dr. Brown',
      notes: 'Diabetes monitoring',
      description: 'Diabetes follow-up testing'
    },
    {
      id: 'LO-004',
      patientName: 'Emma Wilson',
      patientId: 'P-12348',
      age: 35,
      gender: 'Female',
      orderDate: '2025-06-28',
      orderTime: '14:00',
      priority: 'routine',
      status: 'ready',
      tests: [
        { id: 'T-005', name: 'Thyroid Panel', type: 'TSH', unit: 'mIU/L', normalRange: '0.4-4.0' }
      ],
      physician: 'Dr. Smith',
      notes: 'Thyroid function check',
      description: 'Annual thyroid screening'
    },
    {
      id: 'LO-005',
      patientName: 'David Brown',
      patientId: 'P-12349',
      age: 42,
      gender: 'Male',
      orderDate: '2025-06-27',
      orderTime: '09:00',
      priority: 'routine',
      status: 'sent',
      tests: [
        { id: 'T-006', name: 'Liver Function Tests', type: 'LFT', unit: 'U/L', normalRange: 'Various' }
      ],
      physician: 'Dr. Davis',
      notes: 'Follow-up liver function',
      description: 'Post-medication liver monitoring'
    }
  ]);

  const [results, setResults] = useState({});

  const getStatusColor = (status) => {
    switch (status) {
      case 'not-received': return 'bg-red-50 text-red-700 border border-red-200';
      case 'received': return 'bg-blue-50 text-blue-700 border border-blue-200';
      case 'pending': return 'bg-yellow-50 text-yellow-700 border border-yellow-200';
      case 'ready': return 'bg-purple-50 text-purple-700 border border-purple-200';
      case 'sent': return 'bg-green-50 text-green-700 border border-green-200';
      default: return 'bg-gray-50 text-gray-700 border border-gray-200';
    }
  };

  const getStatusDisplayName = (status) => {
    switch (status) {
      case 'not-received': return 'Not Received';
      case 'received': return 'Received';
      case 'pending': return 'Pending';
      case 'ready': return 'Ready';
      case 'sent': return 'Sent';
      default: return status;
    }
  };

  const getNextStatusAction = (status) => {
    switch (status) {
      case 'not-received': return { action: 'Mark as Received', nextStatus: 'received', color: 'bg-blue-500' };
      case 'received': return { action: 'Start Processing', nextStatus: 'pending', color: 'bg-yellow-500' };
      case 'pending': return { action: 'Mark as Ready', nextStatus: 'ready', color: 'bg-purple-500' };
      case 'ready': return { action: 'Send Results', nextStatus: 'sent', color: 'bg-green-500' };
      case 'sent': return null;
      default: return null;
    }
  };

  const filteredOrders = labOrders.filter(order => {
    const matchesTab = activeTab === 'all' || order.status === activeTab;
    const matchesSearch = order.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         order.patientId.includes(searchTerm) ||
                         order.id.includes(searchTerm);
    return matchesTab && matchesSearch;
  });

  const handleResultChange = (testId, field, value) => {
    setResults(prev => ({
      ...prev,
      [testId]: {
        ...prev[testId],
        [field]: value
      }
    }));
  };

  const handleSubmitResults = (orderId) => {
    setLabOrders(prev => prev.map(order => 
      order.id === orderId 
        ? { ...order, status: 'sent' }
        : order
    ));
    setShowResultEntry(false);
    setSelectedOrder(null);
  };

  // Handle date selection
  const handleDateClick = (day) => {
    setSelectedDate(day);
  };

  // Handle month change
  const handleMonthChange = (newDate) => {
    setCurrentDate(newDate);
  };

  const updateOrderStatus = (orderId, newStatus) => {
    setLabOrders(prev => prev.map(order => 
      order.id === orderId 
        ? { ...order, status: newStatus }
        : order
    ));
    // Update selectedOrder if it's the same order
    if (selectedOrder && selectedOrder.id === orderId) {
      setSelectedOrder(prev => ({ ...prev, status: newStatus }));
    }
  };

  // Get orders for selected date
  const getOrdersForDate = (date) => {
    return labOrders.filter(order => 
      isSameDay(new Date(order.orderDate), date)
    );
  };

  const OrderCard = ({ order }) => (
    <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 hover:shadow-md transition-all duration-200">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-4">
          <div className="bg-teal-100 text-teal-800 px-3 py-1 rounded-lg text-sm font-medium min-w-[70px] text-center">
            {order.orderTime}
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 text-lg">{order.patientName}</h3>
            <p className="text-gray-600 text-sm">{order.description}</p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <span className="text-gray-500 text-sm">Provider: {order.physician}</span>
          <button 
            onClick={() => setSelectedOrder(order)}
            className="bg-teal-500 hover:bg-teal-600 text-white px-4 py-2 rounded-lg transition-colors"
          >
            View
          </button>
        </div>
      </div>
      
      <div className="flex items-center justify-between">
        <div className="flex space-x-4">
          <span className={`px-3 py-1 rounded-lg text-sm ${getStatusColor(order.status)}`}>
            {getStatusDisplayName(order.status)}
          </span>
          {order.priority === 'urgent' && (
            <span className="bg-red-100 text-red-700 px-3 py-1 rounded-lg text-sm border border-red-200">
              Urgent
            </span>
          )}
        </div>
        <div className="text-sm text-gray-500">
          Order: {order.id} • {order.tests.length} test{order.tests.length > 1 ? 's' : ''}
        </div>
      </div>
    </div>
  );

  const QuickActionsCard = () => (
    <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
      <h3 className="font-semibold text-gray-900 mb-4 border-l-4 border-teal-500 pl-3">Quick Actions</h3>
      <div className="space-y-3">
        <button className="w-full bg-teal-500 hover:bg-teal-600 text-white py-3 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2">
          <Plus className="w-4 h-4" />
          <span>New Lab Order</span>
        </button>
        <button className="w-full border border-teal-500 text-teal-700 py-3 px-4 rounded-lg hover:bg-teal-50 transition-colors flex items-center justify-center space-x-2">
          <FileText className="w-4 h-4" />
          <span>Not Received</span>
          <span className="bg-red-500 text-white text-xs rounded-full px-2 py-1 ml-2">
            {labOrders.filter(o => o.status === 'not-received').length}
          </span>
        </button>
        <button className="w-full border border-gray-300 text-gray-700 py-3 px-4 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center space-x-2">
          <Clock className="w-4 h-4" />
          <span>Pending Tests</span>
          <span className="bg-yellow-500 text-white text-xs rounded-full px-2 py-1 ml-2">
            {labOrders.filter(o => o.status === 'pending').length}
          </span>
        </button>
        <button className="w-full border border-gray-300 text-gray-700 py-3 px-4 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center space-x-2">
          <CheckCircle className="w-4 h-4" />
          <span>Ready Results</span>
          <span className="bg-purple-500 text-white text-xs rounded-full px-2 py-1 ml-2">
            {labOrders.filter(o => o.status === 'ready').length}
          </span>
        </button>
        <button className="w-full border border-gray-300 text-gray-700 py-3 px-4 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center space-x-2">
          <Send className="w-4 h-4" />
          <span>Sent Results</span>
          <span className="bg-green-500 text-white text-xs rounded-full px-2 py-1 ml-2">
            {labOrders.filter(o => o.status === 'sent').length}
          </span>
        </button>
      </div>
    </div>
  );

  const TodaySummaryCard = () => (
    <LabCalendarSidebar
      selectedDate={selectedDate}
      onDateSelect={handleDateClick}
      currentDate={currentDate}
      onMonthChange={handleMonthChange}
      labOrders={labOrders}
    />
  );

  const OrderDetailsModal = ({ order }) => (
    <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">{order.patientName}</h2>
          <p className="text-gray-600">Patient ID: {order.patientId} • {order.age}Y, {order.gender}</p>
          <p className="text-sm text-gray-500 mt-1">{order.description}</p>
        </div>
        <div className="text-right">
          <span className={`px-3 py-1 rounded-lg text-sm ${getStatusColor(order.status)}`}>
            {getStatusDisplayName(order.status)}
          </span>
          <p className="text-sm text-gray-600 mt-2">Order: {order.id}</p>
          <p className="text-xs text-gray-500">{order.orderDate} at {order.orderTime}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="font-semibold text-gray-900 mb-2">Ordering Physician</h3>
          <p className="text-gray-700">{order.physician}</p>
        </div>
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="font-semibold text-gray-900 mb-2">Priority</h3>
          <div className="flex items-center gap-2">
            {order.priority === 'urgent' ? (
              <AlertCircle className="w-4 h-4 text-red-500" />
            ) : (
              <Clock className="w-4 h-4 text-gray-400" />
            )}
            <span className="capitalize">{order.priority}</span>
          </div>
        </div>
      </div>

      {order.notes && (
        <div className="mb-6 bg-blue-50 rounded-lg p-4 border-l-4 border-blue-500">
          <h3 className="font-semibold text-gray-900 mb-2">Clinical Notes</h3>
          <p className="text-gray-700">{order.notes}</p>
        </div>
      )}

      <div className="mb-6">
        <h3 className="font-semibold text-gray-900 mb-4 border-l-4 border-teal-500 pl-3">Ordered Tests</h3>
        <div className="space-y-3">
          {order.tests.map(test => (
            <div key={test.id} className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex justify-between items-start mb-2">
                <h4 className="font-medium text-gray-900">{test.name}</h4>
                <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">{test.id}</span>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                <div>
                  <span className="font-medium">Type:</span> {test.type}
                </div>
                <div>
                  <span className="font-medium">Unit:</span> {test.unit}
                </div>
                <div className="col-span-2">
                  <span className="font-medium">Normal Range:</span> {test.normalRange}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-3">
        {getNextStatusAction(order.status) && (
          <button 
            onClick={() => updateOrderStatus(order.id, getNextStatusAction(order.status).nextStatus)}
            className={`${getNextStatusAction(order.status).color} hover:opacity-90 text-white px-6 py-2 rounded-lg transition-colors flex items-center gap-2`}
          >
            <FileText className="w-4 h-4" />
            {getNextStatusAction(order.status).action}
          </button>
        )}
        {order.status === 'pending' && (
          <button 
            onClick={() => setShowResultEntry(true)}
            className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-2 rounded-lg transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Enter Results
          </button>
        )}
        <button className="border border-gray-300 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2">
          <Upload className="w-4 h-4" />
          Upload Files
        </button>
        <button 
          onClick={() => setSelectedOrder(null)}
          className="border border-gray-300 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Close
        </button>
      </div>
    </div>
  );

  const ResultEntryForm = ({ order }) => (
    <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4 border-l-4 border-teal-500 pl-3">Enter Test Results</h3>
      <p className="text-gray-600 mb-6">Patient: {order.patientName} | Order: {order.id}</p>
      
      <div className="space-y-6">
        {order.tests.map(test => (
          <div key={test.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <h4 className="font-medium text-gray-900 mb-3">{test.name}</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Result Value
                </label>
                <input
                  type="text"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  placeholder={`Enter value (${test.unit})`}
                  value={results[test.id]?.value || ''}
                  onChange={(e) => handleResultChange(test.id, 'value', e.target.value)}
                />
                <p className="text-xs text-gray-500 mt-1">Normal: {test.normalRange}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  value={results[test.id]?.status || 'normal'}
                  onChange={(e) => handleResultChange(test.id, 'status', e.target.value)}
                >
                  <option value="normal">Normal</option>
                  <option value="abnormal">Abnormal</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  rows="2"
                  placeholder="Add any notes or comments..."
                  value={results[test.id]?.notes || ''}
                  onChange={(e) => handleResultChange(test.id, 'notes', e.target.value)}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-3 mt-6">
        <button 
          onClick={() => handleSubmitResults(order.id)}
          className="bg-teal-500 hover:bg-teal-600 text-white px-6 py-2 rounded-lg transition-colors flex items-center gap-2"
        >
          <Send className="w-4 h-4" />
          Submit Results
        </button>
        <button 
          onClick={() => setShowResultEntry(false)}
          className="border border-gray-300 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Component */}
      <LabHeader />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            <TodaySummaryCard />
            <QuickActionsCard />
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {showResultEntry && selectedOrder ? (
              <ResultEntryForm order={selectedOrder} />
            ) : selectedOrder ? (
              <OrderDetailsModal order={selectedOrder} />
            ) : (
              <div className="space-y-6">
                {/* Lab Orders for Today */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-semibold text-gray-900 border-l-4 border-teal-500 pl-3">
                      Lab Orders for {format(selectedDate, 'MMMM d, yyyy')}
                    </h2>
                    <span className="text-teal-500 text-sm">{getOrdersForDate(selectedDate).length} orders</span>
                  </div>
                  
                  <div className="space-y-4">
                    {getOrdersForDate(selectedDate).length > 0 ? (
                      getOrdersForDate(selectedDate).map(order => (
                        <OrderCard key={order.id} order={order} />
                      ))
                    ) : (
                      <div className="text-center py-12">
                        <div className="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                          <FileText className="w-10 h-10 text-gray-400" />
                        </div>
                        <p className="text-gray-500 font-medium">No lab orders scheduled</p>
                        <p className="text-gray-400 text-sm">for {format(selectedDate, 'MMMM d, yyyy')}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Sample Processing Queue */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-semibold text-gray-900 border-l-4 border-teal-500 pl-3">
                      Sample Processing Queue
                    </h2>
                    <span className="text-teal-500 text-sm">{labOrders.filter(o => o.status === 'not-received').length} not received</span>
                  </div>
                  
                  {labOrders.filter(order => order.status === 'not-received').map(order => (
                    <div key={order.id} className="bg-white border border-gray-200 rounded-lg p-6 mb-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="bg-teal-100 text-teal-800 px-3 py-1 rounded-lg text-sm font-medium min-w-[70px] text-center">
                            {order.orderTime}
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900 text-lg">{order.patientName}</h3>
                            <p className="text-gray-600 text-sm">{order.description}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-3">
                          <span className="text-gray-500 text-sm">Provider: {order.physician}</span>
                          <button 
                            onClick={() => updateOrderStatus(order.id, 'received')}
                            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors"
                          >
                            Mark as Received
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {labOrders.filter(o => o.status === 'not-received').length === 0 && (
                    <div className="text-center text-gray-500 py-8">
                      <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                      <p>All samples have been received</p>
                    </div>
                  )}
                </div>

                {/* Processing Status */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-semibold text-gray-900 border-l-4 border-teal-500 pl-3">
                      Tests in Progress
                    </h2>
                    <span className="text-teal-500 text-sm">{labOrders.filter(o => ['received', 'pending'].includes(o.status)).length} processing</span>
                  </div>
                  
                  {labOrders.filter(order => ['received', 'pending'].includes(order.status)).map(order => (
                    <div key={order.id} className="bg-white border border-gray-200 rounded-lg p-6 mb-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="bg-teal-100 text-teal-800 px-3 py-1 rounded-lg text-sm font-medium min-w-[70px] text-center">
                            {order.orderTime}
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900 text-lg">{order.patientName}</h3>
                            <p className="text-gray-600 text-sm">{order.description}</p>
                            <span className={`inline-block px-2 py-1 rounded text-xs mt-1 ${getStatusColor(order.status)}`}>
                              {getStatusDisplayName(order.status)}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center space-x-3">
                          <span className="text-gray-500 text-sm">Provider: {order.physician}</span>
                          <button 
                            onClick={() => setSelectedOrder(order)}
                            className="border border-teal-500 text-teal-700 px-4 py-2 rounded-lg hover:bg-teal-50 transition-colors"
                          >
                            Process
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {labOrders.filter(o => ['received', 'pending'].includes(o.status)).length === 0 && (
                    <div className="text-center text-gray-500 py-8">
                      <Clock className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                      <p>No tests currently in progress</p>
                    </div>
                  )}
                </div>

                {/* Ready for Delivery */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-semibold text-gray-900 border-l-4 border-teal-500 pl-3">
                      Ready for Delivery
                    </h2>
                    <span className="text-teal-500 text-sm">{labOrders.filter(o => o.status === 'ready').length} ready</span>
                  </div>
                  
                  {labOrders.filter(order => order.status === 'ready').map(order => (
                    <div key={order.id} className="bg-purple-50 border border-purple-200 rounded-lg p-6 mb-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="bg-teal-100 text-teal-800 px-3 py-1 rounded-lg text-sm font-medium min-w-[70px] text-center">
                            {order.orderTime}
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900 text-lg">{order.patientName}</h3>
                            <p className="text-gray-600 text-sm">{order.description}</p>
                            <span className="inline-block bg-purple-100 text-purple-700 px-2 py-1 rounded text-xs mt-1 border border-purple-200">
                              Ready for Delivery
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center space-x-3">
                          <span className="text-gray-500 text-sm">Provider: {order.physician}</span>
                          <button 
                            onClick={() => updateOrderStatus(order.id, 'sent')}
                            className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg transition-colors"
                          >
                            Send Results
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {labOrders.filter(o => o.status === 'ready').length === 0 && (
                    <div className="text-center text-gray-500 py-8">
                      <CheckCircle className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                      <p>No results ready for delivery</p>
                    </div>
                  )}
                </div>

                {/* Completed Orders */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-semibold text-gray-900 border-l-4 border-teal-500 pl-3">
                      Completed Orders
                    </h2>
                    <span className="text-teal-500 text-sm">{labOrders.filter(o => o.status === 'sent').length} sent</span>
                  </div>
                  
                  {labOrders.filter(order => order.status === 'sent').map(order => (
                    <div key={order.id} className="bg-green-50 border border-green-200 rounded-lg p-6 mb-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="bg-gray-300 text-gray-700 px-3 py-1 rounded-lg text-sm font-medium min-w-[70px] text-center">
                            {order.orderTime}
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-600 text-lg">{order.patientName}</h3>
                            <p className="text-gray-500 text-sm">{order.description} - Completed</p>
                            <span className="inline-block bg-green-100 text-green-700 px-2 py-1 rounded text-xs mt-1 border border-green-200">
                              Results Sent
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center space-x-3">
                          <span className="text-gray-400 text-sm">Provider: {order.physician}</span>
                          <button className="border border-gray-300 text-gray-600 px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors">
                            View Report
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {labOrders.filter(o => o.status === 'sent').length === 0 && (
                    <div className="text-center text-gray-500 py-8">
                      <Send className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                      <p>No completed orders yet</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LabTechnicianDashboard;