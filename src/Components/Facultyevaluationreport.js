import React, { useState, useEffect } from "react";
import {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import "./facultyevaluationreport.css";

const Facultyevaluationreport = () => {
  const [departments] = useState(["All", "CCS", "COC", "CED", "CASS", "COE", "CBA"]);
  const [selectedDepartment, setSelectedDepartment] = useState("All");
  const [faculty, setFaculty] = useState([]);
  const [selectedFaculty, setSelectedFaculty] = useState(null);
  const [evaluations, setEvaluations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const db = getFirestore();

  // Fetch faculty based on department
  useEffect(() => {
    const fetchFacultyByDepartment = async () => {
      setLoading(true);
      setError(null);
      try {
        let facultyQuery;
        if (selectedDepartment === "All") {
          facultyQuery = query(collection(db, "users"), where("role", "==", "Faculty"));
        } else {
          facultyQuery = query(
            collection(db, "users"),
            where("role", "==", "Faculty"),
            where("department", "==", selectedDepartment)
          );
        }

        const facultySnapshot = await getDocs(facultyQuery);
        const facultyList = facultySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        setFaculty(facultyList);
      } catch (error) {
        setError("Failed to load faculty data.");
        console.error("Error fetching faculty data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchFacultyByDepartment();
  }, [selectedDepartment, db]);

  // Fetch evaluations for a specific faculty
  const fetchEvaluations = async (facultyId) => {
    setLoading(true);
    setEvaluations([]);
    setError(null);
    try {
      const evaluationsRef = collection(db, `evaluations/${facultyId}/students`);
      const evaluationsSnapshot = await getDocs(evaluationsRef);

      if (evaluationsSnapshot.empty) {
        setEvaluations([]);
        return;
      }

      // Map evaluation data
      const evaluationsList = evaluationsSnapshot.docs.map((doc) => {
        const data = doc.data();

        // Extract createdAt date if available
        const date =
          data.createdAt && data.createdAt.toDate
            ? data.createdAt.toDate().toLocaleDateString()
            : "Unknown Date";

        const percentageScore =
          data.ratingScore && data.ratingScore.percentageScore !== undefined
            ? `${data.ratingScore.percentageScore}%`
            : "N/A";

        // Collect all questions and responses
        let questionTextArray = [];
        let responseArray = [];

        if (data.detailedQuestions && Array.isArray(data.detailedQuestions)) {
          data.detailedQuestions.forEach((category) => {
            const { questions } = category;

            if (Array.isArray(questions)) {
              questions.forEach((question) => {
                questionTextArray.push(question.text || "No Question");
                responseArray.push(
                  Array.isArray(question.response) && question.response.length > 0
                    ? question.response.join(", ")
                    : question.response || "No Response"
                );
              });
            }
          });
        }

        return {
          studentId: doc.id,
          studentName: data.studentName || "Unknown Student",
          subjectName: data.subjectName || "Unknown Subject",
          comment: data.comment || "No Comment",
          percentageScore,
          date,
          questionTextArray,
          responseArray,
        };
      });

      setEvaluations(evaluationsList);
    } catch (error) {
      console.error("Error fetching evaluations:", error);
      setError("Failed to load evaluations data.");
    } finally {
      setLoading(false);
    }
  };

  const handleFacultyClick = (facultyMember) => {
    setSelectedFaculty(facultyMember);
    fetchEvaluations(facultyMember.id);
  };

  return (
    <div className="facuser-page-container">
      <div className="facuser-page-left">
        <div className="facuser-list">
          <div className="facuser-button">
            {departments.map((dept) => (
              <button
                key={dept}
                onClick={() => setSelectedDepartment(dept)}
                className={selectedDepartment === dept ? "active-department" : ""}
              >
                {dept}
              </button>
            ))}
          </div>
          {loading && <p>Loading...</p>}
          {error && <p>{error}</p>}
          {!loading && !error && faculty.length > 0 && (
            <div className="facuser-card">
              {faculty.map((member) => (
                <div
                  key={member.id}
                  className="facuser-item"
                  onClick={() => handleFacultyClick(member)}
                >
                  <div className="facuser-info">
                    <strong>
                      {member.firstName} {member.lastName}
                    </strong>
                    <p>Email: {member.email}</p>
                    <p>Department: {member.department}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="facuser-page-right">
        {selectedFaculty && (
          <>
            <h2>
              Evaluations for {selectedFaculty.firstName} {selectedFaculty.lastName}
            </h2>
            {loading ? (
              <p>Loading evaluations...</p>
            ) : evaluations.length > 0 ? (
              <table className="evaluations-table">
                <thead>
                  <tr>
                    <th>Student Name</th>
                    <th>Subject</th>
                    <th>Date</th>
                    <th>Comment</th>
                    <th>Percentage Score</th>
                    {/* Dynamically generate columns for questions */}
                    {evaluations[0].questionTextArray.map((_, index) => (
                      <th key={`question-${index}`}>Question {index + 1}</th>
                    ))}
                    {/* Dynamically generate columns for responses */}
                    {evaluations[0].responseArray.map((_, index) => (
                      <th key={`response-${index}`}>Response {index + 1}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {evaluations.map((evaluation, index) => (
                    <tr key={index}>
                      <td>{evaluation.studentName}</td>
                      <td>{evaluation.subjectName}</td>
                      <td>{evaluation.date}</td>
                      <td>
                        <div className="scrollablesapage">{evaluation.comment}</div>
                      </td>
                      <td>{evaluation.percentageScore}</td>
                      {/* Render questions dynamically */}
                      {evaluation.questionTextArray.map((question, qIndex) => (
                        <td key={`question-row-${qIndex}`}>{question}</td>
                      ))}
                      {/* Render responses dynamically */}
                      {evaluation.responseArray.map((response, rIndex) => (
                        <td key={`response-row-${rIndex}`}>{response}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p>No evaluations found for this faculty.</p>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Facultyevaluationreport;
