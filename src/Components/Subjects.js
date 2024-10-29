import React, { useState, useEffect } from "react";
import {
  getFirestore,
  collection,
  deleteDoc,
  updateDoc,
  onSnapshot,
  doc,
  setDoc,
  query,
  where,
  getDocs,
  arrayUnion
} from "firebase/firestore";
import './subjects.css';

const Subjects = () => {
  const [subjects, setSubjects] = useState([]);
  const [newSubjectName, setNewSubjectName] = useState("");
  const [newSubjectId, setNewSubjectId] = useState("");
  const [editSubjectName, setEditSubjectName] = useState("");
  const [subjectIdToEdit, setSubjectIdToEdit] = useState(null);
  const [facultyList, setFacultyList] = useState([]);
  const [selectedFaculty, setSelectedFaculty] = useState("");
  const [selectedEditFaculty, setSelectedEditFaculty] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [foundUser, setFoundUser] = useState(null);
  const [role, setRole] = useState("student");
  const [viewedSubject, setViewedSubject] = useState(null);
  const [Enroll, setEnroll] = useState(null);
  const [showEnrolledStudents, setShowEnrolledStudents] = useState(null);
  const [enrolledStudents, setEnrolledStudents] = useState([]);
  const [selectedSemester, setSelectedSemester] = useState("");
  const [selectedEditSemester, setSelectedEditSemester] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState("");
  const [selectedEditDepartment, setSelectedEditDepartment] = useState("");
  const [filterDepartment, setFilterDepartment] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const departments = ["CCS", "COC", "CED", "CASS", "COE", "CBA"];
  const db = getFirestore();

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "subjects"), (snapshot) => {
        const subjectsList = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
        }));
        setSubjects(subjectsList);
    });
  
    fetchFacultyList(); 
  
    return () => unsubscribe(); 
  }, [db]);

  const fetchEnrolledStudents = async (subjectId) => {
    try {
        const studentsQuery = query(
            collection(db, "students"),
            where("subjects", "array-contains", subjectId)
        );
        const querySnapshot = await getDocs(studentsQuery);
        const studentsList = querySnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
        }));
        setEnrolledStudents(studentsList);
        setShowEnrolledStudents(true);  
    } catch (error) {
        console.error("Error fetching enrolled students:", error);
    }
};

const fetchFacultyList = async () => {
  const q = query(collection(db, "users"), where("role", "==", "Faculty"));
  const querySnapshot = await getDocs(q);
  const facultyData = querySnapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
  setFacultyList(facultyData);
};

