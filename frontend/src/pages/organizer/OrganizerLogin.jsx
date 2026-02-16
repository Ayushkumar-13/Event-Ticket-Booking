import React from 'react';
import Login from '../Login';

// For now, reusing the main Login component. 
// Can be customized with a specific "Organizer Login" header prop if we refactor Login.jsx
const OrganizerLogin = () => {
    return (
        <div className="w-full">
            <h2 className="text-center text-xl font-bold text-indigo-700 mb-4">Organizer Portal</h2>
            <Login />
        </div>
    );
};

export default OrganizerLogin;
