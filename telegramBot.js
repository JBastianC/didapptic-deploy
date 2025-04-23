const TelegramBot = require('node-telegram-bot-api');
const jwt = require('jsonwebtoken');
const token = process.env.TELEGRAM_BOT_TOKEN || '7934211551:AAERE5uK5OwXTW7rSzv1g8-1WfHEWqZpiY8';
const bot = new TelegramBot(token, { polling: true });

// Almacén temporal para códigos de verificación
const pendingVerifications = new Map();

// Manejar comando /start - Versión modificada
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    const user = msg.from;
    
    const welcomeMessage = `👋 ¡Hola *${user.first_name || 'Usuario'}*! \n\n` +
                         `🔹 *Tu ID de chat de Telegram es:* \n` +
                         `\`${chatId}\` \n\n` +
                         `📌 *Cópialo y pégalo en el formulario de registro* de DidAppTic.\n\n` +
                         `🚀 *Bienvenido/a a DidAppTic*, tu asistente educativo.`;

    const keyboardOptions = {
        parse_mode: 'Markdown',
        reply_markup: {
            inline_keyboard: [
                [{ 
                    text: "📋 Copiar ID de chat", 
                    callback_data: "copy_chat_id" 
                }]
            ]
        }
    };

    bot.sendMessage(chatId, welcomeMessage, keyboardOptions);
});

// Manejar el botón "Copiar ID de chat"
bot.on('callback_query', (callbackQuery) => {
    const msg = callbackQuery.message;
    
    if (callbackQuery.data === 'copy_chat_id') {
        const chatId = msg.chat.id;
        
        bot.answerCallbackQuery(callbackQuery.id, {
            text: `ID copiado: ${chatId}`,
            show_alert: false
        });
        
        // Enviar mensaje con el ID para copiar
        bot.sendMessage(chatId, chatId.toString(), {
            reply_to_message_id: msg.message_id
        });
    }
});

// Manejar códigos de verificación
bot.on('message', (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;
    const userId = msg.from.id; // Usamos el ID de usuario, no el chat

    // Ignorar comandos
    if (text.startsWith('/')) return;

    // Verificar si es un código de 6 dígitos
    if (/^\d{6}$/.test(text)) {
        const verificationData = pendingVerifications.get(chatId.toString());
        
        if (!verificationData) {
            return bot.sendMessage(chatId, '❌ No hay una verificación pendiente para este código.');
        }

        if (verificationData.code === text) {
            // Notificar al servidor
            fetch(verificationData.verificationUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${verificationData.token}`
                },
                body: JSON.stringify({ verified: true, chatId })
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    pendingVerifications.delete(chatId.toString());
                    const successMsg = data.requiresPayment 
                        ? '✅ ¡Verificación exitosa! Completa tu registro y pago en nuestra página.'
                        : '✅ ¡Verificación exitosa! Ahora puedes iniciar sesión.';
                    bot.sendMessage(chatId, successMsg);
                } else {
                    bot.sendMessage(chatId, '❌ Error al verificar: ' + (data.message || 'Intenta nuevamente'));
                }
            })
            .catch(error => {
                console.error('Error al verificar:', error);
                bot.sendMessage(chatId, '⚠️ Error del servidor. Por favor intenta más tarde.');
            });
        } else {
            bot.sendMessage(chatId, '❌ Código incorrecto. Por favor verifica el número.');
        }
    } else if (pendingVerifications.has(chatId.toString())) {
        bot.sendMessage(chatId, '⌛ Por favor ingresa el código de 6 dígitos que recibiste durante el registro.');
    }
});

// Manejador para recuperación de contraseña
bot.onText(/\/reset_(.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const resetToken = match[1];

    try {
        const response = await fetch(`${process.env.API_URL}/api/auth/verify-reset-token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: resetToken })
        });

        const data = await response.json();

        if (data.success) {
            const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
            bot.sendMessage(chatId,
                `🔐 *Restablecer contraseña* \n\n` +
                `Haz clic en este enlace para crear una nueva contraseña:\n\n` +
                `[Restablecer ahora](${resetLink})\n\n` +
                `⚠️ El enlace expira en 1 hora.`,
                { parse_mode: 'Markdown' }
            );
        } else {
            bot.sendMessage(chatId,
                `❌ *Enlace inválido* \n\n` +
                `Este enlace ha expirado o ya fue usado.\n` +
                `Solicita uno nuevo desde la página de DidAppTic.`,
                { parse_mode: 'Markdown' }
            );
        }
    } catch (error) {
        console.error('Error al verificar token:', error);
        bot.sendMessage(chatId, '⚠️ Error del servidor. Intenta más tarde.');
    }
});

// Limpiar verificaciones expiradas
setInterval(() => {
    const now = Date.now();
    pendingVerifications.forEach((data, chatId) => {
        if (data.expiresAt < now) {
            pendingVerifications.delete(chatId);
            bot.sendMessage(chatId, '⌛ Tu código de verificación ha expirado. Solicita uno nuevo.').catch(console.error);
        }
    });
}, 3600000); // Cada hora

console.log('Bot de Telegram iniciado y listo');
module.exports = { bot, pendingVerifications };