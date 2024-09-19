import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { getFirestore, doc, getDoc, setDoc, collection } from 'firebase/firestore';
import { auth } from '../firebase';
import './Evaluate.css'; // Add the new CSS file

const EvaluateDean = () => {
  const { deanId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [dean, setDean] = useState(null);
  const [evaluationForm, setEvaluationForm] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [responses, setResponses] = useState([]);
  const [comment, setComment] = useState("");
  const db = getFirestore();

  const fetchDean = useCallback(async () => {
    try {
      const deanDoc = await getDoc(doc(db, 'users', deanId));
      if (deanDoc.exists()) {
        setDean(deanDoc.data());
      } else {
        setError('Dean not found.');
      }
    } catch (error) {
      setError('Error fetching dean: ' + error.message);
    } finally {
      setLoading(false);
    }
  }, [db, deanId]);

  const fetchEvaluationForm = useCallback(async () => {
    try {
      const evaluationDoc = await getDoc(doc(db, 'deanEvaluations', 'default'));
      if (evaluationDoc.exists()) {
        setEvaluationForm(evaluationDoc.data().questions);
      } else {
        setError('No evaluation form found for dean.');
      }
    } catch (error) {
      setError('Error fetching evaluation form: ' + error.message);
    }
  }, [db]);

  useEffect(() => {
    fetchDean();
    fetchEvaluationForm();
  }, [fetchDean, fetchEvaluationForm]);

  const handleResponseChange = (index, value) => {
    const updatedResponses = [...responses];
    updatedResponses[index] = value;
    setResponses(updatedResponses);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const totalScore = responses.reduce((sum, score) => sum + parseInt(score), 0);
    const maxScore = evaluationForm.length * 5;
    const percentageScore = (totalScore / maxScore) * 100;

    const user = auth.currentUser;
    if (!user) {
      alert('User not authenticated.');
      return;
    }

    try {
      const evaluationRef = doc(collection(db, 'deanEvaluations', deanId, 'completed_evaluations'), user.uid);
      await setDoc(evaluationRef, {
        userId: user.uid,
        deanId: deanId,
        scores: responses,
        comment: comment,
        percentageScore,
        createdAt: new Date(),
      });

      const deanEvaluationRef = doc(db, 'deanEvaluations', deanId);
      const deanEvaluationDoc = await getDoc(deanEvaluationRef);
      let newAverageScore;

      if (deanEvaluationDoc.exists()) {
        const existingAverageScore = deanEvaluationDoc.data().averageScore || 0;
        const completedEvaluations = (deanEvaluationDoc.data().completedEvaluations || 0) + 1;
        newAverageScore = ((existingAverageScore * (completedEvaluations - 1)) + percentageScore) / completedEvaluations;

        await setDoc(deanEvaluationRef, {
          averageScore: newAverageScore,
          completedEvaluations,
        }, { merge: true });
      } else {
        newAverageScore = percentageScore;
        await setDoc(deanEvaluationRef, {
          averageScore: newAverageScore,
          completedEvaluations: 1,
        });
      }

      alert('Evaluation submitted successfully!');
      navigate(location.state?.redirectTo || "/dean-dashboard");
    } catch (error) {
      alert('Failed to submit evaluation. Please try again.');
    }
  };

  if (loading) {
    return <p>Loading dean data...</p>;
  }

  if (error) {
    return <p>{error}</p>;
  }

  return (
    <div className="evaluate-dean-page evaluation-form">
      <h1>Evaluate Dean {dean ? `${dean.firstName} ${dean.lastName}` : ''}</h1>
      <div className="rating-legend">
        <p>Rating Legend</p>
        <p>1 - Strongly Disagree | 2 - Disagree | 3 - Neutral | 4 - Agree | 5 - Strongly Agree</p>
      </div>
      <form onSubmit={handleSubmit}>
        <table>
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
            {evaluationForm.map((question, index) => (
              <tr key={index}>
                <td>{question.text}</td>
                {[1, 2, 3, 4, 5].map((value) => (
                  <td key={value}>
                    <input 
                      type="radio" 
                      name={`question-${index}`} 
                      value={value} 
                      checked={responses[index] === String(value)} 
                      onChange={(e) => handleResponseChange(index, e.target.value)} 
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        <div>
          <label>Comments/Feedback</label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Enter your comments about the dean here"
          />
        </div>
        <button type="submit">Submit Evaluation</button>
      </form>
    </div>
  );
};

export default EvaluateDean;
