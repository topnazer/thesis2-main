import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getFirestore, doc, getDoc, collection, onSnapshot, query, where, getDocs } from "firebase/firestore";
import { auth } from "../firebase";
import './facultydashboard.css';

const FacultyDashboard = () => {
  const [evaluationForm, setEvaluationForm] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [facultyList, setFacultyList] = useState([]);
  const [deanList, setDeanList] = useState([]);
  const [averageScore, setAverageScore] = useState(null);
  const [userName, setUserName] = useState("");
  const [evaluationsDone, setEvaluationsDone] = useState({}); // Track completed evaluations for this user

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

    const fetchEvaluationForm = async () => {
      const evaluationDoc = await getDoc(doc(db, "evaluations", "faculty"));
      if (evaluationDoc.exists()) {
        setEvaluationForm(evaluationDoc.data().questions);
      } else {
        console.error("No evaluation form found for faculty.");
      }
    };

    const fetchNotifications = async () => {
      const user = auth.currentUser;
      if (!user) return;

      const notificationsCollection = collection(db, "notifications", user.uid, "userNotifications");
      onSnapshot(notificationsCollection, (snapshot) => {
        setNotifications(snapshot.docs.map(doc => doc.data()));
      });
    };

    const fetchSubjects = async () => {
      const user = auth.currentUser;
      if (!user) return;

      const subjectsCollection = collection(db, "faculty", user.uid, "subjects");
      onSnapshot(subjectsCollection, (snapshot) => {
        setSubjects(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      });
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

    const fetchEvaluationsDoneForUser = async () => {
      const user = auth.currentUser;
      if (!user) return;

      try {
        const facultyEvaluationsCollection = collection(db, 'facultyEvaluations');
        const evaluationsSnapshot = await getDocs(facultyEvaluationsCollection);
        
        const evaluationsMap = {};
        
        for (const facultyDoc of evaluationsSnapshot.docs) {
          const facultyId = facultyDoc.id;
          
          // Query the `completed_evaluations` sub-collection for this faculty
          const completedEvaluationsCollection = collection(db, 'facultyEvaluations', facultyId, 'completed_evaluations');
          const completedEvaluationsSnapshot = await getDocs(completedEvaluationsCollection);
          
          // Check if the current user has an entry in `completed_evaluations`
          const userEvaluated = completedEvaluationsSnapshot.docs.some(doc => doc.id === user.uid);
          
          // Mark this faculty as evaluated by the current user
          evaluationsMap[facultyId] = userEvaluated;
        }

        setEvaluationsDone(evaluationsMap);
      } catch (error) {
        console.error('Error fetching completed evaluations:', error);
      }
    };

    const fetchDeansInDepartment = async () => {
      const user = auth.currentUser;
      if (!user) return;

      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (userDoc.exists()) {
        const department = userDoc.data().department;

        const deanQuery = query(
          collection(db, "users"),
          where("department", "==", department),
          where("role", "==", "Dean")
        );

        onSnapshot(deanQuery, (snapshot) => {
          setDeanList(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });
      }
    };

    // Call all fetch functions
    fetchUserInfo();
    fetchEvaluationForm();
    fetchNotifications();
    fetchSubjects();
    fetchFacultyInDepartment();
    fetchEvaluationsDoneForUser(); // Fetch the user's completed evaluations for faculty
    fetchDeansInDepartment();
  }, [db]);

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
      <nav>
        <h1>Faculty Dashboard</h1>
        <div>
          <span>{userName}</span>
          <button onClick={handleSignOut}>Sign Out</button>
        </div>
      </nav>

      <section>
        <h2>Notifications</h2>
        <ul>
          {notifications.map((notification, index) => (
            <li key={index}>{notification.message}</li>
          ))}
        </ul>
      </section>

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
                  <button onClick={() => navigate(`/evaluate-dean/${dean.id}`, { state: { redirectTo: "/faculty-dashboard" } })}>
                    Evaluate
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section>
        <h2>Evaluation Report</h2>
        {averageScore !== null ? (
          <p>Your overall average score: {averageScore.toFixed(2)}</p>
        ) : (
          <p>No evaluations submitted yet.</p>
        )}
        <p>Subject Average Scores</p>
        <ul>
          {subjects.map((subject) => (
            <li key={subject.id}>
              {subject.id}: {subject.averageScore !== null ? subject.averageScore.toFixed(2) : 'No evaluations submitted yet.'}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
};

export default FacultyDashboard;
  