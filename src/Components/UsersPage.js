import React, { useState, useEffect, useCallback } from 'react';
import { getFirestore, collection, getDocs, query, where, deleteDoc, doc, getDoc } from "firebase/firestore";
import './User.css';

const UsersPage = () => {
  const [userDetail, setUserDetail] = useState(false);
  const [isSubjectsOverlayVisible, setSubjectsOverlayVisible] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [userSubjects, setUserSubjects] = useState({});
  const [selectedDepartment, setSelectedDepartment] = useState("All");
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSubjects, setSelectedSubjects] = useState([]);
  const [selectedRole, setSelectedRole] = useState(''); // New state for role filtering
  const db = getFirestore();

  const fetchUsersByDepartment = useCallback(async (department) => {
    try {
      let q;
      if (department === "All") {
        q = query(collection(db, "users"), where("status", "==", "Approved"));
      } else if (department === "ACAF") {
        q = query(
          collection(db, "users"),
          where("role", "==", "ACAF"),
          where("status", "==", "Approved")
        );
      } else {
        q = query(
          collection(db, "users"),
          where("department", "==", department),
          where("status", "==", "Approved")
        );
      }

      const userSnapshot = await getDocs(q);
      const usersList = [];
      const subjectsList = {};

      for (const doc of userSnapshot.docs) {
        const userData = doc.data();
        const userId = doc.id;

        if (userData.role !== "Admin") {
          usersList.push({ id: userId, ...userData });
          subjectsList[userId] = await fetchUserSubjects(userData.role, userId);
        }
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

      const subjects = await Promise.all(subjectSnapshot.docs.map(async (docSnapshot) => {
        const subjectData = docSnapshot.data();
        const subjectId = docSnapshot.id;

        const evaluationRef = doc(db, `subjectDone/${subjectId}/completed_evaluations`, userId);
        const evaluationDoc = await getDoc(evaluationRef);
        const evaluated = evaluationDoc.exists();

        return {
          id: subjectId,
          name: subjectData.name,
          evaluated,
        };
      }));

      return subjects;
    } catch (error) {
      console.error("Error fetching subjects:", error);
      return [];
    }
  }, [db]);

  const unenrollSelectedSubjects = async () => {
    try {
      const studentId = selectedUser.id;
      const studentSubjectsPath = `students/${studentId}/subjects`;

      const unenrollPromises = selectedSubjects.map(async (subjectId) => {
        await deleteDoc(doc(db, studentSubjectsPath, subjectId));
        const enrolledStudentsPath = `subjects/${subjectId}/enrolledStudents`;
        await deleteDoc(doc(db, enrolledStudentsPath, studentId));
      });
      await Promise.all(unenrollPromises);
      setUserSubjects(prevSubjects => ({
        ...prevSubjects,
        [studentId]: prevSubjects[studentId].filter(subject => !selectedSubjects.includes(subject.id))
      }));
      setSelectedSubjects([]);
    } catch (error) {
      console.error("Error unenrolling subjects:", error);
    }
  };

  const toggleSubjectSelection = (subjectId) => {
    setSelectedSubjects(prevSelected =>
      prevSelected.includes(subjectId)
        ? prevSelected.filter(id => id !== subjectId)
        : [...prevSelected, subjectId]
    );
  };

  useEffect(() => {
    fetchUsersByDepartment(selectedDepartment);
  }, [fetchUsersByDepartment, selectedDepartment]);

  const departments = ["All", "CCS", "COC", "CED", "CASS", "COE", "CBA", "ACAF"];

  const showOverlay = async (user) => {
    setSelectedUser(user);
    const subjects = await fetchUserSubjects(user.role, user.id);
    setUserSubjects((prev) => ({ ...prev, [user.id]: subjects }));
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

    const roleFilter = selectedRole === 'Faculty'
      ? user.role === 'Faculty' || user.role === 'Dean'
      : selectedRole
        ? user.role === selectedRole
        : true;

    const departmentFilter = selectedDepartment !== "All" ? user.department === selectedDepartment : true;

    return (fullName.includes(search) || role.includes(search)) && roleFilter && departmentFilter;
  });

  const getDepartmentColor = (department) => {
    const colors = {
      CCS: "#A8D5BA",
      COC: "#F4B8B8",
      COE: "#D1B3DD",
      CASS: "#F9C89B",
      CBA: "#FFF1A4",
      CED: "#BFD7ED",
    };
    return colors[department] || "#F5F5F5";
  };

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
                style={{ backgroundColor: getDepartmentColor(dept), color: getDepartmentColor(dept).color }}
              >
                {dept}
              </button>
            ))}
          </div>
          {selectedDepartment !== "All" && (
            <div className='role-filter-buttons'>
              <button
                className={selectedRole === 'Student' ? 'active-role' : ''}
                onClick={() => setSelectedRole('Student')}
              >
                Students
              </button>
              <button
                className={selectedRole === 'Faculty' ? 'active-role' : ''}
                onClick={() => setSelectedRole('Faculty')}
              >
                Faculty/Dean
              </button>
              <button
                className={!selectedRole ? 'active-role' : ''}
                onClick={() => setSelectedRole('')}
              >
                All
              </button>
            </div>
          )}
          <div className='search-user-bar'>
            <input
              type="text"
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className='user-search'
            />
          </div>
          {filteredUsers.length === 0 ? (
            <p>No users found in {selectedDepartment} department.</p>
          ) : (
            <div className="user-card">
              {filteredUsers.map((user) => (
                <div
                  key={user.id}
                  className="user-item"
                >
                  <div className="user-info">
                    <strong>{user.firstName} {user.lastName}</strong>
                    <strong><p>({user.role})</p></strong>
                    <p>
                      Department: {user.department}
                    </p>
                  </div>
                  <button className="user-view" onClick={() => showOverlay(user)}>View</button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="user-page-right">
        {userDetail && selectedUser && (
          <div className="user-detail">
            <h1>Details for {selectedUser.firstName} {selectedUser.lastName}</h1>
            <div className="subject-content-grid">
              <div className="grid-item">
                <strong>Email:</strong> {selectedUser.email}
              </div>
              <div className="grid-item">
                <strong>Role:</strong> {selectedUser.role}
              </div>
              <div className="grid-item">
                <strong>Department:</strong> {selectedUser.department}
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
             <div className="user-subject-content">
               {userSubjects[selectedUser.id]?.map((subject) => (
                 <div 
                   className={`subject-box ${subject.evaluated ? "done" : "pending"}`} 
                   key={subject.id}
                 >
                   <p>{subject.name}</p>
                   <input
                     type="checkbox"
                     className="subject-checkbox"
                     checked={selectedSubjects.includes(subject.id)}
                     onChange={() => toggleSubjectSelection(subject.id)}
                   />
                 </div>
                  ))}
                </div>
                <div className="close-subjects-container">
                  <button className="close-subjects" onClick={hideSubjectsOverlay}>Close Subjects</button>
                  <button 
                    className="unenroll-subjects" 
                    onClick={unenrollSelectedSubjects}
                    disabled={selectedSubjects.length === 0}
                  >
                    Unenroll Selected Subjects
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default UsersPage;
