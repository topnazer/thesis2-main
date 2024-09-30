import React, { useState, useEffect, useCallback } from 'react';
import { getFirestore, collection, getDocs, query, where } from "firebase/firestore";
import './User.css';

const UsersPage = () => {
  const [isOverlayVisible, setOverlayVisible] = useState(false);
  const [isSubjectsOverlayVisible, setSubjectsOverlayVisible] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [userSubjects, setUserSubjects] = useState({});
  const [selectedDepartment, setSelectedDepartment] = useState("CCS");
  const [searchTerm, setSearchTerm] = useState('');
  const db = getFirestore();

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

  const showOverlay = (user) => {
    setSelectedUser(user);
    setOverlayVisible(true);
  };

  const hideOverlay = () => {
    setOverlayVisible(false);
    setSelectedUser(null);
    setSubjectsOverlayVisible(false);  // Close subjects overlay when the main overlay is closed
  };

  const showSubjectsOverlay = () => {
    setSubjectsOverlayVisible(true);
  };

  const hideSubjectsOverlay = () => {
    setSubjectsOverlayVisible(false);
  };

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
                {user.firstName} {user.lastName} 
                <p>({user.role})</p>
              </div>
              <button className="user-view" onClick={() => showOverlay(user)}>View</button>
            </div>
          ))}
        </div>
      )}

      {isOverlayVisible && selectedUser && (
        <div className="overlay">
          <div className="overlay-content">
            <button className="user-close" onClick={hideOverlay}>X</button>
            <h2>Details for {selectedUser.firstName} {selectedUser.lastName}</h2>
            <p><strong>Email:</strong> {selectedUser.email}</p>
            <p><strong>Password:</strong> {selectedUser.password}</p>
            <p><strong>Role:</strong> {selectedUser.role}</p>
            <p><strong>Status:</strong> {selectedUser.status}</p>
    

          
            <button className="show-subjects" onClick={showSubjectsOverlay}>Show Subjects</button>
            {isSubjectsOverlayVisible && (
              <div className="subjects-overlay">
                <div className="subjects-content">
                  <h3>Subjects for {selectedUser.firstName} {selectedUser.lastName}</h3>
                  <p>{userSubjects[selectedUser.id]?.join(", ") || "No subjects"}</p>
                  <button className="close-subjects" onClick={hideSubjectsOverlay}>Close Subjects</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default UsersPage;
