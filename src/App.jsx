import {
  Routes,
  Route,
  Navigate,
  useNavigate,
  useLocation,
  matchPath,
  Link
} from "react-router-dom";

import './App.css';
import Login from './Components/Login';
import Signup from "./Components/Signup";
import React, { useState, useEffect, useRef } from "react";
import { auth, database } from "./Components/firebase";
import { getDatabase, ref, onValue } from "firebase/database";
import Home from "./Components/Home";
import Requests from "./Components/Requests";
import Profile from "./Components/Profile";
import EditProfile from "./Components/EditProfile";
import UsersList from "./Components/UsersList";
import ChatActivity from "./Components/ChatActivity";
import { Home as HomeIcon, User, Search, MessageSquare } from 'lucide-react';

// Navbar component
function Navbar({ user, profileImageUrl }) {
  const location = useLocation();
  
  const getActiveClass = (path) => (location.pathname === path ? "active" : "");

  return (
    <>
      {/* Desktop Navbar */}
      <header className="header-container desktop-only">
        <div className="header-content">
          <div className="header-logo">
            <h3>Chat Application</h3>
          </div>
          
          <div className="navbar-container">
            <nav className="navbar">
              <div className="nav-actions">
                <ul className="nav-links">
                  <li>
                    <Link to="/home" className={getActiveClass("/home")}>
                      <i className="bx bx-home-alt"></i>
                      <span>Home</span>
                    </Link>
                  </li>
                  <li>
                    <Link to="/userslist" className={getActiveClass("/userslist")}>
                      <i className="bx bx-search"></i>
                      <span>Users</span>
                    </Link>
                  </li>
                </ul>
                
                <Link
                  to="/profile"
                  className={`profile-link ${getActiveClass("/profile")}`}
                >
                  <img
                    src={profileImageUrl || "/person3.jpg"}
                    alt="Profile"
                    className="profile-image"
                  />
                </Link>
              </div>
            </nav>
          </div>
        </div>
      </header>

      {/* Mobile Bottom Navbar */}
      <nav className="bottom-navbar">
        <ul className="bottom-nav-links">
          <li>
            <Link to="/home" className={getActiveClass("/home")}>
              <HomeIcon size={20} />
              <span>Home</span>
            </Link>
          </li>
          <li>
            <Link to="/userslist" className={getActiveClass("/userslist")}>
              <Search size={20} />
              <span>Users</span>
            </Link>
          </li>
          <li>
            <Link to="/profile" className={getActiveClass("/profile")}>
              <User size={20} />
              <span>Profile</span>
            </Link>
          </li>
        </ul>
      </nav>
    </>
  );
}

// Main App component with conditional Navbar
// Main App component with conditional Navbar
function App() {
  const [user, setUser] = useState(null);
  const [profileImageUrl, setProfileImageUrl] = useState(null);
  const [loading, setLoading] = useState(true);
 
  
  const location = useLocation();

  const hideNavbarRoutes = ["/", "/signup"];
  const isChatPage = matchPath("/chat/:userId", location.pathname);
  
  const showNavbar = !hideNavbarRoutes.includes(location.pathname) && !isChatPage;

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        
        const userRef = ref(database, `users/${currentUser.uid}`);
        onValue(userRef, (snapshot) => {
          const userData = snapshot.val();
          if (userData && userData.profileImageUrl) {
            setProfileImageUrl(userData.profileImageUrl);
          }
        });
      } else {
        setUser(null);
        if (showNavbar) {
          window.location.href = "/";
        }
      }
      
      setLoading(false);
    });
    
    return () => unsubscribe();
  }, [showNavbar]);

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="app-container">
      {showNavbar && <Navbar user={user} profileImageUrl={profileImageUrl} />}
      
      <div className={`main-content ${showNavbar ? 'has-navbar' : ''}`}>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          
          <Route path="/home" element={
            user ? (
              <div className="content-container home-container">
                <Home />
              </div>
            ) : (
              <Navigate to="/" />
            )
          } />
          
          <Route path="/profile" element={
            user ? (
              <div className="content-container profile-container">
                <Profile />
              </div>
            ) : (
              <Navigate to="/" />
            )
          } />
          
          <Route path="/chat/:userId" element={
            user ? (
              <div className="content-container profile-container">
                <ChatActivity />
              </div>
            ) : (
              <Navigate to="/" />
            )
          } />
          
          <Route path="/edit-profile" element={
            user ? (
              <div className="content-container">
                <EditProfile />
              </div>
            ) : (
              <Navigate to="/" />
            )
          } />
          
          <Route path="/userslist" element={
            user ? (
              <div className="content-container">
                <UsersList />
              </div>
            ) : (
              <Navigate to="/" />
            )
          } />
          
          <Route path="*" element={<Navigate to={user ? "/home" : "/"} />} />
        </Routes>
      </div>
    </div>
  );
}


export default App;