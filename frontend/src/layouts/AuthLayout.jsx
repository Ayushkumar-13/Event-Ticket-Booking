import React from 'react';
import { Outlet, Link } from 'react-router-dom';

const AuthLayout = () => {
    return (
        <div className="flex flex-col justify-center py-12 sm:px-6 lg:px-8">
            <div className="sm:mx-auto sm:w-full sm:max-w-md">
                <Link to="/" onClick={() => window.scrollTo(0, 0)} className="flex justify-center items-center gap-2 mb-6 group">
                    <img src="/eventtix-logo.svg" alt="EventTix Logo" className="w-12 h-12 drop-shadow-md transition-transform duration-200 group-hover:scale-110" />
                    <span className="font-bold text-2xl text-gray-900 dark:text-gray-100 tracking-tight transition-colors duration-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400">EventTix</span>
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
