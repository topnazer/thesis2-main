import React, { useState, useEffect, useCallback } from 'react';
import { getFirestore, collection, getDocs, query, where } from "firebase/firestore";
import './User.css';

const UsersPage = () => {
  const [userDetail, setUserDetail] = useState(false);
  const [isSubjectsOverlayVisible, setSubjectsOverlayVisible] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [userSubjects, setUserSubjects] = useState({});
  const [selectedDepartment, setSelectedDepartment] = useState("CCS");
  const [searchTerm, setSearchTerm] = useState('');
  const db = getFirestore();

  const fetchUsersByDepartment = useCallback(async (department) => {
    try {
      const q = query(
        collection(db, "users"), 
        where("department", "==", department), 
        where("status", "==", "Approved")
      );
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
      const collectionPath = role === "Student" 
        ? `students/${userId}/subjects` 
        : `${role.toLowerCase()}/${userId}/subjects`;
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
    setUserDetail(true);
  };

  const hideOverlay = () => {
    setUserDetail(false);
    setSelectedUser(null);
    setSubjectsOverlayVisible(false);  
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
    <div className='user-page-container'>
      <div className='user-page-left'>
        <div className="user-list"> 
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
          <input 
            type="text" 
            placeholder="Search users..." 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)} 
            className='user-search'
          />
          {filteredUsers.length === 0 ? (
            <p>No users found in {selectedDepartment} department.</p>
          ) : (
            <div className="user-card">
              {filteredUsers.map((user) => (
                <div key={user.id} className="user-item">
                  <div className="user-info">
                    <strong>{user.firstName} {user.lastName}</strong>
                    <strong><p>({user.role})</p></strong>
                    <p>Department: {user.department}</p> {/* Displaying department here */}
                  </div>
                  <button className="user-view" onClick={() => showOverlay(user)}>View</button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="user-page-right">
        <div>
          {userDetail && selectedUser && (
            <div className="user-detail">
              <h1>Details for {selectedUser.firstName} {selectedUser.lastName}</h1>
              <div className="subject-content-grid">
                <div className="grid-item">
                  <strong>Email:</strong> {selectedUser.email}
                </div>
                <div className="grid-item">
                  <strong>Password:</strong> {selectedUser.password}
                </div>
                <div className="grid-item">
                  <strong>Role:</strong> {selectedUser.role}
                </div>
                <div className="grid-item">
                  <strong>Department:</strong> {selectedUser.department} {/* Displaying department in details */}
                </div>
                <div className="grid-item">
                  <strong>Status:</strong> {selectedUser.status}
                </div>
              </div>
              <div className="user-subject-button">
                  <button className="user-close" onClick={hideOverlay}>Close</button>                         
                  <button className="show-subjects" onClick={showSubjectsOverlay}>Show Subjects</button>
              </div>
              {isSubjectsOverlayVisible && (
                <div className="subjects-overlay">
                  <h3>Subjects for {selectedUser.firstName} {selectedUser.lastName}</h3>
                  {userSubjects[selectedUser.id]?.length === 0 && (
                      <p>No subjects</p> 
                      )}
                  <div className='user-subject-content'>
                  <div className="subject-content-grid">
                    {userSubjects[selectedUser.id]?.length > 0 ? (
                    userSubjects[selectedUser.id].map((subject, index) => (
                    <div className="grid-item" key={index}>
                      <p>{subject}</p>
                    </div>
                    
                      ))
                      ) : null} 
                  </div>
                  </div>
                      <div className="user-subject-button">
                      <button className="close-subjects" onClick={hideSubjectsOverlay}>Close Subjects</button>
                      </div>
                </div>
              )}
            </div>            
          )}
        </div>
      </div>
    </div>
  );
};

export default UsersPage;
