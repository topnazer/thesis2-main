import React, { useEffect, useState } from "react";
import { getFirestore, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { auth } from "../firebase";
import { useNavigate } from "react-router-dom";
 
const SubjectEvaluationReport = () => {
  const [evaluationData, setEvaluationData] = useState([]);
  const [studentName, setStudentName] = useState("");
  const [subjectName, setSubjectName] = useState("");
  const [facultyName, setFacultyName] = useState("");
  const [loading, setLoading] = useState(true);

  const db = getFirestore();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const user = auth.currentUser;

        if (user) {
          // Fetch user information
          const userDoc = await getDoc(doc(db, "users", user.uid));
          const userData = userDoc.data();
          setStudentName(`${userData.firstName} ${userData.lastName}`);

          // Fetch subject and faculty details from a specific evaluation
          const evaluationsRef = collection(db, `students/${user.uid}/evaluations`);
          const evaluationsQuery = query(evaluationsRef, where("studentId", "==", user.uid));
          const querySnapshot = await getDocs(evaluationsQuery);

          const evaluations = [];
          for (const doc of querySnapshot.docs) {
            const evaluation = doc.data();
            evaluations.push(evaluation);

            // Fetch subject and faculty information for each evaluation
            const subjectRef = doc(db, "subjects", evaluation.subjectId);
            const subjectDoc = await getDoc(subjectRef);
            setSubjectName(subjectDoc.exists() ? subjectDoc.data().name : "No subject found");

            const facultyRef = doc(db, "users", evaluation.facultyId);
            const facultyDoc = await getDoc(facultyRef);
            setFacultyName(facultyDoc.exists() ? `${facultyDoc.data().firstName} ${facultyDoc.data().lastName}` : "No faculty found");
          }

          setEvaluationData(evaluations);
        }
      } catch (error) {
        console.error("Error fetching evaluation data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [db]);

  return (
    <div className="evaluation-report">
      <nav>
        <h1>Subject Evaluation Report</h1>
      </nav>
      
      {loading ? (
        <p>Loading evaluation data...</p>
      ) : (
        <section>
          <h2>Evaluation for {studentName}</h2>
          <p>Subject: {subjectName}</p>
          <p>Faculty: {facultyName}</p>

          {evaluationData.length > 0 ? (
            <table>
              <thead>
                <tr>
                  <th>Category</th>
                  <th>Question</th>
                  <th>Response</th>
                </tr>
              </thead>
              <tbody>
                {evaluationData.map((evaluation, index) => (
                  <tr key={index}>
                    <td>{evaluation.category}</td>
                    {evaluation.questions.map((question, qIndex) => (
                      <tr key={qIndex}>
                        <td>{question.category}</td>
                        <td>{question.questionText}</td>
                        <td>{question.response || "No response"}</td>
                      </tr>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p>No evaluation data found.</p>
          )}
        </section>
      )}
    </div>
  );
};

export default SubjectEvaluationReport;
