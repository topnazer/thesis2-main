import React, { useState, useEffect, useCallback } from 'react';
import { getFirestore, doc, setDoc, getDoc } from "firebase/firestore";
import './deanevaluationpage.css';

const DeanEvaluationPage = () => {
    const [deanQuestions, setDeanQuestions] = useState([]);
    const [newQuestion, setNewQuestion] = useState("");
    const [newWeight, setNewWeight] = useState("");
    const [editingIndex, setEditingIndex] = useState(null);
    const [categories, setDeanCategories] = useState([]);
    const [newCategory, setNewDeanCategory] = useState("");
    const [categoryType, setDeanCategoryType] = useState("Multiple Choice");
    const [categoryOptions, setDeanCategoryOptions] = useState([]);
    const [newOption, setNewDeanOption] = useState("");
    const [selectedCategory, setSelectedDeanCategory] = useState("");
    const [editingCategoryIndex, setEditingDeanCategoryIndex] = useState(null);
    const [expirationDate, setExpirationDate] = useState('');

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

    const addOrEditCategory = () => {
        if (!newCategory.trim()) return;

        setDeanCategories((prevCategories) => {
            const updatedCategories = [...prevCategories];
            if (editingCategoryIndex !== null) {
                updatedCategories[editingCategoryIndex] = {
                    name: newCategory,
                    questions: updatedCategories[editingCategoryIndex].questions || [],
                    type: categoryType,
                    options: categoryOptions,
                };
            } else {
                updatedCategories.push({
                    name: newCategory,
                    questions: [],
                    type: categoryType,
                    options: categoryOptions,
                });
            }
            return updatedCategories;
        });

        resetCategoryState();
    };

    const resetCategoryState = () => {
        setNewDeanCategory("");
        setDeanCategoryType("Multiple Choice");
        setDeanCategoryOptions([]);
        setNewDeanOption("");
        setEditingDeanCategoryIndex(null);
    };

    const deleteCategory = (category) => {
        setDeanCategories((prevCategories) => prevCategories.filter((cat) => cat.name !== category.name));
    };

    const handleEditCategory = (index, category) => {
        setNewDeanCategory(category.name);
        setDeanCategoryType(category.type);
        setDeanCategoryOptions(category.options || []);
        setEditingDeanCategoryIndex(index);
    };

    const handleCategoryOptionsChange = (e) => {
        setNewDeanOption(e.target.value);
    };

    const addOption = () => {
        if (newOption.trim() && selectedCategory) {
            setDeanCategories((prevCategories) =>
                prevCategories.map((category) =>
                    category.name === selectedCategory
                        ? {
                              ...category,
                              options: [...(category.options || []), newOption.trim()],
                          }
                        : category
                )
            );
            setNewDeanOption("");
        }
    };

    const deleteOption = (index) => {
        if (selectedCategory) {
            setDeanCategories((prevCategories) =>
                prevCategories.map((category) =>
                    category.name === selectedCategory
                        ? {
                              ...category,
                              options: category.options.filter((_, i) => i !== index),
                          }
                        : category
                )
            );
        }
    };

    const addOrEditQuestion = () => {
        if (!newQuestion.trim() || !selectedCategory) return;

        const question = {
            text: newQuestion,
            weight: parseFloat(newWeight) || 1,
        };

        setDeanCategories((prevCategories) =>
            prevCategories.map((category) =>
                category.name === selectedCategory
                    ? {
                          ...category,
                          questions: editingIndex !== null
                              ? category.questions.map((q, i) => (i === editingIndex ? question : q))
                              : [...category.questions, question],
                      }
                    : category
            )
        );

        resetQuestionState();
    };

    const resetQuestionState = () => {
        setNewQuestion("");
        setNewWeight("");
        setEditingIndex(null);
    };

    const handleEditQuestion = (index) => {
        const question = categories
            .find((cat) => cat.name === selectedCategory)
            ?.questions[index];
        if (question) {
            setNewQuestion(question.text);
            setNewWeight(question.weight);
            setEditingIndex(index);
        }
    };

    const deleteQuestion = (index) => {
        setDeanCategories((prevCategories) =>
            prevCategories.map((category) =>
                category.name === selectedCategory
                    ? {
                          ...category,
                          questions: category.questions.filter((_, i) => i !== index),
                      }
                    : category
            )
        );
    };

    const handleSaveForm = async () => {
        try {
            const formRef = doc(db, "evaluationForms", "dean");
            await setDoc(formRef, {
                categories: categories.map((category) => ({
                    name: category.name,
                    type: category.type,
                    options: category.options || [],
                    questions: category.questions || [],
                })),
            });
            alert("Dean form saved successfully!");
        } catch (error) {
            console.error("Error saving form:", error);
        }
    };

    return (
        <div className="dean-evaluation-page">
            {/* Left Container: Dean Evaluation Form */}
            <div className="dean-evaluation-card">
                <h1 className="dean-evaluation-header">Dean Evaluation Form</h1>
    
                {/* Add/Edit Category */}
                <div className="dean-category-section">
                    <h2>{editingCategoryIndex !== null ? "Edit Category" : "Add Category"}</h2>
                    <input
                        className="dean-category-input"
                        type="text"
                        value={newCategory}
                        onChange={(e) => setNewDeanCategory(e.target.value)}
                        placeholder="Add category"
                    />
                    <select
                        className="dean-evaluation-select"
                        value={categoryType}
                        onChange={(e) => setDeanCategoryType(e.target.value)}
                    >
                        <option value="Multiple Choice">Multiple Choice</option>
                        <option value="Checkbox">Checkbox</option>
                        <option value="Rating">Rating</option>
                    </select>
                    <div className="dean-buttons-container">
                        <button
                            className={editingCategoryIndex !== null ? "dean-edit-button" : "dean-save-button"}
                            onClick={addOrEditCategory}
                        >
                            {editingCategoryIndex !== null ? "Update Category" : "Add Category"}
                        </button>
                    </div>
                </div>
    
                {/* Add/Edit Question */}
                <div className="dean-question-form">
                    <h2>Select Category to Edit</h2>
                    <select
                        className="dean-evaluation-select"
                        value={selectedCategory}
                        onChange={(e) => setSelectedDeanCategory(e.target.value)}
                    >
                        <option value="" disabled>
                            Select a category
                        </option>
                        {categories.map((category, index) => (
                            <option key={index} value={category.name}>
                                {category.name}
                            </option>
                        ))}
                    </select>
                    <textarea
                        className="dean-question-input"
                        value={newQuestion}
                        onChange={(e) => setNewQuestion(e.target.value)}
                        placeholder="Add Question"
                    />
                    {(categories.find((cat) => cat.name === selectedCategory)?.type === "Multiple Choice" ||
                        categories.find((cat) => cat.name === selectedCategory)?.type === "Checkbox") && (
                        <>
                            <input
                                className="dean-category-input"
                                type="text"
                                value={newOption}
                                onChange={handleCategoryOptionsChange}
                                placeholder="Enter new option"
                            />
                            <button className="dean-save-button" onClick={addOption}>
                                Add Option
                            </button>
                            <ul>
                                {categoryOptions.map((option, index) => (
                                    <li key={index}>
                                        {option}
                                        <button
                                            className="dean-delete-button"
                                            onClick={() => deleteOption(index)}
                                        >
                                            Delete
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </>
                    )}
                    <button
                        className={editingIndex !== null ? "dean-edit-button" : "dean-save-button"}
                        onClick={addOrEditQuestion}
                    >
                        {editingIndex !== null ? "Update Question" : "Add Question"}
                    </button>
                </div>
    
                {/* Expiration Date */}
                <div className="dean-question-form">
                    <h2>Expiration Date:</h2>
                    <input
                        className='dean-expiration-input'
                        type="date"
                        value={expirationDate}
                        onChange={(e) => setExpirationDate(e.target.value)}
                    />
                    <button className="dean-save-button" onClick={handleSaveForm}>
                        Save Form
                    </button>
                </div>
            </div>
    
            {/* Right Container: Dean Evaluation Preview */}
            <div className="dean-evaluation-preview">
                {categories.map((category, index) => (
                    <div key={index} className="dean-category-block">
                        <h3 className="dean-category-title">
                            {category.name} ({category.type})
                            <div className="dean-operation-buttons">
                                <button
                                    className="dean-delete-button"
                                    onClick={() => deleteCategory(category)}
                                >
                                    Delete Category
                                </button>
                                <button
                                    className="dean-edit-button"
                                    onClick={() => handleEditCategory(index, category)}
                                >
                                    Edit Category
                                </button>
                            </div>
                        </h3>
                        <ul>
                            {deanQuestions
                                .filter((q) => q.category === category.name)
                                .map((q, i) => (
                                    <li key={i} className="dean-category-section">
                                        <div className="question-content">
                                            <p>{q.text}</p>
                                            <span className="question-weight">Weight: {q.weight}</span>
                                        </div>
                                        <div className="dean-buttons-container">
                                            <button
                                                className="dean-edit-button"
                                                onClick={() => handleEditQuestion(i)}
                                            >
                                                Edit
                                            </button>
                                            <button
                                                className="dean-delete-button"
                                                onClick={() => deleteQuestion(i)}
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    </li>
                                ))}
                        </ul>
                    </div>
                ))}
            </div>
        </div>
    );    
    
};

export default DeanEvaluationPage;
