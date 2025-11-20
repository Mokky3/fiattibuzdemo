import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Search, Filter, FileText, Download, Eye, Calendar, Clock, CheckCircle, AlertTriangle, Plus, Edit, Trash2, User, Beaker, Activity, BarChart3, Clipboard } from 'lucide-react';
// Import the header component
import LabHeader from './header';
import { getOrders, updateOrderStatus as updateOrderStatusSvc } from '../../services/labService';

const LabOrdersModule = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [activeTab, setActiveTab] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || 'all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [sortBy, setSortBy] = useState('date');
  const [showFilters, setShowFilters] = useState(false);
  const [showNewOrderForm, setShowNewOrderForm] = useState(false);

  const [labOrders, setLabOrders] = useState([]);

  // Update status filter when URL query parameter changes
  useEffect(() => {
    const statusFromUrl = searchParams.get('status');
    if (statusFromUrl) {
      setStatusFilter(statusFromUrl);
      // Also set the active tab based on status
      if (statusFromUrl === 'active' || statusFromUrl === 'pending') {
        setActiveTab('pending');
      } else if (statusFromUrl === 'completed') {
        setActiveTab('completed');
      }
    }
  }, [searchParams]);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const data = await getOrders();
        if (active) setLabOrders(data);
      } catch (e) {}
    })();
    return () => { active = false };
  }, []);

  // Filter and sort orders
  const filteredOrders = labOrders.filter(order => {
    const matchesSearch = order.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         order.patientId.includes(searchTerm) ||
                         order.id.includes(searchTerm) ||
                         order.physician.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || order.priority === priorityFilter;
    
    const matchesDate = dateFilter === 'all' || 
                       (dateFilter === 'today' && order.orderDate === '2025-06-28') ||
                       (dateFilter === 'week' && new Date(order.orderDate) >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));
    
    const matchesTab = activeTab === 'all' || 
                      (activeTab === 'pending' && ['not-received', 'received', 'pending'].includes(order.status)) ||
                      (activeTab === 'completed' && ['ready', 'sent'].includes(order.status)) ||
                      (activeTab === 'urgent' && order.priority === 'urgent') ||
                      (activeTab === 'cancelled' && order.status === 'cancelled');
    
    return matchesSearch && matchesStatus && matchesPriority && matchesDate && matchesTab;
  }).sort((a, b) => {
    switch (sortBy) {
      case 'date':
        return new Date(b.orderDate + ' ' + b.orderTime) - new Date(a.orderDate + ' ' + a.orderTime);
      case 'patient':
        return a.patientName.localeCompare(b.patientName);
      case 'priority':
        return a.priority === 'urgent' ? -1 : b.priority === 'urgent' ? 1 : 0;
      case 'status':
        return a.status.localeCompare(b.status);
      default:
        return 0;
    }
  });

  const getStatusColor = (status) => {
    switch (status) {
      case 'not-received': return 'text-red-600 bg-red-50 border-red-200';
      case 'received': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'pending': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'ready': return 'text-purple-600 bg-purple-50 border-purple-200';
      case 'sent': return 'text-green-600 bg-green-50 border-green-200';
      case 'cancelled': return 'text-gray-600 bg-gray-50 border-gray-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getStatusDisplayName = (status) => {
    switch (status) {
      case 'not-received': return 'Not Received';
      case 'received': return 'Received';
      case 'pending': return 'Pending';
      case 'ready': return 'Ready';
      case 'sent': return 'Sent';
      case 'cancelled': return 'Cancelled';
      default: return status;
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'not-received': return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case 'received': return <Clock className="w-4 h-4 text-blue-500" />;
      case 'pending': return <Activity className="w-4 h-4 text-yellow-500" />;
      case 'ready': return <CheckCircle className="w-4 h-4 text-purple-500" />;
      case 'sent': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'cancelled': return <Trash2 className="w-4 h-4 text-gray-500" />;
      default: return <FileText className="w-4 h-4 text-gray-500" />;
    }
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
    } catch (e) {}
  };

  const getNextStatusAction = (status) => {
    switch (status) {
      case 'not-received': return { action: 'Mark as Received', nextStatus: 'received', color: 'bg-blue-500' };
      case 'received': return { action: 'Start Processing', nextStatus: 'pending', color: 'bg-yellow-500' };
      case 'pending': return { action: 'Mark as Ready', nextStatus: 'ready', color: 'bg-purple-500' };
      case 'ready': return { action: 'Send Results', nextStatus: 'sent', color: 'bg-green-500' };
      case 'sent': return null;
      case 'cancelled': return null;
      default: return null;
    }
  };

  const OrderCard = ({ order }) => (
    <div 
      className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-all duration-200 cursor-pointer"
      onClick={() => setSelectedOrder(order)}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-4">
          <div className="bg-teal-100 text-teal-800 px-3 py-1 rounded-lg text-sm font-medium">
            {order.orderTime}
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">{order.patientName}</h3>
            <p className="text-sm text-gray-600">{order.age}Y, {order.gender} • ID: {order.patientId}</p>
            <p className="text-xs text-gray-500">Order: {order.id}</p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1">
            {getStatusIcon(order.status)}
            <span className="text-sm text-gray-600 capitalize">{getStatusDisplayName(order.status)}</span>
          </div>
          {order.priority === 'urgent' && (
            <span className="bg-red-100 text-red-700 px-2 py-1 rounded-full text-xs border border-red-200">
              Urgent
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between mb-3">
        <div className="flex space-x-2">
          <span className="text-sm text-gray-600">Provider: {order.physician}</span>
          <span className="text-sm text-gray-400">•</span>
          <span className="text-sm text-gray-600">{order.department}</span>
        </div>
        <div className="text-sm text-gray-600">
          {order.tests.length} test{order.tests.length > 1 ? 's' : ''}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex space-x-2">
          <span className="text-sm text-gray-600">Sample: {order.sampleType}</span>
          <span className="text-sm text-gray-400">•</span>
          <span className="text-sm text-gray-600">Est. Time: {order.estimatedTime}</span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium text-gray-900">${order.totalCost.toFixed(2)}</span>
          <span className="text-xs text-gray-500">{order.orderDate}</span>
        </div>
      </div>
    </div>
  );

  const OrderDetails = ({ order }) => (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Order #{order.id}</h2>
          <p className="text-gray-600">{order.patientName} • ID: {order.patientId}</p>
          <p className="text-sm text-gray-500">{order.age} years old, {order.gender}</p>
        </div>
        <div className="flex space-x-2">
          <button className="px-4 py-2 border border-teal-500 text-teal-700 rounded-lg hover:bg-teal-50 transition-colors">
            <Download className="w-4 h-4 inline mr-2" />
            Export Order
          </button>
          <button className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
            <Edit className="w-4 h-4 inline mr-2" />
            Edit
          </button>
          <button 
            onClick={() => setSelectedOrder(null)}
            className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
          >
            Close
          </button>
        </div>
      </div>

      {/* Order Information */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="font-semibold text-gray-900 mb-3">Order Information</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">Order Date:</span>
              <span className="font-medium">{order.orderDate}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Order Time:</span>
              <span className="font-medium">{order.orderTime}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Status:</span>
              <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(order.status)}`}>
                {getStatusDisplayName(order.status)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Priority:</span>
              <span className={`font-medium capitalize ${order.priority === 'urgent' ? 'text-red-600' : 'text-gray-900'}`}>
                {order.priority}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="font-semibold text-gray-900 mb-3">Provider Information</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">Physician:</span>
              <span className="font-medium">{order.physician}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Department:</span>
              <span className="font-medium">{order.department}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Authorized By:</span>
              <span className="font-medium">{order.authorizedBy}</span>
            </div>
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="font-semibold text-gray-900 mb-3">Sample & Billing</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">Sample Type:</span>
              <span className="font-medium">{order.sampleType}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Est. Time:</span>
              <span className="font-medium">{order.estimatedTime}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Insurance:</span>
              <span className="font-medium">{order.insurance}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Total Cost:</span>
              <span className="font-bold text-gray-900">${order.totalCost.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Clinical Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="bg-blue-50 rounded-lg p-4 border-l-4 border-blue-500">
          <h3 className="font-semibold text-gray-900 mb-2">Clinical Information</h3>
          <p className="text-gray-700">{order.clinicalInfo}</p>
        </div>
        <div className="bg-yellow-50 rounded-lg p-4 border-l-4 border-yellow-500">
          <h3 className="font-semibold text-gray-900 mb-2">Special Instructions</h3>
          <p className="text-gray-700">{order.instructions}</p>
        </div>
      </div>

      {/* Ordered Tests */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 border-l-4 border-teal-500 pl-3">Ordered Tests</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {order.tests.map(test => (
            <div key={test.id} className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex justify-between items-start mb-2">
                <h4 className="font-medium text-gray-900">{test.name}</h4>
                <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">{test.code}</span>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Category:</span>
                  <span className="text-gray-900">{test.category}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Test ID:</span>
                  <span className="text-gray-900">{test.id}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Cost:</span>
                  <span className="font-medium text-gray-900">${test.cost.toFixed(2)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        {getNextStatusAction(order.status) && (
          <button 
            onClick={() => updateOrderStatus(order.id, getNextStatusAction(order.status).nextStatus)}
            className={`${getNextStatusAction(order.status).color} hover:opacity-90 text-white px-6 py-2 rounded-lg transition-colors flex items-center gap-2`}
          >
            <Activity className="w-4 h-4" />
            {getNextStatusAction(order.status).action}
          </button>
        )}
        <button className="border border-gray-300 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2">
          <Beaker className="w-4 h-4" />
          Process Sample
        </button>
        <button className="border border-gray-300 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2">
          <FileText className="w-4 h-4" />
          Add Notes
        </button>
      </div>

      {/* Notes */}
      {order.notes && (
        <div className="mt-6 bg-gray-50 rounded-lg p-4 border-l-4 border-gray-400">
          <h3 className="font-semibold text-gray-900 mb-2">Notes</h3>
          <p className="text-gray-700">{order.notes}</p>
        </div>
      )}
    </div>
  );

  // Statistics
  const stats = {
    total: labOrders.length,
    pending: labOrders.filter(o => ['not-received', 'received', 'pending'].includes(o.status)).length,
    completed: labOrders.filter(o => ['ready', 'sent'].includes(o.status)).length,
    urgent: labOrders.filter(o => o.priority === 'urgent').length,
    cancelled: labOrders.filter(o => o.status === 'cancelled').length
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Component */}
      <LabHeader />

      <div className="flex h-[calc(100vh-64px)]">
        {/* Left Sidebar - Fixed */}
        <div className="w-80 bg-white border-r border-gray-200 overflow-y-auto">
          <div className="p-6 space-y-6">
            {/* Statistics Cards */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 border-l-4 border-teal-500 pl-3">Order Statistics</h3>
              <div className="bg-gradient-to-br from-teal-50 to-blue-50 rounded-lg border border-teal-200 p-4 text-center">
                <div className="flex items-center justify-center mb-2">
                  <Clipboard className="w-6 h-6 text-gray-500" />
                </div>
                <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
                <div className="text-sm text-gray-600">Total Orders</div>
              </div>
              <div className="bg-white rounded-lg border border-gray-200 p-4 text-center">
                <div className="flex items-center justify-center mb-2">
                  <Activity className="w-6 h-6 text-yellow-500" />
                </div>
                <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
                <div className="text-sm text-gray-600">Pending</div>
              </div>
              <div className="bg-white rounded-lg border border-gray-200 p-4 text-center">
                <div className="flex items-center justify-center mb-2">
                  <CheckCircle className="w-6 h-6 text-green-500" />
                </div>
                <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
                <div className="text-sm text-gray-600">Completed</div>
              </div>
              <div className="bg-white rounded-lg border border-gray-200 p-4 text-center">
                <div className="flex items-center justify-center mb-2">
                  <AlertTriangle className="w-6 h-6 text-red-500" />
                </div>
                <div className="text-2xl font-bold text-red-600">{stats.urgent}</div>
                <div className="text-sm text-gray-600">Urgent</div>
              </div>
              <div className="bg-white rounded-lg border border-gray-200 p-4 text-center">
                <div className="flex items-center justify-center mb-2">
                  <Trash2 className="w-6 h-6 text-gray-500" />
                </div>
                <div className="text-2xl font-bold text-gray-600">{stats.cancelled}</div>
                <div className="text-sm text-gray-600">Cancelled</div>
              </div>
            </div>
              </div>
            </div>

        {/* Main Content Area - Scrollable */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            {!selectedOrder ? (
              <>
            {/* Orders List */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              {/* Header with Filters */}
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-gray-900 border-l-4 border-teal-500 pl-3">
                  Lab Orders
                </h2>
                <div className="flex items-center space-x-4">
                  <Link
                    to="/lab/reports/new"
                    className="bg-teal-500 hover:bg-teal-600 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2 no-underline"
                  >
                    <Plus className="w-4 h-4" />
                    New Order
                  </Link>
                  <button
                    onClick={() => setShowFilters(!showFilters)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <Filter className="w-5 h-5" />
                  </button>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="border border-gray-300 rounded-md px-3 py-1 text-sm"
                  >
                    <option value="date">Sort by Date</option>
                    <option value="patient">Sort by Patient</option>
                    <option value="priority">Sort by Priority</option>
                    <option value="status">Sort by Status</option>
                  </select>
                </div>
              </div>

              {/* Advanced Filters */}
              {showFilters && (
                <div className="bg-gray-50 rounded-lg p-4 mb-6">
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="border border-gray-300 rounded-md px-3 py-2"
                    >
                      <option value="all">All Status</option>
                      <option value="not-received">Not Received</option>
                      <option value="received">Received</option>
                      <option value="pending">Pending</option>
                      <option value="ready">Ready</option>
                      <option value="sent">Sent</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                    <select
                      value={priorityFilter}
                      onChange={(e) => setPriorityFilter(e.target.value)}
                      className="border border-gray-300 rounded-md px-3 py-2"
                    >
                      <option value="all">All Priority</option>
                      <option value="urgent">Urgent</option>
                      <option value="routine">Routine</option>
                    </select>
                    <select
                      value={dateFilter}
                      onChange={(e) => setDateFilter(e.target.value)}
                      className="border border-gray-300 rounded-md px-3 py-2"
                    >
                      <option value="all">All Time</option>
                      <option value="today">Today</option>
                      <option value="week">This Week</option>
                    </select>
                    <input
                      type="text"
                      placeholder="Search orders..."
                      className="border border-gray-300 rounded-md px-3 py-2"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <button
                      onClick={() => {
                        setStatusFilter('all');
                        setPriorityFilter('all');
                        setDateFilter('all');
                        setSearchTerm('');
                      }}
                      className="border border-gray-300 text-gray-700 rounded-md px-3 py-2 hover:bg-gray-50"
                    >
                      Clear Filters
                    </button>
                  </div>
                </div>
              )}

              {/* Tabs */}
              <div className="border-b border-gray-200 mb-6">
                <nav className="flex space-x-8">
                  {[
                    { id: 'all', label: 'All Orders', count: filteredOrders.length },
                    { id: 'pending', label: 'Pending', count: filteredOrders.filter(o => ['not-received', 'received', 'pending'].includes(o.status)).length },
                    { id: 'completed', label: 'Completed', count: filteredOrders.filter(o => ['ready', 'sent'].includes(o.status)).length },
                    { id: 'urgent', label: 'Urgent', count: filteredOrders.filter(o => o.priority === 'urgent').length },
                    { id: 'cancelled', label: 'Cancelled', count: filteredOrders.filter(o => o.status === 'cancelled').length }
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`py-2 px-1 border-b-2 font-medium text-sm ${
                        activeTab === tab.id
                          ? 'border-teal-500 text-teal-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      {tab.label} ({tab.count})
                    </button>
                  ))}
                </nav>
              </div>

              {/* Orders Grid */}
              <div className="space-y-4">
                {filteredOrders.length > 0 ? (
                  filteredOrders.map((order) => (
                    <OrderCard key={order.id} order={order} />
                  ))
                ) : (
                  <div className="text-center py-12">
                    <Clipboard className="w-20 h-20 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No orders found</h3>
                    <p className="text-gray-600">Try adjusting your search criteria or filters</p>
                  </div>
                )}
              </div>
            </div>
          </>
        ) : (
          <OrderDetails order={selectedOrder} />
        )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LabOrdersModule;