import React, { useState, useEffect } from "react";
import { getFirestore, collection, query, where, getDocs } from "firebase/firestore";
import "./facultyevaluationreport.css"; // Ensure this CSS file is included

const Facultyevaluationreport = () => {
  const [departments] = useState(["All", "CCS", "COC", "CED", "CASS", "COE", "CBA"]); // List of departments
  const [selectedDepartment, setSelectedDepartment] = useState("All");
  const [faculty, setFaculty] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const db = getFirestore();

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

  const getDepartmentColor = (department) => {
    const colors = {
      CCS: "green",
      COC: "red",
      COE: "purple",
      CASS: "orange",
      CBA: "yellow",
      CED: "blue",
    };
    return colors[department] || "gray";
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
                style={{ backgroundColor: getDepartmentColor(dept), color: "#fff" }}
                className={selectedDepartment === dept ? "active-department" : ""}
              >
                {dept}
              </button>
            ))}
          </div>
          {loading && <p>Loading faculty data...</p>}
          {error && <p>{error}</p>}
          {!loading && !error && faculty.length === 0 && (
            <p>No faculty members found for {selectedDepartment} department.</p>
          )}
          {!loading && !error && faculty.length > 0 && (
            <div className="facuser-card">
              {faculty.map((member) => (
                <div key={member.id} className="facuser-item">
                  <div className="facuser-info">
                    <strong>{member.firstName} {member.lastName}</strong>
                    <p>Email: {member.email}</p>
                    <p>Department: {member.department}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Facultyevaluationreport;

