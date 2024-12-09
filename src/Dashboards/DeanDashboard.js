import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  getFirestore,
  doc,
  getDoc,
  collection,
  query,
  where,
  onSnapshot,
  getDocs,
} from "firebase/firestore";
import { auth } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";
import "./deandashboard.css";

const DeanDashboard = () => {
  const [facultyList, setFacultyList] = useState([]);
  const [deanList, setDeanList] = useState([]);
  const [evaluationReports, setEvaluationReports] = useState([]);
  const [evaluatorNames, setEvaluatorNames] = useState({});
  const [userName, setUserName] = useState("");
  const [evaluationsDone, setEvaluationsDone] = useState({});
  const [showEvaluationReport, setShowEvaluationReport] = useState(false);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const db = getFirestore();

  // Pagination states for Faculty List
  const facultyPerPage = 3;
  const [facultyCurrentPage, setFacultyCurrentPage] = useState(0);
  const totalFacultyPages = Math.ceil(facultyList.length / facultyPerPage);
  const currentFacultyList = facultyList.slice(
    facultyCurrentPage * facultyPerPage,
    facultyCurrentPage * facultyPerPage + facultyPerPage
  );

  // Pagination Handlers for Faculty List
  const handleNextFacultyPage = () => {
    if (facultyCurrentPage < totalFacultyPages - 1) {
      setFacultyCurrentPage(facultyCurrentPage + 1);
    }
  };

  const handlePreviousFacultyPage = () => {
    if (facultyCurrentPage > 0) {
      setFacultyCurrentPage(facultyCurrentPage - 1);
    }
  };

  // Pagination states for Evaluation Report
  const evaluationReportsPerPage = 5;
  const [evaluationCurrentPage, setEvaluationCurrentPage] = useState(0);
  const totalEvaluationPages = Math.ceil(
    evaluationReports.length / evaluationReportsPerPage
  );
  const currentEvaluationReports = evaluationReports.slice(
    evaluationCurrentPage * evaluationReportsPerPage,
    evaluationCurrentPage * evaluationReportsPerPage + evaluationReportsPerPage
  );

  // Pagination Handlers for Evaluation Report
  const handleNextEvaluationPage = () => {
    if (evaluationCurrentPage < totalEvaluationPages - 1) {
      setEvaluationCurrentPage(evaluationCurrentPage + 1);
    }
  };

  const handlePreviousEvaluationPage = () => {
    if (evaluationCurrentPage > 0) {
      setEvaluationCurrentPage(evaluationCurrentPage - 1);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        fetchUserInfo(user);
        fetchFacultyInDepartment(user);
        fetchDeans(user);
        fetchEvaluationReports(user);
        fetchEvaluationsDone(user);
        setLoading(false);
      } else {
        navigate("/");
      }
    });
    return unsubscribe;
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
          setFacultyList(
            snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
          );
        });
      }
    } catch (error) {
      console.error("Error fetching faculty in department:", error);
    }
  };

  const fetchDeans = async (user) => {
    try {
      if (!user || !user.uid) {
        console.error("User object is undefined or missing UID.");
        return;
      }

      const deansQuery = query(
        collection(db, "users"),
        where("role", "==", "Dean")
      );

      onSnapshot(deansQuery, (snapshot) => {
        const deans = snapshot.docs
          .map((doc) => ({ id: doc.id, ...doc.data() }))
          .filter((dean) => dean.id !== user.uid);

        setDeanList(deans);
      });
    } catch (error) {
      console.error("Error fetching deans:", error);
    }
  };

  const fetchEvaluationReports = async (user) => {
    try {
      const evaluationsCollection = collection(
        db,
        "deanEvaluations",
        user.uid,
        "completed_evaluations"
      );
      onSnapshot(evaluationsCollection, async (snapshot) => {
        const reports = snapshot.docs.map((doc) => doc.data());
        const evaluatorIds = reports.map((report) => report.userId);

        const evaluatorNamesCopy = { ...evaluatorNames };
        const namesToFetch = evaluatorIds.filter((id) => !evaluatorNamesCopy[id]);

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

        const enrichedReports = reports.map((report) => ({
          ...report,
          evaluatorName: evaluatorNamesCopy[report.userId] || "Unknown Evaluator",
        }));

        setEvaluationReports(enrichedReports);
      });
    } catch (error) {
      console.error("Error fetching evaluation reports:", error);
    }
  };

  const fetchEvaluationsDone = async (user) => {
    try {
      const facultyEvaluationsCollection = collection(db, "facultyEvaluations");
      const evaluationsSnapshot = await getDocs(facultyEvaluationsCollection);

      const evaluationsMap = {};
      for (const facultyDoc of evaluationsSnapshot.docs) {
        const facultyId = facultyDoc.id;

        const completedEvaluationsCollection = collection(
          db,
          "facultyEvaluations",
          facultyId,
          "completed_evaluations"
        );
        const completedEvaluationsSnapshot = await getDocs(
          completedEvaluationsCollection
        );

        const userEvaluated = completedEvaluationsSnapshot.docs.some(
          (doc) => doc.id === user.uid
        );
        evaluationsMap[facultyId] = userEvaluated;
      }
      setEvaluationsDone(evaluationsMap);
    } catch (error) {
      console.error("Error fetching completed evaluations:", error);
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
      state: { redirectTo: "/dean-dashboard" },
    });
  };

  const handleEvaluateDean = (deanId) => {
    navigate(`/evaluate-dean/${deanId}`, {
      state: { redirectTo: "/dean-dashboard" },
    });
  };

  return (
    <div className="dean-dashboard">
      {loading ? (
        <p>Loading...</p>
      ) : showEvaluationReport ? (
        <div>
          <nav>
            <button
              className="backing"
              onClick={() => setShowEvaluationReport(false)}
            >
              Back to Dashboard
            </button>
            <h1 className="hika">Evaluation Report</h1>
          </nav>
          {evaluationReports.length > 0 ? (
            <div>
              <table className="deanevaluation-report-container">
                <thead>
                  <tr>
                    <th>Evaluator</th>
                    <th>Percentage Score</th>
                    <th>Date</th>
                    <th>Comments</th>
                  </tr>
                </thead>
                <tbody>
                  {currentEvaluationReports.map((report, index) => (
                    <tr key={index}>
                      <td>{report.evaluatorName}</td>
                      <td>
                        {report.ratingScore?.percentageScore
                          ? `${report.ratingScore.percentageScore}%`
                          : "N/A"}
                      </td>
                      <td>
                        {report.createdAt
                          ? new Date(
                              report.createdAt.seconds * 1000
                            ).toLocaleDateString()
                          : "No Date"}
                      </td>
                      <td>{report.comment || "No Comment"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Pagination Controls for Evaluation Report */}
              <div className="pagination">
                <button
                  onClick={handlePreviousEvaluationPage}
                  disabled={evaluationCurrentPage === 0}
                >
                  Previous
                </button>
                <span>
                  Page {evaluationCurrentPage + 1} of {totalEvaluationPages}
                </span>
                <button
                  onClick={handleNextEvaluationPage}
                  disabled={evaluationCurrentPage === totalEvaluationPages - 1}
                >
                  Next
                </button>
              </div>
            </div>
          ) : (
            <p>No evaluations submitted yet.</p>
          )}
        </div>
      ) : (
        <>
          <nav>
            <div className="dashboardlogo-container">
              <img src="/spc.png" alt="Logo" className="dashboardlogo" />
            </div>
            <h1>Dean Dashboard</h1>
            <div style={{ display: "flex", alignItems: "center" }}>
              <p style={{ fontSize: "25px" }}>
                <strong>{userName}</strong>
              </p>
              <button onClick={() => setShowEvaluationReport(true)}>
                Evaluation Report
              </button>
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
                {currentFacultyList.map((faculty) => (
                  <tr key={faculty.id}>
                    <td>{faculty.id}</td>
                    <td>
                      {faculty.firstName} {faculty.lastName}
                    </td>
                    <td>
                      {evaluationsDone[faculty.id] ? (
                        <span className="evaluation-done">
                          Evaluation Complete
                        </span>
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

            {/* Pagination Controls for Faculty List */}
            <div className="pagination">
              <button
                onClick={handlePreviousFacultyPage}
                disabled={facultyCurrentPage === 0}
              >
                Previous
              </button>
              <span>
                Page {facultyCurrentPage + 1} of {totalFacultyPages}
              </span>
              <button
                onClick={handleNextFacultyPage}
                disabled={facultyCurrentPage === totalFacultyPages - 1}
              >
                Next
              </button>
            </div>
          </section>
        </>
      )}
    </div>
  );
};

export default DeanDashboard;
