import React from 'react';
import { Outlet, Link } from 'react-router-dom';

const AuthLayout = () => {
    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8 transition-colors duration-200">
            <div className="sm:mx-auto sm:w-full sm:max-w-md">
                <Link to="/" className="flex justify-center items-center gap-2 mb-6">
                    <div className="w-10 h-10 rounded-lg bg-indigo-600 dark:bg-indigo-500 flex items-center justify-center text-white font-bold text-xl">
                        E
                    </div>
                    <span className="font-bold text-2xl text-gray-900 dark:text-gray-100 tracking-tight">EventTix</span>
                </Link>
            </div>

            <div className="sm:mx-auto sm:w-full sm:max-w-md">
                <Outlet />
            </div>

            <div className="mt-8 text-center text-xs text-gray-500 dark:text-gray-400">
                &copy; {new Date().getFullYear()} EventTix. All rights reserved.
            </div>
        </div>
    );
};

export default AuthLayout;
