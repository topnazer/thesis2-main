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

    const addOrEditCategoryForDean = () => {
        if (!newDeanCategory.trim()) return;

        setDeanCategories(prevCategories => {
            const updatedCategories = [...prevCategories];
            if (editingCategoryIndex !== null) {
                const oldCategory = updatedCategories[editingCategoryIndex];
                updatedCategories[editingCategoryIndex] = newDeanCategory;
                setDeanQuestions(prevQuestions => 
                    prevQuestions.map(question =>
                        question.category === oldCategory
                            ? { ...question, category: newDeanCategory }
                            : question
                    )
                );
            } else {
                updatedCategories.push(newDeanCategory);
            }
            return updatedCategories;
        });

        resetCategoryState();
    };

    const resetCategoryState = () => {
        setNewDeanCategory("");
        setEditingCategoryIndex(null);
    };

    const deleteCategory = (category) => {
        setDeanCategories(prevCategories => prevCategories.filter(cat => cat !== category));
        setDeanQuestions(prevQuestions => prevQuestions.filter(question => question.category !== category));
    };

    const handleEditCategory = (index, category) => {
        setNewDeanCategory(category);
        setEditingCategoryIndex(index);
    };

    const addOrEditQuestionForDean = () => {
        if (!newQuestion.trim() || !selectedCategory) return;

        const questionWithWeight = {
            text: newQuestion,
            weight: parseFloat(newWeight) || 1,
            category: selectedCategory,
        };

        setDeanQuestions(prevQuestions => {
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

    const handleEditQuestionForDean = (absoluteIndex) => {
        const questionToEdit = deanQuestions[absoluteIndex];
        setNewQuestion(questionToEdit.text);
        setNewWeight(questionToEdit.weight);
        setSelectedCategory(questionToEdit.category);
        setEditingIndex(absoluteIndex);
    };

    const deleteQuestion = (absoluteIndex) => {
        setDeanQuestions(prevQuestions => prevQuestions.filter((_, i) => i !== absoluteIndex));
    };

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

    const renderQuestionsByCategory = () => {
        return deanCategories.map((category, categoryIndex) => (
            <div key={categoryIndex}>
                <h3>{category}
                    <button onClick={() => deleteCategory(category)} className="delete-category-btn">
                        Delete Category
                    </button>
                </h3>
                <ul className="questions-list">
                    {deanQuestions.map((question, absoluteIndex) => {
                        if (question.category === category) {
                            return (
                                <div key={absoluteIndex} className="question-item">
                                    {question.text}
                                    <div className="operation-buttons">
                                        <button onClick={() => handleEditQuestionForDean(absoluteIndex)}>Edit</button>
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
            <div className="faculty-evaluation-form">
                <h2>Create Evaluation Form for Dean</h2>
                
                <div className="category-section">
                    <h3>Add Category</h3>
                    <input
                        type="text"
                        value={newDeanCategory}
                        onChange={(e) => setNewDeanCategory(e.target.value)}
                        placeholder="Add or Edit category"
                        className="input-category"
                    />
                    <button onClick={addOrEditCategoryForDean}>
                        {editingCategoryIndex !== null ? "Update Category" : "Add Category"}
                    </button>
                </div>

                <div className="question-section">
                    <h3>Create Question</h3>
                    <select
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                        className="select-category"
                    >
                        <option value="" disabled>Select a category</option>
                        {deanCategories.map((category, index) => (
                            <option key={index} value={category}>{category}</option>
                        ))}
                    </select>
                    <textarea
                        value={newQuestion}
                        onChange={(e) => setNewQuestion(e.target.value)}
                        placeholder={editingIndex !== null ? "Edit the question" : "Add a new question"}
                        className="input-question"
                    />
                    <input
                        type="number"
                        value={newWeight}
                        onChange={(e) => setNewWeight(e.target.value)}
                        placeholder="Set question weight"
                        className="input-category"
                    />
                    <button onClick={addOrEditQuestionForDean}>
                        {editingIndex !== null ? "Update Question" : "Add Question"}
                    </button>
                </div>
                <button onClick={handleSaveForm} className="save-form-btn">Save Dean Form</button>
            </div>

            <div className="faculty-evaluation-preview">
                {renderQuestionsByCategory()}
            </div>
        </div>
    );
};

export default DeanEvaluationPage;
