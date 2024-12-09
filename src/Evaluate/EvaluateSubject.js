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
    let totalScore = 0; // Sum of all responses
    let maxScore = 0; // Maximum possible score

    // Iterate through all categories
    categories.forEach((category, categoryIndex) => {
        if (category.type === "Rating") { // Only process 'Rating' type categories
            const { questions } = category;

            // For each question in the category
            questions.forEach((_, questionIndex) => {
                const uniqueKey = `${categoryIndex}-${questionIndex}`;
                const response = parseInt(responses[uniqueKey] || 0, 10);

                totalScore += response; // Add the response score
                maxScore += 5; // Increment max score by 5 (highest rating)
            });
        }
    });

    // Calculate percentage score
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

    // Ensure the subject and facultyId exist
    if (!subject || !subject.facultyId) {
        alert("Subject or Faculty information is missing.");
        return;
    }

    // Fetch the student's name
    let studentName = "Anonymous"; // Default if name not found
    try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
            const userData = userDoc.data();
            studentName = `${userData.firstName || ''} ${userData.lastName || ''}`.trim();
        }
    } catch (error) {
        console.error("Error fetching student name:", error);
    }

    // Fetch the subject's name
    let subjectName = subject.name || "Unknown Subject";

    // Calculate scores and option frequencies
    const { percentageScore } = calculateRatingScore();
    // Build detailed question-response data
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
      // Generate a unique ID for the evaluation to prevent overwriting
      const evaluationId = `${user.uid}_${new Date().getTime()}`;
      const evaluationRef = doc(db, `evaluations/${subject.facultyId}/students`, evaluationId);
  
      await setDoc(evaluationRef, {
          userId: user.uid,
          sectionId,
          subjectId,
          subjectName, // Include subject name
          facultyId: subject.facultyId, // Use facultyId from subject
          studentName, // Include student name
          ratingScore: { percentageScore }, // Include rating score
          comment, // Include comments
          createdAt: new Date(),
          detailedQuestions
      });
  
        // Update or create subject evaluation score with facultyId, studentName, and subjectName
        const subjectEvaluationRef = doc(db, "subjectEvaluations", subjectId);
        const subjectEvaluationDoc = await getDoc(subjectEvaluationRef);

        let newAverageScore;
        let completedEvaluations;

        if (subjectEvaluationDoc.exists()) {
            const existingAverageScore = subjectEvaluationDoc.data().averageScore || 0;
            completedEvaluations = (subjectEvaluationDoc.data().completedEvaluations || 0) + 1;
            newAverageScore =
                ((existingAverageScore * (completedEvaluations - 1)) + percentageScore) /
                completedEvaluations;

            await setDoc(
                subjectEvaluationRef,
                {
                    averageScore: newAverageScore,
                    completedEvaluations,
                    subjectName, // Include subject name
                    facultyId: subject.facultyId, // Use facultyId from subject
                },
                { merge: true }
            );
        } else {
            newAverageScore = percentageScore;
            completedEvaluations = 1;

            await setDoc(subjectEvaluationRef, {
                averageScore: newAverageScore,
                completedEvaluations,
                subjectName, // Include subject name
                facultyId: subject.facultyId, // Use facultyId from subject
                createdAt: new Date(), // Use createdAt for new document
            });
        }

        // Update faculty evaluation if applicable
        if (subject.facultyId) {
          const subjectEvaluationRef = doc(collection(db, "subjectDone", subjectId, "completed_evaluations"), user.uid);
          const subjectEvaluationDoc = await getDoc(subjectEvaluationRef);

          let newAverageScore;
          let completedEvaluations;

          if (subjectEvaluationDoc.exists()) {
            const existingAverageScore = subjectEvaluationDoc.data().averageScore || 0;
            completedEvaluations = (subjectEvaluationDoc.data().completedEvaluations || 0) + 1;
            newAverageScore =
                ((existingAverageScore * (completedEvaluations - 1)) + percentageScore) /
                completedEvaluations;

            await setDoc(
                subjectEvaluationRef,
                {
                    averageScore: newAverageScore,
                    completedEvaluations,
                    subjectName, // Include subject name
                    facultyId: subject.facultyId, // Use facultyId from subject
                },
                { merge: true }
            );
        }  else {
          newAverageScore = percentageScore;
          completedEvaluations = 1;

          await setDoc(subjectEvaluationRef, {
              averageScore: newAverageScore,
              completedEvaluations,
              subjectName, // Include subject name
              facultyId: subject.facultyId, // Use facultyId from subject
              createdAt: new Date(), // Use createdAt for new document
          });
      }
        }
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
      <div className='raterlegend'>
      <h3>Guidance Service Center | St. Peter's College Rating Scale:</h3>
      <h3>5 - Strongly Agree 4 - Agree 3 - Neutral 2 - Disagree 1 - Strongly Disagree</h3>
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
      <label>Please provide any additional comments, suggestions, or concerns you may have regarding the course or instructor. Your feedback is highly appreciated and will be used to enhance future course offerings.</label>
        <label>Additional Comments (Optional):</label>
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
