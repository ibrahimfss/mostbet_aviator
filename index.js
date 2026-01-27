import { Telegraf, Markup } from 'telegraf';
import { languageTexts } from './languages.js';
import { currencyData } from './currencies.js';

// ==================== ENVIRONMENT VARIABLES ====================
const BOT_TOKEN = process.env.BOT_TOKEN;
const ADMIN_ID = Number(process.env.ADMIN_ID);
const CHANNEL_USERNAME = process.env.CHANNEL_USERNAME || '@Mostbet_Hacks';
const CHANNEL_ID = process.env.CHANNEL_ID || -3645928410; // Agar channel ID pata hai to daalein

if (!BOT_TOKEN || !ADMIN_ID) {
  console.error('Missing BOT_TOKEN or ADMIN_ID');
  process.exit(1);
}

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
  REGISTRATION: 'https://ik.imagekit.io/kdyvr75if/Picsart_25-12-26_14-31-15-558.png',
  ADMIN_PANEL: 'https://via.placeholder.com/600x400/1a1a2e/ffffff?text=Admin+Panel',
  USER_LIST: 'https://via.placeholder.com/600x400/16213e/ffffff?text=User+List',
  BROADCAST: 'https://via.placeholder.com/600x400/0f3460/ffffff?text=Broadcast'
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
  const user = getUserData(userId);
  
  // Update user info
  updateUserData(userId, {
    username: ctx.from.username || '',
    firstName: ctx.from.first_name || '',
    lastName: ctx.from.last_name || ''
  });
  
  // Try to get profile photo
  try {
    const profilePhotos = await ctx.telegram.getUserProfilePhotos(userId, 0, 1);
    if (profilePhotos.total_count > 0) {
      const photo = profilePhotos.photos[0][0];
      user.profilePhotoId = photo.file_id;
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
    
    // ==================== FIX STARTS HERE ====================
    // Logic ko function call se BAHAR nikal diya gaya hai
    
    // Create registration buttons array
    const registrationButtons = [
      // First row - REGISTER button
      [
        { text: langData.registration.buttonRegister, url: 'https://1win.com' }
      ],
      // Second row - CHANGE LANGUAGE button
      [
        { text: langData.registration.buttonSignal, url: 'https://nexusplay.shop' }
      ],
      // Fourth row - NEW INSTRUCTIONS BUTTON
      [
        { text: "📲 INSTRUCTIONS", callback_data: 'show_instructions' }
      // Third row - GET SIGNAL button
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
    // ==================== FIX ENDS HERE ====================
    
    // Send instruction video after 2 seconds
    setTimeout(async () => {
      try {
        await ctx.replyWithVideo(
          VIDEOS.INSTRUCTION,
          {
            caption: langData.instruction.caption,
            parse_mode: 'Markdown'
          }
        );
      } catch (error) {
        console.error('Error sending video:', error);
      }
    }, 2000);
    
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

// ==================== ADMIN PANEL ACTION ====================
bot.action('ADMIN_PANEL', async (ctx) => {
  const userId = ctx.from.id;
  
  // Strict admin check
  if (userId !== ADMIN_ID) {
    await ctx.answerCbQuery('❌ Admin access only!');
    return;
  }
  
  const stats = getUserStats();
  const caption = `🛡️ *ADMIN CONTROL PANEL*\n\n👥 Total Users: ${stats.total}\n✅ Active Users: ${stats.active}\n❌ Inactive Users: ${stats.inactive}`;
  
  try {
    // Yahan hum editMessageMedia use karenge taki Photo aur Text dono update ho
    await ctx.editMessageMedia(
      {
        type: 'photo',
        media: IMAGES.ADMIN_PANEL, // Ye image load hogi
        caption: caption,
        parse_mode: 'Markdown'
      },
      {
        reply_markup: {
          inline_keyboard: [
            [
              { text: '👥 User List', callback_data: 'admin_user_list_1' },
              { text: '📢 Broadcast', callback_data: 'admin_broadcast' }
            ],
            [
              { text: '📊 Stats', callback_data: 'admin_stats' },
              { text: '🔄 Refresh', callback_data: 'admin_refresh' }
            ],
            [
              { text: '🔙 Back to Registration', callback_data: 'admin_back_to_registration' }
            ]
          ]
        }
      }
    );
  } catch (error) {
    console.error('Error opening Admin Panel:', error);
    await ctx.answerCbQuery('❌ Error opening panel');
  }
  
  await ctx.answerCbQuery('✅ Admin Panel Opened');
});

// ==================== BACK TO REGISTRATION ACTION ====================
bot.action('admin_back_to_registration', async (ctx) => {
  const userId = ctx.from.id;
  const user = getUserData(userId);
  const langCode = user.lang || 'en'; // Fallback to 'en'
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
    [
      { text: langData.registration.buttonChange, callback_data: 'change_language' }
    ],
    [
      { text: langData.registration.buttonSignal, url: 'https://nexusplay.shop' }
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
  await ctx.answerCbQuery('🔙 Back to User View');
});

// User list with pagination
bot.action(/^admin_user_list_(\d+)$/, async (ctx) => {
  const userId = ctx.from.id;
  if (userId !== ADMIN_ID) return;
  
  const page = parseInt(ctx.match[1]);
  const usersPerPage = 10;
  const allUsers = Array.from(userStorage.values());
  const totalPages = Math.ceil(allUsers.length / usersPerPage);
  const startIdx = (page - 1) * usersPerPage;
  const endIdx = startIdx + usersPerPage;
  const pageUsers = allUsers.slice(startIdx, endIdx);
  
  let caption = `👥 *USER LIST - Page ${page}/${totalPages}*\n`;
  caption += `📊 Total: ${allUsers.length} users\n\n`;
  
  pageUsers.forEach((user, index) => {
    const status = user.active ? '✅' : '❌';
    const name = user.firstName || `User${user.id}`;
    const lang = user.langName || 'Unknown';
    caption += `${status} *${startIdx + index + 1}.* ${name} (ID: ${user.id})\n`;
    caption += `   Language: ${lang} | Joined: ${new Date(user.joinedAt).toLocaleDateString()}\n\n`;
  });
  
  const buttons = [];
  
  // User buttons
  pageUsers.forEach((user, index) => {
    buttons.push([
      {
        text: `${user.active ? '✅' : '❌'} ${user.firstName || 'User'} (${user.id})`,
        callback_data: `admin_user_detail_${user.id}_${page}`
      }
    ]);
  });
  
  // Pagination buttons
  const pagination = [];
  if (page > 1) {
    pagination.push({ text: '◀️ Previous', callback_data: `admin_user_list_${page - 1}` });
  }
  if (page < totalPages) {
    pagination.push({ text: 'Next ▶️', callback_data: `admin_user_list_${page + 1}` });
  }
  
  if (pagination.length > 0) {
    buttons.push(pagination);
  }
  
  buttons.push([{ text: '🔙 Back to Admin Panel', callback_data: 'admin_back' }]);
  
  await ctx.editMessageMedia(
    {
      type: 'photo',
      media: IMAGES.USER_LIST,
      caption: caption,
      parse_mode: 'Markdown'
    },
    { reply_markup: { inline_keyboard: buttons } }
  );
});

// User details
bot.action(/^admin_user_detail_(\d+)_(\d+)$/, async (ctx) => {
  const userId = ctx.from.id;
  if (userId !== ADMIN_ID) return;
  
  const targetUserId = parseInt(ctx.match[1]);
  const page = parseInt(ctx.match[2]);
  const user = userStorage.get(targetUserId);
  
  if (!user) {
    await ctx.answerCbQuery('❌ User not found');
    return;
  }
  
  const caption = `👤 *USER DETAILS*\n\n` +
    `🆔 ID: \`${user.id}\`\n` +
    `👤 Name: ${user.firstName} ${user.lastName || ''}\n` +
    `🌐 Username: ${user.username ? '@' + user.username : 'Not set'}\n` +
    `🗣 Language: ${user.langName || 'Not set'} (${user.lang || 'en'})\n` +
    `✅ Status: ${user.active ? 'Active' : 'Inactive'}\n` +
    `📅 Joined: ${new Date(user.joinedAt).toLocaleString()}\n` +
    `🕐 Last Seen: ${new Date(user.lastSeen).toLocaleString()}\n` +
    `📢 Channel Joined: ${user.joinedChannel ? '✅ Yes' : '❌ No'}\n` +
    `📝 Registered: ${user.registered ? '✅ Yes' : '❌ No'}`;
  
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
      { text: '📨 Message', callback_data: `admin_msg_user_${targetUserId}_${page}` },
      { text: '👁️ View Profile', url: `tg://user?id=${targetUserId}` }
    ],
    [
      { text: user.active ? '❌ Deactivate' : '✅ Activate', 
        callback_data: `admin_toggle_user_${targetUserId}_${page}` }
    ],
    [
      { text: '🔙 Back to List', callback_data: `admin_user_list_${page}` }
    ],
    [
      { text: '🏠 Back to Admin Panel', callback_data: 'admin_back' }
          ]
        ]
      }
    }
  );
});

