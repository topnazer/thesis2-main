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

    const addOrEditCategoryForFaculty = () => {
        if (!newFacultyCategory.trim()) return;

        setFacultyCategories(prevCategories => {
            const updatedCategories = [...prevCategories];
            if (editingCategoryIndex !== null) {
                const oldCategory = updatedCategories[editingCategoryIndex];
                updatedCategories[editingCategoryIndex] = newFacultyCategory;
                setFacultyQuestions(prevQuestions => 
                    prevQuestions.map(question =>
                        question.category === oldCategory
                            ? { ...question, category: newFacultyCategory }
                            : question
                    )
                );
            } else {
                updatedCategories.push(newFacultyCategory);
            }
            return updatedCategories;
        });

        resetCategoryState();
    };

    const resetCategoryState = () => {
        setNewFacultyCategory("");
        setEditingCategoryIndex(null);
    };

    const deleteCategory = (category) => {
        setFacultyCategories(prevCategories => prevCategories.filter(cat => cat !== category));
        setFacultyQuestions(prevQuestions => prevQuestions.filter(question => question.category !== category));
    };

    const handleEditCategory = (index, category) => {
        setNewFacultyCategory(category);
        setEditingCategoryIndex(index);
    };

    const addOrEditQuestionForFaculty = () => {
        if (!newQuestion.trim() || !selectedCategory) return;

        const questionWithWeight = {
            text: newQuestion,
            weight: parseFloat(newWeight) || 1,
            category: selectedCategory,
        };

        setFacultyQuestions(prevQuestions => {
            if (editingIndex !== null) {
                const updatedQuestions = [...prevQuestions];
                updatedQuestions[editingIndex] = questionWithWeight;
                return updatedQuestions;
            }
            return [...prevQuestions, questionWithWeight];
        });

        resetQuestionState();
    };

    const resetQuestionState = () => {
        setNewQuestion("");
        setNewWeight("");
        setEditingIndex(null);
    };

    const handleEditQuestionForFaculty = (absoluteIndex) => {
        const questionToEdit = facultyQuestions[absoluteIndex];
        setNewQuestion(questionToEdit.text);
        setNewWeight(questionToEdit.weight);
        setSelectedCategory(questionToEdit.category);
        setEditingIndex(absoluteIndex);
    };

    const deleteQuestion = (absoluteIndex) => {
        setFacultyQuestions(prevQuestions => prevQuestions.filter((_, i) => i !== absoluteIndex));
    };

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

    const renderQuestionsByCategory = () => {
        return facultyCategories.map((category, categoryIndex) => (
            <div key={categoryIndex}>
                <h3>{category}
                    <button onClick={() => deleteCategory(category)} style={{ marginLeft: '10px', color: 'red' }}>
                        Delete Category
                    </button>
                </h3>
                <ul className="questions-list">
                    {facultyQuestions.map((question, absoluteIndex) => {
                        if (question.category === category) {
                            return (
                                <div key={absoluteIndex}>
                                    {question.text} (Weight: {question.weight})
                                    <div className="operation-buttons">
                                        <button onClick={() => handleEditQuestionForFaculty(absoluteIndex)}>Edit</button>
                                        <button onClick={() => deleteQuestion(absoluteIndex)}>Delete</button>
                                    </div>
                                </div>
                            );
                        }
                        return null;
                    })}
                </ul>
            </div>
        ));
    };

    return (
        <div className="faculty-evaluation-container">
                <div className="faculty-left">
                <div className="question-tool">
                <h2>Create or Edit Evaluation Form for Faculty</h2>
                <div className="faculty-category-section">
                    <div className='faculty-category'>
                    <h3> ADD CATEGORY</h3>
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
                    <div>
                        <h3>CREATE QUESTION</h3>
                    <div className="faculty-question-form">
                    <textarea
                        className="faculty-question-input"
                        value={newQuestion}
                        onChange={(e) => setNewQuestion(e.target.value)}
                        placeholder={editingIndex !== null ? "Edit the question" : "Add a new question"}
                    />
                    <div className="faculty-buttons-container">
                        <button className="faculty-save-button" onClick={addOrEditQuestionForFaculty}>
                            {editingIndex !== null ? "Update Question" : "Add Question"}
                        </button>
                        
                    </div>
                    </div>
                    <button className="faculty-save-button" onClick={handleSaveForm}>Save Faculty Form</button>
                </div>
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
                </div>
                </div>

                <div className="faculty-right">
                <div className="faculty-questions">
                    {renderQuestionsByCategory()}
                </div>

                </div>
           </div>
       
    );
};

export default FacultyEvaluationPage;