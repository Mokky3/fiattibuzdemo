import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Search, Filter, FileText, Download, Eye, Calendar, Clock, CheckCircle, AlertTriangle, Plus, Edit, Trash2, User, Beaker, Activity, BarChart3, Clipboard } from 'lucide-react';
// Import the header component
import LabHeader from './header';
import { getOrders, updateOrderStatus as updateOrderStatusSvc } from '../../services/labService';

const LabOrdersModule = () => {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Dark mode state - read from saved preference
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('theme');
    if (saved) return saved === 'dark';
    return document.documentElement.classList.contains('dark');
  });

  // Apply theme on mount
  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [darkMode]);
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
    if (darkMode) {
      switch (status) {
        case 'not-received': return 'text-red-300 bg-red-900 bg-opacity-30 border-red-700';
        case 'received': return 'text-blue-300 bg-blue-900 bg-opacity-30 border-blue-700';
        case 'pending': return 'text-yellow-300 bg-yellow-900 bg-opacity-30 border-yellow-700';
        case 'ready': return 'text-purple-300 bg-purple-900 bg-opacity-30 border-purple-700';
        case 'sent': return 'text-green-300 bg-green-900 bg-opacity-30 border-green-700';
        case 'cancelled': return 'text-gray-300 bg-gray-700 bg-opacity-30 border-gray-600';
        default: return 'text-gray-300 bg-gray-700 bg-opacity-30 border-gray-600';
      }
    } else {
      switch (status) {
        case 'not-received': return 'text-red-600 bg-red-50 border-red-200';
        case 'received': return 'text-blue-600 bg-blue-50 border-blue-200';
        case 'pending': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
        case 'ready': return 'text-purple-600 bg-purple-50 border-purple-200';
        case 'sent': return 'text-green-600 bg-green-50 border-green-200';
        case 'cancelled': return 'text-gray-600 bg-gray-50 border-gray-200';
        default: return 'text-gray-600 bg-gray-50 border-gray-200';
      }
    }
  };

  const getStatusDisplayName = (status) => {
    switch (status) {
      case 'not-received': return t('notReceived');
      case 'received': return t('received');
      case 'pending': return t('pending');
      case 'ready': return t('ready');
      case 'sent': return t('sent');
      case 'cancelled': return t('cancelled');
      default: return status;
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'not-received': return <AlertTriangle className={`w-4 h-4 ${darkMode ? 'text-red-400' : 'text-red-500'}`} />;
      case 'received': return <Clock className={`w-4 h-4 ${darkMode ? 'text-blue-400' : 'text-blue-500'}`} />;
      case 'pending': return <Activity className={`w-4 h-4 ${darkMode ? 'text-yellow-400' : 'text-yellow-500'}`} />;
      case 'ready': return <CheckCircle className={`w-4 h-4 ${darkMode ? 'text-purple-400' : 'text-purple-500'}`} />;
      case 'sent': return <CheckCircle className={`w-4 h-4 ${darkMode ? 'text-green-400' : 'text-green-500'}`} />;
      case 'cancelled': return <Trash2 className={`w-4 h-4 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />;
      default: return <FileText className={`w-4 h-4 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />;
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
      case 'not-received': return { action: t('markAsReceived'), nextStatus: 'received', color: darkMode ? 'bg-blue-600' : 'bg-blue-500' };
      case 'received': return { action: t('startProcessing'), nextStatus: 'pending', color: darkMode ? 'bg-yellow-600' : 'bg-yellow-500' };
      case 'pending': return { action: t('markAsReady'), nextStatus: 'ready', color: darkMode ? 'bg-purple-600' : 'bg-purple-500' };
      case 'ready': return { action: t('sendResults'), nextStatus: 'sent', color: darkMode ? 'bg-green-600' : 'bg-green-500' };
      case 'sent': return null;
      case 'cancelled': return null;
      default: return null;
    }
  };

  const OrderCard = ({ order }) => (
    <div 
      className={`rounded-lg border p-6 hover:shadow-md transition-all duration-200 cursor-pointer ${
        darkMode
          ? 'bg-[#0D2026] border-[#133037]'
          : 'bg-white border-gray-200'
      }`}
      onClick={() => setSelectedOrder(order)}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-4">
          <div className={`px-3 py-1 rounded-lg text-sm font-medium ${
            darkMode
              ? 'bg-[#79CAC2] bg-opacity-20 text-[#79CAC2]'
              : 'bg-teal-100 text-teal-800'
          }`}>
            {order.orderTime}
          </div>
          <div>
            <h3 className={`font-semibold ${
              darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
            }`}>{order.patientName}</h3>
            <p className={`text-sm ${
              darkMode ? 'text-[#C1D9DD]' : 'text-gray-600'
            }`}>{order.age}Y, {order.gender} • {t('id')}: {order.patientId}</p>
            <p className={`text-xs ${
              darkMode ? 'text-[#8AA2A7]' : 'text-gray-500'
            }`}>{t('order')}: {order.id}</p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1">
            {getStatusIcon(order.status)}
            <span className={`text-sm capitalize ${
              darkMode ? 'text-[#C1D9DD]' : 'text-gray-600'
            }`}>{getStatusDisplayName(order.status)}</span>
          </div>
          {order.priority === 'urgent' && (
            <span className={`px-2 py-1 rounded-full text-xs border ${
              darkMode
                ? 'bg-red-900 bg-opacity-30 text-red-300 border-red-700'
                : 'bg-red-100 text-red-700 border-red-200'
            }`}>
              {t('urgent')}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between mb-3">
        <div className="flex space-x-2">
          <span className={`text-sm ${
            darkMode ? 'text-[#C1D9DD]' : 'text-gray-600'
          }`}>{t('provider')}: {order.physician}</span>
          <span className={`text-sm ${
            darkMode ? 'text-[#8AA2A7]' : 'text-gray-400'
          }`}>•</span>
          <span className={`text-sm ${
            darkMode ? 'text-[#C1D9DD]' : 'text-gray-600'
          }`}>{order.department}</span>
        </div>
        <div className={`text-sm ${
          darkMode ? 'text-[#C1D9DD]' : 'text-gray-600'
        }`}>
          {order.tests.length} {order.tests.length > 1 ? t('tests') : t('test')}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex space-x-2">
          <span className={`text-sm ${
            darkMode ? 'text-[#C1D9DD]' : 'text-gray-600'
          }`}>{t('sample')}: {order.sampleType}</span>
          <span className={`text-sm ${
            darkMode ? 'text-[#8AA2A7]' : 'text-gray-400'
          }`}>•</span>
          <span className={`text-sm ${
            darkMode ? 'text-[#C1D9DD]' : 'text-gray-600'
          }`}>{t('estTime')}: {order.estimatedTime}</span>
        </div>
        <div className="flex items-center space-x-2">
          <span className={`text-sm font-medium ${
            darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
          }`}>${order.totalCost.toFixed(2)}</span>
          <span className={`text-xs ${
            darkMode ? 'text-[#8AA2A7]' : 'text-gray-500'
          }`}>{order.orderDate}</span>
        </div>
      </div>
    </div>
  );

  const OrderDetails = ({ order }) => (
    <div className={`rounded-lg border p-6 ${
      darkMode
        ? 'bg-[#0D2026] border-[#133037]'
        : 'bg-white border-gray-200'
    }`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className={`text-2xl font-bold ${
            darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
          }`}>{t('order')} #{order.id}</h2>
          <p className={darkMode ? 'text-[#C1D9DD]' : 'text-gray-600'}>
            {order.patientName} • {t('id')}: {order.patientId}
          </p>
          <p className={`text-sm ${
            darkMode ? 'text-[#8AA2A7]' : 'text-gray-500'
          }`}>{order.age} {t('yearsOld')}, {order.gender}</p>
        </div>
        <div className="flex space-x-2">
          <button className={`px-4 py-2 border rounded-lg transition-colors ${
            darkMode
              ? 'border-[#79CAC2] text-[#79CAC2] hover:bg-[#133037]'
              : 'border-teal-500 text-teal-700 hover:bg-teal-50'
          }`}>
            <Download className="w-4 h-4 inline mr-2" />
            {t('exportOrder')}
          </button>
          <button className={`px-4 py-2 border rounded-lg transition-colors ${
            darkMode
              ? 'border-[#133037] text-[#C1D9DD] hover:bg-[#133037]'
              : 'border-gray-300 text-gray-700 hover:bg-gray-50'
          }`}>
            <Edit className="w-4 h-4 inline mr-2" />
            {t('edit')}
          </button>
          <button 
            onClick={() => setSelectedOrder(null)}
            className={`px-4 py-2 rounded-lg transition-colors ${
              darkMode
                ? 'bg-gray-600 hover:bg-gray-700 text-white'
                : 'bg-gray-500 hover:bg-gray-600 text-white'
            }`}
          >
            {t('close')}
          </button>
        </div>
      </div>

      {/* Order Information */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className={`rounded-lg p-4 ${
          darkMode ? 'bg-[#07181D]' : 'bg-gray-50'
        }`}>
          <h3 className={`font-semibold mb-3 ${
            darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
          }`}>{t('orderInformation')}</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className={darkMode ? 'text-[#C1D9DD]' : 'text-gray-600'}>{t('orderDate')}:</span>
              <span className={`font-medium ${
                darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
              }`}>{order.orderDate}</span>
            </div>
            <div className="flex justify-between">
              <span className={darkMode ? 'text-[#C1D9DD]' : 'text-gray-600'}>{t('orderTime')}:</span>
              <span className={`font-medium ${
                darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
              }`}>{order.orderTime}</span>
            </div>
            <div className="flex justify-between">
              <span className={darkMode ? 'text-[#C1D9DD]' : 'text-gray-600'}>{t('status')}:</span>
              <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(order.status)}`}>
                {getStatusDisplayName(order.status)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className={darkMode ? 'text-[#C1D9DD]' : 'text-gray-600'}>{t('priority')}:</span>
              <span className={`font-medium capitalize ${
                order.priority === 'urgent'
                  ? darkMode ? 'text-red-400' : 'text-red-600'
                  : darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
              }`}>
                {order.priority === 'urgent' ? t('urgent') : order.priority}
              </span>
            </div>
          </div>
        </div>

        <div className={`rounded-lg p-4 ${
          darkMode ? 'bg-[#07181D]' : 'bg-gray-50'
        }`}>
          <h3 className={`font-semibold mb-3 ${
            darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
          }`}>{t('providerInformation')}</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className={darkMode ? 'text-[#C1D9DD]' : 'text-gray-600'}>{t('physician')}:</span>
              <span className={`font-medium ${
                darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
              }`}>{order.physician}</span>
            </div>
            <div className="flex justify-between">
              <span className={darkMode ? 'text-[#C1D9DD]' : 'text-gray-600'}>{t('department')}:</span>
              <span className={`font-medium ${
                darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
              }`}>{order.department}</span>
            </div>
            <div className="flex justify-between">
              <span className={darkMode ? 'text-[#C1D9DD]' : 'text-gray-600'}>{t('authorizedBy')}:</span>
              <span className={`font-medium ${
                darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
              }`}>{order.authorizedBy}</span>
            </div>
          </div>
        </div>

        <div className={`rounded-lg p-4 ${
          darkMode ? 'bg-[#07181D]' : 'bg-gray-50'
        }`}>
          <h3 className={`font-semibold mb-3 ${
            darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
          }`}>{t('sampleBilling')}</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className={darkMode ? 'text-[#C1D9DD]' : 'text-gray-600'}>{t('sampleType')}:</span>
              <span className={`font-medium ${
                darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
              }`}>{order.sampleType}</span>
            </div>
            <div className="flex justify-between">
              <span className={darkMode ? 'text-[#C1D9DD]' : 'text-gray-600'}>{t('estTime')}:</span>
              <span className={`font-medium ${
                darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
              }`}>{order.estimatedTime}</span>
            </div>
            <div className="flex justify-between">
              <span className={darkMode ? 'text-[#C1D9DD]' : 'text-gray-600'}>{t('insurance')}:</span>
              <span className={`font-medium ${
                darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
              }`}>{order.insurance}</span>
            </div>
            <div className="flex justify-between">
              <span className={darkMode ? 'text-[#C1D9DD]' : 'text-gray-600'}>{t('totalCost')}:</span>
              <span className={`font-bold ${
                darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
              }`}>${order.totalCost.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Clinical Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className={`rounded-lg p-4 border-l-4 ${
          darkMode
            ? 'bg-blue-900 bg-opacity-30 border-blue-700'
            : 'bg-blue-50 border-blue-500'
        }`}>
          <h3 className={`font-semibold mb-2 ${
            darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
          }`}>{t('clinicalInformation')}</h3>
          <p className={darkMode ? 'text-[#C1D9DD]' : 'text-gray-700'}>{order.clinicalInfo}</p>
        </div>
        <div className={`rounded-lg p-4 border-l-4 ${
          darkMode
            ? 'bg-yellow-900 bg-opacity-30 border-yellow-700'
            : 'bg-yellow-50 border-yellow-500'
        }`}>
          <h3 className={`font-semibold mb-2 ${
            darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
          }`}>{t('specialInstructions')}</h3>
          <p className={darkMode ? 'text-[#C1D9DD]' : 'text-gray-700'}>{order.instructions}</p>
        </div>
      </div>

      {/* Ordered Tests */}
      <div className="mb-6">
        <h3 className={`text-lg font-semibold mb-4 border-l-4 pl-3 ${
          darkMode
            ? 'text-[#F5FEFF] border-[#79CAC2]'
            : 'text-gray-900 border-teal-500'
        }`}>{t('orderedTests')}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {order.tests.map(test => (
            <div key={test.id} className={`border rounded-lg p-4 ${
              darkMode
                ? 'bg-[#0D2026] border-[#133037]'
                : 'bg-white border-gray-200'
            }`}>
              <div className="flex justify-between items-start mb-2">
                <h4 className={`font-medium ${
                  darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
                }`}>{test.name}</h4>
                <span className={`text-sm px-2 py-1 rounded ${
                  darkMode
                    ? 'text-[#8AA2A7] bg-[#07181D]'
                    : 'text-gray-500 bg-gray-100'
                }`}>{test.code}</span>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className={darkMode ? 'text-[#C1D9DD]' : 'text-gray-600'}>{t('category')}:</span>
                  <span className={darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'}>{test.category}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className={darkMode ? 'text-[#C1D9DD]' : 'text-gray-600'}>{t('testId')}:</span>
                  <span className={darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'}>{test.id}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className={darkMode ? 'text-[#C1D9DD]' : 'text-gray-600'}>{t('cost')}:</span>
                  <span className={`font-medium ${
                    darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
                  }`}>${test.cost.toFixed(2)}</span>
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
        <button className={`border px-6 py-2 rounded-lg transition-colors flex items-center gap-2 ${
          darkMode
            ? 'border-[#133037] text-[#C1D9DD] hover:bg-[#133037]'
            : 'border-gray-300 text-gray-700 hover:bg-gray-50'
        }`}>
          <Beaker className="w-4 h-4" />
          {t('processSample')}
        </button>
        <button className={`border px-6 py-2 rounded-lg transition-colors flex items-center gap-2 ${
          darkMode
            ? 'border-[#133037] text-[#C1D9DD] hover:bg-[#133037]'
            : 'border-gray-300 text-gray-700 hover:bg-gray-50'
        }`}>
          <FileText className="w-4 h-4" />
          {t('addNotes')}
        </button>
      </div>

      {/* Notes */}
      {order.notes && (
        <div className={`mt-6 rounded-lg p-4 border-l-4 ${
          darkMode
            ? 'bg-[#07181D] border-gray-600'
            : 'bg-gray-50 border-gray-400'
        }`}>
          <h3 className={`font-semibold mb-2 ${
            darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
          }`}>{t('notes')}</h3>
          <p className={darkMode ? 'text-[#C1D9DD]' : 'text-gray-700'}>{order.notes}</p>
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
    <div className={`min-h-screen transition-colors duration-500 ${
      darkMode ? 'bg-[#050C0F]' : 'bg-gray-50'
    }`}>
      {/* Header Component */}
      <LabHeader />

      <div className="flex h-[calc(100vh-64px)]">
        {/* Left Sidebar - Fixed */}
        <div className={`w-80 border-r overflow-y-auto ${
          darkMode
            ? 'bg-[#0D2026] border-[#133037]'
            : 'bg-white border-gray-200'
        }`}>
          <div className="p-6 space-y-6">
            {/* Statistics Cards */}
            <div className="space-y-4">
              <h3 className={`text-lg font-semibold border-l-4 pl-3 ${
                darkMode
                  ? 'text-[#F5FEFF] border-[#79CAC2]'
                  : 'text-gray-900 border-teal-500'
              }`}>{t('orderStatistics')}</h3>
              <div className={`rounded-lg border p-4 text-center ${
                darkMode
                  ? 'bg-gradient-to-br from-[#0D2026] to-[#07181D] border-[#133037]'
                  : 'bg-gradient-to-br from-teal-50 to-blue-50 border-teal-200'
              }`}>
                <div className="flex items-center justify-center mb-2">
                  <Clipboard className={`w-6 h-6 ${
                    darkMode ? 'text-[#8AA2A7]' : 'text-gray-500'
                  }`} />
                </div>
                <div className={`text-2xl font-bold ${
                  darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
                }`}>{stats.total}</div>
                <div className={`text-sm ${
                  darkMode ? 'text-[#C1D9DD]' : 'text-gray-600'
                }`}>{t('totalOrders')}</div>
              </div>
              <div className={`rounded-lg border p-4 text-center ${
                darkMode
                  ? 'bg-[#0D2026] border-[#133037]'
                  : 'bg-white border-gray-200'
              }`}>
                <div className="flex items-center justify-center mb-2">
                  <Activity className={`w-6 h-6 ${
                    darkMode ? 'text-yellow-400' : 'text-yellow-500'
                  }`} />
                </div>
                <div className={`text-2xl font-bold ${
                  darkMode ? 'text-yellow-400' : 'text-yellow-600'
                }`}>{stats.pending}</div>
                <div className={`text-sm ${
                  darkMode ? 'text-[#C1D9DD]' : 'text-gray-600'
                }`}>{t('pending')}</div>
              </div>
              <div className={`rounded-lg border p-4 text-center ${
                darkMode
                  ? 'bg-[#0D2026] border-[#133037]'
                  : 'bg-white border-gray-200'
              }`}>
                <div className="flex items-center justify-center mb-2">
                  <CheckCircle className={`w-6 h-6 ${
                    darkMode ? 'text-green-400' : 'text-green-500'
                  }`} />
                </div>
                <div className={`text-2xl font-bold ${
                  darkMode ? 'text-green-400' : 'text-green-600'
                }`}>{stats.completed}</div>
                <div className={`text-sm ${
                  darkMode ? 'text-[#C1D9DD]' : 'text-gray-600'
                }`}>{t('completed')}</div>
              </div>
              <div className={`rounded-lg border p-4 text-center ${
                darkMode
                  ? 'bg-[#0D2026] border-[#133037]'
                  : 'bg-white border-gray-200'
              }`}>
                <div className="flex items-center justify-center mb-2">
                  <AlertTriangle className={`w-6 h-6 ${
                    darkMode ? 'text-red-400' : 'text-red-500'
                  }`} />
                </div>
                <div className={`text-2xl font-bold ${
                  darkMode ? 'text-red-400' : 'text-red-600'
                }`}>{stats.urgent}</div>
                <div className={`text-sm ${
                  darkMode ? 'text-[#C1D9DD]' : 'text-gray-600'
                }`}>{t('urgent')}</div>
              </div>
              <div className={`rounded-lg border p-4 text-center ${
                darkMode
                  ? 'bg-[#0D2026] border-[#133037]'
                  : 'bg-white border-gray-200'
              }`}>
                <div className="flex items-center justify-center mb-2">
                  <Trash2 className={`w-6 h-6 ${
                    darkMode ? 'text-gray-400' : 'text-gray-500'
                  }`} />
                </div>
                <div className={`text-2xl font-bold ${
                  darkMode ? 'text-[#C1D9DD]' : 'text-gray-600'
                }`}>{stats.cancelled}</div>
                <div className={`text-sm ${
                  darkMode ? 'text-[#C1D9DD]' : 'text-gray-600'
                }`}>{t('cancelled')}</div>
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
            <div className={`rounded-lg border p-6 ${
              darkMode
                ? 'bg-[#0D2026] border-[#133037]'
                : 'bg-white border-gray-200'
            }`}>
              {/* Header with Filters */}
              <div className="flex items-center justify-between mb-6">
                <h2 className={`text-lg font-semibold border-l-4 pl-3 ${
                  darkMode
                    ? 'text-[#F5FEFF] border-[#79CAC2]'
                    : 'text-gray-900 border-teal-500'
                }`}>
                  {t('labOrders')}
                </h2>
                <div className="flex items-center space-x-4">
                  <Link
                    to="/lab/reports/new"
                    className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 no-underline ${
                      darkMode
                        ? 'bg-[#79CAC2] hover:bg-[#58B4AA] text-[#050C0F]'
                        : 'bg-teal-500 hover:bg-teal-600 text-white'
                    }`}
                  >
                    <Plus className="w-4 h-4" />
                    {t('newOrder')}
                  </Link>
                  <button
                    onClick={() => setShowFilters(!showFilters)}
                    className={darkMode ? 'text-[#8AA2A7] hover:text-[#79CAC2]' : 'text-gray-500 hover:text-gray-700'}
                  >
                    <Filter className="w-5 h-5" />
                  </button>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className={`border rounded-md px-3 py-1 text-sm transition-colors ${
                      darkMode
                        ? 'bg-[#07181D] border-[#133037] text-[#F5FEFF]'
                        : 'border-gray-300'
                    }`}
                  >
                    <option value="date">{t('sortByDate')}</option>
                    <option value="patient">{t('sortByPatient')}</option>
                    <option value="priority">{t('sortByPriority')}</option>
                    <option value="status">{t('sortByStatus')}</option>
                  </select>
                </div>
              </div>

              {/* Advanced Filters */}
              {showFilters && (
                <div className={`rounded-lg p-4 mb-6 ${
                  darkMode ? 'bg-[#07181D]' : 'bg-gray-50'
                }`}>
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className={`border rounded-md px-3 py-2 transition-colors ${
                        darkMode
                          ? 'bg-[#0D2026] border-[#133037] text-[#F5FEFF]'
                          : 'border-gray-300'
                      }`}
                    >
                      <option value="all">{t('allStatus')}</option>
                      <option value="not-received">{t('notReceived')}</option>
                      <option value="received">{t('received')}</option>
                      <option value="pending">{t('pending')}</option>
                      <option value="ready">{t('ready')}</option>
                      <option value="sent">{t('sent')}</option>
                      <option value="cancelled">{t('cancelled')}</option>
                    </select>
                    <select
                      value={priorityFilter}
                      onChange={(e) => setPriorityFilter(e.target.value)}
                      className={`border rounded-md px-3 py-2 transition-colors ${
                        darkMode
                          ? 'bg-[#0D2026] border-[#133037] text-[#F5FEFF]'
                          : 'border-gray-300'
                      }`}
                    >
                      <option value="all">{t('allPriority')}</option>
                      <option value="urgent">{t('urgent')}</option>
                      <option value="routine">{t('routine')}</option>
                    </select>
                    <select
                      value={dateFilter}
                      onChange={(e) => setDateFilter(e.target.value)}
                      className={`border rounded-md px-3 py-2 transition-colors ${
                        darkMode
                          ? 'bg-[#0D2026] border-[#133037] text-[#F5FEFF]'
                          : 'border-gray-300'
                      }`}
                    >
                      <option value="all">{t('allTime')}</option>
                      <option value="today">{t('today')}</option>
                      <option value="week">{t('thisWeek')}</option>
                    </select>
                    <input
                      type="text"
                      placeholder={t('searchOrders')}
                      className={`border rounded-md px-3 py-2 transition-colors ${
                        darkMode
                          ? 'bg-[#0D2026] border-[#133037] text-[#F5FEFF] placeholder-[#8AA2A7]'
                          : 'border-gray-300'
                      }`}
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
                      className={`border rounded-md px-3 py-2 transition-colors ${
                        darkMode
                          ? 'border-[#133037] text-[#C1D9DD] hover:bg-[#133037]'
                          : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {t('clearFilters')}
                    </button>
                  </div>
                </div>
              )}

              {/* Tabs */}
              <div className={`border-b mb-6 ${
                darkMode ? 'border-[#133037]' : 'border-gray-200'
              }`}>
                <nav className="flex space-x-8">
                  {[
                    { id: 'all', label: t('allOrders'), count: filteredOrders.length },
                    { id: 'pending', label: t('pending'), count: filteredOrders.filter(o => ['not-received', 'received', 'pending'].includes(o.status)).length },
                    { id: 'completed', label: t('completed'), count: filteredOrders.filter(o => ['ready', 'sent'].includes(o.status)).length },
                    { id: 'urgent', label: t('urgent'), count: filteredOrders.filter(o => o.priority === 'urgent').length },
                    { id: 'cancelled', label: t('cancelled'), count: filteredOrders.filter(o => o.status === 'cancelled').length }
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                        activeTab === tab.id
                          ? darkMode
                            ? 'border-[#79CAC2] text-[#79CAC2]'
                            : 'border-teal-500 text-teal-600'
                          : darkMode
                            ? 'border-transparent text-[#8AA2A7] hover:text-[#C1D9DD]'
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
                    <Clipboard className={`w-20 h-20 mx-auto mb-4 ${
                      darkMode ? 'text-[#133037]' : 'text-gray-300'
                    }`} />
                    <h3 className={`text-lg font-semibold mb-2 ${
                      darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
                    }`}>{t('noOrdersFound')}</h3>
                    <p className={darkMode ? 'text-[#C1D9DD]' : 'text-gray-600'}>
                      {t('tryAdjustingYourSearchCriteriaOrFilters')}
                    </p>
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