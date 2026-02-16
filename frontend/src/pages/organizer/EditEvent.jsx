import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useEvents } from '../../context/EventContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Button } from '../../components/ui/button';
import { Calendar, DollarSign, MapPin, Tag, Image as ImageIcon, Loader2 } from 'lucide-react';
import { getEventById } from '../../services/eventService';

const EditEvent = () => {
    const { id } = useParams();
    const { editEvent, loading: contextLoading } = useEvents();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [success, setSuccess] = useState(false);
    const [fetchError, setFetchError] = useState(null);

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        date: '',
        time: '',
        location: '',
        price: '',
        category: '',
        availableTickets: '',
        image: ''
    });

    const categories = ['Technology', 'Music', 'Art', 'Business', 'Food'];

    const [errors, setErrors] = useState({});

    useEffect(() => {
        const fetchEventDetails = async () => {
            try {
                const data = await getEventById(id);
                // Format date to YYYY-MM-DD for input type="date"
                const formattedDate = data.date ? new Date(data.date).toISOString().split('T')[0] : '';

                setFormData({
                    title: data.title || '',
                    description: data.description || '',
                    date: formattedDate,
                    time: data.time || '',
                    location: data.location || '',
                    price: data.price || 0,
                    category: data.category || '',
                    availableTickets: data.availableTickets || 0,
                    image: data.image || ''
                });
                setLoading(false);
            } catch (err) {
                console.error("Error fetching event:", err);
                setFetchError("Failed to load event details.");
                setLoading(false);
            }
        };

        if (id) {
            fetchEventDetails();
        }
    }, [id]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        // Clear error when user types
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: null }));
        }
    };

    const validateForm = () => {
        const newErrors = {};
        if (!formData.title) newErrors.title = "Event title is required";
        if (!formData.date) newErrors.date = "Date is required";
        if (!formData.time) newErrors.time = "Time is required";
        if (!formData.location) newErrors.location = "Location is required";
        if (formData.price === '') newErrors.price = "Price is required";
        if (formData.availableTickets === '') newErrors.availableTickets = "Ticket count is required";

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validateForm()) return;

        try {
            const result = await editEvent(id, formData);
            if (result.success) {
                setSuccess(true);
                // Delay navigation to show "Success" effect
                setTimeout(() => {
                    navigate('/organizer/events');
                }, 1500);
            } else {
                console.error("Failed to update event:", result.message);
            }
        } catch (error) {
            console.error("Failed to update event", error);
        }
    };

    if (loading) {
        return (
            <div className="flex h-[50vh] w-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
            </div>
        );
    }

    if (fetchError) {
        return (
            <div className="max-w-5xl mx-auto py-8 text-center">
                <h2 className="text-xl font-bold text-red-600">Error</h2>
                <p className="text-slate-600 mt-2">{fetchError}</p>
                <Button variant="outline" className="mt-4" onClick={() => navigate('/organizer/events')}>
                    Back to Events
                </Button>
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto py-8">
            {success && (
                <div className="mb-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl flex items-center shadow-sm animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mr-3">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                    </div>
                    <div>
                        <p className="font-bold">Event Updated Successfully!</p>
                        <p className="text-sm">Redirecting to your dashboard...</p>
                    </div>
                </div>
            )}

            <div className="mb-8">
                <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Edit Event</h1>
                <p className="text-slate-500 mt-2">Update the details of your event below.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Form Section */}
                <div className="lg:col-span-2 space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Event Details</CardTitle>
                            <CardDescription>Basic information about your event.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="title">Event Title *</Label>
                                <Input
                                    id="title"
                                    name="title"
                                    placeholder="e.g. Annual Tech Conference 2024"
                                    value={formData.title}
                                    onChange={handleChange}
                                    className={errors.title ? "border-red-500" : ""}
                                />
                                {errors.title && <p className="text-xs text-red-500">{errors.title}</p>}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="description">Description</Label>
                                <Textarea
                                    id="description"
                                    name="description"
                                    placeholder="Describe what your event is about..."
                                    className="min-h-[120px]"
                                    value={formData.description}
                                    onChange={handleChange}
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="category">Category</Label>
                                    <div className="relative">
                                        <Tag className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                                        <select
                                            id="category"
                                            name="category"
                                            className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 pl-9 text-sm ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                            value={formData.category}
                                            onChange={handleChange}
                                        >
                                            <option value="" disabled>Select a category</option>
                                            {categories.map(cat => (
                                                <option key={cat} value={cat}>{cat}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="location">Location *</Label>
                                    <div className="relative">
                                        <MapPin className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                                        <Input
                                            id="location"
                                            name="location"
                                            placeholder="Venue address or Online"
                                            value={formData.location}
                                            onChange={handleChange}
                                            className={errors.location ? "border-red-500 pl-9" : "pl-9"}
                                        />
                                    </div>
                                    {errors.location && <p className="text-xs text-red-500">{errors.location}</p>}
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Date & Ticket Settings</CardTitle>
                            <CardDescription>Manage when your event happens and how much it costs.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="date">Date *</Label>
                                    <div className="relative">
                                        <Calendar className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                                        <Input
                                            id="date"
                                            name="date"
                                            type="date"
                                            value={formData.date}
                                            onChange={handleChange}
                                            className={errors.date ? "border-red-500 pl-9" : "pl-9"}
                                        />
                                    </div>
                                    {errors.date && <p className="text-xs text-red-500">{errors.date}</p>}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="time">Time *</Label>
                                    <Input
                                        id="time"
                                        name="time"
                                        type="time"
                                        value={formData.time}
                                        onChange={handleChange}
                                        className={errors.time ? "border-red-500" : ""}
                                    />
                                    {errors.time && <p className="text-xs text-red-500">{errors.time}</p>}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="price">Price ($) *</Label>
                                    <div className="relative">
                                        <DollarSign className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                                        <Input
                                            id="price"
                                            name="price"
                                            type="number"
                                            placeholder="0.00"
                                            min="0"
                                            value={formData.price}
                                            onChange={handleChange}
                                            className={errors.price ? "border-red-500 pl-9" : "pl-9"}
                                        />
                                    </div>
                                    {errors.price && <p className="text-xs text-red-500">{errors.price}</p>}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="availableTickets">Available Tickets *</Label>
                                    <Input
                                        id="availableTickets"
                                        name="availableTickets"
                                        type="number"
                                        placeholder="100"
                                        min="1"
                                        value={formData.availableTickets}
                                        onChange={handleChange}
                                        className={errors.availableTickets ? "border-red-500" : ""}
                                    />
                                    {errors.availableTickets && <p className="text-xs text-red-500">{errors.availableTickets}</p>}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Sidebar Section */}
                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Event Image</CardTitle>
                            <CardDescription>Add a cover image URL.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="aspect-video bg-slate-100 rounded-lg overflow-hidden border border-slate-200 flex items-center justify-center relative group">
                                {formData.image ? (
                                    <img
                                        src={formData.image}
                                        alt="Preview"
                                        className="w-full h-full object-cover"
                                        onError={(e) => {
                                            e.target.onerror = null;
                                            e.target.src = 'https://placehold.co/600x400?text=Invalid+Image';
                                        }}
                                    />
                                ) : (
                                    <div className="text-center p-4">
                                        <ImageIcon className="mx-auto h-10 w-10 text-slate-300 mb-2" />
                                        <p className="text-xs text-slate-400">No image selected</p>
                                    </div>
                                )}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="image">Image URL</Label>
                                <Input
                                    id="image"
                                    name="image"
                                    placeholder="https://..."
                                    value={formData.image}
                                    onChange={handleChange}
                                />
                                <p className="text-xs text-slate-500">Paste a direct link to an image (Unsplash, etc.)</p>
                            </div>
                        </CardContent>
                    </Card>

                    <div className="flex gap-4">
                        <Button variant="outline" className="w-full" onClick={() => navigate('/organizer/events')}>
                            Cancel
                        </Button>
                        <Button variant="indigo" className="w-full" onClick={handleSubmit} disabled={contextLoading || loading || success}>
                            {contextLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            {success ? 'Saved!' : (contextLoading ? 'Saving...' : 'Save Changes')}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EditEvent;
