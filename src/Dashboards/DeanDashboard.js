import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getFirestore, doc, getDoc, onSnapshot, collection, query, where, getDocs } from "firebase/firestore";
import { auth } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";
import './deandashboard.css';

const DeanDashboard = () => {
  const [facultyList, setFacultyList] = useState([]);
  const [evaluationReports, setEvaluationReports] = useState([]);
  const [evaluatorNames, setEvaluatorNames] = useState({});
  const [userName, setUserName] = useState(""); 
  const [evaluationsDone, setEvaluationsDone] = useState({});
  const [showEvaluationReport, setShowEvaluationReport] = useState(false); // State for toggling evaluation report modal
  const [loading, setLoading] = useState(true); // Loading state to manage data fetching and authentication status
  const navigate = useNavigate();
  const db = getFirestore();

  useEffect(() => {
    // Check authentication status and fetch data if authenticated
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        // Fetch all necessary data
        fetchUserInfo(user);
        fetchFacultyInDepartment(user);
        fetchEvaluationReports(user);
        fetchEvaluationsDone(user);
        setLoading(false); // Set loading to false after data fetching
      } else {
        // Redirect to login if not authenticated
        navigate("/");
      }
    });
    return unsubscribe; // Cleanup on unmount
  }, [db, navigate]);

  const fetchUserInfo = async (user) => {
    try {
      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        setUserName(`${userData.firstName} ${userData.lastName}`);
      }
    } catch (error) {
      console.error("Error fetching user info:", error);
    }
  };

  const fetchFacultyInDepartment = async (user) => {
    try {
      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (userDoc.exists()) {
        const department = userDoc.data().department;

        const facultyQuery = query(
          collection(db, "users"),
          where("department", "==", department),
          where("role", "==", "Faculty")
        );

        onSnapshot(facultyQuery, (snapshot) => {
          setFacultyList(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });
      }
    } catch (error) {
      console.error("Error fetching faculty in department:", error);
    }
  };

  const fetchEvaluationsDone = async (user) => {
    try {
      const facultyEvaluationsCollection = collection(db, 'facultyEvaluations');
      const evaluationsSnapshot = await getDocs(facultyEvaluationsCollection);

      const evaluationsMap = {};
      for (const facultyDoc of evaluationsSnapshot.docs) {
        const facultyId = facultyDoc.id;

        const completedEvaluationsCollection = collection(db, 'facultyEvaluations', facultyId, 'completed_evaluations');
        const completedEvaluationsSnapshot = await getDocs(completedEvaluationsCollection);

        const userEvaluated = completedEvaluationsSnapshot.docs.some(doc => doc.id === user.uid);
        evaluationsMap[facultyId] = userEvaluated;
      }
      setEvaluationsDone(evaluationsMap);
    } catch (error) {
      console.error("Error fetching completed evaluations:", error);
    }
  };

  const fetchEvaluationReports = async (user) => {
    try {
      const evaluationsCollection = collection(db, "deanEvaluations", user.uid, "completed_evaluations");
      onSnapshot(evaluationsCollection, async (snapshot) => {
        const reports = snapshot.docs.map(doc => doc.data());
        setEvaluationReports(reports);

        const evaluatorIds = reports.map(report => report.userId);
        const namesToFetch = evaluatorIds.filter(id => !evaluatorNames[id]);
        const evaluatorNamesCopy = { ...evaluatorNames };

        if (namesToFetch.length > 0) {
          const namePromises = namesToFetch.map(async (userId) => {
            const userDoc = await getDoc(doc(db, "users", userId));
            if (userDoc.exists()) {
              const userData = userDoc.data();
              evaluatorNamesCopy[userId] = `${userData.firstName} ${userData.lastName}`;
            } else {
              evaluatorNamesCopy[userId] = "Unknown Evaluator";
            }
          });

          await Promise.all(namePromises);
          setEvaluatorNames(evaluatorNamesCopy);
        }
      });
    } catch (error) {
      console.error("Error fetching evaluation reports:", error);
    }
  };

  const handleEvaluateFaculty = (facultyId) => {
    navigate(`/evaluate-faculty/${facultyId}`, {
      state: { redirectTo: "/dean-dashboard" }
    });
  };

  const handleSignOut = async () => {
    try {
      await auth.signOut();
      navigate("/");
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  return (
    <div className="dean-dashboard">
      {loading ? (
        <p>Loading...</p>
      ) : (
        <>
          <nav>
          <div className="dashboardlogo-container">
            <img src="/spc.png" alt="Logo" className="dashboardlogo" />
          </div>
            <h1>Dean Dashboard</h1>
            <div style={{ display: "flex", alignItems: "center" }}>
              <span>{userName}</span>
              <button onClick={() => setShowEvaluationReport(!showEvaluationReport)}>Evaluation Report</button>
              <button onClick={handleSignOut}>Sign Out</button>
            </div>
          </nav>

          {/* Evaluation Report Modal */}
          {showEvaluationReport && (
            <div className="deanevaluation-report-modal">
              <h2>Evaluation Report</h2>
              {evaluationReports.length > 0 ? (
                <table>
                  <thead>
                    <tr>
                      <th>Evaluator</th>
                      <th>Average Score</th>
                      <th>Comments</th>
                    </tr>
                  </thead>
                  <tbody>
                    {evaluationReports.map((report, index) => (
                      <tr key={index}>
                        <td>{evaluatorNames[report.userId] || report.userId}</td>
                        <td>{report.percentageScore.toFixed(2)}%</td>
                        <td>{report.comment}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p>No evaluations submitted yet.</p>
              )}
              <button onClick={() => setShowEvaluationReport(false)}>Close</button>
            </div>
          )}

          <section>
            <h2>Evaluate Faculty</h2>
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Faculty Name</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {facultyList.map((faculty) => (
                  <tr key={faculty.id}>
                    <td>{faculty.id}</td>
                    <td>{faculty.firstName} {faculty.lastName}</td>
                    <td>
                      {evaluationsDone[faculty.id] ? (
                        <span className="evaluation-done">Evaluation Done</span>
                      ) : (
                        <button onClick={() => handleEvaluateFaculty(faculty.id)}>Evaluate</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </>
      )}
    </div>
  );
};

export default DeanDashboard;
