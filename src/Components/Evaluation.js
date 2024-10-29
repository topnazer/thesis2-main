import React from 'react';
import { Link } from 'react-router-dom';
import './Evaluation.css';
import {FileCog} from 'lucide-react';

const Evaluation = () => (
    <div className='evaluation-container'>
        <div className="evaluation-buttons">
            <Link to="/admin-dashboard/subject-evaluation" className='subject-evaluation-button'>
                <FileCog style={{ width: '50px', height: '50px', color: 'black' }} /> 
                <p>Student Tools</p>    
            </Link>

            <Link to="/admin-dashboard/faculty-evaluation" className='faculty-evaluation-button'>
                <FileCog style={{ width: '50px', height: '50px', color: 'black' }} />
                <p>Peer-to-peer Tools</p>
            </Link>

            <Link to="/admin-dashboard/dean-evaluation" className='dean-evaluation-button'>
                <FileCog style={{ width: '50px', height: '50px', color: 'black' }} />
                <p>Dean/Acaf Tools</p>
            </Link>
        </div>
        
    </div>
);

export default Evaluation;