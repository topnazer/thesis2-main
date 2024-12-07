import React, { useState, useEffect, } from "react";
import { useNavigate, Route, Routes, Link } from "react-router-dom";
import { getFirestore, doc, getDoc } from "firebase/firestore";
import { auth } from "../firebase";
import { onAuthStateChanged,signOut } from "firebase/auth"; 
import UsersPage from "./UsersPage";
import SubjectEvaluationPage from "./SubjectEvaluationPage";
import NotificationsPage from "./NotificationsPage";
import Subjects from "./Subjects";
import EvaluateSubject from '../Evaluate/EvaluateSubject';
import FacultyEvaluationPage from './FacultyEvaluationPage';
import SubjectEvaluationReport from "./SubjectEvaluationReport";
import Evaluation from "./Evaluation";
import Evaluationreport from "./Evaluationreport";
import DeanEvaluationPage from "./DeanEvaluationPage";
import EvaluationReportScoringPage from './EvaluationReportScoringPage'; 
import Facultyevaluationreport from './Facultyevaluationreport'; // Import the component
import PeerEvaluationReport from "./PeerEvaluationReport";
import DeanEvaluationReport from "./DeanEvaluationReport";


import './Admin.css';
import { CircleUserRound, Hammer, FileCheck , Bell, BookCopy  } from 'lucide-react';



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
      <div className="Admin-header">
      <p>bayot ventic ugh uwu </p>
      </div>
      <div className="content-container">
      <div className="Admin-navbar">
        <h1>Dashboard</h1>
        <img src="/spc.png" alt="Description of the image" />
        <div className="Admin-links">
        <Link to="notifications" className="notification-link">
        <Bell/>  Notifications 
        {pendingUsersCount > 0 && (
      <span className="badge">{pendingUsersCount}</span>
    )}
       
  </Link>
          <Link to="users" > <CircleUserRound />   Users</Link>
          <Link to="subjects"><BookCopy/>   Subjects</Link>
          <Link to="Evaluation"><Hammer/>   Evaluation Tools</Link> 
          <Link to="evaluation-report"> <FileCheck /> Evaluation Report</Link>
          <Link to="/admin/evaluation-report">Evaluation Report Scoring</Link>
          <button onClick={handleLogout}>Log Out</button>
          <div className="line"></div>  
        </div>
      </div>
      <div className="route-container">
       <Routes>      
       <Route path="dean-evaluation-reports" element={<DeanEvaluationReport />} />
       <Route path="subject-evaluation-reports" element={<Facultyevaluationreport />} />
       <Route path="peer-evaluation-reports" element={<PeerEvaluationReport />} />
        <Route path="users" element={<UsersPage />} />
        <Route path="subject-evaluation" element={<SubjectEvaluationPage />} />
        <Route path="faculty-evaluation" element={<FacultyEvaluationPage />} />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="subjects" element={<Subjects />} />
        <Route path="evaluate-subject/:subjectId" element={<EvaluateSubject />} />
        <Route path="subject-evaluation-report" element={<SubjectEvaluationReport />} />
        <Route path="evaluation-report" element={<Evaluationreport />} />
        <Route path="Evaluation" element={<Evaluation />} />
        <Route path="dean-evaluation" element={<DeanEvaluationPage />} />
        <Route path="/admin/evaluation-report" element={<EvaluationReportScoringPage />} />
       </Routes>
      </div>  
    </div>
    </div>
  );
};

export default AdminDashboard;
