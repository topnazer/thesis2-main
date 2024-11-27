import React, { useState, useEffect } from "react";
import {
  getFirestore,
  collection,
  onSnapshot,
  where,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  doc,
  query
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
  const [searchStudent, setSearchStudent] = useState("")
  const [selectedDescription, setDescription] = useState("");
  const [editSubjectDescription, setEditSubjectDescription] = useState("");
  const [allStudents, setAllStudents] = useState([]);
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [selectedSchoolYear, setSelectedSchoolYear] = useState("");
  const [selectedEditSchoolYear, setSelectedEditSchoolYear] = useState("");
  const currentYear = new Date().getFullYear();
  const schoolYears = Array.from({ length: 10 }, (_, i) => `${currentYear + i}-${currentYear + i + 1}`);
  const departments = ["CCS", "COC", "CED", "CASS", "COE", "CBA"];
  const db = getFirestore();

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "subjects"), (snapshot) => {
      const subjectsList = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setSubjects(subjectsList);
      console.log(subjectsList);
    });
  
    const fetchInitialData = async () => {
      fetchFacultyList(); 
      try {
        const studentsQuery = query(collection(db, "users"), where("role", "==", "Student"));
        const querySnapshot = await getDocs(studentsQuery);
        const studentsList = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setAllStudents(studentsList);
      } catch (error) {
        console.error("Error fetching students:", error);
      }
    };
    fetchInitialData(); 
    return () => unsubscribe();
  }, [db]);

    const fetchFacultyList = async () => {
    const q = query(collection(db, "users"), where("role", "==", "Faculty"));
    const querySnapshot = await getDocs(q);
    const facultyData = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    setFacultyList(facultyData);
  };

  const handleEnrollStudent = async (subjectId, studentIds) => {
    const subjectToEnroll = subjects.find((subject) => subject.id === subjectId);
    if (!subjectToEnroll) {
      alert("Subject not found.");
      return;
    }
    const studentsToEnroll = allStudents.filter((student) => studentIds.includes(student.id));
    if (studentsToEnroll.length === 0) {
      alert("No valid students selected.");
      return;
    }
    const enrollmentPromises = studentsToEnroll.map(async (student) => {
      const studentSubjectsRef = doc(db, `students/${student.id}/subjects/${subjectId}`);
      const subjectEnrolledStudentRef = doc(db, `subjects/${subjectId}/enrolledStudents/${student.id}`);
  
      try {
        await Promise.all([
          setDoc(studentSubjectsRef, {
            id: subjectId,
            name: subjectToEnroll.name,
            facultyId: subjectToEnroll.facultyId || null,
            sectionId: subjectToEnroll.sectionId || "default_section",
            semester: subjectToEnroll.semester || "",
            department: subjectToEnroll.department || "",
          }),
          setDoc(subjectEnrolledStudentRef, {
            id: student.id,
            email: student.email,
            name: `${student.firstName} ${student.lastName}` || "Unknown",
          })
        ]);
      } catch (error) {
        console.error(`Error enrolling student ${student.email}:`, error);
      }
    });
  
    try {
      await Promise.all(enrollmentPromises);
      const enrolledEmails = studentsToEnroll.map(student => student.email).join(", ");
      alert(`Successfully enrolled the following students: ${enrolledEmails}`);
    } catch (error) {
      console.error("Error enrolling students in subject:", error);
      alert("There was an error enrolling the students. Please try again.");
    }
  };
  
  const fetchEnrolledStudents = async (subjectId) => {
    try {
      const enrolledStudentsRef = collection(db, `subjects/${subjectId}/enrolledStudents`);
      const enrolledStudentsSnapshot = await getDocs(enrolledStudentsRef);
      const studentsList = enrolledStudentsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setEnrolledStudents(studentsList);
      setShowEnrolledStudents(true); 
    } catch (error) {
      console.error("Error fetching enrolled students:", error);
      alert("There was an error fetching enrolled students. Please try again.");
    }
  };
  
  
   const handleDeleteSubject = async (subjectId) => {
      const confirmed = window.confirm("Are you sure you want to delete this subject?");
      if (!confirmed) return;
      try {      
          const enrolledStudentsRef = collection(db, `subjects/${subjectId}/enrolledStudents`);
          const enrolledStudentsSnapshot = await getDocs(enrolledStudentsRef);
          const deleteEnrolledStudentsPromises = enrolledStudentsSnapshot.docs.map((doc) =>
              deleteDoc(doc.ref)
          );
          await Promise.all(deleteEnrolledStudentsPromises);
          const enrolledStudentIds = enrolledStudentsSnapshot.docs.map((doc) => doc.id);
          const deleteFromStudentProfilesPromises = enrolledStudentIds.map((studentId) =>
              deleteDoc(doc(db, `students/${studentId}/subjects/${subjectId}`))
          );
          await Promise.all(deleteFromStudentProfilesPromises);
          await deleteDoc(doc(db, "subjects", subjectId));
          setSubjects((prevSubjects) => prevSubjects.filter((subject) => subject.id !== subjectId));
          if (viewedSubject && viewedSubject.id === subjectId) setViewedSubject(null);
          if (subjectIdToEdit === subjectId) {
              setSubjectIdToEdit(null);
              setEditSubjectName("");
              setSelectedEditFaculty("");
              setSelectedEditSemester("");
              setSelectedEditDepartment("");
              setDescription("");
          }
          alert("Subject and all associated records deleted successfully.");
      } catch (error) {
          console.error("Error deleting subject and associated data:", error);
      }
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
  
    const subjectRef = doc(db, "subjects", newSubjectId);
    const subjectSnap = await getDoc(subjectRef);
    
    if (subjectSnap.exists()) {
      alert("A subject with this ID already exists. Please choose a different ID.");
      return;
    }
    try {
      await setDoc(doc(db, "subjects", newSubjectId), {
        id: newSubjectId,
        name: newSubjectName,
        facultyId: selectedFaculty,
        semester: selectedSemester,
        department: selectedDepartment,
        schoolYear: selectedSchoolYear,
        description: selectedDescription,
        createdAt: new Date(),
      });
      setNewSubjectName("");
      setNewSubjectId("");
      setSelectedFaculty(""); 
      setSelectedSemester(""); 
      setSelectedDepartment(""); 
      setDescription(""),
      setSelectedSchoolYear(""); 
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
        schoolYear: selectedEditSchoolYear, 
        description: editSubjectDescription, 
      });
      const updatedSubjectRef = doc(db, "subjects", subjectIdToEdit);
      const updatedSubjectSnap = await getDoc(updatedSubjectRef);
      if (updatedSubjectSnap.exists()) {
        const updatedSubject = { id: updatedSubjectSnap.id, ...updatedSubjectSnap.data() };
        setViewedSubject(updatedSubject); 
      }
      alert("Subject updated successfully!");
      setEditSubjectName("");
      setSelectedEditFaculty(""); 
      setSelectedEditSemester(""); 
      setSelectedEditDepartment(""); 
      setSubjectIdToEdit(null);
      setSelectedEditSchoolYear(""); 
      setEditSubjectDescription("");
    } catch (error) {
      console.error("Error editing subject:", error);
    }
  };
  
  const CancelView = () => {
    setViewedSubject(null);
  }
  const CancelEnroll = () => {
    setEnroll(null);
  };
  const cancelEdit = () => {
    setEditSubjectName("");           
    setSelectedEditFaculty("");         
    setSelectedEditSemester("");        
    setSelectedEditDepartment("");      
    setSubjectIdToEdit(null);
    setDescription("");
    
  };
  


  const filteredSubjects = subjects
  .filter(subject => 
    (filterDepartment ? subject.department === filterDepartment : true) && 
    (searchTerm ? subject.name.toLowerCase().includes(searchTerm.toLowerCase()) : true)
    
  );
  const filteredStudents = allStudents.filter(student =>
    student.email.toLowerCase().includes(searchStudent.toLowerCase()) || 
    student.id.toLowerCase().includes(searchStudent.toLowerCase()) || 
    `${student.firstName} ${student.lastName}`.toLowerCase().includes(searchStudent.toLowerCase()) 
  );


  return ( 
    <div className="manage-subject-container">
      <div className="manage-subject-left">
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
          <button className="subj-dept-button" onClick={() => setFilterDepartment("")}>ALL</button>
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
                  <strong>{subject.name}</strong> (ID: {subject.id})
                </p>
                  <button onClick={() => { setViewedSubject(subject); cancelEdit(); setShowEnrolledStudents(false); setEnroll(null) }} className="subject-view-button">View</button>
                </div>
              
            ))}
          </div>
        </div>
      </div>
  
      <div className="manage-subject-right">
      <div className="add-subject">
    <h1>ADD SUBJECT</h1>
    <form className="add-subject-form" onSubmit={(e) => {
      e.preventDefault();
      handleAddSubject();
    }}>
      <div className="add-subject-grid">
      <div className="input-container">
          <select
            className="input-group"
            value={selectedSemester}
            onChange={(e) => setSelectedSemester(e.target.value)}
          >
            <option value="">Select Semester</option>
            <option value="First">First Semester</option>
            <option value="Second">Second Semester</option>
          </select>
        </div>
        <div className="input-container">
  <select
    className="input-group"
    value={selectedSchoolYear}
    onChange={(e) => setSelectedSchoolYear(e.target.value)}
  >
    <option value="">Select School Year</option>
    {schoolYears.map((year) => (
      <option key={year} value={year}>{year}</option>
    ))}
  </select>
