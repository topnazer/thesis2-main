import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Auth from "./Components/Auth";
import StudentDashboard from "./Dashboards/StudentDashboard";
import FacultyDashboard from "./Dashboards/FacultyDashboard";
import DeanDashboard from "./Dashboards/DeanDashboard";
import AdminDashboard from "./Components/AdminDashboard"; 
import EvaluateSubject from './Evaluate/EvaluateSubject';
import EvaluateFaculty from './Evaluate/EvaluateFaculty';
import EvaluateDean from './Evaluate/EvaluateDean';
import AcafDashboard from "./Dashboards/AcafDashboard";
import FacultyEvaluationPage from './Components/FacultyEvaluationPage';
import EvaluationReportScoringPage from './Components/EvaluationReportScoringPage'; // Adjust path as needed

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Auth />} />
        <Route path="/student-dashboard" element={<StudentDashboard />} />
        <Route path="/faculty-dashboard" element={<FacultyDashboard />} />
        <Route path="/dean-dashboard" element={<DeanDashboard />} />        <Route path="/evaluate-faculty/:facultyId" element={<EvaluateFaculty />} /> {/* Route for EvaluateFaculty */}
        <Route path="/admin-dashboard/*" element={<AdminDashboard />} /> {/* Admin Route */}
        <Route path="/evaluate-dean/:deanId" element={<EvaluateDean />} />
        <Route path="/acaf-dashboard" element={<AcafDashboard />} />
        <Route path="/evaluate-subject/:subjectId/:sectionId" element={<EvaluateSubject />} /> 
        <Route path="/faculty" element={<FacultyEvaluationPage />} />
        <Route path="/admin/evaluation-report" element={<EvaluationReportScoringPage />} />

        
      </Routes> 
    </Router>
  );
}

export default App;
