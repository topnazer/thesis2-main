import React, { useState, useEffect, useCallback } from 'react';
import {
  getFirestore,
  doc,
  getDocs,
  setDoc,
  collection,
  query,
  where,
  onSnapshot,
  getDoc,
} from 'firebase/firestore';
import './evaluationreportscoringpage.css';

const EvaluationReportScoringPage = () => {
  const [subjectWeight, setSubjectWeight] = useState(60);
  const [facultyWeight, setFacultyWeight] = useState(40);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [faculties, setFaculties] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedSemester, setSelectedSemester] = useState("1st Semester");
  const [selectedSchoolYear, setSelectedSchoolYear] = useState("");
  const currentYear = new Date().getFullYear();
  const schoolYears = Array.from({ length: 10 }, (_, i) => `${currentYear + i}-${currentYear + i + 1}`);
  const facultiesPerPage = 10;
  const db = getFirestore();

  useEffect(() => {
    const fetchWeights = async () => {
      try {
        const weightsDoc = await getDoc(doc(db, 'settings', 'scoreWeights'));
        if (weightsDoc.exists()) {
          const data = weightsDoc.data();
          setSubjectWeight(data.subjectWeight || 60);
          setFacultyWeight(data.facultyWeight || 40);
        }
      } catch (error) {
        console.error('Error fetching score weights:', error);
      }
    };

    fetchWeights();
  }, [db]);

  const handleSemesterChange = (e) => {
    setSelectedSemester(e.target.value);
  };

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
    const facultyQuery = query(
      collection(db, 'users'),
      where('role', '==', 'Faculty')
    );
  
    const unsubscribe = onSnapshot(
      facultyQuery,
      async (snapshot) => {
        const facultyList = await Promise.all(
          snapshot.docs.map(async (facultyDoc) => {
            const facultyData = facultyDoc.data();
            const facultyId = facultyDoc.id;
  
            // Query subject evaluations for this faculty
            const subjectEvaluationsQuery = query(
              collection(db, 'subjectEvaluations'),
              where('facultyId', '==', facultyId)
            );
            const subjectEvaluationsSnapshot = await getDocs(subjectEvaluationsQuery);
  
            let totalSubjectScore = 0;
            let totalSubjectPercentage = 0;
            let subjectCount = 0;
  
            if (!subjectEvaluationsSnapshot.empty) {
              subjectEvaluationsSnapshot.forEach((doc) => {
                const evaluationData = doc.data();
                totalSubjectScore += evaluationData.averageScore || 0;
                totalSubjectPercentage += evaluationData.percentageScore || 0; // Sum of raw percentage scores
                subjectCount += 1;
              });
            }
  
            // Calculate averages
            const subjectScore =
              subjectCount > 0
                ? totalSubjectScore / subjectCount
                : 'Not scored yet';
  
            const subjectPercentage =
              subjectCount > 0
                ? Math.round((totalSubjectPercentage / subjectCount) * subjectWeight / 100) // Apply subjectWeight
                : 'Not scored yet';
  
            // Query faculty dean evaluations
            const facultyEvaluationDoc = await getDoc(
              doc(db, 'facdeanEvaluations', facultyId)
            );
            const facultyEvaluationData = facultyEvaluationDoc.exists()
              ? facultyEvaluationDoc.data()
              : null;
  
            const facultyScore = facultyEvaluationData
              ? facultyEvaluationData.averageScore
              : 'Not scored yet';
  
            const facultyPercentage = facultyEvaluationData
              ? Math.round((facultyEvaluationData.percentageScore || 0) * facultyWeight / 100) // Apply facultyWeight
              : 'Not scored yet';
  
            // Calculate weighted scores
            const weightedSubjectScore =
              typeof subjectScore === 'number'
                ? parseFloat(((subjectScore * subjectWeight) / 100).toFixed(2))
                : 'Not scored yet';
  
            const weightedFacultyScore =
              typeof facultyScore === 'number'
                ? parseFloat(((facultyScore * facultyWeight) / 100).toFixed(2))
                : 'Not scored yet';
  
            // Calculate final score
            const finalScore =
              typeof weightedSubjectScore === 'number' &&
              typeof weightedFacultyScore === 'number'
                ? weightedSubjectScore + weightedFacultyScore
                : 'Not scored yet';
  
            // Assign remarks based on finalScore
            const remarks =
              typeof finalScore === 'number'
                ? finalScore >= 5
                  ? 'Excellent'
                  : finalScore >= 4
                  ? 'Very Satisfactory'
                  : finalScore >= 3
                  ? 'Satisfactory'
                  : finalScore >= 2
                  ? 'Needs Improvement'
                  : 'Poor'
                : 'Not scored yet';
  
            // Return faculty data with calculated scores
            return {
              id: facultyId,
              ...facultyData,
              facultyScore: weightedFacultyScore,
              facultyPercentage,
              subjectScore: weightedSubjectScore,
              subjectPercentage, // Correctly weighted value
              finalScore,
              remarks,
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

  const handlePrint = (faculty) => {
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>Faculty Evaluation Report</title>
          <style>
            .print-header {
              text-align: center;
              margin-bottom: 20px;
            }
            .print-header img {
              width: 100px;
            }
            .print-table {
              width: 100%;
              border-collapse: collapse;
              margin: 20px 0;
            }
            .print-table th, .print-table td {
              border: 1px solid #000;
              padding: 8px;
              text-align: left;
            }
          </style>
        </head>
        <body>
          <div class="print-header">
            <img src="/spc.png" alt="Logo" />
            <h1>Faculty Evaluation Report</h1>
          </div>
          <table class="print-table">
            <thead>
              <tr>
                <th>Semester</th>
                <th>Faculty Name</th>
                <th>Department</th>
                <th>Supervisor Score (40%)</th>
                <th>Supervisor (%)</th>
                <th>Student Score (60%)</th>
                <th>Student (%)</th>
                <th>Final Score</th>
                <th>Remarks</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>${selectedSemester} / ${currentYear}</td>
                <td>${faculty.firstName} ${faculty.lastName}</td>
                <td>${faculty.department}</td>
                <td>${typeof faculty.facultyScore === 'number'
                  ? faculty.facultyScore.toFixed(2)
                  : faculty.facultyScore}</td>
                <td>${typeof faculty.facultyPercentage === 'number'
                  ? `${faculty.facultyPercentage.toFixed(2)}%`
                  : faculty.facultyPercentage}</td>
                <td>${typeof faculty.subjectScore === 'number'
                  ? faculty.subjectScore.toFixed(2)
                  : faculty.subjectScore}</td>
                <td>${typeof faculty.subjectPercentage === 'number'
                  ? `${faculty.subjectPercentage.toFixed(2)}%`
                  : faculty.subjectPercentage}</td>
                <td>${typeof faculty.finalScore === 'number'
                  ? faculty.finalScore.toFixed(2)
                  : faculty.finalScore}</td>
                <td>${faculty.remarks}</td>
              </tr>
            </tbody>
          </table>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
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
        <button className="score-weights-btn" onClick={() => setShowModal(true)}>
          Set Score Weights
        </button>
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
              <button type="button" onClick={() => setShowModal(false)}>
                Cancel
              </button>
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
      <th>Supervisor (40%)</th>
      <th>Supervisor (%)</th>
      <th>Student (60%)</th>
      <th>Student (%)</th>
      <th>Overall Rating</th>
      <th>Remarks</th>
      <th>Action</th>
    </tr>
  </thead>
  <tbody>
    {displayedFaculties.map((faculty) => (
      <tr key={faculty.id}>
        <td>{`${faculty.firstName} ${faculty.lastName}`}</td>
        <td>{faculty.department}</td>
        <td>
          {typeof faculty.facultyScore === 'number'
            ? faculty.facultyScore.toFixed(2)
            : faculty.facultyScore}
        </td>
        <td>
          {typeof faculty.facultyPercentage === 'number'
            ? `${faculty.facultyPercentage}`
            : faculty.facultyPercentage}
        </td>
        <td>
          {typeof faculty.subjectScore === 'number'
            ? faculty.subjectScore.toFixed(2)
            : faculty.subjectScore}
        </td>
        <td>
          {typeof faculty.subjectPercentage === 'number'
            ? `${faculty.subjectPercentage}`
            : faculty.subjectPercentage}
        </td>
        <td>
          {typeof faculty.finalScore === 'number'
            ? faculty.finalScore.toFixed(2)
            : faculty.finalScore}
        </td>
        <td>{faculty.remarks}</td>
        <td>
          <button onClick={() => handlePrint(faculty)}>Print</button>
        </td>
      </tr>
    ))}
  </tbody>
</table>

              <div className="paginationreport">
                <button onClick={handlePreviousPage} disabled={currentPage === 1}>
                  Previous
                </button>
                <span>Page {currentPage}</span>
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
