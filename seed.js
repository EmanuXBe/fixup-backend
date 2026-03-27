const pool = require('./db');

const seedDatabase = async () => {
    try {
        console.log('Iniciando la creación de tablas y carga de datos...');

        // 1. Crear Tablas
        await pool.query(`
      DROP TABLE IF EXISTS reviews, properties, users CASCADE;

      CREATE TABLE users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL
      );

      CREATE TABLE properties (
        id SERIAL PRIMARY KEY,
        title VARCHAR(200) NOT NULL,
        description TEXT,
        price NUMERIC(10, 2) NOT NULL,
        location VARCHAR(100)
      );

      CREATE TABLE reviews (
        id SERIAL PRIMARY KEY,
        rating INTEGER CHECK (rating >= 1 AND rating <= 5),
        comment TEXT,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        property_id INTEGER REFERENCES properties(id) ON DELETE CASCADE
      );
    `);

        // 2. Insertar Usuarios
        await pool.query(`
      INSERT INTO users (name, email) VALUES 
      ('Carlos Perez', 'carlos@ejemplo.com'),
      ('Ana Gomez', 'ana@ejemplo.com'),
      ('Luis Ramirez', 'luis@ejemplo.com');
    `);

        // 3. Insertar Inmuebles
        await pool.query(`
      INSERT INTO properties (title, description, price, location) VALUES 
      ('Apartamento Moderno', 'Hermoso apto con vista a la ciudad', 2500000.00, 'Chapinero'),
      ('Casa Familiar', 'Amplia casa de 3 habitaciones', 4200000.00, 'Usaquén'),
      ('Apartaestudio Estudiantil', 'Ideal para estudiantes, cerca a universidades', 1500000.00, 'Teusaquillo');
    `);

        // 4. Insertar Reseñas
        await pool.query(`
      INSERT INTO reviews (rating, comment, user_id, property_id) VALUES 
      (5, 'Excelente iluminación y acabados', 1, 1),
      (4, 'Muy espaciosa pero falta transporte cerca', 2, 2);
    `);

        console.log('¡Datos cargados exitosamente! Ya puedes revisar DBeaver.');
        process.exit(0);
    } catch (error) {
        console.error('Error cargando los datos:', error);
        process.exit(1);
    }
};

seedDatabase();