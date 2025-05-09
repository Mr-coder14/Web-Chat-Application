import React, { useEffect, useState } from 'react';
import { auth, database } from './firebase';
import { ref, onValue } from 'firebase/database';
import '../css/UsersList.css';
import { User, MessageCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

function UsersList() {
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const currentUser = auth.currentUser;
  const navigate = useNavigate();

  useEffect(() => {
    if (!currentUser?.uid) {
      console.log("No current user found");
      setIsLoading(false);
      return;
    }

    console.log("Loading users for current user:", currentUser.uid);
    const usersRef = ref(database, 'users');
    
    const unsubscribe = onValue(usersRef, (snapshot) => {
      setIsLoading(true);
      const data = snapshot.val();
      if (data) {
        const userList = Object.entries(data)
          .filter(([_, user]) => user.userid !== currentUser.uid)
          .map(([key, user]) => ({
            ...user,
            key
          }));
        setUsers(userList);
      } else {
        setUsers([]);
      }
      setIsLoading(false);
    }, (error) => {
      console.error("Error loading users:", error);
      setIsLoading(false);
    });

    // Cleanup subscription
    return () => unsubscribe();
  }, [currentUser]);

  // Function to handle clicking on a user to start chat
  const handleStartChat = (userId, userName) => {
    console.log("Starting chat with:", userId, userName);
    
    // Navigate to chat page with userId as parameter and userName in state
    navigate(`/chat/${userId}`, {
      state: {
        receiverName: userName
      }
    });
  };

  return (
    <div className="users-list-container">
      <div className="users-header">
        <h2 className="users-heading">Connect with People</h2>
        <p className="users-subheading">Select a user to start a conversation</p>
      </div>
      
      {isLoading ? (
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading users...</p>
        </div>
      ) : users.length > 0 ? (
        <div className="users-column">
          {users.map((user) => (
            <div key={user.key} className="user-card">
              <div className="user-info">
                {user.photoURL ? (
                  <img src={user.photoURL} alt={`${user.name}'s profile`} className="profile-img" />
                ) : (
                  <div className="profile-placeholder">
                    <User size={24} />
                  </div>
                )}
                <div className="user-details">
                  <span className="user-name">{user.name}</span>
                  {user.status && <span className="user-status">{user.status}</span>}
                </div>
              </div>
              <button
                className="message-button"
                onClick={() => handleStartChat(user.userid, user.name)}
                aria-label={`Message ${user.name}`}
              >
                <MessageCircle size={18} />
                <span>Message</span>
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="no-users">
          <p>No users available at the moment</p>
        </div>
      )}
    </div>
  );
}

export default UsersList;