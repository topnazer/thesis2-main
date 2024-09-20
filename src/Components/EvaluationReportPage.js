import React, { useEffect, useState } from 'react';
import { getFirestore, collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';

const EvaluationReportPage = () => {
  const [facultyList, setFacultyList] = useState([]);
  const [filteredFacultyList, setFilteredFacultyList] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const db = getFirestore();

  useEffect(() => {
    const fetchFaculty = async () => {
      try {
        setLoading(true);
        const usersSnapshot = await getDocs(collection(db, 'users'));
        const facultyData = [];
        const deptSet = new Set();

        for (let userDoc of usersSnapshot.docs) {
          const userData = userDoc.data();
          if (userData.role === 'Faculty') {
            const facultyEvalDocRef = doc(db, 'facultyEvaluations', userDoc.id);
            const facultyEvalDoc = await getDoc(facultyEvalDocRef);

            facultyData.push({
              ...userData,
              facultyId: userDoc.id,
              evaluation: facultyEvalDoc.exists() ? facultyEvalDoc.data() : null,
            });

            if (userData.department) {
              deptSet.add(userData.department);
            }
          }
        }

        setFacultyList(facultyData);
        setFilteredFacultyList(facultyData);
        setDepartments(Array.from(deptSet));
      } catch (error) {
        setError("Failed to fetch faculty members. Please try again later.");
        console.error("Error fetching faculty members: ", error);
      } finally {
        setLoading(false);
      }
    };

    fetchFaculty();
  }, [db]);

  const handleSearch = (e) => {
    const query = e.target.value.toLowerCase();
    setSearchQuery(query);
    filterFaculty(query, departmentFilter);
  };

  const handleDepartmentChange = (e) => {
    const selectedDepartment = e.target.value;
    setDepartmentFilter(selectedDepartment);
    filterFaculty(searchQuery, selectedDepartment);
  };

  const filterFaculty = (query, department) => {
    const filtered = facultyList.filter(faculty =>
      (faculty.firstName?.toLowerCase().includes(query) ||
        faculty.lastName?.toLowerCase().includes(query) ||
        faculty.email?.toLowerCase().includes(query) ||
        faculty.facultyId?.toLowerCase().includes(query)) &&
      (department ? faculty.department === department : true)
    );
    setFilteredFacultyList(filtered);
  };

  const handleViewEvaluation = (faculty) => {
    navigate(`/view-evaluation/${faculty.facultyId}`, { state: { firstName: faculty.firstName, lastName: faculty.lastName } });
  };

  if (loading) return <p>Loading faculty data...</p>;
  if (error) return <p>{error}</p>;

  return (
    <div>
      <div className="faculty-header">
      <h1>Faculty Evaluation Report</h1>
      <input
        type="text"
        placeholder="Search faculty by name, email, or ID"
        value={searchQuery}
        onChange={handleSearch}
        style={{ marginBottom: '20px', padding: '10px', width: '300px' }}
      />

      <select
        value={departmentFilter}
        onChange={handleDepartmentChange}
        style={{ marginBottom: '20px', padding: '10px', width: '300px' }}
      >
        <option value="">All Departments</option>
        {departments.map((dept, index) => (
          <option key={index} value={dept}>
            {dept}
          </option>
        ))}
      </select>
      </div>
      <div>
        {filteredFacultyList.length > 0 ? (
          filteredFacultyList.map((faculty, index) => (
            <div className="faculty-card" key={index}>
              <h3 className="faculty-name">
                {faculty.firstName} {faculty.lastName} (ID: {faculty.facultyId})
              </h3>
              <p className="faculty-email">Email: {faculty.email}</p>
              <p className="faculty-department">Department: {faculty.department}</p>
              <p className="faculty-evaluation">
                {faculty.evaluation
                  ? `Average Score: ${faculty.evaluation.averageScore}, Completed Evaluations: ${faculty.evaluation.completedEvaluations}`
                  : 'No evaluations available'}
              </p>
              <button className="view-button" onClick={() => handleViewEvaluation(faculty)}>View</button>
            </div>
          ))
        ) : (
          <p>No faculty members found.</p>
        )}
      </div>
    </div>
  );
};

export default EvaluationReportPage;
