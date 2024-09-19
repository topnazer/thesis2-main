import React, { useEffect, useState } from 'react';
import { getFirestore, collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom'; // Import useNavigate

const EvaluationReportPage = () => {
  const [facultyList, setFacultyList] = useState([]);
  const [filteredFacultyList, setFilteredFacultyList] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate(); // Initialize navigate

  const db = getFirestore();

  // Fetch all faculty members and their evaluations
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

  // Search function to filter faculty list based on search query
  const handleSearch = (e) => {
    const query = e.target.value.toLowerCase();
    setSearchQuery(query);
    filterFaculty(query, departmentFilter);
  };

  // Handle department filtering
  const handleDepartmentChange = (e) => {
    const selectedDepartment = e.target.value;
    setDepartmentFilter(selectedDepartment);
    filterFaculty(searchQuery, selectedDepartment);
  };

  // Function to filter faculty list based on search query and department
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

  // Navigate to ViewEvaluationPage
  const handleViewEvaluation = (faculty) => {
    // Navigate to the view evaluation page, passing the facultyId and names as state
    navigate(`/view-evaluation/${faculty.facultyId}`, { state: { firstName: faculty.firstName, lastName: faculty.lastName } });
  };

  if (loading) return <p>Loading faculty data...</p>;
  if (error) return <p>{error}</p>;

  return (
    <div>
      <h1>Faculty Evaluation Report</h1>

      {/* Search Bar */}
      <input
        type="text"
        placeholder="Search faculty by name, email, or ID"
        value={searchQuery}
        onChange={handleSearch}
        style={{ marginBottom: '20px', padding: '10px', width: '300px' }}
      />

      {/* Department Filter */}
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

      {/* Faculty List */}
      <div>
        {filteredFacultyList.length > 0 ? (
        <ul>
        {filteredFacultyList.map((faculty, index) => (
          <li key={index} style={{ marginBottom: '20px' }}>
            <h3>
              {faculty.firstName} {faculty.lastName} (ID: {faculty.facultyId})
            </h3>
            <p>Email: {faculty.email}</p>
            <p>Department: {faculty.department}</p>
            <p>
              {faculty.evaluation
                ? `Average Score: ${faculty.evaluation.averageScore}, Completed Evaluations: ${faculty.evaluation.completedEvaluations}`
                : 'No evaluations available'}
            </p>
            {/* Pass faculty object directly */}
            <button onClick={() => handleViewEvaluation(faculty)}>View</button> {/* View button */}
          </li>
        ))}
      </ul>
        ) : (
          <p>No faculty members found.</p>
        )}
      </div>
    </div>
  );
};

export default EvaluationReportPage;
