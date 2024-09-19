import React, { useEffect, useState } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom'; // Import useNavigate
import { getFirestore, collection, getDocs, doc, getDoc } from 'firebase/firestore';
import './viewreport.css';


const ViewEvaluationPage = () => {
  const { facultyId } = useParams(); // Get the facultyId from the route
  const location = useLocation(); // To get the passed state (firstName, lastName)
  const navigate = useNavigate(); // Initialize useNavigate to go back

  const firstName = location.state?.firstName || 'N/A';
  const lastName = location.state?.lastName || 'N/A';

  const [evaluations, setEvaluations] = useState([]);
  const [questions, setQuestions] = useState([]); // Store the questions here
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const db = getFirestore();

  // Fetch evaluations for the facultyId
  useEffect(() => {
    const fetchEvaluations = async () => {
      try {
        setLoading(true);
        const evaluationsSnapshot = await getDocs(collection(db, `facultyEvaluations/${facultyId}/completed_evaluations`));
        const evaluationData = [];
        evaluationsSnapshot.forEach((doc) => {
          evaluationData.push({ id: doc.id, ...doc.data() });
        });
        setEvaluations(evaluationData);
      } catch (error) {
        setError("Failed to fetch evaluations.");
        console.error("Error fetching evaluations:", error);
      } finally {
        setLoading(false);
      }
    };

    const fetchQuestions = async () => {
      try {
        const questionsDoc = await getDoc(doc(db, 'facultyEvaluations', 'default'));
        if (questionsDoc.exists()) {
          setQuestions(questionsDoc.data().questions);
        } else {
          setError('No questions found.');
        }
      } catch (error) {
        setError('Error fetching questions: ' + error.message);
      }
    };

    fetchEvaluations();
    fetchQuestions();
  }, [facultyId, db]);

  if (loading) return <p>Loading evaluations...</p>;
  if (error) return <p>{error}</p>;

  return  (
    <div className="view-evaluation-page">
      <h1>Evaluation Details for Faculty: {firstName} {lastName}</h1>
      {evaluations.length > 0 ? (
        evaluations.map((evaluation) => (
          <div className="evaluation-card" key={evaluation.id}>
            <p><strong>Date:</strong> {new Date(evaluation.createdAt.seconds * 1000).toLocaleDateString()}</p>
            <p><strong>Percentage Score:</strong> {evaluation.percentageScore}</p>
            <p><strong>Rating:</strong> {evaluation.percentageScore >= 80 ? 'Good' : 'Bad'}</p>
            <h3>Questions and Scores:</h3>
            {/* Question and Response Table */}
            <table className="evaluation-table">
  <thead>
    <tr>
      <th>Question</th>
      <th>1</th>
      <th>2</th>
      <th>3</th>
      <th>4</th>
      <th>5</th>
    </tr>
  </thead>
  <tbody>
    {evaluation.scores.map((score, index) => (
      <tr key={index}>
        <td>{questions[index]?.text || `Question ${index + 1}`}</td>
        {[1, 2, 3, 4, 5].map((value) => (
          <td key={value}>
            {parseInt(score) === value ? (
              <span className="response-circle"></span>
            ) : null}
          </td>
        ))}
      </tr>
    ))}
  </tbody>
</table>
            {/* Comment Section Below */}
            <div className="comment-section">
              <p><strong>Comment:</strong> {evaluation.comment}</p>
            </div>
          </div>
        ))
      ) : (
        <p>No evaluations available for this faculty member.</p>
      )}

      <button onClick={() => navigate(-1)} style={{ padding: '10px', marginTop: '20px' }}>Back to Faculty List</button>
    </div>
  );
};

export default ViewEvaluationPage;
