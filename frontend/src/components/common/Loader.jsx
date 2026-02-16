import React from 'react';
import { Loader2 } from 'lucide-react';

const Loader = ({ size = 'md', fullScreen = false }) => {
    const sizes = {
        sm: 16,
        md: 32,
        lg: 48
    };

    const loaderContent = (
        <div className="flex flex-col items-center justify-center text-indigo-600">
            <Loader2 className="animate-spin" size={sizes[size]} />
            <span className="sr-only">Loading...</span>
        </div>
    );

    if (fullScreen) {
        return (
            <div className="fixed inset-0 bg-white/80 backdrop-blur-sm z-50 flex items-center justify-center">
                {loaderContent}
            </div>
        );
    }

    return (
        <div className="flex justify-center p-4">
            {loaderContent}
        </div>
    );
};

export default Loader;
