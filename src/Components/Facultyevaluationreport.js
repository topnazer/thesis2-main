import React, { useState, useEffect } from "react";
import {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import "./allevaluationreport.css";

const Facultyevaluationreport = () => {
  const [departments] = useState(["All", "CCS", "COC", "CED", "CASS", "COE", "CBA"]);
  const [selectedDepartment, setSelectedDepartment] = useState("All");
  const [faculty, setFaculty] = useState([]);
  const [selectedFaculty, setSelectedFaculty] = useState(null);
  const [evaluations, setEvaluations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEvaluation, setSelectedEvaluation] = useState(null);
  const [enrolledStudents, setEnrolledStudents] = useState([]);
const [completedEvaluationsCount, setCompletedEvaluationsCount] = useState(0);
const [evaluationProgress, setEvaluationProgress] = useState({});



  const [evaluationsCurrentPage, setEvaluationsCurrentPage] = useState(1);
  const itemsPerPage = 5; // Items per page for both deans and evaluations

  const db = getFirestore();

  const Modal = ({ isOpen, onClose, evaluation }) => {
    if (!isOpen) return null;
  
    // Debugging for detailed questions structure
    console.log("Evaluation Data:", evaluation);
  
    const groupedQuestions = evaluation?.categories?.map((category) => {
      const filteredQuestions =
        category.questions?.map((question) => ({
          text: question.text || "No Question Text",
          response:
            Array.isArray(question.response)
              ? question.response.join(", ") // For multiple responses
              : question.response || "No Response", // For single responses
          type: question.type || "Unknown Type",
        })) || [];
  
      return {
        categoryName: category?.categoryName || "Unnamed Category",
        questions: filteredQuestions,
      };
    }) || [];
  
    return (
      <div className="facmodal-overlay">
        <div className="facmodal-content">
          <button className="facmodal-close-btn" onClick={onClose}>
            Close
          </button>
          <h2>Questions and Responses</h2>
          {groupedQuestions.length > 0 ? (
            <div className="facmodal-details">
            <table>
              <thead>
                <tr>
                  <th>Category</th>
                  <th>Question</th>
                  <th>Response</th>
                </tr>
              </thead>
              <tbody>
                {groupedQuestions.map((group, groupIndex) => (
                  group.questions.map((question, questionIndex) => (
                    <tr key={`${groupIndex}-${questionIndex}`}>
                      {questionIndex === 0 && (
                        <td rowSpan={group.questions.length}>{group.categoryName}</td>
                      )}
                      <td>
                        <strong>Question {questionIndex + 1}:</strong> {question.text}
                      </td>
                      <td>{question.response}</td>
                    </tr>
                  ))
                ))}
              </tbody>
            </table>
          </div>
          ) : (
            <p>No questions or responses available.</p>
          )}
        </div>
      </div>
    );
  };
  // Fetch faculty based on department
  useEffect(() => {
    const fetchFacultyByDepartment = async () => {
      setLoading(true);
      setError(null);
      setSelectedFaculty(null);
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
        facultyList.forEach((faculty) => {
          fetchEvaluationProgressForFaculty(faculty.id);
        });
      } catch (error) {
        setError("Failed to load faculty data.");
        console.error("Error fetching faculty data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchFacultyByDepartment();
  }, [selectedDepartment, db]);

  const fetchEvaluationProgressForFaculty = async (facultyId) => {
    try {
      // Fetch enrolled students
      const subjectsQuery = query(
        collection(db, "subjects"),
        where("facultyId", "==", facultyId)
      );
      const subjectsSnapshot = await getDocs(subjectsQuery);
  
      let enrolledStudentsList = [];
      for (const subjectDoc of subjectsSnapshot.docs) {
        const subjectId = subjectDoc.id;
        const enrolledStudentsRef = collection(db, `subjects/${subjectId}/enrolledStudents`);
        const enrolledStudentsSnapshot = await getDocs(enrolledStudentsRef);
  
        enrolledStudentsList.push(
          ...enrolledStudentsSnapshot.docs.map((doc) => ({
            id: doc.id,
            subjectId,
            ...doc.data(),
          }))
        );
      }
  
      // Fetch completed evaluations
      const evaluationsRef = collection(db, `evaluations/${facultyId}/students`);
      const evaluationsSnapshot = await getDocs(evaluationsRef);
  
      const completedCount = evaluationsSnapshot.docs.length;
      const enrolledCount = enrolledStudentsList.length;
      const percentage = enrolledCount === 0 ? 0 : ((completedCount / enrolledCount) * 100).toFixed(2);
  
      // Update progress for this faculty
      setEvaluationProgress((prev) => ({
        ...prev,
        [facultyId]: percentage,
      }));
    } catch (error) {
      console.error("Error fetching evaluation progress for faculty:", error);
    }
  };
  

  const fetchEnrolledStudentsForFaculty = async (facultyId) => {
    try {
      const subjectsQuery = query(
        collection(db, "subjects"),
        where("facultyId", "==", facultyId)
      );
      const subjectsSnapshot = await getDocs(subjectsQuery);
  
      let enrolledStudentsList = [];
  
      for (const subjectDoc of subjectsSnapshot.docs) {
        const subjectId = subjectDoc.id;
        const enrolledStudentsRef = collection(db, `subjects/${subjectId}/enrolledStudents`);
        const enrolledStudentsSnapshot = await getDocs(enrolledStudentsRef);
  
        enrolledStudentsList.push(
          ...enrolledStudentsSnapshot.docs.map((doc) => ({
            id: doc.id,
            subjectId,
            ...doc.data(),
          }))
        );
      }
  
      setEnrolledStudents(enrolledStudentsList);
    } catch (error) {
      console.error("Error fetching enrolled students for faculty:", error);
      setEnrolledStudents([]);
    }
  };
  
  const fetchCompletedEvaluationsForFaculty = async (facultyId) => {
    try {
      const evaluationsRef = collection(db, `evaluations/${facultyId}/students`);
      const evaluationsSnapshot = await getDocs(evaluationsRef);
  
      setCompletedEvaluationsCount(evaluationsSnapshot.docs.length);
    } catch (error) {
      console.error("Error fetching completed evaluations:", error);
      setCompletedEvaluationsCount(0);
    }
  };
  const calculateEvaluationCompletionPercentage = () => {
    if (enrolledStudents.length === 0) return 0;
    return ((completedEvaluationsCount / enrolledStudents.length) * 100).toFixed(2);
  };
  

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

     
      let categories = [];

      if (data.detailedQuestions && Array.isArray(data.detailedQuestions)) {
        categories = data.detailedQuestions.map((category) => {
          const { categoryName, questions } = category;

          const questionsList = questions.map((question) => ({
            text: question.text || "No Question",
            response:
              Array.isArray(question.response) && question.response.length > 0
                ? question.response.join(", ")
                : question.response || "No Response",
          }));

          return {
            categoryName: categoryName || "Unknown Category",
            questions: questionsList,
          };
        });
      }

      return {
        studentId: doc.id,
        studentName: data.studentName || "Unknown Student",
        subjectName: data.subjectName || "Unknown Subject",
        comment: data.comment || "No Comment",
        subjectId: data.subjectId || "Unknown ID",
        percentageScore,
        date,
        categories,
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

const handleFacultyClick = async (facultyMember) => {
  setSelectedFaculty(facultyMember);
  fetchEvaluations(facultyMember.id); // This function doesn't use `await`
  await fetchEnrolledStudentsForFaculty(facultyMember.id);
  await fetchCompletedEvaluationsForFaculty(facultyMember.id);
};


  const paginate = (items, currentPage) => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return items.slice(startIndex, startIndex + itemsPerPage);
  };

  const displayedEvaluations = paginate(evaluations, evaluationsCurrentPage);

  const totalPages = (items) => Math.ceil(items.length / itemsPerPage);

  const handlePageChange = (setCurrentPage, direction, items) => {
    setCurrentPage((prev) => {
      const newPage = direction === "next" ? prev + 1 : prev - 1;
      return Math.max(1, Math.min(newPage, totalPages(items)));
    });
  };

  const openModal = (evaluation) => {
    setSelectedEvaluation(evaluation);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedEvaluation(null);
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
                    <p>
                    Evaluate Completed: {evaluationProgress[member.id] || "0.00"}%
</p>

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
            ) : displayedEvaluations.length > 0 ? (
              <>
            <table className="facevaluations-table">
  <thead>
    <tr>
      <th>Student Name</th>
      <th>Subject</th>
      <th>Date</th>
      <th>Comment</th>
      <th>Percentage Score</th>
      <th>Actions</th>
    </tr>
  </thead>
  <tbody>
    {displayedEvaluations.map((evaluation, index) => (
      <tr key={index}>
        <td>{evaluation.studentName}</td>
        <td>
          {evaluation.subjectName} <br />
          <small>Offer number: {evaluation.subjectId}</small>
        </td>
        <td>{evaluation.date}</td>
        <td>
          <div className="scrollablesapage">{evaluation.comment}</div>
        </td>
        <td>{evaluation.percentageScore}</td>
        <td>
          <button className="show-more-btn" onClick={() => openModal(evaluation)}>
            Show More
          </button>
        </td>
      </tr>
    ))}
  </tbody>
</table>

              <div className="paginationreport">
                  <button
                    disabled={evaluationsCurrentPage === 1}
                    onClick={() =>
                      handlePageChange(setEvaluationsCurrentPage, "prev", evaluations)
                    }
                  >
                    Previous
                  </button>
                  <span>
                    Page {evaluationsCurrentPage} of {totalPages(evaluations)}
                  </span>
                  <button
                    disabled={evaluationsCurrentPage === totalPages(evaluations)}
                    onClick={() =>
                      handlePageChange(setEvaluationsCurrentPage, "next", evaluations)
                    }
                  >
                    Next
                  </button>
                </div>
              </>
            ) : (
              <p>No evaluations found for this faculty.</p>
            )}
          </>
        )}
        <Modal
          isOpen={isModalOpen}
          onClose={closeModal}
          evaluation={selectedEvaluation}
        />
      </div>
    </div>
  );
};

export default Facultyevaluationreport;