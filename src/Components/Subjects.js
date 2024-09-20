import React, { useState, useEffect } from "react";
import { getFirestore, collection, deleteDoc, updateDoc, onSnapshot, doc, setDoc, query, where, getDocs, getDoc } from "firebase/firestore";


const Subjects = () => {
  const [subjects, setSubjects] = useState([]);
  const [newSubjectName, setNewSubjectName] = useState("");
  const [newSubjectId, setNewSubjectId] = useState(""); 
  const [editSubjectName, setEditSubjectName] = useState("");
  const [subjectIdToEdit, setSubjectIdToEdit] = useState(null);
  const [role, setRole] = useState("student");
  const [userEmail, setUserEmail] = useState(""); 
  const [foundUser, setFoundUser] = useState(null);
  const [facultyList, setFacultyList] = useState([]);
  const [selectedFaculty, setSelectedFaculty] = useState(""); 

  const db = getFirestore();

  useEffect(() => {
    // Fetch subjects
    const unsubscribe = onSnapshot(collection(db, "subjects"), (snapshot) => {
      const subjectsList = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setSubjects(subjectsList);
    });

    // Fetch faculty members
    const fetchFacultyList = async () => {
      const q = query(collection(db, "users"), where("role", "==", "Faculty"));
      const querySnapshot = await getDocs(q);
      const facultyData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setFacultyList(facultyData);
    };

    fetchFacultyList();

    return () => unsubscribe(); // Cleanup listener on unmount
  }, [db]);

const handleAddSubject = async () => {
  if (!newSubjectName.trim() || !newSubjectId.trim()) {
    alert("Subject name and ID cannot be empty.");
    return;
  }

  if (!selectedFaculty) {
    alert("Please select a faculty member for this subject.");
    return;
  }

  // Generate a section ID, can be customized based on your needs
  const sectionId = `${newSubjectId}-sec-${Date.now()}`;

  try {
    await setDoc(doc(db, "subjects", newSubjectId), {
      id: newSubjectId,
      name: newSubjectName,
      facultyId: selectedFaculty,
      sectionId: sectionId, // Add the generated sectionId
      createdAt: new Date(),
    });
    setNewSubjectName(""); 
    setNewSubjectId(""); 
    alert("Subject added with section ID!");
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
        facultyId: selectedFaculty,
      });
      setEditSubjectName("");
      setSubjectIdToEdit(null);
    } catch (error) {
      console.error("Error editing subject:", error);
    }
  };

const handleDeleteSubject = async (subjectId) => {
  try {
    // Delete from 'subjects' collection
    await deleteDoc(doc(db, "subjects", subjectId));

    // Fetch all students
    const studentsQuery = query(collection(db, "students"));
    const studentsSnapshot = await getDocs(studentsQuery);

    // Iterate and delete subject from each student's sub-collection
    for (const studentDoc of studentsSnapshot.docs) {
      const studentId = studentDoc.id;
      const subjectRef = doc(db, `students/${studentId}/subjects`, subjectId);

      // Ensure the subject exists before trying to delete it
      const subjectSnapshot = await getDoc(subjectRef);
      if (subjectSnapshot.exists()) {
        await deleteDoc(subjectRef); // Delete the subject from student's sub-collection
        console.log(`Deleted subject ${subjectId} from student ${studentId}'s subjects.`);
      } else {
        console.log(`Subject ${subjectId} not found in student ${studentId}'s subjects.`);
      }
    }

    alert("Subject deleted successfully and removed from all students' dashboards.");
  } catch (error) {
    console.error("Error deleting subject or removing from students:", error);
  }
};

const handleAssignSubjectToUser = async (subjectId) => {
  if (!foundUser) {
    alert("Please search for and select a user first.");
    return;
  }

  try {
    const subjectData = subjects.find((subject) => subject.id === subjectId);
    
    if (!subjectData || !subjectData.sectionId) {
      alert("Error: Subject or section ID not found.");
      return;
    }

    const userCollection = role === "student" ? "students" : "faculty";
    const subjectRef = doc(db, `${userCollection}/${foundUser.id}/subjects`, subjectId);

    await setDoc(subjectRef, {
      name: subjectData.name,
      sectionId: subjectData.sectionId, // Assign sectionId to the user
      assignedAt: new Date(),
    });

    alert("Subject assigned successfully to the user!");
  } catch (error) {
    console.error("Error assigning subject:", error);
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

  return (
    <div>
      <h2>Manage Subjects</h2>

      {/* Add new subject */}
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
        {facultyList.map(faculty => (
          <option key={faculty.id} value={faculty.id}>
            {faculty.email}
          </option>
        ))}
      </select>
      <button onClick={handleAddSubject}>Add Subject</button>

      {/* Search user by email */}
      <div>
        <h3>Assign Subject to User</h3>
        <input
          type="text"
          value={userEmail}
          onChange={(e) => setUserEmail(e.target.value)}
          placeholder="Enter user email"
        />
        <button onClick={handleSearchUserByEmail}>Search User</button>
        {foundUser && (
          <div>
            <p>User Found: {foundUser.email} (ID: {foundUser.id})</p>
            <select onChange={(e) => setRole(e.target.value)} value={role}>
              <option value="student">Student</option>
              <option value="faculty">Faculty</option>
            </select>
          </div>
        )}
      </div>

      {/* List of subjects */}
      <ul>
        {subjects.map((subject) => (
          <li key={subject.id}>
            {subject.name} (ID: {subject.id}) - {subject.facultyId ? facultyList.find(f => f.id === subject.facultyId)?.email : "No faculty assigned"}
            <button onClick={() => {
              setEditSubjectName(subject.name);
              setSubjectIdToEdit(subject.id);
              setSelectedFaculty(subject.facultyId);
            }}>Edit</button>
            <button onClick={() => handleDeleteSubject(subject.id)}>Delete</button>

            {/* Assign subject to found user */}
            {foundUser && (
              <button onClick={() => handleAssignSubjectToUser(subject.id)}>Assign to User</button>
            )}
          </li>
        ))}
      </ul>

      {/* Edit subject */}
      {subjectIdToEdit && (
        <div>
          <h3>Edit Subject</h3>
          <input
            type="text"
            value={editSubjectName}
            onChange={(e) => setEditSubjectName(e.target.value)}
            placeholder="Edit subject name"
          />
          <select
            value={selectedFaculty}
            onChange={(e) => setSelectedFaculty(e.target.value)}
          >
            <option value="">Select Faculty</option>
            {facultyList.map(faculty => (
              <option key={faculty.id} value={faculty.id}>
                {faculty.email}
              </option>
            ))}
          </select>
          <button onClick={handleEditSubject}>Update Subject</button>
        </div>
      )}
    </div>
  );
};

export default Subjects;