const handleAddSubject = async () => {
  if (!newSubjectName.trim() || !newSubjectId.trim()) {
    alert("Subject name and ID cannot be empty.");
    return;
  }

  if (!selectedFaculty || !selectedSemester || !selectedDepartment) {
    alert("Please select all required fields (Faculty, Semester, Department).");
    return;
  }

  try {
    await setDoc(doc(db, "subjects", newSubjectId), {
      id: newSubjectId,
      name: newSubjectName,
      facultyId: selectedFaculty,
      semester: selectedSemester,
      department: selectedDepartment,
      createdAt: new Date(),
    });
    setNewSubjectName("");
    setNewSubjectId("");
    setSelectedFaculty(""); 
    setSelectedSemester(""); 
    setSelectedDepartment(""); 
    alert("Subject added successfully!");
  } catch (error) {
    console.error("Error adding subject:", error);
  }
};


  const handleEditSubject = async () => {
    if (!editSubjectName.trim() || !subjectIdToEdit) {
      alert("Subject name and ID cannot be empty.");
      return;
    } 
    try {
      await updateDoc(doc(db, "subjects", subjectIdToEdit), {
        name: editSubjectName,
        facultyId: selectedEditFaculty,
        semester: selectedEditSemester,
        department: selectedEditDepartment,
      });
      alert("Subject updated successfully!");
      setEditSubjectName("");
      setSelectedEditFaculty(""); 
      setSelectedEditSemester(""); 
      setSelectedEditDepartment(""); 
      setSubjectIdToEdit(null);
    } catch (error) {
      console.error("Error editing subject:", error);
    }
  };

  const handleDeleteSubject = async (subjectId) => {
    const confirmed = window.confirm("Are you sure you want to delete this subject?");
    if (confirmed) {
      try {
        await deleteDoc(doc(db, "subjects", subjectId));   
        setSubjects((prevSubjects) => prevSubjects.filter((subject) => subject.id !== subjectId));               
        if (viewedSubject && viewedSubject.id === subjectId) {
          setViewedSubject(null);
        }     
        if (subjectIdToEdit === subjectId) {
          setSubjectIdToEdit(null);
          setEditSubjectName("");
          setSelectedEditFaculty("");
          setSelectedEditSemester("");
          setSelectedEditDepartment("");
        }
        alert("Subject deleted successfully.");
      } catch (error) {
        console.error("Error deleting subject:", error);
      }
    }
  };
  

  const handleSearchUserByEmail = async () => {
    if (!userEmail.trim()) {
      alert("Please enter a user email.");
      return;
    }

    try {
      const usersQuery = query(collection(db, "users"), where("email", "==", userEmail));
      const querySnapshot = await getDocs(usersQuery);

      if (querySnapshot.empty) {
        alert("No user found with this email.");
        setFoundUser(null);
      } else {
        const userDoc = querySnapshot.docs[0];
        setFoundUser({ id: userDoc.id, ...userDoc.data() });
      }
    } catch (error) {
      console.error("Error searching for user:", error);
    }
  };

  const cancelEdit = () => {
    setEditSubjectName("");           
    setSelectedEditFaculty("");         
    setSelectedEditSemester("");        
    setSelectedEditDepartment("");      
    setSubjectIdToEdit(null);
    
  };
  const CancelView = () => {
    setViewedSubject(null);
    
  };

  const CancelEnroll = () => {
    setEnroll(null);
  };

  const handleEnrollStudent = async (subjectId) => {
    if (!foundUser) {
      alert("Please search for a user to enroll.");
      return;
    }
  
    const subjectToEnroll = subjects.find(subject => subject.id === subjectId);
    if (!subjectToEnroll) {
      alert("Subject not found.");
      return;
    }
  
    const studentSubjectsRef = collection(db, `students/${foundUser.id}/subjects`);
  
    try {
      console.log("Enrolling student in subject:", subjectToEnroll);
  
     
      await setDoc(doc(studentSubjectsRef, subjectId), {
        name: subjectToEnroll.name,
        facultyId: subjectToEnroll.facultyId || null,  
        sectionId: subjectToEnroll.sectionId || "default_section",  
        semester: subjectToEnroll.semester || "",      
        department: subjectToEnroll.department || "",  
      });
      alert(`Successfully enrolled ${foundUser.email} in the subject.`);
    } catch (error) {
      console.error("Error enrolling student in subject:", error);
      alert("There was an error enrolling the student. Please try again.");
    }
  };
  

  const filteredSubjects = subjects
  .filter(subject => 
    (filterDepartment ? subject.department === filterDepartment : true) && 
    (searchTerm ? subject.name.toLowerCase().includes(searchTerm.toLowerCase()) : true)
  );

  return (
    <div className="manage-subject-container">
      <div className="manage-subject-right">
        <div className="search-subject">
          <h1>SUBJECT LIST</h1>
             
        <input
          className="subject-name"
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search by subject name"
        />
        </div>
        <div className="department-filter-buttons">
          <button onClick={() => setFilterDepartment("")}>ALL</button>
          {departments.map((department) => (
            <button className="subj-dept-button" key={department} onClick={() => setFilterDepartment(department)}>
              {department}
            </button>
          ))}
        </div>

        <div className="subject-list">
          <div className="subject-grid">
            {filteredSubjects.map((subject) => (
              <div key={subject.id} className="subject-card">
                <p>
                  {subject.name} (ID: {subject.id})
                </p>
                <button onClick={() => {setViewedSubject(subject);cancelEdit(); CancelEnroll();}} className="subject-view-button">View</button>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="manage-subject-left">
        <div className="add-subject">
          <div className="addsubj-h1">
            <h1>ADD SUBJECT</h1>
          </div>
          <div className="subject-grid">
            <input
              type="text"
              value={newSubjectName}
              onChange={(e) => setNewSubjectName(e.target.value)}
              placeholder="New subject name"
            />
            <input
              type="text"
              value={newSubjectId}
              onChange={(e) => setNewSubjectId(e.target.value)}
              placeholder="Offer number"
            />
            <select
              value={selectedFaculty}
              onChange={(e) => setSelectedFaculty(e.target.value)}
            >
              <option value="">Select Faculty</option>
              {facultyList.map((faculty) => (
                <option key={faculty.id} value={faculty.id}>
                  {faculty.email}
                </option>
              ))}
            </select>
            <select
              value={selectedSemester}
              onChange={(e) => setSelectedSemester(e.target.value)}
            >
              <option value="">Select Semester</option>
              <option value="First">First Semester</option>
              <option value="Second">Second Semester</option>
            </select>
            <select
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
            >
              <option value="">Select Department</option>
              {departments.map((department) => (
                <option key={department} value={department}>
                  {department}
                </option>
              ))}
            </select>
          </div>
          <div className="addsubj-button">
            <button onClick={handleAddSubject}>Add Subject</button>
          </div>

          <div className="edit-subject">
            {subjectIdToEdit && (
              <div className="editsubj-tool">
                <div className="addsubj-h1">
                  <h1>EDIT SUBJECT</h1>
                </div>
                <div className="editsubj-grid">
                  <input
                    type="text"
                    value={editSubjectName}
                    onChange={(e) => setEditSubjectName(e.target.value)}
                    placeholder="Edit subject name"
                  />
                  <select
                    value={selectedEditFaculty}
                    onChange={(e) => setSelectedEditFaculty(e.target.value)}
                  >
                    <option value="">Select Faculty</option>
                    {facultyList.map((faculty) => (
                      <option key={faculty.id} value={faculty.id}>
                        {faculty.email}
                      </option>
                    ))}
                  </select>
                  <select
                    value={selectedEditSemester}
                    onChange={(e) => setSelectedEditSemester(e.target.value)}
                  >
                    <option value="">Select Semester</option>
                    <option value="First">First Semester</option>
                    <option value="Second">Second Semester</option>
                  </select>
                  <select
                    value={selectedEditDepartment}
                    onChange={(e) => setSelectedEditDepartment(e.target.value)}
                  >
                    <option value="">Select Department</option>
                    {departments.map((department) => (
                      <option key={department} value={department}>
                        {department}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="editsubj-button">
                  <button onClick={handleEditSubject}>Update Subject</button>
                  <button onClick={cancelEdit}>Cancel</button>
                </div>
                
      
              </div>
            )}

            {viewedSubject && (
              <div className="viewed-subject-details">
                <h1>Subject Details</h1>
                <div className="details-grid">
                  <div className="details-item">
                    <strong>Name:</strong> <span>{viewedSubject.name}</span>
                  </div>
                  <div className="details-item">
                    <strong>ID:</strong> <span>{viewedSubject.id}</span>
                  </div>
                  <div className="details-item">
                    <strong>Faculty:</strong> <span>{facultyList.find((f) => f.id === viewedSubject.facultyId)?.email || "No faculty assigned"}</span>
                  </div>
                  <div className="details-item">
                    <strong>Semester:</strong> <span>{viewedSubject.semester}</span>
                  </div>
                  <div className="details-item">
                    <strong>Department:</strong> <span>{viewedSubject.department || "No department assigned"}</span>
                  </div>
                  <button onClick={() => {fetchEnrolledStudents(viewedSubject.id); CancelView();}}>
                  Show Enrolled Students
                  </button>
                 
                </div>
                <div className="edit-buttons"> 
                <button onClick={() => {
                  setEditSubjectName(viewedSubject.name);
                  setSubjectIdToEdit(viewedSubject.id);
                  setSelectedEditFaculty(viewedSubject.facultyId);
                  setSelectedEditSemester(viewedSubject.semester);
                  setSelectedEditDepartment(viewedSubject.department);
                  CancelView();
                }} className="subject-edit-button">Edit</button>               
                <button disabled={!!subjectIdToEdit} className="subject-delete-button" onClick={() => handleDeleteSubject(viewedSubject.id)}>Delete</button>
                <button onClick={() => {setEnroll(viewedSubject);CancelView();}}>Enroll Student</button>                
              </div> 
              </div>      
            )}
           {Enroll && (
          <div className="enroll-student">
            <div className="enroll-tool">
            <h1>Enroll Student in {Enroll.name}</h1>
            <input
              type="text"
              value={userEmail}
              onChange={(e) => setUserEmail(e.target.value)}
              placeholder="Enter user email"
            />
            <button onClick={handleSearchUserByEmail}>Search User</button>
            </div>
            <div className="enroll-buttons">
            <button onClick={() => handleEnrollStudent(Enroll.id)}>Enroll Student</button>
            <button onClick={() => {setEnroll(null);}}>Cancel</button>
            </div>
            <div>
            {foundUser && (
              <div>
                <p>User found: {foundUser.email}</p>
              </div>
            )}
            </div>
          </div>
        )}
{showEnrolledStudents && (
  <div className="enrolled-students-list">
    <h3>Enrolled Students</h3>
    {enrolledStudents.length > 0 ? (
      enrolledStudents.map((student) => (
        <p key={student.id}>{student.email}</p>
      ))
    ) : (
      <p>No students enrolled in this subject.</p>
    )}
    <button onClick={() => setShowEnrolledStudents(false)}>Close</button>
  </div>
)}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Subjects;