import admin, { db } from './config/firebase.js';

/**
 * Script para empujar datos de prueba a Firestore con la estructura exacta
 * esperada por la aplicación Android (FixUp).
 * 
 * ESTRUCTURA:
 * - authorId: ID del usuario que publica (Firebase UID)
 * - category: Categoría del servicio (Ej: "Baños")
 * - description: Descripción detallada
 * - imageUrl: URL de la imagen principal
 * - price: Precio numérico
 * - title: Título del servicio
 * 
 * NOTA: Se asume la colección 'services' en Firestore.
 */

const testServices = [
    {
        authorId: "N8wjRtUUd5hvPJpBESgRa5ZZ1843",
        category: "Baños",
        description: "Servicio completo de reparación de llaves y tuberías. Incluye cambio de empaques y sellado de fugas.",
        imageUrl: "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=800",
        price: 150000,
        title: "Reparación de grifería"
    },
    {
        authorId: "N8wjRtUUd5hvPJpBESgRa5ZZ1843",
        category: "Cocina",
        description: "Instalación de mesones de granito y mármol con acabados de lujo.",
        imageUrl: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800",
        price: 850000,
        title: "Instalación de Mesones"
    },
    {
        authorId: "N8wjRtUUd5hvPJpBESgRa5ZZ1843",
        category: "Electricidad",
        description: "Revisión técnica de tableros eléctricos y cambio de breakers para mayor seguridad.",
        imageUrl: "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=800",
        price: 120000,
        title: "Revisión Eléctrica"
    }
];

const pushTestData = async () => {
    try {
        console.log('🚀 Iniciando carga de datos de prueba a Firestore...');

        const batch = db.batch();
        const collectionRef = db.collection('articles');

        testServices.forEach((service) => {
            const docRef = collectionRef.doc(); // Generar ID automático
            batch.set(docRef, {
                ...service,
                createdAt: admin.firestore.FieldValue.serverTimestamp() // Opcional: timestamp de creación
            });
            console.log(`   - Preparando: ${service.title}`);
        });

        await batch.commit();

        console.log('✅ ¡Éxito! Los datos han sido empujados a la colección "services" de Firestore.');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error al empujar datos:', error.message);
        process.exit(1);
    }
};

pushTestData();
