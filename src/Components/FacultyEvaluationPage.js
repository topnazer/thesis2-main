import React, { useState, useEffect } from 'react';
import { getFirestore, doc, getDoc, setDoc } from "firebase/firestore";
import './facultyevaluationpage.css';

const FacultyEvaluationPage = () => {
    const [facultyQuestions, setFacultyQuestions] = useState([]);
    const [newQuestion, setNewQuestion] = useState("");
    const [newWeight, setNewWeight] = useState("");
    const [editingIndex, setEditingIndex] = useState(null);
    const [facultyCategories, setFacultyCategories] = useState([]);
    const [newFacultyCategory, setNewFacultyCategory] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("");
    const [editingCategoryIndex, setEditingCategoryIndex] = useState(null);

    const db = getFirestore();

    useEffect(() => {
        const fetchForms = async () => {
            try {
                const facultyDoc = await getDoc(doc(db, "evaluationForms", "faculty"));
                if (facultyDoc.exists()) {
                    const data = facultyDoc.data();
                    setFacultyQuestions(data.questions || []);
                    setFacultyCategories(data.categories || []);
                }
            } catch (error) {
                console.error("Error fetching evaluation forms:", error);
            }
        };

        fetchForms();
    }, [db]);

    // Add or edit category for faculty
    const addOrEditCategoryForFaculty = () => {
        if (!newFacultyCategory.trim()) return;

        if (editingCategoryIndex !== null) {
            setFacultyCategories((prevCategories) => {
                const updatedCategories = [...prevCategories];
                const oldCategory = updatedCategories[editingCategoryIndex];
                updatedCategories[editingCategoryIndex] = newFacultyCategory;

                setFacultyQuestions((prevQuestions) => {
                    return prevQuestions.map((question) =>
                        question.category === oldCategory
                            ? { ...question, category: newFacultyCategory }
                            : question
                    );
                });

                return updatedCategories;
            });
        } else {
            setFacultyCategories((prevCategories) => [...prevCategories, newFacultyCategory]);
        }

        setNewFacultyCategory("");
        setEditingCategoryIndex(null);
    };

    // Delete category for faculty
    const deleteCategory = (category) => {
        setFacultyCategories((prevCategories) => prevCategories.filter((cat) => cat !== category));
        setFacultyQuestions((prevQuestions) => prevQuestions.filter((question) => question.category !== category));
    };

    const handleEditCategory = (index, category) => {
        setNewFacultyCategory(category);
        setEditingCategoryIndex(index);
    };

    // Add or edit faculty questions
    const addOrEditQuestionForFaculty = () => {
        if (!newQuestion.trim() || !selectedCategory) return;

        const questionWithWeight = {
            text: newQuestion,
            weight: parseFloat(newWeight) || 1,
            category: selectedCategory,
        };

        if (editingIndex !== null) {
            setFacultyQuestions((prevQuestions) => {
                const updatedQuestions = [...prevQuestions];
                updatedQuestions[editingIndex] = questionWithWeight;
                return updatedQuestions;
            });
        } else {
            setFacultyQuestions((prevQuestions) => [...prevQuestions, questionWithWeight]);
        }

        setNewQuestion("");
        setNewWeight("");
        setEditingIndex(null);
    };

    // Edit faculty questions
    const handleEditQuestionForFaculty = (absoluteIndex) => {
        const questionToEdit = facultyQuestions[absoluteIndex];
        setNewQuestion(questionToEdit.text);
        setNewWeight(questionToEdit.weight);
        setSelectedCategory(questionToEdit.category);
        setEditingIndex(absoluteIndex);
    };

    // Delete faculty questions
    const deleteQuestion = (absoluteIndex) => {
        setFacultyQuestions((prevQuestions) => prevQuestions.filter((_, i) => i !== absoluteIndex));
    };

    // Save form for faculty
    const handleSaveForm = async () => {
        try {
            await setDoc(doc(db, "evaluationForms", "faculty"), {
                questions: facultyQuestions,
                categories: facultyCategories,
            });
            alert("Faculty evaluation form saved successfully!");
        } catch (error) {
            console.error("Error saving form:", error);
        }
    };

    const renderQuestionsByCategory = (questions, categories) => {
        return categories.map((category, categoryIndex) => (
            <div key={categoryIndex}>
                <h3>{category}</h3>
                <ul className="questions-list">
                    {questions.map((question, absoluteIndex) => {
                        if (question.category === category) {
                            return (
                                <li key={absoluteIndex}>
                                    {question.text} (Weight: {question.weight})
                                    <div className="operation-buttons">
                                        <button onClick={() => handleEditQuestionForFaculty(absoluteIndex)}>Edit</button>
                                        <button onClick={() => deleteQuestion(absoluteIndex)}>Delete</button>
                                    </div>
                                </li>
                            );
                        }
                        return null;
                    })}
                </ul>
            </div>
        ));
    };

    return (
           <div className="faculty-evaluation-page">
    <div className="faculty-evaluation-card">
        <h2 className="faculty-evaluation-header">Create or Edit Evaluation Form for Faculty</h2>

        <div className="faculty-category-section">
            <input
                className="faculty-category-input"
                type="text"
                value={newFacultyCategory}
                onChange={(e) => setNewFacultyCategory(e.target.value)}
                placeholder="Add or Edit category"
            />
            <button onClick={addOrEditCategoryForFaculty}>
                {editingCategoryIndex !== null ? "Update Category" : "Add Category"}
            </button>
        </div>

        <div className="faculty-question-form">
            <select
                className="faculty-evaluation-select"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
            >
                <option value="" disabled>Select a category</option>
                {facultyCategories.map((category, index) => (
                    <option key={index} value={category}>{category}</option>
                ))}
            </select>
        </div>

        <div className="faculty-questions-container">
            {facultyCategories.map((category, categoryIndex) => (
                <div key={categoryIndex} className="faculty-category-block">
                    <h3>{category}</h3>
                    <ul className="faculty-questions-list">
                        {(facultyQuestions || []).map((question, absoluteIndex) => {
                            if (question.category === category) {
                                return (
                                    <li key={absoluteIndex}>
                                        {question.text} (Weight: {question.weight})
                                        <div className="faculty-operation-buttons">
                                            <button className="faculty-edit-button" onClick={() => addOrEditQuestionForFaculty(absoluteIndex)}>Edit</button>
                                            <button className="faculty-delete-button" onClick={() => deleteQuestion(absoluteIndex)}>Delete</button>
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

        <div className="faculty-question-form">
            <textarea
                className="faculty-question-input"
                value={newQuestion}
                onChange={(e) => setNewQuestion(e.target.value)}
                placeholder={editingIndex !== null ? "Edit the question" : "Add a new question"}
            />
            <input
                type="number"
                className="faculty-weight-input"
                value={newWeight}
                onChange={(e) => setNewWeight(e.target.value)}
                placeholder="Set question weight"
            />
            <div className="faculty-buttons-container">
                <button className="faculty-save-button" onClick={addOrEditQuestionForFaculty}>
                    {editingIndex !== null ? "Update Question" : "Add Question"}
                </button>
                <button className="faculty-cancel-button" onClick={() => setNewQuestion("")}>Cancel</button>
            </div>
            <button className="faculty-save-button" onClick={handleSaveForm}>Save Faculty Form</button>
        </div>
    </div>
</div>

    );
};

export default FacultyEvaluationPage;
