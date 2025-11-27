import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Search, Filter, Bell, User, FileText, Clock, CheckCircle, AlertCircle, Send, Upload, Plus, Calendar } from 'lucide-react';
import { format, isSameDay } from 'date-fns';
import LabHeader from './header';
import { getOrders, updateOrderStatus as updateOrderStatusSvc, submitOrderResults as submitOrderResultsSvc, getDashboardSummary } from '../../services/labService';


const LabTechnicianDashboard = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  
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
    if (darkMode) {
      switch (status) {
        case 'active': return 'bg-blue-900 bg-opacity-30 text-blue-300 border border-blue-700';
        case 'completed': return 'bg-green-900 bg-opacity-30 text-green-300 border border-green-700';
        case 'on-hold': return 'bg-yellow-900 bg-opacity-30 text-yellow-300 border border-yellow-700';
        case 'revoked': return 'bg-red-900 bg-opacity-30 text-red-300 border border-red-700';
        default: return 'bg-gray-700 bg-opacity-30 text-gray-300 border border-gray-600';
      }
    } else {
      switch (status) {
        case 'active': return 'bg-blue-50 text-blue-700 border border-blue-200';
        case 'completed': return 'bg-green-50 text-green-700 border border-green-200';
        case 'on-hold': return 'bg-yellow-50 text-yellow-700 border border-yellow-200';
        case 'revoked': return 'bg-red-50 text-red-700 border border-red-200';
        default: return 'bg-gray-50 text-gray-700 border border-gray-200';
      }
    }
  };

  const getStatusDisplayName = (status) => {
    switch (status) {
      case 'active': return t('active');
      case 'completed': return t('completed');
      case 'on-hold': return t('onHold');
      case 'revoked': return t('revoked');
      default: return status;
    }
  };

  const getNextStatusAction = (status) => {
    switch (status) {
      case 'active': return { action: t('markAsCompleted'), nextStatus: 'completed', color: darkMode ? 'bg-green-600' : 'bg-green-500' };
      case 'completed': return null;
      case 'on-hold': return { action: t('resumeProcessing'), nextStatus: 'active', color: darkMode ? 'bg-blue-600' : 'bg-blue-500' };
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
    <div className={`rounded-lg shadow-sm border p-6 hover:shadow-md transition-all duration-200 ${
      darkMode 
        ? 'bg-[#0D2026] border-[#133037]' 
        : 'bg-white border-gray-100'
    }`}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-4">
          <div className={`px-3 py-1 rounded-lg text-sm font-medium min-w-[70px] text-center ${
            darkMode 
              ? 'bg-[#79CAC2] bg-opacity-20 text-[#79CAC2]' 
              : 'bg-teal-100 text-teal-800'
          }`}>
            {order.orderTime}
          </div>
          <div>
            <h3 className={`font-semibold text-lg ${
              darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
            }`}>{order.patientName}</h3>
            <p className={`text-sm ${
              darkMode ? 'text-[#C1D9DD]' : 'text-gray-600'
            }`}>
              {order.tests && order.tests.length > 0 
                ? `${order.tests.length} ${order.tests.length > 1 ? t('tests') : t('test')} - ${order.tests.map(t => t.name).join(', ')}`
                : t('noTestsSpecified')}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <span className={`text-sm ${
            darkMode ? 'text-[#8AA2A7]' : 'text-gray-500'
          }`}>{t('provider')}: {order.physician}</span>
          <button 
            onClick={() => setSelectedOrder(order)}
            className={`px-4 py-2 rounded-lg transition-colors ${
              darkMode
                ? 'bg-[#79CAC2] hover:bg-[#58B4AA] text-[#050C0F]'
                : 'bg-teal-500 hover:bg-teal-600 text-white'
            }`}
          >
            {t('view')}
          </button>
        </div>
      </div>
      
      <div className="flex items-center justify-between">
        <div className="flex space-x-4">
          <span className={`px-3 py-1 rounded-lg text-sm ${getStatusColor(order.status)}`}>
            {getStatusDisplayName(order.status)}
          </span>
          {order.priority === 'urgent' && (
            <span className={`px-3 py-1 rounded-lg text-sm border ${
              darkMode
                ? 'bg-red-900 bg-opacity-30 text-red-300 border-red-700'
                : 'bg-red-100 text-red-700 border-red-200'
            }`}>
              {t('urgent')}
            </span>
          )}
        </div>
        <div className={`text-sm ${
          darkMode ? 'text-[#8AA2A7]' : 'text-gray-500'
        }`}>
          {t('order')}: {order.id} • {order.tests.length} {order.tests.length > 1 ? t('tests') : t('test')}
        </div>
      </div>
    </div>
  );

  const QuickActionsCard = () => (
    <div className={`rounded-lg shadow-sm border p-6 ${
      darkMode 
        ? 'bg-[#0D2026] border-[#133037]' 
        : 'bg-white border-gray-200'
    }`}>
      <h3 className={`font-semibold mb-4 border-l-4 pl-3 ${
        darkMode
          ? 'text-[#F5FEFF] border-[#79CAC2]'
          : 'text-gray-900 border-teal-500'
      }`}>{t('quickActions')}</h3>
      <div className="space-y-3">
        <button 
          onClick={() => navigate('/lab/reports/new')}
          className={`w-full py-3 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2 ${
            darkMode
              ? 'bg-[#79CAC2] hover:bg-[#58B4AA] text-[#050C0F]'
              : 'bg-teal-500 hover:bg-teal-600 text-white'
          }`}
        >
          <Plus className="w-4 h-4" />
          <span>{t('newLabOrder')}</span>
        </button>
        <button 
          onClick={() => navigate('/lab/orders?status=active')}
          className={`w-full border py-3 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2 ${
            darkMode
              ? 'border-[#79CAC2] text-[#79CAC2] hover:bg-[#133037]'
              : 'border-teal-500 text-teal-700 hover:bg-teal-50'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>{t('activeOrders')}</span>
          <span className={`text-white text-xs rounded-full px-2 py-1 ml-2 ${
            darkMode ? 'bg-red-600' : 'bg-red-500'
          }`}>
            {labOrders.filter(o => o.status === 'active').length}
          </span>
        </button>
        <button 
          onClick={() => navigate('/lab/orders?status=pending')}
          className={`w-full border py-3 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2 ${
            darkMode
              ? 'border-[#133037] text-[#C1D9DD] hover:bg-[#133037]'
              : 'border-gray-300 text-gray-700 hover:bg-gray-50'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>{t('inProgress')}</span>
          <span className={`text-white text-xs rounded-full px-2 py-1 ml-2 ${
            darkMode ? 'bg-yellow-600' : 'bg-yellow-500'
          }`}>
            {labOrders.filter(o => o.status === 'pending' || o.status === 'active').length}
          </span>
        </button>
        <button 
          onClick={() => navigate('/lab/orders?status=completed')}
          className={`w-full border py-3 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2 ${
            darkMode
              ? 'border-[#133037] text-[#C1D9DD] hover:bg-[#133037]'
              : 'border-gray-300 text-gray-700 hover:bg-gray-50'
          }`}
        >
          <CheckCircle className="w-4 h-4" />
          <span>{t('completedOrders')}</span>
          <span className={`text-white text-xs rounded-full px-2 py-1 ml-2 ${
            darkMode ? 'bg-purple-600' : 'bg-purple-500'
          }`}>
            {labOrders.filter(o => o.status === 'completed').length}
          </span>
        </button>
        <button 
          onClick={() => navigate('/lab/reports')}
          className={`w-full border py-3 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2 ${
            darkMode
              ? 'border-[#133037] text-[#C1D9DD] hover:bg-[#133037]'
              : 'border-gray-300 text-gray-700 hover:bg-gray-50'
          }`}
        >
          <Send className="w-4 h-4" />
          <span>{t('finalizedReports')}</span>
          <span className={`text-white text-xs rounded-full px-2 py-1 ml-2 ${
            darkMode ? 'bg-green-600' : 'bg-green-500'
          }`}>
            {dashboardSummary?.reports_completed || 0}
          </span>
        </button>
      </div>
    </div>
  );

  const TodaySummaryCard = () => (
    <div className={`rounded-lg shadow-sm border p-6 ${
      darkMode
        ? 'bg-gradient-to-br from-[#0D2026] to-[#07181D] border-[#133037]'
        : 'bg-gradient-to-br from-teal-50 to-blue-50 border-teal-200'
    }`}>
      <h3 className={`text-lg font-semibold mb-4 border-l-4 pl-3 ${
        darkMode
          ? 'text-[#F5FEFF] border-[#79CAC2]'
          : 'text-gray-900 border-teal-500'
      }`}>{t('todaysSummary')}</h3>
      {loading ? (
        <div className="space-y-3">
          <div className="animate-pulse">
            <div className={`h-4 rounded w-3/4 mb-2 ${
              darkMode ? 'bg-[#133037]' : 'bg-gray-200'
            }`}></div>
            <div className={`h-4 rounded w-1/2 ${
              darkMode ? 'bg-[#133037]' : 'bg-gray-200'
            }`}></div>
          </div>
          <div className="animate-pulse">
            <div className={`h-4 rounded w-3/4 mb-2 ${
              darkMode ? 'bg-[#133037]' : 'bg-gray-200'
            }`}></div>
            <div className={`h-4 rounded w-1/2 ${
              darkMode ? 'bg-[#133037]' : 'bg-gray-200'
            }`}></div>
          </div>
          <div className="animate-pulse">
            <div className={`h-4 rounded w-3/4 mb-2 ${
              darkMode ? 'bg-[#133037]' : 'bg-gray-200'
            }`}></div>
            <div className={`h-4 rounded w-1/2 ${
              darkMode ? 'bg-[#133037]' : 'bg-gray-200'
            }`}></div>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className={`text-sm ${
              darkMode ? 'text-[#C1D9DD]' : 'text-gray-600'
            }`}>{t('pendingOrders')}</span>
            <span className={`text-lg font-bold ${
              darkMode ? 'text-orange-400' : 'text-orange-600'
            }`}>
              {dashboardSummary?.orders_pending || 0}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className={`text-sm ${
              darkMode ? 'text-[#C1D9DD]' : 'text-gray-600'
            }`}>{t('inProgress')}</span>
            <span className={`text-lg font-bold ${
              darkMode ? 'text-blue-400' : 'text-blue-600'
            }`}>
              {dashboardSummary?.orders_total - dashboardSummary?.orders_pending - dashboardSummary?.orders_completed || 0}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className={`text-sm ${
              darkMode ? 'text-[#C1D9DD]' : 'text-gray-600'
            }`}>{t('completed')}</span>
            <span className={`text-lg font-bold ${
              darkMode ? 'text-green-400' : 'text-green-600'
            }`}>
              {dashboardSummary?.orders_completed || 0}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className={`text-sm ${
              darkMode ? 'text-[#C1D9DD]' : 'text-gray-600'
            }`}>{t('totalOrders')}</span>
            <span className={`text-lg font-bold ${
              darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
            }`}>
              {dashboardSummary?.orders_total || 0}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className={`text-sm ${
              darkMode ? 'text-[#C1D9DD]' : 'text-gray-600'
            }`}>{t('urgentOrders')}</span>
            <span className={`text-lg font-bold ${
              darkMode ? 'text-red-400' : 'text-red-600'
            }`}>
              {dashboardSummary?.orders_urgent || 0}
            </span>
          </div>
        </div>
      )}
    </div>
  );

  const OrderDetailsModal = ({ order }) => (
    <div className={`rounded-lg shadow-sm border p-6 ${
      darkMode 
        ? 'bg-[#0D2026] border-[#133037]' 
        : 'bg-white border-gray-100'
    }`}>
      <div className="flex justify-between items-start mb-6">
        <div>
          <h2 className={`text-xl font-bold ${
            darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
          }`}>{order.patientName}</h2>
          <p className={darkMode ? 'text-[#C1D9DD]' : 'text-gray-600'}>
            {t('patientId')}: {order.patientId} • {order.age}Y, {order.gender}
          </p>
          <p className={`text-sm mt-1 ${
            darkMode ? 'text-[#8AA2A7]' : 'text-gray-500'
          }`}>{order.description}</p>
        </div>
        <div className="text-right">
          <span className={`px-3 py-1 rounded-lg text-sm ${getStatusColor(order.status)}`}>
            {getStatusDisplayName(order.status)}
          </span>
          <p className={`text-sm mt-2 ${
            darkMode ? 'text-[#C1D9DD]' : 'text-gray-600'
          }`}>{t('order')}: {order.id}</p>
          <p className={`text-xs ${
            darkMode ? 'text-[#8AA2A7]' : 'text-gray-500'
          }`}>{order.orderDate} {t('at')} {order.orderTime}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className={`rounded-lg p-4 ${
          darkMode ? 'bg-[#07181D]' : 'bg-gray-50'
        }`}>
          <h3 className={`font-semibold mb-2 ${
            darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
          }`}>{t('orderingPhysician')}</h3>
          <p className={darkMode ? 'text-[#C1D9DD]' : 'text-gray-700'}>{order.physician}</p>
        </div>
        <div className={`rounded-lg p-4 ${
          darkMode ? 'bg-[#07181D]' : 'bg-gray-50'
        }`}>
          <h3 className={`font-semibold mb-2 ${
            darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
          }`}>{t('priority')}</h3>
          <div className="flex items-center gap-2">
            {order.priority === 'urgent' ? (
              <AlertCircle className={`w-4 h-4 ${darkMode ? 'text-red-400' : 'text-red-500'}`} />
            ) : (
              <Clock className={`w-4 h-4 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`} />
            )}
            <span className={`capitalize ${
              darkMode ? 'text-[#C1D9DD]' : 'text-gray-700'
            }`}>{order.priority === 'urgent' ? t('urgent') : order.priority}</span>
          </div>
        </div>
      </div>

      {order.notes && (
        <div className={`mb-6 rounded-lg p-4 border-l-4 ${
          darkMode
            ? 'bg-blue-900 bg-opacity-30 border-blue-700'
            : 'bg-blue-50 border-blue-500'
        }`}>
          <h3 className={`font-semibold mb-2 ${
            darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
          }`}>{t('clinicalNotes')}</h3>
          <p className={darkMode ? 'text-[#C1D9DD]' : 'text-gray-700'}>{order.notes}</p>
        </div>
      )}

      <div className="mb-6">
        <h3 className={`font-semibold mb-4 border-l-4 pl-3 ${
          darkMode
            ? 'text-[#F5FEFF] border-[#79CAC2]'
            : 'text-gray-900 border-teal-500'
        }`}>{t('orderedTests')}</h3>
        <div className="space-y-3">
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
                }`}>{test.id}</span>
              </div>
              <div className={`grid grid-cols-2 gap-4 text-sm ${
                darkMode ? 'text-[#C1D9DD]' : 'text-gray-600'
              }`}>
                <div>
                  <span className="font-medium">{t('type')}:</span> {test.type}
                </div>
                <div>
                  <span className="font-medium">{t('unit')}:</span> {test.unit}
                </div>
                <div className="col-span-2">
                  <span className="font-medium">{t('normalRange')}:</span> {test.normalRange}
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
            className={`px-6 py-2 rounded-lg transition-colors flex items-center gap-2 ${
              darkMode
                ? 'bg-orange-600 hover:bg-orange-700 text-white'
                : 'bg-orange-500 hover:bg-orange-600 text-white'
            }`}
          >
            <Plus className="w-4 h-4" />
            {t('enterResults')}
          </button>
        )}
        <button className={`border px-6 py-2 rounded-lg transition-colors flex items-center gap-2 ${
          darkMode
            ? 'border-[#133037] text-[#C1D9DD] hover:bg-[#133037]'
            : 'border-gray-300 text-gray-700 hover:bg-gray-50'
        }`}>
          <Upload className="w-4 h-4" />
          {t('uploadFiles')}
        </button>
        <button 
          onClick={() => setSelectedOrder(null)}
          className={`border px-6 py-2 rounded-lg transition-colors ${
            darkMode
              ? 'border-[#133037] text-[#C1D9DD] hover:bg-[#133037]'
              : 'border-gray-300 text-gray-700 hover:bg-gray-50'
          }`}
        >
          {t('close')}
        </button>
      </div>
    </div>
  );

  const ResultEntryForm = ({ order }) => (
    <div className={`rounded-lg shadow-sm border p-6 ${
      darkMode 
        ? 'bg-[#0D2026] border-[#133037]' 
        : 'bg-white border-gray-100'
    }`}>
      <h3 className={`text-lg font-semibold mb-4 border-l-4 pl-3 ${
        darkMode
          ? 'text-[#F5FEFF] border-[#79CAC2]'
          : 'text-gray-900 border-teal-500'
      }`}>{t('enterTestResults')}</h3>
      <p className={`mb-6 ${
        darkMode ? 'text-[#C1D9DD]' : 'text-gray-600'
      }`}>{t('patient')}: {order.patientName} | {t('order')}: {order.id}</p>
      
      <div className="space-y-6">
        {order.tests.map(test => (
          <div key={test.id} className={`rounded-lg p-4 border ${
            darkMode
              ? 'bg-[#07181D] border-[#133037]'
              : 'bg-gray-50 border-gray-200'
          }`}>
            <h4 className={`font-medium mb-3 ${
              darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
            }`}>{test.name}</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={`block text-sm font-medium mb-1 ${
                  darkMode ? 'text-[#C1D9DD]' : 'text-gray-700'
                }`}>
                  {t('resultValue')}
                </label>
                <input
                  type="text"
                  className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 transition-colors ${
                    darkMode
                      ? 'bg-[#0D2026] border-[#133037] text-[#F5FEFF] placeholder-[#8AA2A7] focus:ring-[#79CAC2] focus:border-[#79CAC2]'
                      : 'border-gray-300 focus:ring-teal-500 focus:border-teal-500'
                  }`}
                  placeholder={`${t('enterValue')} (${test.unit})`}
                  value={results[test.id]?.value || ''}
                  onChange={(e) => handleResultChange(test.id, 'value', e.target.value)}
                />
                <p className={`text-xs mt-1 ${
                  darkMode ? 'text-[#8AA2A7]' : 'text-gray-500'
                }`}>{t('normal')}: {test.normalRange}</p>
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 ${
                  darkMode ? 'text-[#C1D9DD]' : 'text-gray-700'
                }`}>
                  {t('status')}
                </label>
                <select
                  className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 transition-colors ${
                    darkMode
                      ? 'bg-[#0D2026] border-[#133037] text-[#F5FEFF] focus:ring-[#79CAC2] focus:border-[#79CAC2]'
                      : 'border-gray-300 focus:ring-teal-500 focus:border-teal-500'
                  }`}
                  value={results[test.id]?.status || 'normal'}
                  onChange={(e) => handleResultChange(test.id, 'status', e.target.value)}
                >
                  <option value="normal">{t('normal')}</option>
                  <option value="abnormal">{t('abnormal')}</option>
                  <option value="critical">{t('critical')}</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className={`block text-sm font-medium mb-1 ${
                  darkMode ? 'text-[#C1D9DD]' : 'text-gray-700'
                }`}>
                  {t('notes')}
                </label>
                <textarea
                  className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 transition-colors ${
                    darkMode
                      ? 'bg-[#0D2026] border-[#133037] text-[#F5FEFF] placeholder-[#8AA2A7] focus:ring-[#79CAC2] focus:border-[#79CAC2]'
                      : 'border-gray-300 focus:ring-teal-500 focus:border-teal-500'
                  }`}
                  rows="2"
                  placeholder={t('addAnyNotesOrComments')}
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
          className={`px-6 py-2 rounded-lg transition-colors flex items-center gap-2 ${
            darkMode
              ? 'bg-[#79CAC2] hover:bg-[#58B4AA] text-[#050C0F]'
              : 'bg-teal-500 hover:bg-teal-600 text-white'
          }`}
        >
          <Send className="w-4 h-4" />
          {t('submitResults')}
        </button>
        <button 
          onClick={() => setShowResultEntry(false)}
          className={`border px-6 py-2 rounded-lg transition-colors ${
            darkMode
              ? 'border-[#133037] text-[#C1D9DD] hover:bg-[#133037]'
              : 'border-gray-300 text-gray-700 hover:bg-gray-50'
          }`}
        >
          {t('cancel')}
        </button>
      </div>
    </div>
  );

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
                <div className={`rounded-lg shadow-sm border p-6 ${
                  darkMode
                    ? 'bg-[#0D2026] border-[#133037]'
                    : 'bg-white border-gray-100'
                }`}>
                  <div className="animate-pulse">
                    <div className={`h-6 rounded w-1/4 mb-4 ${
                      darkMode ? 'bg-[#133037]' : 'bg-gray-200'
                    }`}></div>
                    <div className="space-y-3">
                      <div className={`h-4 rounded w-3/4 ${
                        darkMode ? 'bg-[#133037]' : 'bg-gray-200'
                      }`}></div>
                      <div className={`h-4 rounded w-1/2 ${
                        darkMode ? 'bg-[#133037]' : 'bg-gray-200'
                      }`}></div>
                      <div className={`h-4 rounded w-2/3 ${
                        darkMode ? 'bg-[#133037]' : 'bg-gray-200'
                      }`}></div>
                    </div>
                  </div>
                </div>
                <div className={`rounded-lg shadow-sm border p-6 ${
                  darkMode
                    ? 'bg-[#0D2026] border-[#133037]'
                    : 'bg-white border-gray-100'
                }`}>
                  <div className="animate-pulse">
                    <div className={`h-6 rounded w-1/3 mb-4 ${
                      darkMode ? 'bg-[#133037]' : 'bg-gray-200'
                    }`}></div>
                    <div className="space-y-3">
                      <div className={`h-4 rounded w-3/4 ${
                        darkMode ? 'bg-[#133037]' : 'bg-gray-200'
                      }`}></div>
                      <div className={`h-4 rounded w-1/2 ${
                        darkMode ? 'bg-[#133037]' : 'bg-gray-200'
                      }`}></div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Lab Orders for Today */}
                <div className={`rounded-lg shadow-sm border p-6 ${
                  darkMode
                    ? 'bg-[#0D2026] border-[#133037]'
                    : 'bg-white border-gray-100'
                }`}>
                  <div className="flex items-center justify-between mb-6">
                    <h2 className={`text-lg font-semibold border-l-4 pl-3 ${
                      darkMode
                        ? 'text-[#F5FEFF] border-[#79CAC2]'
                        : 'text-gray-900 border-teal-500'
                    }`}>
                      {t('labOrdersFor')} {format(selectedDate, 'MMMM d, yyyy')}
                    </h2>
                    <span className={`text-sm ${
                      darkMode ? 'text-[#79CAC2]' : 'text-teal-500'
                    }`}>{getOrdersForDate(selectedDate).length} {t('orders')}</span>
                  </div>
                  
                  <div className="space-y-4">
                    {getOrdersForDate(selectedDate).length > 0 ? (
                      getOrdersForDate(selectedDate).map(order => (
                        <OrderCard key={order.id} order={order} />
                      ))
                    ) : (
                      <div className="text-center py-12">
                        <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 ${
                          darkMode
                            ? 'bg-gradient-to-br from-[#133037] to-[#07181D]'
                            : 'bg-gradient-to-br from-gray-100 to-gray-200'
                        }`}>
                          <FileText className={`w-10 h-10 ${
                            darkMode ? 'text-[#8AA2A7]' : 'text-gray-400'
                          }`} />
                        </div>
                        <p className={`font-medium ${
                          darkMode ? 'text-[#C1D9DD]' : 'text-gray-500'
                        }`}>{t('noLabOrdersScheduled')}</p>
                        <p className={`text-sm ${
                          darkMode ? 'text-[#8AA2A7]' : 'text-gray-400'
                        }`}>{t('for')} {format(selectedDate, 'MMMM d, yyyy')}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Sample Processing Queue */}
                <div className={`rounded-lg shadow-sm border p-6 ${
                  darkMode
                    ? 'bg-[#0D2026] border-[#133037]'
                    : 'bg-white border-gray-100'
                }`}>
                  <div className="flex items-center justify-between mb-6">
                    <h2 className={`text-lg font-semibold border-l-4 pl-3 ${
                      darkMode
                        ? 'text-[#F5FEFF] border-[#79CAC2]'
                        : 'text-gray-900 border-teal-500'
                    }`}>
                      {t('sampleProcessingQueue')}
                    </h2>
                    <span className={`text-sm ${
                      darkMode ? 'text-[#79CAC2]' : 'text-teal-500'
                    }`}>{labOrders.filter(o => o.status === 'active').length} {t('active')}</span>
                  </div>
                  
                  {labOrders.filter(order => order.status === 'active').map(order => (
                    <div key={order.id} className={`border rounded-lg p-6 mb-4 ${
                      darkMode
                        ? 'bg-[#0D2026] border-[#133037]'
                        : 'bg-white border-gray-200'
                    }`}>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-4">
                          <div className={`px-3 py-1 rounded-lg text-sm font-medium min-w-[70px] text-center ${
                            darkMode
                              ? 'bg-[#79CAC2] bg-opacity-20 text-[#79CAC2]'
                              : 'bg-teal-100 text-teal-800'
                          }`}>
                            {order.orderTime}
                          </div>
                          <div>
                            <h3 className={`font-semibold text-lg ${
                              darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
                            }`}>{order.patientName}</h3>
                            <p className={`text-sm ${
                              darkMode ? 'text-[#C1D9DD]' : 'text-gray-600'
                            }`}>{order.description}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-3">
                          <span className={`text-sm ${
                            darkMode ? 'text-[#8AA2A7]' : 'text-gray-500'
                          }`}>{t('provider')}: {order.physician}</span>
                          <button 
                            onClick={() => updateOrderStatus(order.id, 'received')}
                            className={`px-4 py-2 rounded-lg transition-colors ${
                              darkMode
                                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                                : 'bg-blue-500 hover:bg-blue-600 text-white'
                            }`}
                          >
                            {t('markAsReceived')}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {labOrders.filter(o => o.status === 'not-received').length === 0 && (
                    <div className={`text-center py-8 ${
                      darkMode ? 'text-[#8AA2A7]' : 'text-gray-500'
                    }`}>
                      <FileText className={`w-12 h-12 mx-auto mb-4 ${
                        darkMode ? 'text-[#133037]' : 'text-gray-300'
                      }`} />
                      <p>{t('allSamplesHaveBeenReceived')}</p>
                    </div>
                  )}
                </div>

                {/* Processing Status */}
                <div className={`rounded-lg shadow-sm border p-6 ${
                  darkMode
                    ? 'bg-[#0D2026] border-[#133037]'
                    : 'bg-white border-gray-100'
                }`}>
                  <div className="flex items-center justify-between mb-6">
                    <h2 className={`text-lg font-semibold border-l-4 pl-3 ${
                      darkMode
                        ? 'text-[#F5FEFF] border-[#79CAC2]'
                        : 'text-gray-900 border-teal-500'
                    }`}>
                      {t('testsInProgress')}
                    </h2>
                    <span className={`text-sm ${
                      darkMode ? 'text-[#79CAC2]' : 'text-teal-500'
                    }`}>{labOrders.filter(o => ['received', 'pending'].includes(o.status)).length} {t('processing')}</span>
                  </div>
                  
                  {labOrders.filter(order => ['received', 'pending'].includes(order.status)).map(order => (
                    <div key={order.id} className={`border rounded-lg p-6 mb-4 ${
                      darkMode
                        ? 'bg-[#0D2026] border-[#133037]'
                        : 'bg-white border-gray-200'
                    }`}>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-4">
                          <div className={`px-3 py-1 rounded-lg text-sm font-medium min-w-[70px] text-center ${
                            darkMode
                              ? 'bg-[#79CAC2] bg-opacity-20 text-[#79CAC2]'
                              : 'bg-teal-100 text-teal-800'
                          }`}>
                            {order.orderTime}
                          </div>
                          <div>
                            <h3 className={`font-semibold text-lg ${
                              darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
                            }`}>{order.patientName}</h3>
                            <p className={`text-sm ${
                              darkMode ? 'text-[#C1D9DD]' : 'text-gray-600'
                            }`}>{order.description}</p>
                            <span className={`inline-block px-2 py-1 rounded text-xs mt-1 ${getStatusColor(order.status)}`}>
                              {getStatusDisplayName(order.status)}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center space-x-3">
                          <span className={`text-sm ${
                            darkMode ? 'text-[#8AA2A7]' : 'text-gray-500'
                          }`}>{t('provider')}: {order.physician}</span>
                          <button 
                            onClick={() => setSelectedOrder(order)}
                            className={`border px-4 py-2 rounded-lg transition-colors ${
                              darkMode
                                ? 'border-[#79CAC2] text-[#79CAC2] hover:bg-[#133037]'
                                : 'border-teal-500 text-teal-700 hover:bg-teal-50'
                            }`}
                          >
                            {t('process')}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {labOrders.filter(o => ['received', 'pending'].includes(o.status)).length === 0 && (
                    <div className={`text-center py-8 ${
                      darkMode ? 'text-[#8AA2A7]' : 'text-gray-500'
                    }`}>
                      <Clock className={`w-12 h-12 mx-auto mb-4 ${
                        darkMode ? 'text-[#133037]' : 'text-gray-300'
                      }`} />
                      <p>{t('noTestsCurrentlyInProgress')}</p>
                    </div>
                  )}
                </div>

                {/* Ready for Delivery */}
                <div className={`rounded-lg shadow-sm border p-6 ${
                  darkMode
                    ? 'bg-[#0D2026] border-[#133037]'
                    : 'bg-white border-gray-100'
                }`}>
                  <div className="flex items-center justify-between mb-6">
                    <h2 className={`text-lg font-semibold border-l-4 pl-3 ${
                      darkMode
                        ? 'text-[#F5FEFF] border-[#79CAC2]'
                        : 'text-gray-900 border-teal-500'
                    }`}>
                      {t('readyForDelivery')}
                    </h2>
                    <span className={`text-sm ${
                      darkMode ? 'text-[#79CAC2]' : 'text-teal-500'
                    }`}>{labOrders.filter(o => o.status === 'completed').length} {t('completed')}</span>
                  </div>
                  
                  {labOrders.filter(order => order.status === 'completed').map(order => (
                    <div key={order.id} className={`border rounded-lg p-6 mb-4 ${
                      darkMode
                        ? 'bg-purple-900 bg-opacity-20 border-purple-700'
                        : 'bg-purple-50 border-purple-200'
                    }`}>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-4">
                          <div className={`px-3 py-1 rounded-lg text-sm font-medium min-w-[70px] text-center ${
                            darkMode
                              ? 'bg-[#79CAC2] bg-opacity-20 text-[#79CAC2]'
                              : 'bg-teal-100 text-teal-800'
                          }`}>
                            {order.orderTime}
                          </div>
                          <div>
                            <h3 className={`font-semibold text-lg ${
                              darkMode ? 'text-[#F5FEFF]' : 'text-gray-900'
                            }`}>{order.patientName}</h3>
                            <p className={`text-sm ${
                              darkMode ? 'text-[#C1D9DD]' : 'text-gray-600'
                            }`}>{order.description}</p>
                            <span className={`inline-block px-2 py-1 rounded text-xs mt-1 border ${
                              darkMode
                                ? 'bg-purple-900 bg-opacity-30 text-purple-300 border-purple-700'
                                : 'bg-purple-100 text-purple-700 border-purple-200'
                            }`}>
                              {t('readyForDelivery')}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center space-x-3">
                          <span className={`text-sm ${
                            darkMode ? 'text-[#8AA2A7]' : 'text-gray-500'
                          }`}>{t('provider')}: {order.physician}</span>
                          <button 
                            onClick={() => updateOrderStatus(order.id, 'completed')}
                            className={`px-4 py-2 rounded-lg transition-colors ${
                              darkMode
                                ? 'bg-green-600 hover:bg-green-700 text-white'
                                : 'bg-green-500 hover:bg-green-600 text-white'
                            }`}
                          >
                            {t('sendResults')}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {labOrders.filter(o => o.status === 'completed').length === 0 && (
                    <div className={`text-center py-8 ${
                      darkMode ? 'text-[#8AA2A7]' : 'text-gray-500'
                    }`}>
                      <CheckCircle className={`w-12 h-12 mx-auto mb-4 ${
                        darkMode ? 'text-[#133037]' : 'text-gray-300'
                      }`} />
                      <p>{t('noResultsReadyForDelivery')}</p>
                    </div>
                  )}
                </div>

                {/* Completed Orders */}
                <div className={`rounded-lg shadow-sm border p-6 ${
                  darkMode
                    ? 'bg-[#0D2026] border-[#133037]'
                    : 'bg-white border-gray-100'
                }`}>
                  <div className="flex items-center justify-between mb-6">
                    <h2 className={`text-lg font-semibold border-l-4 pl-3 ${
                      darkMode
                        ? 'text-[#F5FEFF] border-[#79CAC2]'
                        : 'text-gray-900 border-teal-500'
                    }`}>
                      {t('completedOrders')}
                    </h2>
                    <span className={`text-sm ${
                      darkMode ? 'text-[#79CAC2]' : 'text-teal-500'
                    }`}>{labOrders.filter(o => o.status === 'completed').length} {t('completed')}</span>
                  </div>
                  
                  {labOrders.filter(order => order.status === 'completed').map(order => (
                    <div key={order.id} className={`border rounded-lg p-6 mb-4 ${
                      darkMode
                        ? 'bg-green-900 bg-opacity-20 border-green-700'
                        : 'bg-green-50 border-green-200'
                    }`}>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-4">
                          <div className={`px-3 py-1 rounded-lg text-sm font-medium min-w-[70px] text-center ${
                            darkMode
                              ? 'bg-gray-600 text-gray-300'
                              : 'bg-gray-300 text-gray-700'
                          }`}>
                            {order.orderTime}
                          </div>
                          <div>
                            <h3 className={`font-semibold text-lg ${
                              darkMode ? 'text-[#C1D9DD]' : 'text-gray-600'
                            }`}>{order.patientName}</h3>
                            <p className={`text-sm ${
                              darkMode ? 'text-[#8AA2A7]' : 'text-gray-500'
                            }`}>{order.description} - {t('completed')}</p>
                            <span className={`inline-block px-2 py-1 rounded text-xs mt-1 border ${
                              darkMode
                                ? 'bg-green-900 bg-opacity-30 text-green-300 border-green-700'
                                : 'bg-green-100 text-green-700 border-green-200'
                            }`}>
                              {t('resultsSent')}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center space-x-3">
                          <span className={`text-sm ${
                            darkMode ? 'text-[#8AA2A7]' : 'text-gray-400'
                          }`}>{t('provider')}: {order.physician}</span>
                          <button className={`border px-4 py-2 rounded-lg transition-colors ${
                            darkMode
                              ? 'border-[#133037] text-[#C1D9DD] hover:bg-[#133037]'
                              : 'border-gray-300 text-gray-600 hover:bg-gray-100'
                          }`}>
                            {t('viewReport')}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {labOrders.filter(o => o.status === 'completed').length === 0 && (
                    <div className={`text-center py-8 ${
                      darkMode ? 'text-[#8AA2A7]' : 'text-gray-500'
                    }`}>
                      <Send className={`w-12 h-12 mx-auto mb-4 ${
                        darkMode ? 'text-[#133037]' : 'text-gray-300'
                      }`} />
                      <p>{t('noCompletedOrdersYet')}</p>
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