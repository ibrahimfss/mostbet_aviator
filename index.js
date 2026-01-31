import { Telegraf, Markup } from 'telegraf';
import { languageTexts } from './languages.js';
import { currencyData } from './currencies.js';
import admin from "firebase-admin";

/* =====================
ENV & FIREBASE CONFIGURATION
===================== */
const BOT_TOKEN = process.env.BOT_TOKEN;
const CHANNEL_USERNAME = process.env.CHANNEL_USERNAME || '@Mostbet_Hacks';
const CHANNEL_ID = process.env.CHANNEL_ID || -3645928410; // Agar channel ID pata hai to daalein
const ADMIN_ID = Number(process.env.ADMIN_ID);

// Add this function after all imports
function escapeMarkdown(text) {
    if (!text) return '';
    return text
        .replace(/_/g, '\\_')
        .replace(/\*/g, '\\*')
        .replace(/\[/g, '\\[')
        .replace(/\]/g, '\\]')
        .replace(/\(/g, '\\(')
        .replace(/\)/g, '\\)')
        .replace(/~/g, '\\~')
        .replace(/`/g, '\\`')
        .replace(/>/g, '\\>')
        .replace(/#/g, '\\#')
        .replace(/\+/g, '\\+')
        .replace(/-/g, '\\-')
        .replace(/=/g, '\\=')
        .replace(/\|/g, '\\|')
        .replace(/{/g, '\\{')
        .replace(/}/g, '\\}')
        .replace(/\./g, '\\.')
        .replace(/!/g, '\\!');
}

// Firebase Initialization
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n') : undefined,
        }),
        // FIX: Added backticks around the URL
        databaseURL: `https://${process.env.FIREBASE_PROJECT_ID}-default-rtdb.firebaseio.com`
    });
}

const db = admin.database();

// ==================== FIREBASE DATABASE FUNCTIONS ====================

// Save user to Firebase
async function saveUserToFirebase(userId, userData) {
  try {
    await db.ref('users/' + userId).set(userData);
    console.log(`✅ User ${userId} saved to Firebase`);
  } catch (error) {
    console.error('Error saving user to Firebase:', error);
  }
}

// Get user from Firebase
async function getUserFromFirebase(userId) {
  try {
    const snapshot = await db.ref('users/' + userId).once('value');
    return snapshot.val();
  } catch (error) {
    console.error('Error getting user from Firebase:', error);
    return null;
  }
}

// Get all users from Firebase
async function getAllUsersFromFirebase() {
  try {
    const snapshot = await db.ref('users').once('value');
    return snapshot.val() || {};
  } catch (error) {
    console.error('Error getting all users:', error);
    return {};
  }
}

// Save support ticket to Firebase
async function saveTicketToFirebase(userId) {
  try {
    await db.ref('tickets/' + userId).set({
      userId: userId,
      openedAt: new Date().toISOString(),
      status: 'open'
    });
  } catch (error) {
    console.error('Error saving ticket:', error);
  }
}

// Remove ticket from Firebase
async function removeTicketFromFirebase(userId) {
  try {
    await db.ref('tickets/' + userId).remove();
  } catch (error) {
    console.error('Error removing ticket:', error);
  }
}

// Get all tickets from Firebase
async function getAllTicketsFromFirebase() {
  try {
    const snapshot = await db.ref('tickets').once('value');
    return snapshot.val() || {};
  } catch (error) {
    console.error('Error getting tickets:', error);
    return {};
  }
}

// Get user stats from Firebase
async function getUserStatsFromFirebase() {
  try {
    const snapshot = await db.ref('users').once('value');
    const users = snapshot.val() || {};
    const userArray = Object.values(users);
    
    const total = userArray.length;
    const active = userArray.filter(u => u.active).length;
    const inactive = total - active;
    
    return { total, active, inactive };
  } catch (error) {
    console.error('Error getting stats:', error);
    return { total: 0, active: 0, inactive: 0 };
  }
}

// Add message to ticket history (REQUIRED FOR SUPPORT CHAT)
async function addMessageToTicket(userId, messageData) {
  try {
    const ticketRef = db.ref('tickets/' + userId);
    const snapshot = await ticketRef.once('value');
    let ticketData = snapshot.val();

    if (!ticketData) {
      ticketData = { userId: userId, messages: [], status: 'open', openedAt: new Date().toISOString() };
    }

    // Ensure messages is initialized
    if (!ticketData.messages) ticketData.messages = [];
    
    // Convert object to array if Firebase returned an object map (Important for index access)
    if (typeof ticketData.messages === 'object' && !Array.isArray(ticketData.messages)) {
        ticketData.messages = Object.values(ticketData.messages);
    }
    
    // Add new message
    ticketData.messages.push({
      ...messageData,
      timestamp: new Date().toISOString()
    });

    // Save back to Firebase
    await ticketRef.set(ticketData);
  } catch (error) {
    console.error('Error adding message to ticket:', error);
  }
}

// Save message to ticket
async function saveMessageToTicket(userId, msgData) {
  try {
    await db.ref(`tickets/${userId}/messages`).push(msgData);
  } catch (error) {
    console.error('Error saving ticket message:', error);
  }
}

// Get ticket messages
async function getTicketMessages(userId) {
  try {
    const snapshot = await db.ref(`tickets/${userId}/messages`).once('value');
    const messages = snapshot.val() || {};
    // Convert object to array and sort by date
    return Object.values(messages).sort((a, b) => new Date(a.date) - new Date(b.date));
  } catch (error) {
    console.error('Error getting ticket messages:', error);
    return [];
  }
}

if (!BOT_TOKEN || !ADMIN_ID) throw new Error("BOT_TOKEN or ADMIN_ID missing");

const bot = new Telegraf(BOT_TOKEN);

// ==================== IMAGES & MEDIA ====================
const IMAGES = {
  LANGUAGE_SELECTION: 'https://ik.imagekit.io/kdyvr75if/Picsart_25-12-26_14-31-15-558.png',
  SUPPORT: 'https://ik.imagekit.io/kdyvr75if/Picsart_25-12-26_14-31-15-558.png',
  REGISTRATION: 'https://ik.imagekit.io/kdyvr75if/Picsart_25-12-26_14-31-15-558.png',
  ADMIN_PANEL: 'https://ik.imagekit.io/kdyvr75if/Picsart_25-12-26_14-31-15-558.png',
  USER_LIST: 'https://ik.imagekit.io/kdyvr75if/Picsart_25-12-26_14-31-15-558.png',
  BROADCAST: 'https://ik.imagekit.io/kdyvr75if/Picsart_25-12-26_14-31-15-558.png'
};

const VIDEOS = {
  INSTRUCTION: 'https://ik.imagekit.io/kdyvr75if/InShot_20251227_132830892.mp4'
};

// ==================== MEMORY STORAGE ====================
const userStorage = new Map(); // Store user data
const adminBroadcastMode = new Map(); // Track broadcast mode
const adminReplyTarget = new Map(); // Track admin reply target
const supportTickets = new Map(); // Support tickets
const adminSearchMode = new Map(); // Track admin search mode

// Load tickets from Firebase on startup
async function loadTicketsFromFirebase() {
  try {
    const tickets = await getAllTicketsFromFirebase();
    Object.keys(tickets).forEach(userId => {
      supportTickets.set(parseInt(userId), true);
    });
    console.log(`📥 Loaded ${Object.keys(tickets).length} tickets from Firebase`);
  } catch (error) {
    console.error('Error loading tickets:', error);
  }
}

// Add ticket - UPDATED
async function addTicket(userId) {
  supportTickets.set(userId, true);
  await saveTicketToFirebase(userId);
}

// Remove ticket - UPDATED
async function removeTicket(userId) {
  supportTickets.delete(userId);
  await removeTicketFromFirebase(userId);
}

// Get active tickets - UPDATED
async function getActiveTickets() {
  // Get from memory (fast) and verify with Firebase
  const memoryTickets = Array.from(supportTickets.keys());
  return memoryTickets;
}

// User data structure - UPDATED VERSION
async function getUserData(userId) {
  // First try to get from Firebase
  const firebaseUser = await getUserFromFirebase(userId);
  
  if (firebaseUser) {
    // Update memory storage with Firebase data
    userStorage.set(userId, firebaseUser);
    return firebaseUser;
  }
  
  // If not in Firebase, create new user
  if (!userStorage.has(userId)) {
    const newUser = {
      id: userId,
      lang: 'en',
      langName: 'English',
      joinedChannel: false,
      registered: false,
      active: true,
      joinedAt: new Date().toISOString(),
      lastSeen: new Date().toISOString(),
      username: '',
      firstName: '',
      lastName: '',
      profilePhotoId: null
    };
    userStorage.set(userId, newUser);
    
    // Save to Firebase
    await saveUserToFirebase(userId, newUser);
  }
  return userStorage.get(userId);
}

// Update user data - UPDATED VERSION
async function updateUserData(userId, data) {
  const user = await getUserData(userId);
  const updatedUser = { 
    ...user, 
    ...data, 
    lastSeen: new Date().toISOString() 
  };
  
  // Update memory
  userStorage.set(userId, updatedUser);
  
  // Update Firebase
  await saveUserToFirebase(userId, updatedUser);
  
  return updatedUser;
}

// Get user stats - UPDATED VERSION
async function getUserStats() {
  // Get from Firebase for accurate data
  const stats = await getUserStatsFromFirebase();
  return stats;
}

