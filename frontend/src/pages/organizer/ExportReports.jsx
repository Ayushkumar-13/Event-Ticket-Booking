import React, { useState } from 'react';
import { useEvents } from '../../context/EventContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { FileDown, Loader2 } from 'lucide-react';
import api from '../../services/api';

const ExportReports = () => {
    const { organizerEvents, loading: eventsLoading } = useEvents();
    const [exporting, setExporting] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    // Calculate totals
    const totalEvents = organizerEvents.length;

    // Note: These would ideally come from a consolidated stats endpoint, 
    // but we can aggregate client-side if the event object has these fields.
    // Assuming event object has soldTickets. If not, we'd need to fetch stats or use 0.
    const totalTicketsSold = organizerEvents.reduce((acc, event) => acc + (event.soldTickets || 0), 0);
    // Assuming revenue calculation is needed, but we might not have it strictly on the event object without a join.
    // We'll calculate estimated revenue based on sold * price if not provided.
    const estimatedRevenue = organizerEvents.reduce((acc, event) => acc + ((event.soldTickets || 0) * event.price), 0);

    const filteredEvents = organizerEvents.filter(event =>
        event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        event.category.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleExport = async (eventId, eventTitle) => {
        setExporting(true);
        console.log(`Starting export for event: ${eventTitle} (${eventId})`);
        try {
            console.log("Fetching registrations...");
            const response = await api.get(`/registrations/event/${eventId}`);
            console.log("Response received:", response);
            const registrations = response.data;

            if (!registrations || registrations.length === 0) {
                console.warn("No registrations found.");
                alert('No registrations found for this event.');
                setExporting(false);
                return;
            }

            console.log(`Found ${registrations.length} registrations. Converting to CSV...`);

            const csvRows = [];
            csvRows.push(['Registration ID', 'Attendee Name', 'Email', 'Tickets', 'Amount Paid', 'Date']);

            registrations.forEach(reg => {
                const row = [
                    reg._id,
                    reg.user?.name || 'Guest',
                    reg.user?.email || 'N/A',
                    reg.ticketCount,
                    reg.totalAmount,
                    new Date(reg.createdAt).toLocaleDateString()
                ];
                csvRows.push(row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(','));
            });

            const csvContent = "data:text/csv;charset=utf-8," + csvRows.join('\n');
            const encodedUri = encodeURI(csvContent);

            console.log("Triggering download...");
            const link = document.createElement("a");
            link.style.display = "none"; // Hide the link
            link.setAttribute("href", encodedUri);
            link.setAttribute("download", `${eventTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_report.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            console.log("Download triggered.");

        } catch (error) {
            console.error("Export failed:", error);
            if (error.response) {
                console.error("Server responded with:", error.response.status, error.response.data);
                alert(`Export failed: Server error ${error.response.status}`);
            } else if (error.request) {
                console.error("No response received:", error.request);
                alert("Export failed: Network error, no response from server.");
            } else {
                console.error("Error setting up request:", error.message);
                alert(`Export failed: ${error.message}`);
            }
        } finally {
            setExporting(false);
        }
    };

    return (
        <div className="max-w-7xl mx-auto py-10 px-4 md:px-8 space-y-8">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-600 dark:from-indigo-400 dark:to-violet-400 tracking-tight">
                        Export Reports
                    </h1>
                    <p className="text-slate-500 dark:text-gray-400 mt-2 text-lg">
                        Download attendee lists and analyze sales performance.
                    </p>
                </div>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                    { label: 'Total Events', value: totalEvents, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20', border: 'border-blue-100 dark:border-blue-800' },
                    { label: 'Total Tickets Sold', value: totalTicketsSold, color: 'text-indigo-600', bg: 'bg-indigo-50 dark:bg-indigo-900/20', border: 'border-indigo-100 dark:border-indigo-800' },
                    { label: 'Est. Revenue', value: `$${estimatedRevenue.toLocaleString()}`, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-900/20', border: 'border-emerald-100 dark:border-emerald-800' }
                ].map((stat, index) => (
                    <div key={index} className={`relative overflow-hidden rounded-2xl border ${stat.border} ${stat.bg} p-6 transition-transform hover:scale-[1.02] duration-300`}>
                        <div className="relative z-10 flex flex-col items-center justify-center text-center">
                            <p className="text-sm font-semibold tracking-wide uppercase text-slate-500 dark:text-gray-400 mb-1">
                                {stat.label}
                            </p>
                            <h3 className={`text-4xl font-bold ${stat.color} dark:text-white`}>
                                {stat.value}
                            </h3>
                        </div>
                        {/* Decorative Circle */}
                        <div className={`absolute -right-6 -top-6 h-24 w-24 rounded-full ${stat.color.replace('text', 'bg')}/10 blur-xl`}></div>
                    </div>
                ))}
            </div>

            <Card className="border-slate-200 dark:border-gray-700 shadow-xl shadow-slate-200/40 dark:shadow-none overflow-hidden rounded-2xl">
                <CardHeader className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 bg-white dark:bg-gray-800 p-6 border-b border-slate-100 dark:border-gray-700">
                    <div>
                        <CardTitle className="text-xl font-bold text-slate-800 dark:text-gray-100">Available Reports</CardTitle>
                        <CardDescription className="text-slate-500 dark:text-gray-400 mt-1">
                            Select an event to download its attendee list as a CSV file.
                        </CardDescription>
                    </div>
                    <div className="w-full sm:w-auto">
                        <div className="relative group">
                            <input
                                type="text"
                                placeholder="Search events..."
                                className="w-full sm:w-72 pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-gray-700 bg-slate-50 dark:bg-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all shadow-sm"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                            <svg className="absolute left-3 top-3 h-4 w-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-100 dark:divide-gray-700">
                            <thead className="bg-slate-50/80 dark:bg-gray-900/50 backdrop-blur-sm">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 dark:text-gray-400 uppercase tracking-wider">Event Name</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 dark:text-gray-400 uppercase tracking-wider">Date</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 dark:text-gray-400 uppercase tracking-wider">Sold / Total</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 dark:text-gray-400 uppercase tracking-wider">Revenue</th>
                                    <th className="px-6 py-4 text-right text-xs font-semibold text-slate-500 dark:text-gray-400 uppercase tracking-wider">Action</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-gray-800 divide-y divide-slate-50 dark:divide-gray-700">
                                {filteredEvents.map((event) => (
                                    <tr key={event._id} className="group hover:bg-slate-50 dark:hover:bg-gray-700/50 transition-colors duration-200">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex flex-col gap-1.5">
                                                <div className="text-sm font-bold text-slate-800 dark:text-gray-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                                    {event.title}
                                                </div>
                                                <div className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-600 dark:bg-gray-700 dark:text-gray-300 w-fit">
                                                    {event.category}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-600 dark:text-gray-300">
                                            {new Date(event.date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${(event.soldTickets || 0) > 0
                                                    ? 'bg-indigo-50 text-indigo-700 border-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-800'
                                                    : 'bg-slate-50 text-slate-600 border-slate-100 dark:bg-gray-700 dark:text-gray-400 dark:border-gray-600'
                                                }`}>
                                                <span className={`w-1.5 h-1.5 rounded-full mr-2 ${(event.soldTickets || 0) > 0 ? 'bg-indigo-500' : 'bg-slate-400'}`}></span>
                                                {event.soldTickets || 0} / {(event.soldTickets || 0) + event.availableTickets}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-slate-700 dark:text-gray-200">
                                            ${((event.soldTickets || 0) * event.price).toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleExport(event._id, event.title)}
                                                disabled={exporting}
                                                className={`transition-all duration-200 border-slate-200 dark:border-gray-600 ${exporting
                                                    ? 'opacity-70 cursor-not-allowed'
                                                    : 'hover:border-indigo-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 dark:hover:text-indigo-400'
                                                    }`}
                                            >
                                                {exporting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <FileDown className="h-4 w-4 mr-2" />}
                                                {exporting ? 'Exporting...' : 'Export CSV'}
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                                {filteredEvents.length === 0 && (
                                    <tr>
                                        <td colSpan="5" className="px-6 py-16 text-center">
                                            <div className="flex flex-col items-center justify-center">
                                                <div className="h-12 w-12 rounded-full bg-slate-50 dark:bg-gray-800 flex items-center justify-center mb-3">
                                                    <svg className="h-6 w-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                    </svg>
                                                </div>
                                                <p className="text-slate-500 dark:text-gray-400 font-medium">
                                                    {searchTerm ? 'No events match your search.' : 'No events found to export.'}
                                                </p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default ExportReports;
