import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from '../components/common/Navbar';
import Footer from '../components/common/Footer';
import ChatAssistant from '../components/common/ChatAssistant';
import GlobalNotification from '../components/common/GlobalNotification';

const UserLayout = () => {
    return (
        <div className="flex flex-col flex-grow relative">
            <GlobalNotification />
            <Navbar />
            <main className="flex-grow">
                <Outlet />
            </main>
            <Footer />
            <ChatAssistant />
        </div>
    );
};

export default UserLayout;
