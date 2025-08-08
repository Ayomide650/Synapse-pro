const database = require('../utils/database');

module.exports = {
  name: 'messageCreate',
  async execute(message) {
    if (message.author.bot || !message.guild) return;

    try {
      // Get server config
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
      console.error('Error processing XP gain:', error);
    }
  },
};
