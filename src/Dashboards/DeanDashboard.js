import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getFirestore, doc, getDoc, onSnapshot, collection, query, where } from "firebase/firestore";
import { auth } from "../firebase";
import './deandashboard.css'; 

const DeanDashboard = () => {
  const [facultyList, setFacultyList] = useState([]);
  const [evaluationReports, setEvaluationReports] = useState([]);
  const [evaluatorNames, setEvaluatorNames] = useState({});
  const [userName, setUserName] = useState(""); 
  const [evaluationsDone, setEvaluationsDone] = useState({}); // Track completed evaluations
  const navigate = useNavigate();
  const db = getFirestore();

  useEffect(() => {
    const fetchUserInfo = async () => {
      const user = auth.currentUser;
      if (user) {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setUserName(`${userData.firstName} ${userData.lastName}`);
        }
      }
    };

    const fetchFacultyInDepartment = async () => {
      const user = auth.currentUser;
      if (!user) return;

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
    };

    const fetchEvaluationsDone = async () => {
      const user = auth.currentUser;
      if (!user) return;

      const completedEvaluationsCollection = collection(db, `deanEvaluations/${user.uid}/completed_evaluations`);
      onSnapshot(completedEvaluationsCollection, (snapshot) => {
        const evaluationsMap = {};
        snapshot.docs.forEach(doc => {
          evaluationsMap[doc.id] = true; // Mark as evaluated
        });
        setEvaluationsDone(evaluationsMap);
      });
    };

    const fetchEvaluationReports = async () => {
      const user = auth.currentUser;
      if (!user) return;

      const evaluationsCollection = collection(db, "deanEvaluations", user.uid, "completed_evaluations");
      const snapshot = await onSnapshot(evaluationsCollection, async (snapshot) => {
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
    };

    fetchUserInfo();
    fetchFacultyInDepartment();
    fetchEvaluationReports();
    fetchEvaluationsDone(); // Fetch evaluations completed by the dean
  }, [db, evaluatorNames]);

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
      <nav>
        <h1>Dean Dashboard</h1>
        <div>
          <span>{userName}</span>
          <button onClick={handleSignOut}>Sign Out</button>
        </div>
      </nav>

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

      <section>
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
      </section>
    </div>
  );
};

export default DeanDashboard;
