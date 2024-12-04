import React from 'react';
import { Link } from 'react-router-dom';
import './Evaluationreport.css';

import {FileChartColumn} from 'lucide-react';

const Evaluationreport = () => (
    <div className='evaluationreport-container'>
        <div className="evaluationreport-buttons">
        <Link to="/admin-dashboard/faculty-evaluation-reports" className='evaluationreport-button'>
                <FileChartColumn style={{ width: '50px', height: '50px', color: 'black' }} />
                <p>Faculty Report</p>
            </Link>
            <Link to="/admin-dashboard/subject-evaluation-report" className='evaluationreport-button'>
                <FileChartColumn style={{ width: '50px', height: '50px', color: 'black' }} />
                <p>Subjects Report</p>
            </Link>
        </div>
        
    </div>
);

export default Evaluationreport;