</div>
        <div className="input-container">
          <input
            className="input-group"
            type="text"
            value={newSubjectName}
            onChange={(e) => setNewSubjectName(e.target.value)}
            placeholder="New subject name"
          />
        </div>

        <div className="input-container">
          <input
            className="input-group"
            type="text"
            value={newSubjectId}
            onChange={(e) => setNewSubjectId(e.target.value)}
            placeholder="Offer number"
          />
        </div>
        <div className="input-container">
          <textarea 
            className="input-group"
            value={selectedDescription} 
            onChange={(e) => setDescription(e.target.value)} 
            placeholder="Enter a description" 
          />
        </div>
        <div className="input-container">
          <select
            className="input-group"
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
        </div>
        <div className="input-container">
          <select
            className="input-group"
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
          <button type="submit">Add Subject</button>
        </div>
      </div>
    </form>
  </div>
  
          {viewedSubject && (
            <div className="viewed-subject-details">
              <h1>Subject Details</h1>
              <div className="details-grid">
                <div className="details-item">
                  <strong>Name:</strong><span>{viewedSubject.name}</span>
                </div>
                <div className="details-item">
                  <strong>ID:</strong> <span>{viewedSubject.id}</span>
                </div>
                <div className="details-item">
                  <strong>School Year:</strong> <span>{viewedSubject.schoolYear}</span>
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
                <div className="details-item">
                  <strong>Description: </strong>{viewedSubject.description}
                </div>
              </div>
              <div className="edit-buttons"> 
              <button onClick={() => {
  setEditSubjectName(viewedSubject.name);
  setSubjectIdToEdit(viewedSubject.id);
  setSelectedEditFaculty(viewedSubject.facultyId);
  setSelectedEditSemester(viewedSubject.semester);
  setSelectedEditDepartment(viewedSubject.department);
  setEditSubjectDescription(viewedSubject.description); 
  CancelView();
}}>
  Edit
</button>              
                <button disabled={!!subjectIdToEdit} className="subject-delete-button" onClick={() => handleDeleteSubject(viewedSubject.id)}>Delete</button>
                <button onClick={() => { setEnroll(viewedSubject); CancelView(); }}>Enroll Student</button>
                <button onClick={() => { fetchEnrolledStudents(viewedSubject.id); CancelView(); CancelEnroll(); }}>Enrolled Students</button>         
                <button onClick={() => { CancelView();}}>Cancel</button>       
              </div> 
            </div>      
          )}
          {subjectIdToEdit && (
    <div className="editsubj-tool">
      <div className="addsubj-h1">
        <h1>EDIT SUBJECT</h1>
      </div>
      <div className="editsubj-grid">
      <select
          value={selectedEditSemester}
          onChange={(e) => setSelectedEditSemester(e.target.value)}
        >
          <option value="">Select Semester</option>
          <option value="First">First Semester</option>
          <option value="Second">Second Semester</option>
        </select>
      <select
  value={selectedEditSchoolYear}
  onChange={(e) => setSelectedEditSchoolYear(e.target.value)}
>
  <option value="">Select School Year</option>
  {schoolYears.map((year) => (
    <option key={year} value={year}>{year}</option>
  ))}
</select>
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
        <textarea
          value={editSubjectDescription}
          onChange={(e) => setEditSubjectDescription(e.target.value)}
          placeholder="Edit description"
        />
      </div>
      <div className="editsubj-button">
        <button onClick={handleEditSubject}>Update Subject</button>
        <button onClick={cancelEdit}>Cancel</button>
      </div>
    </div>
  )}
          
          {Enroll && (
  <div className="enroll-student">
    <div className="enroll-tool">
      <h1>Enroll Students in {Enroll.name}</h1>
      <div className="student-checkboxes">
        {filteredStudents.map((student) => (
          <div key={student.id} className="student-checkbox">
            <input
              type="checkbox"
              id={`student-${student.id}`}
              value={student.id}
              checked={selectedStudents.includes(student.id)}
              onChange={(e) => {
                if (e.target.checked) {
                  setSelectedStudents((prev) => [...prev, student.id]); 
                } else {
                  setSelectedStudents((prev) => prev.filter(id => id !== student.id)); 
                }
              }}
            />
            <label htmlFor={`student-${student.id}`}>
              {student.firstName} {student.lastName} - {student.email} - (ID: {student.id})
            </label>
          </div>
        ))}
      </div>
      <div className="enroll-buttons">
        <input
          type="text"
          value={searchStudent}
          onChange={(e) => setSearchStudent(e.target.value)}
          placeholder="Search by email, ID, or name"
          className="enroll-search-bar" 
        />
        <button onClick={() => {
          selectedStudents.forEach(studentId => handleEnrollStudent(Enroll.id, studentId));
          setSelectedStudents([]); 
        }}>
          Enroll Students
        </button>
        <button onClick={() => { setEnroll(null); }}>Cancel</button>
      </div>
    </div>
  </div>
)}
  
  {showEnrolledStudents && (
  <div className="enrolled-students-list">
    <h1>Enrolled Students</h1>
    <input
      type="text"
      value={searchStudent}
      onChange={(e) => setSearchStudent(e.target.value)}
      placeholder="Search by email or name"
      className="enroll-search-bar"
    />
    <div className="enrolled-students-container">
      {enrolledStudents
        .filter(student =>
          student.email.toLowerCase().includes(searchStudent.toLowerCase()) || 
          student.id.toLowerCase().includes(searchStudent.toLowerCase()) ||
          `${student.firstName} ${student.lastName}`.toLowerCase().includes(searchStudent.toLowerCase()) 
        )
        .map((student) => (
          <div key={student.id} className="student-item">
            <p>
            {student.firstName} {student.lastName} - {student.email} - (ID: {student.id})
            </p>
          </div>
        ))
      }
      {enrolledStudents.filter(student =>
        student.email.toLowerCase().includes(searchStudent.toLowerCase()) ||
        student.id.toLowerCase().includes(searchStudent.toLowerCase()) ||
        `${student.firstName} ${student.lastName}`.toLowerCase().includes(searchStudent.toLowerCase())
      ).length === 0 && <p>No students found.</p>}
    </div>
    <button className="enrolled-student-buttons" onClick={() => { setShowEnrolledStudents(false); }}>Cancel</button>
  </div>
)}
        
      </div>
    </div>
  );
};

export default Subjects;
