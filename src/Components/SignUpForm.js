// File path: ./src/SignUpForm.js

import React, { useState } from "react";
import { auth } from "../firebase";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, setDoc } from "firebase/firestore";
import './Auth.css';

const SignUpForm = ({ toggleLogin }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [lastName, setLastName] = useState("");
  const [department, setDepartment] = useState("CCS"); // Default department to "CCS"
  const [role, setRole] = useState("Student"); // Default role to "Student"
  const db = getFirestore(); // Initialize Firestore

  const handleSignUp = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      alert("Passwords do not match");
      return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Store user information in Firestore with 'Pending' status
      await setDoc(doc(db, "users", user.uid), {
        firstName,
        middleName,
        lastName,
        department,
        email,
        role,
        status: "Pending" // Set initial status as 'Pending'
      });

      console.log("User successfully signed up:", user);
      alert("Sign up successful! Please wait for admin approval.");
      toggleLogin(); // Redirect to login form
    } catch (error) {
      console.error("Error signing up:", error);
      alert("Failed to sign up: " + error.message);
    }
  };

  return (
    <div className="signup-container">
      <div className="signup-box">
        <h2>Create an Account</h2>
        <form onSubmit={handleSignUp}>
          <input
            type="text"
            placeholder="First Name"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            required
          />
          <input
            type="text"
            placeholder="Middle Name"
            value={middleName}
            onChange={(e) => setMiddleName(e.target.value)}
          />
          <input
            type="text"
            placeholder="Last Name"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            required
          />
          <select
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            required
          >
            <option value="CCS">CCS</option>
            <option value="COC">COC</option>
            <option value="CED">CED</option>
            <option value="CASS">CASS</option>
            <option value="COE">COE</option>
            <option value="CBA">CBA</option>
            <option value="ACAF">ACAF</option>
          </select>
          <input
            type="email"
            placeholder="Email"
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
          <input
            type="password"
            placeholder="Confirm Password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
          <select value={role} onChange={(e) => setRole(e.target.value)} className="role-select">
            <option value="Student">Student</option>
            <option value="Faculty">Faculty</option>
            <option value="Dean">Dean</option>
            <option value="ACAF">ACAF</option> {/* New ACAF Role */}
          </select>
          <button type="submit" className="signup-button">Sign Up</button>
        </form>
        <button onClick={toggleLogin} className="login-button">Back to Login</button>
      </div>
    </div>
  );
};

export default SignUpForm;
