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
  const [categories, setCategories] = useState([]);
  const [currentCategoryIndex, setCurrentCategoryIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [responses, setResponses] = useState({});
  const [comment, setComment] = useState("");
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

        if (!data.categories || !Array.isArray(data.categories)) {
          throw new Error("Invalid categories structure in Firestore.");
        }

        setCategories(data.categories);
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
    let totalScore = 0;
    let maxScore = 0;

    categories.forEach((category, categoryIndex) => {
      if (category.type === "Rating") {
        const { questions } = category;

        questions.forEach((_, questionIndex) => {
          const uniqueKey = `${categoryIndex}-${questionIndex}`;
          const response = responses[uniqueKey];

          totalScore += parseInt(response || 0, 10); // Add the rating value
          maxScore += 5; // Assuming 5 is the max rating for each question
        });
      }
    });

    const percentageScore = (totalScore / maxScore) * 100;
    return { totalScore, maxScore, percentageScore };
  };

  const calculateOptionFrequencies = () => {
    const frequencies = {};

    categories.forEach((category, categoryIndex) => {
      const { questions, type, options } = category;

      if (type === "Multiple Choice" || type === "Checkbox") {
        questions.forEach((question, questionIndex) => {
          const uniqueKey = `${categoryIndex}-${questionIndex}`;
          const response = responses[uniqueKey];

          // Initialize the frequency object for this question
          if (!frequencies[uniqueKey]) {
            frequencies[uniqueKey] = options.reduce((acc, option) => {
              acc[option] = 0;
              return acc;
            }, {});
          }

          // Count responses
          if (type === "Multiple Choice" && response) {
            frequencies[uniqueKey][response] += 1;
          } else if (type === "Checkbox" && Array.isArray(response)) {
            response.forEach((selectedOption) => {
              if (frequencies[uniqueKey][selectedOption] !== undefined) {
                frequencies[uniqueKey][selectedOption] += 1;
              }
            });
          }
        });
      }
    });

    return frequencies;
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
  
    // Use calculateRatingScore for score calculation
    const { totalScore, maxScore, percentageScore } = calculateRatingScore();
  
    // Use calculateOptionFrequencies for option frequency computation
    const optionFrequencies = calculateOptionFrequencies();
  
    try {
      // Save individual evaluation
      const evaluationRef = doc(
        db,
        `students/${user.uid}/subjects/${subjectId}/sections/${sectionId}/completed_evaluations`,
        user.uid
      );
  
      await setDoc(evaluationRef, {
        userId: user.uid,
        sectionId,
        subjectId,
        facultyId: subject?.facultyId || null, // Include facultyId
        scores: responses,
        ratingScore: { totalScore, maxScore, percentageScore },
        optionFrequencies,
        comment,
        createdAt: new Date(),
      });
  
      // Update or create subject evaluation score with facultyId
      const subjectEvaluationRef = doc(db, "subjectEvaluations", subjectId);
      const subjectEvaluationDoc = await getDoc(subjectEvaluationRef);
  
      let newAverageScore;
      let completedEvaluations;
  
      if (subjectEvaluationDoc.exists()) {
        const existingAverageScore = subjectEvaluationDoc.data().averageScore || 0;
        completedEvaluations = (subjectEvaluationDoc.data().completedEvaluations || 0) + 1;
        newAverageScore = ((existingAverageScore * (completedEvaluations - 1)) + percentageScore) / completedEvaluations;
  
        await setDoc(
          subjectEvaluationRef,
          {
            averageScore: newAverageScore,
            completedEvaluations,
            facultyId: subject?.facultyId || null, // Include facultyId in the subject evaluation document
          },
          { merge: true } // Use merge to prevent overwriting other fields
        );
      } else {
        newAverageScore = percentageScore;
        completedEvaluations = 1;
  
        await setDoc(subjectEvaluationRef, {
          averageScore: newAverageScore,
          completedEvaluations,
          facultyId: subject?.facultyId || null, // Include facultyId in the new document
        });
      }
  
      // Update faculty evaluation score if facultyId exists
      if (subject?.facultyId) {
        const facultyEvaluationRef = doc(db, "facultyEvaluations", subject.facultyId, "subjects", subjectId);
        const facultyEvaluationDoc = await getDoc(facultyEvaluationRef);
  
        let facultyNewAverageScore;
  
        if (facultyEvaluationDoc.exists()) {
          const existingFacultyAverageScore = facultyEvaluationDoc.data().averageScore || 0;
          const facultyCompletedEvaluations = (facultyEvaluationDoc.data().completedEvaluations || 0) + 1;
          facultyNewAverageScore = ((existingFacultyAverageScore * (facultyCompletedEvaluations - 1)) + percentageScore) / facultyCompletedEvaluations;
  
          await setDoc(
            facultyEvaluationRef,
            {
              averageScore: facultyNewAverageScore,
              completedEvaluations: facultyCompletedEvaluations,
            },
            { merge: true }
          );
        } else {
          facultyNewAverageScore = percentageScore;
  
          await setDoc(facultyEvaluationRef, {
            averageScore: facultyNewAverageScore,
            completedEvaluations: 1,
          });
        }
      }
  
      alert(`Evaluation submitted successfully! Your score: ${totalScore} / ${maxScore} (${percentageScore.toFixed(2)}%)`);
      navigate(location.state?.redirectTo || "/student-dashboard");
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

    const { type, questions, options } = currentCategory;

    if (!questions || questions.length === 0) {
      return <tr><td>No questions available for this category.</td></tr>;
    }

    return (
      <>
        <tr>
          <th>Question</th>
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
    return <p>Loading subject data...</p>;
  }

  if (error) {
    return <p>{error}</p>;
  }

  return (
    <div className="evaluate-subject-page">
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

export default EvaluateSubject;
