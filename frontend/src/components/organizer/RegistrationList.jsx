import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Badge } from '../../components/ui/badge';
import { Search, Download, Filter, FileText, CheckCircle, XCircle, Clock, Calendar, ArrowUpDown, RefreshCw } from 'lucide-react';
import { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbPage, BreadcrumbSeparator } from '../../components/ui/breadcrumb';

const RegistrationList = () => {
    // Mock Data
    const [registrations, setRegistrations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');
    const [dateRange, setDateRange] = useState({ start: '', end: '' });

    const fetchRegistrations = async () => {
        setLoading(true);
        try {
            const response = await api.get('/tickets/organizer');
            const data = response.data.map(ticket => ({
                id: ticket._id,
                event: ticket.event?.title || 'Unknown Event',
                user: ticket.user?.name || 'Unknown User',
                email: ticket.user?.email || 'N/A',
                date: ticket.createdAt,
                amount: (ticket.event?.price || 0) * ticket.quantity,
                status: ticket.status
            }));
            setRegistrations(data);
        } catch (error) {
            console.error("Failed to fetch registrations:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRegistrations();
    }, []);

    // Filter Logic
    const filteredRegistrations = registrations.filter(reg => {
        const matchesSearch = reg.user.toLowerCase().includes(searchTerm.toLowerCase()) ||
            reg.event.toLowerCase().includes(searchTerm.toLowerCase()) ||
            reg.email.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === 'All' || reg.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    // Stats Logic
    const totalRevenue = filteredRegistrations.reduce((sum, reg) => reg.status === 'Confirmed' ? sum + reg.amount : sum, 0);
    const totalAttendees = filteredRegistrations.filter(reg => reg.status === 'Confirmed').length;

    // Export Handler
    const handleExport = () => {
        const headers = ["ID", "Event", "Attendee", "Email", "Date", "Amount", "Status"];
        const csvContent = [
            headers.join(","),
            ...filteredRegistrations.map(reg =>
                [reg.id, `"${reg.event}"`, `"${reg.user}"`, reg.email, reg.date, reg.amount, reg.status].join(",")
            )
        ].join("\n");

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `registrations_report_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const getStatusVariant = (status) => {
        switch (status) {
            case 'Confirmed': return 'success';
            case 'Pending': return 'warning';
            case 'Cancelled': return 'danger';
            default: return 'secondary';
        }
    };

    return (
        <div className="space-y-6 animate-fade-in max-w-7xl mx-auto">
            {/* Page Header / Navbar */}
            <div className="flex flex-col gap-4 border-b border-slate-200 dark:border-gray-700 pb-6">
                <div className="flex items-center justify-between">
                    <Breadcrumb>
                        <BreadcrumbList>
                            <BreadcrumbItem>
                                <BreadcrumbLink href="/organizer/dashboard">Dashboard</BreadcrumbLink>
                            </BreadcrumbItem>
                            <BreadcrumbSeparator />
                            <BreadcrumbItem>
                                <BreadcrumbPage>Export Reports</BreadcrumbPage>
                            </BreadcrumbItem>
                        </BreadcrumbList>
                    </Breadcrumb>
                    <div className="text-xs text-slate-500 dark:text-gray-400 flex items-center gap-2">
                        <Clock size={12} />
                        Updated just now
                    </div>
                </div>

                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900 dark:text-gray-100 tracking-tight">Export Reports</h1>
                        <p className="text-slate-500 dark:text-gray-400">Generate and download detailed reports for your events.</p>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={fetchRegistrations} className="dark:bg-transparent dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800">
                            <RefreshCw size={16} className={`mr-2 ${loading ? 'animate-spin' : ''}`} />
                            Refresh
                        </Button>
                        <Button onClick={handleExport} variant="indigo" size="sm" className="gap-2">
                            <Download size={16} />
                            Export CSV
                        </Button>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Configuration Sidebar */}
                <div className="lg:col-span-1 space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Report Settings</CardTitle>
                            <CardDescription>Filter data for your report.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label>Date Range</Label>
                                <div className="grid grid-cols-2 gap-2">
                                    <Input
                                        type="date"
                                        className="text-xs"
                                        value={dateRange.start}
                                        onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                                    />
                                    <Input
                                        type="date"
                                        className="text-xs"
                                        value={dateRange.end}
                                        onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>Status</Label>
                                <select
                                    className="flex h-10 w-full rounded-md border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 disabled:cursor-not-allowed disabled:opacity-50 dark:ring-offset-gray-950 dark:placeholder:text-slate-400 dark:focus-visible:ring-slate-300 dark:text-gray-100"
                                    value={statusFilter}
                                    onChange={(e) => setStatusFilter(e.target.value)}
                                >
                                    <option value="All">All Statuses</option>
                                    <option value="Confirmed">Confirmed</option>
                                    <option value="Pending">Pending</option>
                                    <option value="Cancelled">Cancelled</option>
                                </select>
                            </div>

                            <div className="space-y-2">
                                <Label>Event Type</Label>
                                <select className="flex h-10 w-full rounded-md border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 disabled:cursor-not-allowed disabled:opacity-50 dark:ring-offset-gray-950 dark:placeholder:text-slate-400 dark:focus-visible:ring-slate-300 dark:text-gray-100">
                                    <option value="all">All Events</option>
                                    <option value="conference">Conferences</option>
                                    <option value="workshop">Workshops</option>
                                    <option value="concert">Concerts</option>
                                </select>
                            </div>

                            <Button className="w-full dark:bg-transparent dark:border-gray-700 dark:hover:bg-gray-800 dark:text-gray-200" variant="outline" onClick={() => {
                                setStatusFilter('All');
                                setSearchTerm('');
                                setDateRange({ start: '', end: '' });
                            }}>
                                <RefreshCw size={14} className="mr-2" /> Reset Filters
                            </Button>
                        </CardContent>
                    </Card>

                    <Card className="bg-indigo-50 dark:bg-indigo-900/20 border-indigo-100 dark:border-indigo-900">
                        <CardHeader>
                            <CardTitle className="text-indigo-900 dark:text-indigo-100 text-lg">Export Options</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <Button onClick={handleExport} variant="indigo" className="w-full">
                                <Download size={16} className="mr-2" />
                                Download CSV
                            </Button>
                            <Button variant="ghost" className="w-full text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/40">
                                <FileText size={16} className="mr-2" />
                                Preview PDF
                            </Button>
                        </CardContent>
                    </Card>
                </div>

                {/* Report Preview */}
                <div className="lg:col-span-3 space-y-6">
                    {/* Stats Cards Row */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <Card>
                            <CardContent className="p-6">
                                <div className="flex items-center justify-between space-y-0 pb-2">
                                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Revenue</p>
                                    <FileText className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                                </div>
                                <div className="text-2xl font-bold text-slate-900 dark:text-slate-50">${totalRevenue.toLocaleString()}</div>
                                <p className="text-xs text-slate-500 dark:text-slate-400">+20.1% from last month</p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="p-6">
                                <div className="flex items-center justify-between space-y-0 pb-2">
                                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Confirmed Attendees</p>
                                    <CheckCircle className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                                </div>
                                <div className="text-2xl font-bold text-slate-900 dark:text-slate-50">{totalAttendees}</div>
                                <p className="text-xs text-slate-500 dark:text-slate-400">+180 new this week</p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="p-6">
                                <div className="flex items-center justify-between space-y-0 pb-2">
                                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Pending Actions</p>
                                    <Clock className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                                </div>
                                <div className="text-2xl font-bold text-slate-900 dark:text-slate-50">{filteredRegistrations.filter(r => r.status === 'Pending').length}</div>
                                <p className="text-xs text-slate-500 dark:text-slate-400">Requires review</p>
                            </CardContent>
                        </Card>
                    </div>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle>Data Preview</CardTitle>
                                <CardDescription>A preview of the data to be exported based on current filters.</CardDescription>
                            </div>
                            <div className="w-full max-w-sm">
                                <div className="relative">
                                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500 dark:text-slate-400" />
                                    <Input
                                        className="pl-9"
                                        placeholder="Search preview..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="rounded-md border border-slate-200 dark:border-gray-800">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-slate-50 dark:bg-gray-900/50 text-slate-500 dark:text-gray-400 border-b border-slate-200 dark:border-gray-800">
                                        <tr>
                                            <th className="h-12 px-4 text-left align-middle font-medium">Attendee</th>
                                            <th className="h-12 px-4 text-left align-middle font-medium">Event</th>
                                            <th className="h-12 px-4 text-left align-middle font-medium">Date</th>
                                            <th className="h-12 px-4 text-left align-middle font-medium">Amount</th>
                                            <th className="h-12 px-4 text-left align-middle font-medium">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-gray-800">
                                        {loading ? (
                                            <tr>
                                                <td colSpan="5" className="h-24 text-center align-middle text-slate-500 dark:text-gray-400">
                                                    Loading registrations...
                                                </td>
                                            </tr>
                                        ) : filteredRegistrations.length > 0 ? (
                                            filteredRegistrations.map((reg) => (
                                                <tr key={reg.id} className="hover:bg-slate-50 dark:hover:bg-gray-800/50 transition-colors">
                                                    <td className="p-4 align-middle">
                                                        <div className="font-medium">{reg.user}</div>
                                                        <div className="text-xs text-slate-500">{reg.email}</div>
                                                    </td>
                                                    <td className="p-4 align-middle text-slate-600 dark:text-gray-300">{reg.event}</td>
                                                    <td className="p-4 align-middle text-slate-600 dark:text-gray-300">
                                                        {new Date(reg.date).toLocaleDateString()}
                                                    </td>
                                                    <td className="p-4 align-middle font-medium text-slate-900 dark:text-gray-200">
                                                        ${reg.amount}
                                                    </td>
                                                    <td className="p-4 align-middle">
                                                        <Badge variant={getStatusVariant(reg.status)}>
                                                            {reg.status}
                                                        </Badge>
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan="5" className="h-24 text-center align-middle text-slate-500 dark:text-gray-400">
                                                    No results found.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default RegistrationList;
