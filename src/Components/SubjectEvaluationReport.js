import React, { useState, useEffect, useCallback } from 'react';
import { getFirestore, collection, getDocs, query, where } from "firebase/firestore";
import { useNavigate } from 'react-router-dom';

const SubjectEvaluationReport = () => {
    const [users, setUsers] = useState([]);
    const [selectedDepartment, setSelectedDepartment] = useState('CCS');
    const [viewedSubjects, setViewedSubjects] = useState([]);
    const [loading, setLoading] = useState(false);
    const db = getFirestore();
    const navigate = useNavigate();

    
    const handleViewEvaluation = (subjectId) => {
        navigate(`/view-subject-evaluation/${subjectId}`);
    };

    
    const fetchUsersByDepartment = useCallback(async (department) => {
        try {
            const q = query(
                collection(db, "users"),
                where("department", "==", department),
                where("status", "==", "Approved"),
                where("role", "==", "Faculty")
            );
            const userSnapshot = await getDocs(q);
            const usersList = userSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setUsers(usersList);
        } catch (error) {
            console.error("Error fetching users by department:", error);
        }
    }, [db]);

    // Fetch subjects for a specific faculty
    const fetchFacultySubjects = useCallback(async (facultyId) => {
        try {
            const subjectsRef = collection(db, "subjects");
            const q = query(subjectsRef, where("facultyId", "==", facultyId));
            const subjectSnapshot = await getDocs(q);
            const subjects = subjectSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setViewedSubjects(subjects);
        } catch (error) {
            console.error("Error fetching subjects:", error);
            setViewedSubjects([]);
        }
    }, [db]);

    useEffect(() => {
        fetchUsersByDepartment(selectedDepartment);
    }, [fetchUsersByDepartment, selectedDepartment]);

    const departments = ["CCS", "COC", "CED", "CASS", "COE", "CBA", "ACAF"];

    const handleViewSubjects = (facultyId) => {
        fetchFacultySubjects(facultyId);
    };

    return (
        <div>
            <div className='department-selector'>
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

            <h2>{selectedDepartment} Department Faculty</h2>

            {loading && <p>Loading...</p>}
            
            {!loading && users.length === 0 ? (
                <p>No faculty found in {selectedDepartment} department.</p>
            ) : (
                <div className="user-card">
                    {users.map((user) => (
                        <div key={user.id} className="user-item">
                            <div className="user-info">
                                {user.firstName} {user.lastName} - {user.role}
                                <p>({user.status})</p>
                            </div>
                            <div className="user-subjects">
                                <button onClick={() => handleViewSubjects(user.id)}>View Subjects</button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Section to Show Subjects */}
            {viewedSubjects.length > 0 && (
                <div className="subject-list">
                    <h3>Subjects:</h3>
                    <ul>
                        {viewedSubjects.map((subject) => (
                            <li key={subject.id}>
                                {subject.name}
                                <button onClick={() => handleViewEvaluation(subject.id)}>View Evaluation</button>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
};

export default SubjectEvaluationReport;
