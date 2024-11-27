import React, { useState } from "react";
import { auth } from "../firebase";
import { createUserWithEmailAndPassword, signOut } from "firebase/auth";
import { getFirestore, doc, setDoc } from "firebase/firestore";
import './Auth.css';

const SignUpForm = ({ toggleLogin }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [lastName, setLastName] = useState("");
  const [department, setDepartment] = useState(""); // Start with an empty department
  const [role, setRole] = useState(""); // Start with no default role
  const db = getFirestore();

  const handleSignUp = async (e) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      alert("Passwords do not match");
      return;
    }

    if (!role) {
      alert("Please select a role.");
      return;
    }

    if (role !== "ACAF" && !department) {
      alert("Please select a department.");
      return;
    }

    try {
      console.log("Creating user...");
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      console.log("User created successfully:", user);

      console.log("Saving user data in Firestore...");
      // Prepare user data
      const userData = {
        firstName,
        middleName,
        lastName,
        email,
        role,
        status: "Pending",
      };

      // Ensure department is only added for non-ACAF roles
      if (role !== "ACAF") {
        userData.department = department;
      } else {
        delete userData.department; // Explicitly remove department field
      }

      await setDoc(doc(db, "users", user.uid), userData);
      console.log("User data saved to Firestore");

      console.log("Attempting to sign out...");
      await signOut(auth);
      console.log("Sign-out successful");

      alert("Sign-up successful! Please wait for admin approval.");
      toggleLogin();
    } catch (error) {
      console.error("Error in sign-up process:", error.message, error.stack);
      alert("Failed to sign up: " + error.message);
    }
  };

  return (
    <div className="signup-container">
      <div className="signup-box">
        <h2>Create an Account</h2>
        <form onSubmit={handleSignUp}>
          <select
            value={role}
            onChange={(e) => {
              const selectedRole = e.target.value;
              setRole(selectedRole);
              if (selectedRole === "ACAF") {
                setDepartment(""); // Clear department when role is ACAF
              }
            }}
            className="role-select"
            required
          >
            <option value="" disabled selected>Select Role</option>
            <option value="Student">Student</option>
            <option value="Faculty">Faculty</option>
            <option value="Dean">Dean</option>
            <option value="ACAF">ACAF</option>
          </select>
          {(role === "Student" || role === "Faculty" || role === "Dean") && (
            <select
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              required
            >
              <option value="" disabled>Select Department</option>
              <option value="CCS">CCS</option>
              <option value="COC">COC</option>
              <option value="CED">CED</option>
              <option value="CASS">CASS</option>
              <option value="COE">COE</option>
              <option value="CBA">CBA</option>
            </select>
          )}
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
          <div className="span-item">
            <button type="submit" className="signup-button">Sign Up</button>
          </div>
        </form>
        <button onClick={toggleLogin} className="login-button">Back to Login</button>
      </div>
    </div>
  );
};

export default SignUpForm;
