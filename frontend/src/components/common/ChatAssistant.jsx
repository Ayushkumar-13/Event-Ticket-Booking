import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { MessageCircle, X, Send } from 'lucide-react';
import axios from 'axios';

const ChatAssistant = () => {
    const { user } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([
        { role: 'ai', text: 'Hi! I am your AI Booking Assistant. How can I help you find or book tickets today?' }
    ]);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        if (isOpen) scrollToBottom();
    }, [messages, isOpen]);

    // Don't render for logged out users since the backend requires protect middleware
    if (!user) return null;

    const sendMessage = async (e) => {
        e.preventDefault();
        if (!input.trim()) return;

        const userMessage = input.trim();
        const currentHistory = [...messages];
        
        setMessages([...currentHistory, { role: 'user', text: userMessage }]);
        setInput('');
        setIsTyping(true);

        try {
            // We use the full API URL based on proxy or relative URL
            // Assuming axios defaults or relative requests work.
            const res = await axios.post('http://localhost:5000/api/chat', {
                message: userMessage,
                previousHistory: currentHistory.slice(1) // skip the initial greeting
            }, {
                // Ensure auth token is sent
                headers: { Authorization: `Bearer ${user.token}` }
            });

            setMessages(prev => [...prev, { role: 'ai', text: res.data.reponseText }]);
        } catch (error) {
            console.error('Chat error:', error);
            const errorMsg = error.response?.data?.message || "Sorry, I'm having trouble connecting right now.";
            setMessages(prev => [...prev, { role: 'ai', text: `Error: ${errorMsg}` }]);
        } finally {
            setIsTyping(false);
        }
    };

    return (
        <div className="fixed bottom-6 right-6 z-50">
            {/* Chat button */}
            {!isOpen && (
                <button 
                    onClick={() => setIsOpen(true)}
                    className="bg-indigo-600 text-white rounded-full p-4 shadow-xl hover:bg-indigo-700 transition transform hover:scale-105 flex items-center justify-center animate-bounce"
                >
                    <MessageCircle size={28} />
                </button>
            )}

            {/* Chat Window */}
            {isOpen && (
                <div className="bg-white rounded-xl shadow-2xl w-80 md:w-96 flex flex-col overflow-hidden border border-gray-200" style={{ height: '500px', maxHeight: '80vh' }}>
                    <div className="bg-indigo-600 text-white p-4 flex justify-between items-center shadow-md z-10">
                        <div className="font-semibold flex items-center gap-2">
                           <span className="text-xl">✨</span> Booking Assistant
                        </div>
                        <button onClick={() => setIsOpen(false)} className="text-indigo-200 hover:text-white transition rounded-full p-1">
                            <svg className="w-5 h-5 outline-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                        </button>
                    </div>

                    <div className="flex-1 p-4 overflow-y-auto bg-gray-50 flex flex-col gap-4">
                        {messages.map((msg, idx) => (
                            <div key={idx} className={`max-w-[85%] p-3 rounded-xl text-sm ${msg.role === 'user' ? 'bg-indigo-600 text-white self-end rounded-br-sm shadow-md' : 'bg-white text-gray-800 self-start border border-gray-100 rounded-bl-sm shadow-md'}`}>
                                <div className="whitespace-pre-wrap">{msg.text}</div>
                            </div>
                        ))}
                        {isTyping && (
                            <div className="bg-white text-gray-500 self-start p-3 rounded-xl border border-gray-100 rounded-bl-sm shadow-sm text-sm italic flex items-center gap-2">
                                <span className="flex gap-1">
                                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></span>
                                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></span>
                                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.4s'}}></span>
                                </span>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    <form onSubmit={sendMessage} className="p-3 bg-white border-t border-gray-100 flex gap-2">
                        <input 
                            type="text" 
                            className="flex-1 bg-gray-100 border-none rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                            placeholder="Find me music events..."
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            disabled={isTyping}
                        />
                        <button 
                            type="submit" 
                            disabled={isTyping || !input.trim()}
                            className="bg-indigo-600 text-white rounded-full w-9 h-9 flex items-center justify-center disabled:opacity-50 disabled:bg-indigo-400 hover:bg-indigo-700 transition"
                        >
                            <svg className="w-4 h-4 outline-none ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path></svg>
                        </button>
                    </form>
                </div>
            )}
        </div>
    );
};

export default ChatAssistant;
