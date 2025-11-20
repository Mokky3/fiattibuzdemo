import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Filter, Bell, User, FileText, Clock, CheckCircle, AlertCircle, Send, Upload, Plus, Calendar } from 'lucide-react';
import { format, isSameDay } from 'date-fns';
import LabHeader from './header';
import { getOrders, updateOrderStatus as updateOrderStatusSvc, submitOrderResults as submitOrderResultsSvc, getDashboardSummary } from '../../services/labService';


const LabTechnicianDashboard = () => {
  const navigate = useNavigate();
  
  // Date management states
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  
  const [activeTab, setActiveTab] = useState('pending');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showResultEntry, setShowResultEntry] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const [labOrders, setLabOrders] = useState([]);
  const [dashboardSummary, setDashboardSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        setLoading(true);
        // Fetch both orders and dashboard summary
        const [ordersData, summaryData] = await Promise.all([
          getOrders(),
          getDashboardSummary()
        ]);
        
        if (active) {
          setLabOrders(ordersData);
          setDashboardSummary(summaryData?.data || summaryData);
        }
      } catch (e) {
        console.error('Error loading lab dashboard data:', e);
        if (active) {
          setLabOrders([]);
          setDashboardSummary(null);
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false };
  }, []);

  const [results, setResults] = useState({});

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'bg-blue-50 text-blue-700 border border-blue-200';
      case 'completed': return 'bg-green-50 text-green-700 border border-green-200';
      case 'on-hold': return 'bg-yellow-50 text-yellow-700 border border-yellow-200';
      case 'revoked': return 'bg-red-50 text-red-700 border border-red-200';
      default: return 'bg-gray-50 text-gray-700 border border-gray-200';
    }
  };

  const getStatusDisplayName = (status) => {
    switch (status) {
      case 'active': return 'Active';
      case 'completed': return 'Completed';
      case 'on-hold': return 'On Hold';
      case 'revoked': return 'Revoked';
      default: return status;
    }
  };

  const getNextStatusAction = (status) => {
    switch (status) {
      case 'active': return { action: 'Mark as Completed', nextStatus: 'completed', color: 'bg-green-500' };
      case 'completed': return null;
      case 'on-hold': return { action: 'Resume Processing', nextStatus: 'active', color: 'bg-blue-500' };
      case 'revoked': return null;
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

  const handleSubmitResults = async (orderId) => {
    try {
      await submitOrderResultsSvc(orderId, results);
      setLabOrders(prev => prev.map(order => 
        order.id === orderId 
          ? { ...order, status: 'completed' }
          : order
      ));
      setShowResultEntry(false);
      setSelectedOrder(null);
    } catch (e) {
      // no-op
    }
  };

  // Handle date selection
  const handleDateClick = (day) => {
    setSelectedDate(day);
  };

  // Handle month change
  const handleMonthChange = (newDate) => {
    setCurrentDate(newDate);
  };

  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      await updateOrderStatusSvc(orderId, newStatus);
      setLabOrders(prev => prev.map(order => 
        order.id === orderId 
          ? { ...order, status: newStatus }
          : order
      ));
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder(prev => ({ ...prev, status: newStatus }));
      }
    } catch (e) {
      // no-op
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
            <p className="text-gray-600 text-sm">
              {order.tests && order.tests.length > 0 
                ? `${order.tests.length} test${order.tests.length > 1 ? 's' : ''} - ${order.tests.map(t => t.name).join(', ')}`
                : 'No tests specified'}
            </p>
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
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h3 className="font-semibold text-gray-900 mb-4 border-l-4 border-teal-500 pl-3">Quick Actions</h3>
      <div className="space-y-3">
        <button 
          onClick={() => navigate('/lab/reports/new')}
          className="w-full bg-teal-500 hover:bg-teal-600 text-white py-3 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2"
        >
          <Plus className="w-4 h-4" />
          <span>New Lab Order</span>
        </button>
        <button 
          onClick={() => navigate('/lab/orders?status=active')}
          className="w-full border border-teal-500 text-teal-700 py-3 px-4 rounded-lg hover:bg-teal-50 transition-colors flex items-center justify-center space-x-2"
        >
          <FileText className="w-4 h-4" />
          <span>Active Orders</span>
          <span className="bg-red-500 text-white text-xs rounded-full px-2 py-1 ml-2">
            {labOrders.filter(o => o.status === 'active').length}
          </span>
        </button>
        <button 
          onClick={() => navigate('/lab/orders?status=pending')}
          className="w-full border border-gray-300 text-gray-700 py-3 px-4 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center space-x-2"
        >
          <Clock className="w-4 h-4" />
          <span>In Progress</span>
          <span className="bg-yellow-500 text-white text-xs rounded-full px-2 py-1 ml-2">
            {labOrders.filter(o => o.status === 'pending' || o.status === 'active').length}
          </span>
        </button>
        <button 
          onClick={() => navigate('/lab/orders?status=completed')}
          className="w-full border border-gray-300 text-gray-700 py-3 px-4 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center space-x-2"
        >
          <CheckCircle className="w-4 h-4" />
          <span>Completed Orders</span>
          <span className="bg-purple-500 text-white text-xs rounded-full px-2 py-1 ml-2">
            {labOrders.filter(o => o.status === 'completed').length}
          </span>
        </button>
        <button 
          onClick={() => navigate('/lab/reports')}
          className="w-full border border-gray-300 text-gray-700 py-3 px-4 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center space-x-2"
        >
          <Send className="w-4 h-4" />
          <span>Finalized Reports</span>
          <span className="bg-green-500 text-white text-xs rounded-full px-2 py-1 ml-2">
            {dashboardSummary?.reports_completed || 0}
          </span>
        </button>
      </div>
    </div>
  );

  const TodaySummaryCard = () => (
    <div className="bg-gradient-to-br from-teal-50 to-blue-50 rounded-lg shadow-sm border border-teal-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4 border-l-4 border-teal-500 pl-3">Today's Summary</h3>
      {loading ? (
        <div className="space-y-3">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Pending Orders</span>
            <span className="text-lg font-bold text-orange-600">
              {dashboardSummary?.orders_pending || 0}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">In Progress</span>
            <span className="text-lg font-bold text-blue-600">
              {dashboardSummary?.orders_total - dashboardSummary?.orders_pending - dashboardSummary?.orders_completed || 0}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Completed</span>
            <span className="text-lg font-bold text-green-600">
              {dashboardSummary?.orders_completed || 0}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Total Orders</span>
            <span className="text-lg font-bold text-gray-900">
              {dashboardSummary?.orders_total || 0}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Urgent Orders</span>
            <span className="text-lg font-bold text-red-600">
              {dashboardSummary?.orders_urgent || 0}
            </span>
          </div>
        </div>
      )}
    </div>
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

      <div className="flex h-[calc(100vh-64px)]">
        {/* Left Sidebar - Fixed */}
        <div className="w-80 bg-white border-r border-gray-200 overflow-y-auto">
          <div className="p-6 space-y-6">
            <TodaySummaryCard />
            <QuickActionsCard />
          </div>
          </div>

        {/* Main Content Area - Scrollable */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            {showResultEntry && selectedOrder ? (
              <ResultEntryForm order={selectedOrder} />
            ) : selectedOrder ? (
              <OrderDetailsModal order={selectedOrder} />
            ) : loading ? (
              <div className="space-y-6">
                <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
                  <div className="animate-pulse">
                    <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
                    <div className="space-y-3">
                      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                      <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                      <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
                  <div className="animate-pulse">
                    <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
                    <div className="space-y-3">
                      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                      <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                    </div>
                  </div>
                </div>
              </div>
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
                    <span className="text-teal-500 text-sm">{labOrders.filter(o => o.status === 'active').length} active</span>
                  </div>
                  
                  {labOrders.filter(order => order.status === 'active').map(order => (
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
                    <span className="text-teal-500 text-sm">{labOrders.filter(o => o.status === 'completed').length} completed</span>
                  </div>
                  
                  {labOrders.filter(order => order.status === 'completed').map(order => (
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
                            onClick={() => updateOrderStatus(order.id, 'completed')}
                            className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg transition-colors"
                          >
                            Send Results
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {labOrders.filter(o => o.status === 'completed').length === 0 && (
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
                    <span className="text-teal-500 text-sm">{labOrders.filter(o => o.status === 'completed').length} completed</span>
                  </div>
                  
                  {labOrders.filter(order => order.status === 'completed').map(order => (
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
                  
                  {labOrders.filter(o => o.status === 'completed').length === 0 && (
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