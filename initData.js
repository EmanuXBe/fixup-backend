import User from './models/User.js';
import Service from './models/Service.js';
import Review from './models/Review.js';

const initialUsers = [
    { username: 'juan_perez', email: 'juan@example.com', password: 'password123' },
    { username: 'maria_garcia', email: 'maria@example.com', password: 'password456' },
    { username: 'carlos_lopez', email: 'carlos@example.com', password: 'password789' },
    { username: 'ana_martinez', email: 'ana@example.com', password: 'password101' },
    { username: 'pedro_sanchez', email: 'pedro@example.com', password: 'password202' },
    { username: 'lucia_fernandez', email: 'lucia@example.com', password: 'password303' },
    { username: 'diego_ramirez', email: 'diego@example.com', password: 'password404' },
    { username: 'sofia_torres', email: 'sofia@example.com', password: 'password505' },
];

const initialServices = [
    { title: 'Kitchen Remodel', description: 'Complete cabinet, countertop and lighting renovation.', image_url: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800', categoria: 'Kitchen' },
    { title: 'Interior Painting', description: 'Professional painting service for all rooms.', image_url: 'https://images.unsplash.com/photo-1562259949-e8e7689d7828?w=800', categoria: 'Walls' },
    { title: 'Flooring Installation', description: 'Wood, laminate or tile flooring installation.', image_url: 'https://images.unsplash.com/photo-1615529328331-f8917597711f?w=800', categoria: 'Floors' },
    { title: 'Bathroom Remodel', description: 'Upgrade of fixtures, tiles and faucets.', image_url: 'https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?w=800', categoria: 'Bathroom' },
    { title: 'General Electrical', description: 'Inspection and upgrade of electrical systems.', image_url: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=800', categoria: 'Electrical' },
];

/**
 * 10 reseñas distribuidas entre diferentes usuarios y servicios.
 * user_id: 1-8 (los 8 usuarios), service_id: 1-5 (los 5 servicios).
 */
const initialReviews = [
    { rating: 5, comment: 'Excelente trabajo en la cocina, quedó como nueva.', user_id: 1, service_id: 1 },
    { rating: 4, comment: 'Buena pintura, pero tardaron un poco más de lo esperado.', user_id: 2, service_id: 2 },
    { rating: 5, comment: 'El piso de madera quedó espectacular, muy profesionales.', user_id: 3, service_id: 3 },
    { rating: 3, comment: 'El baño quedó bien, pero hubo algunos detalles menores.', user_id: 4, service_id: 4 },
    { rating: 5, comment: 'Servicio eléctrico rápido y seguro, muy recomendado.', user_id: 5, service_id: 5 },
    { rating: 4, comment: 'Remodelación de cocina con buenos acabados y materiales.', user_id: 6, service_id: 1 },
    { rating: 2, comment: 'La pintura se descascaró al poco tiempo, decepcionante.', user_id: 7, service_id: 2 },
    { rating: 5, comment: 'Instalación de pisos impecable, cero quejas.', user_id: 8, service_id: 3 },
    { rating: 4, comment: 'Buen trabajo en el baño, relación calidad-precio justa.', user_id: 1, service_id: 4 },
    { rating: 5, comment: 'Resolvieron un problema eléctrico complejo en pocas horas.', user_id: 3, service_id: 5 },
];

export const loadInitialData = async () => {
    try {
        const userCount = await User.count();
        const serviceCount = await Service.count();
        const reviewCount = await Review.count();

        if (userCount === 0) {
            await User.bulkCreate(initialUsers);
            console.log('Initial users loaded (8 users).');
        }

        if (serviceCount === 0) {
            await Service.bulkCreate(initialServices);
            console.log('Initial services loaded (5 services).');
        }

        if (reviewCount === 0) {
            await Review.bulkCreate(initialReviews);
            console.log('Initial reviews loaded (10 reviews).');
        }
    } catch (error) {
        console.error('Error loading initial data:', error);
    }
};
