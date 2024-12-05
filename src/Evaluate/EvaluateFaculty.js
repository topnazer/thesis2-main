import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { getFirestore, doc, getDoc, setDoc, collection } from 'firebase/firestore';
import { auth } from '../firebase';
import './Evaluate.css';

const EvaluateFaculty  = () => {
  const { facultyId  } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [faculty, setFaculty] = useState(null);
  const [categories, setCategories] = useState([]);
  const [currentCategoryIndex, setCurrentCategoryIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [responses, setResponses] = useState({});
  const [comment, setComment] = useState("");
  const db = getFirestore();

  // Fetch subject information
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

        if (!data.categories || !Array.isArray(data.categories)) {
          throw new Error("Invalid categories structure in Firestore.");
        }

        setCategories(data.categories);
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

  const handleResponseChange = (categoryIndex, questionIndex, value, isCheckbox = false) => {
    const updatedResponses = { ...responses };
    const uniqueKey = `${categoryIndex}-${questionIndex}`;
    if (isCheckbox) {
      updatedResponses[uniqueKey] = updatedResponses[uniqueKey] || [];
      if (updatedResponses[uniqueKey].includes(value)) {
        updatedResponses[uniqueKey] = updatedResponses[uniqueKey].filter((val) => val !== value);
      } else {
        updatedResponses[uniqueKey].push(value);
      }
    } else {
      updatedResponses[uniqueKey] = String(value);
    }
    setResponses(updatedResponses);
  };

  const isCurrentCategoryComplete = () => {
    if (!categories[currentCategoryIndex]) {
      return false;
    }
    const { questions, type } = categories[currentCategoryIndex];
    return questions.every((_, questionIndex) => {
      const uniqueKey = `${currentCategoryIndex}-${questionIndex}`;
      return type === "Checkbox"
        ? responses[uniqueKey] && responses[uniqueKey].length > 0
        : responses[uniqueKey] !== undefined;
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

  const calculateRatingScore = () => {
    let totalScore = 0; // Sum of all responses
    let maxScore = 0; // Maximum possible score

    // Iterate through all categories
    categories.forEach((category, categoryIndex) => {
        if (category.type === "Rating") { // Only process 'Rating' type categories
            const { questions } = category;
            questions.forEach((_, questionIndex) => {
                const uniqueKey = `${categoryIndex}-${questionIndex}`;
                const response = parseInt(responses[uniqueKey] || 0, 10);

                totalScore += response; // Add the response score
                maxScore += 5; // Increment max score by 5 (highest rating)
            });
        }
    });
    const percentageScore = maxScore > 0 ? (totalScore / maxScore) * 100 : 0;

    return { totalScore, maxScore, percentageScore };
};

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!isCurrentCategoryComplete()) {
        alert("Please answer all questions in this category before submitting.");
        return;
    }

    const user = auth.currentUser;
    if (!user) {
        alert("User not authenticated.");
        return;
    }

  
    const { totalScore, maxScore, percentageScore } = calculateRatingScore();

    // Build detailed question-response data
    const detailedQuestions = categories.map((category, categoryIndex) => ({
      categoryName: category.name,
      type: category.type, // Include category type
      questions: category.questions.map((question, questionIndex) => {
          const uniqueKey = `${categoryIndex}-${questionIndex}`;
          return {
              text: question.text, // Question text
              type: category.type, // Question type
              response: responses[uniqueKey] || (category.type === "Checkbox" ? [] : "N/A"), // User's response
              options: category.options || [], // Available options
          };
      }),
  }));
  

    try {
        // Save individual evaluation
        const evaluationRef = doc(collection(db, "facultyEvaluations", facultyId, "completed_evaluations"), user.uid);

        await setDoc(evaluationRef, {
          userId: user.uid,
          facultyId,
          scores: responses,
          ratingScore: { percentageScore },
          comment,
          createdAt: new Date(),
          detailedQuestions, // Add this line
      });

      const facultyEvaluationRef = doc(db, "facultyEvaluations", facultyId);
      const facultyEvaluationDoc = await getDoc(facultyEvaluationRef);

        let newAverageScore;
        let completedEvaluations;

        if (facultyEvaluationDoc.exists()) {
          const existingAverageScore = facultyEvaluationDoc.data().averageScore || 0;
          completedEvaluations = (facultyEvaluationDoc.data().completedEvaluations || 0) + 1;
          newAverageScore = ((existingAverageScore * (completedEvaluations - 1)) + percentageScore) / completedEvaluations;
  
          await setDoc(
            facultyEvaluationRef,
            {
              averageScore: newAverageScore,
              completedEvaluations,
            },
            { merge: true }
          );
        } else {
          newAverageScore = percentageScore;
          completedEvaluations = 1;
  
          await setDoc(facultyEvaluationRef, {
            averageScore: newAverageScore,
            completedEvaluations,
            createdAt: new Date(),
            facultyId,
          });
        }
  
        alert(`Evaluation submitted successfully! Your score: ${totalScore} / ${maxScore} (${percentageScore.toFixed(2)}%)`);
        navigate(location.state?.redirectTo || "/dean-dashboard");
      } catch (error) {
        alert("Failed to submit evaluation. Please try again.");
        console.error("Error submitting evaluation:", error.message);
      }
    };
  
const renderQuestionsForCurrentCategory = () => {
  const currentCategory = categories[currentCategoryIndex];
  if (!currentCategory) {
    return <tr><td>No questions available for this category.</td></tr>;
  }

  const { type, questions, options, name } = currentCategory;

  if (!questions || questions.length === 0) {
    return <tr><td>No questions available for this category.</td></tr>;
  }


    return (
      <>
        <tr>
          <th>{name}: Question</th>
          {type === "Rating" && (
            <>
              <th>Strongly disagree</th>
              <th>Disagree</th>
              <th>Neutral</th>
              <th>Agree</th>
              <th>Strongly agree</th>
            </>
          )}
          {(type === "Multiple Choice" || type === "Checkbox") && options.map((option, index) => (
            <th key={index}>{option}</th>
          ))}
        </tr>

        {questions.map((question, questionIndex) => {
          const uniqueKey = `${currentCategoryIndex}-${questionIndex}`;
          return (
            <tr key={uniqueKey}>
              <td style={{ fontWeight: 'bold' }}>{question.text || "Invalid question text"}</td>
              {type === "Rating" &&
                [1, 2, 3, 4, 5].map((value) => (
                  <td key={value}>
                    <input
                      type="radio"
                      name={`question-${uniqueKey}`}
                      value={value}
                      checked={responses[uniqueKey] === String(value)}
                      onChange={(e) =>
                        handleResponseChange(currentCategoryIndex, questionIndex, e.target.value)
                      }
                    />
                  </td>
                ))}
              {(type === "Multiple Choice" || type === "Checkbox") &&
                options.map((option, optionIndex) => (
                  <td key={optionIndex}>
                    <input
                      type={type === "Multiple Choice" ? "radio" : "checkbox"}
                      name={`question-${uniqueKey}`}
                      value={option}
                      checked={
                        type === "Multiple Choice"
                          ? responses[uniqueKey] === option
                          : responses[uniqueKey]?.includes(option)
                      }
                      onChange={(e) =>
                        handleResponseChange(
                          currentCategoryIndex,
                          questionIndex,
                          e.target.value,
                          type === "Checkbox"
                        )
                      }
                    />
                  </td>
                ))}
            </tr>
          );
        })}
      </>
    );
  };

  if (loading) {
    return <p>Loading dean data...</p>;
  }

  if (error) {
    return <p>{error}</p>;
  }

  return (
    <div className="evaluate-faculty-page">
      <div className="header-container">
        <div className="form-header">
        <h1>Evaluate {faculty ? `${faculty.firstName} ${faculty.lastName}` : "Faculty"}</h1>
          <h2>Department: {faculty ? faculty.department : "No department available"}</h2>
          <div className="logo-container">
            <img src="/spc.png" alt="Logo" className="logo" />
          </div>
        </div>
      </div>
      <div className='raterlegend'>
      <h3>Rating Legend: 1 = Strongly Disagree, 5 = Strongly Agree</h3>
      </div>

      <div className="form-container">
        <form onSubmit={handleSubmit}>
          <div className="form-table-section">
            <table>
              <thead>{renderQuestionsForCurrentCategory()}</thead>
              <tbody></tbody>
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

export default EvaluateFaculty;
