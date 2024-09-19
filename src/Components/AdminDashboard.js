import React, { useState, useEffect, } from "react";
import { useNavigate, Route, Routes, Link } from "react-router-dom";
import { getFirestore, doc, getDoc } from "firebase/firestore";
import { auth } from "../firebase";
import { onAuthStateChanged } from "firebase/auth"; // Import directly from firebase/auth
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
          <Link to="users">User</Link>
          <Link to="evaluation-tools">Evaluation Tools</Link>
          <Link to="notifications" className="notification-link">
            Notifications
            {pendingUsersCount > 0 && (
              <span className="badge">{pendingUsersCount}</span>
            )}
          </Link>
          <Link to="subjects">Subjects</Link>
          <Link to="evaluation-report">Evaluation Report</Link> 
        </div>
      </div>

      <div className="nav-container">
          <div className="Admin-header">
            <p>Welcome, Admin! Here you can manage users, evaluation forms, and more.</p>
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