// ==================== LANGUAGE SELECTION ====================
bot.start(async (ctx) => {
  const userId = ctx.from.id;
  
  // Load user from Firebase
  const user = await getUserData(userId);

  // Update user info
  await updateUserData(userId, {
    username: ctx.from.username || '',
    firstName: ctx.from.first_name || '',
    lastName: ctx.from.last_name || ''
  });

  // Try to get profile photo
  try {
    const profilePhotos = await ctx.telegram.getUserProfilePhotos(userId, 0, 1);
    if (profilePhotos.total_count > 0) {
      const photo = profilePhotos.photos[0][0];
      await updateUserData(userId, { profilePhotoId: photo.file_id });
    }
  } catch (error) {
    console.error('Error getting profile photo:', error);
  }

  // Show language selection
await showLanguageSelection(ctx, 0); // Start from page 0
});

// ==================== LANGUAGE SELECTION WITH PAGINATION ====================
const languages = [
  { code: 'en', flag: '🇺🇸', name: 'English' },
  { code: 'hi', flag: '🇮🇳', name: 'हिंदी' },
  { code: 'bn', flag: '🇧🇩', name: 'বাংলা' },
  { code: 'ur', flag: '🇵🇰', name: 'اردو' },
  { code: 'ru', flag: '🇷🇺', name: 'Русский' },
  { code: 'pt', flag: '🇧🇷', name: 'Português' },
  { code: 'es', flag: '🇪🇸', name: 'Español' },
  { code: 'fr', flag: '🇫🇷', name: 'Français' },
  { code: 'de', flag: '🇩🇪', name: 'Deutsch' },
  { code: 'it', flag: '🇮🇹', name: 'Italiano' },
  { code: 'ph', flag: '🇵🇭', name: 'Filipino' },
  { code: 'vi', flag: '🇻🇳', name: 'Tiếng Việt' },
  { code: 'tr', flag: '🇹🇷', name: 'Türkçe' },
  { code: 'ar', flag: '🇸🇦', name: 'العربية' },
  { code: 'fa', flag: '🇮🇷', name: 'فارسی' },
  { code: 'zh', flag: '🇨🇳', name: '中文' },
  { code: 'ja', flag: '🇯🇵', name: '日本語' },
  { code: 'ko', flag: '🇰🇷', name: '한국어' },
  { code: 'uk', flag: '🇺🇦', name: 'Українська' },
  { code: 'pt-pt', flag: '🇵🇹', name: 'Português (Portugal)' },
  { code: 'en-ng', flag: '🇳🇬', name: 'English (Africa)' },
  { code: 'ms', flag: '🇲🇾', name: 'Melayu' },
  { code: 'he', flag: '🇮🇱', name: 'עברית' },
  { code: 'th', flag: '🇹🇭', name: 'ไทย' },
  { code: 'id', flag: '🇮🇩', name: 'Bahasa Indonesia' },
  { code: 'si', flag: '🇱🇰', name: 'සිංහල' },
  { code: 'ne', flag: '🇳🇵', name: 'नेपाली' },
  { code: 'ps', flag: '🇦🇫', name: 'پښتو' },
  { code: 'uz', flag: '🇺🇿', name: 'Oʻzbekcha' },
  { code: 'kk', flag: '🇰🇿', name: 'Қазақша' },
  { code: 'tg', flag: '🇹🇯', name: 'Тоҷикӣ' },
  { code: 'el', flag: '🇬🇷', name: 'Ελληνικά' },
  { code: 'pl', flag: '🇵🇱', name: 'Polski' },
  { code: 'nl', flag: '🇳🇱', name: 'Nederlands' },
  { code: 'ro', flag: '🇷🇴', name: 'Română' },
  { code: 'bg', flag: '🇧🇬', name: 'Български' },
  { code: 'cs', flag: '🇨🇿', name: 'Čeština' },
  { code: 'sk', flag: '🇸🇰', name: 'Slovenčina' },
  { code: 'hu', flag: '🇭🇺', name: 'Magyar' },
  { code: 'sr', flag: '🇷🇸', name: 'Српски' }
];

const LANGUAGES_PER_PAGE = 10;
const TOTAL_PAGES = Math.ceil(languages.length / LANGUAGES_PER_PAGE);

// Show language selection with pagination
async function showLanguageSelection(ctx, page = 0) {
  const userId = ctx.from.id;
  const user = await getUserData(userId);  // ✅ Pehli declaration - YAHI USE KARNA HAI
  
  const start = page * LANGUAGES_PER_PAGE;
  const end = start + LANGUAGES_PER_PAGE;
  const pageLanguages = languages.slice(start, end);
  
  // Create buttons (2 per row)
  const buttons = [];
  for (let i = 0; i < pageLanguages.length; i += 2) {
    const row = [];
    row.push(
      Markup.button.callback(
        `${pageLanguages[i].flag} ${pageLanguages[i].name}`,
        `set_lang_${pageLanguages[i].code}`
      )
    );
    
    if (pageLanguages[i + 1]) {
      row.push(
        Markup.button.callback(
          `${pageLanguages[i + 1].flag} ${pageLanguages[i + 1].name}`,
          `set_lang_${pageLanguages[i + 1].code}`
        )
      );
    }
    buttons.push(row);
  }
  
  // Add navigation buttons
  const navRow = [];
  
  if (page > 0) {
    navRow.push(Markup.button.callback('⬅️ Prev', `lang_page_${page - 1}`));
  }
  
  if (page < TOTAL_PAGES - 1) {
    // First page shows "More Languages", other pages show "Next ➡️"
    const nextButtonText = page === 0 ? '🌐 More Languages' : 'Next ➡️';
    navRow.push(Markup.button.callback(nextButtonText, `lang_page_${page + 1}`));
  }
  
  if (navRow.length > 0) {
    buttons.push(navRow);
  }
  
  // ✅✅✅ FIXED CODE ✅✅✅
  // Get user's language data for caption
  // const user = await getUserData(userId);  // ❌ YEH LINE COMPLETELY DELETE KAR DEIN
  const userLangCode = user?.lang || 'en';  // ✅ Yahin pehle wale 'user' variable ko use karein
  const userLangData = languageTexts[userLangCode] || languageTexts['en'];
  
  // Use user's language for the caption
  const caption = `🌐 *${userLangData.select}*\n\n👇 Tap on your language below`;
  
  // If it's a callback query (editing message)
  if (ctx.callbackQuery) {
    await ctx.editMessageMedia(
      {
        type: 'photo',
        media: IMAGES.LANGUAGE_SELECTION,
        caption: caption,
        parse_mode: 'Markdown'
      },
      {
        reply_markup: {
          inline_keyboard: buttons
        }
      }
    );
  } else {
    // If it's a new message (from /start)
    await ctx.replyWithPhoto(
      IMAGES.LANGUAGE_SELECTION,
      {
        caption: caption,
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard(buttons)
      }
    );
  }
}

// Language selection handler
bot.action(/^set_lang_(.+)$/, async (ctx) => {
  const userId = ctx.from.id;
  const langCode = ctx.match[1];
  
  const langData = languageTexts[langCode] || languageTexts['en'];
  const currency = currencyData[langCode] || currencyData['en'];
  
  // Update user language
await updateUserData(userId, {
  lang: langCode,
  langName: langData.name
});
  
  // Show join channel message
  const joinCaption = langData.join.text;
  
  await ctx.editMessageMedia(
    {
      type: 'photo',
      media: IMAGES.LANGUAGE_SELECTION,
      caption: joinCaption,
      parse_mode: 'Markdown'
    },
    {
      reply_markup: {
        inline_keyboard: [
          [
            { text: langData.join.buttonJoin, url: 'https://t.me/Mostbet_Hacks' }
          ],
          [
            { text: langData.join.buttonCheck, callback_data: 'check_join' }
          ]
        ]
      }
    }
  );
  
  await ctx.answerCbQuery(`✅ Selected ${langData.name}`);
});

// Check channel membership
bot.action('check_join', async (ctx) => {
  const userId = ctx.from.id;
  
  // FIX: Added 'await' here
  const user = await getUserData(userId); 
  
  const langCode = user.lang || 'en';
  const langData = languageTexts[langCode] || languageTexts['en'];
  const currency = currencyData[langCode] || currencyData['en'];
  
  try {
    // Check if user joined channel
    const chatMember = await ctx.telegram.getChatMember(CHANNEL_USERNAME, userId);
    const isMember = ['member', 'administrator', 'creator'].includes(chatMember.status);
    
    if (!isMember) {
      await ctx.answerCbQuery('❌ Please join the channel first');
      return;
    }
    
    // Update user status
    updateUserData(userId, { joinedChannel: true });
    
    // Prepare registration message with currency conversion
    const registrationText = langData.registration.success
      .replace('₹1000', `${currency.symbol}${currency.amount}`);
    
    // Create registration buttons array
    const registrationButtons = [
      // First row - REGISTER button
      [
        { text: langData.registration.buttonRegister, url: 'https://1win.com' }
      ],
      // Second row - INSTRUCTIONS and GET SIGNAL in same row
      [
        { text: langData.instruction.button || "📲 INSTRUCTIONS", callback_data: 'show_instructions' },
        { text: langData.registration.buttonSignal, url: 'https://nexusplay.shop' }
      ],
      // Third row - CHANGE LANGUAGE button
      [
        { text: langData.registration.buttonChange, callback_data: 'change_language' }
      ]
    ];

    // ✅ Add ADMIN PANEL button ONLY for admin (Fourth row)
    if (userId === ADMIN_ID) {
      registrationButtons.push([
        { text: "🛡️ ADMIN PANEL", callback_data: "ADMIN_PANEL" }
      ]);
    }

    await ctx.editMessageMedia(
      {
        type: 'photo',
        media: IMAGES.REGISTRATION,
        caption: registrationText,
        parse_mode: 'Markdown'
      },
      {
        reply_markup: {
          inline_keyboard: registrationButtons
        }
      }
    );

    await ctx.answerCbQuery('✅ Channel joined successfully!');
    
  } catch (error) {
    console.error('Error checking channel membership:', error);
    await ctx.answerCbQuery('❌ Error checking membership. Try again.');
  }
});

