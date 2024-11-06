import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getFirestore, doc, getDoc, collection, onSnapshot, query, where, getDocs } from "firebase/firestore";
import { auth } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";
import './facultydashboard.css';

const FacultyDashboard = () => {
  const [evaluationForm, setEvaluationForm] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [facultyList, setFacultyList] = useState([]);
  const [deanList, setDeanList] = useState([]);
  const [averageScore, setAverageScore] = useState(null);
  const [userName, setUserName] = useState("");
  const [evaluationsDone, setEvaluationsDone] = useState({});
  const [showNotifications, setShowNotifications] = useState(false);
  const [showEvaluationReport, setShowEvaluationReport] = useState(false);
  const [loading, setLoading] = useState(true);
  const [subjectScores, setSubjectScores] = useState({});

  const navigate = useNavigate();
  const db = getFirestore();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        fetchUserInfo(user);
        fetchEvaluationForm();
        fetchNotifications(user);
        fetchSubjects(user);
        fetchFacultyInDepartment(user);
        fetchEvaluationsDoneForUser(user);
        fetchDeansInDepartment(user);
        fetchScores(); // Fetch scores on load
        setLoading(false);
      } else {
        navigate("/"); // Redirect to login if not authenticated
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

  const fetchScores = async () => {
    try {
      const user = auth.currentUser;
      if (user) {
        const facultyEvaluationDoc = await getDoc(doc(db, "facultyEvaluations", user.uid));
        if (facultyEvaluationDoc.exists()) {
          const data = facultyEvaluationDoc.data();
          setAverageScore(data.averageScore); // Update state with the fetched average score
        } else {
          console.warn("No evaluation data found for this faculty member.");
          setAverageScore(null); // Set to null if no data exists
        }
      }
  
      const subjectScoresMap = {};
      const subjectsSnapshot = await getDocs(collection(db, "faculty", user.uid, "subjects"));
      for (const subjectDoc of subjectsSnapshot.docs) {
        const subjectEvaluationDoc = await getDoc(doc(db, "subjectEvaluations", subjectDoc.id));
        if (subjectEvaluationDoc.exists()) {
          subjectScoresMap[subjectDoc.id] = subjectEvaluationDoc.data().averageScore;
        }
      }
      setSubjectScores(subjectScoresMap);
    } catch (error) {
      console.error("Error fetching scores:", error);
    }
  };
  

  const fetchEvaluationForm = async () => {
    try {
      const evaluationDoc = await getDoc(doc(db, "evaluations", "faculty"));
      if (evaluationDoc.exists()) {
        setEvaluationForm(evaluationDoc.data().questions);
      } else {
        console.error("No evaluation form found for faculty.");
      }
    } catch (error) {
      console.error("Error fetching evaluation form:", error);
    }
  };

  const fetchNotifications = async (user) => {
    try {
      const notificationsCollection = collection(db, "notifications", user.uid, "userNotifications");
      onSnapshot(notificationsCollection, (snapshot) => {
        setNotifications(snapshot.docs.map((doc) => doc.data()));
      });
    } catch (error) {
      console.error("Error fetching notifications:", error);
    }
  };

  const fetchSubjects = async (user) => {
    try {
      const subjectsCollection = collection(db, "faculty", user.uid, "subjects");
      onSnapshot(subjectsCollection, (snapshot) => {
        setSubjects(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
      });
    } catch (error) {
      console.error("Error fetching subjects:", error);
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
          setFacultyList(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
        });
      }
    } catch (error) {
      console.error("Error fetching faculty in department:", error);
    }
  };

  const fetchEvaluationsDoneForUser = async (user) => {
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

  const fetchDeansInDepartment = async (user) => {
    try {
      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (userDoc.exists()) {
        const department = userDoc.data().department;

        const deanQuery = query(
          collection(db, "users"),
          where("department", "==", department),
          where("role", "==", "Dean")
        );

        onSnapshot(deanQuery, (snapshot) => {
          setDeanList(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
        });
      }
    } catch (error) {
      console.error("Error fetching deans in department:", error);
    }
  };

  const handleSignOut = async () => {
    try {
      await auth.signOut();
      navigate("/");
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const handleEvaluateFaculty = (facultyId) => {
    navigate(`/evaluate-faculty/${facultyId}`, {
      state: { redirectTo: "/faculty-dashboard" }
    });
  };

  return (
    <div className="faculty-dashboard">
      {loading ? (
        <p>Loading...</p>
      ) : (
        <>
          <nav style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h1>Faculty Dashboard</h1>
            <div style={{ display: "flex", alignItems: "center" }}>
              <span>{userName}</span>
              <button className="notification-icon" onClick={() => setShowNotifications(!showNotifications)}>
                Notifications {notifications.length > 0 && `(${notifications.length})`}
              </button>
              <button onClick={() => setShowEvaluationReport(!showEvaluationReport)}>Evaluation Report</button>
              <button onClick={handleSignOut}>Sign Out</button>
            </div>

            {showNotifications && (
              <div className="notifications-dropdown">
                <ul>
                  {notifications.length > 0 ? (
                    notifications.map((notification, index) => (
                      <li key={index}>{notification.message}</li>
                    ))
                  ) : (
                    <li>No new notifications</li>
                  )}
                </ul>
              </div>
            )}
          </nav>

          {/* Evaluation Report Modal */}
          {showEvaluationReport && (
            <div className="evaluation-report-modal">
              <h2>Evaluation Report</h2>

              <div className="evaluation-box-container">
                {/* Displaying the Average Score for the Faculty Member */}
                <div className="evaluation-box">
                  <h3>Your Average Score</h3>
                  <p>{averageScore !== null ? averageScore.toFixed(2) : "No evaluations submitted"}</p>
                </div>

                {/* Right Box: Subject Average Scores */}
                <div className="evaluation-box">
                  <h3>Subject Average Scores</h3>
                  <div className="subject-scores-vertical">
                    {Object.keys(subjectScores).length > 0 ? (
                      Object.entries(subjectScores).map(([subjectId, score]) => (
                        <div key={subjectId} className="subject-score-box">
                          <p>{score !== null ? score.toFixed(2) : "No data"}</p>
                        </div>
                      ))
                    ) : (
                      <p>No subjects found</p>
                    )}
                  </div>
                </div>
              </div>

              <button onClick={() => {
                setShowEvaluationReport(false);
                fetchScores(); // Refresh scores after closing
              }}>Close</button>
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
                      <button className="table-evaluate-btn" onClick={() => handleEvaluateFaculty(faculty.id)}>Evaluate</button>
                    )}
                  </td>
                </tr>
              ))}
              </tbody>
            </table>
          </section>

          <section>
            <h2>Evaluate Dean</h2>
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Dean Name</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {deanList.map((dean) => (
                  <tr key={dean.id}>
                    <td>{dean.id}</td>
                    <td>{dean.firstName} {dean.lastName}</td>
                    <td>
                      <button className="table-evaluate-btn" onClick={() => navigate(`/evaluate-dean/${dean.id}`, { state: { redirectTo: "/faculty-dashboard" } })}>
                        Evaluate
                      </button>
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

export default FacultyDashboard;
