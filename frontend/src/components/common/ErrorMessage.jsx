import React from 'react';
import { AlertCircle } from 'lucide-react';

const ErrorMessage = ({ message }) => {
    if (!message) return null;

    return (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-md flex items-start animate-in fade-in slide-in-from-top-2 duration-300">
            <AlertCircle className="text-red-500 mr-2 shrink-0 bg-transparent" size={20} />
            <p className="text-red-700 text-sm font-medium">{message}</p>
        </div>
    );
};

export default ErrorMessage;
