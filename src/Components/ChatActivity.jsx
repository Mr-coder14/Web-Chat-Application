import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Send } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getAuth } from 'firebase/auth';
import { getDatabase, ref, onValue, push, set } from 'firebase/database';
import '../css/ChatActivity.css';

function ChatActivity({ receiverUid, receiverName, backFunction }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef(null);
  const navigate = useNavigate();
  
  const auth = getAuth();
  const db = getDatabase();
  const currentUserId = auth.currentUser?.uid;
  const userId = receiverUid; // Use the receiverUid prop directly
  
  // Create a chat ID (combinedId) by sorting and concatenating both user IDs
  const combinedId = 
    currentUserId > userId
      ? currentUserId + userId
      : userId + currentUserId;

  useEffect(() => {
    if (!currentUserId || !userId) {
      console.log("Missing user IDs:", { currentUserId, userId });
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
      
      // Scroll to bottom when messages load or update
      setTimeout(() => {
        scrollToBottom();
      }, 100);
    });
    
    return () => unsubscribe();
  }, [currentUserId, userId, combinedId, db]);

  // Add useEffect for mobile viewport height adjustment
  useEffect(() => {
    // Fix for mobile viewport height issue
    const setViewportHeight = () => {
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty('--vh', `${vh}px`);
    };

    // Set initial viewport height
    setViewportHeight();

    // Update on resize and orientation change
    window.addEventListener('resize', setViewportHeight);
    window.addEventListener('orientationchange', setViewportHeight);

    return () => {
      window.removeEventListener('resize', setViewportHeight);
      window.removeEventListener('orientationchange', setViewportHeight);
    };
  }, []);

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Send a new message
  const handleSendMessage = (e) => {
    e.preventDefault();
    
    if (newMessage.trim() === '' || !currentUserId || !userId) return;
    
    const timestamp = Date.now();
    
    // Push new message to the chat room
    const messageData = {
      senderId: currentUserId,
      message: newMessage.trim(),
      timestamp: timestamp,
    };
    
    // Reference to the chat messages
    const messagesRef = ref(db, `chatsRooms/${combinedId}`);
    push(messagesRef, messageData);
    
    // Update sender's chat list
    const senderChatRef = ref(db, `chatss/${currentUserId}/${userId}`);
    set(senderChatRef, {
      timestamp: timestamp,
      messagecount: 0 // Sender's unread count is 0
    });
    
    // Update receiver's chat list with incremented unread count
    const receiverChatRef = ref(db, `chatss/${userId}/${currentUserId}`);
    
    // First check current count
    const receiverUnreadRef = ref(db, `chatss/${userId}/${currentUserId}/messagecount`);
    
    onValue(receiverUnreadRef, (snapshot) => {
      const currentCount = snapshot.exists() ? snapshot.val() : 0;
      
      set(receiverChatRef, {
        timestamp: timestamp,
        messagecount: currentCount + 1
      });
    }, { onlyOnce: true });
    
    // Clear input field
    setNewMessage('');
  };

  // Handle back button - use the provided backFunction
  const handleBack = () => {
    if (backFunction) {
      backFunction();
    } else {
      navigate('/home');
    }
  };

  // Format timestamp to readable time
  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="chat-activity-fullscreen">
      {/* Chat Header */}
      <div className="chat-activity-header">
        <button className="back-button" onClick={handleBack}>
          <ArrowLeft size={20} color="#ffffff" />
        </button>
        <div className="chat-activity-user">
          <div className="chat-avatar">
            {/* Using first letter of receiver name as avatar placeholder */}
            {receiverName ? receiverName.charAt(0).toUpperCase() : '?'}
          </div>
          <div className="chat-activity-user-info">
            <h3 className="chat-activity-user-name">
              {receiverName || 'User'}
            </h3>
          </div>
        </div>
      </div>
      
      {/* Messages Container */}
      <div className="messages-container">
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
                className={`message-item ${message.senderId === currentUserId ? 'sent' : 'received'}`}
              >
                <div className="message-bubble">
                  <p className="message-text">{message.message}</p>
                  <span className="message-time">{formatTime(message.timestamp)}</span>
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
    </div>
  );
}

export default ChatActivity;