import express from 'express';
import { getServicios, getServicioById } from '../controllers/servicioController.js';

const router = express.Router();

router.get('/', getServicios);
router.get('/:id', getServicioById);

export default router;
