import express from 'express';
import { getServicios, getServicioById, createServicio } from '../controllers/servicioController.js';

const router = express.Router();

router.get('/', getServicios);
router.get('/:id', getServicioById);
router.post('/', createServicio);

export default router;

