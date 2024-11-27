import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getFirestore, getDoc, collection, onSnapshot, doc as firestoreDoc } from "firebase/firestore";
import { auth } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";
import './studentdashboard.css';

const StudentDashboard = () => {
  const [notifications, setNotifications] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [userName, setUserName] = useState("");
  const [showNotifications, setShowNotifications] = useState(false);
  const [loading, setLoading] = useState(true);

  const [currentPage, setCurrentPage] = useState(1); // Pagination state
  const pageSize = 5; // Limit to 5 subjects per page

  const navigate = useNavigate();
  const db = getFirestore();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        fetchUserInfo(user);
        fetchNotifications(user);
        fetchSubjects(user);
      } else {
        navigate("/"); 
      }
    });
    return unsubscribe; 
  }, [db, navigate]);

  const fetchUserInfo = async (user) => {
    try {
      const userDoc = await getDoc(firestoreDoc(db, "users", user.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        setUserName(`${userData.firstName || ''} ${userData.lastName || ''}`);
      }
    } catch (error) {
      console.error("Error fetching user info:", error);
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
      const subjectsCollection = collection(db, "students", user.uid, "subjects");

      onSnapshot(subjectsCollection, async (snapshot) => {
        const fetchedSubjects = await Promise.all(
          snapshot.docs.map(async (document) => {
            const subjectData = { id: document.id, ...document.data() };
            subjectData.sectionId = subjectData.sectionId || "default_section";

            if (subjectData.facultyId) {
              const facultyDoc = await getDoc(firestoreDoc(db, "users", subjectData.facultyId));
              subjectData.faculty = facultyDoc.exists() ? facultyDoc.data() : null;
            } else {
              subjectData.faculty = null;
            }

            const evaluationRef = firestoreDoc(
              db, 
              `students/${user.uid}/subjects/${subjectData.id}/sections/${subjectData.sectionId}/completed_evaluations`, 
              user.uid
            );
            const evaluationDoc = await getDoc(evaluationRef);
  
            subjectData.evaluated = evaluationDoc.exists();
            return subjectData;
          })
        );

        setSubjects(fetchedSubjects.filter(subject => subject !== null));
        setLoading(false);
      });
    } catch (error) {
      console.error("Error fetching subjects or faculty details:", error);
      setLoading(false);
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

  const handleEvaluateSubject = (subjectId, sectionId) => {
    if (sectionId) {
      navigate(`/evaluate-subject/${subjectId}/${sectionId}`, {
        state: { redirectTo: "/student-dashboard" }
      });
    } else {
      console.error("Missing section ID for subject", subjectId);
    }
  };

  const handleNextPage = () => {
    setCurrentPage((prevPage) => prevPage + 1);
  };

  const handlePreviousPage = () => {
    setCurrentPage((prevPage) => (prevPage > 1 ? prevPage - 1 : 1));
  };

  // Calculate paginated subjects based on the current page
  const paginatedSubjects = subjects.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const hasNextPage = currentPage * pageSize < subjects.length;

  return (
    <div className="student-dashboard">
      <nav>
        <div className="dashboardlogo-container">
          <img src="/spc.png" alt="Logo" className="dashboardlogo" />
        </div>
        <h1>Student Dashboard</h1>
        <div style={{ display: "flex", alignItems: "center" , gap: "20px"}}>
          <p style={{fontSize: "30px"}}><strong>{userName}</strong></p>
          <button className="notification-icon" onClick={() => setShowNotifications(!showNotifications)}>
            Notifications {notifications.length > 0 && `(${notifications.length})`}
          </button>
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

      <section>
        <h2>Subjects</h2>
        {loading ? (
          <p>Loading subjects...</p>
        ) : paginatedSubjects.length > 0 ? (
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Subject</th>
                <th>Faculty</th>
                <th>Evaluate</th>
              </tr>
            </thead>
            <tbody>
              {paginatedSubjects.map((subject) => (
                <tr key={subject.id}>
                  <td>{subject.id}</td>
                  <td>{subject.name}</td>
                  <td>{subject.faculty ? `${subject.faculty.firstName} ${subject.faculty.lastName}` : "No faculty assigned"}</td>
                  <td>
                    {subject.evaluated ? (
                      <span className="evaluation-done">Evaluation Done</span> 
                    ) : (
                      <button className="table-evaluate-btn" onClick={() => handleEvaluateSubject(subject.id, subject.sectionId)}>
                        Evaluate
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p>No subjects available</p>
        )}
        <div className="pagination">
          <button onClick={handlePreviousPage} disabled={currentPage === 1}>Previous</button>
          <span>Catalog {currentPage}</span>
          <button onClick={handleNextPage} disabled={!hasNextPage}>Next</button>
        </div>
      </section>
    </div>
  );
};

export default StudentDashboard;
