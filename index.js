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

if (!BOT_TOKEN || !ADMIN_ID) throw new Error("BOT_TOKEN or ADMIN_ID missing");

const bot = new Telegraf(BOT_TOKEN);

bot.on("photo", async (ctx) => {
  if (ctx.from.id !== ADMIN_ID) return;
  const photo = ctx.message.photo.pop();
  console.log("PHOTO FILE_ID:", photo.file_id);
  await ctx.reply("Photo Saved ✔️ Check Vercel Logs");
});

bot.on("video", async (ctx) => {
  if (ctx.from.id !== ADMIN_ID) return;
  console.log("VIDEO FILE_ID:", ctx.message.video.file_id);
  await ctx.reply("Video Saved ✔️ Check Vercel Logs");
});

bot.on("animation", async (ctx) => {
  if (ctx.from.id !== ADMIN_ID) return;
  console.log("GIF FILE_ID:", ctx.message.animation.file_id);
  await ctx.reply("GIF Saved ✔️ Check Vercel Logs");
});

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

// User data structure
function getUserData(userId) {
  if (!userStorage.has(userId)) {
    userStorage.set(userId, {
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
    });
  }
  return userStorage.get(userId);
}

// Update user data
function updateUserData(userId, data) {
  const user = getUserData(userId);
  userStorage.set(userId, { ...user, ...data, lastSeen: new Date().toISOString() });
}

// Get user count
function getUserStats() {
  const total = userStorage.size;
  const active = Array.from(userStorage.values()).filter(u => u.active).length;
  const inactive = total - active;
  return { total, active, inactive };
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
  await showLanguageSelection(ctx);
});

// Show language selection
async function showLanguageSelection(ctx) {
  const userId = ctx.from.id;
  const user = getUserData(userId);
  
  // Language buttons (arranged in 2 columns)
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
  
  // Create buttons (2 per row)
  const buttons = [];
  for (let i = 0; i < languages.length; i += 2) {
    const row = [];
    row.push(
      Markup.button.callback(
        `${languages[i].flag} ${languages[i].name}`,
        `set_lang_${languages[i].code}`
      )
    );
    
    if (languages[i + 1]) {
      row.push(
        Markup.button.callback(
          `${languages[i + 1].flag} ${languages[i + 1].name}`,
          `set_lang_${languages[i + 1].code}`
        )
      );
    }
    buttons.push(row);
  }
  
  const caption = "🌐 *Please select your preferred language*\n\n👇 Tap on your language below";
  
  await ctx.replyWithPhoto(
    IMAGES.LANGUAGE_SELECTION,
    {
      caption: caption,
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard(buttons)
    }
  );
}

