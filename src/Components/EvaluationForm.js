import React, { useState, useEffect } from "react";
import { getFirestore, doc, getDoc, addDoc, collection } from "firebase/firestore";
import { useParams } from "react-router-dom";
import { auth } from "../firebase";

const EvaluationForm = () => {
  const { studentId, subjectId } = useParams();
  const [responses, setResponses] = useState([]);
  const [questions, setQuestions] = useState([]);
  const db = getFirestore();

  useEffect(() => {
    const fetchEvaluationForm = async () => {
      try {
        const subjectRef = doc(db, `students/${studentId}/subjects`, subjectId);
        const subjectDoc = await getDoc(subjectRef);

        if (subjectDoc.exists()) {
          const { evaluationFormId } = subjectDoc.data();
          const evaluationDoc = await getDoc(doc(db, "evaluations", evaluationFormId));
          
          if (evaluationDoc.exists()) {
            setQuestions(evaluationDoc.data().questions);
          } else {
            console.error("Evaluation form not found.");
            alert("Evaluation form not found.");
          }
        } else {
          console.error("Subject not found.");
          alert("Subject not found.");
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };

    fetchEvaluationForm();
  }, [db, studentId, subjectId]);

  const handleResponseChange = (index, value) => {
    const updatedResponses = [...responses];
    updatedResponses[index] = value;
    setResponses(updatedResponses);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const totalScore = responses.reduce((sum, score) => sum + parseInt(score), 0);
    const maxScore = questions.length * 5;
    const percentageScore = (totalScore / maxScore) * 100;

    const user = auth.currentUser;
    if (user) {
      try {
        await addDoc(collection(db, `students/${studentId}/subjects/${subjectId}/completed_evaluations`), {
          userId: user.uid,
          subjectId,
          scores: responses,
          percentageScore,
        });

        alert("Evaluation submitted successfully!");
      } catch (error) {
        console.error("Error submitting evaluation:", error);
        alert("Failed to submit evaluation.");
      }
    } else {
      alert("User not authenticated.");
    }
  };

  return (
    <div>
      <h1>Evaluate Subject</h1>
      <form onSubmit={handleSubmit}>
        {questions.map((question, index) => (
          <div key={index}>
            <p>{question.text}</p>
            <select
              value={responses[index] || ""}
              onChange={(e) => handleResponseChange(index, e.target.value)}
              required
            >
              <option value="" disabled>Select an option</option>
              <option value="1">Strongly Agree</option>
              <option value="2">Agree</option>
            
              <option value="5">Strongly Disagree</option>
            </select>
          </div>
        ))}
        <button type="submit">Submit Evaluation</button>
      </form>
    </div>
  );
};

export default EvaluationForm;
