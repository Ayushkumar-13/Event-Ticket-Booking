import React from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle } from 'lucide-react';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';

const RegistrationSuccess = () => {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
            <Card className="text-center max-w-md w-full py-12">
                <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                    <CheckCircle size={40} />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Registration Successful!</h2>
                <p className="text-gray-600 mb-8">
                    Your ticket has been booked successfully. We've sent the details to your email.
                </p>
                <div className="space-y-3">
                    <Link to="/dashboard" className="block w-full">
                        <Button className="w-full">View My Tickets</Button>
                    </Link>
                    <Link to="/" className="block w-full">
                        <Button variant="ghost" className="w-full">Browse More Events</Button>
                    </Link>
                </div>
            </Card>
        </div>
    );
};

export default RegistrationSuccess;
