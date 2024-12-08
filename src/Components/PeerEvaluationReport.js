import React, { useState, useEffect } from "react";
import {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import "./allevaluationreport.css";

const PeerEvaluationReport = () => {
  const [departments] = useState(["All", "CCS", "COC", "CED", "CASS", "COE", "CBA"]);
  const [selectedDepartment, setSelectedDepartment] = useState("All");
  const [faculty, setFaculty] = useState([]);
  const [selectedFaculty, setSelectedFaculty] = useState(null);
  const [evaluations, setEvaluations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEvaluation, setSelectedEvaluation] = useState(null);
  const [evaluationsCurrentPage, setEvaluationsCurrentPage] = useState(1);
  const itemsPerPage = 5; // Items per page for both deans and evaluations
  const db = getFirestore();

  const Modal = ({ isOpen, onClose, evaluation }) => {
    if (!isOpen) return null;

    const groupedQuestions =
      evaluation?.categories?.map((category) => {
        const filteredQuestions =
          category.questions?.map((question) => ({
            text: question.text || "No Question Text",
            response:
              Array.isArray(question.response)
                ? question.response.join(", ")
                : question.response || "No Response",
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
              {groupedQuestions.map((group, groupIndex) => (
                <div key={groupIndex}>
                  <h3>{group.categoryName}</h3>
                  {group.questions.map((question, questionIndex) => (
                    <div key={questionIndex} className="question-response">
                      <p>
                        <strong>Question {questionIndex + 1}:</strong> {question.text}
                      </p>
                      <p>
                        <strong>Response:</strong> {question.response}
                      </p>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          ) : (
            <p>No questions or responses available.</p>
          )}
        </div>
      </div>
    );
  };

  // Fetch faculty by department
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
        const facultyList = facultySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
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
  const fetchEvaluations = async (facultyId, facultyName) => {
    setLoading(true);
    setEvaluations([]);
    setError(null);
    try {
      const evaluationsRef = collection(
        db,
        `facultyEvaluations/${facultyId}/completed_evaluations`
      );
      const evaluationsSnapshot = await getDocs(evaluationsRef);
  
      if (evaluationsSnapshot.empty) {
        setEvaluations([]);
        return;
      }
  
      const evaluationsList = evaluationsSnapshot.docs.map((doc) => {
        const data = doc.data();
  
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
          facultyName: data.facultyName || "Unknown Faculty", // Extract facultyName
          comment: data.comment || "No Comment",
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
  

  const handleFacultyClick = (facultyMember) => {
    setSelectedFaculty(facultyMember);
    fetchEvaluations(facultyMember.id, `${facultyMember.firstName} ${facultyMember.lastName}`);
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
                  <th>Faculty Name</th> {/* Column for Faculty Name */}
                  <th>Date</th>
                  <th>Comment</th>
                  <th>Percentage Score</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {evaluations.map((evaluation, index) => (
                  <tr key={index}>
                    <td>{evaluation.facultyName}</td> {/* Display Faculty Name */}
                    <td>{evaluation.date}</td>
                    <td> <div className="scrollablesapage">{evaluation.comment}</div></td>
                    <td>{evaluation.percentageScore}</td>
                    <td>
                      <button
                        className="show-more-btn"
                        onClick={() => openModal(evaluation)}
                      >
                        Show More
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="pagination">
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

export default PeerEvaluationReport;
