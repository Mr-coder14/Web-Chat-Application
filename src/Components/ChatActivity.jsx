import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Send } from 'lucide-react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { getAuth } from 'firebase/auth';
import { getDatabase, ref, onValue, push, set } from 'firebase/database';
import '../css/ChatActivity.css';

function ChatActivity() {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef(null);
  const navigate = useNavigate();
  const { userId } = useParams(); // Get userId from URL params
  const location = useLocation();
  
  // Get chat data from navigation state or fetch it if navigating directly
  const receiverData = location.state || {};
  
  const auth = getAuth();
  const db = getDatabase();
  const currentUserId = auth.currentUser?.uid;
  
  // Create a chat ID (combinedId) by sorting and concatenating both user IDs
  const combinedId = 
    currentUserId > userId
      ? currentUserId + userId
      : userId + currentUserId;

  useEffect(() => {
    if (!currentUserId || !userId) return;

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

  // Handle back button
  const handleBack = () => {
    navigate('/home');
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
          <div className={`chat-avatar ${receiverData.online ? 'online' : ''}`}>
            {receiverData.receiverAvatar || '?'}
          </div>
          <div className="chat-activity-user-info">
            <h3 className="chat-activity-user-name">
              {receiverData.receiverName || 'User'}
            </h3>
            <p className="chat-activity-user-status">
              {receiverData.online ? 'Online' : 'Offline'}
            </p>
          </div>
        </div>
      </div>
      
      {/* Messages Container */}
      <div className="messages-container">
        {loading ? (
          <div className="flex justify-center items-center p-4">
            <div className="loading-spinner"></div>
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
          <div className="flex justify-center items-center h-full text-gray-500">
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