// Change language
bot.action('change_language', async (ctx) => {
  await showLanguageSelection(ctx, 0); // Start from page 0
  await ctx.answerCbQuery();
});

// Language pagination handler
bot.action(/^lang_page_(\d+)$/, async (ctx) => {
  const page = parseInt(ctx.match[1]);
  await showLanguageSelection(ctx, page);
  await ctx.answerCbQuery();
});

// Show Instructions Video Handler
bot.action('show_instructions', async (ctx) => {
  const userId = ctx.from.id;
  const user = await getUserData(userId); // ✅ Await added
  const langCode = user?.lang || 'en';
  const langData = languageTexts[langCode] || languageTexts['en'];
  const currency = currencyData[langCode] || currencyData['en'];
  
  // Use correct instruction caption from language file
  const instructionCaption = langData.instruction?.caption || 
                           "📲 *INSTRUCTIONS How to Register & Get Signals – Watch Carefully*";
  
  // Create buttons using user's language
  const instructionButtons = [
    [
      { 
        text: langData.registration?.buttonSignal || "📡 GET SIGNAL", 
        url: 'https://nexusplay.shop' 
      }
    ],
    [
      { 
        text: langData.liveSupport?.button || "🆘 Live Support", 
        callback_data: 'live_support' 
      }
    ],
    [
      { 
        text: langData.buttons?.back || "🔙 Back", 
        callback_data: 'back_to_registration' 
      }
    ]
  ];
  
  await ctx.editMessageMedia(
    {
      type: 'video',
      media: VIDEOS.INSTRUCTION,
      caption: instructionCaption,
      parse_mode: 'Markdown'
    },
    {
      reply_markup: {
        inline_keyboard: instructionButtons
      }
    }
  );
  
  await ctx.answerCbQuery();
});

// Back to Registration from Instructions
bot.action('back_to_registration', async (ctx) => {
  const userId = ctx.from.id;
  
  // FIX: Added 'await' here
  const user = await getUserData(userId);
  
  const langCode = user.lang || 'en';
  const langData = languageTexts[langCode] || languageTexts['en'];
  const currency = currencyData[langCode] || currencyData['en'];
  
  // Prepare registration message
  const registrationText = langData.registration.success
    .replace('₹1000', `${currency.symbol}${currency.amount}`);
  
  // Buttons recreate karna zaroori hai
  const registrationButtons = [
    [
      { text: langData.registration.buttonRegister, url: 'https://1win.com' }
    ],
    // INSTRUCTIONS and GET SIGNAL in same row
    [
      { text: langData.instruction.button || "📲 INSTRUCTIONS", callback_data: 'show_instructions' },
      { text: langData.registration.buttonSignal, url: 'https://nexusplay.shop' }
    ],
    [
      { text: langData.registration.buttonChange, callback_data: 'change_language' }
    ]
  ];

  if (userId === ADMIN_ID) {
    registrationButtons.push([
      { text: "🛡️ ADMIN PANEL", callback_data: "ADMIN_PANEL" }
    ]);
  }
  
  // Photo wapas Registration wali set karein
  await ctx.editMessageMedia(
    {
      type: 'photo',
      media: IMAGES.REGISTRATION,
      caption: registrationText,
      parse_mode: 'Markdown'
    },
    {
      reply_markup: { inline_keyboard: registrationButtons }
    }
  );
  await ctx.answerCbQuery();
});

// Live Support Handler - UPDATED
bot.action('live_support', async (ctx) => {
  const userId = ctx.from.id;
  const user = await getUserData(userId);
  const langCode = user.lang || 'en';
  const langData = languageTexts[langCode] || languageTexts['en'];

  // Add ticket to Firebase
  await addTicket(userId);

  // Professional support image
  const supportImage = 'https://ik.imagekit.io/kdyvr75if/Picsart_25-12-26_14-31-15-558.png';

  await ctx.editMessageMedia(
    {
      type: 'photo',
      media: supportImage,
      caption: langData.liveSupport.open,
      parse_mode: 'Markdown'
    },
    {
      reply_markup: {
        inline_keyboard: [
          [{ text: langData.liveSupport.closeButton || "❌ CLOSE TICKET", callback_data: 'close_ticket_user' }],
          [{ text: langData.buttons?.back || "🔙 Back", callback_data: 'back_to_registration' }]
        ]
      }
    }
  );
  await ctx.answerCbQuery();
});

// User ne ticket close karne ka button - UPDATED
bot.action('close_ticket_user', async (ctx) => {
  const userId = ctx.from.id;
  
  // Remove from Firebase
  await removeTicket(userId);

  await ctx.answerCbQuery('✅ Ticket closed');
  
  // Wapas registration page pe le jayein
  // FIX: Added 'await' here
  const user = await getUserData(userId);
  
  const langCode = user.lang || 'en';
  const langData = languageTexts[langCode] || languageTexts['en'];
  const currency = currencyData[langCode] || currencyData['en'];
  
  const registrationText = langData.registration.success
    .replace('₹1000', `${currency.symbol}${currency.amount}`);
  
  const registrationButtons = [
    [
      { text: langData.registration.buttonRegister, url: 'https://1win.com' }
    ],
    [
      { text: langData.instruction.button || "📲 INSTRUCTIONS", callback_data: 'show_instructions' },
      { text: langData.registration.buttonSignal, url: 'https://nexusplay.shop' }
    ],
    [
      { text: langData.registration.buttonChange, callback_data: 'change_language' }
    ]
  ];
  
  if (userId === ADMIN_ID) {
    registrationButtons.push([
      { text: "🛡️ ADMIN PANEL", callback_data: "ADMIN_PANEL" }
    ]);
  }
  
  await ctx.editMessageMedia(
    {
      type: 'photo',
      media: IMAGES.REGISTRATION,
      caption: registrationText,
      parse_mode: 'Markdown'
    },
    {
      reply_markup: {
        inline_keyboard: registrationButtons
      }
    }
  );
});

/* =====================
ADMIN PANEL & LOGIC - ENHANCED WITH TICKET SUPPORT
===================== */
bot.action("ADMIN_PANEL", async (ctx) => {
  if (ctx.from.id !== ADMIN_ID) return;

  const stats = await getUserStatsFromFirebase();
  const allTickets = await getAllTicketsFromFirebase();
  const activeTickets = Object.keys(allTickets).length;

  // Get unique languages from Firebase
  const allUsers = await getAllUsersFromFirebase();
  const uniqueLangs = new Set(Object.values(allUsers).map(u => u.langName || u.lang));
  
  const caption = `🛡️ *ADMIN CONTROL PANEL*\n\n` +
                 `👥 Total Users: ${stats.total}\n` +
                 `📞 Active Tickets: ${activeTickets}\n` +
                 `🌐 Languages: ${uniqueLangs.size}`;

  await ctx.editMessageMedia(
    {
      type: 'photo',
      media: IMAGES.ADMIN_PANEL,
      caption: caption,
      parse_mode: 'Markdown'
    },
    {
      reply_markup: {
        inline_keyboard: [
          [
            { text: '📞 View Tickets', callback_data: 'admin_view_tickets' },
            { text: '👥 User List', callback_data: 'admin_user_list_1' }
          ],
          [
            { text: '📢 Broadcast', callback_data: 'admin_broadcast' },
            { text: '🔍 Search User', callback_data: 'admin_search_user' }
          ],
          [
            { text: '🔄 Refresh', callback_data: 'admin_refresh' }
          ],
          [
            { text: '🔙 Back', callback_data: 'admin_back_to_registration' }
          ]
        ]
      }
    }
  );
});

// View Active Tickets - FIXED VERSION
bot.action("admin_view_tickets", async (ctx) => {
  if (ctx.from.id !== ADMIN_ID) return;

  try {
    const allTickets = await getAllTicketsFromFirebase();
    const activeTickets = Object.keys(allTickets || {});

    if (activeTickets.length === 0) {
      await ctx.editMessageCaption(
        "✅ *NO ACTIVE TICKETS*\n\nThere are no active support tickets at the moment.",
        {
          parse_mode: "Markdown",
          reply_markup: {
            inline_keyboard: [
              [{ text: "⬅️ Back to Admin Panel", callback_data: "ADMIN_PANEL" }]
            ]
          }
        }
      );
      return;
    }

    let caption = `📞 *ACTIVE SUPPORT TICKETS*\n\n*Total Active Tickets:* ${activeTickets.length}\n\n*Click on any user to view their ticket:*\n`;
    const buttons = [];

    // Show maximum 15 tickets per page
    for (const userId of activeTickets.slice(0, 15)) {
      try {
        const user = await getUserData(parseInt(userId));
        if (user) {
          const name = `${user.firstName || ''} ${user.lastName || ''}`.trim() || `User ${userId}`;
          const username = user.username ? `@${user.username}` : 'No username';
          
          buttons.push([{
            text: `👤 ${name.substring(0, 20)}${name.length > 20 ? '...' : ''} (ID: ${userId})`,
            callback_data: `admin_view_ticket_${userId}`
          }]);
        } else {
          // User not found in database but ticket exists
          buttons.push([{
            text: `❓ Unknown User (ID: ${userId})`,
            callback_data: `admin_view_ticket_${userId}`
          }]);
        }
      } catch (userError) {
        console.error(`Error loading user ${userId}:`, userError);
        buttons.push([{
          text: `⚠️ Error Loading (ID: ${userId})`,
          callback_data: `admin_view_ticket_${userId}`
        }]);
      }
    }

    // Add back button
    buttons.push([{ text: "⬅️ Back to Admin Panel", callback_data: "ADMIN_PANEL" }]);

    await ctx.editMessageCaption(caption, {
      parse_mode: "Markdown",
      reply_markup: { inline_keyboard: buttons }
    });
    
  } catch (error) {
    console.error("Error in admin_view_tickets:", error);
    await ctx.editMessageCaption(
      "❌ *ERROR LOADING TICKETS*\n\nFailed to load support tickets. Please try again.",
      {
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [
            [{ text: "⬅️ Back to Admin Panel", callback_data: "ADMIN_PANEL" }]
          ]
        }
      }
    );
  }
});

