import React from 'react';
import Badge from '../common/Badge';

const RegistrationItem = ({ registration }) => {

    // Status color mapping
    const getStatusVariant = (status) => {
        switch (status.toLowerCase()) {
            case 'confirmed': return 'success';
            case 'pending': return 'warning';
            case 'cancelled': return 'danger';
            default: return 'primary';
        }
    };

    return (
        <tr className="hover:bg-gray-50 transition-colors">
            <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center">
                    <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-xs uppercase mr-3">
                        {registration.user.charAt(0)}
                    </div>
                    <div>
                        <div className="text-sm font-medium text-gray-900">{registration.user}</div>
                        <div className="text-sm text-gray-500">{registration.email}</div>
                    </div>
                </div>
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {registration.event}
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {new Date(registration.date).toLocaleDateString()}
            </td>
            <td className="px-6 py-4 whitespace-nowrap">
                <Badge variant={getStatusVariant(registration.status)}>
                    {registration.status}
                </Badge>
            </td>
        </tr>
    );
};

export default RegistrationItem;
