import React, { useState, useEffect } from "react";
import { auth } from "../firebase";
import { signInWithEmailAndPassword, onAuthStateChanged, sendPasswordResetEmail } from "firebase/auth";
import { getFirestore, doc, getDoc, collection, addDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import './Auth.css';

const LoginForm = ({ toggleSignUp }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [resetEmail, setResetEmail] = useState("");
  const [showResetModal, setShowResetModal] = useState(false);
  const navigate = useNavigate();
  const db = getFirestore();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          // Redirect based on user role
          switch (userData.role) {
            case "Admin":
              navigate("/admin-dashboard");
              break;
            case "Faculty":
              navigate("/faculty-dashboard");
              break;
            case "Dean":
              navigate("/dean-dashboard");
              break;
            case "Student":
              navigate("/student-dashboard");
              break;
            case "ACAF":
              navigate("/acaf-dashboard");
              break;
            default:
              alert("Access denied: Unknown role.");
              break;
          }
        }
      }
    });

    return () => unsubscribe();
  }, [navigate, db]);

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        if (userData.status !== "Approved") {
          alert("Your account is not approved yet.");
          return;
        }

        switch (userData.role) {
          case "Admin":
            navigate("/admin-dashboard");
            break;
          case "Faculty":
            navigate("/faculty-dashboard");
            break;
          case "Dean":
            navigate("/dean-dashboard");
            break;
          case "Student":
            navigate("/student-dashboard");
            break;
          case "ACAF":
            navigate("/acaf-dashboard");
            break;
          default:
            alert("Access denied: Unknown role.");
            break;
        }
      } else {
        console.error("No such document in Firestore!");
        alert("No user data found.");
      }
    } catch (error) {
      console.error("Error logging in:", error);
      alert("Failed to log in: " + error.message);
    }
  };

  const handlePasswordReset = async () => {
    if (!resetEmail) {
      alert("Please enter your email address.");
      return;
    }
  
    try {
      // Add a new password reset request to Firestore, without userId
      await addDoc(collection(db, "passwordResets"), {
        email: resetEmail,
        status: "Pending",  // Request is initially pending
        createdAt: new Date(),
      });
  
      alert("Password reset request sent! An admin will review your request.");
      setShowResetModal(false); // Close modal
    } catch (error) {
      console.error("Error sending password reset request:", error);
      alert("Failed to send password reset request: " + error.message);
    }
  };
  
  
  

  return (
    <div className="auth-page">   
      <div className="auth-container">
        <div className="auth-left">
          <h1>"Hi, Welcome Back!"</h1>
          <form onSubmit={handleLogin}>
            <input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <div className="auth-options">
              <label>
                <input type="checkbox" /> Remember me
              </label>
              <a href="#" onClick={() => setShowResetModal(true)}>Forgot password?</a>
            </div>
            <button type="submit" className="login-button">Login</button>
          </form>
          <div className="auth-span">
            <span>Dont have account? </span><span onClick={toggleSignUp} className="signup-button">Sign up</span>
          </div> 
          <div className="social-links">
            <img src="spc.png" alt="social-link"/>
            <img src="spc.png" alt="social-link"/>
            <img src="spc.png" alt="social-link"/>
          </div>
        </div>
        <div className="auth-right">
          <div className="auth-logo">  
            <img src="spc.png" alt="SPC logo"/>
            <h1>ACADEMIC GUIDANCE EVALUATION SYSTEM</h1>
          </div>
        </div>
        {showResetModal && (
        <div className="modal">
          <div className="modal-content">
            <h2>Reset Password</h2>
            <input
              type="email"
              placeholder="Enter your email"
              value={resetEmail}
              onChange={(e) => setResetEmail(e.target.value)}
              required
            />
            <button onClick={handlePasswordReset}>Send Reset Request</button>
            <button onClick={() => setShowResetModal(false)}>Cancel</button>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};

export default LoginForm;