// View Specific Ticket with Pagination (Improved) - FIXED VERSION
bot.action(/^admin_view_ticket_(\d+)(?:_(\d+))?$/, async (ctx) => {
    if (ctx.from.id !== ADMIN_ID) return;
    
    const userId = parseInt(ctx.match[1]);
    const msgIndex = ctx.match[2] ? parseInt(ctx.match[2]) : 0; // Current message index
    
    try {
        // Fetch ticket data from Firebase FIRST
        const snapshot = await db.ref('tickets/' + userId).once('value');
        const ticketData = snapshot.val();

        if (!ticketData) {
            await ctx.answerCbQuery("❌ Ticket not found or closed", { show_alert: true });
            
            // Remove from memory if exists
            if (supportTickets.has(userId)) {
                await removeTicket(userId);
            }
            
            // Refresh ticket list
            await ctx.answerCbQuery();
            bot.action('admin_view_tickets')(ctx);
            return;
        }

        // Now get user data
        const user = await getUserData(userId);
        if (!user) {
            await ctx.answerCbQuery("❌ User not found in database", { show_alert: true });
            return;
        }

        // Handle messages - FIXED: Proper array conversion
        let messages = [];
        if (ticketData.messages) {
            // Convert Firebase object to array safely
            if (Array.isArray(ticketData.messages)) {
                messages = ticketData.messages;
            } else if (typeof ticketData.messages === 'object') {
                messages = Object.values(ticketData.messages);
            }
        }
        
        // Sort messages by timestamp (oldest first)
        messages.sort((a, b) => {
            const timeA = a.timestamp || a.date || '0';
            const timeB = b.timestamp || b.date || '0';
            return new Date(timeA) - new Date(timeB);
        });
        
        const totalMessages = messages.length;
        
        // Get specific message to show
        const currentMsg = totalMessages > 0 ? messages[msgIndex] : null;
        
        // Format User Details
        const name = `${user.firstName || ''} ${user.lastName || ''}`.trim() || `User ${userId}`;
        // FIX: Remove escapeMarkdown for username to avoid backslash
        const username = user.username ? 
            `@${user.username}`.replace(/\\/g, '') : 'N/A';
        const lang = user.langName || 'English';

        // FIX: Simple date formatting from Firebase timestamp to IST
        const formatDate = (dateString) => {
            if (!dateString) return 'N/A';
            try {
                // Firebase timestamp ya ISO string handle kare
                let date;
                if (typeof dateString === 'number') {
                    // Firebase timestamp (milliseconds)
                    date = new Date(dateString);
                } else if (dateString.includes('T')) {
                    // ISO string
                    date = new Date(dateString);
                } else {
                    return 'N/A';
                }
                
                // Add 5.5 hours for IST (UTC+5:30)
                const istTime = new Date(date.getTime() + (5.5 * 60 * 60 * 1000));
                
                // Extract components
                const day = istTime.getUTCDate().toString().padStart(2, '0');
                const month = (istTime.getUTCMonth() + 1).toString().padStart(2, '0');
                const year = istTime.getUTCFullYear();
                const hours = istTime.getUTCHours().toString().padStart(2, '0');
                const minutes = istTime.getUTCMinutes().toString().padStart(2, '0');
                const seconds = istTime.getUTCSeconds().toString().padStart(2, '0');
                
                return `${day}/${month}/${year}, ${hours}:${minutes}:${seconds}`;
            } catch (e) {
                console.error('Date formatting error for:', dateString, e);
                return 'N/A';
            }
        };

        // FIX: Prepare SAFE Caption without Markdown issues
        const cleanText = (text) => {
            if (!text) return '📎 Media File';
            // Don't escape underscores in usernames
            const str = text.toString();
            // Only escape characters that break HTML, not underscores
            return str
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#039;')
                .substring(0, 500);
        };
        
        // Build PROFESSIONAL caption with HTML formatting
        let caption = `<b>📩 SUPPORT TICKET</b>\n\n` +
                      `<b>👤 User:</b> ${cleanText(name)}\n` +
                      `<b>🆔 ID:</b> <code>${userId}</code>\n` +
                      `<b>👤 Username:</b> ${username}\n` +
                      `<b>🌐 Language:</b> ${cleanText(lang)}\n` +
                      `<b>⏰ Active since:</b> ${formatDate(user.joinedAt)}\n` +
                      `<b>📊 Messages:</b> ${totalMessages}\n` +
                      `-----------------------------\n`;

        if (currentMsg) {
            const msgContent = currentMsg.text || currentMsg.caption;
            const safeContent = cleanText(msgContent);
            
            // Format message time
            const msgTime = currentMsg.timestamp || currentMsg.date;
            const formattedMsgTime = formatDate(msgTime);
            
            caption += `<b>🔢 Message:</b> ${msgIndex + 1}/${totalMessages}\n` +
                       `<b>⏰ Time:</b> ${formattedMsgTime}\n` +
                       `<b>🗨️ Content:</b> ${safeContent}`;
        } else {
            caption += `⚠️ <i>No messages in this ticket.</i>\n\nTap "✏️ Reply" to start conversation.`;
        }

        // Determine Media to Show
        let mediaObj = {
            type: 'photo',
            media: IMAGES.SUPPORT, // Default Support Image
            caption: caption,
            parse_mode: 'HTML'  // Use HTML to avoid markdown issues
        };

        if (currentMsg && currentMsg.fileId) {
            // Use HTML parse mode to avoid markdown issues
            if (currentMsg.type === 'photo') {
                mediaObj = { 
                    type: 'photo', 
                    media: currentMsg.fileId, 
                    caption: caption,
                    parse_mode: 'HTML'
                };
            } else if (currentMsg.type === 'video') {
                mediaObj = { 
                    type: 'video', 
                    media: currentMsg.fileId, 
                    caption: caption,
                    parse_mode: 'HTML'
                };
            } else if (currentMsg.type === 'document') {
                mediaObj = { 
                    type: 'document', 
                    media: currentMsg.fileId, 
                    caption: caption,
                    parse_mode: 'HTML'
                };
            }
        }

        // Navigation Buttons
        const navButtons = [];
        if (msgIndex > 0) {
            navButtons.push({ text: "⬅️ Prev", callback_data: `admin_view_ticket_${userId}_${msgIndex - 1}` });
        }
        if (msgIndex < totalMessages - 1) {
            navButtons.push({ text: "Next ➡️", callback_data: `admin_view_ticket_${userId}_${msgIndex + 1}` });
        }

        const keyboardRows = [];
        
        // Add navigation row if there are buttons
        if (navButtons.length > 0) {
            keyboardRows.push(navButtons);
        }
        
        // Action buttons row
        keyboardRows.push([
            { text: "✏️ Reply", callback_data: `admin_reply_ticket_${userId}` },
            { text: "❌ Close Ticket", callback_data: `admin_close_ticket_${userId}` }
        ]);
        
        // Back button row
        keyboardRows.push([
            { text: "⬅️ Back to Tickets", callback_data: "admin_view_tickets" }
        ]);

        // Try to edit the message
        await ctx.editMessageMedia(mediaObj, {
            reply_markup: {
                inline_keyboard: keyboardRows
            }
        });
        
    } catch (error) {
        console.error("Error in admin_view_ticket handler:", error);
        await ctx.answerCbQuery("❌ Error loading ticket. Please try again.", { show_alert: true });
        
        // Fallback: Show simple message
        await ctx.editMessageCaption(
            `⚠️ Ticket Error\n\nCould not load ticket for user ID: ${userId}\n\nError: ${error.message}`,
            {
                parse_mode: "HTML",
                reply_markup: {
                    inline_keyboard: [
                        [{ text: "⬅️ Back to Tickets", callback_data: "admin_view_tickets" }]
                    ]
                }
            }
        );
    }
});

// Ticket Reply Action
bot.action(/^admin_reply_ticket_(\d+)$/, async (ctx) => {
  if (ctx.from.id !== ADMIN_ID) return;
  const uid = ctx.match[1];
  adminReplyTarget.set(ctx.from.id, parseInt(uid));
  
  await ctx.reply(`✍️ TYPE YOUR REPLY FOR USER ID: ${uid}\n\nSend your message now:`, {
    parse_mode: "Markdown",
    reply_markup: { force_reply: true }
  });
});

// General Message Reply
bot.action(/^admin_reply_(\d+)$/, async (ctx) => {
  if (ctx.from.id !== ADMIN_ID) return;
  const uid = ctx.match[1];
  adminReplyTarget.set(ctx.from.id, parseInt(uid));
  
  await ctx.reply(`✍️ TYPE YOUR REPLY FOR USER ID: ${uid}\n\nSend your message now:`, {
    parse_mode: "Markdown",
    reply_markup: { force_reply: true }
  });
});

