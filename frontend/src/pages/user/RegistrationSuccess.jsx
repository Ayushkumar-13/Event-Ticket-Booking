import React from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle } from 'lucide-react';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';

const RegistrationSuccess = () => {
    return (
        <div className="flex-grow flex items-center justify-center p-4">
            <Card className="text-center max-w-md w-full py-12 dark:bg-gray-800 dark:border-gray-700 shadow-xl">
                <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full flex items-center justify-center mx-auto mb-6 transition-colors duration-200">
                    <CheckCircle size={40} />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2 transition-colors duration-200">Registration Successful!</h2>
                <p className="text-gray-600 dark:text-gray-400 mb-8 transition-colors duration-200">
                    Your ticket has been booked successfully. We've sent the details to your email.
                </p>
                <div className="space-y-3">
                    <Link to="/dashboard" className="block w-full">
                        <Button className="w-full h-11">View My Tickets</Button>
                    </Link>
                    <Link to="/" className="block w-full">
                        <Button variant="ghost" className="w-full h-11 border-gray-200 dark:border-gray-700 dark:text-gray-300">Browse More Events</Button>
                    </Link>
                </div>
            </Card>
        </div>
    );
};

export default RegistrationSuccess;
