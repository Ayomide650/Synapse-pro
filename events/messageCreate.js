const database = require('../utils/database');

module.exports = {
  name: 'messageCreate',
  async execute(message) {
    if (message.author.bot || !message.guild) return;

    try {
      // Track message activity for stats
      await trackMessageActivity(message);

      
      await handleAutoResponses(message);

      // Get server config for XP
      const config = await database.readServerData(message.guild.id, 'levelConfig');
      if (!config.xpEnabled) return;

      // Check channel restrictions
      if (config.disabledChannels?.includes(message.channel.id)) return;

      // Get user data
      const userData = await database.readUserData(message.author.id, 'level');
      const now = Date.now();

      // Check cooldown (default 10 seconds)
      const cooldown = config.xpCooldown || 10000;
      if (userData.lastXpGain && (now - new Date(userData.lastXpGain).getTime()) < cooldown) return;

      // Calculate random XP (default 15-25)
      const minXp = config.minXpGain || 15;
      const maxXp = config.maxXpGain || 25;
      const xpGain = Math.floor(Math.random() * (maxXp - minXp + 1)) + minXp;

      // Calculate new level
      const oldLevel = userData.level;
      userData.xp += xpGain;
      userData.totalXp += xpGain;
      userData.lastXpGain = new Date().toISOString();
      userData.level = Math.floor(Math.sqrt(userData.totalXp / 100));

      // Save updated user data
      await database.writeUserData(message.author.id, userData, 'level');

      // Check for level up
      if (userData.level > oldLevel && config.announceLevel) {
        message.channel.send(`🎉 Congratulations ${message.author}! You've reached level ${userData.level}!`);
      }
    } catch (error) {
      console.error('Error processing message:', error);
    }
  },
};

async function trackMessageActivity(message) {
  try {
    const data = await database.read('features/member_activity.json');
    
    if (!data[message.guild.id]) {
      data[message.guild.id] = { messages: {}, voice: {} };
    }

    if (!data[message.guild.id].messages[message.author.id]) {
      data[message.guild.id].messages[message.author.id] = { count: 0, lastMessage: null };
    }

    data[message.guild.id].messages[message.author.id].count++;
    data[message.guild.id].messages[message.author.id].lastMessage = new Date().toISOString();

    await database.write('features/member_activity.json', data);
  } catch (error) {
    console.error('Error tracking message activity:', error);
  }
}

async function handleAutoResponses(message) {
  try {
    const data = await database.read('features/autoresponder.json');
    const guildData = data[message.guild.id];

    if (!guildData || !guildData.enabled || !guildData.responses) return;

    const messageContent = message.content.toLowerCase();
    
    for (const [trigger, responseData] of Object.entries(guildData.responses)) {
      let shouldRespond = false;

      if (responseData.exact) {
        shouldRespond = messageContent === trigger;
      } else {
        shouldRespond = messageContent.includes(trigger);
      }

      if (shouldRespond) {
        // Send the auto-response
        await message.channel.send(responseData.response);

        // Update usage count
        responseData.uses = (responseData.uses || 0) + 1;
        await database.write('features/autoresponder.json', data);
        
        break; // Only respond to first matching trigger
      }
    }
  } catch (error) {
    console.error('Error handling auto-responses:', error);
  }
}
