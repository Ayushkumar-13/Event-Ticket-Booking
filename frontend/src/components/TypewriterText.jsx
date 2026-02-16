import React, { useState, useEffect } from 'react';

const TypewriterText = ({
    text,
    delay = 50,
    className = '',
    onComplete,
    shouldReset = false,
    onResetComplete,
    highlightWord = null,
    highlightClassName = ''
}) => {
    const [displayedText, setDisplayedText] = useState('');
    const [currentIndex, setCurrentIndex] = useState(0);

    // Reset when shouldReset changes to true
    useEffect(() => {
        if (shouldReset) {
            setDisplayedText('');
            setCurrentIndex(0);
            if (onResetComplete) {
                onResetComplete();
            }
        }
    }, [shouldReset, onResetComplete]);

    useEffect(() => {
        if (currentIndex < text.length) {
            const timeout = setTimeout(() => {
                setDisplayedText(prev => prev + text[currentIndex]);
                setCurrentIndex(prev => prev + 1);
            }, delay);

            return () => clearTimeout(timeout);
        } else if (currentIndex === text.length && onComplete) {
            onComplete();
        }
    }, [currentIndex, text, delay, onComplete]);

    // Render text with highlighted word if specified
    const renderText = () => {
        if (!highlightWord || !displayedText.includes(highlightWord)) {
            return displayedText;
        }

        const parts = displayedText.split(highlightWord);
        return (
            <>
                {parts[0]}
                <span className={highlightClassName}>{highlightWord}</span>
                {parts[1]}
            </>
        );
    };

    return (
        <span className={className}>
            {renderText()}
            {currentIndex < text.length && (
                <span className="animate-pulse">|</span>
            )}
        </span>
    );
};

export default TypewriterText;
