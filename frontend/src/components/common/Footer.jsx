import React from 'react';
import { Link } from 'react-router-dom';
import { Facebook, Twitter, Instagram, Linkedin } from 'lucide-react';

const Footer = () => {
    return (
        <footer className="bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 pt-12 pb-8 transition-colors duration-200">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
                    <div className="col-span-1 md:col-span-1">
                        <Link to="/" className="flex items-center gap-2 mb-4">
                            <div className="w-8 h-8 rounded-lg bg-indigo-600 dark:bg-indigo-500 flex items-center justify-center text-white font-bold text-lg">
                                E
                            </div>
                            <span className="font-bold text-xl text-gray-900 dark:text-gray-100 tracking-tight">EventTix</span>
                        </Link>
                        <p className="text-gray-500 dark:text-gray-400 text-sm">
                            Discover and book the best events in your city. Music, Art, Tech, and more.
                        </p>
                    </div>

                    <div>
                        <h4 className="font-bold text-gray-900 dark:text-gray-100 mb-4">Platform</h4>
                        <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                            <li><Link to="/" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Browse Events</Link></li>
                            <li><Link to="/login" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Organizers</Link></li>
                            <li><Link to="#" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">How it works</Link></li>
                            <li><Link to="#" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Pricing</Link></li>
                        </ul>
                    </div>

                    <div>
                        <h4 className="font-bold text-gray-900 dark:text-gray-100 mb-4">Support</h4>
                        <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                            <li><Link to="#" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Help Center</Link></li>
                            <li><Link to="#" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Terms of Service</Link></li>
                            <li><Link to="#" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Privacy Policy</Link></li>
                            <li><Link to="#" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Contact Us</Link></li>
                        </ul>
                    </div>

                    <div>
                        <h4 className="font-bold text-gray-900 dark:text-gray-100 mb-4">Follow Us</h4>
                        <div className="flex space-x-4 text-gray-400 dark:text-gray-500">
                            <a href="#" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"><Facebook size={20} /></a>
                            <a href="#" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"><Twitter size={20} /></a>
                            <a href="#" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"><Instagram size={20} /></a>
                            <a href="#" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"><Linkedin size={20} /></a>
                        </div>
                    </div>
                </div>

                <div className="border-t border-gray-100 dark:border-gray-800 pt-8 flex flex-col md:flex-row justify-between items-center text-sm text-gray-500 dark:text-gray-400">
                    <p>&copy; {new Date().getFullYear()} EventTix. All rights reserved.</p>
                    <p>Made with ❤️ for Intern Assignment</p>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
