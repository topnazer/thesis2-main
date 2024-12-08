import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getFirestore, doc, getDoc, collection, query, where, onSnapshot, getDocs, setDoc } from "firebase/firestore";
import { auth } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";
import './facultydashboard.css';

const FacultyDashboard = () => {
  const [notifications, setNotifications] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [facultyList, setFacultyList] = useState([]);
  const [deanList, setDeanList] = useState([]);
  const [averageScore, setAverageScore] = useState({ faculty: null, subject: null });
  const [userName, setUserName] = useState("");
  const [evaluationsDone, setEvaluationsDone] = useState({});
  const [showNotifications, setShowNotifications] = useState(false);
  const [showEvaluationReport, setShowEvaluationReport] = useState(false);
  const [showSubjects, setShowSubjects] = useState(false);
  const [loading, setLoading] = useState(true);
  const [viewedSubject, setViewedSubject] = useState(null); // State to store selected subject details
  const [enrolledStudents, setEnrolledStudents] = useState([]); // New state for enrolled students
  const [currentPage, setCurrentPage] = useState(0); // Pagination state
   const [showCommentsTable, setShowCommentsTable] = useState(false); // Toggle for comments table
  const [comments, setComments] = useState([]);
  const [showFacultyComments, setShowFacultyComments] = useState(false);
  const [enrollSubject, setEnrollSubject] = useState(null);
  const [searchStudent, setSearchStudent] = useState("");
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [allStudents, setAllStudents] = useState([]);
  const [filteredStudents, setFilteredStudents] = useState([]); 

  const facultyPerPage = 3; // Limit to 3 faculty per page
  const totalFacultyPages = Math.ceil(facultyList.length / facultyPerPage);

  const subjectsPerPage = 5; // Limit to 5 subjects per page
  const totalPages = Math.ceil(subjects.length / subjectsPerPage);

  const navigate = useNavigate();
  const db = getFirestore();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        fetchUserInfo(user);
        fetchNotifications(user);
        fetchFacultyInDepartment(user);
        fetchDeansInDepartment(user);
        fetchEvaluationsDoneForUser(user);
        fetchScores();
        fetchAllStudents()
        fetchSubjects(user);
        setLoading(false);
      } else {
        navigate("/"); // Redirect to login if not authenticated
      }
    });
    return unsubscribe; // Cleanup on unmount
  }, [db, navigate]);

  const fetchAllStudents = async () => {
    try {
      const studentsQuery = query(
        collection(db, "users"),
        where("role", "==", "Student")
      );
      const querySnapshot = await getDocs(studentsQuery);
      const studentsList = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setAllStudents(studentsList); // Store all students
      setFilteredStudents(studentsList); // Initialize filtered students
    } catch (error) {
      console.error("Error fetching students:", error);
    }
  };
  
  useEffect(() => {
    setFilteredStudents(
      allStudents.filter(
        (student) =>
          student.email.toLowerCase().includes(searchStudent.toLowerCase()) ||
          student.id.toLowerCase().includes(searchStudent.toLowerCase()) ||
          `${student.firstName} ${student.lastName}`
            .toLowerCase()
            .includes(searchStudent.toLowerCase())
      )
    );
  }, [searchStudent, allStudents]);

  const handleEnrollStudent = async (subjectId, studentIds) => {
    const subjectToEnroll = subjects.find((subject) => subject.id === subjectId);
    if (!subjectToEnroll) {
      alert("Subject not found.");
      return;
    }
    const studentsToEnroll = allStudents.filter((student) => studentIds.includes(student.id));
    if (studentsToEnroll.length === 0) {
      alert("No valid students selected.");
      return;
    }
    const enrollmentPromises = studentsToEnroll.map(async (student) => {
      const studentSubjectsRef = doc(db, `students/${student.id}/subjects/${subjectId}`);
      const subjectEnrolledStudentRef = doc(db, `subjects/${subjectId}/enrolledStudents/${student.id}`);
  
      try {
        await Promise.all([
          setDoc(studentSubjectsRef, {
            id: subjectId,
            name: subjectToEnroll.name,
            facultyId: subjectToEnroll.facultyId || null,
            sectionId: subjectToEnroll.sectionId || "default_section",
            semester: subjectToEnroll.semester || "",
            department: subjectToEnroll.department || "",
          }),
          setDoc(subjectEnrolledStudentRef, {
            id: student.id,
            email: student.email,
            name: `${student.firstName} ${student.lastName}` || "Unknown",
          })
        ]);
      } catch (error) {
        console.error(`Error enrolling student ${student.email}:`, error);
      }
    });
  
    try {
      await Promise.all(enrollmentPromises);
      const enrolledEmails = studentsToEnroll.map(student => student.email).join(", ");
      alert(`Successfully enrolled the following students: ${enrolledEmails}`);
    } catch (error) {
      console.error("Error enrolling students in subject:", error);
      alert("There was an error enrolling the students. Please try again.");
    }
  };
  
  const handleShowEnroll = (subject) => {
    setEnrollSubject(subject);
    setSearchStudent(""); // Reset search input
    setSelectedStudents([]); // Clear previous selections
  };

  // Function to cancel enrollment and reset states
  const handleCancelEnroll = () => {
    setEnrollSubject(null);
    setSearchStudent(""); // Reset search input
    setSelectedStudents([]); // Clear previous selections
  };


  const handleNextFacultyPage = () => {
    if (currentPage < totalFacultyPages - 1) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handlePreviousFacultyPage = () => {
    if (currentPage > 0) {
      setCurrentPage(currentPage - 1);
    }
  };


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
      if (!user) {
        console.error("User not authenticated.");
        return;
      }
  
      const facultyId = user.uid;
  
      let totalSubjectScore = 0;
      let totalSubjects = 0;
      let facultyAverageScore = 0;
  
      // Fetch all subject evaluations for the faculty
      const subjectEvaluationsQuery = query(
        collection(db, "subjectEvaluations"),
        where("facultyId", "==", facultyId)
      );
  
      const subjectEvaluationsSnapshot = await getDocs(subjectEvaluationsQuery);
  
      if (!subjectEvaluationsSnapshot.empty) {
        subjectEvaluationsSnapshot.forEach((doc) => {
          const evaluationData = doc.data();
          totalSubjectScore += evaluationData.averageScore || 0;
          totalSubjects += 1;
        });
      }
  
      const subjectAverageScore =
        totalSubjects > 0 ? totalSubjectScore / totalSubjects : 0;
  
      // Fetch faculty's average score using the document ID
      const facultyDocRef = doc(db, "facultyEvaluations", facultyId);
      const facultyDocSnapshot = await getDoc(facultyDocRef);
  
      if (facultyDocSnapshot.exists()) {
        const facultyData = facultyDocSnapshot.data();
        facultyAverageScore = facultyData.averageScore || 0;
      } else {
        console.warn("No faculty evaluation found for this user.");
      }
  
      // Update the single state with both scores
      setAverageScore({
        faculty: facultyAverageScore.toFixed(2),
        subject: subjectAverageScore.toFixed(2),
      });
    } catch (error) {
      console.error("Error fetching scores:", error);
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
      const subjectsQuery = query(
        collection(db, "subjects"),
        where("facultyId", "==", user.uid)
      );

      onSnapshot(subjectsQuery, (snapshot) => {
        setSubjects(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
      });
    } catch (error) {
      console.error("Error fetching subjects:", error);
    }
  };

  const fetchFacultyInDepartment = async (user) => {
    try {
      // Fetch current user's department
      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (userDoc.exists()) {
        const department = userDoc.data().department;
  
        // Fetch all faculty in the department
        const facultyQuery = query(
          collection(db, "users"),
          where("department", "==", department),
          where("role", "==", "Faculty")
        );
  
        // Fetch the expiration date from Firestore
        const evaluationFormRef = doc(db, "evaluationForms", "faculty");
        const evaluationFormSnap = await getDoc(evaluationFormRef);
  
        let expirationDate = null;
        if (evaluationFormSnap.exists()) {
          const data = evaluationFormSnap.data();
          expirationDate = data.expirationDate ? new Date(data.expirationDate) : null;
        }
  
        const today = new Date();
  
        // Check if the evaluation period has expired
        const expired = expirationDate ? today > expirationDate : false;
  
        onSnapshot(facultyQuery, (snapshot) => {
          setFacultyList(
            snapshot.docs
              .map((doc) => ({
                id: doc.id,
                ...doc.data(),
                expired, // Add the expiration status to each faculty
              }))
              .filter((faculty) => faculty.id !== user.uid) // Exclude logged-in user
          );
        });
      }
    } catch (error) {
      console.error("Error fetching faculty in department:", error);
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

  const fetchEvaluationsDoneForUser = (user) => {
    try {
      const facultyEvaluationsCollection = collection(db, "facultyEvaluations");
      const deanEvaluationsCollection = collection(db, "deanEvaluations");
  
      // Faculty Evaluations Listener
      onSnapshot(facultyEvaluationsCollection, async (evaluationsSnapshot) => {
        const facultyEvaluationsMap = {};
  
        for (const facultyDoc of evaluationsSnapshot.docs) {
          const facultyId = facultyDoc.id;
  
          const completedEvaluationsCollection = collection(
            db,
            "facultyEvaluations",
            facultyId,
            "completed_evaluations"
          );
  
          onSnapshot(completedEvaluationsCollection, (completedEvaluationsSnapshot) => {
            const userEvaluated = completedEvaluationsSnapshot.docs.some(
              (doc) => doc.id === user.uid
            );
  
            facultyEvaluationsMap[facultyId] = userEvaluated;
  
            // Merge faculty evaluations into the state
            setEvaluationsDone((prev) => ({
              ...prev,
              facultyEvaluations: {
                ...prev.facultyEvaluations,
                ...facultyEvaluationsMap,
              },
            }));
          });
        }
      });
  
      // Dean Evaluations Listener
      onSnapshot(deanEvaluationsCollection, async (deanSnapshot) => {
        const deanEvaluationsMap = {};
  
        for (const deanDoc of deanSnapshot.docs) {
          const deanId = deanDoc.id;
  
          // Existing logic: Fetch all documents in the subcollection
          const completedEvaluationsCollection = collection(
            db,
            "deanEvaluations",
            deanId,
            "completed_evaluations"
          );
  
          onSnapshot(completedEvaluationsCollection, (completedEvaluationsSnapshot) => {
            const userEvaluated = completedEvaluationsSnapshot.docs.some(
              (doc) => doc.id === user.uid
            );
  
            deanEvaluationsMap[deanId] = userEvaluated;
  
            // Merge dean evaluations into the state
            setEvaluationsDone((prev) => ({
              ...prev,
              deanEvaluations: {
                ...prev.deanEvaluations,
                ...deanEvaluationsMap,
              },
            }));
          });
  
          // New logic: Fetch a specific document by ID
          const specificCompletedEvaluationDocId = "4beCH594G1WUDb6sHTdNQUJ1C2G3";
          const completedEvaluationDocRef = doc(
            db,
            "deanEvaluations",
            deanId,
            "completed_evaluations",
            specificCompletedEvaluationDocId
          );
  
          const completedEvaluationSnapshot = await getDoc(completedEvaluationDocRef);
  
          if (completedEvaluationSnapshot.exists()) {
            const userEvaluated = completedEvaluationSnapshot.id === user.uid;
  
            deanEvaluationsMap[deanId] = userEvaluated;
  
            // Merge the specific evaluation result into the state
            setEvaluationsDone((prev) => ({
              ...prev,
              deanEvaluations: {
                ...prev.deanEvaluations,
                ...deanEvaluationsMap,
              },
            }));
          } else {
            console.warn(
              `Document with ID ${specificCompletedEvaluationDocId} does not exist in deanEvaluations/${deanId}/completed_evaluations.`
            );
          }
        }
      });
    } catch (error) {
      console.error("Error fetching evaluations:", error);
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

  // Fetch enrolled students for a specific subject
  const fetchEnrolledStudents = async (subjectId) => {
    try {
      const enrolledStudentsSnapshot = await getDocs(collection(db, "subjects", subjectId, "enrolledStudents"));
      setEnrolledStudents(enrolledStudentsSnapshot.docs.map((doc) => doc.data().name));
    } catch (error) {
      console.error("Error fetching enrolled students:", error);
    }
  };

  // Handle viewing class list for a specific subject
  const handleViewClassList = (subject) => {
    setViewedSubject(subject);
    fetchEnrolledStudents(subject.id);
  };

  // Pagination functions
  const handleNextPage = () => {
    if (currentPage < totalPages - 1) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handlePreviousPage = () => {
    if (currentPage > 0) {
      setCurrentPage(currentPage - 1);
    }
  };

  const currentSubjects = subjects.slice(
    currentPage * subjectsPerPage,
    currentPage * subjectsPerPage + subjectsPerPage
  );

  const handleShowComments = async () => {
    setLoading(true);
    setShowCommentsTable(true);

    try {
      const user = auth.currentUser;
      if (!user) {
        console.error("User not authenticated.");
        return;
      }

      const facultyId = user.uid;
      const commentsQuery = collection(db, `evaluations/${facultyId}/students`);
      const commentsSnapshot = await getDocs(commentsQuery);

      const commentsList = commentsSnapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          subjectName: data.subjectName || "Unknown Subject",
          studentName: data.studentName || "Unknown Student",
          date: data.createdAt?.toDate().toLocaleDateString() || "Unknown Date",
          comment: data.comment || "No Comment",
        };
      });

      setComments(commentsList);
    } catch (error) {
      console.error("Error fetching comments:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleShowFacultyComments = async () => {
    setLoading(true);
    setShowCommentsTable(true);
  
    try {
      const user = auth.currentUser;
      if (!user) {
        console.error("User not authenticated.");
        return;
      }
  
      const facultyId = user.uid;
      const evaluationsQuery = collection(db, `facultyEvaluations/${facultyId}/completed_evaluations`);
      const evaluationsSnapshot = await getDocs(evaluationsQuery);
  
      if (evaluationsSnapshot.empty) {
        console.warn("No evaluations found for this faculty.");
        setComments([]);
        return;
      }
  
      const commentsList = evaluationsSnapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          createdAt: data.createdAt?.toDate().toLocaleDateString() || "Unknown Date",
          comment: data.comment || "No Comment",
        };
      });
  
      setComments(commentsList); // Update the comments state with only Date and Comment
    } catch (error) {
      console.error("Error fetching faculty evaluations:", error);
    } finally {
      setLoading(false);
    }
  };
  
  
  return (
    <div className="faculty-dashboard">
  {loading ? (
    <p>Loading...</p>
  ) : showCommentsTable ? (
    // Check if we're showing subject or faculty comments
    showFacultyComments ? (
      // Render Faculty Comments
      <div className="faculty-cmmnts-tbl">
  <h2>Faculty Evaluation Comments</h2>
  {comments.length > 0 ? (
    <table>
      <thead>
        <tr>
          <th>Date</th>
          <th>Comment</th>
        </tr>
      </thead>
      <tbody>
        {comments.map((comment, index) => (
          <tr key={index}>
            <td>{comment.createdAt}</td>
            <td>{comment.comment}</td>
          </tr>
        ))}
      </tbody>
    </table>
  ) : (
    <p>No faculty comments available.</p>
  )}
 <button
    className="custom-button"
    onClick={() => {
      setShowCommentsTable(false);
      setShowFacultyComments(false);
    }}
  >
    Back
  </button>
</div>
    ) : (
      // Render Subject Comments
      <div className="subject-comts-tbl">
        <h2>Subject Evaluation</h2>
        {comments.length > 0 ? (
          <table>
            <thead>
              <tr>
                <th>Subject Name</th>
                <th>Date</th>
                <th>Comment</th>
              </tr>
            </thead>
            <tbody>
              {comments.map((comment, index) => (
                <tr key={index}>
                  <td>{comment.subjectName}</td>
                  <td>{comment.date}</td>
                  <td>{comment.comment}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p>No subject comments available.</p>
        )}
       <button
    className="custom-button"
    onClick={() => setShowCommentsTable(false)}
  >
    Back
  </button>
      </div>
    )
  ) : (
    // The rest of the faculty dashboard content
    <>
      <nav>
        <div className="dashboardlogo-container">
          <img src="/spc.png" alt="Logo" className="dashboardlogo" />
        </div>
        <h1>Faculty Dashboard</h1>
        <div style={{ display: "flex", alignItems: "center" }}>
          <p style={{ fontSize: "25px" }}>
            <strong>{userName}</strong>
          </p>
          <button
            className="facnotification-icon"
            onClick={() => setShowNotifications(!showNotifications)}
          >
            Notifications {notifications.length > 0 && `(${notifications.length})`}
          </button>
          <button onClick={() => setShowEvaluationReport(!showEvaluationReport)}>
            Evaluation Report
          </button>
          <button onClick={() => setShowSubjects(!showSubjects)}>Subjects</button>
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

      {showEvaluationReport && (
        <div className="facevaluation-report-modal">
          <h2>Evaluation Report</h2>
          <div className="facevaluation-box-container">
            <div
              className="facevaluation-box clickable"
              role="button"
              onClick={handleShowComments}
              tabIndex={0}
              onKeyDown={(e) => e.key === "Enter" && handleShowComments()}
            >
              <h3>Subject Average Score</h3>
              {averageScore?.subject !== null ? (
                <p>{Number(averageScore.subject).toFixed(2)}</p>
              ) : (
                <p>No evaluations submitted</p>
              )}
            </div>
            <div
  className="facevaluation-box clickable"
  role="button"
  onClick={() => {
    handleShowFacultyComments();
    setShowFacultyComments(true); // Show Faculty Comments
  }}
  tabIndex={0}
  onKeyDown={(e) => e.key === "Enter" && handleShowFacultyComments()}
>
  <h3>Faculty Average Score</h3>
  {averageScore?.faculty !== null ? (
    <p>{Number(averageScore.faculty).toFixed(2)}</p>
  ) : (
    <p>No evaluations submitted</p>
  )}
</div>

          </div>
          <button onClick={() => setShowEvaluationReport(false)}>Close</button>
        </div>
      )}

{showSubjects ? (
  <div className="facsubject-list">
    <h2>Your Subjects</h2>
    {currentSubjects.length > 0 ? (
      currentSubjects.map((subject) => (
        <div key={subject.id} className="facsubject-card">
          <h3>{subject.name} (ID: {subject.id})</h3>
          <p><strong>Department:</strong> {subject.department}</p>
          <button onClick={() => handleViewClassList(subject)}>
            View Class List
          </button>
          <button onClick={() => handleShowEnroll(subject)}>
            Enroll Students
          </button>
        </div>
      ))
    ) : (
      <p>No subjects assigned.</p>
    )}

              {/* Pagination Controls */}
              <div className="facpagination-controls">
                <button onClick={handlePreviousPage} disabled={currentPage === 0}>
                  Previous
                </button>
                <span>Page {currentPage + 1} of {totalPages}</span>
                <button onClick={handleNextPage} disabled={currentPage === totalPages - 1}>
                  Next
                </button>
              </div>

              {viewedSubject && (
  <div className="Facviewed-subject-details">
    <h2>Class List for {viewedSubject.name}</h2>

    <div className="Facviewed-content">
      {/* Enroll students container on the left */}
      {enrollSubject && enrollSubject.id === viewedSubject.id && (
        <div className="facenroll-student-container">
          <h2>Enroll Students in {enrollSubject.name}</h2>

          {/* Search bar for filtering students */}
          <input
            type="text"
            value={searchStudent}
            onChange={(e) => setSearchStudent(e.target.value)}
            placeholder="Search students by name or email"
            className="enroll-search-bar"
          />

          {/* List of filtered students with checkboxes */}
          <div className="facstudent-list">
            {filteredStudents.length > 0 ? (
              filteredStudents.map((student) => (
                <div key={student.id} className="facstudent-item">
                  <input
                    type="checkbox"
                    id={`student-${student.id}`}
                    value={student.id}
                    checked={selectedStudents.includes(student.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedStudents((prev) => [...prev, student.id]);
                      } else {
                        setSelectedStudents((prev) =>
                          prev.filter((id) => id !== student.id)
                        );
                      }
                    }}
                  />
                  <label htmlFor={`student-${student.id}`}>
                    {student.firstName} {student.lastName} - {student.email}
                  </label>
                </div>
              ))
            ) : (
              <p>No students found</p>
            )}
          </div>

          {/* Buttons for enrolling students or canceling */}
          <div className="facenroll-buttons">
            <button
              onClick={() => {
                handleEnrollStudent(enrollSubject.id, selectedStudents);
                handleCancelEnroll(); // Reset states after enrollment
              }}
              className="facenroll-button"
            >
              Enroll Students
            </button>
            <button onClick={handleCancelEnroll} className="faccancel-button">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Student list on the right */}
      <div className="Facviewed-student-list">
        {enrolledStudents.length > 0 ? (
          <ul>
            {enrolledStudents.map((studentId) => (
              <li key={studentId}>{studentId}</li>
            ))}
          </ul>
        ) : (
          <p>No students enrolled.</p>
        )}
      </div>
    </div>

    <button className="close-subdetails" onClick={() => setViewedSubject(null)}>
      Close
    </button>
  </div>
)}


            </div>
          ) : (
            <>
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
          <td>
            {faculty.firstName} {faculty.lastName}
          </td>
          <td>
    {faculty.expired ? (
        <span className="evaluation-expired">Evaluation Expired</span>
    ) : evaluationsDone?.facultyEvaluations?.[faculty.id] ? (
        <span className="evaluation-done">Evaluation Done</span>
    ) : (
        <button
            className="table-evaluate-btn"
            onClick={() => handleEvaluateFaculty(faculty.id)}
        >
            Evaluate
        </button>
    )}
</td>
        </tr>
      ))}
    </tbody>
  </table>
  <div className="facpagination-controls">
    <button onClick={handlePreviousFacultyPage} disabled={currentPage === 0}>
      Previous
    </button>
    <span>List {currentPage + 1} </span>
    <button
      onClick={handleNextFacultyPage}
      disabled={currentPage === totalFacultyPages - 1}
    >
      Next
    </button>
  </div>
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
      {deanList.map((dean) => {
        const evaluationDone = evaluationsDone?.deanEvaluations?.[dean.id];

        return (
          <tr key={dean.id}>
            <td>{dean.id}</td>
            <td>{dean.firstName} {dean.lastName}</td>
            <td>
              {evaluationDone ? (
                <span className="evaluation-done">Evaluation Done</span>
              ) : (
                <button
                  className="table-evaluate-btn"
                  onClick={() =>
                    navigate(`/evaluate-dean/${dean.id}`, {
                      state: { redirectTo: "/faculty-dashboard" },
                    })
                  }
                >
                  Evaluate
                </button>
              )}
            </td>
          </tr>
        );
      })}
    </tbody>
  </table>
</section>
            </>
          )}
        </>
      )}
    </div>
  );
};

export default FacultyDashboard;
