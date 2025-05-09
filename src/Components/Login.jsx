import { Link, useNavigate } from "react-router-dom";
import React, { useState, useEffect } from "react";
import { auth, database } from "./firebase";
import {
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
} from "firebase/auth";
import { ref, onValue, get, set, remove } from "firebase/database";
import "../css/Login.css";

function Login({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState(""); 
  const [showPassword, setShowPassword] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  
  
  const admins = ["saleem1712005@gmail.com", "jayaraman00143@gmail.com", "abcd1234@gmail.com"];
  const [tempAdmins, setTempAdmins] = useState([]);

  // Fetch temp admins from Firebase on component mount
  useEffect(() => {
    const tempAdminsRef = ref(database, "tempadmin");
    
    onValue(tempAdminsRef, (snapshot) => {
      const tempAdminsList = [];
      if (snapshot.exists()) {
        snapshot.forEach((childSnapshot) => {
          const tempAdminEmail = childSnapshot.child("email").val();
          if (tempAdminEmail) {
            console.log(tempAdminEmail);
            tempAdminsList.push(tempAdminEmail);
          }
        });
      }
      setTempAdmins(tempAdminsList);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching temp admins:", error);
      setLoading(false);
    });
  }, []);

  // Function to migrate user data from users to tempadmin1
  const migrateUserToTempAdmin = async (userId, userEmail) => {
    console.log("Attempting to migrate user:", userId, userEmail);
    try {
      const userRef = ref(database, `users/${userId}`);
      const userSnapshot = await get(userRef);
      
      if (userSnapshot.exists()) {
        // Get user data
        const userData = userSnapshot.val();
        console.log("User data found:", userData);
        
        // Create a new entry in tempadmin1 with the user data
        const tempAdminRef = ref(database, `tempadmin1/${userId}`);
        
        // Make sure email is included in the tempadmin data
        const tempAdminData = {
          ...userData,
          // Ensure email is explicitly included
        };
        
        // Set the data in tempadmin1 node
        await set(tempAdminRef, tempAdminData);
        console.log("Data set in tempadmin1:", tempAdminData);
        
        // Remove user data from users node
        await remove(userRef);
        
        console.log(`User ${userId} successfully migrated to tempadmin1`);
        return true;
      } else {
        console.log(`User ${userId} not found in users database`);
        return false;
      }
    } catch (error) {
      console.error("Error migrating user to tempadmin:", error);
      return false;
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();

    if (!email || !password) {
      setMessage("Please enter all details");
      setMessageType("error");
      setTimeout(() => setMessage(""), 4000);
      return;
    }

    if (password.length < 6) {
      setMessage("Incorrect Password");
      setMessageType("error");
      setTimeout(() => setMessage(""), 4000);
      return;
    }

    
    setMessage("Logging in, please wait...");
    setMessageType("loading");

    try {
      // Authenticate the user
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Determine user type based on email
      let userType = "user";
      
      // First check if the email is in the admins list
      if (admins.includes(email.toLowerCase())) {
        userType = "admin";
      } 
      // Then check if the email is in the tempAdmins list
      else if (tempAdmins.includes(email.toLowerCase())) {
        userType = "tempadmin";
        
        // For tempadmin, check if user data exists in users node and migrate if needed
        const migrationResult = await migrateUserToTempAdmin(user.uid, email);
        if (migrationResult) {
          console.log("Successfully migrated user data to tempadmin1");
        } else {
          console.log("No migration needed or migration failed");
          
          // Check if user already exists in tempadmin1
          const tempAdminRef = ref(database, `tempadmin1/${user.uid}`);
          const tempAdminSnapshot = await get(tempAdminRef);
          
          // If user doesn't exist in tempadmin1, create a new entry
          if (!tempAdminSnapshot.exists()) {
            console.log("Creating new entry in tempadmin1");
            await set(tempAdminRef, {
              email: email,
              uid: user.uid,
              // Add any other default fields you want for temp admins
            });
          }
        }
      }
      
      setMessage("Login Successful! Redirecting...");
      setMessageType("success");
      
      // Navigate based on user type
      setTimeout(() => {
        // Only call onLogin if it's a function
        if (typeof onLogin === 'function') {
          onLogin();
        }
        
        if (userType === "admin") {
          navigate("/admin");
        } else if (userType === "tempadmin") {
          navigate("/tempadmin");
        } else {
          navigate("/home");
        }
      }, 1000);
    } catch (error) {
      if (error.code === "auth/user-not-found" || error.code === "auth/invalid-email") {
        setMessage("Invalid email or password. Please try again.");
      } else if (error.code === "auth/invalid-credential") {
        setMessage("Invalid password or Email. Please try again.");
      } else {
        setMessage("Login failed. Please try again.");
      }
      setMessageType("error");
      setTimeout(() => setMessage(""), 4000);
    }
  };

  const handleForgotPassword = () => {
    setShowResetModal(true);
  };

  const handleResetPassword = () => {
    if (!resetEmail) {
      setMessage("Please enter your registered email");
      setMessageType("error");
      setTimeout(() => setMessage(""), 4000);
      return;
    }

    sendPasswordResetEmail(auth, resetEmail)
      .then(() => {
        setMessage("Check your email");
        setMessageType("success");
        setShowResetModal(false);
        setTimeout(() => setMessage(""), 4000);
      })
      .catch((error) => {
        setMessage("Unable to send, failed");
        setMessageType("error");
        setTimeout(() => setMessage(""), 4000);
      });
  };

  if (loading) {
    return <div className="loadingloginl">Loading...</div>;
  }

  return (
    <div className="loginboxloginl">
      <form className="loginbox1loginl" onSubmit={handleLogin}>
        <h2 className="loginh1loginl">Login</h2>

        <input
          className="logininputloginl"
          type="email"
          placeholder="Enter Your Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <div className="password-containerloginl">
          <input
            className="logininputloginl"
            type={showPassword ? "text" : "password"}
            placeholder="Enter Your Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        <div className="showloginl">
          <label className="show-passwordloginl">
            <input
              type="checkbox"
              checked={showPassword}
              onChange={(e) => setShowPassword(e.target.checked)}
            />
            Show Password
          </label>
          <p className="forgotpasswordlinkloginl" onClick={handleForgotPassword}>
            Forgot Password?
          </p>
        </div>

        <button type="submit" className="loginbuttonloginl">
          Login
        </button>

        {/* {message && (
          <div className={`loginmessageloginl ${messageType}`}>{message}</div>
        )} */}

        <p className="signup-linkloginl">
          Don't have an account?
          <span
            className="signup-textloginl"
            onClick={() => navigate("/signup")}
            style={{
              color: "blue",
              cursor: "pointer",
              textDecoration: "underline",
              fontSize: "16px",
            }}
          >
            Create Account
          </span>
        </p>
      </form>

      {showResetModal && (
        <div className="reset-modaloginl">
          <div className="reset-modal-contentloginl">
            <h4>Reset Password</h4>
            <input
              type="email"
              placeholder="Enter your email for reset"
              value={resetEmail}
              onChange={(e) => setResetEmail(e.target.value)}
              className="reset-email-inputloginl"
            />
            <div className="reset-buttonsloginl">
              <button className="reset-buttonloginl" onClick={handleResetPassword}>
                Reset
              </button>
              <button
                className="cancel-buttonloginl"
                onClick={() => setShowResetModal(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Login;