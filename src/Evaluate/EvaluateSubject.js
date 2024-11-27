import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';
import { auth } from '../firebase';
import './Evaluate.css';

const EvaluateSubject = () => {
  const { subjectId, sectionId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [subject, setSubject] = useState(null);
  const [faculty, setFaculty] = useState(null);
  const [evaluationForm, setEvaluationForm] = useState([]);
  const [categories, setCategories] = useState([]);
  const [currentCategoryIndex, setCurrentCategoryIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [responses, setResponses] = useState({});
  const [comment, setComment] = useState("");
  const [averageScore, setAverageScore] = useState(null);
  const db = getFirestore();

  // Fetch subject information
  const fetchSubject = useCallback(async () => {
    try {
      const subjectDoc = await getDoc(doc(db, "subjects", subjectId));
      if (subjectDoc.exists()) {
        setSubject(subjectDoc.data());
        const facultyId = subjectDoc.data().facultyId;
        if (facultyId) {
          const facultyDoc = await getDoc(doc(db, "users", facultyId));
          if (facultyDoc.exists()) {
            setFaculty(facultyDoc.data());
          } else {
            setError("Faculty not found for the subject.");
          }
        }

        const subjectEvaluationRef = doc(db, 'subjectEvaluations', subjectId);
        const subjectEvaluationDoc = await getDoc(subjectEvaluationRef);
        if (subjectEvaluationDoc.exists()) {
          setAverageScore(subjectEvaluationDoc.data().averageScore || null);
        } else {
          setAverageScore(null);
        }
      } else {
        setError("Subject not found");
      }
    } catch (error) {
      setError("Error fetching subject: " + error.message);
    } finally {
      setLoading(false);
    }
  }, [db, subjectId]);

  // Fetch evaluation form and categories
  const fetchEvaluationForm = useCallback(async () => {
    try {
      const evaluationDoc = await getDoc(doc(db, "evaluationForms", "subject"));
      if (evaluationDoc.exists()) {
        const data = evaluationDoc.data();

        if (!data.questions || !Array.isArray(data.questions)) {
          throw new Error("Invalid questions structure in Firestore.");
        }
        if (!data.categories || !Array.isArray(data.categories)) {
          throw new Error("Invalid categories structure in Firestore.");
        }

        setEvaluationForm(data.questions);
        setCategories(data.categories.map((category) => category.name)); // Extract category names
      } else {
        setError("No evaluation form found for this subject.");
      }
    } catch (error) {
      setError("Error fetching evaluation form: " + error.message);
    }
  }, [db]);

  // Initial data fetch
  useEffect(() => {
    fetchSubject();
    fetchEvaluationForm();
  }, [fetchSubject, fetchEvaluationForm]);

  const handleResponseChange = (categoryIndex, questionIndex, value) => {
    const updatedResponses = { ...responses };
    const uniqueKey = `${categoryIndex}-${questionIndex}`;
    updatedResponses[uniqueKey] = String(value);
    setResponses(updatedResponses);
  };

  // Check if all questions in the current category are answered
  const isCurrentCategoryComplete = () => {
    if (!categories[currentCategoryIndex]) {
      return false;
    }
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
      alert('User not authenticated.');
      return;
    }

    try {
      const evaluationRef = doc(
        db,
        `students/${user.uid}/subjects/${subjectId}/sections/${sectionId}/completed_evaluations`,
        user.uid
      );

      await setDoc(evaluationRef, {
        userId: user.uid,
        sectionId,
        subjectId,
        facultyId: subject?.facultyId || null,
        scores: responses,
        comment,
        percentageScore,
        createdAt: new Date(),
      });

      const subjectEvaluationRef = doc(db, 'subjectEvaluations', subjectId);
      const subjectEvaluationDoc = await getDoc(subjectEvaluationRef);
      let newAverageScore;

      if (subjectEvaluationDoc.exists()) {
        const existingAverageScore = subjectEvaluationDoc.data().averageScore || 0;
        const completedEvaluations = (subjectEvaluationDoc.data().completedEvaluations || 0) + 1;
        newAverageScore = ((existingAverageScore * (completedEvaluations - 1)) + percentageScore) / completedEvaluations;

        await setDoc(subjectEvaluationRef, {
          averageScore: newAverageScore,
          completedEvaluations,
        }, { merge: true });
      } else {
        newAverageScore = percentageScore;
        await setDoc(subjectEvaluationRef, {
          averageScore: newAverageScore,
          completedEvaluations: 1,
        });
      }

      if (subject?.facultyId) {
        const facultyEvaluationRef = doc(db, 'facultyEvaluations', subject.facultyId, 'subjects', subjectId);
        const facultyEvaluationDoc = await getDoc(facultyEvaluationRef);
        let facultyNewAverageScore;

        if (facultyEvaluationDoc.exists()) {
          const existingFacultyAverageScore = facultyEvaluationDoc.data().averageScore || 0;
          const facultyCompletedEvaluations = (facultyEvaluationDoc.data().completedEvaluations || 0) + 1;
          facultyNewAverageScore = ((existingFacultyAverageScore * (facultyCompletedEvaluations - 1)) + percentageScore) / facultyCompletedEvaluations;

          await setDoc(facultyEvaluationRef, {
            averageScore: facultyNewAverageScore,
            completedEvaluations: facultyCompletedEvaluations,
          }, { merge: true });
        } else {
          facultyNewAverageScore = percentageScore;
          await setDoc(facultyEvaluationRef, {
            averageScore: facultyNewAverageScore,
            completedEvaluations: 1,
          });
        }
      }

      alert('Evaluation submitted successfully!');
      navigate(location.state?.redirectTo || "/student-dashboard");
    } catch (error) {
      alert('Failed to submit evaluation. Please try again.');
      console.error("Error submitting evaluation:", error.message);
    }
  };


  const renderQuestionsForCurrentCategory = () => {
    const currentCategory = categories[currentCategoryIndex];
    if (!currentCategory) {
      return <tr><td>No questions available for this category.</td></tr>;
    }

    const categoryQuestions = evaluationForm.filter(
      (question) => question.category === currentCategory
    );

    if (categoryQuestions.length === 0) {
      return <tr><td>No questions available for this category.</td></tr>;
    }

    return (
      <React.Fragment>
        <tr>
          <td colSpan="6" className="category-header"><strong>{currentCategory}</strong></td>
        </tr>
        {categoryQuestions.map((question, questionIndex) => {
          const uniqueKey = `${currentCategoryIndex}-${questionIndex}`;
          return (
            <tr key={uniqueKey}>
              <td>{question.text || "Invalid question text"}</td>
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
    return <p>Loading subject data...</p>;
  }

  if (error) {
    return <p>{error}</p>;
  }

  return (
    <div className="evaluate-subject-page evaluation-form">
      <div className="header-container">
        <div className="form-header">
          <h1>Evaluate {subject?.name}</h1>
          <h2>Faculty: {faculty ? `${faculty.firstName} ${faculty.lastName}` : 'No faculty assigned'}</h2>
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
          placeholder="Enter your comments about the subject here"
        />
      </div>
    </div>
  );
};

export default EvaluateSubject;
