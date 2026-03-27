import User from './models/User.js';
import Servicio from './models/Servicio.js';

const initialUsers = [
    { username: 'juan_perez', email: 'juan@example.com', password: 'password123' },
    { username: 'maria_garcia', email: 'maria@example.com', password: 'password456' },
    { username: 'carlos_lopez', email: 'carlos@example.com', password: 'password789' },
];

const initialServicios = [
    { nombre: 'Remodelación de Cocina', descripcion: 'Renovación completa de gabinetes, encimeras e iluminación.', image_url: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800', categoria: 'Cocina' },
    { nombre: 'Pintura Interior', descripcion: 'Servicio profesional de pintura para todas las habitaciones.', image_url: 'https://images.unsplash.com/photo-1562259949-e8e7689d7828?w=800', categoria: 'Paredes' },
    { nombre: 'Instalación de Pisos', descripcion: 'Instalación de madera, laminado o porcelanato.', image_url: 'https://images.unsplash.com/photo-1615529328331-f8917597711f?w=800', categoria: 'Pisos' },
    { nombre: 'Remodelación de Baño', descripcion: 'Actualización de sanitarios, azulejos y grifería.', image_url: 'https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?w=800', categoria: 'Baño' },
    { nombre: 'Electricidad General', descripcion: 'Revisión y actualización de sistemas eléctricos.', image_url: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=800', categoria: 'Instalaciones' },
];

export const loadInitialData = async () => {
    try {
        const userCount = await User.count();
        const servicioCount = await Servicio.count();

        if (userCount === 0) {
            await User.bulkCreate(initialUsers);
            console.log('Usuarios iniciales cargados.');
        }

        if (servicioCount === 0) {
            await Servicio.bulkCreate(initialServicios);
            console.log('Servicios iniciales cargados.');
        }
    } catch (error) {
        console.error('Error cargando datos iniciales:', error);
    }
};
