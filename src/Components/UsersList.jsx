import React, { useEffect, useState } from 'react';
import { auth, database } from './firebase';
import { ref, onValue } from 'firebase/database';
import '../css/UsersList.css';
import ChatActivity from './ChatActivity'; 

function UsersList() {
  const [users, setUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const currentUser = auth.currentUser;

  useEffect(() => {
    const usersRef = ref(database, 'users');
    
    onValue(usersRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const userList = Object.values(data).filter(
          user => user.userid !== currentUser?.uid
        );
        setUsers(userList);
      }
    });
  }, [currentUser]);

  // Function to handle clicking on a user to start chat
  const handleStartChat = (userId) => {
    setSelectedUserId(userId);
  };

  // Function to go back to users list
  const handleBackToUsers = () => {
    setSelectedUserId(null);
  };

  // If a user is selected, show the ChatActivity
  if (selectedUserId) {
    return (
      <ChatActivity 
        receiverUid={selectedUserId} 
        backFunction={handleBackToUsers} 
      />
    );
  }

  // Otherwise show the users list
  return (
    <div className="users-list-container">
      <h2 className="users-heading">All Users</h2>
      <div className="users-column">
        {users.map((user, index) => (
          <div key={index} className="user-card">
            <div className="user-info">
              <img src="/person3.jpg" alt="Profile" className="profile-img" />
              <span className="user-name">{user.name}</span>
            </div>
            <button 
              className="message-button"
              onClick={() => handleStartChat(user.userid)}
            >
              Message
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default UsersList;