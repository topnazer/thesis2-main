import React, { useState, useEffect } from 'react';
import { getFirestore, doc, getDoc, setDoc } from "firebase/firestore";
import './deanevaluationpage.css';

const DeanEvaluationPage = () => {
    const [deanQuestions, setDeanQuestions] = useState([]);
    const [newQuestion, setNewQuestion] = useState("");
    const [newWeight, setNewWeight] = useState("");
    const [editingIndex, setEditingIndex] = useState(null);
    const [deanCategories, setDeanCategories] = useState([]);
    const [newDeanCategory, setNewDeanCategory] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("");
    const [editingCategoryIndex, setEditingCategoryIndex] = useState(null);

    const db = getFirestore();

    useEffect(() => {
        const fetchForms = async () => {
            try {
                const deanDoc = await getDoc(doc(db, "evaluationForms", "dean"));
                if (deanDoc.exists()) {
                    const data = deanDoc.data();
                    setDeanQuestions(data.questions || []);
                    setDeanCategories(data.categories || []);
                }
            } catch (error) {
                console.error("Error fetching evaluation forms:", error);
            }
        };

        fetchForms();
    }, [db]);

    // Add or edit category for dean
    const addOrEditCategoryForDean = () => {
        if (!newDeanCategory.trim()) return;

        if (editingCategoryIndex !== null) {
            setDeanCategories((prevCategories) => {
                const updatedCategories = [...prevCategories];
                const oldCategory = updatedCategories[editingCategoryIndex];
                updatedCategories[editingCategoryIndex] = newDeanCategory;

                setDeanQuestions((prevQuestions) => {
                    return prevQuestions.map((question) =>
                        question.category === oldCategory
                            ? { ...question, category: newDeanCategory }
                            : question
                    );
                });

                return updatedCategories;
            });
        } else {
            setDeanCategories((prevCategories) => [...prevCategories, newDeanCategory]);
        }

        setNewDeanCategory("");
        setEditingCategoryIndex(null);
    };

    // Delete category for dean
    const deleteCategory = (category) => {
        setDeanCategories((prevCategories) => prevCategories.filter((cat) => cat !== category));
        setDeanQuestions((prevQuestions) => prevQuestions.filter((question) => question.category !== category));
    };

    const handleEditCategory = (index, category) => {
        setNewDeanCategory(category);
        setEditingCategoryIndex(index);
    };

    // Add or edit dean questions
    const addOrEditQuestionForDean = () => {
        if (!newQuestion.trim() || !selectedCategory) return;

        const questionWithWeight = {
            text: newQuestion,
            weight: parseFloat(newWeight) || 1,
            category: selectedCategory,
        };

        if (editingIndex !== null) {
            setDeanQuestions((prevQuestions) => {
                const updatedQuestions = [...prevQuestions];
                updatedQuestions[editingIndex] = questionWithWeight;
                return updatedQuestions;
            });
        } else {
            setDeanQuestions((prevQuestions) => [...prevQuestions, questionWithWeight]);
        }

        setNewQuestion("");
        setNewWeight("");
        setEditingIndex(null);
    };

    // Edit dean questions
    const handleEditQuestionForDean = (absoluteIndex) => {
        const questionToEdit = deanQuestions[absoluteIndex];
        setNewQuestion(questionToEdit.text);
        setNewWeight(questionToEdit.weight);
        setSelectedCategory(questionToEdit.category);
        setEditingIndex(absoluteIndex);
    };

    // Delete dean questions
    const deleteQuestion = (absoluteIndex) => {
        setDeanQuestions((prevQuestions) => prevQuestions.filter((_, i) => i !== absoluteIndex));
    };

    // Save form for dean
    const handleSaveForm = async () => {
        try {
            await setDoc(doc(db, "evaluationForms", "dean"), {
                questions: deanQuestions,
                categories: deanCategories,
            });
            alert("Dean evaluation form saved successfully!");
        } catch (error) {
            console.error("Error saving form:", error);
        }
    };

    const renderQuestionsByCategory = (questions, categories) => {
        return categories.map((category, categoryIndex) => (
            <div key={categoryIndex} className="category-section">
                <h3 className="category-title">{category}</h3>
                {questions
                    .filter((question) => question.category === category)
                    .map((question, absoluteIndex) => (
                        <div key={absoluteIndex} className="question-item">
                            <div className="question-text">
                                <strong>{question.text}</strong> (Weight: {question.weight})
                            </div>
                            <div className="question-actions">
                                <button onClick={() => handleEditQuestionForDean(absoluteIndex)}>Edit</button>
                                <button onClick={() => deleteQuestion(absoluteIndex)}>Delete</button>
                            </div>
                        </div>
                    ))}
            </div>
        ));
    };

    return (
           <div className="dean-evaluation-page">
    <div className="dean-evaluation-card">
        <h2 className="dean-evaluation-header">Create or Edit Evaluation Form for Dean</h2>

        <div className="dean-category-section">
            <input
                className="dean-category-input"
                type="text"
                value={newDeanCategory}
                onChange={(e) => setNewDeanCategory(e.target.value)}
                placeholder="Add or Edit category"
            />
            <button onClick={addOrEditCategoryForDean}>
                {editingCategoryIndex !== null ? "Update Category" : "Add Category"}
            </button>
        </div>

        <div className="dean-question-form">
            <select
                className="dean-evaluation-select"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
            >
                <option value="" disabled>Select a category</option>
                {deanCategories.map((category, index) => (
                    <option key={index} value={category}>{category}</option>
                ))}
            </select>
        </div>

        <div className="dean-questions-container">
            {deanCategories.map((category, categoryIndex) => (
                <div key={categoryIndex} className="dean-category-block">
                    <h3>{category}</h3>
                    <ul className="dean-questions-list">
                        {(deanQuestions || []).map((question, absoluteIndex) => {
                            if (question.category === category) {
                                return (
                                    <li key={absoluteIndex}>
                                        {question.text} (Weight: {question.weight})
                                        <div className="dean-operation-buttons">
                                            <button className="dean-edit-button" onClick={() => addOrEditQuestionForDean(absoluteIndex)}>Edit</button>
                                            <button className="dean-delete-button" onClick={() => deleteQuestion(absoluteIndex)}>Delete</button>
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

        <div className="dean-question-form">
            <textarea
                className="dean-question-input"
                value={newQuestion}
                onChange={(e) => setNewQuestion(e.target.value)}
                placeholder={editingIndex !== null ? "Edit the question" : "Add a new question"}
            />
            <input
                type="number"
                className="dean-weight-input"
                value={newWeight}
                onChange={(e) => setNewWeight(e.target.value)}
                placeholder="Set question weight"
            />
            <div className="dean-buttons-container">
                <button className="dean-save-button" onClick={addOrEditQuestionForDean}>
                    {editingIndex !== null ? "Update Question" : "Add Question"}
                </button>
                <button className="dean-cancel-button" onClick={() => setNewQuestion("")}>Cancel</button>
            </div>
            <button className="dean-save-button" onClick={handleSaveForm}>Save Dean Form</button>
        </div>
    </div>
</div>

    );
};

export default DeanEvaluationPage;
