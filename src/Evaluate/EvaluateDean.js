import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { getFirestore, doc, getDoc, setDoc, collection } from 'firebase/firestore';
import { auth } from '../firebase';
import './Evaluate.css';

const EvaluateDean = () => {
  const { deanId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [dean, setDean] = useState(null);
  const [categories, setCategories] = useState([]);
  const [currentCategoryIndex, setCurrentCategoryIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [responses, setResponses] = useState({});
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
      const evaluationDoc = await getDoc(doc(db, 'evaluationForms', 'dean'));
      if (evaluationDoc.exists()) {
        const data = evaluationDoc.data();

        if (!data.categories || !Array.isArray(data.categories)) {
          throw new Error("Invalid categories structure in Firestore.");
        }

        setCategories(data.categories);
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

  const calculateRatingScore = () => {
    let totalScore = 0; // Total sum of all responses
    let maxScore = 0; // Maximum possible score

    // Loop through each category
    categories.forEach((category, categoryIndex) => {
        if (category.type === "Rating") { // Only process categories of type 'Rating'
            const { questions } = category;

            // Loop through each question in the category
            questions.forEach((_, questionIndex) => {
                const uniqueKey = `${categoryIndex}-${questionIndex}`;
                const response = responses[uniqueKey];

                // Parse the response and add it to the total score
                totalScore += parseInt(response || 0, 10);

                // Increment maxScore by 5 for each question
                maxScore += 5;
            });
        }
    });

    // Calculate the percentage score
    const percentageScore = maxScore > 0 ? (totalScore / maxScore) * 100 : 0;

    // Return the scores and percentage
    return { totalScore, maxScore, percentageScore };
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

    const user = auth.currentUser;
    if (!user) {
      alert("User not authenticated.");
      return;
    }

    const { totalScore, maxScore, percentageScore } = calculateRatingScore();
    const detailedQuestions = categories.map((category, categoryIndex) => ({
      categoryName: category.name,
      type: category.type, // Include category type
      questions: category.questions.map((question, questionIndex) => {
          const uniqueKey = `${categoryIndex}-${questionIndex}`;
          return {
              text: question.text, // Include the question text
              type: category.type, // Include the question type
              response: responses[uniqueKey] || (category.type === "Checkbox" ? [] : "N/A"), // Add response
              options: category.options || [], // Include available options for the question
          };
      }),
  }));

  

  try {
    const userDoc = await getDoc(doc(db, "users", user.uid));
    if (!userDoc.exists()) {
      alert("Evaluator information is missing.");
      return;
    }
    const evaluatorData = userDoc.data();
    const evaluatorName = `${evaluatorData.firstName || "Unknown"} ${evaluatorData.lastName || "User"}`;
    // Save individual evaluation
    const evaluationRef = doc(collection(db, "deanEvaluations", deanId, "completed_evaluations"), user.uid);

    await setDoc(evaluationRef, {
      userId: user.uid,
      deanId,
      Evaluator: evaluatorName,
      ratingScore: { totalScore, maxScore, percentageScore },
      comment,
      percentageScore,
      createdAt: new Date(),
      detailedQuestions, 
    });

      const deanEvaluationRef = doc(db, "deanEvaluations", deanId);
      const deanEvaluationDoc = await getDoc(deanEvaluationRef);

      let newAverageScore;
      let completedEvaluations;

      if (deanEvaluationDoc.exists()) {
        const existingAverageScore = deanEvaluationDoc.data().averageScore || 0;
        completedEvaluations = (deanEvaluationDoc.data().completedEvaluations || 0) + 1;
        newAverageScore = ((existingAverageScore * (completedEvaluations - 1)) + percentageScore) / completedEvaluations;

        await setDoc(
          deanEvaluationRef,
          {
            averageScore: newAverageScore,
            completedEvaluations,
          },
          { merge: true }
        );
      } else {
        newAverageScore = percentageScore;
        completedEvaluations = 1;

        await setDoc(deanEvaluationRef, {
          averageScore: newAverageScore,
          completedEvaluations,
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
    <div className="evaluate-dean-page evaluation-form">
      <div className="header-container">
        <div className="form-header">
          <h1>Evaluate {dean ? `${dean.firstName} ${dean.lastName}` : "Dean"}</h1>
          <h2>Department: {dean ? dean.department : "No department available"}</h2>
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
          placeholder="Enter your comments about the dean here"
        />
      </div>
    </div>
  );
};

export default EvaluateDean;
