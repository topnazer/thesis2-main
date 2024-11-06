import React, { useState, useEffect, useCallback } from 'react';
import { getFirestore, doc, setDoc, collection, getDocs, getDoc, deleteDoc } from "firebase/firestore";
import './subjectevaluationpage.css';

const SubjectEvaluationPage = () => {
    const [evaluationForms, setEvaluationForms] = useState([]);  // Use a single form state instead of by subject
    const [newQuestion, setNewQuestion] = useState("");
    const [newWeight, setNewWeight] = useState("");
    const [editingIndex, setEditingIndex] = useState(null);
    const [categories, setCategories] = useState([]);
    const [newCategory, setNewCategory] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("");
    const [expirationDate, setExpirationDate] = useState(""); // New expiration date state

    const db = getFirestore();

    const addCategory = () => {
        if (!newCategory.trim()) return;
        setCategories((prevCategories) => {
            if (prevCategories.includes(newCategory)) {
                alert("Category already exists!");
                return prevCategories;
            }
            return [...prevCategories, newCategory];
        });
        setNewCategory("");
    };

    const addQuestion = () => {
        if (!newQuestion.trim() || !selectedCategory) {
            alert("Please enter a question and select a category.");
            return;
        }

        const questionWithWeight = {
            text: newQuestion,
            weight: parseFloat(newWeight) || 1,
            category: selectedCategory,
        };

        setEvaluationForms((prevForms) => {
            const updatedQuestions = editingIndex !== null
                ? prevForms.map((question, index) =>
                    index === editingIndex ? questionWithWeight : question
                )
                : [...prevForms, questionWithWeight];

            return updatedQuestions;
        });

        setNewQuestion("");
        setNewWeight("");
        setEditingIndex(null);
    };

    const deleteQuestion = (absoluteIndex) => {
        setEvaluationForms((prevForms) => prevForms.filter((_, i) => i !== absoluteIndex));
    };

    const handleEditQuestion = (absoluteIndex) => {
        setNewQuestion(evaluationForms[absoluteIndex].text);
        setNewWeight(evaluationForms[absoluteIndex].weight);
        setSelectedCategory(evaluationForms[absoluteIndex].category);
        setEditingIndex(absoluteIndex);
    };

    const handleSaveForm = async () => {
        try {
            const formRef = doc(db, "evaluationForms", "commonEvaluationForm"); // Use a common ID for single form
            await setDoc(formRef, {
                questions: evaluationForms || [],
                categories,
                expirationDate: expirationDate || null, // Save expiration date
            });
            alert("Subject evaluation form saved successfully!");
        } catch (error) {
            console.error("Error saving form:", error);
        }
    };

    const deleteCategory = (categoryToDelete) => {
        setCategories((prevCategories) => 
            prevCategories.filter((category) => category !== categoryToDelete)
        );
        setEvaluationForms((prevForms) => prevForms.filter(
            (question) => question.category !== categoryToDelete
        ));
    };

    const checkExpiration = useCallback(async () => {
        try {
            const now = new Date();
            const formRef = doc(db, "evaluationForms", "commonEvaluationForm");
            const formDoc = await getDoc(formRef);

            if (formDoc.exists() && formDoc.data().expirationDate) {
                const expiration = new Date(formDoc.data().expirationDate.seconds * 1000);
                if (expiration < now) {
                    await deleteDoc(formRef);
                    setEvaluationForms([]);
                    alert(`The common evaluation form has expired and was deleted.`);
                }
            }
        } catch (error) {
            console.error("Error checking for expired forms:", error);
        }
    }, [db]);

    const handleExtendExpiration = async (newDate) => {
        try {
            const formRef = doc(db, "evaluationForms", "commonEvaluationForm");
            await setDoc(formRef, { expirationDate: new Date(newDate) }, { merge: true });
            setExpirationDate(newDate);
            alert("Expiration date extended successfully!");
        } catch (error) {
            console.error("Error extending expiration date:", error);
        }
    };

    useEffect(() => {
        const fetchForm = async () => {
            try {
                const formRef = doc(db, "evaluationForms", "commonEvaluationForm");
                const formSnap = await getDoc(formRef);
                if (formSnap.exists()) {
                    setEvaluationForms(formSnap.data().questions || []);
                    setCategories(formSnap.data().categories || []);
                    setExpirationDate(formSnap.data().expirationDate?.toDate() || ""); // Load expiration date
                }
            } catch (error) {
                console.error("Error fetching evaluation form:", error);
            }
        };

        fetchForm();
        const intervalId = setInterval(checkExpiration, 3600000); // Check every hour
        return () => clearInterval(intervalId); // Cleanup interval on unmount
    }, [checkExpiration]);

    return (
        <div className="subject-evaluation-page">
            <div className="subject-evaluation-card">
                <h2 className="subject-evaluation-header">Create or Edit Evaluation Form</h2>

                <div className="subject-category-section">
                    <label>Select Category:</label>
                    <select
                        className="subject-evaluation-select"
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                    >
                        <option value="" disabled>Select a category</option>
                        {categories.map((category, index) => (
                            <option key={index} value={category}>{category}</option>
                        ))}
                    </select>
                    <input
                        type="text"
                        value={newCategory}
                        onChange={(e) => setNewCategory(e.target.value)}
                        placeholder="Add new category"
                    />
                    <button onClick={addCategory} style={{ marginLeft: '10px', backgroundColor: '#8b0000' }}>Add Category</button>
                </div>

                <div className="expiration-date">
                    <label>Expiration Date:</label>
                    <input
                        type="date"
                        value={expirationDate}
                        onChange={(e) => setExpirationDate(e.target.value)}
                    />
                    <button onClick={() => handleExtendExpiration(expirationDate)}>Extend Expiration</button>
                </div>

                <div className="subject-questions-container">
                    {categories.map((category, categoryIndex) => (
                        <div key={categoryIndex} className="subject-category-block">
                            <h3>{category}
                                <button 
                                    className="delete-category-button"
                                    onClick={() => deleteCategory(category)}
                                >
                                    Delete
                                </button>
                            </h3>
                            <ul className="subject-questions-list">
                                {(evaluationForms || []).map((question, absoluteIndex) => {
                                    if (question.category === category) {
                                        return (
                                            <li key={absoluteIndex}>
                                                {question.text} ({question.weight})
                                                <div className="subject-operation-buttons">
                                                    <button className="subject-edit-button" onClick={() => handleEditQuestion(absoluteIndex)}>Edit</button>
                                                    <button className="subject-delete-button" onClick={() => deleteQuestion(absoluteIndex)}>Delete</button>
                                                </div>
                                            </li>
                                        );
                                    }
                                    return null;
                                })}
                            </ul>
                        </div>
                    ))}
                </div>

                <div className="subject-question-form">
                    <textarea
                        className="subject-question-input"
                        value={newQuestion}
                        onChange={(e) => setNewQuestion(e.target.value)}
                        placeholder={editingIndex !== null ? "Edit the question" : "Add a new question"}
                    />
                    <input
                        type="number"
                        className="subject-weight-input"
                        value={newWeight}
                        onChange={(e) => setNewWeight(e.target.value)}
                        placeholder="Set question weight"
                    />
                    <div className="subject-buttons-container">
                        <button className="subject-save-button" onClick={addQuestion}>
                            {editingIndex !== null ? "Update Question" : "Add Question"}
                        </button>
                        <button className="subject-cancel-button" onClick={() => setNewQuestion("")}>Cancel</button>
                    </div>
                    <button className="subject-save-button" onClick={handleSaveForm}>Save Form</button>
                    
                </div>
            </div>
        </div>
    );
};

export default SubjectEvaluationPage;
