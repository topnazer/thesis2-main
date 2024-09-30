import React, { useState, useEffect, useCallback } from 'react';
import { getFirestore, collection, getDocs, query, where } from "firebase/firestore";
import './User.css';

const UsersPage = () => {
  const [users, setUsers] = useState([]);
  const [userSubjects, setUserSubjects] = useState({});
  const [selectedDepartment, setSelectedDepartment] = useState("CCS"); // Default department
  const [searchTerm, setSearchTerm] = useState(''); // Search state
  const db = getFirestore();

  // Fetch users by department
  const fetchUsersByDepartment = useCallback(async (department) => {
    try {
      const q = query(collection(db, "users"), where("department", "==", department), where("status", "==", "Approved"));
      const userSnapshot = await getDocs(q);
      const usersList = [];
      const subjectsList = {};

      for (const doc of userSnapshot.docs) {
        const userData = doc.data();
        const userId = doc.id;
        usersList.push({ id: userId, ...userData });

        // Fetch subjects for each user
        subjectsList[userId] = await fetchUserSubjects(userData.role, userId);
      }

      setUsers(usersList);
      setUserSubjects(subjectsList);
    } catch (error) {
      console.error("Error fetching users by department:", error);
    }
  }, [db]);


  const fetchUserSubjects = useCallback(async (role, userId) => {
    try {
      const collectionPath = role === "Student" ? `students/${userId}/subjects` : `${role.toLowerCase()}/${userId}/subjects`;
      const subjectsRef = collection(db, collectionPath);
      const subjectSnapshot = await getDocs(subjectsRef);
      const subjects = subjectSnapshot.docs.map(doc => doc.data().name);
      return subjects;
    } catch (error) {
      console.error("Error fetching subjects:", error);
      return [];
    }
  }, [db]);

  useEffect(() => {
    fetchUsersByDepartment(selectedDepartment);
  }, [fetchUsersByDepartment, selectedDepartment]);

  const departments = ["CCS", "COC", "CED", "CASS", "COE", "CBA", "ACAF"];

  
  const filteredUsers = users.filter((user) => {
    const fullName = `${user.firstName} ${user.lastName}`.toLowerCase();
    const role = user.role.toLowerCase();
    const search = searchTerm.toLowerCase();
    return fullName.includes(search) || role.includes(search);
  });

  return (
    <div>
      <div className='user-button'>
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

      <h2>{selectedDepartment} Department Users</h2>

      {}
      <input 
        type="text" 
        placeholder="Search users..." 
        value={searchTerm} 
        onChange={(e) => setSearchTerm(e.target.value)} 
        style={{ marginBottom: '20px', padding: '10px', width: '50%' }}
      />

      {filteredUsers.length === 0 ? (
        <p>No users found in {selectedDepartment} department.</p>
      ) : (
        <div className="user-card">
          {filteredUsers.map((user) => (
            <div key={user.id} className="user-item">
              <div className="user-info">
                {user.firstName} {user.lastName} - {user.role} 
                <p>({user.status})</p>
              </div>
              <div className="user-subjects">
                Subjects: {userSubjects[user.id]?.join(", ") || "No subjects"}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default UsersPage;
