import React, { useState, useEffect, useRef } from 'react';
import { 
  getDatabase, 
  ref, 
  onValue, 
  push, 
  set, 
  get, 
  update,
  child,
  serverTimestamp
} from 'firebase/database';
import { getAuth } from 'firebase/auth';
import { ArrowLeft, Send } from 'lucide-react';
import '../css/ChatActivity.css';

function ChatActivity({ receiverUid, backFunction, isMobile }) {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [receiverStatus, setReceiverStatus] = useState('Offline');
  const [isBlocked, setIsBlocked] = useState(false);
  const [blockedBy, setBlockedBy] = useState(null);
  const messagesEndRef = useRef(null);
  const auth = getAuth();
  const db = getDatabase();
  
  // Get current user ID
  const currentUserId = auth.currentUser?.uid;

  // Create room IDs for the chat
  const senderRoom = currentUserId + receiverUid;
  const receiverRoom = receiverUid + currentUserId;

  useEffect(() => {
    if (!currentUserId || !receiverUid) {
      console.error("Sender UID or Receiver UID is missing");
      return;
    }

    // Check if user is blocked
    checkIfBlocked();
    
    // Get receiver details
    fetchUserDetails();
    
    // Fetch messages
    if (!isBlocked) {
      fetchMessages();
    }
    
    // Set current user as active
    setActiveStatus(true);
    
    // Mark messages as seen if receiver is active
    checkIfReceiverActive();
    
    // When component unmounts
    return () => {
      setActiveStatus(false);
    };
  }, [currentUserId, receiverUid, isBlocked]);

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const checkIfBlocked = () => {
    if (!currentUserId || !receiverUid) return;
    
    const blockedByReceiverRef = ref(db, `blocked_users/${receiverUid}/${currentUserId}`);
    const blockedByMeRef = ref(db, `blocked_users/${currentUserId}/${receiverUid}`);
    
    onValue(blockedByReceiverRef, (snapshot) => {
      const isBlockedByReceiver = snapshot.exists() && snapshot.val() === true;
      
      if (isBlockedByReceiver) {
        setIsBlocked(true);
        setBlockedBy('receiver');
      } else {
        onValue(blockedByMeRef, (snapshot) => {
          const isBlockedByMe = snapshot.exists() && snapshot.val() === true;
          
          if (isBlockedByMe) {
            setIsBlocked(true);
            setBlockedBy('me');
          } else {
            setIsBlocked(false);
            setBlockedBy(null);
          }
        });
      }
    });
  };

  const fetchUserDetails = () => {
    const userRef = ref(db, `users/${receiverUid}`);
    
    onValue(userRef, (snapshot) => {
      if (snapshot.exists()) {
        const userData = snapshot.val();
        setUser(userData);
        
        // Check online status
        if (userData.isActive) {
          setReceiverStatus('Online');
        } else if (userData.lastSeen) {
          setReceiverStatus(`Last seen: ${formatLastSeen(userData.lastSeen)}`);
        } else {
          setReceiverStatus('Offline');
        }
        
        setLoading(false);
      }
    });
  };

  const fetchMessages = () => {
    const messagesRef = ref(db, `chatsRooms/${senderRoom}`);
    
    onValue(messagesRef, (snapshot) => {
      const messagesList = [];
      
      snapshot.forEach((childSnapshot) => {
        const message = childSnapshot.val();
        messagesList.push(message);
      });
      
      setMessages(messagesList);
      setLoading(false);
    });
  };

  const sendMessage = () => {
    if (inputMessage.trim() === '' || isBlocked) return;
    
    const messageData = {
      message: inputMessage,
      senderId: currentUserId,
      timestamp: Date.now(),
      seen: false
    };
    
    // Clear input field
    setInputMessage('');
    
    // Save in sender room
    const senderRoomRef = ref(db, `chatsRooms/${senderRoom}`);
    const newMessageKey = push(senderRoomRef).key;
    
    set(child(senderRoomRef, newMessageKey), messageData);
    
    // Save in receiver room
    set(child(ref(db, `chatsRooms/${receiverRoom}`), newMessageKey), messageData);
    
    // Update chat list for both users
    updateChatList(messageData);
    
    // Check if receiver is active to mark message as seen
    checkMessageStatus(newMessageKey);
  };

  const updateChatList = (messageData) => {
    const senderUser = {
      userid: currentUserId,
      name: auth.currentUser?.displayName || 'User'
    };
    
    // Update receiver's chat list
    const receiverChatRef = ref(db, `chatss/${receiverUid}/${currentUserId}`);
    get(receiverChatRef).then((snapshot) => {
      if (!snapshot.exists()) {
        set(receiverChatRef, senderUser);
      }
    });
    
    // Update sender's chat list with receiver info
    if (user) {
      set(ref(db, `chatss/${currentUserId}/${receiverUid}`), user);
    }
    
    // Update message count if receiver is not active
    checkReceiverActiveAndUpdateCount();
  };

  const checkReceiverActiveAndUpdateCount = () => {
    const activeRef = ref(db, `messageactiveUsers/${receiverUid}`);
    
    get(activeRef).then((snapshot) => {
      if (snapshot.exists()) {
        const isActive = snapshot.child('isActive').val();
        
        if (!isActive) {
          const receiverChatRef = ref(db, `chatss/${receiverUid}/${currentUserId}/messagecount`);
          
          get(receiverChatRef).then((countSnapshot) => {
            const currentCount = countSnapshot.exists() ? countSnapshot.val() : 0;
            set(receiverChatRef, currentCount + 1);
          });
        }
      }
    });
  };

  const checkMessageStatus = (messageKey) => {
    const activeRef = ref(db, `messageactiveUsers/${receiverUid}`);
    
    get(activeRef).then((snapshot) => {
      if (snapshot.exists()) {
        const isActive = snapshot.child('isActive').val();
        
        if (isActive) {
          // Mark messages as seen in both rooms
          markAllMessagesAsSeen();
        }
      }
    });
  };

  const markAllMessagesAsSeen = () => {
    const senderRoomRef = ref(db, `chatsRooms/${senderRoom}`);
    const receiverRoomRef = ref(db, `chatsRooms/${receiverRoom}`);
    
    // Update all messages in sender room
    get(senderRoomRef).then((snapshot) => {
      if (snapshot.exists()) {
        snapshot.forEach((childSnapshot) => {
          update(child(senderRoomRef, childSnapshot.key), { seen: true });
        });
      }
    });
    
    // Update all messages in receiver room
    get(receiverRoomRef).then((snapshot) => {
      if (snapshot.exists()) {
        snapshot.forEach((childSnapshot) => {
          update(child(receiverRoomRef, childSnapshot.key), { seen: true });
        });
      }
    });
  };

  const checkIfReceiverActive = () => {
    const activeRef = ref(db, `messageactiveUsers/${receiverUid}`);
    
    onValue(activeRef, (snapshot) => {
      if (snapshot.exists()) {
        const isActive = snapshot.child('isActive').val();
        
        if (isActive) {
          // Mark all messages as seen
          markAllMessagesAsSeen();
        }
      }
    });
  };

  const setActiveStatus = (isActive) => {
    if (!currentUserId) return;
    
    // Update active status in messageactiveUsers
    set(ref(db, `messageactiveUsers/${currentUserId}/isActive`), isActive);
    
    // Update user status
    const userRef = ref(db, `users/${currentUserId}`);
    
    if (isActive) {
      update(userRef, {
        isActive: true
      });
      
      // Remove lastSeen
      set(ref(db, `users/${currentUserId}/lastSeen`), null);
    } else {
      update(userRef, {
        isActive: false,
        lastSeen: Date.now()
      });
    }
  };

  const formatLastSeen = (timestamp) => {
    const currentTime = Date.now();
    const diff = currentTime - timestamp;
    
    if (diff < 60 * 1000) {
      return 'Just now';
    } else if (diff < 60 * 60 * 1000) {
      return `${Math.floor(diff / (60 * 1000))} minutes ago`;
    } else if (diff < 24 * 60 * 60 * 1000) {
      return `${Math.floor(diff / (60 * 60 * 1000))} hours ago`;
    } else {
      return `${Math.floor(diff / (24 * 60 * 60 * 1000))} days ago`;
    }
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleReportMessage = (message) => {
    const reportedRef = ref(db, 'reportedMessages');
    const reportId = push(reportedRef).key;
    
    if (reportId) {
      set(ref(db, `reportedMessages/${reportId}`), {
        roomId: senderRoom,
        senderId: message.senderId,
        messageContent: message.message,
        timestamp: message.timestamp
      }).then(() => {
        alert('Message reported successfully.');
      }).catch((error) => {
        alert('Failed to report message.');
      });
    }
  };

  return (
    <div className={`chat-activity-container ${isMobile ? 'mobile-chat-active' : ''}`}>
      {/* Chat header */}
      <div className="chat-header">
        <div className="chat-header-content">
          
          
          {loading ? (
            <div className="profile-placeholder"></div>
          ) : (
            <div className="profile-info1" onClick={() => window.location.href = `/profile?userid=${receiverUid}`}>
              <div className="profile-image">
                {user?.profile ? (
                  <img src={`/assets/${user.profile}`} alt="Profile" />
                ) : (
                  <div className="profile-fallback">{user?.name?.charAt(0) || 'U'}</div>
                )}
              </div>
              <div className="user-details">
                <h3>{user?.name || 'User'}</h3>
                <p className="status-text">{receiverStatus}</p>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Messages container */}
      <div className="messages-container">
        {loading ? (
          <div className="loading-container">
            <div className="loading-spinner"></div>
          </div>
        ) : isBlocked ? (
          <div className="blocked-message">
            {blockedBy === 'receiver' ? 'You have been blocked by this user.' : 'You have blocked this user.'}
          </div>
        ) : messages.length === 0 ? (
          <div className="no-messages">No messages yet. Start the conversation!</div>
        ) : (
          messages.map((message, index) => (
            <div 
              key={index} 
              className={`message ${message.senderId === currentUserId ? 'sent' : 'received'}`}
              onContextMenu={(e) => {
                if (message.senderId !== currentUserId) {
                  e.preventDefault();
                  if (window.confirm('Report this message?')) {
                    handleReportMessage(message);
                  }
                }
              }}
            >
              <div className="message-content">
                <p>{message.message}</p>
                <div className="message-meta">
                  <span className="message-time">{formatTime(message.timestamp)}</span>
                  {message.senderId === currentUserId && (
                    <span className={`seen-indicator ${message.seen ? 'seen' : ''}`}>
                      {message.seen ? '✓✓' : '✓'}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>
      
      {/* Input container */}
      {!isBlocked && (
        <div className="input-container">
          <textarea
            placeholder="Type a message..."
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            rows={1}
          />
          <button 
            className="send-button" 
            onClick={sendMessage} 
            disabled={inputMessage.trim() === ''}
          >
            <Send size={18} />
          </button>
        </div>
      )}
    </div>
  );
}

export default ChatActivity;