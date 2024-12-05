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
  const [questions, setQuestions] = useState([]);
  const [questionType, setQuestionType] = useState("");
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

  // Fetch evaluation form questions
  useEffect(() => {
    const fetchEvaluationForm = async () => {
      try {
        const evaluationFormRef = query(collection(db, "evaluationForms"));
        const snapshot = await getDocs(evaluationFormRef);

        if (!snapshot.empty) {
          const formDoc = snapshot.docs[0];
          const formData = formDoc.data();
          setQuestions(formData.categories[0].questions || []);
          setQuestionType(formData.categories[0].type || "");
          console.log("Question Type:", formData.categories[0].type);
        }
      } catch (error) {
        console.error("Error fetching evaluation form:", error);
      }
    };

    fetchEvaluationForm();
  }, [db]);

  // Fetch evaluations for a selected faculty
  const fetchEvaluations = async (facultyId) => {
    setLoading(true);
    setEvaluations([]);
    try {
      const evaluationsQuery = query(
        collection(db, "subjectEvaluations"),
        where("facultyId", "==", facultyId)
      );
      const evaluationsSnapshot = await getDocs(evaluationsQuery);

      if (evaluationsSnapshot.empty) {
        setEvaluations([]);
        setLoading(false);
        return;
      }

      const evaluationsData = evaluationsSnapshot.docs.map((doc) => {
        const evalData = doc.data();
        console.log("Evaluation Data:", evalData);
        return {
          subject: evalData.subjectName || "Unknown Subject",
          date: evalData.createdAt?.toDate().toLocaleDateString() || "Unknown Date",
          comment: evalData.comment || "No comment",
          studentName: evalData.studentName || "Anonymous",
          averageScore: evalData.averageScore || "N/A",
          answers: evalData.optionFrequencies || {},
        };
      });

      setEvaluations(evaluationsData);
      console.log("Evaluations Fetched:", evaluationsData);
    } catch (error) {
      setError("Failed to load evaluations data.");
      console.error("Error fetching evaluations:", error);
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
                    <th>Average Score</th> {/* Always include Average Score */}
                  </tr>
                </thead>
                <tbody>
                  {evaluations.map((evaluation, index) => (
                    <tr key={index}>
                      <td>{evaluation.studentName}</td>
                      <td>{evaluation.subject}</td>
                      <td>{evaluation.date}</td>
                      <td>{evaluation.comment}</td>
                      <td>{evaluation.averageScore}</td> {/* Render Average Score */}
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
