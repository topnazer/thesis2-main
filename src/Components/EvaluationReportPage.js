import React, { useState, useEffect, useCallback } from 'react';
import { getFirestore, doc, getDoc, setDoc, collection, query, where, onSnapshot, getDocs } from 'firebase/firestore';
import './evaluationreportscoringpage.css';  // CSS for layout

const EvaluationReportScoringPage = () => {
  const [subjectWeight, setSubjectWeight] = useState(50); // Default 50%
  const [facultyWeight, setFacultyWeight] = useState(50); // Default 50%
  const [loading, setLoading] = useState(true);
  const [faculties, setFaculties] = useState([]); // Faculty list with their calculated scores
  const db = getFirestore();

  // Fetch existing weights from the database
  const fetchWeights = useCallback(async () => {
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
  }, [db]);

  // Fetch all faculties based on similar logic as in FacultyDashboard
  const fetchFaculties = useCallback(() => {
    // Subscribe to real-time updates using onSnapshot
    const facultyQuery = query(collection(db, 'users'), where('role', '==', 'Faculty'));

    const unsubscribe = onSnapshot(facultyQuery, (snapshot) => {
      const facultyList = snapshot.docs.map((facultyDoc) => ({
        id: facultyDoc.id,
        ...facultyDoc.data(),
      }));
      setFaculties(facultyList);
      setLoading(false);
    }, (error) => {
      console.error('Error fetching faculties:', error);
      setLoading(false);
    });

    return unsubscribe; // Clean up subscription on component unmount
  }, [db]);

  // Save updated weights to the database
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
    } catch (error) {
      console.error('Error saving weights:', error);
      alert('Failed to update weights.');
    }
  };

  // Calculate the final score for a faculty based on the weights
  const calculateFinalScore = async (facultyId) => {
    try {
      const facultyEvaluationDoc = await getDoc(doc(db, 'facultyEvaluations', facultyId));
      const facultyScore = facultyEvaluationDoc.exists() ? facultyEvaluationDoc.data().averageScore : 0;

      const subjectEvaluationCollection = await getDocs(collection(db, 'facultyEvaluations', facultyId, 'subjects'));
      let totalSubjectScore = 0;
      let subjectCount = 0;

      subjectEvaluationCollection.forEach((subjectDoc) => {
        totalSubjectScore += subjectDoc.data().averageScore || 0;
        subjectCount += 1;
      });

      const subjectScore = subjectCount > 0 ? totalSubjectScore / subjectCount : 0;

      // Calculate final score using the weights
      const finalScore = (subjectScore * (subjectWeight / 100)) + (facultyScore * (facultyWeight / 100));
      return finalScore.toFixed(2);
    } catch (error) {
      console.error('Error calculating final score:', error);
      return 0;
    }
  };

  // Fetch faculty scores and recalculate when weights change
  const updateFacultyScores = useCallback(async () => {
    setLoading(true);
    const updatedFaculties = await Promise.all(
      faculties.map(async (faculty) => {
        const finalScore = await calculateFinalScore(faculty.id);
        return {
          ...faculty,
          finalScore,
        };
      })
    );
    setFaculties(updatedFaculties);
    setLoading(false);
  }, [faculties, subjectWeight, facultyWeight]);

  // Fetch data on component mount
  useEffect(() => {
    fetchWeights();
    fetchFaculties();
  }, [fetchWeights, fetchFaculties]);

  // Recalculate faculty scores whenever the weights change
  useEffect(() => {
    if (faculties.length > 0) {
      updateFacultyScores();
    }
  }, [subjectWeight, facultyWeight, faculties, updateFacultyScores]);

  return (
    <div className="evaluation-report-scoring-page">
      <h1>Evaluation Report Scoring Page</h1>

      <div className="weight-controls">
        <h2>Set Score Weights</h2>
        <form onSubmit={(e) => { e.preventDefault(); handleSaveWeights(); }}>
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
        </form>
      </div>

      <div className="faculty-list">
        <h2>Faculty Scores</h2>
        {loading ? (
          <p>Loading faculty data...</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Faculty Name</th>
                <th>Department</th>
                <th>Final Score</th>
              </tr>
            </thead>
            <tbody>
              {faculties.map((faculty) => (
                <tr key={faculty.id}>
                  <td>{`${faculty.firstName} ${faculty.lastName}`}</td>
                  <td>{faculty.department}</td>
                  <td>{faculty.finalScore}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default EvaluationReportScoringPage;