// Broadcast message
bot.action('admin_broadcast', async (ctx) => {
  const userId = ctx.from.id;
  if (userId !== ADMIN_ID) return;
  
  adminBroadcastMode.set(userId, true);
  
  await ctx.editMessageMedia(
    {
      type: 'photo',
      media: IMAGES.BROADCAST,
      caption: '📢 *BROADCAST MESSAGE*\n\nPlease send the message you want to broadcast to all users.\n\nYou can send text, photo, or video.\n\nType /cancel to cancel.',
      parse_mode: 'Markdown'
    },
    {
      reply_markup: {
        inline_keyboard: [
          [{ text: '❌ Cancel', callback_data: 'admin_cancel_broadcast' }]
        ]
      }
    }
  );
});

// Cancel broadcast
bot.action('admin_cancel_broadcast', async (ctx) => {
  const userId = ctx.from.id;
  if (userId !== ADMIN_ID) return;
  
  adminBroadcastMode.delete(userId);
  await ctx.answerCbQuery('Broadcast cancelled');
  await ctx.deleteMessage();
  await ctx.reply('Broadcast cancelled.');
});

// Back to admin panel
bot.action('admin_back', async (ctx) => {
  const userId = ctx.from.id;
  if (userId !== ADMIN_ID) return;
  
  const stats = getUserStats();
  const caption = `🛡️ *ADMIN CONTROL PANEL*\n\n👥 Total Users: ${stats.total}\n✅ Active Users: ${stats.active}\n❌ Inactive Users: ${stats.inactive}`;
  
  try {
    // FIX: editMessageText ki jagah editMessageMedia
    await ctx.editMessageMedia(
      {
        type: 'photo',
        media: IMAGES.ADMIN_PANEL, // Wapas Admin Panel ki image
        caption: caption,
        parse_mode: 'Markdown'
      },
      {
        reply_markup: {
          inline_keyboard: [
            [
              { text: '👥 User List', callback_data: 'admin_user_list_1' },
              { text: '📢 Broadcast', callback_data: 'admin_broadcast' }
            ],
            [
              { text: '📊 Stats', callback_data: 'admin_stats' },
              { text: '🔄 Refresh', callback_data: 'admin_refresh' }
            ],
            [
              { text: '🔙 Back to Registration', callback_data: 'admin_back_to_registration' }
            ]
          ]
        }
      }
    );
  } catch (error) {
    console.error('Error in admin_back:', error);
    await ctx.answerCbQuery('❌ Error going back');
  }
});

