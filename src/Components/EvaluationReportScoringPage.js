import React, { useState, useEffect, useCallback } from 'react';
import { getFirestore, doc, getDoc, setDoc, collection, query, where, onSnapshot } from 'firebase/firestore';
import './evaluationreportscoringpage.css';  // CSS for layout

const EvaluationReportScoringPage = () => {
  const [subjectWeight, setSubjectWeight] = useState(50); // Default 50%
  const [facultyWeight, setFacultyWeight] = useState(50); // Default 50%
  const [loading, setLoading] = useState(true);
  const [faculties, setFaculties] = useState([]); // Faculty list with their scores
  const db = getFirestore();

  // Fetch existing weights from Firestore, but only once on initial render
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
  }, [db]); // Only run once when the component mounts

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

  // Fetch all faculties and their scores
  const fetchFaculties = useCallback(() => {
    // Subscribe to real-time updates using onSnapshot
    const facultyQuery = query(collection(db, 'users'), where('role', '==', 'Faculty'));

    const unsubscribe = onSnapshot(facultyQuery, async (snapshot) => {
      const facultyList = await Promise.all(snapshot.docs.map(async (facultyDoc) => {
        const facultyData = facultyDoc.data();
        const facultyId = facultyDoc.id;

        // Fetch faculty evaluation score
        const facultyEvaluationDoc = await getDoc(doc(db, 'facultyEvaluations', facultyId));
        const facultyEvaluationData = facultyEvaluationDoc.exists() ? facultyEvaluationDoc.data() : null;
        const facultyScore = facultyEvaluationData ? facultyEvaluationData.averageScore : 'Not scored yet';

        // Fetch subject evaluation score
        const subjectEvaluationDoc = await getDoc(doc(db, 'facultyEvaluations', facultyId, 'subjects', '123')); // Example subject
        const subjectEvaluationData = subjectEvaluationDoc.exists() ? subjectEvaluationDoc.data() : null;
        const subjectScore = subjectEvaluationData ? subjectEvaluationData.averageScore : 'Not scored yet';

        // Calculate final score using the weights
        let finalScore = 'Not scored yet';
        if (facultyScore !== 'Not scored yet' && subjectScore !== 'Not scored yet') {
          finalScore = (
            (subjectScore * (subjectWeight / 100)) +
            (facultyScore * (facultyWeight / 100))
          ).toFixed(2);
        }

        return {
          id: facultyId,
          ...facultyData,
          facultyScore,
          subjectScore,
          finalScore,
        };
      }));

      setFaculties(facultyList);
      setLoading(false);
    }, (error) => {
      console.error('Error fetching faculties:', error);
      setLoading(false);
    });

    return unsubscribe; // Clean up subscription on component unmount
  }, [db, subjectWeight, facultyWeight]);

  useEffect(() => {
    fetchFaculties();
  }, [fetchFaculties]);

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
                <th>Faculty Evaluation Score</th>
                <th>Subject Evaluation Score</th>
                <th>Final Score (Weighted)</th>
              </tr>
            </thead>
            <tbody>
              {faculties.map((faculty) => (
                <tr key={faculty.id}>
                  <td>{`${faculty.firstName} ${faculty.lastName}`}</td>
                  <td>{faculty.department}</td>
                  <td>{faculty.facultyScore !== 'Not scored yet' ? faculty.facultyScore.toFixed(2) : 'Not scored yet'}</td>
                  <td>{faculty.subjectScore !== 'Not scored yet' ? faculty.subjectScore.toFixed(2) : 'Not scored yet'}</td>
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
