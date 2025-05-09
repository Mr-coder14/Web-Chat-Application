import { Link, useNavigate } from "react-router-dom";
import "../css/Signup.css";
import React, { useState, useEffect } from "react";
import { auth, database } from "./firebase";
import {
  createUserWithEmailAndPassword,
  updateProfile,
} from "firebase/auth";
import { ref, set, get, onValue } from "firebase/database";

function Signup() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phno, setPhno] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        navigate("/home");
      }
    });

    return () => unsubscribe();
  }, []);

  const showTermsAndConditions = () => {
    navigate("/terms");
  };

  const handleSignup = async (e) => {
    e.preventDefault();

    if (!termsAccepted) {
      setMessage("❌ Please accept the terms and conditions to proceed.");
      setTimeout(() => setMessage(""), 4000);
      return;
    }

    if (phno.length !== 10) {
      setMessage("❌ Phone number must be exactly 10 digits.");
      setTimeout(() => setMessage(""), 4000);
      return;
    }

    if (password.length < 6) {
      setMessage("❌ Password must be at least 6 characters.");
      setTimeout(() => setMessage(""), 4000);
      return;
    }

    if (password !== confirmPassword) {
      setMessage("❌ Passwords do not match.");
      setTimeout(() => setMessage(""), 4000);
      return;
    }

    try {
      setMessage("✅ Creating account... Please wait.");

      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      const user = userCredential.user;

      await updateProfile(user, { displayName: name });

      // Prepare user details object
      const userDetails = {
        name: name,
        email: email,
        phno: phno,
        userid: user.uid,
      };

      // FIXED LINE: Using template literals (backticks) and the correct user.uid property
      await set(ref(database, `users/${user.uid}`), userDetails);

      setMessage("✅ Account Created Successfully! Redirecting...");
      
      navigate("/home");
      
    } catch (error) {
      if (error.code === "auth/email-already-in-use") {
        setMessage("❌ Email is already registered. Please login.");
      } else {
        setMessage("❌ Error: " + error.message);
      }
      setTimeout(() => setMessage(""), 4000);
    }
  };

  if (loading) {
    return <div className="loadingsignupt">Loading...</div>;
  }

  return (
    <div className="signupboxsignupt">
      <form className="signupbox1signupt" onSubmit={handleSignup}>
        <h1 className="signuph1signupt">Signup</h1>
        <input
          className="signupinputsignupt"
          type="text"
          placeholder="Enter Your Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <input
          className="signupinputsignupt"
          type="tel"
          placeholder="Enter Your Phone Number"
          value={phno}
          onChange={(e) => {
            const value = e.target.value.replace(/\D/g, "");
            if (value.length <= 10) setPhno(value);
          }}
          maxLength="10"
          required
        />
        <input
          className="signupinputsignupt"
          type="email"
          placeholder="Enter Your Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <input
          className="signupinputsignupt"
          type={showPassword ? "text" : "password"}
          placeholder="Create Your Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <input
          className="signupinputsignupt"
          type={showPassword ? "text" : "password"}
          placeholder="Confirm Your Password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
        />

        <div className="show-password-containersignupt">
          <input
            type="checkbox"
            id="show-password"
            checked={showPassword}
            onChange={() => setShowPassword(!showPassword)}
            className="checkboxinputsignupt"
          />
          <label htmlFor="show-password" className="checkboxlabelsignupt"> Show Password</label>
        </div>

        <div className="terms-containersignupt">
          <input
            type="checkbox"
            id="terms-checkbox"
            checked={termsAccepted}
            onChange={() => setTermsAccepted(!termsAccepted)}
            className="checkboxinputsignupt"
          />
          <label htmlFor="terms-checkbox" onClick={showTermsAndConditions} className="termslabelsignupt">
            I accept the Terms and Conditions
          </label>
        </div>

        <button type="submit" className="signupbuttonsignupt">
          Sign Up
        </button>
        {message && (
          <div
            className={`signupmessagesignupt ${
              message.startsWith("❌") ? "errorsignupt" : ""
            }`}
          >
            {message}
          </div>
        )}
        <p className="login-linksignupt">
          Already have an account? <Link to="/login" className="loginlinktextsignupt">Login</Link>
        </p>
      </form>
    </div>
  );
}

export default Signup;