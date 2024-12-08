import React from 'react';
import { Link } from 'react-router-dom';
import './Evaluationreport.css';

import {FileChartColumn} from 'lucide-react';

const Evaluationreport = () => (
    <div className='evaluationreport-container'>
        <div className="evaluationreport-buttons">
        <Link to="/admin-dashboard/subject-evaluation-reports" className='studentevaluationreport-button'>
                <FileChartColumn style={{ width: '50px', height: '50px', color: 'black' }} />
                <p>Subject Report</p>
            </Link>
            <Link to="/admin-dashboard/peer-evaluation-reports" className='facevaluationreport-button'>
                <FileChartColumn style={{ width: '50px', height: '50px', color: 'black' }} />
                <p>Peer to Peer Report</p>
            </Link>

            <Link to="/admin-dashboard/dean-evaluation-reports" className='deanevaluationreport-button'>
                <FileChartColumn style={{ width: '50px', height: '50px', color: 'black' }} />
                <p>Dean Report</p>
            </Link>
        </div>
        
    </div>
);

export default Evaluationreport;
