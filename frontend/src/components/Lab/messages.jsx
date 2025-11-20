import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Send, Search, Filter, Clock, User, Stethoscope, FileText, AlertCircle, CheckCircle, Phone, Video, Paperclip, X, Loader } from 'lucide-react';
import { format, formatDistanceToNow, parseISO } from 'date-fns';
// Import the header component
import LabHeader from './header';
import { messagesAPI } from '../../services/labService';

const LabMessages = () => {
  const [selectedContact, setSelectedContact] = useState(null);
  const [message, setMessage] = useState('');
  const [activeTab, setActiveTab] = useState('all'); // all, urgent
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [clinicId, setClinicId] = useState('default');
  
  // Data states
  const [staffMembers, setStaffMembers] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [messages, setMessages] = useState([]);
  const [stats, setStats] = useState(null);
  
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const isSendingMessageRef = useRef(false); // Track if we're sending a message
  const currentRecipientIdRef = useRef(null); // Track current recipient to prevent polling interference

  // Get current user's organization_id for clinic_id
  const [currentUserId, setCurrentUserId] = useState(null);
  
  useEffect(() => {
    // Try to get clinic_id and user_id from user profile or use 'default'
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        if (user?.organization_id) {
          setClinicId(user.organization_id);
        }
        if (user?.id || user?.user_id) {
          setCurrentUserId(user.id || user.user_id);
        }
      } catch (e) {
        console.error('Error parsing user data:', e);
      }
    }
  }, []);

  // Load staff members
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const response = await messagesAPI.getStaff({ clinic_id: clinicId });
        if (active) {
          const staff = response?.data || response || [];
          setStaffMembers(staff);
        }
      } catch (e) {
        console.error('Error loading staff members:', e);
        if (active) setStaffMembers([]);
      }
    })();
    return () => { active = false };
  }, [clinicId]);

  // Load conversations with polling
  useEffect(() => {
    let active = true;
    setLoading(true);
    
    const loadConversations = async (showLoading = false) => {
      if (!active) return;
      
      try {
        if (showLoading) {
          setLoading(true);
        }
        const response = await messagesAPI.getConversations({ 
          clinic_id: clinicId,
          page: 1,
          size: 100
        });
        if (active) {
          const convs = response?.data?.items || response?.items || response?.data || [];
          setConversations(convs);
        }
      } catch (e) {
        console.error('Error loading conversations:', e);
        if (active) setConversations([]);
      } finally {
        if (active && showLoading) {
          setLoading(false);
        }
      }
    };
    
    // Initial load
    loadConversations(true);
    
    // Set up polling to refresh conversations list every 10 seconds to update unread counts
    const pollInterval = setInterval(() => {
      if (clinicId && !isSendingMessageRef.current) {
        loadConversations(false);
      }
    }, 10000); // Poll every 10 seconds
    
    return () => { 
      active = false;
      clearInterval(pollInterval);
    };
  }, [clinicId]);

  // Load message stats
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const response = await messagesAPI.getStats({ clinic_id: clinicId });
        if (active) {
          setStats(response?.data || response);
        }
      } catch (e) {
        console.error('Error loading message stats:', e);
      }
    })();
    return () => { active = false };
  }, [clinicId]);

  // Load messages when contact is selected
  useEffect(() => {
    if (!selectedContact) {
      setMessages([]);
      currentRecipientIdRef.current = null;
      return;
    }

    // Don't fetch if we're currently sending a message
    if (isSendingMessageRef.current) {
      console.log('Skipping fetchMessages - message send in progress');
      return;
    }

    const recipientId = selectedContact.id;
    currentRecipientIdRef.current = recipientId;

    let active = true;
    
    const loadMessages = async (showLoading = false) => {
      if (!active || isSendingMessageRef.current) return;
      
      // Don't fetch if we're sending to a different conversation
      if (currentRecipientIdRef.current !== recipientId) {
        console.log('Skipping fetchMessages - different conversation active');
        return;
      }

      try {
        const response = await messagesAPI.getConversationMessages(recipientId, {
          clinic_id: clinicId,
          limit: 100,
          offset: 0
        });
        if (active && currentRecipientIdRef.current === recipientId) {
          const msgs = response?.data?.messages || response?.messages || [];
          setMessages(msgs);
          
          // Mark conversation as read (only on initial load, not on polling)
          if (showLoading) {
            try {
              await messagesAPI.markConversationRead(recipientId, { clinic_id: clinicId });
              // Refresh conversations to update unread count
              const convResponse = await messagesAPI.getConversations({ 
                clinic_id: clinicId,
                page: 1,
                size: 100
              });
              const convs = convResponse?.data?.items || convResponse?.items || convResponse?.data || [];
              setConversations(convs);
            } catch (e) {
              console.error('Error marking conversation as read:', e);
            }
          }
        }
      } catch (e) {
        console.error('Error loading messages:', e);
        if (active) setMessages([]);
      }
    };

    // Initial load
    loadMessages(true);

    // Set up polling to fetch new messages every 3 seconds
    const pollInterval = setInterval(() => {
      if (active && selectedContact && clinicId && !isSendingMessageRef.current) {
        // Only poll if we're still viewing the same conversation
        if (currentRecipientIdRef.current === recipientId) {
          loadMessages(false);
        }
      }
    }, 3000); // Poll every 3 seconds

    return () => { 
      active = false;
      clearInterval(pollInterval);
    };
  }, [selectedContact, clinicId]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Find contact from conversations or staff members
  const getContactInfo = useCallback((contactId) => {
    // First try to find in conversations (use recipient_user_id only)
    const conv = conversations.find(c => {
      const convId = c.recipient_user_id;  // Only use recipient_user_id, not conversation_id
      return convId && (convId === contactId || String(convId) === String(contactId));
    });
    if (conv && conv.recipient_user_id) {
      // Skip if this is the current user
      if (conv.recipient_user_id === currentUserId || String(conv.recipient_user_id) === String(currentUserId)) {
        return null;
      }
      return {
        id: conv.recipient_user_id,  // Use recipient_user_id as the ID
        name: conv.patient_name || conv.recipient_name || 'Staff Member',
        role: conv.patient_issue || 'Staff',
        avatar: conv.patient_avatar || conv.recipient_avatar || (conv.patient_name ? conv.patient_name.split(' ').map(n => n[0]).join('').toUpperCase() : 'SM'),
        lastMessage: conv.last_message,
        lastMessageTime: conv.last_message_time,
        unread: conv.unread_count || 0,
        status: 'online'
      };
    }
    
    // Then try to find in staff members
    const staff = staffMembers.find(s => s.id === contactId || String(s.id) === String(contactId));
    if (staff) {
      // Skip if this is the current user
      if (staff.id && (staff.id === currentUserId || String(staff.id) === String(currentUserId))) {
        return null;
      }
      return {
        id: staff.id,
        name: staff.name,
        role: staff.role || 'Staff',
        avatar: staff.avatar || staff.name.split(' ').map(n => n[0]).join('').toUpperCase(),
        lastMessage: '',
        lastMessageTime: null,
        unread: 0,
        status: 'online'
      };
    }
    
    return null;
  }, [conversations, staffMembers, currentUserId]);

  // Handle contact selection
  const handleContactSelect = useCallback((contactId) => {
    const contact = getContactInfo(contactId);
    if (contact) {
      setSelectedContact(contact);
    }
  }, [getContactInfo]);

  // Handle send message
  const handleSend = useCallback(async () => {
    if (!message.trim() || !selectedContact || sending) return;

    const messageContent = message.trim();
    setMessage('');
    setSending(true);
    isSendingMessageRef.current = true; // Set flag to prevent polling interference

    try {
      await messagesAPI.send({
        recipient_id: selectedContact.id,
        content: messageContent,
        clinic_id: clinicId,
        message_type: 'text',
        priority: 'normal'
      });

      // Wait a bit for backend to process
      await new Promise(resolve => setTimeout(resolve, 500));

      // Reload messages
      const response = await messagesAPI.getConversationMessages(selectedContact.id, {
        clinic_id: clinicId,
        limit: 100,
        offset: 0
      });
      const msgs = response?.data?.messages || response?.messages || [];
      setMessages(msgs);

      // Reload conversations
      const convResponse = await messagesAPI.getConversations({ 
        clinic_id: clinicId,
        page: 1,
        size: 100
      });
      const convs = convResponse?.data?.items || convResponse?.items || convResponse?.data || [];
      setConversations(convs);
    } catch (e) {
      console.error('Error sending message:', e);
      alert('Failed to send message. Please try again.');
      setMessage(messageContent); // Restore message on error
    } finally {
      setSending(false);
      // Clear flag after a delay to allow message to be saved
      setTimeout(() => {
        isSendingMessageRef.current = false;
      }, 1000);
    }
  }, [message, selectedContact, clinicId, sending]);

  // Handle file upload
  const handleFileUpload = useCallback(async (file) => {
    if (!selectedContact || !file) return;

    isSendingMessageRef.current = true; // Set flag to prevent polling interference

    try {
      await messagesAPI.uploadAttachment(file, selectedContact.id, clinicId);
      
      // Wait a bit for backend to process
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Reload messages after attachment
      const response = await messagesAPI.getConversationMessages(selectedContact.id, {
        clinic_id: clinicId,
        limit: 100,
        offset: 0
      });
      const msgs = response?.data?.messages || response?.messages || [];
      setMessages(msgs);
      
      // Reload conversations to update unread count
      const convResponse = await messagesAPI.getConversations({ 
        clinic_id: clinicId,
        page: 1,
        size: 100
      });
      const convs = convResponse?.data?.items || convResponse?.items || convResponse?.data || [];
      setConversations(convs);
    } catch (e) {
      console.error('Error uploading attachment:', e);
      alert('Failed to upload attachment. Please try again.');
    } finally {
      // Clear flag after a delay to allow attachment to be saved
      setTimeout(() => {
        isSendingMessageRef.current = false;
      }, 1000);
    }
  }, [selectedContact, clinicId]);

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Combine conversations and staff members for display
  const allContacts = React.useMemo(() => {
    const contactMap = new Map();
    
    // Add conversations (filter out current user and conversations without recipient_user_id)
    conversations.forEach(conv => {
      // For staff conversations, we MUST have recipient_user_id (can't use thread ID)
      const contactId = conv.recipient_user_id;
      
      // Skip if no recipient_user_id or if this is the current user
      if (!contactId || contactId === currentUserId || String(contactId) === String(currentUserId)) {
        return;
      }
      
      contactMap.set(contactId, {
        id: contactId,  // Use recipient_user_id as the contact ID
        name: conv.patient_name || conv.recipient_name || 'Staff Member',
        role: conv.patient_issue || 'Staff',
        avatar: conv.patient_avatar || conv.recipient_avatar || (conv.patient_name ? conv.patient_name.split(' ').map(n => n[0]).join('').toUpperCase() : 'SM'),
        lastMessage: conv.last_message,
        lastMessageTime: conv.last_message_time,
        unread: conv.unread_count || 0,
        status: 'online',
        urgent: false
      });
    });
    
    // Add staff members not in conversations (filter out current user)
    staffMembers.forEach(staff => {
      // Skip if this is the current user
      if (staff.id && staff.id !== currentUserId && String(staff.id) !== String(currentUserId)) {
        if (!contactMap.has(staff.id)) {
          contactMap.set(staff.id, {
            id: staff.id,
            name: staff.name,
            role: staff.role || 'Staff',
            avatar: staff.avatar || staff.name.split(' ').map(n => n[0]).join('').toUpperCase(),
            lastMessage: '',
            lastMessageTime: null,
            unread: 0,
            status: 'online',
            urgent: false
          });
        }
      }
    });
    
    return Array.from(contactMap.values());
  }, [conversations, staffMembers, currentUserId]);

  const filteredContacts = allContacts.filter(contact => {
    const matchesSearch = contact.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         contact.role.toLowerCase().includes(searchTerm.toLowerCase());
    
    switch (activeTab) {
      case 'urgent':
        return contact.urgent && matchesSearch;
      default:
        return matchesSearch;
    }
  });

  const getStatusColor = (status) => {
    switch (status) {
      case 'online': return 'bg-green-500';
      case 'busy': return 'bg-yellow-500';
      default: return 'bg-gray-400';
    }
  };

  const formatMessageTime = (timeStr) => {
    if (!timeStr) return '';
    try {
      const date = parseISO(timeStr);
      return format(date, 'HH:mm');
    } catch {
      return timeStr;
    }
  };

  const formatLastActive = (timeStr) => {
    if (!timeStr) return '';
    try {
      const date = parseISO(timeStr);
      return formatDistanceToNow(date, { addSuffix: true });
    } catch {
      return timeStr;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <LabHeader />
      
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
                  placeholder="Search staff..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
              
              {/* Filter Tabs */}
              <div className="flex space-x-1">
                {[
                  { id: 'all', label: 'All', count: allContacts.length },
                  { id: 'urgent', label: 'Urgent', count: allContacts.filter(c => c.urgent).length }
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
              {loading ? (
                <div className="p-4 text-center">
                  <Loader className="w-6 h-6 animate-spin text-teal-500 mx-auto" />
                  <p className="text-sm text-gray-500 mt-2">Loading contacts...</p>
                </div>
              ) : filteredContacts.length === 0 ? (
                <div className="p-4 text-center text-gray-500">
                  <p className="text-sm">No staff members found</p>
                </div>
              ) : (
                filteredContacts.map((contact) => (
                  <div
                    key={contact.id}
                    onClick={() => handleContactSelect(contact.id)}
                    className={`p-4 border-b cursor-pointer transition-colors ${
                      selectedContact?.id === contact.id
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
                            <Stethoscope className="w-4 h-4 text-gray-400" />
                            {contact.urgent && <AlertCircle className="w-4 h-4 text-red-500" />}
                          </div>
                          <div className="flex items-center space-x-2">
                            {contact.lastMessageTime && (
                              <span className="text-xs text-gray-500">{formatLastActive(contact.lastMessageTime)}</span>
                            )}
                            {contact.unread > 0 && (
                              <span className="bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                                {contact.unread}
                              </span>
                            )}
                          </div>
                        </div>
                        <p className="text-sm text-gray-500 mb-1">{contact.role}</p>
                        {contact.lastMessage && (
                          <p className="text-sm text-gray-600 truncate">{contact.lastMessage}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Main Chat Area */}
          <div className="w-2/3 flex flex-col">
            {selectedContact ? (
              <>
                {/* Chat Header */}
                <div className="border-b px-6 py-4 bg-white">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="relative">
                        <div className="w-10 h-10 bg-teal-500 rounded-full flex items-center justify-center text-white font-semibold">
                          {selectedContact.avatar}
                        </div>
                        <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{selectedContact.name}</h3>
                        <p className="text-sm text-gray-500">{selectedContact.role}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <button className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
                        <Phone className="w-5 h-5" />
                      </button>
                      <button className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
                        <Video className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 p-6 bg-gray-50 overflow-y-auto space-y-4">
                  {messages.length === 0 ? (
                    <div className="text-center text-gray-500 py-12">
                      <p className="text-sm">No messages yet. Start the conversation!</p>
                    </div>
                  ) : (
                    messages.map((msg) => {
                      // Determine if message is from current user
                      const isMe = currentUserId && (
                        msg.sender_id === currentUserId || 
                        msg.sender_id === String(currentUserId) ||
                        (msg.sender && msg.sender.toLowerCase().includes('lab'))
                      );
                      return (
                        <div
                          key={msg.id || msg.message_id}
                          className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                        >
                          <div className={`max-w-xs lg:max-w-md px-4 py-3 rounded-lg ${
                            isMe
                              ? 'bg-teal-500 text-white'
                              : 'bg-white text-gray-900 border border-gray-200'
                          } ${msg.priority === 'urgent' ? 'ring-2 ring-red-500' : ''}`}>
                            {!isMe && (
                              <div className="flex items-center space-x-2 mb-2">
                                <span className="font-medium text-sm">{msg.sender_name || msg.sender || 'Staff Member'}</span>
                                {msg.priority === 'urgent' && <AlertCircle className="w-4 h-4 text-red-500" />}
                              </div>
                            )}
                            <p className="text-sm whitespace-pre-wrap">{msg.content || msg.message}</p>
                            {msg.attachments && msg.attachments.length > 0 && (
                              <div className="mt-2 space-y-1">
                                {msg.attachments.map((att, idx) => (
                                  <a
                                    key={idx}
                                    href={att.file_url || att.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs underline flex items-center gap-1"
                                  >
                                    <FileText className="w-3 h-3" />
                                    {att.file_name || att.filename || 'Attachment'}
                                  </a>
                                ))}
                              </div>
                            )}
                            <div className={`flex items-center justify-between mt-2 ${
                              isMe ? 'text-teal-100' : 'text-gray-500'
                            }`}>
                              <span className="text-xs">{formatMessageTime(msg.created_at || msg.timestamp)}</span>
                              {isMe && <CheckCircle className="w-3 h-3" />}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Message Input */}
                <div className="border-t px-6 py-4 bg-white">
                  <div className="flex items-center space-x-3">
                    <input
                      ref={fileInputRef}
                      type="file"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileUpload(file);
                        e.target.value = ''; // Reset input
                      }}
                    />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                      title="Attach file"
                    >
                      <Paperclip className="w-5 h-5" />
                    </button>
                    <div className="flex-1 relative">
                      <textarea
                        placeholder="Type your message..."
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        onKeyPress={handleKeyPress}
                        rows="2"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-teal-500"
                        disabled={sending}
                      />
                    </div>
                    <button
                      onClick={handleSend}
                      disabled={!message.trim() || sending}
                      className="p-3 bg-teal-500 hover:bg-teal-600 disabled:bg-gray-300 rounded-lg text-white transition-colors"
                    >
                      {sending ? (
                        <Loader className="w-5 h-5 animate-spin" />
                      ) : (
                        <Send className="w-5 h-5" />
                      )}
                    </button>
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
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center bg-gray-50">
                <div className="text-center">
                  <User className="w-20 h-20 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Select a Staff Member</h3>
                  <p className="text-gray-600">Choose a staff member from the list to start messaging</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LabMessages;
