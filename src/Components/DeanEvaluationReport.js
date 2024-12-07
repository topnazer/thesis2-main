import React, { useState, useEffect } from "react";
import {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import "./allevaluationreport.css";

const DeanEvaluationReport = () => {
  const [departments] = useState(["All", "CCS", "COC", "CED", "CASS", "COE", "CBA"]);
  const [selectedDepartment, setSelectedDepartment] = useState("All");
  const [deans, setDeans] = useState([]);
  const [selectedDean, setSelectedDean] = useState(null);
  const [evaluations, setEvaluations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEvaluation, setSelectedEvaluation] = useState(null);
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

  // Fetch deans by department
  useEffect(() => {
    const fetchDeansByDepartment = async () => {
      setLoading(true);
      setError(null);
      try {
        let deanQuery;
        if (selectedDepartment === "All") {
          deanQuery = query(collection(db, "users"), where("role", "==", "Dean"));
        } else {
          deanQuery = query(
            collection(db, "users"),
            where("role", "==", "Dean"),
            where("department", "==", selectedDepartment)
          );
        }

        const deanSnapshot = await getDocs(deanQuery);
        const deanList = deanSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setDeans(deanList);
      } catch (error) {
        setError("Failed to load dean data.");
        console.error("Error fetching dean data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDeansByDepartment();
  }, [selectedDepartment, db]);

  // Fetch evaluations for a specific dean
  const fetchEvaluations = async (deanId, deanName) => {
    setLoading(true);
    setEvaluations([]);
    setError(null);
    try {
      const evaluationsRef = collection(
        db,
        `deanEvaluations/${deanId}/completed_evaluations`
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
          deanName,
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

  const handleDeanClick = (deanMember) => {
    setSelectedDean(deanMember);
    fetchEvaluations(deanMember.id, `${deanMember.firstName} ${deanMember.lastName}`);
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
          {!loading && !error && deans.length > 0 && (
            <div className="facuser-card">
              {deans.map((member) => (
                <div
                  key={member.id}
                  className="facuser-item"
                  onClick={() => handleDeanClick(member)}
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
        {selectedDean && (
          <>
            <h2>
              Evaluations for {selectedDean.firstName} {selectedDean.lastName}
            </h2>
            {loading ? (
              <p>Loading evaluations...</p>
            ) : evaluations.length > 0 ? (
              <table className="facevaluations-table">
                <thead>
                  <tr>
                    <th>Dean Name</th>
                    <th>Date</th>
                    <th>Comment</th>
                    <th>Percentage Score</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {evaluations.map((evaluation, index) => (
                    <tr key={index}>
                      <td>{evaluation.deanName}</td>
                      <td>{evaluation.date}</td>
                      <td>{evaluation.comment}</td>
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
            ) : (
              <p>No evaluations found for this dean.</p>
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

export default DeanEvaluationReport;
