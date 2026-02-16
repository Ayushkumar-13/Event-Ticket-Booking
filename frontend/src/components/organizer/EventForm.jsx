import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useEvents } from '../../context/EventContext';
import Input from '../common/Input';
import Button from '../common/Button';
import Card from '../common/Card';
import ErrorMessage from '../common/ErrorMessage';
import { getEventById } from '../../services/eventService';

const EventForm = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { addEvent, editEvent } = useEvents();

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        date: '',
        time: '',
        location: '',
        price: '',
        category: 'Technology',
        image: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&q=80&w=2070',
        availableTickets: 100
    });

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [initialLoading, setInitialLoading] = useState(!!id);

    useEffect(() => {
        if (id) {
            const fetchEvent = async () => {
                try {
                    const data = await getEventById(id);
                    if (data) {
                        setFormData({
                            title: data.title,
                            description: data.description,
                            date: data.date.split('T')[0], // Format for input date
                            time: data.time,
                            location: data.location,
                            price: data.price,
                            category: data.category,
                            image: data.image,
                            availableTickets: data.availableTickets
                        });
                    }
                } catch (err) {
                    setError('Failed to load event details');
                } finally {
                    setInitialLoading(false);
                }
            };
            fetchEvent();
        }
    }, [id]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            if (id) {
                await editEvent(id, formData);
            } else {
                await addEvent(formData);
            }
            navigate('/organizer/events');
        } catch (err) {
            setError(err.message || 'Failed to save event');
        } finally {
            setLoading(false);
        }
    };

    if (initialLoading) return <div>Loading...</div>;

    return (
        <Card className="max-w-2xl mx-auto">
            <h2 className="text-2xl font-bold mb-6">{id ? 'Edit Event' : 'Create New Event'}</h2>

            <ErrorMessage message={error} />

            <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                    label="Event Title"
                    name="title"
                    value={formData.title}
                    onChange={handleChange}
                    required
                />

                <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <textarea
                        name="description"
                        rows="4"
                        value={formData.description}
                        onChange={handleChange}
                        required
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                        label="Date"
                        name="date"
                        type="date"
                        value={formData.date}
                        onChange={handleChange}
                        required
                    />
                    <Input
                        label="Time"
                        name="time"
                        type="time"
                        value={formData.time}
                        onChange={handleChange}
                        required
                    />
                </div>

                <Input
                    label="Location"
                    name="location"
                    value={formData.location}
                    onChange={handleChange}
                    required
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                        label="Price ($)"
                        name="price"
                        type="number"
                        min="0"
                        value={formData.price}
                        onChange={handleChange}
                        required
                    />
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                        <select
                            name="category"
                            value={formData.category}
                            onChange={handleChange}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                        >
                            <option value="Technology">Technology</option>
                            <option value="Music">Music</option>
                            <option value="Art">Art</option>
                            <option value="Business">Business</option>
                            <option value="Food">Food</option>
                        </select>
                    </div>
                </div>

                <Input
                    label="Available Tickets"
                    name="availableTickets"
                    type="number"
                    min="1"
                    value={formData.availableTickets}
                    onChange={handleChange}
                    required
                />

                <Input
                    label="Image URL"
                    name="image"
                    value={formData.image}
                    onChange={handleChange}
                    placeholder="https://example.com/image.jpg"
                />

                <div className="flex justify-end gap-3 pt-4">
                    <Button variant="secondary" onClick={() => navigate('/organizer/events')}>
                        Cancel
                    </Button>
                    <Button type="submit" isLoading={loading}>
                        {id ? 'Update Event' : 'Create Event'}
                    </Button>
                </div>
            </form>
        </Card>
    );
};

export default EventForm;
