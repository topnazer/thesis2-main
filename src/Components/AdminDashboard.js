import React, { useState, useEffect, } from "react";
import { useNavigate, Route, Routes, Link } from "react-router-dom";
import { getFirestore, doc, getDoc } from "firebase/firestore";
import { auth } from "../firebase";
import { onAuthStateChanged,signOut } from "firebase/auth"; // Import directly from firebase/auth
import UsersPage from "./UsersPage";
import EvaluationToolsPage from "./EvaluationToolsPage";
import NotificationsPage from "./NotificationsPage";
import Subjects from "./Subjects";
import EvaluateSubject from '../Evaluate/EvaluateSubject';
import EvaluationReportPage from "./EvaluationReportPage";
import './Admin.css';

const AdminDashboard = () => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [pendingUsersCount, setPendingUsersCount] = useState(0);
  const db = getFirestore();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      console.log("User logged out successfully");
      // Optionally, redirect to login page or show message
    } catch (error) {
      console.error("Error logging out: ", error);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists() && userDoc.data().role === "Admin") {
          setIsAdmin(true);

          // Retrieve the pending users count from localStorage
          const storedCount = localStorage.getItem('pendingUsersCount') || 0;
          setPendingUsersCount(parseInt(storedCount, 10)); // Parse it into an integer
        } else {
          navigate("/");
        }
      } else {
        navigate("/");
      }
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, [navigate, db]);

  if (!isAdmin) return <p>tagad ha</p>;

  return (

    <div className="whole-container">
      <div className="Admin-navbar">
        <h1>Admin Dashboard</h1>
        <div className="Admin-links">
          <Link to="users">Users</Link>
          <Link to="evaluation-tools">Evaluation Tools</Link>
          <Link to="evaluation-report">Evaluation Report</Link>
          <Link to="notifications" className="notification-link">
            Notifications
            {pendingUsersCount > 0 && (
              <span className="badge">{pendingUsersCount}</span>
            )}
          </Link>
          <Link to="subjects">Subjects</Link>
          <button onClick={handleLogout}>Log Out</button>
    
        </div>
      </div>

      <div className="right-container">
          <div className="Admin-header">
            <p>she wanna do drugs smoke weed get drunk theys hoes luh</p>
          </div>
            <div className="route-container">
              <Routes>
                <Route path="users" element={<UsersPage />} />
                <Route path="evaluation-tools" element={<EvaluationToolsPage />} />
                <Route path="notifications" element={<NotificationsPage />} />
                <Route path="subjects" element={<Subjects />} />
                <Route path="evaluate-subject/:subjectId" element={<EvaluateSubject />} />
                <Route path="evaluation-report" element={<EvaluationReportPage />} />
              </Routes>
            </div>  
      </div>
    </div>
  );
};

export default AdminDashboard;
