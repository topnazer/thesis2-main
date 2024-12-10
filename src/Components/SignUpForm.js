import React, { useState } from "react";
import { getAuth, createUserWithEmailAndPassword, signOut, GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { getFirestore, doc, setDoc, getDoc } from "firebase/firestore"; // Firestore imports
import "./Auth.css";

const SignUpForm = ({ toggleLogin }) => {
  const auth = getAuth(); // Initialize auth here
  const db = getFirestore();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [lastName, setLastName] = useState("");
  const [department, setDepartment] = useState("");
  const [role, setRole] = useState("");
  const [isNewUser, setIsNewUser] = useState(false);

  // Handle Manual Sign-Up
  const handleManualSignUp = async (e) => {
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

  // Handle Google Sign-In/Up
  const handleGoogleSignIn = async () => {
    const provider = new GoogleAuthProvider(); // Initialize Google provider
    try {
      const result = await signInWithPopup(auth, provider); // Open Google sign-in popup
      const user = result.user;
  
      // Extract name from Google profile
      const displayName = user.displayName || "";
      const nameParts = displayName.split(" ");
      setFirstName(nameParts[0] || "");
      setLastName(nameParts[1] || "");
      setMiddleName(nameParts[2] || "");
  
      // Check if user already exists in Firestore
      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (!userDoc.exists()) {
        // If user doesn't exist, prefill email and show additional form
        setEmail(user.email || "");
        setIsNewUser(true);
      } else {
        alert("Welcome back!");
      }
    } catch (error) {
      console.error("Error with Google Sign-In:", error.message);
      alert("Failed to sign in with Google: " + error.message);
    }
  };
  

  // Save Additional Info for Google Users
  const handleAdditionalInfoSubmit = async (e) => {
    e.preventDefault();
    const user = auth.currentUser;

    if (!role) {
      alert("Please select a role.");
      return;
    }

    if (role !== "ACAF" && !department) {
      alert("Please select a department.");
      return;
    }

    try {
      const userData = {
        firstName,
        middleName,
        lastName,
        email: user.email,
        role,
        department: role !== "ACAF" ? department : null,
        status: "Pending",
      };

      await setDoc(doc(db, "users", user.uid), userData);
      alert("User information saved successfully.");
      setIsNewUser(false);
    } catch (error) {
      console.error("Error saving user data:", error.message);
    }
  };

  return (
    <div className="signup-container">
      <div className="signup-box">
        <h2>{isNewUser ? "Complete Your Profile" : "Create an Account"}</h2>
        {isNewUser ? (
          <form onSubmit={handleAdditionalInfoSubmit}>
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
              value={role}
              onChange={(e) => {
                const selectedRole = e.target.value;
                setRole(selectedRole);
                if (selectedRole === "ACAF") setDepartment(""); // Clear department if ACAF
              }}
              required
            >
              <option value="" disabled>Select Role</option>
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
            <button type="submit">Save Info</button>
          </form>
        ) : (
          <>
            <form onSubmit={handleManualSignUp}>
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
                value={role}
                onChange={(e) => {
                  const selectedRole = e.target.value;
                  setRole(selectedRole);
                  if (selectedRole === "ACAF") setDepartment(""); // Clear department if ACAF
                }}
                required
              >
                <option value="" disabled>Select Role</option>
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
              <button type="submit" className="signup-button">Sign Up</button>
            </form>
            <button onClick={handleGoogleSignIn} className="google-signin-button">
  Sign in / Sign up with Google
</button>
          </>
        )}
        <button onClick={toggleLogin} className="login-button">Back to Login</button>
      </div>
    </div>
  );
};

export default SignUpForm;
