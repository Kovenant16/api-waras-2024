// routes/cloudinaryRoutes.js

import express from 'express';
// Importa la función de servicio que creaste para eliminar la imagen
import { deleteImageByPublicId } from '../services/cloudinaryService.js'; // Ajusta la ruta si es diferente

const router = express.Router(); // Crea una instancia del router de Express

// Define el endpoint para eliminar una imagen
// La ruta aquí es solo '/delete-image' porque montaremos este router
// bajo un prefijo en index.js (ej. '/api/cloudinary').
router.post('/delete-image', async (req, res) => {
    // Extrae el publicId del cuerpo de la petición
    const { publicId } = req.body;

    // ** ¡AQUÍ DEBE IR TU LÓGICA DE AUTENTICACIÓN Y AUTORIZACIÓN! **
    // Esto es crucial por seguridad. Verifica que el usuario logueado
    // tiene permiso para eliminar esta imagen específica (ej. es dueño del local/producto).
    // Ejemplo (esto dependerá de cómo implementes la auth):
    // if (!req.user || !checkUserPermission(req.user, publicId)) {
    //     return res.status(403).json({ message: 'Forbidden: You do not have permission to delete this image.' });
    // }


    // Valida que el publicId fue recibido
    if (!publicId) {
        console.warn('CloudinaryRoutes: Public ID is required for deletion.');
        return res.status(400).json({ message: 'Public ID is required' });
    }

    console.log(`CloudinaryRoutes: Recibida solicitud para eliminar Public ID: ${publicId}`);

    try {
        // Llama a la función de servicio para eliminar la imagen
        // Esta función ya maneja la llamada al SDK de Cloudinary
        const result = await deleteImageByPublicId(publicId);

        // Maneja la respuesta basada en el resultado de la eliminación
        if (result && (result.result === 'ok' || result.result === 'not found')) {
            // Consideramos 'not found' también un éxito en este contexto
            res.status(200).json({ message: 'Image deletion requested', result: result.result });
        } else {
             // Si Cloudinary no devolvió 'ok' o 'not found'
             console.error('CloudinaryRoutes: Cloudinary did not return "ok" or "not found" for deletion.');
             res.status(500).json({ message: result?.result || 'Cloudinary deletion failed' });
        }

    } catch (error) {
        // Captura errores de validación (publicId faltante) o errores del servicio Cloudinary
        console.error('CloudinaryRoutes: Error handling image deletion request:', error);
        // Envía una respuesta de error al frontend
        res.status(500).json({ message: error.message || 'Server error during image deletion' });
    }
});

// Exporta el router para usarlo en index.js
export default router;