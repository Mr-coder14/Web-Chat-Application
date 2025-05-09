import React, { useState, useEffect } from 'react';
import { auth, database } from './firebase';
import { useNavigate } from 'react-router-dom';
import { ref, onValue } from 'firebase/database';
import "../css/Profile.css";

function Profile() {
  const navigate = useNavigate();
  const user = auth.currentUser;
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }

    const userRef = ref(database, `users/${user.uid}`);
    
    const unsubscribe = onValue(userRef, (snapshot) => {
      if (snapshot.exists()) {
        setUserData(snapshot.val());
      } else {
        setUserData({
          name: user.displayName || 'User',
          email: user.email,
          phno: user.phno,
          profileImageUrl: user.photoURL || ''
        });
      }
      setLoading(false);
    }, (error) => {
      console.error("Error fetching user data:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, navigate]);

  const handleLogoutClick = () => {
    setShowLogoutConfirm(true);
  };

  const handleConfirmLogout = () => {
    auth.signOut()
      .then(() => {
        
        navigate("/login");
      })
      .catch((error) => {
        console.error("Error logging out:", error);
      });
  };

  const handleCancelLogout = () => {
    setShowLogoutConfirm(false);
  };

  if (loading) {
    return (
      <div className="profile-loading">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="profile-page">
      <div className="profile-container">
        <div className="profile-header">
          <div className="profile-cover"></div>
          <div className="profile-avatar">
            <img 
              src={userData?.profileImageUrl || "person3.jpg"} 
              alt="Profile" 
            />
          </div>
          <div className="profile-info">
            <h1>{userData?.name || 'User'}</h1>
            <p>{userData?.email}</p>
          </div>
        </div>

        <div className="profile-card">
          <h2>Personal Information</h2>
          <div className="profile-details">
            <div className="detail-row">
              <div className="detail-label">Name</div>
              <div className="detail-value">{userData?.name || 'User'}</div>
            </div>
            
            <div className="detail-row">
              <div className="detail-label">Email</div>
              <div className="detail-value">{userData?.email}</div>
            </div>
            
            <div className="detail-row">
              <div className="detail-label">Phone</div>
              <div className="detail-value">{userData?.phno || 'Not provided'}</div>
            </div>
          </div>
        </div>

        <div className="profile-actions">
        <button onClick={() => navigate("/edit-profile")} className="action-button edit">
            <span className="action-icon">✏️</span>
            <span>Edit Profile</span>
          </button>
          
          <button onClick={handleLogoutClick} className="action-button logout">
            <span className="action-icon">🚪</span>
            <span>Logout</span>
          </button>
        </div>
      </div>

      {/* Custom Logout Confirmation Dialog */}
      {showLogoutConfirm && (
        <div className="logout-confirm-overlay">
          <div className="logout-confirm-dialog">
            <h3>Confirm Logout</h3>
            <p>Are you sure you want to logout?</p>
            <div className="logout-confirm-buttons">
              <button 
                className="logout-cancel-btn" 
                onClick={handleCancelLogout}
              >
                Cancel
              </button>
              <button 
                className="logout-confirm-btn" 
                onClick={handleConfirmLogout}
              >
                Yes, Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Profile;