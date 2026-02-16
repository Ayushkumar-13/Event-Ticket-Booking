import React from 'react';
import { Link } from 'react-router-dom';
import { FileQuestion, Home } from 'lucide-react';

const NotFound = () => {
    return (
        <div className="min-h-[calc(100vh-64px)] flex items-center justify-center bg-gray-50 px-4">
            <div className="text-center">
                <div className="w-24 h-24 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-6">
                    <FileQuestion size={48} />
                </div>
                <h1 className="text-4xl font-extrabold text-gray-900 mb-2">Page Not Found</h1>
                <p className="text-gray-600 mb-8 max-w-md mx-auto">
                    The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.
                </p>
                <Link to="/" className="inline-flex items-center btn-primary">
                    <Home size={18} className="mr-2" />
                    Back to Home
                </Link>
            </div>
        </div>
    );
};

export default NotFound;
