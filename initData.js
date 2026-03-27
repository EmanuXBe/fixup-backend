import User from './models/User.js';
import Servicio from './models/Servicio.js';

const initialUsers = [
    { username: 'juan_perez', email: 'juan@example.com', password: 'password123' },
    { username: 'maria_garcia', email: 'maria@example.com', password: 'password456' },
    { username: 'carlos_lopez', email: 'carlos@example.com', password: 'password789' },
];

const initialServicios = [
    { nombre: 'Remodelación de Cocina', descripcion: 'Renovación completa de gabinetes, encimeras e iluminación.', imagenUrl: 'https://example.com/cocina.jpg', categoria: 'Cocina' },
    { nombre: 'Pintura Interior', descripcion: 'Servicio profesional de pintura para todas las habitaciones.', imagenUrl: 'https://example.com/pintura.jpg', categoria: 'Paredes' },
    { nombre: 'Instalación de Pisos', descripcion: 'Instalación de madera, laminado o porcelanato.', imagenUrl: 'https://example.com/pisos.jpg', categoria: 'Pisos' },
    { nombre: 'Remodelación de Baño', descripcion: 'Actualización de sanitarios, azulejos y grifería.', imagenUrl: 'https://example.com/bano.jpg', categoria: 'Baño' },
    { nombre: 'Electricidad General', descripcion: 'Revisión y actualización de sistemas eléctricos.', imagenUrl: 'https://example.com/electricidad.jpg', categoria: 'Instalaciones' },
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
