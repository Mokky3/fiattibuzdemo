import React, { useEffect, useState, useRef } from 'react'
import { Header } from './Header'
import { useTranslation } from 'react-i18next'
import { FiSend, FiPaperclip, FiX } from 'react-icons/fi'
import { doctorPatientsAPI, messagesAPI, checkBackendHealth } from '../../services/apiService'

const DoctorMessages = () => {
  const { t } = useTranslation()
  const [patients, setPatients] = useState([])
  const [selectedPatient, setSelectedPatient] = useState(null)
  const [messages, setMessages] = useState([])
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [messagesLoading, setMessagesLoading] = useState(false)
  const [error, setError] = useState(null)
  const [backendConnected, setBackendConnected] = useState(false)
  const [clinicId, setClinicId] = useState(null)
  const [currentUserId, setCurrentUserId] = useState(null)
  const [showDocumentModal, setShowDocumentModal] = useState(false)
  const [availableDocuments, setAvailableDocuments] = useState([])
  const [selectedDocuments, setSelectedDocuments] = useState([])
  const [documentsLoading, setDocumentsLoading] = useState(false)
  
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

  useEffect(() => {
    const fetchPatients = async (showLoading = false) => {
      try {
        if (showLoading) {
          setLoading(true)
        }
        
        // Check backend health
        const isHealthy = await checkBackendHealth()
        setBackendConnected(isHealthy)
        
        if (isHealthy) {
          try {
            // Get current user to get clinic_id
            const user = JSON.parse(localStorage.getItem('user') || '{}')
            const currentClinicId = user.clinic_id || user.organization_id || 'default'
            const userId = String(user.id || user.user_id || '')  // Ensure it's a string
            setClinicId(currentClinicId)
            setCurrentUserId(userId)
            console.log('Current user ID set to:', userId)
            
            // Fetch conversations (includes both patients and staff)
            const conversationsResponse = await messagesAPI.getConversations({ 
              clinic_id: currentClinicId,
              page: 1,
              size: 100
            })
            console.log('Full conversations response:', conversationsResponse)
            const conversationsData = conversationsResponse.data || conversationsResponse
            console.log('Conversations data object:', conversationsData)
            // PaginatedResponse has 'data' field which is already the list, or check for 'items'/'conversations' if nested
            const conversations = Array.isArray(conversationsData) 
              ? conversationsData 
              : (conversationsData.items || conversationsData.conversations || conversationsData.data || [])
            console.log('Conversations array:', conversations)
            
            // Also fetch patients list for contacts that don't have conversations yet
            let patientsList = []
            try {
              const patientsResponse = await messagesAPI.getPatients({ clinic_id: currentClinicId })
              patientsList = patientsResponse.data || patientsResponse || []
            } catch (e) {
              console.warn('Failed to fetch patients list:', e)
            }
            
            // Transform conversations to contact format
            const contactsFromConversations = conversations
              .filter(conv => {
                // For staff conversations, we MUST have recipient_user_id (can't use thread ID)
                const isStaff = !conv.patient_id || conv.patient_id === ''
                if (isStaff && !conv.recipient_user_id) {
                  console.warn('Skipping staff conversation without recipient_user_id:', conv.conversation_id)
                  return false
                }
                return true
              })
              .map(conv => {
                // For staff conversations, patient_id will be empty
                const isStaff = !conv.patient_id || conv.patient_id === ''
                return {
                  id: isStaff ? conv.recipient_user_id : conv.patient_id,
                  user_id: isStaff ? conv.recipient_user_id : null, // For staff, use recipient_user_id (the other participant's user_id)
                  first_name: conv.patient_name?.split(' ')[0] || 'Staff',
                  last_name: conv.patient_name?.split(' ').slice(1).join(' ') || 'Member',
                  patient_name: conv.patient_name,
                  email: '',
                  patient_code: '',
                  type: isStaff ? 'staff' : 'patient',
                  unread_count: conv.unread_count || 0,
                  last_message: conv.last_message,
                  last_message_time: conv.last_message_time,
                  avatar: conv.patient_avatar || conv.recipient_avatar
                }
              })
            
            // Add patients that don't have conversations yet
            const contactMap = new Map()
            contactsFromConversations.forEach(c => {
              const key = c.type === 'patient' ? c.id : c.user_id
              if (key) contactMap.set(key, c)
            })
            
            patientsList.forEach(p => {
              if (!contactMap.has(p.id)) {
                contactMap.set(p.id, {
                  ...p,
                  type: 'patient',
                  unread_count: p.unread_count || 0
                })
              }
            })
            
            const allContacts = Array.from(contactMap.values())
            const staffContacts = allContacts.filter(c => c.type === 'staff')
            console.log('All contacts (conversations + patients):', allContacts.length, 'total,', staffContacts.length, 'staff contacts')
            if (staffContacts.length > 0) {
              console.log('Staff contacts:', staffContacts.map(c => ({ id: c.id, user_id: c.user_id, name: c.patient_name })))
            }
            
            // Log unread counts for debugging
            allContacts.forEach(p => {
              if (p.unread_count && p.unread_count > 0) {
                console.log(`Contact ${p.first_name} ${p.last_name} has ${p.unread_count} unread messages`)
              }
            })
            
            // Preserve selected patient if it still exists in the new list
            setPatients(prevPatients => {
              const newPatients = allContacts || []
              if (selectedPatient) {
                const stillExists = newPatients.find(p => {
                  const pId = p.type === 'patient' ? p.id : (p.user_id || p.id)
                  const selectedId = selectedPatient.type === 'patient' ? selectedPatient.id : (selectedPatient.user_id || selectedPatient.id)
                  return pId === selectedId
                })
                if (!stillExists && newPatients.length > 0) {
                  setSelectedPatient(newPatients[0])
                }
              } else if (newPatients.length > 0) {
                setSelectedPatient(newPatients[0])
              }
              return newPatients
            })
          } catch (apiError) {
            console.error('Failed to fetch patients:', apiError)
            setError('Failed to load patients from server')
            setPatients([])
          }
        } else {
          console.log('Backend not available')
          setError('Backend server is not connected. Please ensure the server is running.')
        }
      } catch (err) {
        console.error('Failed to fetch patients:', err)
        setError('Failed to connect to backend server')
        setPatients([])
      } finally {
        if (showLoading) {
          setLoading(false)
        }
      }
    }

    // Initial fetch with loading indicator
    fetchPatients(true)
    
    // Set up polling to refresh contacts list every 10 seconds to update unread counts
    // Don't poll if we're currently marking as read
    const pollInterval = setInterval(() => {
      if (backendConnected && clinicId && !isMarkingAsReadRef.current) {
        fetchPatients(false)
      }
    }, 10000) // Poll every 10 seconds (reduced frequency to avoid interference)
    
    // Cleanup interval on unmount
    return () => {
      clearInterval(pollInterval)
    }
  }, [backendConnected, clinicId, selectedPatient])

  const lastMarkedRecipientIdRef = useRef(null)
  const isMarkingAsReadRef = useRef(false)
  const messagesContainerRef = useRef(null)
  const isSendingMessageRef = useRef(false)
  const currentRecipientIdRef = useRef(null) // Track current recipient to prevent polling interference
  const sendingToRecipientIdRef = useRef(null) // Track recipient we're sending to, to prevent selectedPatient changes
  
  // Update currentRecipientIdRef when selectedPatient changes (but not while sending)
  useEffect(() => {
    if (selectedPatient && !isSendingMessageRef.current) {
      const recipientId = selectedPatient.type === 'patient' ? selectedPatient.id : selectedPatient.user_id || selectedPatient.id
      currentRecipientIdRef.current = recipientId
      console.log('Updated currentRecipientIdRef to:', recipientId, 'for selectedPatient:', selectedPatient)
    }
  }, [selectedPatient])
  
  useEffect(() => {
    if (!selectedPatient || !clinicId || !backendConnected) return
    
    // Don't run useEffect if we're sending to a different conversation
    // This prevents fetching messages for the wrong conversation when selectedPatient changes during send
    if (sendingToRecipientIdRef.current) {
      const recipientId = selectedPatient.type === 'patient' ? selectedPatient.id : selectedPatient.user_id || selectedPatient.id
      if (sendingToRecipientIdRef.current !== recipientId) {
        console.log('useEffect: Skipping - sending to different conversation:', sendingToRecipientIdRef.current, 'vs', recipientId)
        return
      }
    }
    
    const fetchMessages = async (showLoading = false) => {
      // Don't fetch if we're currently sending a message
      if (isSendingMessageRef.current) {
        console.log('Skipping fetchMessages - message send in progress')
        return
      }
      
      // Don't fetch if we're sending to a different conversation
      // This prevents fetching for a different conversation while we're sending
      if (sendingToRecipientIdRef.current) {
        const recipientId = selectedPatient.type === 'patient' ? selectedPatient.id : selectedPatient.user_id || selectedPatient.id
        if (sendingToRecipientIdRef.current !== recipientId) {
          console.log('Skipping fetchMessages - sending to different conversation:', sendingToRecipientIdRef.current, 'vs', recipientId)
          return
        }
      }
      
      try {
        if (showLoading) {
          setMessagesLoading(true)
        }
        // Use user_id for staff, patient_id for patients
        const recipientId = selectedPatient.type === 'patient' ? selectedPatient.id : selectedPatient.user_id || selectedPatient.id
        
        // Don't fetch if we're sending to a different conversation (even if flag is set)
        // This prevents polling from fetching for a different conversation while we're sending
        if (currentRecipientIdRef.current && currentRecipientIdRef.current !== recipientId) {
          console.log('Skipping fetchMessages - different conversation active:', currentRecipientIdRef.current, 'vs', recipientId)
          return
        }
        
        currentRecipientIdRef.current = recipientId // Update ref with current recipient
        console.log('fetchMessages: Fetching for recipientId:', recipientId, 'selectedPatient:', selectedPatient)
        
        const response = await messagesAPI.getConversationMessages(
          recipientId,
          { clinic_id: clinicId }
        )
        const threadData = response.data || response
        const fetchedMessages = threadData.messages || []
        console.log('fetchMessages: Fetched', fetchedMessages.length, 'messages for recipientId:', recipientId)
        console.log('fetchMessages: Thread ID:', threadData.thread_id || threadData.conversation_id)
        
        // When showLoading is true (initial fetch or conversation change), REPLACE messages
        // When showLoading is false (polling update), MERGE messages to preserve optimistic updates
        if (showLoading) {
          // Replace all messages when switching conversations
          // BUT: Don't replace if we're sending to a different conversation (prevent overwriting optimistic messages)
          if (sendingToRecipientIdRef.current && sendingToRecipientIdRef.current !== recipientId) {
            console.log('fetchMessages: Skipping replace - sending to different conversation:', sendingToRecipientIdRef.current, 'vs', recipientId)
            return
          }
          console.log('fetchMessages: Replacing messages (conversation changed)')
          setMessages(fetchedMessages.sort((a, b) => {
            const timeA = new Date(a.timestamp || a.read_at || 0).getTime()
            const timeB = new Date(b.timestamp || b.read_at || 0).getTime()
            return timeA - timeB
          }))
        } else {
          // Merge messages for polling updates (same conversation)
          // BUT: Don't merge if we're sending to a different conversation (prevent overwriting optimistic messages)
          if (sendingToRecipientIdRef.current && sendingToRecipientIdRef.current !== recipientId) {
            console.log('fetchMessages: Skipping merge - sending to different conversation:', sendingToRecipientIdRef.current, 'vs', recipientId)
            return
          }
          
          setMessages(prev => {
            console.log('fetchMessages: Merging messages (polling update), prev:', prev.length, 'fetched:', fetchedMessages.length)
            
            // Double-check we're still viewing the same conversation before merging
            if (sendingToRecipientIdRef.current && sendingToRecipientIdRef.current !== recipientId) {
              console.log('fetchMessages: Conversation changed during merge, skipping')
              return prev
            }
            
            // Remove optimistic messages that are older than 30 seconds
            // Keep them longer to allow backend time to commit and return the message
            const now = Date.now()
            const withoutOldOptimistic = prev.filter(msg => {
              if (msg.id.startsWith('temp-')) {
                const timestamp = parseInt(msg.id.split('-')[1])
                return (now - timestamp) < 30000 // Keep optimistic messages less than 30 seconds old
              }
              return true
            })
            
            // Merge with fetched messages, avoiding duplicates
            const fetchedIds = new Set(fetchedMessages.map(m => m.id))
            const merged = [...withoutOldOptimistic.filter(m => !fetchedIds.has(m.id)), ...fetchedMessages]
            
            console.log('fetchMessages: After merge:', merged.length, 'messages')
            
            // Sort by timestamp
            return merged.sort((a, b) => {
              const timeA = new Date(a.timestamp || a.read_at || 0).getTime()
              const timeB = new Date(b.timestamp || b.read_at || 0).getTime()
              return timeA - timeB
            })
          })
        }
        
        // Mark conversation as read when messages are viewed (whenever recipient changes)
        if (recipientId !== lastMarkedRecipientIdRef.current && !isMarkingAsReadRef.current) {
          isMarkingAsReadRef.current = true
          try {
            await messagesAPI.markConversationRead(recipientId, { clinic_id: clinicId })
            lastMarkedRecipientIdRef.current = recipientId
            
            // Wait for database commit
            await new Promise(resolve => setTimeout(resolve, 500))
            
            // Refresh contacts list to update unread counts
            const conversationsResponse = await messagesAPI.getConversations({ 
              clinic_id: clinicId,
              page: 1,
              size: 100
            })
            const conversationsData = conversationsResponse.data || conversationsResponse
            // PaginatedResponse has 'data' field which is already the list, or check for 'items'/'conversations' if nested
            const conversations = Array.isArray(conversationsData) 
              ? conversationsData 
              : (conversationsData.items || conversationsData.conversations || conversationsData.data || [])
            console.log('markAsRead: Conversations fetched:', conversations.length, 'staff conversations:', conversations.filter(c => !c.patient_id || c.patient_id === '').length)
            
            // Also fetch patients list
            let patientsList = []
            try {
              const patientsResponse = await messagesAPI.getPatients({ clinic_id: clinicId })
              patientsList = patientsResponse.data || patientsResponse || []
            } catch (e) {
              console.warn('Failed to fetch patients list:', e)
            }
            
            // Transform conversations to contact format
            const contactsFromConversations = conversations
              .filter(conv => {
                // For staff conversations, we MUST have recipient_user_id (can't use thread ID)
                const isStaff = !conv.patient_id || conv.patient_id === ''
                if (isStaff && !conv.recipient_user_id) {
                  console.warn('Skipping staff conversation without recipient_user_id:', conv.conversation_id)
                  return false
                }
                return true
              })
              .map(conv => {
                // For staff conversations, patient_id will be empty
                const isStaff = !conv.patient_id || conv.patient_id === ''
                return {
                  id: isStaff ? conv.recipient_user_id : conv.patient_id,
                  user_id: isStaff ? conv.recipient_user_id : null, // For staff, use recipient_user_id (the other participant's user_id)
                  first_name: conv.patient_name?.split(' ')[0] || 'Staff',
                  last_name: conv.patient_name?.split(' ').slice(1).join(' ') || 'Member',
                  patient_name: conv.patient_name,
                  email: '',
                  patient_code: '',
                  type: isStaff ? 'staff' : 'patient',
                  unread_count: conv.unread_count || 0,
                  last_message: conv.last_message,
                  last_message_time: conv.last_message_time,
                  avatar: conv.patient_avatar || conv.recipient_avatar
                }
              })
            
            // Add patients that don't have conversations yet
            const contactMap = new Map()
            contactsFromConversations.forEach(c => {
              const key = c.type === 'patient' ? c.id : c.user_id
              if (key) contactMap.set(key, c)
            })
            
            patientsList.forEach(p => {
              if (!contactMap.has(p.id)) {
                contactMap.set(p.id, {
                  ...p,
                  type: 'patient',
                  unread_count: p.unread_count || 0
                })
              }
            })
            
            const contactsList = Array.from(contactMap.values())
            setPatients(contactsList || [])
          } catch (markReadError) {
            console.error('Failed to mark conversation as read:', markReadError)
            // Don't fail the whole operation if marking as read fails
          } finally {
            isMarkingAsReadRef.current = false
          }
        }
      } catch (err) {
        console.error('Failed to fetch messages:', err)
        setMessages([])
      } finally {
        if (showLoading) {
          setMessagesLoading(false)
        }
      }
    }

    // Fetch messages and mark as read whenever selectedPatient changes
    fetchMessages(true)
    
    // Set up polling to fetch new messages every 2 seconds (without loading indicator, don't mark as read)
    // Don't poll if we're currently sending a message
    const pollInterval = setInterval(() => {
      if (selectedPatient && clinicId && backendConnected && !isSendingMessageRef.current) {
        fetchMessages(false)
      }
    }, 2000) // Poll every 2 seconds
    
    // Cleanup interval on unmount or when dependencies change
    return () => {
      clearInterval(pollInterval)
    }
  }, [selectedPatient, clinicId, backendConnected])

  // Auto-scroll to bottom when messages change or conversation changes
  useEffect(() => {
    if (messagesContainerRef.current && messages.length > 0) {
      // Use setTimeout to ensure DOM is updated
      setTimeout(() => {
        messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight
      }, 100)
    }
  }, [messages, selectedPatient])

  const fetchPatientDocuments = async () => {
    if (!selectedPatient || !clinicId || selectedPatient.type !== 'patient') {
      setAvailableDocuments([])
      return
    }
    
    try {
      setDocumentsLoading(true)
      console.log('Fetching documents for patient:', selectedPatient.id, 'clinic:', clinicId)
      const response = await messagesAPI.getPatientDocuments(selectedPatient.id, { clinic_id: clinicId })
      console.log('Documents response:', response)
      const documents = response.data || response || []
      console.log('Parsed documents:', documents)
      setAvailableDocuments(documents)
    } catch (err) {
      console.error('Failed to fetch patient documents:', err)
      setAvailableDocuments([])
    } finally {
      setDocumentsLoading(false)
    }
  }

  const handleOpenDocumentModal = async () => {
    if (!selectedPatient || selectedPatient.type !== 'patient') {
      alert('Documents can only be attached when chatting with a patient')
      return
    }
    setShowDocumentModal(true)
    await fetchPatientDocuments()
  }

  const handleDocumentSelect = (doc) => {
    setSelectedDocuments(prev => {
      const isSelected = prev.some(d => d.id === doc.id)
      if (isSelected) {
        return prev.filter(d => d.id !== doc.id)
      } else {
        return [...prev, doc]
      }
    })
  }

  const handleSend = async () => {
    if (!selectedPatient || (!message.trim() && selectedDocuments.length === 0) || !clinicId) return
    
    // Capture selectedPatient at the start to prevent it from changing during send
    const originalSelectedPatient = selectedPatient
    const messageContent = message.trim() || 'Shared document(s)'
    const recipientId = originalSelectedPatient.type === 'patient' ? originalSelectedPatient.id : originalSelectedPatient.user_id || originalSelectedPatient.id
    
    // Update refs with recipient we're sending to (BEFORE setting isSendingMessageRef)
    // This ensures polling knows which conversation we're working with
    currentRecipientIdRef.current = recipientId
    sendingToRecipientIdRef.current = recipientId // Track recipient we're sending to
    
    // Set flag to prevent polling during send (BEFORE any async operations)
    isSendingMessageRef.current = true
    
    console.log('Sending message to recipientId:', recipientId, 'originalSelectedPatient:', originalSelectedPatient)
    
    // Optimistically add the message to the UI immediately
    const optimisticMessage = {
      id: `temp-${Date.now()}`,
      content: messageContent,
      sender_id: currentUserId,
      recipient_id: recipientId,
      timestamp: new Date().toISOString(),
      sender_name: 'You',
      read: false,
      delivered: false,
      attachments: selectedDocuments.map(doc => ({
        id: doc.id,
        file_name: doc.title,
        file_url: doc.file_url,
        description: doc.description
      }))
    }
    
    // Add optimistic message immediately
    setMessages(prev => [...prev, optimisticMessage])
    setMessage('')
    const documentsToSend = [...selectedDocuments]
    setSelectedDocuments([])
    
    try {
      if (backendConnected) {
        
        // Send message to server with document attachments
        const sendResponse = await messagesAPI.send({
          recipient_id: recipientId,
          content: messageContent,
          clinic_id: clinicId,
          message_type: 'text',
          priority: 'normal',
          attachments: [], // Empty list for attachment IDs (not used for documents)
          document_attachments: documentsToSend.map(doc => ({
            document_id: doc.id,
            document_type: doc.type,
            document_title: doc.title,
            document_url: doc.file_url
          }))
        })
        
        console.log('Message sent successfully:', sendResponse)
        
        // Longer delay to ensure message is committed to database
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        // Refresh messages to get the real message from server
        // This replaces the optimistic message with the actual one
        // IMPORTANT: Use the same recipientId we sent to, not selectedPatient which might have changed
        console.log('Fetching messages for recipientId:', recipientId, 'originalSelectedPatient:', originalSelectedPatient, 'current selectedPatient:', selectedPatient)
        
        // Check if we're still viewing the same conversation (use originalSelectedPatient, not current selectedPatient)
        const currentRecipientId = selectedPatient?.type === 'patient' ? selectedPatient.id : selectedPatient?.user_id || selectedPatient?.id
        const originalRecipientId = originalSelectedPatient.type === 'patient' ? originalSelectedPatient.id : originalSelectedPatient.user_id || originalSelectedPatient.id
        
        if (currentRecipientId !== recipientId || originalRecipientId !== recipientId) {
          console.warn('Conversation changed during send! Sent to:', recipientId, 'original was:', originalRecipientId, 'but now viewing:', currentRecipientId)
          // Don't update messages if we switched conversations
          isSendingMessageRef.current = false
          return
        }
        
        const response = await messagesAPI.getConversationMessages(
          recipientId,
          { clinic_id: clinicId }
        )
        const threadData = response.data || response
        const fetchedMessages = threadData.messages || []
        console.log('Fetched messages after send:', fetchedMessages.length, 'messages', fetchedMessages)
        console.log('Thread ID from response:', threadData.thread_id || threadData.conversation_id)
        
        // Double-check we're still viewing the same conversation before updating (use originalSelectedPatient)
        const stillViewingSameConversation = originalSelectedPatient.type === 'patient' 
          ? originalSelectedPatient.id === recipientId 
          : (originalSelectedPatient.user_id || originalSelectedPatient.id) === recipientId
        
        if (!stillViewingSameConversation) {
          console.warn('Conversation changed after fetch! Not updating messages. Original recipient:', originalRecipientId, 'sent to:', recipientId)
          isSendingMessageRef.current = false
          return
        }
        
        // Verify that the fetched messages include our new message (check by content or timestamp)
        // If the message isn't in the fetched list yet, wait a bit more and retry
        const previousMessageCount = fetchedMessages.length
        let messageFound = false
        let retryCount = 0
        const maxRetries = 3
        
        while (!messageFound && retryCount < maxRetries) {
          // Check if any message matches what we sent
          messageFound = fetchedMessages.some(msg => {
            // Check by content match
            const contentMatch = msg.content === messageContent
            // Check by attachments (if we sent documents)
            const attachmentsMatch = documentsToSend.length > 0 && msg.attachments && msg.attachments.length > 0
            // Check by timestamp (very recent message)
            const msgTime = new Date(msg.timestamp || msg.created_at || 0).getTime()
            const now = Date.now()
            const timeDiff = now - msgTime
            const isRecent = timeDiff < 10000 && timeDiff > 0 // Within last 10 seconds
            
            const matches = contentMatch || attachmentsMatch || isRecent
            if (matches) {
              console.log('Found new message:', { id: msg.id, content: msg.content?.substring(0, 50), timestamp: msg.timestamp, timeDiff })
            }
            return matches
          })
          
          // Also check if we got more messages than before (indicates new message was added)
          if (fetchedMessages.length > previousMessageCount) {
            messageFound = true
            console.log('Found new message by count increase:', fetchedMessages.length, 'vs', previousMessageCount)
          }
          
          if (!messageFound && retryCount < maxRetries - 1) {
            console.warn(`New message not found in fetched messages yet (attempt ${retryCount + 1}/${maxRetries}), waiting a bit more...`)
            // Wait a bit more and fetch again
            await new Promise(resolve => setTimeout(resolve, 800))
            const retryResponse = await messagesAPI.getConversationMessages(
              recipientId,
              { clinic_id: clinicId }
            )
            const retryThreadData = retryResponse.data || retryResponse
            const retryFetchedMessages = retryThreadData.messages || []
            console.log(`Retry ${retryCount + 1} fetch after send:`, retryFetchedMessages.length, 'messages', retryFetchedMessages.map(m => ({ id: m.id, content: m.content?.substring(0, 50), timestamp: m.timestamp })))
            if (retryFetchedMessages.length >= fetchedMessages.length) {
              // Use the retry messages if we got same or more
              fetchedMessages.length = 0
              fetchedMessages.push(...retryFetchedMessages)
            }
          }
          retryCount++
        }
        
        if (!messageFound) {
          console.warn('New message still not found after retries, but will keep optimistic message')
        }
        
        // Update messages: remove optimistic and merge with fetched
        // IMPORTANT: Only update if we're still viewing the same recipient
        setMessages(prev => {
          console.log('Previous messages count:', prev.length, 'messages:', prev.map(m => ({ id: m.id, content: m.content?.substring(0, 50) })))
          
          // Check if we're still sending to the same conversation (use sendingToRecipientIdRef, not currentRecipientIdRef)
          // currentRecipientIdRef might be updated by useEffect when selectedPatient changes
          const sendingToRecipientId = sendingToRecipientIdRef.current
          
          if (!sendingToRecipientId || sendingToRecipientId !== recipientId) {
            console.warn('handleSend: Conversation changed during message update! Not updating messages.')
            console.warn('  Sent to:', recipientId, 'but sendingToRecipientIdRef is:', sendingToRecipientId)
            // Don't update messages if we switched conversations or ref was cleared
            return prev
          }
          
          // Remove optimistic messages only if we found the new message in fetched messages
          // Otherwise, keep optimistic messages to show the message until it's found
          // Use messageFound from the outer scope (checked before setMessages)
          const withoutOptimistic = messageFound 
            ? prev.filter(msg => !msg.id.startsWith('temp-'))
            : prev.filter(msg => {
                // Keep optimistic messages that match what we sent
                if (msg.id.startsWith('temp-')) {
                  const optimisticTime = parseInt(msg.id.split('-')[1])
                  const now = Date.now()
                  // Keep optimistic messages less than 30 seconds old (give backend more time)
                  return (now - optimisticTime) < 30000
                }
                return true
              })
          console.log('After removing optimistic:', withoutOptimistic.length, 'messageFound:', messageFound, 'fetchedMessages.length:', fetchedMessages.length)
          
          // Merge with fetched messages, avoiding duplicates
          const fetchedIds = new Set(fetchedMessages.map(m => m.id))
          const merged = [...withoutOptimistic.filter(m => !fetchedIds.has(m.id)), ...fetchedMessages]
          console.log('After merge:', merged.length, 'messages:', merged.map(m => ({ id: m.id, content: m.content?.substring(0, 50) })))
          
          // Sort by timestamp
          const sorted = merged.sort((a, b) => {
            const timeA = new Date(a.timestamp || a.created_at || a.read_at || 0).getTime()
            const timeB = new Date(b.timestamp || b.created_at || b.read_at || 0).getTime()
            return timeA - timeB
          })
          console.log('Final sorted messages:', sorted.length)
          return sorted
        })
        
        // Additional delay before allowing polling to resume (longer to ensure message is visible)
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        // IMPORTANT: Restore originalSelectedPatient BEFORE refreshing contacts
        // This ensures selectedPatient is correct when the useEffect runs after contacts refresh
        if (originalSelectedPatient && sendingToRecipientIdRef.current === recipientId) {
          // Check if originalSelectedPatient still exists in current patients list
          const stillExists = patients.find(p => {
            const pId = p.type === 'patient' ? p.id : (p.user_id || p.id)
            const originalId = originalSelectedPatient.type === 'patient' ? originalSelectedPatient.id : (originalSelectedPatient.user_id || originalSelectedPatient.id)
            return pId === originalId
          })
          if (stillExists) {
            // Restore originalSelectedPatient immediately to prevent useEffect from fetching wrong conversation
            setSelectedPatient(originalSelectedPatient)
            // Wait a bit for the state update to propagate
            await new Promise(resolve => setTimeout(resolve, 100))
          }
        }
        
        // Refresh contacts list to update unread counts (but preserve selectedPatient if it still exists)
        try {
          const conversationsResponse = await messagesAPI.getConversations({ 
            clinic_id: clinicId,
            page: 1,
            size: 100
          })
          const conversationsData = conversationsResponse.data || conversationsResponse
          // PaginatedResponse has 'data' field which is already the list, or check for 'items'/'conversations' if nested
          const conversations = Array.isArray(conversationsData) 
            ? conversationsData 
            : (conversationsData.items || conversationsData.conversations || conversationsData.data || [])
          console.log('handleSend: Conversations fetched:', conversations.length, 'staff conversations:', conversations.filter(c => !c.patient_id || c.patient_id === '').length)
          
          // Also fetch patients list
          let patientsList = []
          try {
            const patientsResponse = await messagesAPI.getPatients({ clinic_id: clinicId })
            patientsList = patientsResponse.data || patientsResponse || []
          } catch (e) {
            console.warn('Failed to fetch patients list:', e)
          }
          
          // Transform conversations to contact format
          const contactsFromConversations = conversations
            .filter(conv => {
              // For staff conversations, we MUST have recipient_user_id (can't use thread ID)
              const isStaff = !conv.patient_id || conv.patient_id === ''
              if (isStaff && !conv.recipient_user_id) {
                console.warn('Skipping staff conversation without recipient_user_id:', conv.conversation_id)
                return false
              }
              return true
            })
            .map(conv => {
              // For staff conversations, patient_id will be empty
              const isStaff = !conv.patient_id || conv.patient_id === ''
              return {
                id: isStaff ? conv.recipient_user_id : conv.patient_id,
                user_id: isStaff ? conv.recipient_user_id : null, // For staff, use recipient_user_id (the other participant's user_id)
                first_name: conv.patient_name?.split(' ')[0] || 'Staff',
                last_name: conv.patient_name?.split(' ').slice(1).join(' ') || 'Member',
                patient_name: conv.patient_name,
                email: '',
                patient_code: '',
                type: isStaff ? 'staff' : 'patient',
                unread_count: conv.unread_count || 0,
                last_message: conv.last_message,
                last_message_time: conv.last_message_time,
                avatar: conv.patient_avatar || conv.recipient_avatar
              }
            })
          
          // Add patients that don't have conversations yet
          const contactMap = new Map()
          contactsFromConversations.forEach(c => {
            const key = c.type === 'patient' ? c.id : c.user_id
            if (key) contactMap.set(key, c)
          })
          
          patientsList.forEach(p => {
            if (!contactMap.has(p.id)) {
              contactMap.set(p.id, {
                ...p,
                type: 'patient',
                unread_count: p.unread_count || 0
              })
            }
          })
          
          const contactsList = Array.from(contactMap.values())
          const staffContactsInList = contactsList.filter(c => c.type === 'staff')
          console.log('handleSend: Final contacts list:', contactsList.length, 'total,', staffContactsInList.length, 'staff contacts')
          if (staffContactsInList.length > 0) {
            console.log('handleSend: Staff contacts in final list:', staffContactsInList.map(c => ({ id: c.id, user_id: c.user_id, name: c.patient_name })))
          }
          
          setPatients(prevPatients => {
            const newPatients = contactsList || []
            // Preserve selectedPatient if it still exists in the new list
            // IMPORTANT: Only restore selectedPatient if we're still sending to the same recipient
            if (originalSelectedPatient && sendingToRecipientIdRef.current === recipientId) {
              const stillExists = newPatients.find(p => {
                const pId = p.type === 'patient' ? p.id : (p.user_id || p.id)
                const originalId = originalSelectedPatient.type === 'patient' ? originalSelectedPatient.id : (originalSelectedPatient.user_id || originalSelectedPatient.id)
                return pId === originalId
              })
              if (stillExists) {
                // Ensure originalSelectedPatient is still selected (in case it changed during contacts refresh)
                setSelectedPatient(originalSelectedPatient)
              } else if (newPatients.length > 0) {
                // Only change selectedPatient if the original no longer exists
                setSelectedPatient(newPatients[0])
              }
            }
            return newPatients
          })
        } catch (err) {
          console.error('Failed to refresh contacts:', err)
        } finally {
          // Clear flag after send is complete (with additional delay to prevent polling interference)
          // Keep sendingToRecipientIdRef set longer to prevent useEffect from fetching wrong conversation
          await new Promise(resolve => setTimeout(resolve, 1500))
          isSendingMessageRef.current = false
          // Don't clear sendingToRecipientIdRef yet - keep it for a bit longer to prevent useEffect interference
          setTimeout(() => {
            sendingToRecipientIdRef.current = null
            console.log('handleSend: Cleared sendingToRecipientIdRef flag')
          }, 2000)
          console.log('handleSend: Cleared isSendingMessageRef flag')
        }
      } else {
        setError('Cannot send message - backend not connected')
        // Remove optimistic message if send failed
        setMessages(prev => prev.filter(msg => msg.id !== optimisticMessage.id))
        setMessage(messageContent) // Restore message text
        isSendingMessageRef.current = false
        sendingToRecipientIdRef.current = null
      }
    } catch (err) {
      console.error('Message send failed:', err)
      setError('Failed to send message: ' + (err.message || 'Unknown error'))
      // Remove optimistic message if send failed
      setMessages(prev => prev.filter(msg => msg.id !== optimisticMessage.id))
      setMessage(messageContent) // Restore message text
      isSendingMessageRef.current = false
      sendingToRecipientIdRef.current = null
    }
  }

  return (
    <div className={`min-h-screen transition-colors duration-500 ${
      darkMode
        ? 'bg-[#050C0F]'
        : 'bg-gradient-to-br from-gray-50 via-blue-50 to-teal-50'
    }`}>
      <Header />
      
      {/* Backend status and error indicators */}
      {!backendConnected && (
        <div className={`border px-4 py-3 mx-2 sm:mx-4 mt-4 rounded transition-colors ${
          darkMode
            ? 'bg-[#251F07] border-[#FACC15] text-[#FACC15]'
            : 'bg-yellow-100 border-yellow-400 text-yellow-700'
        }`}>
          <div className="flex items-center">
            <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            {t('backendNotConnected')}
          </div>
        </div>
      )}
      
      {error && (
        <div className={`border px-4 py-3 mx-2 sm:mx-4 mt-4 rounded transition-colors ${
          darkMode
            ? 'bg-[#2A0E15] border-[#FB7185] text-[#FB7185]'
            : 'bg-red-100 border-red-400 text-red-700'
        }`}>
          {error}
          <button 
            onClick={() => setError(null)}
            className={`float-right transition-colors ${
              darkMode ? 'text-[#FB7185] hover:text-[#FB7185]' : 'text-red-700 hover:text-red-900'
            }`}
          >
            ×
          </button>
        </div>
      )}
      
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className={`flex rounded-xl shadow-lg border overflow-hidden h-[80vh] transition-colors ${
          darkMode
            ? 'bg-[#0D2026] border-[#133037]'
            : 'bg-white border-gray-200'
        }`}>
          {/* Left Sidebar - Patient List */}
          <div className={`w-1/3 border-r p-4 transition-colors ${
            darkMode
              ? 'bg-[#07181D] border-[#133037]'
              : 'bg-gray-50 border-gray-200'
          }`}>
            <div className="flex items-center justify-between mb-4">
              <h2 className={`text-lg font-semibold ${
                darkMode ? 'text-[#F5FEFF]' : 'text-gray-700'
              }`}>{t('contacts')}</h2>
              {backendConnected && (
                <div className={`w-2 h-2 rounded-full animate-pulse ${
                  darkMode ? 'bg-[#4ADE80]' : 'bg-green-500'
                }`} title={t('backendConnected')}></div>
              )}
            </div>
            <div className="space-y-3 overflow-y-auto h-full pr-2">
              {loading ? (
                <p className={`text-sm ${
                  darkMode ? 'text-[#8AA2A7]' : 'text-gray-400'
                }`}>{t('loadingContacts')}</p>
              ) : patients.length === 0 ? (
                <p className={`text-sm ${
                  darkMode ? 'text-[#8AA2A7]' : 'text-gray-400'
                }`}>{t('noContactsFound')}</p>
              ) : (
                patients.map((p) => {
                  const hasUnread = p.unread_count && p.unread_count > 0
                  const isSelected = selectedPatient?.id === p.id
                  return (
                  <div
                    key={p.id}
                    onClick={() => setSelectedPatient(p)}
                    className={`rounded-lg border px-4 py-3 cursor-pointer shadow-sm relative transition-all duration-200 ${
                      isSelected
                        ? darkMode
                          ? 'bg-gradient-to-r from-[#79CAC2] to-[#58B4AA] text-[#050C0F] font-semibold border-[#79CAC2]'
                          : 'bg-gradient-to-r from-[#5ACCC3] to-[#4DB6B0] text-white font-semibold border-[#5ACCC3]'
                        : hasUnread
                        ? darkMode
                          ? 'bg-[#10262D] border-[#79CAC2] hover:bg-[#133037] text-[#F5FEFF] font-medium'
                          : 'bg-blue-50 border-blue-300 hover:bg-blue-100 text-gray-800 font-medium'
                        : darkMode
                        ? 'bg-[#0D2026] border-[#133037] hover:bg-[#10262D] text-[#F5FEFF]'
                        : 'bg-white hover:bg-gray-100 text-gray-800 border-gray-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 flex items-center gap-2">
                        {/* Red dot indicator for unread messages */}
                        {hasUnread && (
                          <div className="flex-shrink-0">
                            <div className={`w-2.5 h-2.5 rounded-full animate-pulse ${
                              darkMode ? 'bg-[#FB7185]' : 'bg-red-500'
                            }`}></div>
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="text-sm flex items-center gap-2">
                            <span className="truncate">{p.title ? `${p.title} ` : ''}{p.first_name} {p.last_name}</span>
                            {p.type && p.type !== 'patient' && (
                              <span className={`text-xs px-2 py-0.5 rounded flex-shrink-0 ${
                                isSelected
                                  ? darkMode
                                    ? 'bg-[#050C0F]/20 text-[#050C0F]'
                                    : 'bg-white/20 text-white'
                                  : darkMode
                                  ? 'bg-[#113A3A] text-[#79CAC2]'
                                  : 'bg-blue-100 text-blue-800'
                              }`}>
                                {p.type === 'doctor' ? t('doctor') : p.type === 'nurse' ? t('nurse') : p.type === 'lab_technician' ? t('labTech') : t('staff')}
                              </span>
                            )}
                          </div>
                          <div className={`text-xs truncate ${
                            isSelected
                              ? darkMode ? 'text-[#050C0F]/80' : 'text-white/80'
                              : darkMode ? 'text-[#8AA2A7]' : 'text-gray-500'
                          }`}>
                            {p.patient_code || p.email || (p.last_message ? p.last_message.substring(0, 30) + '...' : '—')}
                          </div>
                        </div>
                      </div>
                      {hasUnread && (
                        <div className="ml-2 flex-shrink-0">
                          <span className={`inline-flex items-center justify-center min-w-[24px] h-6 px-2 rounded-full text-xs font-bold shadow-md ${
                            isSelected
                              ? darkMode
                                ? 'bg-[#050C0F] text-[#79CAC2]'
                                : 'bg-white text-[#4DB6B0]'
                              : darkMode
                              ? 'bg-[#FB7185] text-white'
                              : 'bg-red-500 text-white'
                          }`}>
                            {p.unread_count > 99 ? '99+' : p.unread_count}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  )
                })
              )}
            </div>
          </div>

          {/* Main Chat Area */}
          <div className="w-2/3 flex flex-col relative">
            <div className={`border-b px-6 py-4 text-lg font-semibold text-center transition-colors ${
              darkMode
                ? 'bg-[#07181D] border-[#133037] text-[#79CAC2]'
                : 'bg-gray-50 border-gray-200 text-[#4DB6B0]'
            }`}>
              {selectedPatient ? `${selectedPatient.title ? selectedPatient.title + ' ' : ''}${selectedPatient.first_name} ${selectedPatient.last_name}` : t('selectAContact')}
            </div>

            <div ref={messagesContainerRef} className={`flex-1 p-6 overflow-y-auto transition-colors ${
              darkMode ? 'bg-[#050C0F]' : 'bg-gray-100'
            }`}>
              {messagesLoading ? (
                <div className="w-full h-full flex items-center justify-center">
                  <div className={`${darkMode ? 'text-[#8AA2A7]' : 'text-gray-400'}`}>{t('loadingMessages')}</div>
                </div>
              ) : messages.length === 0 ? (
                <div className="w-full h-full flex items-center justify-center">
                  <div className={`text-center ${darkMode ? 'text-[#8AA2A7]' : 'text-gray-400'}`}>
                    <p className="text-lg mb-2">{t('noMessagesYet')}</p>
                    <p className="text-sm">{t('startConversationBySendingMessage')}</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((msg) => {
                    const isCurrentUser = msg.sender_id === currentUserId
                    const isUnread = !isCurrentUser && !msg.read
                    return (
                    <div
                      key={msg.id}
                      className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-xs lg:max-w-md px-4 py-3 rounded-lg relative shadow-sm ${
                          isCurrentUser
                            ? darkMode
                              ? 'bg-gradient-to-r from-[#79CAC2] to-[#58B4AA] text-[#050C0F]'
                              : 'bg-gradient-to-r from-[#5ACCC3] to-[#4DB6B0] text-white'
                            : isUnread
                            ? darkMode
                              ? 'bg-[#10262D] border-2 border-[#79CAC2] text-[#F5FEFF]'
                              : 'bg-blue-100 border-2 border-blue-400 text-gray-800'
                            : darkMode
                            ? 'bg-[#0D2026] border border-[#133037] text-[#F5FEFF]'
                            : 'bg-white text-gray-800 border border-gray-200'
                        }`}
                      >
                        {isUnread && (
                          <div className={`absolute -left-2 top-2 w-3 h-3 rounded-full animate-pulse ${
                            darkMode ? 'bg-[#FB7185]' : 'bg-red-500'
                          }`}></div>
                        )}
                        <div className={`text-sm font-semibold mb-1 flex items-center gap-2 ${
                          isCurrentUser
                            ? darkMode ? 'text-[#050C0F]' : 'text-white'
                            : darkMode ? 'text-[#F5FEFF]' : 'text-gray-800'
                        }`}>
                          {msg.sender_name || t('unknown')}
                          {isUnread && (
                            <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                              darkMode ? 'bg-[#FB7185] text-white' : 'bg-red-500 text-white'
                            }`}>{t('new')}</span>
                          )}
                        </div>
                        <div className={`text-sm ${
                          isCurrentUser
                            ? darkMode ? 'text-[#050C0F]' : 'text-white'
                            : darkMode ? 'text-[#F5FEFF]' : 'text-gray-800'
                        }`}>{msg.content}</div>
                        {msg.attachments && msg.attachments.length > 0 && (
                          <div className="mt-2 space-y-1">
                            {msg.attachments.map((att, idx) => (
                              <a
                                key={att.id || idx}
                                href={att.file_url || '#'}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`block px-2 py-1 rounded text-xs transition ${
                                  isCurrentUser
                                    ? darkMode
                                      ? 'bg-[#050C0F]/20 hover:bg-[#050C0F]/30 text-[#050C0F]'
                                      : 'bg-white/20 hover:bg-white/30 text-white'
                                    : darkMode
                                    ? 'bg-[#133037] hover:bg-[#1A3A3A] text-[#79CAC2]'
                                    : 'bg-gray-100 hover:bg-gray-200 text-gray-800'
                                }`}
                              >
                                📎 {att.file_name || att.document_title || t('document')}
                              </a>
                            ))}
                          </div>
                        )}
                        <div className={`text-xs mt-1 flex items-center gap-2 ${
                          isCurrentUser
                            ? darkMode ? 'text-[#050C0F]/70' : 'text-white/70'
                            : darkMode ? 'text-[#8AA2A7]' : 'text-gray-500'
                        }`}>
                          {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString() : ''}
                          {isUnread && !isCurrentUser && (
                            <span className={`font-bold ${darkMode ? 'text-[#FB7185]' : 'text-red-500'}`}>●</span>
                          )}
                        </div>
                      </div>
                    </div>
                    )
                  })}
                </div>
              )}
            </div>

            <div className={`flex items-center border-t px-4 py-3 transition-colors ${
              darkMode
                ? 'bg-[#0D2026] border-[#133037]'
                : 'bg-white border-gray-200'
            }`}>
              {selectedPatient && selectedPatient.type === 'patient' && (
                <button
                  onClick={handleOpenDocumentModal}
                  className={`mr-2 p-2 rounded-lg transition-colors ${
                    darkMode
                      ? 'text-[#C1D9DD] hover:text-[#79CAC2] hover:bg-[#133037]'
                      : 'text-gray-600 hover:text-[#4DB6B0] hover:bg-gray-100'
                  }`}
                  title={t('attachDocument')}
                >
                  <FiPaperclip size={20} />
                </button>
              )}
              {selectedDocuments.length > 0 && (
                <div className="mr-2 flex gap-1 flex-wrap">
                  {selectedDocuments.map(doc => (
                    <span
                      key={doc.id}
                      className={`px-2 py-1 text-xs rounded flex items-center gap-1 ${
                        darkMode
                          ? 'bg-[#113A3A] text-[#79CAC2] border border-[#133037]'
                          : 'bg-blue-100 text-blue-800 border border-blue-200'
                      }`}
                    >
                      {doc.title.substring(0, 20)}...
                      <button
                        onClick={() => handleDocumentSelect(doc)}
                        className={`transition-colors ${
                          darkMode ? 'hover:text-[#FB7185]' : 'hover:text-red-600'
                        }`}
                      >
                        <FiX size={12} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <input
                type="text"
                placeholder={t('typeMessage')}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                className={`flex-1 px-4 py-2 rounded-full border focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors ${
                  darkMode
                    ? 'border-[#133037] bg-[#07181D] text-[#F5FEFF] placeholder-[#8AA2A7] focus:border-[#79CAC2] focus:ring-[#79CAC2] focus:ring-offset-[#050C0F]'
                    : 'border-gray-200 bg-white text-gray-900 placeholder-gray-400 focus:border-[#4DB6B0] focus:ring-[#4DB6B0] focus:ring-offset-white'
                }`}
              />
              <button
                onClick={handleSend}
                className={`ml-3 p-2 rounded-full text-white hover:scale-110 transition-all ${
                  darkMode
                    ? 'bg-gradient-to-r from-[#79CAC2] to-[#58B4AA] hover:from-[#58B4AA] hover:to-[#79CAC2]'
                    : 'bg-gradient-to-r from-[#5ACCC3] to-[#4DB6B0] hover:from-[#4DB6B0] hover:to-[#5ACCC3]'
                }`}
              >
                <FiSend />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Document Selector Modal */}
      {showDocumentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => {
          setShowDocumentModal(false)
          setSelectedDocuments([])
        }}>
          <div className={`rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col transition-colors ${
            darkMode
              ? 'bg-[#0D2026] border border-[#133037]'
              : 'bg-white'
          }`} onClick={(e) => e.stopPropagation()}>
            <div className={`flex items-center justify-between p-4 border-b transition-colors ${
              darkMode
                ? 'border-[#133037]'
                : 'border-gray-200'
            }`}>
              <h2 className={`text-xl font-semibold ${
                darkMode ? 'text-[#79CAC2]' : 'text-[#4DB6B0]'
              }`}>{t('selectDocumentsToAttach')}</h2>
              <button
                onClick={() => {
                  setShowDocumentModal(false)
                  setSelectedDocuments([])
                }}
                className={`transition-colors ${
                  darkMode
                    ? 'text-[#8AA2A7] hover:text-[#F5FEFF]'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <FiX size={24} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {documentsLoading ? (
                <div className={`text-center py-8 ${
                  darkMode ? 'text-[#8AA2A7]' : 'text-gray-500'
                }`}>{t('loadingDocuments')}</div>
              ) : availableDocuments.length === 0 ? (
                <div className={`text-center py-8 ${
                  darkMode ? 'text-[#8AA2A7]' : 'text-gray-500'
                }`}>{t('noDocumentsAvailableForThisPatient')}</div>
              ) : (
                <div className="space-y-2">
                  {availableDocuments.map((doc) => {
                    const isSelected = selectedDocuments.some(d => d.id === doc.id)
                    return (
                      <div
                        key={doc.id}
                        onClick={() => handleDocumentSelect(doc)}
                        className={`p-3 border rounded-lg cursor-pointer transition ${
                          isSelected
                            ? darkMode
                              ? 'border-[#79CAC2] bg-[#113A3A]'
                              : 'border-[#4DB6B0] bg-blue-50'
                            : darkMode
                            ? 'border-[#133037] hover:border-[#1A3A3A] bg-[#0D2026]'
                            : 'border-gray-200 hover:border-gray-300 bg-white'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => handleDocumentSelect(doc)}
                                className={`w-4 h-4 rounded ${
                                  darkMode ? 'text-[#79CAC2]' : 'text-[#4DB6B0]'
                                }`}
                              />
                              <h3 className={`font-semibold ${
                                darkMode ? 'text-[#F5FEFF]' : 'text-gray-800'
                              }`}>{doc.title}</h3>
                              <span className={`px-2 py-0.5 text-xs rounded ${
                                darkMode
                                  ? 'bg-[#133037] text-[#8AA2A7]'
                                  : 'bg-gray-200 text-gray-600'
                              }`}>
                                {doc.type}
                              </span>
                            </div>
                            {doc.description && (
                              <p className={`text-sm mt-1 ml-6 ${
                                darkMode ? 'text-[#C1D9DD]' : 'text-gray-600'
                              }`}>{doc.description}</p>
                            )}
                            {doc.date && (
                              <p className={`text-xs mt-1 ml-6 ${
                                darkMode ? 'text-[#8AA2A7]' : 'text-gray-500'
                              }`}>
                                {new Date(doc.date).toLocaleDateString()}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
            <div className={`flex items-center justify-end gap-2 p-4 border-t transition-colors ${
              darkMode
                ? 'border-[#133037]'
                : 'border-gray-200'
            }`}>
              <button
                onClick={() => {
                  setShowDocumentModal(false)
                  setSelectedDocuments([])
                }}
                className={`px-4 py-2 border rounded-lg transition-colors ${
                  darkMode
                    ? 'text-[#C1D9DD] border-[#133037] hover:bg-[#133037]'
                    : 'text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                {t('cancel')}
              </button>
              <button
                onClick={() => {
                  setShowDocumentModal(false)
                }}
                className={`px-4 py-2 text-white rounded-lg transition-all ${
                  darkMode
                    ? 'bg-gradient-to-r from-[#79CAC2] to-[#58B4AA] hover:from-[#58B4AA] hover:to-[#79CAC2]'
                    : 'bg-gradient-to-r from-[#5ACCC3] to-[#4DB6B0] hover:opacity-90'
                }`}
              >
                {t('select')} ({selectedDocuments.length})
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default DoctorMessages
