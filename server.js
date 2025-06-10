require('dotenv').config();
const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const https = require('https');
const multer = require('multer');
const nodemailer = require('nodemailer');
const { bot, pendingVerifications } = require('./telegramBot');

const app = express();
const PORT = process.env.PORT || 3000;
const SESSION_TIMEOUT = 15 * 60 * 1000; // 15 minutos de inactividad

// Configuración básica
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Directorios adicionales
const DB_DIR = path.join(__dirname, 'public', 'baseDatos');
const PLANS_DIR = path.join(__dirname, 'plans');
if (!fs.existsSync(PLANS_DIR)) fs.mkdirSync(PLANS_DIR);

// Configuración de IA
const IA_BASE_URL = 'https://fcvl4puzeomz4jzdfussnmqa.agents.do-ai.run/';
const IA_ACCESS_KEY = process.env.IA_ACCESS_KEY || 'Zg4xH8tUp0NMBnjzxcWjxR3LfXY7uvY3'; // Usa variable de entorno o reemplaza por tu key

const iaClient = axios.create({
  baseURL: IA_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${IA_ACCESS_KEY}`
  },
  timeout: 60000
});

// Modificado para el nuevo endpoint y modelo Llama 3.3 Instruct (70B)
function callIA(prompt) {
  // prompt es un string
  return new Promise((resolve, reject) => {
    iaClient.post('/api/v1/chat/completions', {
      model: 'llama-3-70b-instruct',
      messages: [
        { role: 'user', content: prompt }
      ]
    })
    .then(resp => {
      // El resultado esperado está en resp.data.choices[0].message.content
      if (resp.data && Array.isArray(resp.data.choices) && resp.data.choices[0]?.message?.content) {
        resolve(resp.data.choices[0].message.content);
      } else {
        resolve('❌ Sin respuesta válida.');
      }
    })
    .catch(err => {
      reject(err.response?.data || err.message || err);
    });
  });
}

// Archivos de persistencia
const USERS_FILE = 'users.json';
const PLANS_FILE = 'plans.json';
const SESSIONS_FILE = 'sessions.json';

// Cargar datos almacenados o inicializar
let users = loadData(USERS_FILE) || [];
let userPlans = loadData(PLANS_FILE) || {};
let sessions = loadData(SESSIONS_FILE) || {};

// Funciones de persistencia
function loadData(filename) {
  try {
    const data = fs.readFileSync(filename, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    if (err.code === 'ENOENT') return null;
    console.error(`Error al cargar ${filename}:`, err);
    return null;
  }
}

function saveData(filename, data) {
  try {
    fs.writeFileSync(filename, JSON.stringify(data, null, 2));
    return true;
  } catch (err) {
    console.error(`Error al guardar ${filename}:`, err);
    return false;
  }
}

// Middleware para guardar datos al cerrar
process.on('SIGINT', () => {
  saveData(USERS_FILE, users);
  saveData(PLANS_FILE, userPlans);
  saveData(SESSIONS_FILE, sessions);
  process.exit();
});

// Middleware de autenticación
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.sendStatus(401);

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET || 'your-secret-key', (err, user) => {
    if (err) return res.sendStatus(403);

    if (sessions[user.userId] && (Date.now() - sessions[user.userId].lastActivity) > SESSION_TIMEOUT) {
      delete sessions[user.userId];
      saveData(SESSIONS_FILE, sessions);
      return res.status(401).json({ message: 'Sesión expirada por inactividad' });
    }

    sessions[user.userId] = {
      lastActivity: Date.now(),
      token: token
    };
    saveData(SESSIONS_FILE, sessions);

    req.user = user;
    next();
  });
};

// Middleware de administrador
const authenticateAdmin = (req, res, next) => {
  const user = users.find(u => u.id === req.user.userId);
  if (!user || user.email !== 'admin@didapptic.com') {
    return res.status(403).json({ message: 'Acceso denegado. Se requieren privilegios de administrador' });
  }
  next();
};

// Verificar y actualizar membresías expiradas
function checkExpiredMemberships() {
  const now = new Date();
  users.forEach(user => {
    if (user.membership === 'premium' && user.subscriptionEnd) {
      const endDate = new Date(user.subscriptionEnd);
      if (endDate < now) {
        user.membership = 'basic';
        user.subscriptionEnd = null;
        console.log(`Membresía premium expirada para usuario ${user.email}`);
      }
    }
  });
}

// Ejecutar al inicio y luego cada 24 horas
checkExpiredMemberships();
setInterval(checkExpiredMemberships, 24 * 60 * 60 * 1000);

// Limpiar sesiones expiradas cada hora
setInterval(() => {
  const now = Date.now();
  Object.keys(sessions).forEach(userId => {
    if ((now - sessions[userId].lastActivity) > SESSION_TIMEOUT) {
      delete sessions[userId];
    }
  });
  saveData(SESSIONS_FILE, sessions);
}, 60 * 60 * 1000);

// =============================================
// RUTA ADMIN: Actualizar créditos de usuario premium
app.post('/api/admin/update-credits', authenticateToken, authenticateAdmin, (req, res) => {
  const { userId, credits } = req.body;
  if (!userId || typeof credits !== 'number' || credits < 0) {
    return res.status(400).json({ success: false, message: 'Datos inválidos' });
  }
  const user = users.find(u => u.id === userId);
  if (!user) {
    return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
  }
  if (user.membership !== 'premium') {
    return res.status(400).json({ success: false, message: 'Solo usuarios premium pueden tener créditos editados' });
  }
  user.creditos = credits;
  user.updatedAt = new Date().toISOString();
  saveData(USERS_FILE, users);
  res.json({ success: true, message: 'Créditos actualizados', userId, credits });
});

// =============================================
// RUTAS PARA INTEGRACIÓN CON TELEGRAM
// =============================================

// Ruta para verificar ID de chat de Telegram
app.post('/api/auth/check-telegram-chat', (req, res) => {
  const { chatId } = req.body;
  
  // Verificar si el chatId ya está en uso
  const chatExists = users.some(user => user.telegramChatId === chatId);
  
  res.json({
    available: !chatExists,
    message: chatExists ? 'Este ID de chat ya está registrado' : 'ID de chat disponible'
  });
});

// Ruta de registro mejorada con verificación por Telegram
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, lastname, email, password, membership, chatId } = req.body;

    // Validaciones básicas
    if (!name || !lastname || !email || !password || !membership || !chatId) {
      return res.status(400).json({ 
        success: false,
        message: 'Todos los campos son requeridos' 
      });
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@(gmail\.com|hotmail\.com|outlook\.com|yahoo\.com|icloud\.com)$/i;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Solo aceptamos correos de Gmail, Hotmail, Outlook, Yahoo o iCloud'
      });
    }

    // Verificar si el email ya existe
    if (users.some(user => user.email === email)) {
      return res.status(400).json({
        success: false,
        message: 'Este correo electrónico ya está registrado'
      });
    }

    // Verificar si el chatId ya está registrado
    if (users.some(user => user.telegramChatId === chatId)) {
      return res.status(400).json({
        success: false,
        message: 'Este ID de chat de Telegram ya está asociado a otra cuenta'
      });
    }

    // Generar código de verificación
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const tempToken = jwt.sign(
      { 
        name, lastname, email, 
        password: await bcrypt.hash(password, 10), 
        membership, 
        chatId 
      },
      process.env.ACCESS_TOKEN_SECRET,
      { expiresIn: '5m' } // 5 minutos de expiración
    );

    // Guardar en memoria (no en DB aún)
    pendingVerifications.set(chatId, {
      code: verificationCode,
      token: tempToken,
      verificationUrl: `${process.env.API_URL || 'http://localhost:'+PORT}/api/auth/complete-registration`,
      expiresAt: Date.now() + 300000 // 5 minutos
    });

    // Enviar código a Telegram
    try {
      await bot.sendMessage(
        chatId,
        `🔐 *Código de Verificación DidAppTic*\n\n` +
        `Tu código para completar el registro es:\n\n` +
        `*${verificationCode}*\n\n` +
        `Este código expira en 5 minutos.`,
        { parse_mode: 'Markdown' }
      );

      res.json({
        success: true,
        message: 'Código de verificación enviado a Telegram',
        token: tempToken
      });
    } catch (error) {
      console.error('Error al enviar a Telegram:', error);
      pendingVerifications.delete(chatId);
      res.status(500).json({
        success: false,
        message: 'Error al enviar código. Verifica tu ID de chat de Telegram.'
      });
    }
  } catch (error) {
    console.error('Error en registro:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error en el servidor durante el registro' 
    });
  }
});

// Ruta para completar registro después de verificación
app.post('/api/auth/complete-registration', async (req, res) => {
  const { token, verified, chatId } = req.body;
  
  try {
    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    
    if (!verified) {
      return res.status(400).json({ 
        success: false, 
        message: 'Verificación requerida' 
      });
    }

    // Verificar que el código coincida
    const verificationData = pendingVerifications.get(chatId);
    if (!verificationData || verificationData.token !== token) {
      return res.status(400).json({ 
        success: false, 
        message: 'Código de verificación inválido o expirado' 
      });
    }

    // Crear usuario en DB
    const newUser = {
      id: Date.now().toString(),
      name: decoded.name,
      lastname: decoded.lastname,
      email: decoded.email,
      password: decoded.password,
      membership: decoded.membership === 'premium' ? 'basic' : decoded.membership, // Todos inician como basic
      originalMembership: decoded.membership, // Guardamos la selección original
      telegramChatId: decoded.chatId,
      telegramVerified: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      subscriptionEnd: null
    };

    users.push(newUser);
    
    // Inicializar almacenamiento de planes
    if (!userPlans[newUser.id]) {
      userPlans[newUser.id] = { plans: [], context: [], didacticCards: [] };
    }

    saveData(USERS_FILE, users);
    saveData(PLANS_FILE, userPlans);
    pendingVerifications.delete(chatId);

    // Crear token de sesión
    const authToken = jwt.sign(
      { 
        userId: newUser.id, 
        email: newUser.email,
        membership: newUser.membership 
      },
      process.env.ACCESS_TOKEN_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      message: '¡Registro completado exitosamente!',
      token: authToken,
      requiresPayment: newUser.originalMembership === 'premium',
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        membership: newUser.membership
      }
    });
  } catch (error) {
    console.error('Error al completar registro:', error);
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        success: false,
        message: 'El tiempo para verificar ha expirado. Por favor registra nuevamente.' 
      });
    }
    
    res.status(500).json({ 
      success: false,
      message: 'Error al completar el registro' 
    });
  }
});

// Ruta para reenviar código de verificación
app.post('/api/auth/resend-verification', async (req, res) => {
  const { token } = req.body;
  
  try {
    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    const chatId = decoded.chatId;

    // Generar nuevo código
    const newCode = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Actualizar en memoria
    pendingVerifications.set(chatId, {
      code: newCode,
      token: token,
      verificationUrl: `${process.env.API_URL || 'http://localhost:'+PORT}/api/auth/complete-registration`,
      expiresAt: Date.now() + 300000 // 5 minutos
    });

    // Enviar nuevo código a Telegram
    await bot.sendMessage(
      chatId,
      `🔐 *Nuevo Código de Verificación*\n\n` +
      `Tu nuevo código es:\n\n` +
      `*${newCode}*\n\n` +
      `Expira en 5 minutos.`,
      { parse_mode: 'Markdown' }
    );

    res.json({ 
      success: true, 
      message: 'Nuevo código de verificación enviado a Telegram' 
    });
  } catch (error) {
    console.error('Error al reenviar código:', error);
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        success: false,
        message: 'La sesión de registro ha expirado. Por favor comienza nuevamente.' 
      });
    }
    
    res.status(500).json({ 
      success: false,
      message: 'Error al reenviar el código de verificación' 
    });
  }
});

// Ruta para recuperación de contraseña
app.post('/api/auth/recover-password', async (req, res) => {
  const { email } = req.body;
  
  try {
    const user = users.find(u => u.email === email);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'No se encontró una cuenta con ese correo electrónico'
      });
    }
    
    if (!user.telegramChatId) {
      return res.status(400).json({
        success: false,
        message: 'No hay un chat de Telegram asociado a esta cuenta'
      });
    }
    
    // Crear token de reseteo (válido por 1 hora)
    const resetToken = jwt.sign(
      { 
        userId: user.id,
        purpose: 'password_reset'
      },
      process.env.RESET_TOKEN_SECRET || 'reset-secret-key',
      { expiresIn: '1h' }
    );
    
    // Crear enlace de reseteo
    const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;
    
    // Enviar mensaje a Telegram
    try {
      await bot.sendMessage(
        user.telegramChatId,
        `🔐 *Solicitud de recuperación de contraseña*\n\n` +
        `Hola ${user.name || ''},\n\n` +
        `Para restablecer tu contraseña en DidAppTic, haz clic en este enlace:\n\n` +
        `${resetLink}\n\n` +
        `⚠️ Este enlace expirará en 1 hora.\n\n` +
        `Si no solicitaste este cambio, por favor ignora este mensaje.`,
        { parse_mode: 'Markdown' }
      );
      
      res.json({
        success: true,
        message: 'Se ha enviado un enlace para restablecer tu contraseña a tu chat de Telegram'
      });
    } catch (telegramError) {
      console.error('Error al enviar mensaje a Telegram:', telegramError);
      res.status(500).json({
        success: false,
        message: 'Error al enviar el mensaje a Telegram. Por favor intenta más tarde.'
      });
    }
  } catch (error) {
    console.error('Error en recuperación de contraseña:', error);
    res.status(500).json({
      success: false,
      message: 'Ocurrió un error al procesar tu solicitud'
    });
  }
});

// Ruta para verificar token de reseteo
app.post('/api/auth/verify-reset-token', (req, res) => {
  const { token } = req.body;
  
  try {
    const decoded = jwt.verify(token, process.env.RESET_TOKEN_SECRET || 'reset-secret-key');
    const user = users.find(u => u.id === decoded.userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }
    
    res.json({
      success: true,
      userId: user.id
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      message: 'Token inválido o expirado'
    });
  }
});

// Ruta para actualizar contraseña después de reseteo
app.post('/api/auth/reset-password', async (req, res) => {
  const { token, newPassword } = req.body;
  
  try {
    const decoded = jwt.verify(token, process.env.RESET_TOKEN_SECRET || 'reset-secret-key');
    const user = users.find(u => u.id === decoded.userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }
    
    // Actualizar contraseña
    user.password = await bcrypt.hash(newPassword, 10);
    user.updatedAt = new Date().toISOString();
    saveData(USERS_FILE, users);
    
    // Invalidar todas las sesiones existentes
    delete sessions[user.id];
    saveData(SESSIONS_FILE, sessions);
    
    res.json({
      success: true,
      message: 'Contraseña actualizada exitosamente. Por favor inicia sesión con tu nueva contraseña.'
    });
  } catch (error) {
    console.error('Error al resetear contraseña:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar la contraseña'
    });
  }
});

// =============================================
// RUTAS DE SERVER1.JS
// =============================================

// LISTAR txt
app.get('/api/listFiles', (req, res) => {
  fs.readdir(DB_DIR, (e, files) => {
    if (e) return res.status(500).json({ error: e.message });
    res.json(files.filter(f => f.endsWith('.txt')));
  });
});

// META
app.get('/api/meta', (req, res) => {
  fs.readdir(DB_DIR, (e, files) => {
    if (e) return res.status(500).json({ error: e.message });
    const fases = new Set(), campos = [];
    files.filter(f => f.endsWith('.txt')).forEach(f => {
      const m = f.match(/^(.+)_F(\d)\.txt$/);
      if (m) {
        const label = m[1].replace(/_/g, ' ');
        const fase = `Fase ${m[2]}`;
        fases.add(fase);
        campos.push({ label, fase, file: f });
      }
    });
    res.json({ fases: Array.from(fases), campos });
  });
});

// CONTENIDO
app.get('/api/fileContent', (req, res) => {
  const p = path.join(DB_DIR, req.query.name);
  fs.readFile(p, 'utf8', (e, d) => {
    if (e) return res.status(404).json({ error: 'No encontrado.' });
    res.json({ content: d });
  });
});

// GENERAR PLAN LOCAL
app.post('/api/generatePlan', async (req, res) => {
  const payload = req.body;
  try {
    const llm = await axios.post('http://localhost:5000/generate', payload);
    const id = Date.now().toString();
    fs.writeFileSync(path.join(PLANS_DIR, id + '.html'), llm.data.html, 'utf8');
    res.json({ id, html: llm.data.html });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// DESCARGAR
app.get('/api/downloadPlan', (req, res) => {
  const f = path.join(PLANS_DIR, req.query.id + '.html');
  if (fs.existsSync(f)) res.download(f, `plan_${req.query.id}.html`);
  else res.status(404).send('No existe.');
});

// SUBIR
const upload = multer({ dest: PLANS_DIR });
app.post('/api/uploadPlan', upload.single('plan'), (req, res) => {
  res.json({ message: 'Recibido', filename: req.file.filename });
});

// IA GENERATE
app.post('/api/ia/generatePlan', authenticateToken, async (req, res) => {
  try {
    const user = users.find(u => u.id === req.user.userId);
    if (!user || user.membership !== 'premium') {
      return res.status(403).json({ message: 'Solo usuarios premium pueden usar la IA.' });
    }
    if (typeof user.creditos !== 'number') user.creditos = 100;
    if (user.creditos <= 0) {
      return res.status(403).json({ message: 'Sin créditos disponibles para usar la IA.', creditos: user.creditos });
    }
    user.creditos -= 1;
    saveData(USERS_FILE, users);
    const { prompt } = req.body;
    if (!prompt) return res.status(400).json({ error: 'Prompt obligatorio.' });
    let iaResp;
    try {
      iaResp = await callIA(prompt);
    } catch (err) {
      console.error('Error al consultar la IA:', err);
      return res.status(502).json({ error: 'Error al comunicarse con el servicio de IA', details: err, creditos: user.creditos });
    }
    if (!iaResp || typeof iaResp !== 'string') {
      console.error('Respuesta inesperada de la IA:', iaResp);
      return res.status(500).json({ error: 'Respuesta inesperada de la IA', details: iaResp, creditos: user.creditos });
    }
    res.json({ response: iaResp, creditos: user.creditos });
  } catch (e) {
    console.error('Error interno en /api/ia/generatePlan:', e);
    res.status(500).json({ error: e.message, details: e });
  }
});

// Descontar crédito explícitamente (para frontend)
app.post('/api/creditos/descontar', authenticateToken, (req, res) => {
  const user = users.find(u => u.id === req.user.userId);
  if (!user || user.membership !== 'premium') {
    return res.status(403).json({ message: 'Solo usuarios premium pueden descontar créditos.' });
  }
  if (typeof user.creditos !== 'number') user.creditos = 100;
  if (user.creditos <= 0) {
    return res.status(403).json({ message: 'Sin créditos disponibles.', creditos: user.creditos });
  }
  user.creditos -= 1;
  saveData(USERS_FILE, users);
  res.json({ creditos: user.creditos });
});

// =============================================
// RUTAS DE SERVER2.JS (AUTENTICACIÓN Y USUARIOS)
// =============================================

// Ruta de login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validaciones
    if (!email || !password) {
      return res.status(400).json({ message: 'Correo electrónico y contraseña son requeridos' });
    }

    // Buscar usuario
    const user = users.find(user => user.email === email);
    if (!user) {
      return res.status(401).json({ message: 'Credenciales inválidas' });
    }

    // Verificar contraseña
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.status(401).json({ message: 'Credenciales inválidas' });
    }

    // Verificar si la membresía está por expirar (menos de 3 días)
    let membershipMessage = '';
    if (user.membership === 'premium' && user.subscriptionEnd) {
      const endDate = new Date(user.subscriptionEnd);
      const now = new Date();
      const daysLeft = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24));

      if (daysLeft <= 3 && daysLeft > 0) {
        membershipMessage = `Tu membresía premium expira en ${daysLeft} día(s)`;
      } else if (daysLeft <= 0) {
        membershipMessage = 'Tu membresía premium ha expirado';
      }
    }

    // Crear token
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.ACCESS_TOKEN_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    // Registrar sesión
    sessions[user.id] = {
      lastActivity: Date.now(),
      token: token
    };
    saveData(SESSIONS_FILE, sessions);

    // No devolver la contraseña
    const userToReturn = { ...user };
    delete userToReturn.password;

    res.json({
      message: 'Inicio de sesión exitoso' + (membershipMessage ? `. ${membershipMessage}` : ''),
      token,
      user: userToReturn,
      membershipWarning: membershipMessage || null
    });
  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ message: 'Error en el servidor' });
  }
});

// Ruta para guardar planes de realidad
app.post('/api/plans/save', authenticateToken, (req, res) => {
  try {
    const { planData } = req.body;
    const userId = req.user.userId;

    if (!userPlans[userId]) {
      userPlans[userId] = { plans: [], context: [], didacticCards: [] };
    }

    // Buscar si ya existe un plan con este ID
    const existingIndex = userPlans[userId].plans.findIndex(p => p.id === planData.id);

    if (existingIndex >= 0) {
      // Actualizar plan existente
      userPlans[userId].plans[existingIndex] = planData;
    } else {
      // Agregar nuevo plan
      userPlans[userId].plans.push(planData);
    }

    // Guardar datos
    if (!saveData(PLANS_FILE, userPlans)) {
      throw new Error('Error al guardar los planes');
    }

    res.json({
      success: true,
      message: 'Plan guardado exitosamente',
      plan: planData
    });
  } catch (error) {
    console.error('Error al guardar plan:', error);
    res.status(500).json({
      success: false,
      message: 'Error al guardar el plan: ' + error.message
    });
  }
});

// Ruta para obtener planes de realidad
app.get('/api/plans', authenticateToken, (req, res) => {
  try {
    const userId = req.user.userId;

    if (!userPlans[userId]) {
      userPlans[userId] = { plans: [], context: [], didacticCards: [] };
    }

    res.json({
      success: true,
      plans: userPlans[userId].plans
    });
  } catch (error) {
    console.error('Error al obtener planes:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener los planes'
    });
  }
});

// Ruta para eliminar un plan
app.delete('/api/plans/:id', authenticateToken, (req, res) => {
  try {
    const userId = req.user.userId;
    const planId = req.params.id;

    if (!userPlans[userId]) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    const initialLength = userPlans[userId].plans.length;
    userPlans[userId].plans = userPlans[userId].plans.filter(plan => plan.id !== planId);

    if (userPlans[userId].plans.length === initialLength) {
      return res.status(404).json({
        success: false,
        message: 'Plan no encontrado'
      });
    }

    // Guardar datos
    if (!saveData(PLANS_FILE, userPlans)) {
      throw new Error('Error al guardar los planes');
    }

    res.json({
      success: true,
      message: 'Plan eliminado exitosamente',
      deletedId: planId
    });
  } catch (error) {
    console.error('Error al eliminar plan:', error);
    res.status(500).json({
      success: false,
      message: 'Error al eliminar el plan: ' + error.message
    });
  }
});

// Ruta para guardar datos contextuales
app.post('/api/context/save', authenticateToken, (req, res) => {
  try {
    const { contextData } = req.body;
    const userId = req.user.userId;

    // Inicializar estructura si no existe
    if (!userPlans[userId]) {
      userPlans[userId] = { plans: [], context: [], didacticCards: [] };
    }
    if (!userPlans[userId].context) {
      userPlans[userId].context = [];
    }

    // Buscar si ya existe un registro con este rowId
    const existingIndex = userPlans[userId].context.findIndex(c => c.rowId === contextData.rowId);

    if (existingIndex >= 0) {
      // Actualizar existente
      userPlans[userId].context[existingIndex] = contextData;
    } else {
      // Agregar nuevo
      userPlans[userId].context.push(contextData);
    }

    if (!saveData(PLANS_FILE, userPlans)) {
      throw new Error('Error al guardar los datos contextuales');
    }

    res.json({
      success: true,
      message: 'Datos contextuales guardados exitosamente',
      contextData
    });
  } catch (error) {
    console.error('Error al guardar datos contextuales:', error);
    res.status(500).json({
      success: false,
      message: 'Error al guardar los datos contextuales: ' + error.message
    });
  }
});

// Ruta para obtener datos contextuales
app.get('/api/context', authenticateToken, (req, res) => {
  try {
    const userId = req.user.userId;

    // Asegurar que exista la estructura
    if (!userPlans[userId] || !userPlans[userId].context) {
      userPlans[userId] = { plans: [], context: [], didacticCards: [] };
      saveData(PLANS_FILE, userPlans);
    }

    res.json({
      success: true,
      contextData: userPlans[userId].context || []
    });
  } catch (error) {
    console.error('Error al obtener datos contextuales:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener los datos contextuales'
    });
  }
});

// Ruta para eliminar datos contextuales
app.delete('/api/context/delete/:rowId', authenticateToken, (req, res) => {
  try {
    const userId = req.user.userId;
    const rowId = req.params.rowId;

    if (!userPlans[userId] || !userPlans[userId].context) {
      return res.status(404).json({
        success: false,
        message: 'Datos no encontrados para este usuario'
      });
    }

    const initialLength = userPlans[userId].context.length;
    userPlans[userId].context = userPlans[userId].context.filter(row => row.rowId !== rowId);

    if (userPlans[userId].context.length === initialLength) {
      return res.status(404).json({
        success: false,
        message: 'Registro no encontrado'
      });
    }

    if (!saveData(PLANS_FILE, userPlans)) {
      throw new Error('Error al guardar los cambios');
    }

    res.json({
      success: true,
      message: 'Fila eliminada exitosamente',
      deletedRowId: rowId
    });
  } catch (error) {
    console.error('Error al eliminar fila contextual:', error);
    res.status(500).json({
      success: false,
      message: 'Error al eliminar fila contextual: ' + error.message
    });
  }
});

// Ruta para verificar estado premium
app.get('/api/users/check-premium', authenticateToken, (req, res) => {
  const user = users.find(u => u.id === req.user.userId);

  if (!user) {
    return res.status(404).json({ message: 'Usuario no encontrado' });
  }

  // Verificar si la membresía está por expirar
  let membershipWarning = null;
  if (user.membership === 'premium' && user.subscriptionEnd) {
    const endDate = new Date(user.subscriptionEnd);
    const now = new Date();
    const daysLeft = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24));

    if (daysLeft <= 3 && daysLeft > 0) {
      membershipWarning = `Tu membresía premium expira en ${daysLeft} día(s)`;
    } else if (daysLeft <= 0) {
      membershipWarning = 'Tu membresía premium ha expirado';
    }
  }

  res.json({
    isPremium: user.membership === 'premium',
    user: {
      id: user.id,
      name: user.name,
      lastname: user.lastname,
      email: user.email,
      membership: user.membership,
      subscriptionEnd: user.subscriptionEnd,
      createdAt: user.createdAt
    },
    membershipWarning
  });
});

// Ruta para actualizar a premium
app.post('/api/users/upgrade-to-premium', authenticateToken, (req, res) => {
  const user = users.find(u => u.id === req.user.userId);

  if (!user) {
    return res.status(404).json({ message: 'Usuario no encontrado' });
  }

  // Configurar fecha de expiración (1 mes desde ahora)
  const now = new Date();
  user.membership = 'premium';
  user.subscriptionEnd = new Date(now.setMonth(now.getMonth() + 1)).toISOString();
  user.updatedAt = new Date().toISOString();

  // Guardar datos
  saveData(USERS_FILE, users);

  res.json({
    message: 'Actualizado a Premium exitosamente',
    user: {
      id: user.id,
      name: user.name,
      lastname: user.lastname,
      email: user.email,
      membership: user.membership,
      subscriptionEnd: user.subscriptionEnd
    }
  });
});

// Ruta para obtener información del usuario
app.get('/api/users/me', authenticateToken, (req, res) => {
  const user = users.find(u => u.id === req.user.userId);

  if (!user) {
    return res.status(404).json({ message: 'Usuario no encontrado' });
  }

  // No devolver la contraseña
  const userToReturn = { ...user };
  delete userToReturn.password;

  res.json(userToReturn);
});

// ===== RUTAS PARA TARJETAS DIDÁCTICAS =====

// Ruta para guardar tarjetas didácticas
app.post('/api/didactic-cards/save', authenticateToken, (req, res) => {
  try {
    const { cards } = req.body;
    const userId = req.user.userId;

    if (!userPlans[userId]) {
      userPlans[userId] = { plans: [], context: [], didacticCards: [] };
    }

    // Actualizar o agregar tarjetas
    cards.forEach(card => {
      const existingIndex = userPlans[userId].didacticCards?.findIndex(c => c.id === card.id) ?? -1;
      if (existingIndex >= 0) {
        userPlans[userId].didacticCards[existingIndex] = card;
      } else {
        if (!userPlans[userId].didacticCards) {
          userPlans[userId].didacticCards = [];
        }
        userPlans[userId].didacticCards.push(card);
      }
    });

    if (!saveData(PLANS_FILE, userPlans)) {
      throw new Error('Error al guardar las tarjetas didácticas');
    }

    res.json({ success: true, message: 'Tarjetas guardadas exitosamente' });
  } catch (error) {
    console.error('Error al guardar tarjetas didácticas:', error);
    res.status(500).json({
      success: false,
      message: 'Error al guardar tarjetas: ' + error.message
    });
  }
});

// Ruta para obtener tarjetas didácticas
app.get('/api/didactic-cards', authenticateToken, (req, res) => {
  try {
    const userId = req.user.userId;
    const cards = userPlans[userId]?.didacticCards || [];
    res.json({ success: true, cards });
  } catch (error) {
    console.error('Error al obtener tarjetas didácticas:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener tarjetas'
    });
  }
});

// Ruta para eliminar tarjeta didáctica
app.delete('/api/didactic-cards/delete/:id', authenticateToken, (req, res) => {
  try {
    const userId = req.user.userId;
    const cardId = req.params.id;

    if (!userPlans[userId]?.didacticCards) {
      return res.status(404).json({
        success: false,
        message: 'No se encontraron tarjetas'
      });
    }

    const initialLength = userPlans[userId].didacticCards.length;
    userPlans[userId].didacticCards = userPlans[userId].didacticCards.filter(card => card.id !== cardId);

    if (userPlans[userId].didacticCards.length === initialLength) {
      return res.status(404).json({
        success: false,
        message: 'Tarjeta no encontrada'
      });
    }

    if (!saveData(PLANS_FILE, userPlans)) {
      throw new Error('Error al guardar los cambios');
    }

    res.json({
      success: true,
      message: 'Tarjeta eliminada exitosamente'
    });
  } catch (error) {
    console.error('Error al eliminar tarjeta didáctica:', error);
    res.status(500).json({
      success: false,
      message: 'Error al eliminar tarjeta: ' + error.message
    });
  }
});

// Ruta para obtener configuración
app.get('/api/config', authenticateToken, (req, res) => {
  try {
    const userId = req.user.userId;

    if (!userPlans[userId]) {
      userPlans[userId] = { plans: [], context: [], didacticCards: [], config: {} };
    }

    res.json({
      success: true,
      config: userPlans[userId].config || {}
    });
  } catch (error) {
    console.error('Error al obtener configuración:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener configuración'
    });
  }
});

// Ruta para guardar configuración
app.post('/api/config/save', authenticateToken, (req, res) => {
  try {
    const { config } = req.body;
    const userId = req.user.userId;

    if (!userPlans[userId]) {
      userPlans[userId] = { plans: [], context: [], didacticCards: [], config: {} };
    }

    // Actualizar configuración
    userPlans[userId].config = config;

    // Guardar datos
    if (!saveData(PLANS_FILE, userPlans)) {
      throw new Error('Error al guardar la configuración');
    }

    res.json({
      success: true,
      message: 'Configuración guardada exitosamente'
    });
  } catch (error) {
    console.error('Error al guardar configuración:', error);
    res.status(500).json({
      success: false,
      message: 'Error al guardar configuración: ' + error.message
    });
  }
});

// =============================================
// RUTAS DE ADMINISTRACIÓN
// =============================================

// Obtener todos los usuarios (solo admin)
app.get('/api/admin/users', authenticateToken, authenticateAdmin, (req, res) => {
  try {
    // No devolver contraseñas
    const usersToReturn = users.map(user => {
      const { password, ...userWithoutPassword } = user;
      return userWithoutPassword;
    });

    res.json({
      success: true,
      users: usersToReturn
    });
  } catch (error) {
    console.error('Error al obtener usuarios:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener usuarios'
    });
  }
});

// Obtener detalles de un usuario específico (solo admin)
app.get('/api/admin/users/:id', authenticateToken, authenticateAdmin, (req, res) => {
  try {
    const userId = req.params.id;
    const user = users.find(u => u.id === userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    // No devolver la contraseña
    const { password, ...userData } = user;

    res.json({
      success: true,
      user: userData
    });
  } catch (error) {
    console.error('Error al obtener detalles del usuario:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener detalles del usuario'
    });
  }
});

// Actualizar membresía de un usuario (solo admin)
app.put('/api/admin/users/:id/membership', authenticateToken, authenticateAdmin, (req, res) => {
  try {
    const userId = req.params.id;
    const { membership } = req.body;

    if (!['basic', 'premium'].includes(membership)) {
      return res.status(400).json({
        success: false,
        message: 'Tipo de membresía no válido'
      });
    }

    const user = users.find(u => u.id === userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    // Actualizar membresía
    user.membership = membership;
    user.updatedAt = new Date().toISOString();

    // Si es premium, establecer fecha de expiración (1 mes)
    if (membership === 'premium') {
      const now = new Date();
      user.subscriptionEnd = new Date(now.setMonth(now.getMonth() + 1)).toISOString();
    } else {
      user.subscriptionEnd = null;
    }

    // Guardar cambios
    saveData(USERS_FILE, users);

    res.json({
      success: true,
      message: 'Membresía actualizada exitosamente',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        membership: user.membership,
        subscriptionEnd: user.subscriptionEnd
      }
    });
  } catch (error) {
    console.error('Error al actualizar membresía:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar membresía'
    });
  }
});

// Eliminar un usuario (solo admin)
app.delete('/api/admin/users/:id', authenticateToken, authenticateAdmin, (req, res) => {
  try {
    const userId = req.params.id;

    // Verificar si el usuario existe
    const userIndex = users.findIndex(u => u.id === userId);
    if (userIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    // Eliminar usuario
    users.splice(userIndex, 1);

    // Eliminar planes asociados
    delete userPlans[userId];

    // Eliminar sesión si existe
    delete sessions[userId];

    // Guardar cambios
    saveData(USERS_FILE, users);
    saveData(PLANS_FILE, userPlans);
    saveData(SESSIONS_FILE, sessions);

    res.json({
      success: true,
      message: 'Usuario eliminado exitosamente',
      deletedUserId: userId
    });
  } catch (error) {
    console.error('Error al eliminar usuario:', error);
    res.status(500).json({
      success: false,
      message: 'Error al eliminar usuario'
    });
  }
});

// Resetear datos de un usuario (solo admin)
app.post('/api/admin/users/:id/reset', authenticateToken, authenticateAdmin, (req, res) => {
  try {
    const userId = req.params.id;

    // Verificar si el usuario existe
    const user = users.find(u => u.id === userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    // Resetear planes del usuario
    userPlans[userId] = { plans: [], context: [], didacticCards: [] };

    // Guardar cambios
    saveData(PLANS_FILE, userPlans);

    res.json({
      success: true,
      message: 'Datos del usuario reseteados exitosamente',
      userId: userId
    });
  } catch (error) {
    console.error('Error al resetear datos de usuario:', error);
    res.status(500).json({
      success: false,
      message: 'Error al resetear datos de usuario'
    });
  }
});

// Endpoints para tarjetas de plano-realidad
// Obtener tarjetas
app.get('/api/plano-realidad', authenticateToken, (req, res) => {
  const userId = req.user.userId;
  let planoRealidad = [];
  if (userPlans[userId]) {
    if (Array.isArray(userPlans[userId].planoRealidad)) {
      planoRealidad = userPlans[userId].planoRealidad;
    } else if (Array.isArray(userPlans[userId].plans)) {
      // Compatibilidad: mapear a formato de tarjetas
      planoRealidad = userPlans[userId].plans.map(plan => ({
        nombreTema: plan.name || '',
        descripcionTema: plan.description || '',
        situaciones: (plan.situations || []).map(sit => ({
          descripcionSituacion: sit.description || '',
          problemas: Array.isArray(sit.problems) ? sit.problems.map(prob => ({ descripcionProblema: prob })) : []
        }))
      }));
    }
  }
  res.json({ success: true, planoRealidad });
});

// Guardar/actualizar tarjetas
app.post('/api/plano-realidad', authenticateToken, (req, res) => {
  const userId = req.user.userId;
  const { planoRealidad } = req.body;
  if (!Array.isArray(planoRealidad)) {
    return res.status(400).json({ success: false, message: 'Formato inválido: planoRealidad debe ser un arreglo.' });
  }
  if (!userPlans[userId]) userPlans[userId] = { plans: [], context: [], didacticCards: [] };
  userPlans[userId].planoRealidad = planoRealidad;
  saveData(PLANS_FILE, userPlans);
  res.json({ success: true });
});

// --- SISTEMA DE CRÉDITOS ---

// Obtener créditos actuales
app.get('/api/creditos', authenticateToken, (req, res) => {
  const userId = req.user.userId;
  const user = users.find(u => u.id === userId);
  if (!user || user.membership !== 'premium') {
    return res.json({ creditos: 0, reset: false, message: 'No eres usuario premium' });
  }
  // Si la membresía fue renovada, resetear créditos
  if (user.subscriptionEnd && user.creditosLastReset) {
    const lastReset = new Date(user.creditosLastReset);
    const endDate = new Date(user.subscriptionEnd);
    if (lastReset < endDate && user.creditos !== 100) {
      user.creditos = 100;
      user.creditosLastReset = new Date().toISOString();
      saveData(USERS_FILE, users);
      return res.json({ creditos: 100, reset: true, message: '¡Tus créditos han sido renovados!' });
    }
  }
  res.json({ creditos: user.creditos ?? 100, reset: false });
});

// Actualizar créditos (solo admin o lógica especial)
app.post('/api/creditos', authenticateToken, authenticateAdmin, (req, res) => {
  const { userId, creditos } = req.body;
  const user = users.find(u => u.id === userId);
  if (!user) return res.status(404).json({ message: 'Usuario no encontrado' });
  user.creditos = typeof creditos === 'number' ? creditos : 100;
  user.creditosLastReset = new Date().toISOString();
  saveData(USERS_FILE, users);
  res.json({ creditos: user.creditos });
});

// Descontar 1 crédito
app.post('/api/creditos/descontar', authenticateToken, (req, res) => {
  const userId = req.user.userId;
  const user = users.find(u => u.id === userId);
  if (!user || user.membership !== 'premium') {
    return res.status(403).json({ creditos: 0, message: 'No eres usuario premium' });
  }
  if (typeof user.creditos !== 'number') user.creditos = 100;
  // Si la membresía fue renovada, resetear créditos
  if (user.subscriptionEnd && user.creditosLastReset) {
    const lastReset = new Date(user.creditosLastReset);
    const endDate = new Date(user.subscriptionEnd);
    if (lastReset < endDate) {
      user.creditos = 100;
      user.creditosLastReset = new Date().toISOString();
      saveData(USERS_FILE, users);
      return res.json({ creditos: 100, reset: true, message: '¡Tus créditos han sido renovados!' });
    }
  }
  if (user.creditos <= 0) {
    return res.status(403).json({ creditos: 0, message: 'Sin créditos disponibles' });
  }
  user.creditos -= 1;
  saveData(USERS_FILE, users);
  res.json({ creditos: user.creditos });
});

// --- NOTIFICACIÓN POR TELEGRAM DESDE EL PANEL ADMIN ---
app.post('/api/admin/send-telegram', authenticateToken, authenticateAdmin, async (req, res) => {
  let { userIds, message } = req.body;
  if ((!userIds || !Array.isArray(userIds) || userIds.length === 0) || !message) {
    return res.status(400).json({ success: false, message: 'Faltan campos obligatorios o usuarios.' });
  }
  let sent = 0;
  let failed = [];
  for (const userId of userIds) {
    const user = users.find(u => u.id === userId);
    if (!user || !user.telegramChatId) {
      failed.push(userId);
      continue;
    }
    try {
      await bot.sendMessage(user.telegramChatId, message);
      sent++;
    } catch (err) {
      failed.push(userId);
    }
  }
  res.json({ success: true, sent, failed });
});

// --- ENVÍO DE CORREOS DESDE EL PANEL ADMIN ---
app.post('/api/admin/send-email', authenticateToken, authenticateAdmin, async (req, res) => {
  const { to, subject, message } = req.body;
  if (!to || !subject || !message) {
    return res.status(400).json({ success: false, message: 'Faltan campos obligatorios.' });
  }
  // Transport direct (sin relay SMTP, entrega directa)
  let transporter = nodemailer.createTransport({
    direct: true,
    name: 'didapptic.com.mx' // Tu dominio
  });
  try {
    await transporter.sendMail({
      from: 'Didapptic Notificaciones <notificaciones@didapptic.com.mx>',
      to,
      subject,
      html: `<p>${message}</p>`
    });
    res.json({ success: true });
  } catch (err) {
    console.error('Error al enviar correo:', err);
    res.json({ success: false, message: err.message });
  }
});

// --- INTEGRACIÓN EN IA ---
// Endpoint IA: descontar crédito antes de procesar
const originalGeneratePlan = app._router.stack.find(r => r.route && r.route.path === '/api/ia/generatePlan');
app.post('/api/ia/generatePlan', authenticateToken, async (req, res) => {
  const userId = req.user.userId;
  const user = users.find(u => u.id === userId);
  if (!user || user.membership !== 'premium') {
    return res.status(403).json({ message: 'Solo usuarios premium pueden usar la IA.' });
  }
  if (typeof user.creditos !== 'number') user.creditos = 100;
  // Resetear créditos si la membresía fue renovada
  if (user.subscriptionEnd && user.creditosLastReset) {
    const lastReset = new Date(user.creditosLastReset);
    const endDate = new Date(user.subscriptionEnd);
    if (lastReset < endDate) {
      user.creditos = 100;
      user.creditosLastReset = new Date().toISOString();
      saveData(USERS_FILE, users);
      return res.status(403).json({ message: 'Tus créditos han sido renovados. Intenta de nuevo.' });
    }
  }
  if (user.creditos <= 0) {
    return res.status(403).json({ message: 'Sin créditos disponibles para usar la IA.' });
  }
  user.creditos -= 1;
  saveData(USERS_FILE, users);
  // Procesar la IA normalmente
  try {
    const { prompt, max_tokens, temperature } = req.body;
    const iaResponse = await callIA(prompt);
    res.json({ response: iaResponse });
  } catch (error) {
    res.status(500).json({ message: 'Error al generar respuesta de IA', error });
  }
});

// Servir archivos estáticos
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
  console.log(`Usuarios registrados: ${users.length}`);
  console.log(`Planes almacenados: ${Object.keys(userPlans).length} usuarios tienen planes`);

  // Crear usuario admin si no existe
  const adminExists = users.some(u => u.email === 'admin@didapptic.com');
  if (!adminExists) {
    const hashedPassword = bcrypt.hashSync('admin123', 10);
    const adminUser = {
      id: Date.now().toString(),
      name: 'Admin',
      lastname: 'Didapptic',
      email: 'admin@didapptic.com',
      password: hashedPassword,
      membership: 'admin',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    users.push(adminUser);
    saveData(USERS_FILE, users);
    console.log('Usuario admin creado: admin@didapptic.com / admin123');
  }
});