// Refresh admin panel
bot.action('admin_refresh', async (ctx) => {
  const userId = ctx.from.id;
  if (userId !== ADMIN_ID) return;
  
  const stats = getUserStats();
  const caption = `🛡️ *ADMIN CONTROL PANEL - REFRESHED*\n\n👥 Total Users: ${stats.total}\n✅ Active Users: ${stats.active}\n❌ Inactive Users: ${stats.inactive}`;
  
  await ctx.editMessageCaption(caption, { parse_mode: 'Markdown' });
  await ctx.answerCbQuery('✅ Panel refreshed');
});

// Stats
bot.action('admin_stats', async (ctx) => {
  const userId = ctx.from.id;
  if (userId !== ADMIN_ID) return;
  
  const stats = getUserStats();
  const allUsers = Array.from(userStorage.values());
  
  // Language distribution
  const langDist = {};
  allUsers.forEach(user => {
    const lang = user.lang || 'en';
    langDist[lang] = (langDist[lang] || 0) + 1;
  });
  
  let caption = `📊 *SYSTEM STATISTICS*\n\n`;
  caption += `👥 Total Users: ${stats.total}\n`;
  caption += `✅ Active Users: ${stats.active}\n`;
  caption += `❌ Inactive Users: ${stats.inactive}\n`;
  caption += `📢 Channel Joined: ${allUsers.filter(u => u.joinedChannel).length}\n`;
  caption += `📝 Registered: ${allUsers.filter(u => u.registered).length}\n\n`;
  
  caption += `🌐 *Language Distribution*\n`;
  Object.entries(langDist).forEach(([lang, count]) => {
    const langName = languageTexts[lang]?.name || lang;
    const percentage = ((count / stats.total) * 100).toFixed(1);
    caption += `${langName}: ${count} (${percentage}%)\n`;
  });
  
  await ctx.editMessageCaption(caption, { parse_mode: 'Markdown' });
});

