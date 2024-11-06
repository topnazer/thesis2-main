import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { getFirestore, doc, getDoc, setDoc, collection } from 'firebase/firestore';
import { auth } from '../firebase';
import './Evaluate.css';

const EvaluateFaculty = () => {
  const { facultyId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [faculty, setFaculty] = useState(null);
  const [evaluationForm, setEvaluationForm] = useState([]);
  const [categories, setCategories] = useState([]);
  const [currentCategoryIndex, setCurrentCategoryIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [responses, setResponses] = useState({});
  const [comment, setComment] = useState("");
  const db = getFirestore();

  const fetchFaculty = useCallback(async () => {
    try {
      const facultyDoc = await getDoc(doc(db, "users", facultyId));
      if (facultyDoc.exists()) {
        setFaculty(facultyDoc.data());
      } else {
        setError("Faculty member not found.");
      }
    } catch (error) {
      setError("Error fetching faculty: " + error.message);
    } finally {
      setLoading(false);
    }
  }, [db, facultyId]);

  const fetchEvaluationForm = useCallback(async () => {
    try {
      const evaluationDoc = await getDoc(doc(db, "evaluationForms", "faculty"));
      if (evaluationDoc.exists()) {
        const data = evaluationDoc.data();
        setEvaluationForm(data.questions || []);
        setCategories(data.categories || []);
      } else {
        setError("No evaluation form found for faculty.");
      }
    } catch (error) {
      setError("Error fetching evaluation form: " + error.message);
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
    checkIfAlreadyEvaluated();
  }, [fetchFaculty, fetchEvaluationForm, checkIfAlreadyEvaluated]);

  const handleResponseChange = (categoryIndex, questionIndex, value) => {
    const updatedResponses = { ...responses };
    const uniqueKey = `${categoryIndex}-${questionIndex}`;
    updatedResponses[uniqueKey] = String(value);
    setResponses(updatedResponses);
  };

  const isCurrentCategoryComplete = () => {
    const category = categories[currentCategoryIndex];
    const categoryQuestions = evaluationForm.filter(
      (question) => question.category === category
    );

    return categoryQuestions.every((_, questionIndex) => {
      const uniqueKey = `${currentCategoryIndex}-${questionIndex}`;
      return responses[uniqueKey] !== undefined;
    });
  };

  const handleNext = () => {
    if (!isCurrentCategoryComplete()) {
      alert("Please answer all questions in this category before proceeding.");
      return;
    }
    if (currentCategoryIndex < categories.length - 1) {
      setCurrentCategoryIndex(currentCategoryIndex + 1);
    }
  };

  const handlePrevious = () => {
    if (currentCategoryIndex > 0) {
      setCurrentCategoryIndex(currentCategoryIndex - 1);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!isCurrentCategoryComplete()) {
      alert("Please answer all questions in this category before submitting.");
      return;
    }

    const totalScore = Object.values(responses).reduce((sum, score) => sum + parseInt(score), 0);
    const maxScore = evaluationForm.length * 5;
    const percentageScore = (totalScore / maxScore) * 100;

    const user = auth.currentUser;
    if (!user) {
      alert("User not authenticated.");
      return;
    }

    try {
      const evaluationRef = doc(collection(db, "facultyEvaluations", facultyId, "completed_evaluations"), user.uid);

      await setDoc(evaluationRef, {
        userId: user.uid,
        facultyId: facultyId,
        scores: responses,
        comment,
        percentageScore,
        createdAt: new Date(),
      });

      const facultyEvaluationRef = doc(db, "facultyEvaluations", facultyId);
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

      alert("Evaluation submitted successfully!");
      navigate(location.state?.redirectTo || "/faculty-dashboard");
    } catch (error) {
      alert("Failed to submit evaluation. Please try again.");
      console.error("Error submitting evaluation:", error.message);
    }
  };

  const renderQuestionsForCurrentCategory = () => {
    const category = categories[currentCategoryIndex];
    const categoryQuestions = evaluationForm.filter(
      (question) => question.category === category
    );

    return (
      <React.Fragment>
        <tr>
          <td colSpan="6" className="category-header"><strong>{category}</strong></td>
        </tr>
        {categoryQuestions.map((question, questionIndex) => {
          const uniqueKey = `${currentCategoryIndex}-${questionIndex}`;
          return (
            <tr key={uniqueKey}>
              <td>{question.text}</td>
              {["Strongly disagree", "Disagree", "Neutral", "Agree", "Strongly agree"].map((label, value) => (
                <td key={value}>
                  <input
                    type="radio"
                    name={`question-${uniqueKey}`}
                    value={value + 1}
                    checked={responses[uniqueKey] === String(value + 1)}
                    onChange={(e) => handleResponseChange(currentCategoryIndex, questionIndex, e.target.value)}
                  />
                </td>
              ))}
            </tr>
          );
        })}
      </React.Fragment>
    );
  };

  if (loading) {
    return <p>Loading faculty data...</p>;
  }

  if (error) {
    return <p>{error}</p>;
  }

  return (
    <div className="evaluate-faculty-page evaluation-form">
      <div className="header-container">
        <div className="form-header">
          <h1>Evaluate {faculty ? `${faculty.firstName} ${faculty.lastName}` : "Faculty"}</h1>
          <h2>Department: {faculty ? faculty.department : "No department available"}</h2>
          <div className="logo-container">
            <img src="/spc.png" alt="Logo" className="logo" />
          </div>
        </div>
      </div>

      <div className="form-container">
        <form onSubmit={handleSubmit}>
          <div className="form-table-section">
            <table>
              <thead>
                <tr>
                  <th>Rating Legend</th>
                  <th>Strongly disagree</th>
                  <th>Disagree</th>
                  <th>Neutral</th>
                  <th>Agree</th>
                  <th>Strongly agree</th>
                </tr>
              </thead>
              <tbody>
                {renderQuestionsForCurrentCategory()}
              </tbody>
            </table>
          </div>

          <div className="pagination-controls">
            {currentCategoryIndex > 0 && (
              <button type="button" className="previous-button" onClick={handlePrevious}>Previous</button>
            )}
            {currentCategoryIndex < categories.length - 1 ? (
              <button type="button" className="next-button" onClick={handleNext}>Next</button>
            ) : (
              <button type="submit" className="submit-button">Submit Evaluation</button>
            )}
          </div>
        </form>
      </div>

      <div className="form-comments-section">
        <label>Comments/Feedback</label>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Enter your comments about the faculty here"
        />
      </div>
    </div>
  );
};

export default EvaluateFaculty;