// Close Ticket Action - UPDATED
bot.action(/^admin_close_ticket_(\d+)$/, async (ctx) => {
  if (ctx.from.id !== ADMIN_ID) return;
  const uid = ctx.match[1];
  
  // Remove from Firebase
  await removeTicket(parseInt(uid));

  // Notify User in their language
  try {
    const targetUser = await getUserData(parseInt(uid));  // ✅ Await added
    const langCode = targetUser?.lang || 'en';
    const langData = languageTexts[langCode] || languageTexts['en'];
    const closeMessage = langData.ticketClosedByAdmin || 
      "🚫 *Your Ticket Closed By Support Team*\n\n_If you have more queries, you can open a new ticket from the menu._";
    
    await ctx.telegram.sendMessage(
      uid,
      closeMessage,
      { parse_mode: "Markdown" }
    );
  } catch (error) {
    console.log("User notification failed:", error);
  }

  await ctx.answerCbQuery("✅ Ticket Closed");
  await ctx.reply(
    `✅ *TICKET CLOSED SUCCESSFULLY*\n\nUser ID: ${uid}`,
    { parse_mode: "Markdown" }
  );
});

// User List with Pagination
const USERS_PER_PAGE = 10;

bot.action(/^admin_user_list_(\d+)$/, async (ctx) => {
  if (ctx.from.id !== ADMIN_ID) return;
  const page = parseInt(ctx.match[1]) - 1;
  
  // Get users from Firebase
  const allUsers = await getAllUsersFromFirebase();
  const users = Object.values(allUsers);

  if (users.length === 0) {
    await ctx.editMessageCaption("👥 No users found.", {
      reply_markup: {
        inline_keyboard: [[{ text: "⬅️ Back", callback_data: "ADMIN_PANEL" }]]
      }
    });
    return;
  }

  const USERS_PER_PAGE = 10;
  const start = page * USERS_PER_PAGE;
  const end = start + USERS_PER_PAGE;
  const pageUsers = users.slice(start, end);
  const totalPages = Math.ceil(users.length / USERS_PER_PAGE);

  let caption = `📋 *USER LIST*\n\n`;
  caption += `📄 *Page ${page + 1} of ${totalPages}*\n`;
  caption += `📊 *Total Users:* ${users.length}\n\n`;

  const buttons = [];

  // Add user list with proper numbering
  pageUsers.forEach((u, index) => {
    const userNumber = start + index + 1;
    buttons.push([
      {
        text: `${userNumber}. ${u.firstName || 'User'} (ID: ${u.id})`,
        callback_data: `admin_view_user_${u.id}`
      }
    ]);
  });

  // Navigation buttons
  const nav = [];
  if (page > 0) {
    nav.push({ text: "⬅️ Prev", callback_data: `admin_user_list_${page}` });
  }
  if (end < users.length) {
    nav.push({ text: "Next ➡️", callback_data: `admin_user_list_${page + 2}` });
  }

  if (nav.length > 0) {
    buttons.push(nav);
  }

  buttons.push([{ text: "⬅️ Back", callback_data: "ADMIN_PANEL" }]);

  await ctx.editMessageCaption(caption, {
    parse_mode: "Markdown",
    reply_markup: { inline_keyboard: buttons }
  });
});

bot.action(/^admin_view_user_(\d+)$/, async (ctx) => {
  if (ctx.from.id !== ADMIN_ID) return;
  const userId = ctx.match[1];
  
  try {
    // ✅ Await add karein
    const user = await getUserData(parseInt(userId));
    
    if (!user) {
      await ctx.answerCbQuery("❌ User not found in database", { show_alert: true });
      return;
    }
    
    // ✅ User activity check based on last seen
    const lastSeenDate = user.lastSeen ? new Date(user.lastSeen) : new Date();
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    
    // Auto-inactive if user hasn't been seen for 1 week
    const isRecentlyActive = lastSeenDate >= oneWeekAgo;
    const displayStatus = user.active && isRecentlyActive ? 
      "✅ ACTIVE" : "❌ INACTIVE";
    
    // ✅ Proper name formatting
    const fullName = [user.firstName, user.lastName]
      .filter(Boolean)
      .join(' ')
      .trim() || `User ${userId}`;
    
    // ✅ Username formatting - WITHOUT ESCAPE MARKDOWN (Keep underscores)
    const rawUsername = user.username || '';
    // DIRECTLY use raw username without any processing
    const usernameDisplay = rawUsername ? `@${rawUsername}` : 'No username';
    
    // ✅ Language formatting
    const language = user.langName || user.lang || 'Not Set';
    
    // ✅ Date formatting for joined and last seen
    const formatDate = (dateString) => {
      if (!dateString) return 'N/A';
      try {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-IN', {
          day: '2-digit',
          month: 'short',
          year: 'numeric'
        });
      } catch {
        return 'N/A';
      }
    };
    
    // ✅ Professional caption
    const caption = `👤 *USER DETAILS*\n\n` +
      `👤 *Name:* ${fullName}\n` +
      `🆔 *ID:* \`${userId}\`\n` +
      `👤 *Username:* ${usernameDisplay}\n` +
      `📊 *Status:* ${displayStatus}\n` +
      `🌐 *Language:* ${language}\n` +
      `📅 *Joined:* ${formatDate(user.joinedAt)}\n` +
      `👀 *Last Seen:* ${formatDate(user.lastSeen)}\n\n` +
      `_Status automatically updates based on activity._`;
    
    // ✅ Buttons array
    const buttons = [
      [
        { 
          text: "✏️ Send Message", 
          callback_data: `admin_reply_${userId}` 
        },
        { 
          text: "👁️ View Profile", 
          url: rawUsername ? `https://t.me/${rawUsername}` : `tg://user?id=${userId}` 
        }
      ],
      [
        { 
          text: user.active ? "❌ Deactivate" : "✅ Activate", 
          callback_data: `admin_toggle_user_${userId}` 
        }
      ],
      [
        { 
          text: "⬅️ Back to List", 
          callback_data: `admin_user_list_1` 
        }
      ]
    ];
    
    // ✅ Try to get profile photo
    try {
      const photos = await ctx.telegram.getUserProfilePhotos(userId, 0, 1);
      
      if (photos.total_count > 0) {
        const photo = photos.photos[0][0];
        await ctx.editMessageMedia({
          type: "photo",
          media: photo.file_id,
          caption: caption,
          parse_mode: "Markdown"
        }, {
          reply_markup: { inline_keyboard: buttons }
        });
      } else {
        // Use default image if no profile photo
        await ctx.editMessageMedia({
          type: "photo",
          media: IMAGES.USER_LIST,
          caption: caption,
          parse_mode: "Markdown"
        }, {
          reply_markup: { inline_keyboard: buttons }
        });
      }
    } catch (photoError) {
      console.error("Error fetching profile photo:", photoError);
      // Fallback to default image
      await ctx.editMessageMedia({
        type: "photo",
        media: IMAGES.USER_LIST,
        caption: caption,
        parse_mode: "Markdown"
      }, {
        reply_markup: { inline_keyboard: buttons }
      });
    }
    
  } catch (error) {
    console.error("Error in admin_view_user:", error);
    await ctx.answerCbQuery("❌ Error loading user details", { show_alert: true });
    
    // Fallback to simple view
    await ctx.editMessageCaption(
      `⚠️ *USER DETAILS*\n\n` +
      `Error loading details for user ID: ${userId}\n\n` +
      `Please try again or check user ID.`,
      {
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [
            [{ text: "⬅️ Back to List", callback_data: `admin_user_list_1` }]
          ]
        }
      }
    );
  }
});

// Toggle user active status
bot.action(/^admin_toggle_user_(\d+)$/, async (ctx) => {
  if (ctx.from.id !== ADMIN_ID) return;
  const userId = ctx.match[1];
  
  try {
    // ✅ Await add karein
    const user = await getUserData(parseInt(userId));
    
    if (!user) {
      await ctx.answerCbQuery("❌ User not found", { show_alert: true });
      return;
    }
    
    // Toggle user active status
    const newActiveStatus = !user.active;
    
    // ✅ Update user data in Firebase and memory
    await updateUserData(parseInt(userId), {
      active: newActiveStatus,
      lastSeen: new Date().toISOString()
    });
    
    // ✅ Send notification to user if activated
    if (newActiveStatus) {
      try {
        const userLang = user.lang || 'en';
        const langData = languageTexts[userLang] || languageTexts['en'];
        
        // ✅ Get user's full name for personalization
        const userName = [user.firstName, user.lastName]
          .filter(Boolean)
          .join(' ')
          .trim();
        
        // ✅ Personalized activation message
        let activationMsg;
        if (userName) {
          activationMsg = `*Hey! 👋 ${userName}*\n\n` +
                         `*Do you want to make from $1200 a day?* ✅\n\n` +
                         `⭐️Activate the bot now! 35 spots left for today!\n\n🚀*Activate the bot* 👉 /start.`;
        } else {
          activationMsg = langData.adminActivated || 
            "*Do you want to make from $1200 a day?* ✅\n\n⭐️Activate the bot now! 35 spots left for today!\n\n🚀*Activate the bot* 👉 /start.";
        }
        
        await ctx.telegram.sendMessage(
          parseInt(userId),
          activationMsg,
          { parse_mode: "Markdown" }
        );
      } catch (notifyError) {
        console.log("User notification failed:", notifyError);
      }
    }
    
    await ctx.answerCbQuery(`✅ User ${newActiveStatus ? 'activated' : 'deactivated'}`);
    
    // Refresh the user view
    await bot.action(`admin_view_user_${userId}`)(ctx);
    
  } catch (error) {
    console.error("Error toggling user status:", error);
    await ctx.answerCbQuery("❌ Failed to update user status", { show_alert: true });
  }
});

// Admin Search User - UPDATED WITH PERSISTENT MODE
bot.action('admin_search_user', async (ctx) => {
  if (ctx.from.id !== ADMIN_ID) return;
  
  // ✅ SET SEARCH MODE FLAG (PERSISTENT)
  adminSearchMode.set(ctx.from.id, true);
  
  await ctx.editMessageCaption(
    "🔍 *SEARCH MODE ACTIVATED*\n\nYou can now search multiple users.\n\nSend:\n• User ID\n• OR Username (with or without @)\n\nType /cancel to exit search mode.",
    {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [{ text: "❌ Exit Search Mode", callback_data: "admin_cancel_search" }],
          [{ text: "⬅️ Back to Admin Panel", callback_data: "ADMIN_PANEL" }]
        ]
      }
    }
  );
});

