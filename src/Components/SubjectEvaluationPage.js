import React, { useState, useEffect, useCallback } from 'react';
import { getFirestore, doc, setDoc, getDoc } from "firebase/firestore";
import './subjectevaluationpage.css';

const SubjectEvaluationPage = () => {
    const [subjectQuestion, setSubjectQuestion] = useState("");
    const [newWeight, setNewWeight] = useState("");
    const [editingIndex, setEditingIndex] = useState(null);
    const [categories, setCategories] = useState([]);
    const [newCategory, setNewCategory] = useState("");
    const [categoryType, setCategoryType] = useState("Multiple Choice");
    const [categoryOptions, setCategoryOptions] = useState([]);
    const [newOption, setNewOption] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("");
    const [editingCategoryIndex, setEditingCategoryIndex] = useState(null);
    const [expirationDate, setExpirationDate] = useState("");
    const [editingOptionIndex, setEditingOptionIndex] = useState(null);

    const db = getFirestore();

    const fetchEvaluationData = useCallback(async () => {
        try {
            const formRef = doc(db, "evaluationForms", "subject");
            const formSnap = await getDoc(formRef);
            if (formSnap.exists()) {
                setCategories(formSnap.data().categories || []);
                setExpirationDate(formSnap.data().expirationDate?.toDate() || "");
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
            const formRef = doc(db, "evaluationForms", "subject");
            const formSnap = await getDoc(formRef);
            
            let updatedCategories = formSnap.exists() ? formSnap.data().categories || [] : [];
    
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
    
            await setDoc(formRef, {
                categories: updatedCategories,
                expirationDate: expirationDate || null,
            });
    
            setCategories(updatedCategories); 
    
            resetCategoryState();
        } catch (error) {
            console.error("Error saving category:", error);
        }
    };
    

    const resetCategoryState = () => {
        setNewCategory("");
        setCategoryType("Multiple Choice");
        setCategoryOptions([]);
        setNewOption("");
        setEditingCategoryIndex(null);
    };

    const deleteCategory = async (categoryId) => {
        try {
            const formRef = doc(db, "evaluationForms", "subject");
            const formSnap = await getDoc(formRef);
    
            let updatedCategories = formSnap.exists() ? formSnap.data().categories || [] : [];
    
           
            updatedCategories = updatedCategories.filter((category) => category.id !== categoryId);
    
            await setDoc(formRef, {
                categories: updatedCategories,
                expirationDate: expirationDate || null,
            });
    
            setCategories(updatedCategories); 
        } catch (error) {
            console.error("Error deleting category:", error);
        }
    };
    

    const handleEditCategory = (index, category) => {
        setNewCategory(category.name);
        setCategoryType(category.type);
        setCategoryOptions(category.options || []);
        setEditingCategoryIndex(index);
    };

    const handleCategoryOptionsChange = (e) => {
        setNewOption(e.target.value);
    };

    const addOrEditOption = () => {
        if (!newOption.trim()) return;

        if (editingOptionIndex !== null) {
            setCategories((prevCategories) =>
                prevCategories.map((category) =>
                    category.name === selectedCategory
                        ? {
                              ...category,
                              options: category.options.map((option, index) =>
                                  index === editingOptionIndex ? newOption.trim() : option
                              ),
                          }
                        : category
                )
            );
        } else {
            setCategories((prevCategories) =>
                prevCategories.map((category) =>
                    category.name === selectedCategory
                        ? {
                              ...category,
                              options: [...(category.options || []), newOption.trim()],
                          }
                        : category
                )
            );
        }

        resetOptionState();
    };

    const resetOptionState = () => {
        setNewOption("");
        setEditingOptionIndex(null);
    };

    const deleteOption = (index) => {
        if (selectedCategory) {
            setCategories((prevCategories) =>
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
        if (!subjectQuestion.trim() || !selectedCategory) return;

        const question = {
            text: subjectQuestion,
            weight: parseFloat(newWeight) || 1,
        };

        setCategories((prevCategories) =>
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
        setSubjectQuestion("");
        setNewWeight("");
        setEditingIndex(null);
    };

    const handleEditQuestion = (index) => {
        const question = categories
            .find((cat) => cat.name === selectedCategory)
            ?.questions[index];
        if (question) {
            setSubjectQuestion(question.text);
            setNewWeight(question.weight);
            setEditingIndex(index);
        }
    };

    const deleteQuestion = (index) => {
        setCategories((prevCategories) =>
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
            const formRef = doc(db, "evaluationForms", "subject");
            await setDoc(formRef, {
                categories: categories.map((category) => ({
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
        <div className="subject-evaluation-container">
            <div className="subject-form">
                <h1>Subject Evaluation Form</h1>
    
                <div className="category-input-section">
                    <h2>{editingCategoryIndex !== null ? "Edit Category" : "Add Category"}</h2>
                    <input
                        type="text"
                        value={newCategory}
                        onChange={(e) => setNewCategory(e.target.value)}
                        placeholder={
                            editingCategoryIndex !== null ? "Edit category name" : "Add category"
                        }
                    />
                    <select value={categoryType} onChange={(e) => setCategoryType(e.target.value)}>
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
                        onChange={(e) => setSelectedCategory(e.target.value)}
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
                        value={subjectQuestion}
                        onChange={(e) => setSubjectQuestion(e.target.value)}
                        placeholder="Add Question"
                    />
                    <button onClick={addOrEditQuestion}>
                        {editingIndex !== null ? "Update Question" : "Add Question"}
                    </button>
    
                    {categories.find((cat) => cat.name === selectedCategory)?.type ===
                        "Multiple Choice" ||
                    categories.find((cat) => cat.name === selectedCategory)?.type === "Checkbox" ? (
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
                    ) : null}
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
                    onClick={() => handleEditCategory(category.id, category)}
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
        
                        {category.questions.length > 0 && (
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
                        {category.options.length > 0 && (
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
                                                        setSelectedCategory(category.name);
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

export default SubjectEvaluationPage;