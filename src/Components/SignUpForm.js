import React, { useState } from "react";
import { getAuth, createUserWithEmailAndPassword, signOut } from "firebase/auth";
import { getFirestore, doc, setDoc } from "firebase/firestore"; // Firestore imports
import "./Auth.css";

const SignUpForm = ({ toggleLogin }) => {
  const auth = getAuth(); 
  const db = getFirestore();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [lastName, setLastName] = useState("");
  const [department, setDepartment] = useState("");
  const [role, setRole] = useState("");

  // Handle Manual Sign-Up
  const handleManualSignUp = async (e) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      alert("Passwords do not match");
      return;
    }

    if (!email.endsWith("@gmail.com")) {
      alert("Please enter a valid Gmail email address.");
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
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      const userData = {
        firstName,
        middleName,
        lastName,
        email,
        role,
        department: role !== "ACAF" ? department : null,
        status: "Pending",
      };

      await setDoc(doc(db, "users", user.uid), userData);
      alert("Sign-up successful! Please wait for admin approval.");
      await signOut(auth);
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
        <form onSubmit={handleManualSignUp}>
        <select
            value={role}
            onChange={(e) => {
              const selectedRole = e.target.value;
              setRole(selectedRole);
              if (selectedRole === "ACAF") setDepartment(""); 
            }}
            required
          >
            <option value="" disabled>Select Role</option>
            <option value="Student">Student</option>
            <option value="Faculty">Faculty</option>
            <option value="Dean">Dean</option>
            <option value="ACAF"disabled>ACAF</option>
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
            placeholder="Gmail Address"
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
          <button type="submit" className="signup-button">Sign Up</button>
        </form>
        <button onClick={toggleLogin} className="login-button">Back to Login</button>
      </div>
    </div>
  );
};

export default SignUpForm;