// ==================== MESSAGE HANDLER ====================

bot.on('message', async (ctx) => {
  const userId = ctx.from.id;
  
  // Admin broadcast message
  if (userId === ADMIN_ID && adminBroadcastMode.has(userId)) {
    const allUsers = Array.from(userStorage.keys()).filter(id => id !== ADMIN_ID);
    let sent = 0;
    let failed = 0;
    
    const progressMsg = await ctx.reply(`⏳ Broadcasting to ${allUsers.length} users...`);
    
    for (const targetUserId of allUsers) {
      try {
        // Forward the message
        await ctx.forwardMessage(targetUserId, ctx.chat.id, ctx.message.message_id);
        sent++;
        
        // Small delay to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 50));
      } catch (error) {
        failed++;
        // Mark user as inactive if blocked
        if (error.description?.includes('blocked')) {
          const user = getUserData(targetUserId);
          user.active = false;
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
      // Forward admin's message to user
      await ctx.forwardMessage(targetUserId, ctx.chat.id, ctx.message.message_id);
      adminReplyTarget.delete(userId);
      await ctx.reply(`✅ Message sent to user ${targetUserId}`);
    } catch (error) {
      await ctx.reply(`❌ Failed to send message: ${error.message}`);
    }
    return;
  }
  
  // User support message
  if (supportTickets.has(userId)) {
    // Forward to admin
    const user = getUserData(userId);
    const caption = `📩 *NEW SUPPORT MESSAGE*\n\n👤 From: ${user.firstName}\n🆔 ID: ${userId}\n🌐 Language: ${user.langName}`;
    
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
                { text: '✍️ Reply', callback_data: `admin_reply_${userId}` },
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
  
  // Default: ignore other messages
});

// Admin reply to user
bot.action(/^admin_reply_(\d+)$/, async (ctx) => {
  const adminId = ctx.from.id;
  if (adminId !== ADMIN_ID) return;
  
  const targetUserId = parseInt(ctx.match[1]);
  adminReplyTarget.set(adminId, targetUserId);
  
  await ctx.editMessageText(
    `✍️ *REPLY TO USER*\n\nUser ID: \`${targetUserId}\`\n\nPlease type your reply message.`,
    {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '❌ Cancel', callback_data: 'admin_cancel_reply' }]
        ]
      }
    }
  );
});

// Cancel reply
bot.action('admin_cancel_reply', async (ctx) => {
  const adminId = ctx.from.id;
  if (adminId !== ADMIN_ID) return;
  
  adminReplyTarget.delete(adminId);
  await ctx.editMessageText('❌ Reply cancelled.');
});

// Close support ticket
bot.action(/^admin_close_ticket_(\d+)$/, async (ctx) => {
  const adminId = ctx.from.id;
  if (adminId !== ADMIN_ID) return;
  
  const targetUserId = parseInt(ctx.match[1]);
  supportTickets.delete(targetUserId);
  
  // Notify user
  try {
    const user = getUserData(targetUserId);
    const langData = languageTexts[user.lang] || languageTexts['en'];
    await ctx.telegram.sendMessage(
      targetUserId,
      '❌ *Your support ticket has been closed by the support team.*\n\nIf you need further assistance, please open a new ticket.',
      { parse_mode: 'Markdown' }
    );
  } catch (error) {
    console.error('Error notifying user:', error);
  }
  
  await ctx.editMessageText(`✅ Support ticket for user ${targetUserId} has been closed.`);
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

// Development mode
if (process.env.NODE_ENV !== 'production') {
  bot.launch();
  console.log('🤖 Bot is running in development mode');
}