// ✅✅✅ NEW: Continue Search (Stay in Search Mode)
bot.action('admin_search_continue', async (ctx) => {
  if (ctx.from.id !== ADMIN_ID) return;
  
  // Already in search mode, just show message
  await ctx.answerCbQuery('🔍 You can search another user now.');
  
  await ctx.editMessageCaption(
    "🔍 *SEARCH MODE ACTIVE*\n\nYou can search another user.\n\nSend:\n• User ID\n• OR Username (with or without @)\n\nType /cancel to exit search mode.",
    {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [{ text: "❌ Exit Search Mode", callback_data: "admin_cancel_search" }],
          [{ text: "⬅️ Back to Admin Panel", callback_data: "ADMIN_PANEL" }]
        ]
      }
    }
  );
});

// ==================== BROADCAST FUNCTIONALITY ====================

// Broadcast Action - UPDATED WITH PERSISTENT MODE
bot.action('admin_broadcast', async (ctx) => {
  if (ctx.from.id !== ADMIN_ID) return;
  
  adminBroadcastMode.set(ctx.from.id, true);
  
  await ctx.editMessageMedia(
    {
      type: 'photo',
      media: IMAGES.BROADCAST,
      caption: '📢 *BROADCAST MODE ACTIVATED*\n\nYou can now send multiple broadcast messages.\n\nYou can send:\n• Text (with Markdown/HTML formatting)\n• Photo with caption\n• Video with caption\n\nType /cancel to exit broadcast mode.',
      parse_mode: 'Markdown'
    },
    {
      reply_markup: {
        inline_keyboard: [
          [{ text: '❌ Exit Broadcast Mode', callback_data: 'admin_cancel_broadcast' }],
          [{ text: '⬅️ Back to Admin Panel', callback_data: 'ADMIN_PANEL' }]
        ]
      }
    }
  );
});

// Cancel Broadcast
bot.action('admin_cancel_broadcast', async (ctx) => {
  if (ctx.from.id !== ADMIN_ID) return;
  
  adminBroadcastMode.delete(ctx.from.id);
  await ctx.answerCbQuery('Broadcast cancelled');
  
  // Go back to admin panel
  const users = Array.from(userStorage.values());
  const activeTickets = Array.from(supportTickets.keys()).length;
  
  const caption = `🛡️ *ADMIN CONTROL PANEL*\n\n` +
    `👥 Total Users: ${users.length}\n` +
    `📞 Active Tickets: ${activeTickets}\n` +
    `🌐 Languages: ${new Set(users.map(u => u.lang)).size}`;
  
  await ctx.editMessageMedia(
    {
      type: 'photo',
      media: IMAGES.ADMIN_PANEL,
      caption: caption,
      parse_mode: 'Markdown'
    },
    {
      reply_markup: {
        inline_keyboard: [
          [
            { text: '📞 View Tickets', callback_data: 'admin_view_tickets' },
            { text: '👥 User List', callback_data: 'admin_user_list_1' }
          ],
          [
            { text: '📢 Broadcast', callback_data: 'admin_broadcast' },
            { text: '🔍 Search User', callback_data: 'admin_search_user' }
          ],
          [
            { text: '🔄 Refresh', callback_data: 'admin_refresh' }
          ],
          [
            { text: '🔙 Back', callback_data: 'admin_back_to_registration' }
          ]
        ]
      }
    }
  );
});

// ✅✅✅ NEW: Continue Broadcast (Stay in Broadcast Mode)
bot.action('admin_continue_broadcast', async (ctx) => {
  if (ctx.from.id !== ADMIN_ID) return;
  
  // Already in broadcast mode, just show message
  await ctx.answerCbQuery('📝 You can send another broadcast message now.');
  
  await ctx.editMessageCaption(
    '📢 *BROADCAST MODE ACTIVE*\n\nYou can send another message to broadcast.\n\nYou can send:\n• Text\n• Photo with caption\n• Video with caption\n\nType /cancel to exit broadcast mode.',
    {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '❌ Exit Broadcast Mode', callback_data: 'admin_cancel_broadcast' }],
          [{ text: '⬅️ Back to Admin Panel', callback_data: 'ADMIN_PANEL' }]
        ]
      }
    }
  );
});

// Cancel Search Action
bot.action('admin_cancel_search', async (ctx) => {
  if (ctx.from.id !== ADMIN_ID) return;
  
  adminSearchMode.delete(ctx.from.id);
  await ctx.answerCbQuery('✅ Search cancelled');
  
  // Go back to admin panel
  const stats = await getUserStatsFromFirebase();
  const allTickets = await getAllTicketsFromFirebase();
  const activeTickets = Object.keys(allTickets).length;
  const allUsers = await getAllUsersFromFirebase();
  const uniqueLangs = new Set(Object.values(allUsers).map(u => u.langName || u.lang));
  
  const caption = `🛡️ *ADMIN CONTROL PANEL*\n\n` +
                 `👥 Total Users: ${stats.total}\n` +
                 `📞 Active Tickets: ${activeTickets}\n` +
                 `🌐 Languages: ${uniqueLangs.size}`;

  await ctx.editMessageMedia(
    {
      type: 'photo',
      media: IMAGES.ADMIN_PANEL,
      caption: caption,
      parse_mode: 'Markdown'
    },
    {
      reply_markup: {
        inline_keyboard: [
          [
            { text: '📞 View Tickets', callback_data: 'admin_view_tickets' },
            { text: '👥 User List', callback_data: 'admin_user_list_1' }
          ],
          [
            { text: '📢 Broadcast', callback_data: 'admin_broadcast' },
            { text: '🔍 Search User', callback_data: 'admin_search_user' }
          ],
          [
            { text: '🔄 Refresh', callback_data: 'admin_refresh' }
          ],
          [
            { text: '🔙 Back', callback_data: 'admin_back_to_registration' }
          ]
        ]
      }
    }
  );
});

// Admin Refresh
bot.action('admin_refresh', async (ctx) => {
  if (ctx.from.id !== ADMIN_ID) return;
  
  const users = Array.from(userStorage.values());
  const activeTickets = Array.from(supportTickets.keys()).length;
  
  const caption = `🛡️ *ADMIN CONTROL PANEL - REFRESHED*\n\n` +
    `👥 Total Users: ${users.length}\n` +
    `📞 Active Tickets: ${activeTickets}\n` +
    `🌐 Languages: ${new Set(users.map(u => u.lang)).size}`;
  
  await ctx.editMessageCaption(caption, { parse_mode: "Markdown" });
  await ctx.answerCbQuery('✅ Panel refreshed');
});

// Back to Registration from Admin Panel
bot.action('admin_back_to_registration', async (ctx) => {
  const userId = ctx.from.id;
  const user = getUserData(userId);
  const langCode = user.lang || 'en';
  const langData = languageTexts[langCode] || languageTexts['en'];
  const currency = currencyData[langCode] || currencyData['en'];
  
  const registrationText = langData.registration.success
    .replace('₹1000', `${currency.symbol}${currency.amount}`);
  
  const registrationButtons = [
    [
      { text: langData.registration.buttonRegister, url: 'https://1win.com' }
    ],
    [
      { text: langData.instruction.button || "📲 INSTRUCTIONS", callback_data: 'show_instructions' },
      { text: langData.registration.buttonSignal, url: 'https://nexusplay.shop' }
    ],
    [
      { text: langData.registration.buttonChange, callback_data: 'change_language' }
    ]
  ];
  
  if (userId === ADMIN_ID) {
    registrationButtons.push([
      { text: "🛡️ ADMIN PANEL", callback_data: "ADMIN_PANEL" }
    ]);
  }
  
  await ctx.editMessageMedia(
    {
      type: 'photo',
      media: IMAGES.REGISTRATION,
      caption: registrationText,
      parse_mode: 'Markdown'
    },
    {
      reply_markup: {
        inline_keyboard: registrationButtons
      }
    }
  );
});

// ==================== MESSAGE HANDLER ====================

