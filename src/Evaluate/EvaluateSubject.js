import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { getFirestore, doc, getDoc, setDoc, collection } from 'firebase/firestore';
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [responses, setResponses] = useState({});
  const [comment, setComment] = useState("");
  const [averageScore, setAverageScore] = useState(null); // State to hold the subject's average score
  const db = getFirestore();

  // Fetch subject data and its average score
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

        // Fetch the subject's average score
        const subjectEvaluationRef = doc(db, 'subjectEvaluations', subjectId);
        const subjectEvaluationDoc = await getDoc(subjectEvaluationRef);
        if (subjectEvaluationDoc.exists()) {
          setAverageScore(subjectEvaluationDoc.data().averageScore || null);
        } else {
          setAverageScore(null); // Set to null if no evaluations exist
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

  // Fetch evaluation form with categories
  const fetchEvaluationForm = useCallback(async () => {
    try {
      const evaluationDoc = await getDoc(doc(db, "evaluationForms", subjectId));
      if (evaluationDoc.exists()) {
        const data = evaluationDoc.data();
        setEvaluationForm(data.questions || []);
        setCategories(data.categories || []);
      } else {
        setError("No evaluation form found for this subject.");
      }
    } catch (error) {
      setError("Error fetching evaluation form: " + error.message);
    }
  }, [db, subjectId]);

  useEffect(() => {
    fetchSubject();
    fetchEvaluationForm();
  }, [fetchSubject, fetchEvaluationForm]);

  // Handle response changes
  const handleResponseChange = (categoryIndex, questionIndex, value) => {
    const updatedResponses = { ...responses };
    const uniqueKey = `${categoryIndex}-${questionIndex}`;
    updatedResponses[uniqueKey] = value;
    setResponses(updatedResponses);
  };

  // Submit evaluation
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
        // Store the individual student's evaluation
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
            comment: comment,
            percentageScore,
            createdAt: new Date(),
        });

        // Update the subject's average score in the database
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

        // Update the faculty's evaluation data in the database
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

  if (loading) {
    return <p>Loading subject data...</p>;
  }

  if (error) {
    return <p>{error}</p>;
  }

  // Render questions by category
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
    <div className="evaluate-subject-page evaluation-form">
      <h1>Evaluate {subject?.name}</h1>
      <h2>Faculty: {faculty ? `${faculty.firstName} ${faculty.lastName}` : 'No faculty assigned'}</h2>
      {averageScore !== null && (
        <p>Current Average Score for {subject?.name}: {averageScore.toFixed(2)}</p>
      )}
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
            placeholder="Enter your comments about the subject here"
          />
        </div>
        <button type="submit">Submit Evaluation</button>
      </form>
    </div>
  );
};

export default EvaluateSubject;
