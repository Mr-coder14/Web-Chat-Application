import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Send, UserX } from 'lucide-react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { 
  getDatabase, 
  ref, 
  onValue, 
  push, 
  set, 
  serverTimestamp,
  onDisconnect,
  update,
  remove,
  query,
  orderByChild,
  equalTo
} from 'firebase/database';
import '../css/ChatActivity.css';

function ChatActivity() {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [userStatus, setUserStatus] = useState({
    isActive: false,
    lastSeen: null
  });
  const [isBlocked, setIsBlocked] = useState({
    blockedByReceiver: false,
    blockedByMe: false
  });
  const [userProfile, setUserProfile] = useState(null);
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const navigate = useNavigate();
  const { userId } = useParams(); 
  const location = useLocation();
  const receiverName = location.state?.receiverName || 'User';
  
  // Authentication and Database setup
  const auth = getAuth();
  const db = getDatabase();

  // Authenticate user and set current user
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setCurrentUser(user);
      } else {
        navigate('/login'); 
      }
    });

    return () => unsubscribe();
  }, [auth, navigate]);

  // Create a chat ID (combinedId) by sorting and concatenating both user IDs
  const combinedId = 
    currentUser?.uid > userId
      ? currentUser.uid + userId
      : userId + currentUser?.uid;

  // Format last seen time 
  const formatLastSeen = (lastSeenTimestamp) => {
    if (!lastSeenTimestamp) return 'Offline';
    
    const currentTime = Date.now();
    const diff = currentTime - lastSeenTimestamp;

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

  // Format timestamp to readable time
  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Scroll to bottom function
  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  };

  // Check blocking status
  useEffect(() => {
    if (!currentUser || !userId) return;

    const currentUserId = currentUser.uid;
    const blockedByReceiverRef = ref(db, `blocked_users/${userId}/${currentUserId}`);
    const blockedByMeRef = ref(db, `blocked_users/${currentUserId}/${userId}`);

    // Check if blocked by receiver
    const unsubscribeReceiver = onValue(blockedByReceiverRef, (snapshot) => {
      const isBlockedByReceiver = snapshot.exists() && snapshot.val() === true;
      
      // Check if blocked by me
      const unsubscribeMe = onValue(blockedByMeRef, (snapshot) => {
        const isBlockedByMe = snapshot.exists() && snapshot.val() === true;
        
        setIsBlocked({
          blockedByReceiver: isBlockedByReceiver,
          blockedByMe: isBlockedByMe
        });
      });

      return () => {
        unsubscribeReceiver();
        unsubscribeMe();
      };
    });

    return () => unsubscribeReceiver();
  }, [currentUser, userId, db]);

  // Set up user active status
  useEffect(() => {
    if (!currentUser) return;

    const userRef = ref(db, `users/${currentUser.uid}`);
    const activeUserRef = ref(db, `messageactiveUsers/${currentUser.uid}`);

    // Set user as active when component mounts
    set(activeUserRef, { isActive: true });
    update(userRef, { 
      isActive: true,
      lastSeen: null 
    });

    // Set up onDisconnect to mark user as inactive
    const onDisconnectUserRef = ref(db, `users/${currentUser.uid}`);
    onDisconnect(onDisconnectUserRef).update({
      isActive: false,
      lastSeen: serverTimestamp()
    });

    // Clean up on unmount
    return () => {
      set(activeUserRef, { isActive: false });
      update(userRef, { 
        isActive: false,
        lastSeen: serverTimestamp() 
      });
    };
  }, [currentUser, db]);

  // Track receiver's online status
  useEffect(() => {
    if (!userId) return;

    const userStatusRef = ref(db, `users/${userId}`);
    
    const unsubscribe = onValue(userStatusRef, (snapshot) => {
      if (snapshot.exists()) {
        const userData = snapshot.val();
        setUserStatus({
          isActive: userData.isActive || false,
          lastSeen: userData.lastSeen || null
        });
      }
    });

    return () => unsubscribe();
  }, [userId, db]);

  // Fetch user profile details
  useEffect(() => {
    if (!userId) return;

    const userRef = ref(db, `users/${userId}`);
    
    const unsubscribe = onValue(userRef, (snapshot) => {
      if (snapshot.exists()) {
        const userData = snapshot.val();
        setUserProfile(userData);
      }
    });

    return () => unsubscribe();
  }, [userId, db]);

  // Load messages
  useEffect(() => {
    if (!currentUser || !userId) {
      console.log("Missing user IDs:", { currentUser, userId });
      return;
    }

    console.log("Loading messages for chat:", combinedId);
    setLoading(true);

    // Reference to the chat messages
    const messagesRef = ref(db, `chatsRooms/${combinedId}`);
    
    const unsubscribe = onValue(messagesRef, (snapshot) => {
      const messagesList = [];
      
      if (snapshot.exists()) {
        snapshot.forEach((childSnapshot) => {
          const message = childSnapshot.val();
          messagesList.push({
            id: childSnapshot.key,
            ...message
          });
        });
        
        // Sort messages by timestamp
        messagesList.sort((a, b) => a.timestamp - b.timestamp);
      }
      
      setMessages(messagesList);
      setLoading(false);
      
      // Scroll to bottom when messages load or update with a slightly longer delay
      setTimeout(() => {
        scrollToBottom();
      }, 300);
    });
    
    return () => unsubscribe();
  }, [currentUser, userId, combinedId, db]);

  // Send a new message
  const handleSendMessage = (e) => {
    e.preventDefault();
    
    if (!currentUser || !userId) return;
    
    // Check if blocked
    if (isBlocked.blockedByReceiver || isBlocked.blockedByMe) {
      return;
    }
    
    const messageText = newMessage.trim();
    if (messageText === '') return;
    
    const timestamp = Date.now();
    
    // Push new message to the chat room
    const messageData = {
      senderId: currentUser.uid,
      message: messageText,
      timestamp: timestamp,
      seen: false
    };
    
    // Reference to the chat messages
    const messagesRef = ref(db, `chatsRooms/${combinedId}`);
    const newMessageRef = push(messagesRef, messageData);
    
    // Update sender's chat list
    const senderChatRef = ref(db, `chatss/${currentUser.uid}/${userId}`);
    set(senderChatRef, {
      timestamp: timestamp,
      messagecount: 0 // Sender's unread count is 0
    });
    
    // Update receiver's chat list with incremented unread count
    const receiverChatRef = ref(db, `chatss/${userId}/${currentUser.uid}`);
    
    // Check active status before updating unread count
    const activeStatusRef = ref(db, `messageactiveUsers/${userId}`);
    onValue(activeStatusRef, (snapshot) => {
      const isActive = snapshot.child('isActive').val() || false;
      
      // If not active, increment unread count
      if (!isActive) {
        const receiverUnreadRef = ref(db, `chatss/${userId}/${currentUser.uid}/messagecount`);
        
        onValue(receiverUnreadRef, (countSnapshot) => {
          const currentCount = countSnapshot.exists() ? countSnapshot.val() : 0;
          
          set(receiverChatRef, {
            timestamp: timestamp,
            messagecount: currentCount + 1
          });
        }, { onlyOnce: true });
      } else {
        // If active, mark messages as seen in both sender and receiver rooms
        const senderRoomRef = ref(db, `chatsRooms/${combinedId}`);
        const receiverRoomRef = ref(db, `chatsRooms/${combinedId}/${newMessageRef.key}`);
        
        update(senderRoomRef, { seen: true });
        update(receiverRoomRef, { seen: true });
      }
    }, { onlyOnce: true });
    
    // Clear input field
    setNewMessage('');
    
    // Make sure we scroll to bottom after sending a message
    setTimeout(scrollToBottom, 100);
  };

  // Handle back button
  const handleBack = () => {
    navigate('/home');
  };

  // Handle profile navigation
  const handleProfileView = () => {
    navigate(`/profile/${userId}`);
  };

  // Prevent rendering if no current user
  if (!currentUser) {
    return <div>Loading...</div>;
  }

  return (
    <div className="chat-activity-fullscreen">
      {/* Chat Header */}
      <div className="chat-activity-header">
        <button className="back-button" onClick={handleBack}>
          <ArrowLeft size={20} color="#ffffff" />
        </button>
        <div className="chat-activity-user" onClick={handleProfileView}>
          <div className="chat-avatar">
            {/* Using first letter of receiver name as avatar placeholder */}
            {receiverName ? receiverName.charAt(0).toUpperCase() : '?'}
          </div>
          <div className="chat-activity-user-info">
            <h3 className="chat-activity-user-name">
              {receiverName}
            </h3>
            <p className="chat-activity-user-status">
              {userStatus.isActive 
                ? 'Online' 
                : userStatus.lastSeen 
                  ? `Last seen: ${formatLastSeen(userStatus.lastSeen)}` 
                  : 'Offline'}
            </p>
          </div>
        </div>
      </div>
      
      {/* Messages Container */}
      <div 
        className="messages-container" 
        ref={messagesContainerRef}
      >
        {/* Blocking status display */}
        {(isBlocked.blockedByReceiver || isBlocked.blockedByMe) && (
          <div className="block-message-container">
            <UserX size={48} color="red" />
            <p>
              {isBlocked.blockedByReceiver 
                ? "You cannot message this user" 
                : "You blocked this user"}
            </p>
          </div>
        )}

        {loading ? (
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Loading conversation...</p>
          </div>
        ) : messages.length > 0 ? (
          <div className="messages-list">
            {messages.map((message) => (
              <div 
                key={message.id}
                className={`message-item ${message.senderId === currentUser.uid ? 'sent' : 'received'}`}
              >
                <div className="message-bubble">
                  <p className="message-text">{message.message}</p>
                  <span className="message-time">{formatTime(message.timestamp)}</span>
                  {message.seen && message.senderId === currentUser.uid && (
                    <span className="message-seen">Seen</span>
                  )}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        ) : (
          <div className="empty-chat-container">
            <p>No messages yet. Start a conversation!</p>
          </div>
        )}
      </div>
      
      {/* Message Input */}
      {!(isBlocked.blockedByReceiver || isBlocked.blockedByMe) && (
        <form onSubmit={handleSendMessage} className="message-input-container">
          <input
            type="text"
            placeholder="Type a message..."
            className="message-input"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
          />
          <button 
            type="submit" 
            className="send-button"
            disabled={newMessage.trim() === ''}
          >
            <Send size={20} />
          </button>
        </form>
      )}
    </div>
  );
}

export default ChatActivity;