// bot.js
import { Telegraf } from "telegraf";
import Pedido from "../models/Pedido.js";
import { obtenerMotorizadosActivosYEnviarMensaje } from "../controllers/usuarioController.js";

const bot = new Telegraf('7417968430:AAFcvygubDqlXH7FXoXg8R-9NdR0oS18KGo')

bot.start((ctx) => {
  const userId = ctx.chat.id;
  ctx.reply(`Hola ${ctx.chat.first_name}, para comenzar te proporcionaré tu ID de Telegram, el cual debes enviar a central para poder agendarlo.`);
  setTimeout(() => {
    ctx.reply(`Tu ID de Telegram es: \`${userId}\``, { parse_mode: 'Markdown' });
  }, 2000);
  console.log(ctx.chat);
});


bot.command('app', (ctx) => {
  ctx.reply('Haz clic en el botón de abajo para ver la app:', {
    reply_markup: {
      inline_keyboard: [
        [{ text: 'Ver app', url: 'https://app.warasdelivery.com' }]
      ]
    }
  });
});

bot.command('moto', (ctx) => {
  ctx.reply('Plataforma motorizados: ', {
    reply_markup: {
      inline_keyboard: [
        [{ text: 'Ver app moto', url: 'https://moto.warasdelivery.com/pedidos' }]
      ]
    }
  });
});

bot.command('admin', (ctx) => {
  ctx.reply('Plataforma admin:', {
    reply_markup: {
      inline_keyboard: [
        [{ text: 'Ver app admin', url: 'https://admin.warasdelivery.com/pedidos' }]
      ]
    }
  });
});

bot.command('activ', async (ctx) => {
  // Enviar el mensaje inicial
  

  // Obtener y enviar la lista de motorizados activos
  await obtenerMotorizadosActivosYEnviarMensaje();
});

bot.command('h', (ctx) => {
  const comandos = `
 📜 *Lista de Comandos* 📜
 
 /activ - Obtiene los motorizados activos.
 /admin - Muestra enlace al app admin
 /moto - Muestra enlace al app moto
 /app - Muestra enlace al app de pedidos

  `;
 
  ctx.reply(comandos, { parse_mode: 'Markdown' });
 });

bot.launch()
  .then(() => {
    console.log('Bot launched successfully');
  })
  .catch((err) => {
    console.error('Error launching bot:', err);
  });

// Función para enviar mensajes
export const sendMessageToTelegram = (message) => {
  bot.telegram.sendMessage('-4112441362', message);
};



bot.on('callback_query', async (ctx) => {
  const callbackData = ctx.callbackQuery.data;

  try {
    // Busca el pedido usando el callbackData como el ID
    const pedido = await Pedido.findById(callbackData).populate('local');

    if (!pedido) {
      await ctx.reply('Pedido no encontrado');
      return;
    }

    // Obtén los detalles del local
    const local = pedido.local;

    // Responder con la confirmación del pedido
    await ctx.reply(`Pedido confirmado:\n- Local: ${local.nombre}\n- Dirección: ${pedido.direccion}`);

    // Borrar el mensaje original
    await ctx.deleteMessage(ctx.callbackQuery.message.message_id);

    // Aquí puedes añadir lógica adicional para marcar el pedido como confirmado en la base de datos
  } catch (error) {
    console.error('Error al confirmar el pedido:', error);
    await ctx.reply('Error al confirmar el pedido');
  }
});



export const sendMessageWithConfirmButton = (message, orderId) => {
  const chatId = '-4112441362';
  bot.telegram.sendMessage(chatId, message, {
    reply_markup: {
      inline_keyboard: [
        [{ text: 'Confirmar', callback_data: orderId }]
      ]
    }
  })
    .then(() => {
      console.log('Message with confirm button sent successfully');
    })
    .catch((err) => {
      console.error('Error sending message with confirm button:', err);
    });
};

export const sendMessage = (message, chatId) => {
  //const chatId = '-4112441362';
  bot.telegram.sendMessage(chatId, message)
    .then(() => {
      console.log('Message sent successfully');
    })
    .catch((err) => {
      console.error('Error sending message:', err);
    });
};

export const sendMessageWithId = async (chatId, message) => {
  try {
    const response = await bot.telegram.sendMessage(chatId, message);
    console.log('Message sent successfully');
    return response; // Devuelve la respuesta que contiene el ID del mensaje
  } catch (err) {
    console.error('Error sending message:', err);
    throw err; // Lanza el error para manejarlo fuera de esta función
  }
};

// Función para editar el mensaje existente
export const editMessageText = async (chatId, messageId, text) => {
  await bot.telegram.editMessageText(chatId, messageId, null, text);
};

export const deleteMessageWithId = async (chatId, messageId) => {
  try {
    if (!chatId || !messageId) {
      throw new Error('chatId or messageId is missing');
    }
    await bot.telegram.deleteMessage(chatId, messageId);
    console.log('Message deleted successfully');
  } catch (err) {
    console.error('Error deleting message:', err);
    throw err; // Lanza el error para manejarlo fuera de esta función
  }
};



export default bot;