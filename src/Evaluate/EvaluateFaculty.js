import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { getFirestore, doc, getDoc, setDoc, collection } from 'firebase/firestore';
import { auth } from '../firebase';
import './Evaluate.css'; // Add the new CSS file

const EvaluateFaculty = () => {
  const { facultyId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [faculty, setFaculty] = useState(null);
  const [evaluationForm, setEvaluationForm] = useState([]);
  const [categories, setCategories] = useState([]); // New state for categories
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [responses, setResponses] = useState({});
  const [comment, setComment] = useState("");
  const db = getFirestore();

  const fetchFaculty = useCallback(async () => {
    try {
      const facultyDoc = await getDoc(doc(db, 'users', facultyId));
      if (facultyDoc.exists()) {
        setFaculty(facultyDoc.data());
      } else {
        setError('Faculty member not found.');
      }
    } catch (error) {
      setError('Error fetching faculty: ' + error.message);
    } finally {
      setLoading(false);
    }
  }, [db, facultyId]);

  const fetchEvaluationForm = useCallback(async () => {
    try {
      const evaluationDoc = await getDoc(doc(db, 'evaluationForms', 'faculty'));
      if (evaluationDoc.exists()) {
        const data = evaluationDoc.data();
        setEvaluationForm(data.questions || []);
        setCategories(data.categories || []); // Set categories state
      } else {
        setError('No evaluation form found for faculty.');
      }
    } catch (error) {
      setError('Error fetching evaluation form: ' + error.message);
    }
  }, [db]);

  const checkIfAlreadyEvaluated = useCallback(async () => {
    const user = auth.currentUser;
    if (!user) return;

    try {
      const evaluationDoc = await getDoc(doc(db, 'facultyEvaluations', facultyId, 'completed_evaluations', user.uid));
      if (evaluationDoc.exists()) {
        alert('You have already evaluated this faculty member.');
        navigate(location.state?.redirectTo || "/faculty-dashboard");
      }
    } catch (error) {
      console.error("Error checking evaluation status:", error);
    }
  }, [db, facultyId, navigate, location.state?.redirectTo]);

  useEffect(() => {
    fetchFaculty();
    fetchEvaluationForm();
    checkIfAlreadyEvaluated(); // Check if the current user has already evaluated this faculty
  }, [fetchFaculty, fetchEvaluationForm, checkIfAlreadyEvaluated]);

  const handleResponseChange = (categoryIndex, questionIndex, value) => {
    const updatedResponses = { ...responses }; // Change responses to an object
    const uniqueKey = `${categoryIndex}-${questionIndex}`;
    updatedResponses[uniqueKey] = value;
    setResponses(updatedResponses);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const totalScore = Object.values(responses).reduce((sum, score) => sum + parseInt(score), 0);
    const maxScore = evaluationForm.length * 5;
    const percentageScore = (totalScore / maxScore) * 100;

    const user = auth.currentUser;
    if (!user) {
      alert('User not authenticated.');
      return;
    }

    try {
      const evaluationRef = doc(collection(db, 'facultyEvaluations', facultyId, 'completed_evaluations'), user.uid);
      await setDoc(evaluationRef, {
        userId: user.uid,
        facultyId: facultyId,
        scores: responses,
        comment: comment,
        percentageScore,
        createdAt: new Date(),
      });

      const facultyEvaluationRef = doc(db, 'facultyEvaluations', facultyId);
      const facultyEvaluationDoc = await getDoc(facultyEvaluationRef);
      let newAverageScore;

      if (facultyEvaluationDoc.exists()) {
        const existingAverageScore = facultyEvaluationDoc.data().averageScore || 0;
        const completedEvaluations = (facultyEvaluationDoc.data().completedEvaluations || 0) + 1;
        newAverageScore = ((existingAverageScore * (completedEvaluations - 1)) + percentageScore) / completedEvaluations;

        await setDoc(facultyEvaluationRef, {
          averageScore: newAverageScore,
          completedEvaluations,
        }, { merge: true });
      } else {
        newAverageScore = percentageScore;
        await setDoc(facultyEvaluationRef, {
          averageScore: newAverageScore,
          completedEvaluations: 1,
        });
      }

      // Mark evaluation as done
      await setDoc(doc(db, 'facultyEvaluations', facultyId, 'completed_evaluations', user.uid), {
        evaluated: true, // Mark as evaluated
        timestamp: new Date(),
      });

      alert('Evaluation submitted successfully!');
      navigate(location.state?.redirectTo || "/faculty-dashboard");
    } catch (error) {
      alert('Failed to submit evaluation. Please try again.');
    }
  };

  if (loading) {
    return <p>Loading faculty data...</p>;
  }

  if (error) {
    return <p>{error}</p>;
  }

  const renderQuestionsByCategory = () => {
    return categories.map((category, categoryIndex) => (
      <React.Fragment key={categoryIndex}>
        <tr>
        <td colSpan="6" className="category-header"><strong>{category}</strong></td>
        </tr>
        {evaluationForm
          .filter(question => question.category === category)
          .map((question, questionIndex) => {
            const uniqueKey = `${categoryIndex}-${questionIndex}`;
            return (
              <tr key={uniqueKey}>
                <td>{question.text}</td>
                {[1, 2, 3, 4, 5].map(value => (
                  <td key={value}>
                    <input
                      type="radio"
                      name={`question-${uniqueKey}`}
                      value={value}
                      checked={responses[uniqueKey] === String(value)}
                      onChange={(e) => handleResponseChange(categoryIndex, questionIndex, e.target.value)}
                    />
                  </td>
                ))}
              </tr>
            );
          })}
      </React.Fragment>
    ));
  };

  return (
    <div className="evaluate-faculty-page evaluation-form">
      <h1>Evaluate {faculty ? `${faculty.firstName} ${faculty.lastName}` : 'Faculty'}</h1>
      <h2>Department: {faculty ? faculty.department : 'No department available'}</h2>
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
            {renderQuestionsByCategory()}
          </tbody>
        </table>
        <div>
          <label>Comments/Feedback</label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Enter your comments about the faculty here"
          />
        </div>
        <button type="submit">Submit Evaluation</button>
      </form>
    </div>
  );
};

export default EvaluateFaculty;
