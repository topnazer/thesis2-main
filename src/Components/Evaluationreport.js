import React from 'react';
import { Link } from 'react-router-dom';
import './Evaluationreport.css';
import FacultyDeanEvaluationPage from './FacultyDeanEvaluationPage';
import SubjectEvaluationPage from "./SubjectEvaluationPage";
import AdminDashboard from "./AdminDashboard";
import {FileChartColumn} from 'lucide-react';

const Evaluationreport = () => (
    <div className='evaluationreport-container'>
        <div className="evaluationreport-buttons">
            <Link to="/admin-dashboard/evaluation-reports" className='subject-evaluationreport-button'>
                <FileChartColumn style={{ width: '50px', height: '50px', color: 'black' }} />
                <p>Faculty Report</p>
            </Link>
            <Link to="/admin-dashboard/subject-evaluation-report" className='facultydean-evaluationreport-button'>
                <FileChartColumn style={{ width: '50px', height: '50px', color: 'black' }} />
                <p>Subjects Report</p>
            </Link>
        </div>
        
    </div>
);

export default Evaluationreport;
