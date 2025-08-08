const { EmbedBuilder } = require('discord.js');
const database = require('../utils/database');

module.exports = {
  name: 'daily',
  description: 'Claims your daily coin reward.',
  async execute(interaction) {
    const userId = interaction.user.id;
    const guildId = interaction.guild.id;

    try {
      const config = await database.readServerData(guildId, 'economyConfig');
      const dailyData = await database.readUserData(userId, 'daily');
      const now = Date.now();

      if (dailyData.lastClaim) {
        const timeSinceClaim = now - new Date(dailyData.lastClaim).getTime();
        if (timeSinceClaim < 24 * 60 * 60 * 1000) {
          const timeLeft = 24 * 60 * 60 * 1000 - timeSinceClaim;
          const hours = Math.floor(timeLeft / (60 * 60 * 1000));
          const minutes = Math.floor((timeLeft % (60 * 60 * 1000)) / (60 * 1000));
          return interaction.reply({
            content: `⏰ You can claim your daily reward in ${hours}h ${minutes}m.`,
            ephemeral: true,
          });
        }
      }

      // Calculate reward
      const baseReward = config.dailyReward || 100;
      const streakBonus = config.streakBonus ? (dailyData.streak || 0) * (config.streakMultiplier || 10) : 0;
      const totalReward = baseReward + streakBonus;

      // Update user data
      const userData = await database.readUserData(userId, 'balance');
      userData.coins += totalReward;
      userData.totalEarned = (userData.totalEarned || 0) + totalReward;

      // Update daily tracking
      dailyData.lastClaim = new Date().toISOString();
      dailyData.streak = (dailyData.streak || 0) + 1;

      await database.writeUserData(userId, userData, 'balance');
      await database.writeUserData(userId, dailyData, 'daily');

      const embed = new EmbedBuilder()
        .setTitle('Daily Reward Claimed!')
        .setColor('Green')
        .setDescription(
          `**Base Reward**: ${config.currencySymbol || '🪙'} ${baseReward}\n` +
          `**Streak Bonus**: ${config.currencySymbol || '🪙'} ${streakBonus}\n` +
          `**Total Reward**: ${config.currencySymbol || '🪙'} ${totalReward}\n` +
          `**Current Streak**: ${dailyData.streak} day${dailyData.streak === 1 ? '' : 's'}`
        );

      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error('Error processing daily reward:', error);
      interaction.reply({ content: '❌ Failed to process daily reward.', ephemeral: true });
    }
  },
};
