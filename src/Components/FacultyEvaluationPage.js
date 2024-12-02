import React, { useState, useEffect, useCallback } from 'react';
import { getFirestore, doc, setDoc, getDoc } from "firebase/firestore";
import './facultyevaluationpage.css';

const FacultyEvaluationPage = () => {
    const [newQuestion, setNewQuestion] = useState("");
    const [newWeight, setNewWeight] = useState("");
    const [editingIndex, setEditingIndex] = useState(null);
    const [categories, setFacultyCategories] = useState([]);
    const [newCategory, setNewFacultyCategory] = useState("");
    const [categoryType, setFacultyCategoryType] = useState("Multiple Choice");
    const [categoryOptions, setFacultyCategoryOptions] = useState([]);
    const [newOption, setFacultyOption] = useState("");
    const [selectedCategory, setSelectedFacultyCategory] = useState("");
    const [editingCategoryIndex, setEditingFacultyCategoryIndex] = useState(null);
    const [expirationDate, setExpirationDate] = useState("");
    const [editingOptionIndex, setEditingOptionIndex] = useState(null);

    const db = getFirestore();

    const fetchEvaluationData = useCallback(async () => {
        try {
            const formRef = doc(db, "evaluationForms", "faculty");
            const formSnap = await getDoc(formRef);
            if (formSnap.exists()) {
                const data = formSnap.data();
                setFacultyCategories(data.categories || []);
                setExpirationDate(data.expirationDate?.toDate() || "");
            }
        } catch (error) {
            console.error("Error fetching form data:", error);
        }
    }, [db]);

    useEffect(() => {
        fetchEvaluationData();
    }, [fetchEvaluationData]);

    const addOrEditCategory = async () => {
        if (!newCategory.trim()) return;

        try {
            const updatedCategories = [...categories];
            if (editingCategoryIndex !== null) {
                updatedCategories[editingCategoryIndex] = {
                    ...updatedCategories[editingCategoryIndex],
                    name: newCategory,
                    type: categoryType,
                    options: categoryOptions,
                };
            } else {
                const newCategoryData = {
                    id: Date.now(),
                    name: newCategory,
                    type: categoryType,
                    options: categoryOptions,
                    questions: [],
                };
                updatedCategories.push(newCategoryData);
            }

            const formRef = doc(db, "evaluationForms", "faculty");
            await setDoc(formRef, {
                categories: updatedCategories,
                expirationDate: expirationDate || null,
            });

            setFacultyCategories(updatedCategories);
            resetCategoryState();
        } catch (error) {
            console.error('Error saving category:', error);
        }
    };

    const resetCategoryState = () => {
        setNewFacultyCategory("");
        setFacultyCategoryType("Multiple Choice");
        setFacultyCategoryOptions([]);
        setFacultyOption("");
        setEditingFacultyCategoryIndex(null);
    };

    const deleteCategory = async (categoryId) => {
        try {
            const updatedCategories = categories.filter((category) => category.id !== categoryId);
            const formRef = doc(db, "evaluationForms", "faculty");
            await setDoc(formRef, {
                categories: updatedCategories,
                expirationDate: expirationDate || null,
            });
            setFacultyCategories(updatedCategories);
        } catch (error) {
            console.error('Error deleting category:', error);
        }
    };

    const handleEditCategory = (index, category) => {
        setNewFacultyCategory(category.name);
        setFacultyCategoryType(category.type);
        setFacultyCategoryOptions(category.options || []);
        setEditingFacultyCategoryIndex(index);
    };

    const handleCategoryOptionsChange = (e) => {
        setFacultyOption(e.target.value);
    };

    const addOrEditOption = () => {
        if (!newOption.trim() || !selectedCategory) return;

        const updatedCategories = categories.map((category) =>
            category.name === selectedCategory
                ? {
                      ...category,
                      options:
                          editingOptionIndex !== null
                              ? category.options.map((option, index) =>
                                    index === editingOptionIndex ? newOption.trim() : option
                                )
                              : [...(category.options || []), newOption.trim()],
                  }
                : category
        );

        setFacultyCategories(updatedCategories);
        resetOptionState();
    };

    const resetOptionState = () => {
        setFacultyOption("");
        setEditingOptionIndex(null);
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

        const updatedCategories = categories.map((category) =>
            category.name === selectedCategory
                ? {
                      ...category,
                      questions:
                          editingIndex !== null
                              ? category.questions.map((q, i) =>
                                    i === editingIndex
                                        ? { text: newQuestion, weight: parseFloat(newWeight) || 1 }
                                        : q
                                )
                              : [
                                    ...category.questions,
                                    { text: newQuestion, weight: parseFloat(newWeight) || 1 },
                                ],
                  }
                : category
        );

        setFacultyCategories(updatedCategories);
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
        setFacultyCategories((prevCategories) =>
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
            const formRef = doc(db, "evaluationForms", "faculty");
            await setDoc(formRef, {
                categories: categories.map((category) => ({
                    id: category.id || Date.now(),
                    name: category.name,
                    type: category.type,
                    options: category.options || [],
                    questions: category.questions || [],
                })),
                expirationDate: expirationDate || null,
            });
            alert("Form saved successfully!");
        } catch (error) {
            console.error("Error saving form:", error);
        }
    };

    return (
        <div className="faculty-evaluation-container">
            <div className="faculty-evaluation-form">
                <h1>Faculty Evaluation Form</h1>
                <div className="category-input-section">
                    <h2>{editingCategoryIndex !== null ? "Edit Category" : "Add Category"}</h2>
                    <input
                        type="text"
                        value={newCategory}
                        onChange={(e) => setNewFacultyCategory(e.target.value)}
                        placeholder="Add category"
                    />
                    <select
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
                        value={newQuestion}
                        onChange={(e) => setNewQuestion(e.target.value)}
                        placeholder="Add Question"
                    />
                    <button onClick={addOrEditQuestion}>
                        {editingIndex !== null ? "Update Question" : "Add Question"}
                    </button>
                    {(categories.find((cat) => cat.name === selectedCategory)?.type === "Multiple Choice" ||
                        categories.find((cat) => cat.name === selectedCategory)?.type === "Checkbox") && (
                        <>
                            <input
                                type="text"
                                value={newOption}
                                onChange={handleCategoryOptionsChange}
                                placeholder="Enter new option"
                            />
                            <button onClick={addOrEditOption}>
                                {editingOptionIndex !== null ? "Update Option" : "Add Option"}
                            </button>
                        </>
                    )}
                </div>
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
            <div className="faculty-preview">
                <h1>Faculty Evaluation Form Preview</h1>
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
                                onClick={() => handleEditCategory(categories.findIndex(c => c.id === category.id), category)}
                                className="edit-category-btn"
                            >
                                Edit Category
                            </button>
                            <button
                                onClick={() => deleteCategory(category.id)}
                                className="delete-category-btn"
                            >
                                Delete Category
                            </button>
                        </div>
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
                                                        setFacultyOption(option);
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
