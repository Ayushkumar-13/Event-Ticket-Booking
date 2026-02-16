import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Button } from '../../components/ui/button';
import { Textarea } from '../../components/ui/textarea'; // Assuming I might need this, if not I'll use standard textarea or Input
import { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbPage, BreadcrumbSeparator } from '../../components/ui/breadcrumb';
import { User, Lock, Bell, Moon, Sun, Save, Shield, Smartphone, Palette, Globe, Check } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

const OrganizerSettings = () => {
    const { user } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const [activeTab, setActiveTab] = useState('profile');
    const [loading, setLoading] = useState(false);

    // Mock states
    const [passwords, setPasswords] = useState({ current: '', new: '', confirm: '' });

    const handlePasswordChange = (e) => {
        setPasswords({ ...passwords, [e.target.name]: e.target.value });
    };

    const handleSave = (e) => {
        e.preventDefault();
        setLoading(true);
        setTimeout(() => {
            setLoading(false);
            alert("Settings updated successfully!");
        }, 1000);
    };

    const navItems = [
        { id: 'profile', label: 'Profile', icon: User, description: 'Manage your public profile' },
        { id: 'security', label: 'Security', icon: Lock, description: 'Password and authentication' },
        { id: 'appearance', label: 'Appearance', icon: Palette, description: 'Theme and display settings' },
        { id: 'notifications', label: 'Notifications', icon: Bell, description: 'Email and push alerts' },
    ];

    return (
        <div className="space-y-6 animate-fade-in max-w-7xl mx-auto pb-10">
            {/* Page Header */}
            <div className="flex flex-col gap-4 border-b border-slate-200 dark:border-gray-700 pb-6">
                <div className="flex items-center justify-between">
                    <Breadcrumb>
                        <BreadcrumbList>
                            <BreadcrumbItem>
                                <BreadcrumbLink href="/organizer/dashboard">Dashboard</BreadcrumbLink>
                            </BreadcrumbItem>
                            <BreadcrumbSeparator />
                            <BreadcrumbItem>
                                <BreadcrumbPage>Settings</BreadcrumbPage>
                            </BreadcrumbItem>
                        </BreadcrumbList>
                    </Breadcrumb>
                </div>
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-gray-100 tracking-tight">Account Settings</h1>
                    <p className="text-slate-500 dark:text-gray-400">Manage your account settings and set e-mail preferences.</p>
                </div>
            </div>

            <div className="flex flex-col lg:flex-row lg:space-x-12 lg:space-y-0 space-y-8">
                {/* Sidebar Navigation */}
                <aside className="-mx-4 lg:w-1/5 lg:mx-0">
                    <nav className="flex space-x-2 lg:flex-col lg:space-x-0 lg:space-y-1 overflow-x-auto px-4 lg:px-0 scrollbar-hide">
                        {navItems.map((item) => (
                            <button
                                key={item.id}
                                onClick={() => setActiveTab(item.id)}
                                className={`flex items-center gap-3 whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium transition-colors ${activeTab === item.id
                                    ? 'bg-slate-100 text-slate-900 dark:bg-gray-800 dark:text-gray-100'
                                    : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100'
                                    }`}
                            >
                                <item.icon size={16} />
                                {item.label}
                            </button>
                        ))}
                    </nav>
                </aside>

                {/* Content Area */}
                <div className="flex-1 lg:max-w-3xl">
                    {/* Profile Section */}
                    {activeTab === 'profile' && (
                        <div className="space-y-6 animate-fade-in">
                            <div>
                                <h3 className="text-lg font-medium text-slate-900 dark:text-gray-100">Profile</h3>
                                <p className="text-sm text-slate-500 dark:text-gray-400">This is how others will see you on the site.</p>
                            </div>
                            <div className="border-t border-slate-200 dark:border-gray-700 pt-6">
                                <form onSubmit={handleSave} className="space-y-8">
                                    <div className="flex items-center gap-6">
                                        <div className="h-20 w-20 rounded-full bg-slate-100 dark:bg-gray-800 flex items-center justify-center text-2xl font-bold text-slate-500 dark:text-gray-400 border border-slate-200 dark:border-gray-700">
                                            {user?.name?.charAt(0) || 'U'}
                                        </div>
                                        <div className="space-y-1">
                                            <h4 className="text-sm font-medium text-slate-900 dark:text-gray-100">Profile Picture</h4>
                                            <div className="flex gap-2">
                                                <Button size="sm" variant="outline" type="button">Change</Button>
                                                <Button size="sm" variant="ghost" className="text-red-500 dark:text-red-400 hover:text-red-600" type="button">Remove</Button>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="username">Username</Label>
                                            <Input id="username" defaultValue={user?.name?.toLowerCase().replace(/\s/g, '') || 'username'} />
                                            <p className="text-[0.8rem] text-slate-500 dark:text-gray-400">This is your public display name.</p>
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="fullname">Full Name</Label>
                                            <Input id="fullname" defaultValue={user?.name} />
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="email">Email</Label>
                                            <Input id="email" defaultValue={user?.email} disabled />
                                            <p className="text-[0.8rem] text-slate-500 dark:text-gray-400">Email cannot be changed securely via this form.</p>
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="bio">Bio</Label>
                                            <textarea
                                                className="flex min-h-[80px] w-full rounded-md border border-slate-200 bg-transparent px-3 py-2 text-sm ring-offset-white placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-800 dark:ring-offset-gray-950 dark:placeholder:text-slate-400 dark:focus-visible:ring-slate-300"
                                                id="bio"
                                                placeholder="Tell us a little bit about yourself"
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label>URLs</Label>
                                            <div className="space-y-2">
                                                <Input placeholder="https://twitter.com/..." className="font-mono text-xs" />
                                                <Input placeholder="https://linkedin.com/..." className="font-mono text-xs" />
                                            </div>
                                            <p className="text-[0.8rem] text-slate-500 dark:text-gray-400">Add links to your website, blog, or social media profiles.</p>
                                        </div>
                                    </div>
                                    <Button type="submit" disabled={loading}>
                                        {loading ? 'Saving...' : 'Update profile'}
                                    </Button>
                                </form>
                            </div>
                        </div>
                    )}

                    {/* Danger Zone */}
                    {activeTab === 'profile' && (
                        <div className="mt-10 pt-10 border-t border-slate-200 dark:border-gray-700 animate-fade-in">
                            <h3 className="text-lg font-medium text-red-600 dark:text-red-500">Danger Zone</h3>
                            <p className="text-sm text-slate-500 dark:text-gray-400 mb-6">Irreversible and destructive actions.</p>

                            <div className="rounded-md border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-900/10 p-4 flex items-center justify-between">
                                <div>
                                    <p className="font-medium text-red-900 dark:text-red-200">Delete Account</p>
                                    <p className="text-sm text-red-700 dark:text-red-300">Permanently delete your account and all associated events.</p>
                                </div>
                                <Button variant="destructive" size="sm" onClick={() => alert("This action is not yet implemented.")}>Delete Account</Button>
                            </div>
                        </div>
                    )}

                    {/* Security Section */}
                    {activeTab === 'security' && (
                        <div className="space-y-6 animate-fade-in">
                            <div>
                                <h3 className="text-lg font-medium text-slate-900 dark:text-gray-100">Security</h3>
                                <p className="text-sm text-slate-500 dark:text-gray-400">Manage your password and security preferences.</p>
                            </div>
                            <div className="border-t border-slate-200 dark:border-gray-700 pt-6">
                                <form onSubmit={handleSave} className="space-y-8">
                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="current">Current Password</Label>
                                            <Input id="current" type="password" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="new">New Password</Label>
                                            <Input id="new" type="password" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="confirm">Confirm Password</Label>
                                            <Input id="confirm" type="password" />
                                        </div>
                                    </div>
                                    <Button type="submit">Update password</Button>
                                </form>
                            </div>
                        </div>
                    )}

                    {/* Appearance Section */}
                    {activeTab === 'appearance' && (
                        <div className="space-y-6 animate-fade-in">
                            <div>
                                <h3 className="text-lg font-medium text-slate-900 dark:text-gray-100">Appearance</h3>
                                <p className="text-sm text-slate-500 dark:text-gray-400">Customize the appearance of the app. Automatically switch between day and night themes.</p>
                            </div>
                            <div className="border-t border-slate-200 dark:border-gray-700 pt-6">
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label>Theme</Label>
                                        <p className="text-[0.8rem] text-slate-500 dark:text-gray-400">Select the theme for the dashboard.</p>

                                        <div className="grid grid-cols-2 gap-4 pt-2">
                                            <div
                                                className={`cursor-pointer rounded-md border-2 p-1 hover:border-slate-900 dark:hover:border-slate-100 ${theme !== 'dark' ? 'border-indigo-600' : 'border-slate-200 dark:border-gray-800'}`}
                                                onClick={() => theme === 'dark' && toggleTheme()}
                                            >
                                                <div className="space-y-2 rounded-sm bg-[#ecedef] p-2">
                                                    <div className="space-y-2 rounded-md bg-white p-2 shadow-sm">
                                                        <div className="h-2 w-[80px] rounded-lg bg-[#ecedef]" />
                                                        <div className="h-2 w-[100px] rounded-lg bg-[#ecedef]" />
                                                    </div>
                                                    <div className="flex items-center space-x-2 rounded-md bg-white p-2 shadow-sm">
                                                        <div className="h-4 w-4 rounded-full bg-[#ecedef]" />
                                                        <div className="h-2 w-[100px] rounded-lg bg-[#ecedef]" />
                                                    </div>
                                                </div>
                                                <div className="p-2 text-center text-sm font-medium">Light</div>
                                            </div>

                                            <div
                                                className={`cursor-pointer rounded-md border-2 p-1 hover:border-slate-900 dark:hover:border-slate-100 ${theme === 'dark' ? 'border-indigo-600' : 'border-slate-200 dark:border-gray-800'}`}
                                                onClick={() => theme !== 'dark' && toggleTheme()}
                                            >
                                                <div className="space-y-2 rounded-sm bg-slate-950 p-2">
                                                    <div className="space-y-2 rounded-md bg-slate-800 p-2 shadow-sm">
                                                        <div className="h-2 w-[80px] rounded-lg bg-slate-400" />
                                                        <div className="h-2 w-[100px] rounded-lg bg-slate-400" />
                                                    </div>
                                                    <div className="flex items-center space-x-2 rounded-md bg-slate-800 p-2 shadow-sm">
                                                        <div className="h-4 w-4 rounded-full bg-slate-400" />
                                                        <div className="h-2 w-[100px] rounded-lg bg-slate-400" />
                                                    </div>
                                                </div>
                                                <div className="p-2 text-center text-sm font-medium">Dark</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Notifications Section */}
                    {activeTab === 'notifications' && (
                        <div className="space-y-6 animate-fade-in">
                            <div>
                                <h3 className="text-lg font-medium text-slate-900 dark:text-gray-100">Notifications</h3>
                                <p className="text-sm text-slate-500 dark:text-gray-400">Configure how you receive notifications.</p>
                            </div>
                            <div className="border-t border-slate-200 dark:border-gray-700 pt-6">
                                <div className="space-y-4">
                                    <div className="flex items-start space-x-3 space-y-0 rounded-md border border-slate-200 dark:border-gray-800 p-4">
                                        <input type="checkbox" className="h-4 w-4 mt-1 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600" defaultChecked />
                                        <div className="space-y-1">
                                            <p className="font-medium text-slate-900 dark:text-gray-100">Communication emails</p>
                                            <p className="text-sm text-slate-500 dark:text-gray-400">Receive emails about your account activity.</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start space-x-3 space-y-0 rounded-md border border-slate-200 dark:border-gray-800 p-4">
                                        <input type="checkbox" className="h-4 w-4 mt-1 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600" defaultChecked />
                                        <div className="space-y-1">
                                            <p className="font-medium text-slate-900 dark:text-gray-100">New ticket sales</p>
                                            <p className="text-sm text-slate-500 dark:text-gray-400">Get notified immediately when a ticket is sold.</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start space-x-3 space-y-0 rounded-md border border-slate-200 dark:border-gray-800 p-4">
                                        <input type="checkbox" className="h-4 w-4 mt-1 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600" />
                                        <div className="space-y-1">
                                            <p className="font-medium text-slate-900 dark:text-gray-100">Marketing emails</p>
                                            <p className="text-sm text-slate-500 dark:text-gray-400">Receive emails about new features and promotions.</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="mt-6">
                                    <Button type="button" onClick={() => alert("Preferences saved!")}>Save preferences</Button>
                                </div>
                            </div>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
};

export default OrganizerSettings;
