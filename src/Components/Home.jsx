import { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import '../css/Home.css';
import { useNavigate } from 'react-router-dom';
import { getAuth } from 'firebase/auth';
import { getDatabase, ref, onValue, get, query, orderByKey, limitToLast, set } from 'firebase/database';

function Home() {
  const [chats, setChats] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const auth = getAuth();
  const db = getDatabase();
  const currentUserId = auth.currentUser?.uid;

  // Fetch chat list from Firebase
  useEffect(() => {
    if (!currentUserId) return;

    // Reference to the user's chat list
    const chatsRef = ref(db, `chatss/${currentUserId}`);
    
    const unsubscribe = onValue(chatsRef, async (snapshot) => {
      if (snapshot.exists()) {
        const promises = [];

        snapshot.forEach((childSnapshot) => {
          const receiverUid = childSnapshot.key;
          const messageCount = childSnapshot.child("messagecount").val() || 0;
          
          // Fetch user details
          const userPromise = get(ref(db, `users/${receiverUid}`))
            .then((userSnapshot) => {
              if (userSnapshot.exists()) {
                const userData = userSnapshot.val();
                
                // Fetch last message
                return get(query(ref(db, `chatsRooms/${currentUserId + receiverUid}`), orderByKey(), limitToLast(1)))
                  .then((messageSnapshot) => {
                    let lastMessage = "Start a conversation";
                    let timestamp = "";
                    
                    if (messageSnapshot.exists()) {
                      messageSnapshot.forEach((msgData) => {
                        const msg = msgData.val();
                        lastMessage = msg.message || "New message";
                        
                        // Format timestamp
                        if (msg.timestamp) {
                          const date = new Date(msg.timestamp);
                          timestamp = date.toLocaleDateString();
                        }
                      });
                    }
                    
                    return {
                      id: receiverUid,
                      userId: receiverUid,
                      name: userData.name || "Unknown",
                      lastMessage: lastMessage,
                      date: timestamp,
                      avatar: (userData.name || "U").charAt(0),
                      unread: messageCount,
                      online: userData.isActive || false,
                      profile: userData.profile
                    };
                  });
              }
              return null;
            });
            
          promises.push(userPromise);
        });
        
        const results = await Promise.all(promises);
        const filteredResults = results.filter(result => result !== null);
        setChats(filteredResults);
        setLoading(false);
      } else {
        setChats([]);
        setLoading(false);
      }
    });
    
    return () => unsubscribe();
  }, [currentUserId, db]);

  useEffect(() => {
    const chatItems = document.querySelectorAll('.chat-item');
    chatItems.forEach((item, index) => {
      item.style.setProperty('--index', index);
    });
  }, [chats, searchTerm]);

  // Filtered chats based on search
  const filteredChats = chats.filter(chat => 
    chat.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (chat.lastMessage && chat.lastMessage.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleUsersList = () => {
    navigate('/userslist');
  };

  const handleSelectChat = (chat) => {
    // Reset unread message count when chat is selected
    if (currentUserId && chat.userId) {
      const userChatRef = ref(db, `chatss/${currentUserId}/${chat.userId}/messagecount`);
      set(userChatRef, 0);
    }
    
    // Navigate to ChatActivity page with chat data as state
    navigate(`/chat/${chat.userId}`, { 
      state: { 
        receiverUid: chat.userId,
        receiverName: chat.name,
        receiverAvatar: chat.avatar,
        profile: chat.profile
      } 
    });
  };

  return (
    <div className="chat-fullscreen-container">
      {/* Header */}
      <div className="chat-header">
        <h1 className="text-xl font-semibold">Chats</h1>
        <div>
          <button className="se" onClick={handleUsersList}>
            <Search size={20} />
          </button>
        </div>
      </div>
      
      {/* Search bar */}
      <div className="chat-search">
        <div className="relative">
          <input 
            type="text" 
            placeholder="Search or start a new chat" 
            className="chat-search-input"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <Search size={16} className="chat-search-icon" />
        </div>
      </div>
      
      {/* Chat list */}
      <div className="chat-list">
        {loading ? (
          <div className="flex justify-center items-center p-4">
            <div className="loading-spinner"></div>
          </div>
        ) : filteredChats.length > 0 ? (
          filteredChats.map((chat) => (
            <div 
              key={chat.id}
              onClick={() => handleSelectChat(chat)}
              className="chat-item"
            >
              <div className={`chat-avatar ${chat.online ? 'online' : ''}`}>
                {chat.avatar}
              </div>
              <div className="chat-info">
                <div className="flex justify-between items-baseline">
                  <h3 className="chat-name">{chat.name}</h3>
                  <span className="chat-date">{chat.date}</span>
                </div>
                <p className="chat-message">{chat.lastMessage}</p>
              </div>
              {chat.unread > 0 && (
                <span className="chat-badge">
                  {chat.unread}
                </span>
              )}
            </div>
          ))
        ) : (
          <div className="flex justify-center items-center p-4 text-gray-500">
            No chats found
          </div>
        )}
      </div>
    </div>
  );
}

export default Home;