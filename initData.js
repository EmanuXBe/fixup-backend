import User from './models/User.js';
import Service from './models/Service.js';

const initialUsers = [
    { username: 'juan_perez', email: 'juan@example.com', password: 'password123' },
    { username: 'maria_garcia', email: 'maria@example.com', password: 'password456' },
    { username: 'carlos_lopez', email: 'carlos@example.com', password: 'password789' },
];

const initialServices = [
    { title: 'Kitchen Remodel', description: 'Complete cabinet, countertop and lighting renovation.', image_url: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800', categoria: 'Kitchen' },
    { title: 'Interior Painting', description: 'Professional painting service for all rooms.', image_url: 'https://images.unsplash.com/photo-1562259949-e8e7689d7828?w=800', categoria: 'Walls' },
    { title: 'Flooring Installation', description: 'Wood, laminate or tile flooring installation.', image_url: 'https://images.unsplash.com/photo-1615529328331-f8917597711f?w=800', categoria: 'Floors' },
    { title: 'Bathroom Remodel', description: 'Upgrade of fixtures, tiles and faucets.', image_url: 'https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?w=800', categoria: 'Bathroom' },
    { title: 'General Electrical', description: 'Inspection and upgrade of electrical systems.', image_url: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=800', categoria: 'Electrical' },
];

export const loadInitialData = async () => {
    try {
        const userCount = await User.count();
        const serviceCount = await Service.count();

        if (userCount === 0) {
            await User.bulkCreate(initialUsers);
            console.log('Initial users loaded.');
        }

        if (serviceCount === 0) {
            await Service.bulkCreate(initialServices);
            console.log('Initial services loaded.');
        }
    } catch (error) {
        console.error('Error loading initial data:', error);
    }
};
