import mongoose from "mongoose";

// Sub-esquema para las opciones seleccionadas de un producto
const AppSelectedOptionDetailSchema = mongoose.Schema({
    optionGroupId: {
        type: String,
        required: true,
        trim: true,
    },
    optionGroupName: {
        type: String,
        required: true,
        trim: true,
    },
    detailId: {
        type: String,
        required: true,
        trim: true,
    },
    detailName: {
        type: String,
        required: true,
        trim: true,
    },
    price: {
        type: Number,
        required: true,
        default: 0,
    },
}, { _id: false }); // _id: false para que Mongoose no cree un _id para cada subdocumento de opción

// Sub-esquema para los ítems del pedido
const AppOrderItemSchema = mongoose.Schema({
    productId: {
        type: String, // Usamos String porque el ID viene como String de Flutter
        required: true,
        trim: true,
    },
    productName: {
        type: String,
        required: true,
        trim: true,
    },
    quantity: {
        type: Number,
        required: true,
        min: 1, // La cantidad mínima debe ser 1
    },
    unitPrice: { // Precio del producto base + opciones fijas (taper, comisión)
        type: Number,
        required: true,
    },
    totalItemPrice: { // unitPrice * quantity
        type: Number,
        required: true,
    },
    selectedOptions: [AppSelectedOptionDetailSchema], // Array de opciones seleccionadas
}, { _id: false }); // _id: false para que Mongoose no cree un _id para cada subdocumento de ítem

// Sub-esquema para los detalles de pago en efectivo
const AppCashPaymentDetailsSchema = mongoose.Schema({
    paidAmount: {
        type: Number,
        required: true,
    },
    change: {
        type: Number,
        required: true,
    },
}, { _id: false });

// Sub-esquema para la dirección de entrega
const AppDeliveryAddressSchema = mongoose.Schema({
    name: {
        type: String,
        trim: true,
        default: "Ubicación no seleccionada",
    },
    gps: {
        type: String, // "latitud,longitud"
        trim: true,
        required: true,
    },
}, { _id: false });

// Sub-esquema para los detalles de la tienda
const AppStoreDetailsSchema = mongoose.Schema({
    storeName: {
        type: String,
        trim: true,
        required: true,
    },
    storeLat: {
        type: Number,
        required: false,
    },
    storeLng: {
        type: Number,
        required: false,
    },
    // Si tu Producto tiene un ID de tienda, podrías añadir:
    // storeId: {
    //     type: mongoose.Schema.Types.ObjectId,
    //     ref: "Local", // Asumiendo que "Local" es tu modelo de tienda
    //     required: true,
    // }
}, { _id: false });

// Esquema principal para pedidos generados desde la aplicación
const pedidoAppSchema = mongoose.Schema(
    {
        // Campos que vienen directamente del JSON de Flutter
        userId: { // ID del usuario que realiza el pedido (debería venir del token de autenticación)
            type: mongoose.Schema.Types.ObjectId, // Asumiendo que tu ID de usuario es un ObjectId
            ref: "Usuario", // O el nombre de tu modelo de usuario (Cliente, User, etc.)
            required: true,
        },
        deliveryAddress: { // Usamos el sub-esquema para la dirección
            type: AppDeliveryAddressSchema,
            required: true,
        },
        subtotal: {
            type: Number,
            required: true,
        },
        deliveryCost: {
            type: Number,
            required: true,
        },
        totalAmount: {
            type: Number,
            required: true,
        },
        paymentMethod: { // Renombrado de 'medioDePago' para coincidir con Flutter
            type: String,
            required: true,
            enum: ["efectivo", "yape", "plin"],
            default: "efectivo",
        },
        cashPaymentDetails: { // Objeto anidado para detalles de pago en efectivo (si aplica)
            type: AppCashPaymentDetailsSchema,
            required: function() { return this.paymentMethod === 'efectivo'; }, // Solo requerido si el método es efectivo
        },
        notes: { // Notas o comentarios del usuario sobre el pedido
            type: String,
            trim: true,
            default: "",
        },
        orderItems: { // Array de ítems del pedido
            type: [AppOrderItemSchema],
            required: true,
        },
        orderDate: { // Fecha y hora de creación del pedido desde el cliente
            type: Date, // Almacena la fecha y hora completas
            required: true,
        },
        storeDetails: { // Detalles de la tienda de donde se realiza el pedido
            type: AppStoreDetailsSchema,
            required: true,
        },

        // Campos adicionales que puedes gestionar en el backend para este tipo de pedido
        tipoPedido: {
            type: String,
            enum: ["express", "compras", "paqueteria", "app"],
            default: "app", // Por defecto para este modelo, será "app"
            immutable: true, // Una vez establecido como "app", no debería cambiar
        },
        estadoPedido: {
            type: String,
            enum: [
                "sin asignar",
                "pendiente", // Estado inicial para pedidos de la app
                "aceptado",
                "en local",
                "recogido",
                "entregado",
                "rechazado",
                "cancelado" // Añadir un estado de 'cancelado' podría ser útil
            ],
            default: "pendiente",
            trim: true,
        },
        driver: { // Quién es el driver asignado
            type: mongoose.Schema.Types.ObjectId,
            ref: "Usuario", // Asumiendo que "Usuario" es el modelo para drivers
            default: null,
        },
        // Posibles campos de timestamps manuales si necesitas un formato específico
        // antes de guardar o para logs:
        // horaRecojo: { type: String },
        // horaLlegadaLocal: { type: String },
        // horaEntrega: { type: String },

        // Referencia a un posible mensaje de Telegram para notificaciones
        idMensajeTelegram: {
            type: Number,
            default: null,
        },
        idTelegram: {
            type: String,
            default: null,
        },
        // Si aplicas un porcentaje de pago al driver o alguna comisión
        porcentPago: {
            type: Number,
            default: 0.8, // Por ejemplo, 80% para el driver
        },
    },
    {
        timestamps: true, // Mongoose automáticamente añade 'createdAt' y 'updatedAt'
    }
);

// Puedes añadir un middleware pre-save si necesitas transformar o calcular algo
// antes de guardar, por ejemplo, si quieres guardar la fecha y hora por separado
// como strings, o si necesitas un campo 'pagaCon' (paidAmount) en la raíz
/*
pedidoAppSchema.pre('save', function(next) {
    if (this.paymentMethod === 'efectivo' && this.cashPaymentDetails) {
        // Ejemplo de cómo podrías sacar 'paidAmount' al campo 'pagaCon' si existiera en la raíz
        // this.pagaCon = this.cashPaymentDetails.paidAmount;
        // Si necesitas ajustar el estado inicial basado en otras condiciones
    }
    next();
});
*/

const PedidoApp = mongoose.model("PedidoApp", pedidoAppSchema);
export default PedidoApp;