import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getFirestore, collection, getDocs, doc, getDoc } from 'firebase/firestore';

const ViewSubjectEvaluation = () => {
    const { subjectId, sectionId } = useParams(); // Assuming subjectId is passed as a URL parameter
    const [evaluations, setEvaluations] = useState([]);
    const [questions, setQuestions] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const navigate = useNavigate();
    const db = getFirestore();

    useEffect(() => {
        const fetchSubjectEvaluations = async () => {
            try {
                console.log(`Fetching evaluations for subjectId: ${subjectId}`);

                // Fetch evaluations
                const evaluationsSnapshot = await getDocs(collection(db, `subjectEvaluations/${subjectId}/sections/${sectionId}/completed_evaluations`));
                if (evaluationsSnapshot.empty) {
                    console.log('No evaluations found for this subject.');
                } else {
                    console.log('Evaluations found:', evaluationsSnapshot.docs);
                }
                const evaluationData = evaluationsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                console.log('Fetched evaluation data:', evaluationData);
                setEvaluations(evaluationData);

                // Fetch evaluation form questions and categories
                const evaluationFormDoc = await getDoc(doc(db, 'evaluationForms', subjectId));
                if (evaluationFormDoc.exists()) {
                    const data = evaluationFormDoc.data();
                    console.log('Fetched evaluation form data:', data);
                    setQuestions(data.questions || []);
                    setCategories(data.categories || []);
                } else {
                    console.log('No evaluation form found for this subject.');
                    setError('No evaluation form found for this subject.');
                }
            } catch (error) {
                console.error('Error fetching evaluations:', error);
                setError('Error fetching evaluations.');
            } finally {
                setLoading(false);
            }
        };

        fetchSubjectEvaluations();
    }, [db, subjectId]);

    if (loading) return <p>Loading evaluations...</p>;
    if (error) return <p>{error}</p>;

    const renderQuestionsByCategory = (evaluation) => {
        return categories.map((category, categoryIndex) => (
            <React.Fragment key={categoryIndex}>
                <tr>
                    <th colSpan="6" className="category-header">{category}</th>
                </tr>
                {questions
                    .filter(question => question.category === category)
                    .map((question, questionIndex) => {
                        const uniqueKey = `${categoryIndex}-${questionIndex}`;
                        const score = evaluation.scores[uniqueKey]; // Fetch the score for each question
                        return (
                            <tr key={uniqueKey}>
                                <td>{question.text}</td>
                                {[1, 2, 3, 4, 5].map((value) => (
                                    <td key={value}>
                                        {parseInt(score) === value ? (
                                            <span className="response-circle">&#x25CF;</span>
                                        ) : null}
                                    </td>
                                ))}
                            </tr>
                        );
                    })}
            </React.Fragment>
        ));
    };

    return (
        <div className="view-subject-evaluation-page">
            <h2>Evaluation Details for Subject</h2>
            {evaluations.length > 0 ? (
                evaluations.map((evaluation) => (
                    <div className="evaluation-card" key={evaluation.id}>
                        <p><strong>Date:</strong> {new Date(evaluation.createdAt.seconds * 1000).toLocaleDateString()}</p>
                        <p><strong>Percentage Score:</strong> {evaluation.percentageScore}</p>
                        <p><strong>Rating:</strong> {evaluation.percentageScore >= 80 ? 'Good' : 'Bad'}</p>
                        <h4>Questions and Scores:</h4>
                        <table className="evaluation-table">
                            <thead>
                                <tr>
                                    <th>Question</th>
                                    <th>1</th>
                                    <th>2</th>
                                    <th>3</th>
                                    <th>4</th>
                                    <th>5</th>
                                </tr>
                            </thead>
                            <tbody>
                                {renderQuestionsByCategory(evaluation)}
                            </tbody>
                        </table>
                        <div className="comment-section">
                            <p><strong>Comment:</strong> {evaluation.comment}</p>
                        </div>
                    </div>
                ))
            ) : (
                <p>No evaluations available for this subject.</p>
            )}
            <button onClick={() => navigate(-1)} style={{ padding: '10px', marginTop: '20px' }}>Back to Subject List</button>
        </div>
    );
};

export default ViewSubjectEvaluation;
