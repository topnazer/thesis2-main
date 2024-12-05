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
  const fetchEvaluations = async (facultyId) => {
    setLoading(true);
    setEvaluations([]);
    try {
      console.log("Fetching evaluations for facultyId:", facultyId);
  
      // Fetch all students
      const studentsQuery = query(collection(db, "students"));
      const studentsSnapshot = await getDocs(studentsQuery);
  
      if (studentsSnapshot.empty) {
        console.log("No students found in the database.");
        setEvaluations([]);
        setLoading(false);
        return;
      }
  
      console.log(`Found ${studentsSnapshot.size} students.`); // Log number of students
  
      let allEvaluations = [];
  
      // Iterate through each student document
      for (const studentDoc of studentsSnapshot.docs) {
        const studentId = studentDoc.id;
        const studentData = studentDoc.data();
        console.log(`Processing student: ${studentId}`, studentData);
  
        // Fetch the student's subjects
        const subjectsRef = collection(studentDoc.ref, "subjects");
        const subjectsSnapshot = await getDocs(subjectsRef);
  
        if (subjectsSnapshot.empty) {
          console.log(`No subjects found for studentId: ${studentId}`);
          continue; // Skip to next student if no subjects are found
        }
  
        console.log(`Found ${subjectsSnapshot.size} subjects for studentId: ${studentId}`);
  
        for (const subjectDoc of subjectsSnapshot.docs) {
          const subjectId = subjectDoc.id;
          const subjectData = subjectDoc.data();
          console.log(`Processing subject: ${subjectId}`, subjectData);
  
          // Check if the subject's faculty matches the selected faculty
          if (subjectData.facultyId !== facultyId) {
            console.log(`Faculty ID mismatch for subject: ${subjectId}`);
            continue;
          }
  
          console.log(`Faculty match found for subject: ${subjectData.name}`);
  
          // Fetch evaluations directly from `completed_evaluations`
          const evaluationsRef = collection(
            db,
            `students/${studentId}/subjects/${subjectId}/completed_evaluations`
          );
          const evaluationsSnapshot = await getDocs(evaluationsRef);
  
          if (evaluationsSnapshot.empty) {
            console.log(
              `No completed evaluations found for subject: ${subjectId}`
            );
            continue; // Skip to next subject if no evaluations are found
          }
  
          console.log(
            `Found ${evaluationsSnapshot.size} evaluations for subject: ${subjectId}`
          );
  
          for (const evaluationDoc of evaluationsSnapshot.docs) {
            const evalData = evaluationDoc.data();
            console.log(`Processing evaluation:`, evalData);
  
            // Combine the data
            allEvaluations.push({
              studentId,
              studentName: studentData.name || "Unknown Student",
              subjectName: subjectData.name || "Unknown Subject",
              comment: evalData.comment || "No comment",
              percentageScore: evalData.scores?.percentageScore || "N/A",
              date: evalData.createdAt?.toDate().toLocaleDateString() || "Unknown Date",
            });
          }
        }
      }
  
      if (allEvaluations.length === 0) {
        console.log("No evaluations matched the criteria.");
      }
  
      // Update state with all evaluations
      setEvaluations(allEvaluations);
      console.log("Evaluations Fetched:", allEvaluations);
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
                    <th>Percentage Score</th>
                  </tr>
                </thead>
                <tbody>
                  {evaluations.map((evaluation, index) => (
                    <tr key={index}>
                      <td>{evaluation.studentName}</td>
                      <td>{evaluation.subjectName}</td>
                      <td>{evaluation.date}</td>
                      <td>{evaluation.comment}</td>
                      <td>{evaluation.percentageScore}</td>
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
