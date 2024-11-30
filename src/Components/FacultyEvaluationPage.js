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
                updatedCategories.push({ name: newCategory, type: categoryType, options: categoryOptions });
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
        setFacultyCategories((prevCategories) => prevCategories.filter((cat) => cat.name !== category.name));
        setFacultyQuestions((prevQuestions) =>
            prevQuestions.filter((question) => question.category !== category.name)
        );
    };

    const handleEditCategory = (index, category) => {
        setNewFacultyCategory(category.name);
        setFacultyCategoryType(category.type);
        setFacultyCategoryOptions(category.options || []);
        setEditingFacultyCategoryIndex(index);
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
            await setDoc(formRef, {
                categories: categories.map((category) => ({
                    name: category.name,
                    type: category.type,
                    options: category.options || [],  
                    questions: facultyQuestions.filter((q) => q.category === category.name),
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
                            {categoryOptions.map((option, index) => (
                                <li key={index}>
                                    {option}
                                    <button onClick={() => deleteOption(index)}>Delete</button>
                                </li>
                            ))}
                        </ul>
                    </>
                ) : null}
                <button onClick={addOrEditQuestion}>
                    {editingIndex !== null ? "Update Question" : "Add Question"}
                </button>
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
    
        {/* Right Container: Faculty Preview */}
        <div className="faculty-evaluation-preview">
            {categories.map((category, index) => (
                <div key={index} className="category-preview-section">
                    <h3>
                        {category.name} ({category.type})
                        <button className="delete-category-btn" onClick={() => deleteCategory(category)}>
                            Delete Category
                        </button>
                        <button className="operation-buttons" onClick={() => handleEditCategory(index, category)}>
                            Edit Category
                        </button>
                    </h3>
                    <ul>
                        {facultyQuestions
                            .filter((q) => q.category === category.name)
                            .map((q, i) => (
                                <li key={i} className="question-item">
                                    <div className="question-content">
                                        <p>{q.text}</p>
                                        <span className="question-weight">Weight: {q.weight}</span>
                                    </div>
                                    <div className="question-actions">
                                        <button onClick={() => handleEditQuestion(i)}>Edit</button>
                                        <button onClick={() => deleteQuestion(i)}>Delete</button>
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

export default FacultyEvaluationPage;
