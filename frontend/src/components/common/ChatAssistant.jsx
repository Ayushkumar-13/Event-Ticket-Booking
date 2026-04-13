import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { MessageCircle, X, Send } from 'lucide-react';
import api from '../../services/api';

const ChatAssistant = () => {
    const { user } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([
        { role: 'ai', text: 'Hi! I am your AI Booking Assistant. How can I help you find or book tickets today?' }
    ]);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);
    const containerRef = useRef(null);

    // Draggable state
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [autoShift, setAutoShift] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const dragInfo = useRef({ startX: 0, startY: 0, startPosX: 0, startPosY: 0, isMoved: false });

    // Drag event handlers
    const handlePointerDown = (e) => {
        // Only allow left mouse button or touch
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        
        // Important: capture the pointer so mouse events follow outside the iframe/element
        e.currentTarget.setPointerCapture(e.pointerId);

        // MERGE AUTO-SHIFT INTO POSITION: 
        // This stops the "jumping" behavior by making the temporary shift permanent 
        // the moment the user takes manual control.
        const currentPosX = position.x + autoShift.x;
        const currentPosY = position.y + autoShift.y;
        
        setPosition({ x: currentPosX, y: currentPosY });
        setAutoShift({ x: 0, y: 0 });

        dragInfo.current = {
            startX: e.clientX,
            startY: e.clientY,
            startPosX: currentPosX,
            startPosY: currentPosY,
            isMoved: false
        };
        setIsDragging(true);
    };

    useEffect(() => {
        const handlePointerMove = (e) => {
            if (!isDragging || !containerRef.current) return;
            
            const dx = e.clientX - dragInfo.current.startX;
            const dy = e.clientY - dragInfo.current.startY;
            
            if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
                dragInfo.current.isMoved = true;
            }

            const newX = dragInfo.current.startPosX + dx;
            const newY = dragInfo.current.startPosY + dy;

            // PRODUCTION-LEVEL VIEWPORT CLAMPING
            // The logic: Keep the container within (pad) distance of viewport edges.
            const rect = containerRef.current.getBoundingClientRect();
            const pad = 12;
            const initialBottomOffset = 24;
            const initialRightOffset = 24;

            // Boundary calculations relative to the the fixed anchor (bottom-6 right-6)
            const maxX = initialRightOffset - pad; 
            const minX = -(window.innerWidth - rect.width - initialRightOffset - pad);
            const maxY = initialBottomOffset - pad;
            const minY = -(window.innerHeight - rect.height - initialBottomOffset - pad);

            setPosition({
                x: Math.max(minX, Math.min(maxX, newX)),
                y: Math.max(minY, Math.min(maxY, newY))
            });
        };

        const handlePointerUp = () => {
            if (isDragging) {
                setIsDragging(false);
            }
        };

        if (isDragging) {
            window.addEventListener('pointermove', handlePointerMove);
            window.addEventListener('pointerup', handlePointerUp);
        }

        return () => {
            window.removeEventListener('pointermove', handlePointerMove);
            window.removeEventListener('pointerup', handlePointerUp);
        };
    }, [isDragging]);

    const toggleOpen = () => {
        if (dragInfo.current.isMoved) {
            dragInfo.current.isMoved = false; // Reset
            return;
        }
        setIsOpen(true);
    };

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        if (isOpen) {
            scrollToBottom();
            inputRef.current?.focus();

            // Guard against opening window off-screen (Top and Left check)
            setTimeout(() => {
                if (containerRef.current) {
                    const rect = containerRef.current.getBoundingClientRect();
                    const pad = 12;
                    let shiftX = 0;
                    let shiftY = 0;

                    if (rect.top < pad) {
                        shiftY = pad - rect.top;
                    }
                    if (rect.left < pad) {
                        shiftX = pad - rect.left;
                    }

                    if (shiftX !== 0 || shiftY !== 0) {
                        setAutoShift({ x: shiftX, y: shiftY });
                    }
                }
            }, 50);
        } else {
            // Reset shifting when closing so the icon returns to user's dragged position
            setAutoShift({ x: 0, y: 0 });
        }
    }, [messages, isOpen]);

    // Don't render for logged out users since the backend requires protect middleware
    if (!user) return null;

    const sendMessage = async (e) => {
        e.preventDefault();
        if (!input.trim()) return;

        const userMessage = input.trim();
        const currentHistory = [...messages];
        
        // Use the API utility for maximum robustness (handles tokens and base URL automatically)
        setMessages([...currentHistory, { role: 'user', text: userMessage }]);
        setInput('');
        setIsTyping(true);

        try {
            console.log('📤 [Chat] Sending request to AI backend...');
            const res = await api.post('/chat', {
                message: userMessage,
                previousHistory: currentHistory.slice(1)
            });

            const assistantMessage = { 
                role: 'ai', 
                text: res.data.responseText,
                ticketId: res.data.debug?.toolResults?.find(tr => tr.name === 'bookTickets')?.response?.ticketId
            };
            
            setMessages(prev => [...prev, assistantMessage]);
        } catch (error) {
            const fullURL = `${error.config?.baseURL || ''}${error.config?.url || ''}`;
            console.error(`❌ [Chat] Assistant error at ${fullURL}:`, error.response?.data || error.message);
            
            let displayError = "Sorry, I'm having trouble connecting right now.";
            if (error.response?.status === 401) {
                displayError = "Your session is invalid or expired. Please try logging in again.";
            } else if (error.response?.data?.message) {
                displayError = error.response.data.message;
            }
            
            setMessages(prev => [...prev, { role: 'ai', text: `Error: ${displayError}` }]);
        } finally {
            setIsTyping(false);
        }
    };

    return (
        <div 
            ref={containerRef}
            className={`fixed bottom-6 right-6 z-50 flex flex-col items-end ${isDragging ? 'select-none' : ''}`}
            style={{ 
                transform: `translate3d(${position.x + autoShift.x}px, ${position.y + autoShift.y}px, 0)`,
                transition: isDragging ? 'none' : 'transform 0.1s cubic-bezier(0.2, 0, 0, 1)'
            }}
        >
            {/* Chat button */}
            {!isOpen && (
                <button 
                    onPointerDown={handlePointerDown}
                    onClick={toggleOpen}
                    className={`bg-indigo-600 text-white rounded-full p-4 shadow-xl transition transform flex items-center justify-center
                        ${isDragging ? 'cursor-grabbing scale-105' : 'hover:scale-105 hover:bg-indigo-700 animate-bounce cursor-grab'}
                    `}
                    style={{ touchAction: 'none' }}
                >
                    <MessageCircle size={28} />
                </button>
            )}

            {/* Chat Window */}
            {isOpen && (
                <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-80 md:w-96 flex flex-col overflow-hidden border border-gray-200 dark:border-slate-800" style={{ height: '500px', maxHeight: '80vh' }}>
                    <div 
                        onPointerDown={handlePointerDown}
                        className={`bg-indigo-600 text-white p-4 flex justify-between items-center shadow-md z-10 transition-colors ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
                        style={{ touchAction: 'none' }}
                    >
                        <div className="font-semibold flex items-center gap-2 pointer-events-none">
                           <span className="animate-pulse">✨</span> Booking Assistant
                        </div>
                        <button 
                            onPointerDown={(e) => e.stopPropagation()} 
                            onClick={() => setIsOpen(false)} 
                            className="text-indigo-100 hover:text-white transition rounded-full p-1 hover:bg-white/10"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    <div className="flex-1 p-4 overflow-y-auto bg-gray-50 dark:bg-slate-950 flex flex-col gap-4">
                        {messages.map((msg, idx) => (
                            <div key={idx} className={`max-w-[85%] p-3 rounded-xl text-sm transition-all duration-300 ${
                                msg.role === 'user' 
                                ? 'bg-indigo-600 text-white self-end rounded-br-sm shadow-md' 
                                : 'bg-white dark:bg-slate-800 text-gray-800 dark:text-gray-100 self-start border border-gray-100 dark:border-slate-700 rounded-bl-sm shadow-sm'
                            }`}>
                                <div className="whitespace-pre-wrap">{msg.text}</div>
                                {msg.ticketId && (
                                    <div className="mt-3 pt-3 border-t border-gray-100 dark:border-slate-700">
                                        <a 
                                            href={`${import.meta.env.VITE_API_URL.replace('/api', '')}/api/tickets/${msg.ticketId}/download`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition shadow-sm"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                                            Download Ticket PDF
                                        </a>
                                    </div>
                                )}
                            </div>
                        ))}
                        {isTyping && (
                            <div className="bg-white dark:bg-slate-800 text-gray-400 dark:text-gray-500 self-start p-3 rounded-xl border border-gray-100 dark:border-slate-700 rounded-bl-sm shadow-sm text-sm flex items-center gap-2">
                                <span className="flex gap-1">
                                    <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce"></span>
                                    <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></span>
                                    <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{animationDelay: '0.4s'}}></span>
                                </span>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    <form onSubmit={sendMessage} className="p-3 bg-white dark:bg-slate-900 border-t border-gray-100 dark:border-slate-800 flex gap-2">
                        <input 
                            ref={inputRef}
                            type="text" 
                            className="flex-1 bg-gray-100 dark:bg-slate-800 border-none rounded-full px-4 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 transition"
                            placeholder="Find me music events..."
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                        />
                        <button 
                            type="submit" 
                            disabled={isTyping || !input.trim()}
                            className="bg-indigo-600 text-white rounded-full w-9 h-9 flex items-center justify-center disabled:opacity-50 disabled:bg-indigo-400 hover:bg-indigo-700 dark:hover:bg-indigo-500 transition shadow-md"
                        >
                            <Send size={16} className="ml-0.5" />
                        </button>
                    </form>
                </div>
            )}
        </div>
    );
};

export default ChatAssistant;
