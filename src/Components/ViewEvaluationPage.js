import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getFirestore, collection, getDocs, doc, getDoc, query, where } from 'firebase/firestore';
import { auth } from '../firebase'; // Make sure to import the auth object if needed
import './viewreport.css';

const ViewEvaluationPage = () => {
  const { facultyId } = useParams(); // facultyId is the ID of the user being checked
  const navigate = useNavigate();
  const [facultyList, setFacultyList] = useState([]);
  const [evaluationsDone, setEvaluationsDone] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const db = getFirestore();

  useEffect(() => {
    const fetchFacultyInDepartment = async () => {
      try {
        setLoading(true);
        const currentUser = auth.currentUser;
        if (!currentUser) {
          throw new Error("User not authenticated");
        }

        // Fetch the current user's document to get their role and department
        const currentUserDoc = await getDoc(doc(db, "users", currentUser.uid));
        if (!currentUserDoc.exists()) {
          throw new Error("Current user document not found.");
        }

        const currentUserData = currentUserDoc.data();
        const currentUserRole = currentUserData.role;

        let department;

        // If the current user is an admin, fetch the department of the user being evaluated
        if (currentUserRole === 'Admin') {
          const evaluatedUserDoc = await getDoc(doc(db, "users", facultyId));
          if (!evaluatedUserDoc.exists()) {
            throw new Error("User being evaluated not found.");
          }
          const evaluatedUserData = evaluatedUserDoc.data();
          department = evaluatedUserData.department;
          if (!department) {
            throw new Error("The user being evaluated does not have a department.");
          }
        } else {
          // For non-admin users, fetch faculty from the current user's department
          department = currentUserData.department;
          if (!department) {
            throw new Error("Department is not defined for the current user.");
          }
        }

        // Fetch faculty members from the same department
        const facultyQuery = query(
          collection(db, "users"),
          where("department", "==", department),
          where("role", "==", "Faculty")
        );

        const facultySnapshot = await getDocs(facultyQuery);
        const facultyData = facultySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setFacultyList(facultyData);

        // Fetch completed evaluations for each faculty from `completed_evaluations` sub-collection
        const evaluationsMap = {};
        for (const faculty of facultyData) {
          const completedEvaluationsCollection = collection(db, 'facultyEvaluations', faculty.id, 'completed_evaluations');
          const completedEvaluationsSnapshot = await getDocs(completedEvaluationsCollection);

          // Check if the `evaluated` field is `true` for the current user in this faculty's `completed_evaluations`
          const userEvaluated = completedEvaluationsSnapshot.docs.some(doc => {
            const data = doc.data();
            return doc.id === currentUser.uid && data.evaluated === true;
          });

          // Mark this faculty as evaluated by the current user
          evaluationsMap[faculty.id] = userEvaluated;
        }

        setEvaluationsDone(evaluationsMap);
      } catch (error) {
        setError(`Error fetching faculty list or evaluations: ${error.message}`);
      } finally {
        setLoading(false);
      }
    };

    fetchFacultyInDepartment();
  }, [db, facultyId]);

  if (loading) return <p>Loading faculty and evaluations...</p>;
  if (error) return <p>{error}</p>;

  return (
    <div className="view-evaluation-page">
      <h2>Evaluation Status for Users</h2>
      {facultyList.length > 0 ? (
        <table className="evaluation-summary-table">
          <thead>
            <tr>
              <th>User ID</th>
              <th>Faculty Name</th>
              <th>Evaluation Status</th>
            </tr>
          </thead>
          <tbody>
            {facultyList.map((faculty) => (
              <tr key={faculty.id}>
                <td>{faculty.id}</td>
                <td>{faculty.firstName} {faculty.lastName}</td>
                <td>
                  <span className={evaluationsDone[faculty.id] ? 'status-done' : 'status-not-done'}>
                    {evaluationsDone[faculty.id] ? 'Done' : 'Not Done'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p>No faculty members available in this department.</p>
      )}

      <button onClick={() => navigate(-1)} style={{ padding: '10px', marginTop: '20px' }}>Back to Faculty List</button>
    </div>
  );
};

export default ViewEvaluationPage;
