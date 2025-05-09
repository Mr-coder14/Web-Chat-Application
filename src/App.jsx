import {
  Routes,
  Route,
  Navigate,
  useNavigate,
  useLocation,
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

// Navbar component
function Navbar({ user, profileImageUrl }) {
  const location = useLocation();
  const navigate = useNavigate();
  
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  const navbarRef = useRef(null);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const closeMenu = () => {
    setIsMenuOpen(false);
  };
  
  useEffect(() => {
    function handleClickOutside(event) {
      if (
        navbarRef.current &&
        !navbarRef.current.contains(event.target) &&
        isMenuOpen
      ) {
        closeMenu();
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isMenuOpen]);
  
  useEffect(() => {
    closeMenu();
  }, [location.pathname]);

  const getActiveClass = (path) => (location.pathname === path ? "active" : "");

  return (
    <header className="header-container">
      <div className="header-content">
        <div className="header-logo">
          <h3>Chat Application</h3>
        </div>
        
        <div ref={navbarRef} className="navbar-container">
          <nav className={`navbar ${isMenuOpen ? "active" : ""}`}>
            <div className="menu-header">
              <h4>Menu</h4>
              <button className="close-btn" onClick={closeMenu}>
                <i className="bx bx-x"></i>
              </button>
            </div>
            
            <div className="nav-actions">
              <ul className="nav-links">
                <li>
                  <Link to="/home" className={getActiveClass("/home")}>
                    <i className="bx bx-home-alt"></i>
                    <span>Home</span>
                  </Link>
                </li>
                
                <li>
                  <Link to="/requests" className={getActiveClass("/requests")}>
                    <i className="bx bx-copy"></i>
                    <span>Requests</span>
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
          
          {isMenuOpen && (
            <div className="navbar-backdrop" onClick={closeMenu}></div>
          )}
        </div>
        
        <div className="mobile-controls">
          <button className="menu-toggle" onClick={toggleMenu}>
            <i className="bx bx-menu"></i>
          </button>
        </div>
      </div>
    </header>
  );
}



// Profile component


// Main App component with conditional Navbar
function App() {
  const [user, setUser] = useState(null);
  const [profileImageUrl, setProfileImageUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const location = useLocation();
  
  // Check if current route should show navbar
  const showNavbar = !["/", "/signup"].includes(location.pathname);
  
  // Get user data when component mounts
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        
        // Get user profile image if available
        const userRef = ref(database, `users/${currentUser.uid}`);
        onValue(userRef, (snapshot) => {
          const userData = snapshot.val();
          if (userData && userData.profileImageUrl) {
            setProfileImageUrl(userData.profileImageUrl);
          }
        });
      } else {
        setUser(null);
        // Only redirect if on a protected route
        if (showNavbar) {
          // Use window.location instead of navigate (since we're outside router context)
          window.location.href = "/";
        }
      }
      
      setLoading(false);
    });
    
    return () => unsubscribe();
  }, [showNavbar]);
  
  // Display loading indicator while checking auth
  if (loading) {
    return <div className="loading">Loading...</div>;
  }
  
  return (
    <>
      {showNavbar && <Navbar user={user} profileImageUrl={profileImageUrl} />}
      
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
        
        <Route path="/requests" element={
          user ? (
            <div className="content-container requests-container">
              <Requests />
            </div>
          ) : (
            <Navigate to="/" />
          )
        } />
        
        <Route path="/profile" element={
          user ? (
            <div className="content-container requests-container">
              <Profile />
            </div>
          ) : (
            <Navigate to="/" />
          )
        } />
        <Route path="/edit-profile" element={
          user ? (
            <div className="content-container requests-container">
              <EditProfile />
            </div>
          ) : (
            <Navigate to="/" />
          )
        } />
        <Route path="/userslist" element={
          user ? (
            <div className="content-container requests-container">
              <UsersList />
            </div>
          ) : (
            <Navigate to="/" />
          )
        } />
        
        {/* Redirect any other routes to home */}
        <Route path="*" element={<Navigate to={user ? "/home" : "/"} />} />
      </Routes>
    </>
  );
}

export default App;