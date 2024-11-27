import React, { useState, useEffect, useCallback } from 'react';
import { getFirestore, doc, setDoc, getDoc } from "firebase/firestore";
import './subjectevaluationpage.css';

const SubjectEvaluationPage = () => {
    const [evaluationQuestions, setEvaluationQuestions] = useState([]);
    const [newQuestion, setNewQuestion] = useState("");
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

    const db = getFirestore();

    const fetchEvaluationData = useCallback(async () => {
        try {
            const formRef = doc(db, "evaluationForms", "subject");
            const formSnap = await getDoc(formRef);
            if (formSnap.exists()) {
                setEvaluationQuestions(formSnap.data().questions || []);
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

    const addOrEditCategory = () => {
        if (!newCategory.trim()) return;

        setCategories((prevCategories) => {
            const updatedCategories = [...prevCategories];
            if (editingCategoryIndex !== null) {
                // Update category and type
                updatedCategories[editingCategoryIndex] = {
                    name: newCategory,
                    type: categoryType,
                    options: categoryOptions, // Save options for this category
                };
                setEvaluationQuestions((prevQuestions) =>
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
        setNewCategory("");
        setCategoryType("Multiple Choice");
        setCategoryOptions([]);
        setNewOption("");
        setEditingCategoryIndex(null);
    };

    const deleteCategory = (category) => {
        setCategories((prevCategories) => prevCategories.filter((cat) => cat.name !== category.name));
        setEvaluationQuestions((prevQuestions) =>
            prevQuestions.filter((question) => question.category !== category.name)
        );
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

    const addOption = () => {
        if (newOption.trim() && selectedCategory) {
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
            setNewOption(""); 
        }
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
        if (!newQuestion.trim() || !selectedCategory) return;
        const question = { text: newQuestion, weight: parseFloat(newWeight) || 1, category: selectedCategory };

        setEvaluationQuestions((prev) =>
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
        const question = evaluationQuestions[index];
        setNewQuestion(question.text);
        setNewWeight(question.weight);
        setSelectedCategory(question.category);
        setEditingIndex(index);
    };

    const deleteQuestion = (index) => {
        setEvaluationQuestions(evaluationQuestions.filter((_, i) => i !== index));
    };

    const handleSaveForm = async () => {
        try {
            const formRef = doc(db, "evaluationForms", "subject");
            await setDoc(formRef, { questions: evaluationQuestions, categories, expirationDate: expirationDate || null });
            alert("Form saved successfully!");
        } catch (error) {
            console.error("Error saving form:", error);
        }
    };

    return (
        <div className="subject-evaluation-container">
            <div className="subject-form">
                <h2>Subject Evaluation Form</h2>

                <div className="category-input-section">
                    <h3>{editingCategoryIndex !== null ? "Edit Category" : "Add Category"}</h3>
                    <input
                        type="text"
                        value={newCategory}
                        onChange={(e) => setNewCategory(e.target.value)}
                        placeholder={editingCategoryIndex !== null ? "Edit category name" : "Add category"}
                    />
                    <select
                        value={categoryType}
                        onChange={(e) => setCategoryType(e.target.value)}
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
    <h1>Select Category to Edit</h1>
    <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)}>
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

    {categories.find((cat) => cat.name === selectedCategory)?.type === "Multiple Choice" ||
    categories.find((cat) => cat.name === selectedCategory)?.type === "Checkbox" ? (
        <>
            <input
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

                <div className="expiration-date-section">
                    <label>Expiration Date:</label>
                    <input type="date" value={expirationDate} onChange={(e) => setExpirationDate(e.target.value)} />
                    <button onClick={handleSaveForm}>Save Form</button>
                </div>
            </div>

            <div className="subject-preview">
                {categories.map((category, index) => (
                    <div key={index} className="category-preview-section">
                        <h3>
                            {category.name} ({category.type})
                            <div className='edit-category-button'>
                            <button onClick={() => deleteCategory(category)} className="delete-category-btn">
                                Delete Category
                            </button>
                            <button onClick={() => handleEditCategory(index, category)} className="edit-category-btn">
                                Edit Category
                            </button>
                            </div>
                        </h3>
                        <ul>
                            {evaluationQuestions
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

export default SubjectEvaluationPage;
