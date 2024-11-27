import React, { useState, useEffect, useCallback } from 'react';
import { getFirestore, doc, getDoc, setDoc, collection, query, where, onSnapshot } from 'firebase/firestore';
import './evaluationreportscoringpage.css';

const EvaluationReportScoringPage = () => {
  const [subjectWeight, setSubjectWeight] = useState(50);
  const [facultyWeight, setFacultyWeight] = useState(50);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [faculties, setFaculties] = useState([]);
  const [currentPage, setCurrentPage] = useState(1); // Current page for pagination
  const facultiesPerPage = 5; // Number of faculties per page
  const db = getFirestore();

  useEffect(() => {
    const fetchWeights = async () => {
      try {
        const weightsDoc = await getDoc(doc(db, 'settings', 'scoreWeights'));
        if (weightsDoc.exists()) {
          const data = weightsDoc.data();
          setSubjectWeight(data.subjectWeight || 50);
          setFacultyWeight(data.facultyWeight || 50);
        }
      } catch (error) {
        console.error('Error fetching score weights:', error);
      }
    };

    fetchWeights();
  }, [db]);

  const handleSaveWeights = async () => {
    if (subjectWeight + facultyWeight !== 100) {
      alert('The total percentage must equal 100%.');
      return;
    }

    try {
      await setDoc(doc(db, 'settings', 'scoreWeights'), {
        subjectWeight,
        facultyWeight,
      });
      alert('Weights updated successfully.');
      setShowModal(false);
    } catch (error) {
      console.error('Error saving weights:', error);
      alert('Failed to update weights.');
    }
  };

  const fetchFaculties = useCallback(() => {
    const facultyQuery = query(collection(db, 'users'), where('role', '==', 'Faculty'));

    const unsubscribe = onSnapshot(
      facultyQuery,
      async (snapshot) => {
        const facultyList = await Promise.all(
          snapshot.docs.map(async (facultyDoc) => {
            const facultyData = facultyDoc.data();
            const facultyId = facultyDoc.id;

            const facultyEvaluationDoc = await getDoc(doc(db, 'facultyEvaluations', facultyId));
            const facultyEvaluationData = facultyEvaluationDoc.exists() ? facultyEvaluationDoc.data() : null;
            const facultyScore = facultyEvaluationData ? facultyEvaluationData.averageScore : 'Not scored yet';

            const subjectEvaluationDoc = await getDoc(doc(db, 'facultyEvaluations', facultyId, 'subjects', '123'));
            const subjectEvaluationData = subjectEvaluationDoc.exists() ? subjectEvaluationDoc.data() : null;
            const subjectScore = subjectEvaluationData ? subjectEvaluationData.averageScore : 'Not scored yet';

            let finalScore = 'Not scored yet';
            if (facultyScore !== 'Not scored yet' && subjectScore !== 'Not scored yet') {
              finalScore = (
                subjectScore * (subjectWeight / 100) +
                facultyScore * (facultyWeight / 100)
              ).toFixed(2);
            }

            return {
              id: facultyId,
              ...facultyData,
              facultyScore,
              subjectScore,
              finalScore,
            };
          })
        );

        setFaculties(facultyList);
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching faculties:', error);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [db, subjectWeight, facultyWeight]);

  useEffect(() => {
    fetchFaculties();
  }, [fetchFaculties]);

  const handleNextPage = () => {
    if (currentPage * facultiesPerPage < faculties.length) {
      setCurrentPage((prevPage) => prevPage + 1);
    }
  };

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage((prevPage) => prevPage - 1);
    }
  };

  const displayedFaculties = faculties.slice(
    (currentPage - 1) * facultiesPerPage,
    currentPage * facultiesPerPage
  );

  return (
    <div className="eval-scoring-page">
      <nav className="navbar">
        <div className="dashboardlogoscoring-container">
          <img src="/spc.png" alt="Logo" className="dashboardlogoscoring" />
        </div>
        <h1>Evaluation Report Scoring Page</h1>
        <button onClick={() => setShowModal(true)}>Set Score Weights</button>
      </nav>

      {showModal && (
        <div className="modal">
          <div className="modal-content">
            <h2>Edit Score Weights</h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSaveWeights();
              }}
            >
              <div>
                <label>Subject Score Weight (%):</label>
                <input
                  type="number"
                  value={subjectWeight}
                  onChange={(e) => setSubjectWeight(Number(e.target.value))}
                  min="0"
                  max="100"
                />
              </div>
              <div>
                <label>Faculty Score Weight (%):</label>
                <input
                  type="number"
                  value={facultyWeight}
                  onChange={(e) => setFacultyWeight(Number(e.target.value))}
                  min="0"
                  max="100"
                />
              </div>
              <button type="submit">Save Weights</button>
              <button type="button" onClick={() => setShowModal(false)}>Cancel</button>
            </form>
          </div>
        </div>
      )}

      <div className="scoringcontainer">
        <div className="faculty-list">
          <h2>Faculty Scores</h2>
          {loading ? (
            <p>Loading faculty data...</p>
          ) : (
            <div>
              <table>
                <thead>
                  <tr>
                    <th>Faculty Name</th>
                    <th>Department</th>
                    <th>Faculty Evaluation Score</th>
                    <th>Subject Evaluation Score</th>
                    <th>Final Score (Weighted)</th>
                  </tr>
                </thead>
                <tbody>
                  {displayedFaculties.map((faculty) => (
                    <tr key={faculty.id}>
                      <td>{`${faculty.firstName} ${faculty.lastName}`}</td>
                      <td>{faculty.department}</td>
                      <td>
                        {faculty.facultyScore !== 'Not scored yet'
                          ? faculty.facultyScore.toFixed(2)
                          : 'Not scored yet'}
                      </td>
                      <td>
                        {faculty.subjectScore !== 'Not scored yet'
                          ? faculty.subjectScore.toFixed(2)
                          : 'Not scored yet'}
                      </td>
                      <td>{faculty.finalScore}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="pagination">
                <button onClick={handlePreviousPage} disabled={currentPage === 1}>
                  Previous
                </button>
                <span>
                  Page {currentPage} 
                </span>
                <button
                  onClick={handleNextPage}
                  disabled={currentPage * facultiesPerPage >= faculties.length}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EvaluationReportScoringPage;
