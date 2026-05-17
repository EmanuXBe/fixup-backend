import { db } from './config/firebase.js';

/**
 * Siembra la colección Firestore `/fixers/` con 16 perfiles de demo cubriendo
 * todas las combinaciones categoría × urgencia que usa el modo Asistente.
 *
 * Es idempotente: usa IDs deterministas con `set()`, así que llamar la función
 * múltiples veces no genera duplicados — solo refresca los documentos.
 *
 * Se ejecuta automáticamente al arrancar el servidor SOLO si la colección está
 * vacía. Esto evita re-sembrar en cada reinicio de Render.
 *
 * Las reglas Firestore permiten escritura desde el cliente Android, pero las
 * apps móviles a veces fallan silenciosamente (auth no completa, networking,
 * etc.). Mantener el seed también en el backend garantiza que la colección
 * exista tras el primer despliegue, sin depender de que ningún cliente abra
 * la pantalla del Asistente primero.
 */

const CATEGORIES = [
    { name: 'Plomería',     slug: 'plomeria' },
    { name: 'Electricidad', slug: 'electricidad' },
    { name: 'Aseo',         slug: 'aseo' },
    { name: 'Remodelación', slug: 'remodelacion' },
];

const URGENCIES = [
    { value: 'Inmediato',  slug: 'inmediato' },
    { value: 'Programado', slug: 'programado' },
];

const SAMPLE_NAMES = [
    'Andrés Cárdenas', 'Camila Rojas', 'David Ríos', 'Elena Mejía',
    'Felipe Soto', 'Gabriela Bravo', 'Hernán Quintero', 'Isabel Vega',
    'Javier Niño', 'Karen Mosquera', 'Luis Pardo', 'Mariana Acosta',
    'Nicolás Pinto', 'Olga Restrepo', 'Pablo Cárdenas', 'Quinto Salas',
];

const STREETS = [
    'Calle 72 #10-15', 'Carrera 7 #45-20', 'Avenida Boyacá #80-30',
    'Calle 134 #19-40', 'Diagonal 45 #21-77', 'Carrera 50 #100-12',
];

const pick = (arr, i) => arr[i % arr.length];

export const seedFixersIfEmpty = async () => {
    try {
        const snap = await db.collection('fixers').limit(1).get();
        if (!snap.empty) {
            console.log('ℹ️  /fixers ya contiene datos — no se vuelve a sembrar.');
            return;
        }

        console.log('🌱 Sembrando /fixers (16 perfiles)…');
        const batch = db.batch();
        let index = 0;
        for (const cat of CATEGORIES) {
            for (const urg of URGENCIES) {
                for (let i = 1; i <= 2; i++) {
                    const docId = `assistant_fixer_${cat.slug}_${urg.slug}_${i}`;
                    const docRef = db.collection('fixers').doc(docId);
                    batch.set(docRef, {
                        name:            pick(SAMPLE_NAMES, index),
                        email:           `fixer.${cat.slug}.${urg.slug}.${i}@fixup.demo`,
                        phone:           `+57 30${(index % 10)} ${100 + index} ${1000 + index}`,
                        address:         `${pick(STREETS, index)}, Bogotá`,
                        role:            'Fixer',
                        category:        cat.name,
                        availability:    urg.value,
                        profileImageUrl: `https://i.pravatar.cc/200?u=${docId}`,
                    });
                    index++;
                }
            }
        }
        await batch.commit();
        console.log('✅ /fixers sembrado correctamente (16 documentos).');
    } catch (error) {
        console.error('❌ Error sembrando /fixers:', error.message);
    }
};