// Language selection handler
bot.action(/^set_lang_(.+)$/, async (ctx) => {
  const userId = ctx.from.id;
  const langCode = ctx.match[1];
  
  const langData = languageTexts[langCode] || languageTexts['en'];
  const currency = currencyData[langCode] || currencyData['en'];
  
  // Update user language
  updateUserData(userId, {
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
  const user = getUserData(userId);
  const langCode = user.lang;
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
      // Second row - INSTRUCTIONS and GET SIGNAL in same row (INSTRUCTIONS first)
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

    // Ab hum editMessageMedia call karenge aur upar banaya hua variable use karenge
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
  await showLanguageSelection(ctx);
  await ctx.answerCbQuery();
});

// Show Instructions Video Handler
bot.action('show_instructions', async (ctx) => {
  const userId = ctx.from.id;
  const user = getUserData(userId);
  const langCode = user.lang || 'en';
  const langData = languageTexts[langCode] || languageTexts['en'];
  
  // Send instructions video with caption and buttons
  await ctx.editMessageMedia(
    {
      type: 'video',
      media: VIDEOS.INSTRUCTION,
      caption: langData.instruction.caption,
      parse_mode: 'Markdown'
    },
    {
      reply_markup: {
        inline_keyboard: [
          [
            { text: langData.registration.buttonSignal || "📡 GET SIGNAL", url: 'https://nexusplay.shop' }
          ],
          [
            { text: langData.liveSupport.button || "🆘 Live Support", callback_data: 'live_support' }
          ],
          [
            { text: langData.buttons?.back || "🔙 Back", callback_data: 'back_to_registration' }
          ]
        ]
      }
    }
  );
  
  await ctx.answerCbQuery();
});

// Back to Registration from Instructions
bot.action('back_to_registration', async (ctx) => {
  const userId = ctx.from.id;
  const user = getUserData(userId);
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
    // INSTRUCTIONS and GET SIGNAL in same row (INSTRUCTIONS first)
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

  // Rest of the code...
});
  
  // Wapas registration page pe le jayein
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

// View Active Tickets
bot.action("admin_view_tickets", async (ctx) => {
  if (ctx.from.id !== ADMIN_ID) return;

  const allTickets = await getAllTicketsFromFirebase();
  const activeTickets = Object.keys(allTickets);

  if (activeTickets.length === 0) {
    await ctx.editMessageCaption(
      "✅ NO ACTIVE TICKETS\n\nThere are no active support tickets.",
      {
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [
            [{ text: "⬅️ Back", callback_data: "ADMIN_PANEL" }]
          ]
        }
      }
    );
    return;
  }

  let caption = `📞 *ACTIVE SUPPORT TICKETS*\n\n*Total Active Tickets: ${activeTickets.length}*\n\n`;
  const buttons = [];

  for (const userId of activeTickets.slice(0, 10)) {
    const user = await getUserData(parseInt(userId));
    if (user) {
      const name = `${user.firstName} ${user.lastName || ''}`.trim() || `User ${userId}`;
      buttons.push([{
        text: `${name} (ID: ${userId})`,
        callback_data: `admin_view_ticket_${userId}`
      }]);
    }
  }

  buttons.push([{ text: "⬅️ Back", callback_data: "ADMIN_PANEL" }]);

  await ctx.editMessageCaption(caption, {
    parse_mode: "Markdown",
    reply_markup: { inline_keyboard: buttons }
  });
});

// View Specific Ticket
bot.action(/^admin_view_ticket_(\d+)$/, async (ctx) => {
  if (ctx.from.id !== ADMIN_ID) return;
  const userId = ctx.match[1];
  const user = getUserData(userId);
  
  if (!user || !supportTickets.has(parseInt(userId))) {
    await ctx.answerCbQuery("Ticket not found", { show_alert: true });
    return;
  }
  
  const name = `${user.firstName} ${user.lastName || ''}`.trim() || `User ${userId}`;
  const username = user.username || "N/A";
  
  const caption = `📩 *SUPPORT TICKET*\n\n` +
    `👤 *User:* ${name}\n` +
    `🆔 *ID:* ${userId}\n` +
    `👤 *Username:* @${username}\n` +
    `🌐 *Language:* ${user.langName || user.lang}\n` +
    `⏰ *Active since:* ${new Date().toLocaleString()}`;
  
  await ctx.editMessageCaption(caption, {
    parse_mode: "Markdown",
    reply_markup: {
      inline_keyboard: [
        [
          { text: "✏️ Message Reply", callback_data: `admin_reply_ticket_${userId}` },
          { text: "❌ Close Ticket", callback_data: `admin_close_ticket_${userId}` }
        ],
        [
          { text: "⬅️ Back", callback_data: "admin_view_tickets" }
        ]
      ]
    }
  });
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

  // Notify User
  try {
    await ctx.telegram.sendMessage(
      uid,
      "🚫 Your Ticket Closed By Support Team\n\nIf you have more queries, you can open a new ticket from the menu.",
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
  const users = Array.from(userStorage.values());
  
  if (users.length === 0) {
    await ctx.editMessageCaption("👥 No users found.", { 
      reply_markup: { 
        inline_keyboard: [[{ text: "⬅️ Back", callback_data: "ADMIN_PANEL" }]] 
      } 
    });
    return;
  }
  
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
  const user = getUserData(parseInt(userId));
  
  if (!user) {
    await ctx.answerCbQuery("User not found", { show_alert: true });
    return;
  }
  
  const status = user.active ? "✅ ACTIVE" : "❌ INACTIVE";
  const fullName = `${user.firstName} ${user.lastName || ''}`.trim() || `User ${userId}`;
  
  // Create buttons
  const buttons = [
    [
      { text: "✏️ MSG", callback_data: `admin_reply_${userId}` },
      { text: "👁️ VIEW", url: `tg://user?id=${userId}` }
    ],
    [
      { text: user.active ? "❌ DEACTIVATE" : "✅ ACTIVATE", 
        callback_data: `admin_toggle_user_${userId}` }
    ],
    [
      { text: "⬅️ Back", callback_data: "admin_user_list_1" }
    ]
  ];
  
  try {
    // Try to get user profile photo
    const photos = await ctx.telegram.getUserProfilePhotos(userId, 0, 1);
    
    if (photos.total_count > 0) {
      const photo = photos.photos[0][0];
      await ctx.editMessageMedia({
        type: "photo",
        media: photo.file_id,
        caption: `👤 *USER DETAILS*\n\n👤: ${fullName}\n🆔: \`${userId}\`\n👤: @${user.username || 'N/A'}\n*Status*: ${status}\n*Language*: ${user.langName}`,
        parse_mode: "Markdown"
      }, {
        reply_markup: { inline_keyboard: buttons }
      });
    } else {
      await ctx.editMessageMedia({
        type: "photo",
        media: IMAGES.USER_LIST,
        caption: `👤 *USER DETAILS*\n\n👤: ${fullName}\n🆔: \`${userId}\`\n👤: @${user.username || 'N/A'}\n*Status*: ${status}\n*Language*: ${user.langName}`,
        parse_mode: "Markdown"
      }, {
        reply_markup: { inline_keyboard: buttons }
      });
    }
  } catch (error) {
    console.error("Error fetching profile photo:", error);
    await ctx.editMessageCaption(
      `👤 *USER DETAILS*\n\n👤: ${fullName}\n🆔: \`${userId}\`\n👤: @${user.username || 'N/A'}\n*Status*: ${status}\n*Language*: ${user.langName}`,
      {
        parse_mode: "Markdown",
        reply_markup: { inline_keyboard: buttons }
      }
    );
  }
});

// Toggle user active status
bot.action(/^admin_toggle_user_(\d+)$/, async (ctx) => {
  if (ctx.from.id !== ADMIN_ID) return;
  const userId = ctx.match[1];
  const user = getUserData(parseInt(userId));
  
  if (user) {
    user.active = !user.active;
    await ctx.answerCbQuery(`✅ User ${user.active ? 'activated' : 'deactivated'}`);
    // Go back to user view
    await bot.action(`admin_view_user_${userId}`)(ctx);
  }
});

// Admin Search User
bot.action('admin_search_user', async (ctx) => {
  if (ctx.from.id !== ADMIN_ID) return;
  
  await ctx.editMessageCaption(
    "🔍 *SEARCH USER*\n\nSend:\n• User ID\n• OR Username\n\nType /cancel to cancel.",
    {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [{ text: "❌ Cancel", callback_data: "ADMIN_PANEL" }]
        ]
      }
    }
  );
});

// ==================== BROADCAST FUNCTIONALITY ====================

// Broadcast Action
bot.action('admin_broadcast', async (ctx) => {
  if (ctx.from.id !== ADMIN_ID) return;
  
  adminBroadcastMode.set(ctx.from.id, true);
  
  await ctx.editMessageMedia(
    {
      type: 'photo',
      media: IMAGES.BROADCAST,
      caption: '📢 *BROADCAST MESSAGE*\n\nPlease send the message you want to broadcast to all users.\n\nYou can send:\n• Text\n• Photo with caption\n• Video with caption\n\nType /cancel to cancel the broadcast.',
      parse_mode: 'Markdown'
    },
    {
      reply_markup: {
        inline_keyboard: [
          [{ text: '❌ Cancel Broadcast', callback_data: 'admin_cancel_broadcast' }]
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
    }
  }
  
  // Admin broadcast message
  if (userId === ADMIN_ID && adminBroadcastMode.has(userId)) {
    const allUsers = Array.from(userStorage.keys()).filter(id => id !== ADMIN_ID);
    let sent = 0;
    let failed = 0;
    
    const progressMsg = await ctx.reply(`⏳ Broadcasting to ${allUsers.length} users...`);
    
    for (const targetUserId of allUsers) {
      try {
        // Check if user is active
        const user = getUserData(targetUserId);
        if (!user || !user.active) {
          failed++;
          continue;
        }
        
        // Forward or send message based on type
        if (message.text) {
          await ctx.telegram.sendMessage(targetUserId, message.text, {
            parse_mode: 'Markdown'
          });
        } else if (message.photo) {
          const photo = message.photo[message.photo.length - 1];
          await ctx.telegram.sendPhoto(targetUserId, photo.file_id, {
            caption: message.caption || '',
            parse_mode: 'Markdown'
          });
        } else if (message.video) {
          await ctx.telegram.sendVideo(targetUserId, message.video.file_id, {
            caption: message.caption || '',
            parse_mode: 'Markdown'
          });
        } else if (message.document) {
          await ctx.telegram.sendDocument(targetUserId, message.document.file_id, {
            caption: message.caption || '',
            parse_mode: 'Markdown'
          });
        }
        
        sent++;
        
        // Small delay to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        failed++;
        console.error(`Failed to send to user ${targetUserId}:`, error.message);
        // Mark user as inactive if blocked
        if (error.description?.includes('blocked')) {
          const user = getUserData(targetUserId);
          if (user) user.active = false;
        }
      }
    }
    
    adminBroadcastMode.delete(userId);
    
    await ctx.telegram.editMessageText(
      ctx.chat.id,
      progressMsg.message_id,
      null,
      `✅ *Broadcast Complete*\n\n📨 Sent: ${sent} users\n❌ Failed: ${failed} users\n📊 Total: ${allUsers.length} users`,
      { parse_mode: 'Markdown' }
    );
    
    return;
  }
  
  // Admin reply to user
  if (userId === ADMIN_ID && adminReplyTarget.has(userId)) {
    const targetUserId = adminReplyTarget.get(userId);
    
    try {
      // Check if target user exists
      const targetUser = getUserData(targetUserId);
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
      }
      
      await ctx.reply(`✅ Message sent to user ${targetUserId}`);
      adminReplyTarget.delete(userId);
    } catch (error) {
      await ctx.reply(`❌ Failed to send message: ${error.message}`);
    }
    return;
  }
  
  // User support message
  if (supportTickets.has(userId)) {
    // Forward to admin
    const user = getUserData(userId);
    const caption = `📩 *NEW SUPPORT MESSAGE*\n\n👤 From: ${user.firstName || 'User'}\n🆔 ID: ${userId}\n🌐 Language: ${user.langName || user.lang}`;
    
    try {
      await ctx.forwardMessage(ADMIN_ID, ctx.chat.id, ctx.message.message_id);
      await ctx.telegram.sendMessage(
        ADMIN_ID,
        caption,
        {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [
                { text: '✍️ Reply', callback_data: `admin_reply_ticket_${userId}` },
                { text: '❌ Close', callback_data: `admin_close_ticket_${userId}` }
              ]
            ]
          }
        }
      );
      
      await ctx.reply('✅ Your message has been sent to support team.');
    } catch (error) {
      console.error('Error forwarding message:', error);
    }
    return;
  }
  
  // Admin search user
  if (userId === ADMIN_ID && message.text && !message.text.startsWith('/')) {
    // Check if it's a search query (simple implementation)
    const query = message.text.trim();
    
    if (query.match(/^\d+$/)) {
      // Search by user ID
      const targetUserId = parseInt(query);
      const user = getUserData(targetUserId);
      
      if (user) {
        const caption = `🔍 *USER FOUND*\n\n👤 Name: ${user.firstName} ${user.lastName || ''}\n🆔 ID: ${user.id}\n🌐 Language: ${user.langName}\n✅ Status: ${user.active ? 'Active' : 'Inactive'}`;
        
        await ctx.reply(caption, {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [
                { text: 'View Details', callback_data: `admin_view_user_${user.id}` },
                { text: 'Send Message', callback_data: `admin_reply_${user.id}` }
              ]
            ]
          }
        });
      } else {
        await ctx.reply('❌ User not found in database.');
      }
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

// Call this function when bot starts
initializeBotData();

// Development mode
if (process.env.NODE_ENV !== 'production') {
  bot.launch();
  console.log('🤖 Bot is running in development mode');
}
