import React, { useState } from "react";
import { auth } from "../firebase";
import { signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, getDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import './Auth.css';


const LoginForm = ({ toggleSignUp }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();
  const db = getFirestore();

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        console.log("User role:", userData.role);

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
              <a href="/forgot-password">Forgot password?</a>
            </div>
            <button type="submit" className="login-button">Login</button>
          </form>
          <button onClick={toggleSignUp} className="signup-button">Sign up</button>
          <div className="social-links">
            <span>Follow</span>
            <a href="#"> <i className="fab fa-facebook-f"></i> </a>
            <a href="#"> <i className="fab fa-twitter"></i> </a>
            <a href="#"> <i className="fab fa-instagram"></i> </a>
          </div>
        </div>
        <div className="auth-right">
          <h1>"Growth starts with honest feedback. Evaluate to improve, not to criticize."</h1>
        </div>
      </div>
    </div>
  );
};

export default LoginForm;
