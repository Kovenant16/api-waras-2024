/**
 * Elimina una imagen de Cloudinary dado su Public ID, usando una instancia configurada.
 * @param {object} configuredCloudinary - La instancia configurada de cloudinary (v2).
 * @param {string} publicId - El Public ID de la imagen a eliminar.
 * @returns {Promise<object>} - La respuesta de la API de Cloudinary.
 */
export const deleteImageByPublicId = async (configuredCloudinary, publicId) => {
    if (!publicId) {
        console.warn("CloudinaryService: No Public ID provided for deletion.");
        throw new Error("Public ID is required for deletion.");
    }
    // Asegúrate de que la instancia de cloudinary fue pasada
    if (!configuredCloudinary || typeof configuredCloudinary.uploader === 'undefined') {
        console.error("CloudinaryService: Instancia de Cloudinary no válida o no configurada.");
        throw new Error("Cloudinary service is not properly initialized.");
    }


    console.log(`CloudinaryService: Intentando eliminar Public ID: ${publicId}`);

    try {
        // Usa la instancia pasada como argumento
        const result = await configuredCloudinary.uploader.destroy(publicId, {
            resource_type: 'image',
            type: 'upload'
        });

        console.log('CloudinaryService: Resultado de la eliminación:', result);

        return result;

    } catch (error) {
        console.error('CloudinaryService: Error al eliminar imagen:', error);
        throw error;
    }
};