bot.on('message', async (ctx) => {
  const userId = ctx.from.id;
  const message = ctx.message;
  
  // Handle admin commands
  if (message.text && message.text.startsWith('/')) {
  if (message.text === '/cancel' && userId === ADMIN_ID) {
    if (adminBroadcastMode.has(userId)) {
      adminBroadcastMode.delete(userId);
      await ctx.reply('✅ Broadcast cancelled.');
      return;
    }
    if (adminReplyTarget.has(userId)) {
      adminReplyTarget.delete(userId);
      await ctx.reply('✅ Reply cancelled.');
      return;
    }
    if (adminSearchMode.has(userId)) {
      adminSearchMode.delete(userId);
      await ctx.reply('✅ Search cancelled.');
      return;
    }
  }
}
  
  // Admin broadcast message - FIXED VERSION WITH MARKDOWN/HTML SUPPORT
if (userId === ADMIN_ID && adminBroadcastMode.has(userId)) {
  const allUsers = Array.from(userStorage.keys()).filter(id => id !== ADMIN_ID);
  let sent = 0;
  let failed = 0;
  
  const progressMsg = await ctx.reply(`⏳ Broadcasting to ${allUsers.length} users...`);
  
  const CHUNK_SIZE = 30;
  
  for (let chunkIndex = 0; chunkIndex < allUsers.length; chunkIndex += CHUNK_SIZE) {
    const chunk = allUsers.slice(chunkIndex, chunkIndex + CHUNK_SIZE);
    
    // ✅ PROGRESS UPDATE
    try {
      await ctx.telegram.editMessageText(
        ctx.chat.id,
        progressMsg.message_id,
        null,
        `⏳ Broadcasting...\n📊 Progress: ${Math.min(chunkIndex + CHUNK_SIZE, allUsers.length)}/${allUsers.length} users\n✅ Sent: ${sent}\n❌ Failed: ${failed}`,
        { parse_mode: 'Markdown' }
      );
    } catch (progressError) {
      console.log("Progress update failed, continuing...");
    }
    
    // Process current chunk
    for (const targetUserId of chunk) {
      try {
        // Check if user is active
        const user = await getUserData(targetUserId);
        if (!user || !user.active) {
          failed++;
          continue;
        }
        
        // ✅✅✅ FIXED: DETECT MARKDOWN/HTML AND USE CORRECT PARSE MODE
        const detectParseMode = () => {
          const text = message.text || message.caption || '';
          // Check for HTML tags
          if (/<[a-z][\s\S]*>/i.test(text)) {
            return 'HTML';
          }
          // Check for Markdown
          if (/[_*[\]()~`>#+=|{}.!-]/.test(text)) {
            return 'Markdown';
          }
          return undefined;
        };
        
        const parseMode = detectParseMode();
        
        // Handle ALL MEDIA TYPES with proper formatting
        if (message.text) {
          await ctx.telegram.sendMessage(targetUserId, message.text, {
            parse_mode: parseMode || 'Markdown'
          });
        } else if (message.photo) {
          const photo = message.photo[message.photo.length - 1];
          await ctx.telegram.sendPhoto(targetUserId, photo.file_id, {
            caption: message.caption || '',
            parse_mode: message.caption ? (parseMode || 'Markdown') : undefined
          });
        } else if (message.video) {
          await ctx.telegram.sendVideo(targetUserId, message.video.file_id, {
            caption: message.caption || '',
            parse_mode: message.caption ? (parseMode || 'Markdown') : undefined
          });
        } else if (message.document) {
          await ctx.telegram.sendDocument(targetUserId, message.document.file_id, {
            caption: message.caption || '',
            parse_mode: message.caption ? (parseMode || 'Markdown') : undefined
          });
        } else if (message.animation) {
          await ctx.telegram.sendAnimation(targetUserId, message.animation.file_id, {
            caption: message.caption || '',
            parse_mode: message.caption ? (parseMode || 'Markdown') : undefined
          });
        } else if (message.voice) {
          await ctx.telegram.sendVoice(targetUserId, message.voice.file_id, {
            caption: message.caption || '',
            parse_mode: message.caption ? (parseMode || 'Markdown') : undefined
          });
        } else if (message.audio) {
          await ctx.telegram.sendAudio(targetUserId, message.audio.file_id, {
            caption: message.caption || '',
            parse_mode: message.caption ? (parseMode || 'Markdown') : undefined,
            title: message.audio.title || '',
            performer: message.audio.performer || ''
          });
        } else if (message.sticker) {
          await ctx.telegram.sendSticker(targetUserId, message.sticker.file_id);
        } else if (message.video_note) {
          await ctx.telegram.sendVideoNote(targetUserId, message.video_note.file_id);
        } else {
          // Fallback: Forward the original message
          await ctx.forwardMessage(targetUserId, ctx.chat.id, message.message_id);
        }
        
        sent++;
        
        // Small delay to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 50));
        
      } catch (error) {
        failed++;
        console.error(`Failed to send to user ${targetUserId}:`, error.message);
        // Mark user as inactive if blocked
        if (error.description?.includes('blocked') || error.code === 403) {
          const user = await getUserData(targetUserId);
          if (user) {
            await updateUserData(targetUserId, { active: false });
          }
        }
      }
    }
    
    // ✅ CHUNK COMPLETE PAUSE
    if (chunkIndex + CHUNK_SIZE < allUsers.length) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  
  // ✅✅✅ FIXED: DON'T DELETE BROADCAST MODE - ADMIN CAN SEND MORE MESSAGES
  const successRate = allUsers.length > 0 ? Math.round((sent / allUsers.length) * 100) : 0;
  
  await ctx.telegram.editMessageText(
    ctx.chat.id,
    progressMsg.message_id,
    null,
    `✅ *Broadcast Complete*\n\n📊 Total Users: ${allUsers.length}\n📨 Sent: ${sent} users\n❌ Failed: ${failed} users\n🎯 Success Rate: ${successRate}%\n\n📝 *You can send another broadcast message now.*`,
    { parse_mode: 'Markdown' }
  );
  
  return;
}
  
  // Admin reply to user - FIXED WITH AWAIT
if (userId === ADMIN_ID && adminReplyTarget.has(userId)) {
  const targetUserId = adminReplyTarget.get(userId);
  
  try {
    // Check if target user exists - ✅ AWAIT ADDED
    const targetUser = await getUserData(targetUserId);
    if (!targetUser) {
      await ctx.reply(`❌ User ${targetUserId} not found in database.`);
      adminReplyTarget.delete(userId);
      return;
    }
    
    // Send message to user
    if (message.text) {
      await ctx.telegram.sendMessage(targetUserId, `📨 *Message from Support:*\n\n${message.text}`, {
        parse_mode: 'Markdown'
      });
    } else if (message.photo) {
      const photo = message.photo[message.photo.length - 1];
      await ctx.telegram.sendPhoto(targetUserId, photo.file_id, {
        caption: message.caption ? `📨 *Message from Support:*\n\n${message.caption}` : '📨 *Message from Support*',
        parse_mode: 'Markdown'
      });
    } else if (message.video) {
      await ctx.telegram.sendVideo(targetUserId, message.video.file_id, {
        caption: message.caption ? `📨 *Message from Support:*\n\n${message.caption}` : '📨 *Message from Support*',
        parse_mode: 'Markdown'
      });
    } else if (message.document) {
      await ctx.telegram.sendDocument(targetUserId, message.document.file_id, {
        caption: message.caption ? `📨 *Message from Support:*\n\n${message.caption}` : '📨 *Message from Support*',
        parse_mode: 'Markdown'
      });
    } else if (message.animation) {
      await ctx.telegram.sendAnimation(targetUserId, message.animation.file_id, {
        caption: message.caption ? `📨 *Message from Support:*\n\n${message.caption}` : '📨 *Message from Support*',
        parse_mode: 'Markdown'
      });
    } else if (message.voice) {
      await ctx.telegram.sendVoice(targetUserId, message.voice.file_id, {
        caption: `📨 *Message from Support:*`,
        parse_mode: 'Markdown'
      });
    } else if (message.audio) {
      await ctx.telegram.sendAudio(targetUserId, message.audio.file_id, {
        caption: message.caption ? `📨 *Message from Support:*\n\n${message.caption}` : '📨 *Message from Support*',
        parse_mode: 'Markdown'
      });
    } else if (message.sticker) {
      await ctx.telegram.sendSticker(targetUserId, message.sticker.file_id);
    }
    
    await ctx.reply(`✅ Message sent to user ${targetUserId}`);
    adminReplyTarget.delete(userId);
  } catch (error) {
    await ctx.reply(`❌ Failed to send message: ${error.message}`);
  }
  return;
}
  
  // User support message - 100% DELIVERY GUARANTEE LOGIC
  if (supportTickets.has(userId)) {
      const user = await getUserData(userId); 
      const username = user.username ? `@${user.username}` : 'N/A';
      const msgTime = new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' });
      
      // 1. Prepare Message Data for Storage
      let messageData = {
          type: 'text',
          text: message.text || '',
          fileId: null,
          caption: message.caption || ''
      };

      let fileId = null;
      let msgType = 'text';

      if (message.photo) {
          fileId = message.photo[message.photo.length - 1].file_id;
          msgType = 'photo';
      } else if (message.video) {
          fileId = message.video.file_id;
          msgType = 'video';
      } else if (message.document) {
          fileId = message.document.file_id;
          msgType = 'document';
      } else if (message.voice) {
          fileId = message.voice.file_id;
          msgType = 'voice';
      } else if (message.audio) {
          fileId = message.audio.file_id;
          msgType = 'audio';
      } else if (message.sticker) {
           fileId = message.sticker.file_id;
           msgType = 'sticker';
      }

      if (fileId) {
          messageData.type = msgType;
          messageData.fileId = fileId;
      }

      // 2. SAVE TO FIREBASE
      try {
          await addMessageToTicket(userId, messageData);
      } catch (dbError) {
          console.error("Firebase Save Error:", dbError);
      }

      // 3. PREPARE ADMIN NOTIFICATION
      // HTML Escape Function to prevent crashes
      const escapeHtml = (unsafe) => {
          if (!unsafe) return '';
          return unsafe
              .replace(/&/g, "&amp;")
              .replace(/</g, "&lt;")
              .replace(/>/g, "&gt;")
              .replace(/"/g, "&quot;")
              .replace(/'/g, "&#039;");
      }

      const safeName = escapeHtml(user.firstName + ' ' + (user.lastName || ''));
      const safeCaption = escapeHtml(message.caption || message.text || '');
      
      const adminNotification = `📩 <b>NEW SUPPORT MESSAGE</b>\n\n` +
          `👤 <b>From:</b> ${safeName}\n` +
          `🆔 <b>ID:</b> <code>${userId}</code>\n` +
          `👤 <b>Username:</b> ${username}\n` +
          `⏰ <b>Time:</b> ${msgTime}\n` +
          `🌐 <b>Language:</b> ${user.langName || user.lang}\n\n` +
          `📨 <b>Message:</b> ${safeCaption ? safeCaption : '<i>(Media File)</i>'}`;

      const adminKeyboard = {
          inline_keyboard: [
              [
                  { text: '👁️ View History', callback_data: `admin_view_ticket_${userId}` }
              ],
              [
                  { text: '✍️ Reply', callback_data: `admin_reply_ticket_${userId}` },
                  { text: '❌ Close', callback_data: `admin_close_ticket_${userId}` }
              ]
          ]
      };

      // 4. SEND TO ADMIN (With Fallback)
      try {
          // Attempt 1: Send Professional Formatted Message
          if (msgType === 'text') {
              await ctx.telegram.sendMessage(ADMIN_ID, adminNotification, {
                  parse_mode: 'HTML',
                  reply_markup: adminKeyboard
              });
          } else if (msgType === 'sticker') {
               // Stickers cannot have captions, so send separately
               await ctx.telegram.sendSticker(ADMIN_ID, fileId);
               await ctx.telegram.sendMessage(ADMIN_ID, adminNotification, {
                  parse_mode: 'HTML',
                  reply_markup: adminKeyboard
              });
          } else if (['photo', 'video', 'document', 'audio', 'voice'].includes(msgType)) {
              // Generic method for media
              const method = `send${msgType.charAt(0).toUpperCase() + msgType.slice(1)}`;
              await ctx.telegram[method](ADMIN_ID, fileId, {
                  caption: adminNotification,
                  parse_mode: 'HTML',
                  reply_markup: adminKeyboard
              });
          } else {
              // Fallback for unknown types
              await ctx.forwardMessage(ADMIN_ID, ctx.chat.id, message.message_id);
              await ctx.telegram.sendMessage(ADMIN_ID, adminNotification, {
                  parse_mode: 'HTML',
                  reply_markup: adminKeyboard
              });
          }

      } catch (adminErr) {
          console.error("Format send failed, using fallback:", adminErr.message);
          
          // Attempt 2 (Fail-Safe): FORWARD ORIGINAL + PLAIN TEXT BUTTONS
          // Ye tab chalega agar upar wala 'HTML' parse fail ho gaya
          try {
              // 1. Forward original message (100% guarantee to show content)
              await ctx.forwardMessage(ADMIN_ID, ctx.chat.id, message.message_id);
              
              // 2. Send Controls below it
              await ctx.telegram.sendMessage(ADMIN_ID, 
                  `⚠️ <b>Format Error</b> - Above message from:\n` +
                  `👤 ${safeName} (ID: <code>${userId}</code>)\n` +
                  `👇 Use buttons to reply:`, 
                  {
                      parse_mode: 'HTML',
                      reply_markup: adminKeyboard
                  }
              );
          } catch (finalErr) {
              console.error("CRITICAL: Could not notify admin at all.", finalErr);
              // Agar ye bhi fail hua, to hi user ko error dikhega
              await ctx.reply("❌ Server error. Please try sending text only.");
              return;
          }
      }

      // 5. SUCCESS CONFIRMATION TO USER
      try {
          const langCode = user?.lang || 'en';
          const langData = languageTexts[langCode] || languageTexts['en'];
          const confirmationMsg = langData.supportConfirmation || "✅ Your message has been sent to support team.";
          
          await ctx.reply(confirmationMsg);
      } catch (replyErr) {
          console.error('Error sending confirmation to user:', replyErr);
      }
      return;
  }
  
    // Admin search user - IMPROVED VERSION (ONLY WHEN IN SEARCH MODE)
if (userId === ADMIN_ID && adminSearchMode.has(userId) && message.text && !message.text.startsWith('/')) {
    // Check if it's a search query
    const query = message.text.trim();
    let foundUser = null;
    
    try {
      // Search by user ID (numeric)
      if (query.match(/^\d+$/)) {
        const targetUserId = parseInt(query);
        // ✅ Await add karein
        foundUser = await getUserData(targetUserId);
      } 
        // Search by username (with or without @) - WITH PARTIAL MATCH
        const searchUsername = query.replace(/^@/, '').toLowerCase();
        const allUsers = await getAllUsersFromFirebase();
        const matchingUsers = [];
        
        // Loop through all users to find by username
        for (const [uid, user] of Object.entries(allUsers)) {
          if (user.username && user.username.toLowerCase().includes(searchUsername)) {
            matchingUsers.push(user);
          }
        }
        
        if (matchingUsers.length === 1) {
          foundUser = matchingUsers[0];
        } else if (matchingUsers.length > 1) {
          // Multiple users found - show list
          let response = `🔍 *MULTIPLE USERS FOUND*\n\nFound ${matchingUsers.length} users matching "${searchUsername}":\n\n`;
          
          matchingUsers.slice(0, 10).forEach((user, index) => {
            const name = [user.firstName, user.lastName].filter(Boolean).join(' ') || `User ${user.id}`;
            response += `${index + 1}. ${name} (@${user.username || 'no-username'}) - ID: ${user.id}\n`;
          });
          
          if (matchingUsers.length > 10) {
            response += `\n... and ${matchingUsers.length - 10} more users.`;
          }
          
          response += `\n\nPlease use User ID for exact search.`;
          
          await ctx.reply(response, { parse_mode: 'Markdown' });
          return;
        }
      
      if (foundUser) {
        // ✅ User activity check based on last seen
        const lastSeenDate = foundUser.lastSeen ? new Date(foundUser.lastSeen) : new Date();
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        
        // Auto-inactive if user hasn't been seen for 1 week
        const isRecentlyActive = lastSeenDate >= oneWeekAgo;
        const displayStatus = foundUser.active && isRecentlyActive ? 
          "✅ Active" : "❌ Inactive";
        
        // ✅ Proper name formatting
        const fullName = [foundUser.firstName, foundUser.lastName]
          .filter(Boolean)
          .join(' ')
          .trim() || `User ${foundUser.id}`;
        
        // ✅ Username formatting
        const username = foundUser.username ? `@${foundUser.username}` : 'No Username';
        
        // ✅ Language formatting
        const language = foundUser.langName || foundUser.lang || 'Not Set';
        
        // ✅ Date formatting for first start
        const formatDateTime = (dateString) => {
          if (!dateString) return 'N/A';
          try {
            const date = new Date(dateString);
            // Format: DD:MM:YYYY : HH:MM:SS (IST)
            const day = date.getDate().toString().padStart(2, '0');
            const month = (date.getMonth() + 1).toString().padStart(2, '0');
            const year = date.getFullYear();
            const hours = date.getHours().toString().padStart(2, '0');
            const minutes = date.getMinutes().toString().padStart(2, '0');
            const seconds = date.getSeconds().toString().padStart(2, '0');
            
            return `${day}:${month}:${year} : ${hours}:${minutes}:${seconds}`;
          } catch {
            return 'N/A';
          }
        };
        
        // ✅ Professional caption
        const caption = `🔍 *USER FOUND*\n\n` +
          `👤 *Name:* ${fullName}\n` +
          `🆔 *ID:* \`${foundUser.id}\`\n` +
          `👤 *Username:* ${username}\n` +
          `⌚ *Joined:* ${formatDateTime(foundUser.joinedAt)}\n` +
          `🌐 *Language:* ${language}\n` +
          `${displayStatus}`;
        
        await ctx.reply(caption, {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [
                { text: '👁️ View Details', callback_data: `admin_view_user_${foundUser.id}` },
                { text: '✏️ Send Message', callback_data: `admin_reply_${foundUser.id}` }
              ]
            ]
          }
        });
            } else {
        await ctx.reply('❌ User not found in database.\n\nPlease check:\n• User ID\n• Username (with or without @)\n\nOr go back to Admin Panel.');
      }
      
      // ✅ PERSISTENT SEARCH MODE - DO NOT DELETE, SHOW CONTINUE OPTION
const searchResultButtons = [
  [
    { text: '👁️ View Details', callback_data: `admin_view_user_${foundUser.id}` },
    { text: '✏️ Send Message', callback_data: `admin_reply_${foundUser.id}` }
  ],
  [
    { text: '🔍 Search Another User', callback_data: 'admin_search_continue' }
  ],
  [
    { text: '⬅️ Back to Admin Panel', callback_data: 'ADMIN_PANEL' }
  ]
];

await ctx.reply(caption, {
  parse_mode: 'Markdown',
  reply_markup: {
    inline_keyboard: searchResultButtons
  }
});
      await ctx.reply('❌ Error searching for user. Please try again.');
    }
    return;
  }
  
  // Default: ignore other messages
});

// ==================== ERROR HANDLING ====================

bot.catch((err, ctx) => {
  console.error(`Error for ${ctx.updateType}:`, err);
  if (ctx.chat) {
    ctx.reply('❌ An error occurred. Please try again.').catch(console.error);
  }
});

// ==================== VERCEL HANDLER ====================

export default async function handler(req, res) {
  try {
    await bot.handleUpdate(req.body);
    res.status(200).send('OK');
  } catch (error) {
    console.error('Error handling update:', error);
    res.status(500).send('Error');
  }
}

// ==================== LOAD DATA ON STARTUP ====================

async function initializeBotData() {
  try {
    // Load all users from Firebase to memory
    const allUsers = await getAllUsersFromFirebase();
    Object.entries(allUsers).forEach(([userId, userData]) => {
      userStorage.set(parseInt(userId), userData);
    });
    console.log(`📥 Loaded ${Object.keys(allUsers).length} users from Firebase`);
    
    // Load tickets from Firebase
    await loadTicketsFromFirebase();
    
  } catch (error) {
    console.error('Error initializing bot data:', error);
  }
}

// Initialize data before starting bot
initializeBotData().then(() => {
  console.log('✅ Bot data initialized from Firebase');
  
  // Development mode - only launch in non-production
  if (process.env.NODE_ENV !== 'production') {
    bot.launch();
    console.log('🤖 Bot is running in development mode');
  }
}).catch(error => {
  console.error('❌ Failed to initialize bot data:', error);
});
