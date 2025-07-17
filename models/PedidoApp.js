// models/PedidoApp.js (o el nombre de tu archivo de modelo de pedido)

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



// Sub-esquema para los ítems del pedido (MODIFICADO)
const AppOrderItemSchema = mongoose.Schema({
    productId: {
        type: mongoose.Schema.Types.ObjectId, // CAMBIO: Ahora es ObjectId
        ref: "Producto", // CAMBIO: Referencia al modelo "Producto"
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
    },
    change: {
        type: Number,
    },
}, { _id: false });

// Sub-esquema para la dirección de entrega (MODIFICADO)
const AppDeliveryAddressSchema = mongoose.Schema({
    name: {
        type: String,
        trim: true,
        default: "Ubicación no seleccionada",
    },
    fullAddress: { // CAMBIO: NUEVO CAMPO para la dirección completa
        type: String,
        trim: true,
        required: true, // Asumiendo que siempre se enviará
    },
    gps: {
        type: String, // "latitud,longitud"
        trim: true,
        required: true,
    },
    reference:{
        type: String,
        trim: true,
        default: "",
    }
}, { _id: false });

// Sub-esquema para los detalles de la tienda (MODIFICADO)
const AppStoreDetailsSchema = mongoose.Schema({
    storeId: { // CAMBIO: Ahora solo se envía el ID de la tienda
        type: mongoose.Schema.Types.ObjectId,
        ref: "Local", // CAMBIO: Referencia al modelo "Local"
        required: true,
    },    
}, { _id: false });

// Esquema principal para pedidos generados desde la aplicación
const pedidoAppSchema = mongoose.Schema(
    {
        // Campos que vienen directamente del JSON de Flutter
        userId: { // ID del usuario que realiza el pedido (debería venir del token de autenticación)
            type: mongoose.Schema.Types.ObjectId, // Asumiendo que tu ID de usuario es un ObjectId
            ref: "Cliente", // O el nombre de tu modelo de usuario (Cliente, User, etc.)
            required: true,
        },
        deliveryAddress: { // Usamos el sub-esquema para la dirección (MODIFICADO)
            type: AppDeliveryAddressSchema,
            required: true,
        },
         // Nuevo campo para el número de pedido secuencial
        numeroPedido: {
            type: String,
            unique: true, // Asegura que no haya dos pedidos con el mismo número
            sparse: true // Permite que algunos documentos no tengan este campo (si es que había pedidos antes)
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
        orderItems: { // Array de ítems del pedido (MODIFICADO)
            type: [AppOrderItemSchema],
            required: true,
        },
        orderDate: { // Fecha y hora de creación del pedido desde el cliente
            type: Date, // Almacena la fecha y hora completas
            required: true,
        },
        storeDetails: { // Detalles de la tienda de donde se realiza el pedido (MODIFICADO)
            type: AppStoreDetailsSchema,
            required: true,
        },
        estadoTienda: {
            type: String,
            enum: ['pendiente', 'en_preparacion', 'listo_para_recojo', 'tienda_cancelado'],
            default: 'pendiente',
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
                'nuevo',               // Pedido recién creado (estadoTienda: 'creado', driver: null)
                'preparando',          // Tienda preparando (estadoTienda: 'en_preparacion', driver: null)
                'pendiente',     // Un driver aceptó el pedido
                'driver_asignado',  // Driver se dirige a la tienda
                'en_tienda',           // Driver llegó a la tienda
                'recogido',            // Driver recogió el pedido
                'en_destino',          // Driver llegó al cliente
                'entregado',           // Pedido entregado
                'cancelado',           // Pedido cancelado (por tienda o driver)
            ],
            default: 'nuevo',
            required: true
        },
        driver: { // Quién es el driver asignado
            type: mongoose.Schema.Types.ObjectId,
            ref: "Usuario", // Asumiendo que "Usuario" es el modelo para drivers
            default: null,
        },
        
        // --- NUEVOS CAMPOS PARA REGISTRAR TIMESTAMPS DE ESTADOS ---
        horaLlegadaRecojo: { // Hora en que el driver llegó a la tienda
            type: Date,
            default: null,
        },
        horaRecojo: { // Hora en que el driver recogió el pedido de la tienda
            type: Date,
            default: null,
        },
        horaLlegadaDestino: { // Hora en que el driver llegó al destino del cliente
            type: Date,
            default: null,
        },
        horaEntrega: { // Hora en que el pedido fue entregado al cliente
            type: Date,
            default: null,
        },
        // --- FIN NUEVOS CAMPOS ---

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

pedidoAppSchema.index({ driver: 1, estadoPedido: 1 });

const PedidoApp = mongoose.model("PedidoApp", pedidoAppSchema);
export default PedidoApp;