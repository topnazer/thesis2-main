import React, { useState, useEffect } from 'react';
import { getFirestore, doc, getDoc, setDoc } from "firebase/firestore";
import './facultydeanevaluationpage.css';


const FacultyDeanEvaluationPage = () => {
    const [facultyQuestions, setFacultyQuestions] = useState([]);
    const [deanQuestions, setDeanQuestions] = useState([]);
    const [newQuestion, setNewQuestion] = useState("");
    const [newWeight, setNewWeight] = useState("");
    const [editingIndex, setEditingIndex] = useState(null);
    const [currentFormType, setCurrentFormType] = useState("faculty");
    const [facultyCategories, setFacultyCategories] = useState([]);
    const [deanCategories, setDeanCategories] = useState([]);
    const [newFacultyCategory, setNewFacultyCategory] = useState("");
    const [newDeanCategory, setNewDeanCategory] = useState("");
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

    // Separate add or edit category for faculty
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

    // Separate add or edit category for dean
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

    // Delete category for faculty and dean
    const deleteCategory = (category) => {
        if (currentFormType === "faculty") {
            setFacultyCategories((prevCategories) => prevCategories.filter((cat) => cat !== category));
            setFacultyQuestions((prevQuestions) => prevQuestions.filter((question) => question.category !== category));
        } else if (currentFormType === "dean") {
            setDeanCategories((prevCategories) => prevCategories.filter((cat) => cat !== category));
            setDeanQuestions((prevQuestions) => prevQuestions.filter((question) => question.category !== category));
        }
    };

    const handleEditCategory = (index, category) => {
        if (currentFormType === "faculty") {
            setNewFacultyCategory(category);
        } else if (currentFormType === "dean") {
            setNewDeanCategory(category);
        }
        setEditingCategoryIndex(index);
    };

    // Separate function for adding or editing faculty questions
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

    // Separate function for adding or editing dean questions
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

    // Separate function for editing faculty questions
    const handleEditQuestionForFaculty = (absoluteIndex) => {
        const questionToEdit = facultyQuestions[absoluteIndex];
        setNewQuestion(questionToEdit.text);
        setNewWeight(questionToEdit.weight);
        setSelectedCategory(questionToEdit.category);
        setEditingIndex(absoluteIndex);
    };

    // Separate function for editing dean questions
    const handleEditQuestionForDean = (absoluteIndex) => {
        const questionToEdit = deanQuestions[absoluteIndex];
        setNewQuestion(questionToEdit.text);
        setNewWeight(questionToEdit.weight);
        setSelectedCategory(questionToEdit.category);
        setEditingIndex(absoluteIndex);
    };

    // Delete question for faculty and dean
    const deleteQuestion = (absoluteIndex) => {
        if (currentFormType === "faculty") {
            setFacultyQuestions((prevQuestions) => prevQuestions.filter((_, i) => i !== absoluteIndex));
        } else if (currentFormType === "dean") {
            setDeanQuestions((prevQuestions) => prevQuestions.filter((_, i) => i !== absoluteIndex));
        }
    };

    // Save form for faculty or dean
    const handleSaveForm = async () => {
        try {
            if (currentFormType === "faculty") {
                await setDoc(doc(db, "evaluationForms", "faculty"), {
                    questions: facultyQuestions,
                    categories: facultyCategories,
                });
                alert("Faculty evaluation form saved successfully!");
            } else if (currentFormType === "dean") {
                await setDoc(doc(db, "evaluationForms", "dean"), {
                    questions: deanQuestions,
                    categories: deanCategories,
                });
                alert("Dean evaluation form saved successfully!");
            }
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
                                        {currentFormType === "faculty" ? (
                                            <button onClick={() => handleEditQuestionForFaculty(absoluteIndex)}>Edit</button>
                                        ) : (
                                            <button onClick={() => handleEditQuestionForDean(absoluteIndex)}>Edit</button>
                                        )}
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
    <div className="faculty-dean-evaluation-page">
    
        <div className="faculty-evaluation-tool">
        <h2>Create or Edit Evaluation Form for Faculty</h2>
        <div>
            <input
                type="text"
                value={newFacultyCategory}
                onChange={(e) => setNewFacultyCategory(e.target.value)}
                placeholder="Add or Edit category"
            />
            <button onClick={() => { setCurrentFormType("faculty"); addOrEditCategoryForFaculty(); }}>
                {editingCategoryIndex !== null ? "Update Category" : "Add Category"}
            </button>

            <label htmlFor="facultyCategorySelect">Select Category:</label>
            <select
                id="facultyCategorySelect"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
            >
                <option value="" disabled>Select a category</option>
                {facultyCategories.map((category, index) => (
                    <option key={index} value={category}>{category}</option>
                ))}
            </select>

            {facultyCategories.map((category, index) => (
                <div key={index}>
                    {category}
                    <button onClick={() => handleEditCategory(index, category)}>Edit</button>
                    <button onClick={() => deleteCategory(category)}>Delete</button>
                </div>
            ))}
        </div>

        <div>
            {renderQuestionsByCategory(facultyQuestions, facultyCategories)}
            <textarea
                value={newQuestion}
                onChange={(e) => setNewQuestion(e.target.value)}
                placeholder={editingIndex !== null ? "Edit the question" : "Add a new question"}
            />
            <input
                type="number"
                value={newWeight}
                onChange={(e) => setNewWeight(e.target.value)}
                placeholder="Set question weight"
            />
            <button onClick={addOrEditQuestionForFaculty}>
                {editingIndex !== null ? "Update Question" : "Add Question"}
            </button>
            <button onClick={handleSaveForm}>Save Faculty Form</button>
        </div>
        </div>   
        
        <div className="dean-evaluation-tool">
        <h2>Create or Edit Evaluation Form for Dean</h2>
        <div>
            <input
                type="text"
                value={newDeanCategory}
                onChange={(e) => setNewDeanCategory(e.target.value)}
                placeholder="Add or Edit category"
            />
            <button onClick={() => { setCurrentFormType("dean"); addOrEditCategoryForDean(); }}>
                {editingCategoryIndex !== null ? "Update Category" : "Add Category"}
            </button>

            <label htmlFor="deanCategorySelect">Select Category:</label>
            <select
                id="deanCategorySelect"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
            >
                <option value="" disabled>Select a category</option>
                {deanCategories.map((category, index) => (
                    <option key={index} value={category}>{category}</option>
                ))}
            </select>

            {deanCategories.map((category, index) => (
                <div key={index}>
                    {category}
                    <button onClick={() => handleEditCategory(index, category)}>Edit</button>
                    <button onClick={() => deleteCategory(category)}>Delete</button>
                </div>
            ))}
        </div>

        <div>
            {renderQuestionsByCategory(deanQuestions, deanCategories)}
            <textarea
                value={newQuestion}
                onChange={(e) => setNewQuestion(e.target.value)}
                placeholder={editingIndex !== null ? "Edit the question" : "Add a new question"}
            />
            <input
                type="number"
                value={newWeight}
                onChange={(e) => setNewWeight(e.target.value)}
                placeholder="Set question weight"
            />
            <button onClick={addOrEditQuestionForDean}>
                {editingIndex !== null ? "Update Question" : "Add Question"}
            </button>
            <button onClick={handleSaveForm}>Save Dean Form</button>
        </div>
    </div>
    </div>
);
};

export default FacultyDeanEvaluationPage;
