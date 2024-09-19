import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom'; 
import { getFirestore, doc, getDoc, setDoc, collection, getDocs } from 'firebase/firestore';
import { auth } from "../firebase";
import './Evaluate.css'; // Add the new CSS file

const EvaluateSubject = () => {
  const { subjectId, sectionId } = useParams(); // Make sure sectionId is part of the route params
  console.log('Subject ID:', subjectId);
console.log('Section ID:', sectionId);
  const navigate = useNavigate(); 
  const location = useLocation(); 
  const [subject, setSubject] = useState(null);
  const [faculty, setFaculty] = useState(null);
  const [evaluationForm, setEvaluationForm] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [responses, setResponses] = useState([]);
  const [comment, setComment] = useState(""); 
  const db = getFirestore();

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

  const fetchEvaluationForm = useCallback(async () => {
    try {
      const evaluationDoc = await getDoc(doc(db, "evaluationForms", subjectId));
      if (evaluationDoc.exists()) {
        const questionsWithWeights = evaluationDoc.data().questions.map(q => ({
          ...q,
          weight: q.weight || 1, // Ensure each question has a weight, default to 1
        }));
        setEvaluationForm(questionsWithWeights);
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

  const handleResponseChange = (index, value) => {
    const updatedResponses = [...responses];
    updatedResponses[index] = value;
    setResponses(updatedResponses);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    let totalWeightedScore = 0;
    let maxWeightedScore = 0;
  
    // Log the responses and evaluation form for debugging
    console.log('Responses:', responses);
    console.log('Evaluation Form:', evaluationForm);
    
    // Calculate total weighted score for this student's responses
    responses.forEach((response, index) => {
      const questionWeight = evaluationForm[index]?.weight || 1; // Default weight is 1
      totalWeightedScore += parseInt(response) * questionWeight;
      maxWeightedScore += 5 * questionWeight; // Max score per question is 5
    });
  
    const percentageScore = (totalWeightedScore / maxWeightedScore) * 100;
  
    const user = auth.currentUser;
    if (!user) {
      alert("User not authenticated.");
      return;
    }
  
    // Log important values for debugging
    console.log('User ID:', user.uid);
    console.log('Section ID:', sectionId);
    console.log('Subject ID:', subjectId);
    console.log('Faculty ID:', subject?.facultyId);
    console.log('Percentage Score:', percentageScore);
    console.log('Comment:', comment);
  
    try {
      // Store the individual evaluation for this student in the section
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
  
      // Fetch all completed evaluations for this section
      const sectionEvaluationsSnapshot = await getDocs(
        collection(db, `subjects/${subjectId}/sections/${sectionId}/completed_evaluations`)
      );
  
      let totalSectionScore = 0;
      let totalSectionEvaluations = 0;
  
      // Calculate section average score
      sectionEvaluationsSnapshot.forEach((doc) => {
        const data = doc.data();
        totalSectionScore += data.percentageScore;
        totalSectionEvaluations += 1;
      });
  
      const sectionAverageScore = totalSectionScore / totalSectionEvaluations;
  
      // Save the average score for the section
      const sectionRef = doc(db, `subjects/${subjectId}/sections`, sectionId);
      await setDoc(sectionRef, {
        sectionAverageScore: sectionAverageScore,
        totalEvaluations: totalSectionEvaluations,
      }, { merge: true });
  
      // Fetch all sections for the subject
      const sectionsSnapshot = await getDocs(collection(db, `subjects/${subjectId}/sections`));
  
      let totalSubjectScore = 0;
      let totalSubjectEvaluations = 0;
  
      // Calculate overall subject score across all sections
      sectionsSnapshot.forEach((sectionDoc) => {
        const sectionData = sectionDoc.data();
        totalSubjectScore += sectionData.sectionAverageScore * sectionData.totalEvaluations;
        totalSubjectEvaluations += sectionData.totalEvaluations;
      });
  
      // Calculate overall average score for the entire subject
      const overallSubjectScore = totalSubjectScore / totalSubjectEvaluations;
  
      // Save the overall subject average score
      const subjectRef = doc(db, "subjects", subjectId);
      await setDoc(subjectRef, {
        overallAverageScore: overallSubjectScore,
        totalEvaluations: totalSubjectEvaluations,
      }, { merge: true });
  
      alert("Evaluation submitted successfully!");
      navigate(location.state?.redirectTo || "/student-dashboard");
    } catch (error) {
      alert("Failed to submit evaluation. Please try again.");
      // Add detailed error logging
      console.error("Error submitting evaluation:", error.message);
      console.log("Error stack trace:", error.stack);
    }
  };
  
  

  if (loading) {
    return <p>Loading subject data...</p>;
  }

  if (error) {
    return <p>{error}</p>;
  }

  return (
    <div className="evaluate-subject-page evaluation-form">
      <h1>Evaluate {subject.name}</h1>
      <h2>Faculty: {faculty ? `${faculty.firstName} ${faculty.lastName}` : "No faculty assigned"}</h2>
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
            placeholder="Enter your comments about the subject here"
          />
        </div>
        <button type="submit">Submit Evaluation</button>
      </form>
    </div>
  );
};

export default EvaluateSubject;
