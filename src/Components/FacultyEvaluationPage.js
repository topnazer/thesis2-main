import React, { useState, useEffect, useCallback } from 'react';
import { getFirestore, doc, setDoc, getDoc } from "firebase/firestore";
import './facultyevaluationpage.css';

const FacultyEvaluationPage = () => {
    const [facultyQuestions, setFacultyQuestions] = useState([]);
    const [newQuestion, setNewQuestion] = useState("");
    const [newWeight, setNewWeight] = useState("");
    const [editingIndex, setEditingIndex] = useState(null);
    const [categories, setFacultyCategories] = useState([]);
    const [newCategory, setNewFacultyCategory] = useState("");
    const [categoryType, setFacultyCategoryType] = useState("Multiple Choice");
    const [categoryOptions, setFacultyCategoryOptions] = useState([]);
    const [newOption, setNewFacultyOption] = useState("");
    const [selectedCategory, setSelectedFacultyCategory] = useState("");
    const [editingCategoryIndex, setEditingFacultyCategoryIndex] = useState(null);
    const [expirationDate, setExpirationDate] = useState("");

    const db = getFirestore();

    useEffect(() => {
        const fetchForms = async () => {
            try {
                const facultyDoc = await getDoc(doc(db, "evaluationForms", "faculty"));
                if (facultyDoc.exists()) {
                    const data = facultyDoc.data();
                    setFacultyQuestions(data.questions || []);
                    setFacultyCategories(data.categories || []);
                    setExpirationDate(data.expirationDate?.toDate() || "");
                }
            } catch (error) {
                console.error("Error fetching evaluation forms:", error);
            }
        };
        fetchForms();
    }, [db]);

    const addOrEditCategory = () => {
        if (!newCategory.trim()) return;

        setFacultyCategories((prevCategories) => {
            const updatedCategories = [...prevCategories];
            if (editingCategoryIndex !== null) {
                updatedCategories[editingCategoryIndex] = {
                    id: updatedCategories[editingCategoryIndex].id || Date.now(), 
                    name: newCategory,
                    type: categoryType,
                    options: categoryOptions,
                };
                setFacultyQuestions((prevQuestions) =>
                    prevQuestions.map((question) =>
                        question.category === prevCategories[editingCategoryIndex].name
                            ? { ...question, category: newCategory }
                            : question
                    )
                );
            } else {
                updatedCategories.push({
                    id: Date.now(),
                    name: newCategory,
                    type: categoryType,
                    options: categoryOptions,
                });
            }
            return updatedCategories;
        });

        resetCategoryState();
    };

    const resetCategoryState = () => {
        setNewFacultyCategory("");
        setFacultyCategoryType("Multiple Choice");
        setFacultyCategoryOptions([]);
        setNewFacultyOption("");
        setEditingFacultyCategoryIndex(null);
    };

    const deleteCategory = (category) => {
        setFacultyCategories((prevCategories) => prevCategories.filter((cat) => cat.id !== category.id)); 
        setFacultyQuestions((prevQuestions) =>
            prevQuestions.filter((question) => question.category !== category.name)
        );
    };

    const handleCategoryOptionsChange = (e) => {
        setNewFacultyOption(e.target.value);
    };

    const addOption = () => {
        if (newOption.trim() && selectedCategory) {
            setFacultyCategories((prevCategories) =>
                prevCategories.map((category) =>
                    category.name === selectedCategory
                        ? {
                              ...category,
                              options: [...(category.options || []), newOption.trim()],
                          }
                        : category
                )
            );
            setNewFacultyOption("");
        }
    };

    const deleteOption = (index) => {
        if (selectedCategory) {
            setFacultyCategories((prevCategories) =>
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

        const question = { text: newQuestion, weight: parseFloat(newWeight) || 1, category: selectedCategory };

        setFacultyQuestions((prev) =>
            editingIndex !== null
                ? prev.map((q, i) => (i === editingIndex ? question : q))
                : [...prev, question]
        );

        resetQuestionState();
    };

    const resetQuestionState = () => {
        setNewQuestion("");
        setNewWeight("");
        setEditingIndex(null);
    };

    const handleEditQuestion = (index) => {
        const question = facultyQuestions[index];
        setNewQuestion(question.text);
        setNewWeight(question.weight);
        setSelectedFacultyCategory(question.category);
        setEditingIndex(index);
    };

    const deleteQuestion = (index) => {
        setFacultyQuestions(facultyQuestions.filter((_, i) => i !== index));
    };

    const handleSaveForm = async () => {
        try {
            const formRef = doc(db, "evaluationForms", "faculty");

            // Save data in the required structure
            await setDoc(formRef, {
                categories: categories.map((category) => ({
                    id: category.id || Date.now(), // Ensure each category has a unique ID
                    name: category.name,
                    type: category.type,
                    options: category.options || [],
                    questions: facultyQuestions.filter((q) => q.category === category.name).map(q => ({
                        text: q.text,
                        weight: q.weight,
                    })),
                })),
                expirationDate: expirationDate || null,
            });

            alert("Faculty form saved successfully!");
        } catch (error) {
            console.error("Error saving form:", error);
        }
    };

    return (
        <div className="faculty-evaluation-container">
            {/* Left Container: Faculty Form */}
            <div className="faculty-evaluation-form">
                <h1>Faculty Evaluation Form</h1>

                {/* Add/Edit Category */}
                <div className="category-input-section">
                    <h2>{editingCategoryIndex !== null ? "Edit Category" : "Add Category"}</h2>
                    <input
                        className="input-category"
                        type="text"
                        value={newCategory}
                        onChange={(e) => setNewFacultyCategory(e.target.value)}
                        placeholder="Add category"
                    />
                    <select
                        className="select-category"
                        value={categoryType}
                        onChange={(e) => setFacultyCategoryType(e.target.value)}
                    >
                        <option value="Multiple Choice">Multiple Choice</option>
                        <option value="Checkbox">Checkbox</option>
                        <option value="Rating">Rating</option>
                    </select>
                    <button onClick={addOrEditCategory}>
                        {editingCategoryIndex !== null ? "Update Category" : "Add Category"}
                    </button>
                </div>

                {/* Add/Edit Question */}
                <div className="question-input-section">
                    <h2>Select Category to Edit</h2>
                    <select
                        value={selectedCategory}
                        onChange={(e) => setSelectedFacultyCategory(e.target.value)}
                    >
                        <option value="" disabled>Select a category</option>
                        {categories.map((category, index) => (
                            <option key={index} value={category.name}>{category.name}</option>
                        ))}
                    </select>
                    <textarea
                        className="input-question"
                        value={newQuestion}
                        onChange={(e) => setNewQuestion(e.target.value)}
                        placeholder="Add Question"
                    />
                    <button onClick={addOrEditQuestion}>
                        {editingIndex !== null ? "Update Question" : "Add Question"}
                    </button>
                    {categories.find((cat) => cat.name === selectedCategory)?.type === "Multiple Choice" ||
                    categories.find((cat) => cat.name === selectedCategory)?.type === "Checkbox" ? (
                        <>
                            <input
                                className="input-category"
                                type="text"
                                value={newOption}
                                onChange={handleCategoryOptionsChange}
                                placeholder="Enter new option"
                            />
                            <button onClick={addOption}>Add Option</button>
                            <ul>
                                {(categoryOptions || []).map((option, index) => (
                                    <li key={index}>
                                        {option}
                                        <button onClick={() => deleteOption(index)}>Delete</button>
                                    </li>
                                ))}
                            </ul>
                        </>
                    ) : null}
                </div>

                {/* Expiration Date */}
                <div className="expiration-date-section">
                    <h2>Expiration Date:</h2>
                    <input
                        type="date"
                        value={expirationDate}
                        onChange={(e) => setExpirationDate(e.target.value)}
                    />
                    <button onClick={handleSaveForm}>Save Form</button>
                </div>
            </div>

            <div className="subject-preview">
                <h1>Subject Evaluation Form Preview</h1>

                <div>
                    <h3>Expiration Date:</h3>
                    <p>{expirationDate || "Not Set"}</p>
                </div>

                {categories.map((category) => (
    <div key={category.id} className="category-preview">  
        <h2>
            Category: {category.name} ({category.type})
        </h2>

        <div className="edit-category-button">
            <button
                onClick={() => {
                    setSelectedFacultyCategory(category.name);
                    setEditingFacultyCategoryIndex(categories.findIndex(c => c.id === category.id));  
                }}
                className="edit-category-btn"
            >
                Edit Category
            </button>
            <button
                onClick={() => deleteCategory(category)} 
                className="delete-category-btn"
            >
                Delete Category
            </button>
        </div>

                        {/* Display Questions */}
                        {category.questions && category.questions.length > 0 && (
                            <div className="questions-preview">
                                <h3>Questions:</h3>
                                <ul>
                                    {category.questions.map((question, i) => (
                                        <li key={i}>
                                            <span>Question: {question.text}</span>
                                            <div className="question-actions">
                                                <button onClick={() => handleEditQuestion(i)}>
                                                    Edit
                                                </button>
                                                <button onClick={() => deleteQuestion(i)}>
                                                    Delete
                                                </button>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {category.options && category.options.length > 0 && (
                            <div className="options-preview">
                                <h3>Options:</h3>
                                <ul>
                                    {category.options.map((option, i) => (
                                        <li key={i}>
                                            <span>{option}</span>
                                            <div className="option-actions">
                                                <button
                                                    onClick={() => {
                                                        setNewOption(option);
                                                        setEditingOptionIndex(i);
                                                        setSelectedFacultyCategory(category.name);
                                                    }}
                                                >
                                                    Edit
                                                </button>
                                                <button onClick={() => deleteOption(i)}>Delete</button>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default FacultyEvaluationPage;
