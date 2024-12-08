import React, { useState, useEffect, useCallback } from 'react';
import { getFirestore, doc, setDoc, getDoc } from "firebase/firestore";
import './deanevaluationpage.css';
import { FilePenLine , Trash2 } from 'lucide-react';

const DeanEvaluationPage = () => {
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
    const [expirationDate, setExpirationDate] = useState("");
    const [editingOptionIndex, setEditingOptionIndex] = useState(null);

    const db = getFirestore();

    const fetchEvaluationData = useCallback(async () => {
        try {
            const formRef = doc(db, "evaluationForms", "dean");
            const formSnap = await getDoc(formRef);
            if (formSnap.exists()) {
                const data = formSnap.data();
                setDeanCategories(data.categories || []);
                setExpirationDate(data.expirationDate || "");
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
            const formRef = doc(db, "evaluationForms", "dean");
            let updatedCategories = [...categories];

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
            setDeanCategories(updatedCategories);
            resetCategoryState();
        } catch (error) {
            console.error("Error saving category:", error);
        }
    };

    const resetCategoryState = () => {
        setNewDeanCategory("");
        setDeanCategoryType("Multiple Choice");
        setDeanCategoryOptions([]);
        setNewDeanOption("");
        setEditingDeanCategoryIndex(null);
    };

    const deleteCategory = async (categoryId) => {
        try {
            const updatedCategories = categories.filter((category) => category.id !== categoryId);

            await setDoc(doc(db, "evaluationForms", "dean"), {
                categories: updatedCategories,
                expirationDate: expirationDate || null,
            });

            setDeanCategories(updatedCategories);
            alert("Category deleted successfully!");
        } catch (error) {
            console.error("Error deleting category:", error);
            alert("Failed to delete category. Please try again.");
        }
    };

    const handleEditCategory = (index, category) => {
        setEditingDeanCategoryIndex(index);
        setNewDeanCategory(category.name);
        setDeanCategoryType(category.type);
        setDeanCategoryOptions(category.options || []);
    };

    const handleCategoryOptionsChange = (e) => {
        setNewDeanOption(e.target.value);
    };

    const addOption = () => {
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

        setDeanCategories(updatedCategories);
        resetOptionState();
    };

    const resetOptionState = () => {
        setNewDeanOption("");
        setEditingOptionIndex(null);
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

        setDeanCategories(updatedCategories);
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
            const formData = {
                categories: categories.map((category) => ({
                    id: category.id,
                    name: category.name,
                    type: category.type,
                    options: category.options || [],
                    questions: category.questions || [],
                })),
                expirationDate: expirationDate || null,
            };
            await setDoc(formRef, formData);
            await fetchEvaluationData();
            alert("Form saved successfully!");
        } catch (error) {
            console.error("Error saving form:", error);
        }
    };

    return (
        <div className="dean-evaluation-page">
            <div className="dean-evaluation-card">
                <h1 className="dean-evaluation-header">Dean Evaluation Form</h1>

                {/* Add Category Section */}
                <div className="dean-category-section">
                    <h2 className="section-title">{editingCategoryIndex !== null ? "Edit Category" : "Add Category"}</h2>
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
                    <button className="dean-save-button" onClick={addOrEditCategory}>
                        {editingCategoryIndex !== null ? "Update Category" : "Add Category"}
                    </button>
                </div>

                {/* Add Question Section */}
                <div className="dean-question-form">
                    <h2 className="section-title">Select Category to Edit</h2>
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
                    <button className="dean-save-button" onClick={addOrEditQuestion}>
                        {editingIndex !== null ? "Update Question" : "Add Question"}
                    </button>
                    {(categories.find(cat => cat.name === selectedCategory)?.type === "Multiple Choice" ||
  categories.find(cat => cat.name === selectedCategory)?.type === "Checkbox") && (
                        <>
                            <input
                                className="dean-option-input"
                                type="text"
                                value={newOption}
                                onChange={handleCategoryOptionsChange}
                                placeholder="Add Option"
                            />
                            <button className="dean-save-button" onClick={addOption}>
                                {editingOptionIndex !== null ? "Update Option" : "Add Option"}
                            </button>
                        </>
                    )}
                </div>

                
                <div className="dean-expiration-section">
                    <h2 className="section-title">Expiration Date:</h2>
                    <input
                        className="dean-expiration-input"
                        type="date"
                        value={expirationDate}
                        onChange={(e) => setExpirationDate(e.target.value)}
                    />
                    <button className="dean-save-button" onClick={handleSaveForm}>
                        Save Form
                    </button>
                </div>
            </div>

            
            <div className="dean-evaluation-preview ">
                <h1>Dean Evaluation Form Preview</h1>
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
                          className='edit-btn'
                           
                       >
                           <FilePenLine />
                       </button>
                       <button
                           onClick={() => deleteCategory(category.id)}
                           className='delete-btn'
                           
                       >
                           <Trash2 />
                       </button>
                   </div>
                   {category.questions && category.questions.length > 0 && (
                       <div className="questions-preview">
                           <h3>Questions:</h3>
                           <table>
                               <thead>
                                   <tr>
                                       <th>#</th>
                                       <th>Question</th>
                                   </tr>
                               </thead>
                               <tbody>
                                   {category.questions.map((question, i) => (
                                       <tr key={i}>
                                           <td>{i + 1}</td>
                                           <td className='table-content'>
                                               {question.text}
                                               <div className="question-actions">
                                                   <button  className='edit-btn'onClick={() => handleEditQuestion(i)}>
                                                       <FilePenLine />
                                                   </button>
                                                   <button className='delete-btn' onClick={() => deleteQuestion(i)}>
                                                       <Trash2 />
                                                   </button>
                                               </div>
                                           </td>
                                       </tr>
                                   ))}
                               </tbody>
                           </table>
                       </div>
                   )}
                   {category.options && category.options.length > 0 && (
                       <div className="options-preview">
                           <h3>Options:</h3>
                           <table>
                               <thead>
                                   <tr>
                                       <th>#</th>
                                       <th>Option</th>
                                   </tr>
                               </thead>
                               <tbody>
                                   {category.options.map((option, i) => (
                                       <tr key={i}>
                                           <td>{i + 1}</td>
                                           <td className='table-content'>
                                               {option}
                                               <div className="option-actions">
                                                   <button
                                                        className='edit-btn'
                                                       onClick={() => {
                                                           setEditingOptionIndex(i);
                                                       }}
                                                   >
                                                       <FilePenLine />
                                                   </button>
                                                   <button className='delete-btn' onClick={() => deleteOption(i)}>
                                                       <Trash2 />
                                                   </button>
                                               </div>
                                           </td>
                                       </tr>
                                   ))}
                               </tbody>
                           </table>
                       </div>
                   )}
               </div>              
                ))}
            </div>
        </div>
    );
};

export default DeanEvaluationPage;
