import React, { useState } from 'react';
import { Send, Search, Filter, Clock, User, Stethoscope, FileText, AlertCircle, CheckCircle, Phone, Video } from 'lucide-react';
// Import the header component
import LabHeader from './header';

const LabMessages = () => {
  const [selectedContact, setSelectedContact] = useState('Dr. Sarah Wilson');
  const [message, setMessage] = useState('');
  const [activeTab, setActiveTab] = useState('all'); // all, doctors, patients, urgent
  const [searchTerm, setSearchTerm] = useState('');

  const contacts = [
    {
      id: 1,
      name: 'Dr. Sarah Wilson',
      role: 'Cardiologist',
      type: 'doctor',
      lastMessage: 'Please check the cardiac enzymes for patient #1247',
      time: '2 min ago',
      urgent: true,
      unread: 3,
      status: 'online',
      avatar: 'SW'
    },
    {
      id: 2,
      name: 'Dr. Michael Chen',
      role: 'Hematologist',
      type: 'doctor',
      lastMessage: 'CBC results look concerning, need immediate review',
      time: '15 min ago',
      urgent: true,
      unread: 1,
      status: 'online',
      avatar: 'MC'
    },
    {
      id: 3,
      name: 'Maria Rodriguez',
      role: 'Patient',
      type: 'patient',
      lastMessage: 'When will my test results be ready?',
      time: '1 hour ago',
      urgent: false,
      unread: 0,
      status: 'offline',
      avatar: 'MR'
    },
    {
      id: 4,
      name: 'Dr. James Foster',
      role: 'Emergency Medicine',
      type: 'doctor',
      lastMessage: 'Stat lab work needed for trauma patient',
      time: '2 hours ago',
      urgent: true,
      unread: 0,
      status: 'busy',
      avatar: 'JF'
    },
    {
      id: 5,
      name: 'Ahmed Hassan',
      role: 'Patient',
      type: 'patient',
      lastMessage: 'Thank you for the quick turnaround',
      time: '3 hours ago',
      urgent: false,
      unread: 0,
      status: 'offline',
      avatar: 'AH'
    },
    {
      id: 6,
      name: 'Dr. Lisa Park',
      role: 'Endocrinologist',
      type: 'doctor',
      lastMessage: 'HbA1c levels are improving',
      time: '1 day ago',
      urgent: false,
      unread: 0,
      status: 'online',
      avatar: 'LP'
    }
  ];

  const messages = [
    {
      id: 1,
      sender: 'Dr. Sarah Wilson',
      content: 'Hi, I need urgent review of cardiac enzymes for patient John Doe (ID: #1247). His chest pain symptoms are worsening.',
      time: '10:30 AM',
      isMe: false,
      urgent: true
    },
    {
      id: 2,
      sender: 'Lab Tech',
      content: 'Received the request. Processing the cardiac panel now. Troponin I, CK-MB, and Myoglobin will be ready in 45 minutes.',
      time: '10:32 AM',
      isMe: true,
      urgent: false
    },
    {
      id: 3,
      sender: 'Dr. Sarah Wilson',
      content: 'Perfect, thank you! Also, please flag if any values are critically high.',
      time: '10:33 AM',
      isMe: false,
      urgent: false
    },
    {
      id: 4,
      sender: 'Lab Tech',
      content: 'Will do. I\'ll call you directly if we see any critical values.',
      time: '10:35 AM',
      isMe: true,
      urgent: false
    },
    {
      id: 5,
      sender: 'Lab Tech',
      content: 'Update: Troponin I is elevated at 2.4 ng/mL (normal <0.04). Calling you now.',
      time: '11:15 AM',
      isMe: true,
      urgent: true
    }
  ];

  const filteredContacts = contacts.filter(contact => {
    const matchesSearch = contact.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         contact.role.toLowerCase().includes(searchTerm.toLowerCase());
    
    switch (activeTab) {
      case 'doctors':
        return contact.type === 'doctor' && matchesSearch;
      case 'patients':
        return contact.type === 'patient' && matchesSearch;
      case 'urgent':
        return contact.urgent && matchesSearch;
      default:
        return matchesSearch;
    }
  });

  const handleSend = () => {
    if (message.trim()) {
      console.log('Sent:', message);
      setMessage('');
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'online': return 'bg-green-500';
      case 'busy': return 'bg-yellow-500';
      default: return 'bg-gray-400';
    }
  };

  const getContactIcon = (type) => {
    return type === 'doctor' ? <Stethoscope className="w-4 h-4" /> : <User className="w-4 h-4" />;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <LabHeader />
      
      {/* Page Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Messages</h1>
              <p className="text-gray-600 mt-1">Communicate with doctors and patients</p>
            </div>
            <div className="flex items-center space-x-3">
              <button className="bg-teal-500 hover:bg-teal-600 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2">
                <Phone className="w-4 h-4" />
                Quick Call
              </button>
              <button className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg transition-colors flex items-center gap-2">
                <Video className="w-4 h-4" />
                Video Chat
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden h-[75vh]">
          
          {/* Left Sidebar - Contacts List */}
          <div className="w-1/3 border-r bg-gray-50 flex flex-col">
            {/* Search and Filter */}
            <div className="p-4 border-b">
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search contacts..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
              
              {/* Filter Tabs */}
              <div className="flex space-x-1">
                {[
                  { id: 'all', label: 'All', count: contacts.length },
                  { id: 'doctors', label: 'Doctors', count: contacts.filter(c => c.type === 'doctor').length },
                  { id: 'patients', label: 'Patients', count: contacts.filter(c => c.type === 'patient').length },
                  { id: 'urgent', label: 'Urgent', count: contacts.filter(c => c.urgent).length }
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-3 py-1 text-xs rounded-full transition-colors ${
                      activeTab === tab.id
                        ? 'bg-teal-500 text-white'
                        : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                    }`}
                  >
                    {tab.label} ({tab.count})
                  </button>
                ))}
              </div>
            </div>

            {/* Contacts List */}
            <div className="flex-1 overflow-y-auto">
              {filteredContacts.map((contact) => (
                <div
                  key={contact.id}
                  onClick={() => setSelectedContact(contact.name)}
                  className={`p-4 border-b cursor-pointer transition-colors ${
                    contact.name === selectedContact
                      ? 'bg-teal-50 border-l-4 border-l-teal-500'
                      : 'hover:bg-gray-100'
                  }`}
                >
                  <div className="flex items-start space-x-3">
                    <div className="relative">
                      <div className="w-10 h-10 bg-teal-500 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                        {contact.avatar}
                      </div>
                      <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-white ${getStatusColor(contact.status)}`}></div>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <h3 className="font-medium text-gray-900 truncate">{contact.name}</h3>
                          {getContactIcon(contact.type)}
                          {contact.urgent && <AlertCircle className="w-4 h-4 text-red-500" />}
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-xs text-gray-500">{contact.time}</span>
                          {contact.unread > 0 && (
                            <span className="bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                              {contact.unread}
                            </span>
                          )}
                        </div>
                      </div>
                      <p className="text-sm text-gray-500 mb-1">{contact.role}</p>
                      <p className="text-sm text-gray-600 truncate">{contact.lastMessage}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Main Chat Area */}
          <div className="w-2/3 flex flex-col">
            {/* Chat Header */}
            <div className="border-b px-6 py-4 bg-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="relative">
                    <div className="w-10 h-10 bg-teal-500 rounded-full flex items-center justify-center text-white font-semibold">
                      {selectedContact.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{selectedContact}</h3>
                    <p className="text-sm text-gray-500">
                      {contacts.find(c => c.name === selectedContact)?.role || 'Unknown'}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <button className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
                    <Phone className="w-5 h-5" />
                  </button>
                  <button className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
                    <Video className="w-5 h-5" />
                  </button>
                  <button className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
                    <FileText className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 p-6 bg-gray-50 overflow-y-auto space-y-4">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.isMe ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-xs lg:max-w-md px-4 py-3 rounded-lg ${
                    msg.isMe
                      ? 'bg-teal-500 text-white'
                      : 'bg-white text-gray-900 border border-gray-200'
                  } ${msg.urgent ? 'ring-2 ring-red-500' : ''}`}>
                    {!msg.isMe && (
                      <div className="flex items-center space-x-2 mb-2">
                        <span className="font-medium text-sm">{msg.sender}</span>
                        {msg.urgent && <AlertCircle className="w-4 h-4 text-red-500" />}
                      </div>
                    )}
                    <p className="text-sm">{msg.content}</p>
                    <div className={`flex items-center justify-between mt-2 ${
                      msg.isMe ? 'text-teal-100' : 'text-gray-500'
                    }`}>
                      <span className="text-xs">{msg.time}</span>
                      {msg.isMe && <CheckCircle className="w-3 h-3" />}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Message Input */}
            <div className="border-t px-6 py-4 bg-white">
              <div className="flex items-center space-x-3">
                <div className="flex-1 relative">
                  <textarea
                    placeholder="Type your message..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    rows="2"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <div className="flex flex-col space-y-2">
                  <button
                    onClick={handleSend}
                    disabled={!message.trim()}
                    className="p-3 bg-teal-500 hover:bg-teal-600 disabled:bg-gray-300 rounded-lg text-white transition-colors"
                  >
                    <Send className="w-5 h-5" />
                  </button>
                  <button className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
                    <AlertCircle className="w-4 h-4" />
                  </button>
                </div>
              </div>
              
              {/* Quick Actions */}
              <div className="flex items-center space-x-2 mt-3">
                <span className="text-xs text-gray-500">Quick actions:</span>
                {[
                  'Results ready',
                  'Need clarification',
                  'Sample received',
                  'Processing delay'
                ].map(action => (
                  <button
                    key={action}
                    onClick={() => setMessage(action)}
                    className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded-full text-gray-600 transition-colors"
                  >
                    {action}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LabMessages;