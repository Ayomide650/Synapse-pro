const { EmbedBuilder } = require('discord.js');
const database = require('../utils/database');

module.exports = {
  name: 'balance',
  description: 'Shows current balance and economy statistics for a user.',
  options: [
    {
      name: 'user',
      type: 'USER',
      description: 'The user to check balance for',
      required: false,
    },
  ],
  async execute(interaction) {
    const target = interaction.options.getUser('user') || interaction.user;
    const guildId = interaction.guild.id;

    try {
      const config = await database.readServerData(guildId, 'economyConfig');
      const userData = await database.readUserData(target.id, 'balance');
      const stats = await database.read('economy/user_balances.json');

      // Calculate ranking
      const sortedUsers = Object.entries(stats[guildId] || {})
        .sort(([, a], [, b]) => (b.coins + b.bank) - (a.coins + a.bank));
      const rank = sortedUsers.findIndex(([id]) => id === target.id) + 1;

      const embed = new EmbedBuilder()
        .setTitle(`${target.username}'s Balance`)
        .setColor('Gold')
        .setDescription(
          `**Wallet**: ${config.currencySymbol || '🪙'} ${userData.coins}\n` +
          `**Bank**: ${config.currencySymbol || '🪙'} ${userData.bank}\n` +
          `**Total**: ${config.currencySymbol || '🪙'} ${userData.coins + userData.bank}\n` +
          `**Rank**: #${rank || 'N/A'}\n\n` +
          `**Total Earned**: ${config.currencySymbol || '🪙'} ${userData.totalEarned || 0}\n` +
          `**Total Spent**: ${config.currencySymbol || '🪙'} ${userData.totalSpent || 0}`
        )
        .setFooter({ text: `Currency: ${config.currencyName || 'coins'}` });

      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error('Error fetching balance:', error);
      interaction.reply({ content: '❌ Failed to fetch balance data.', ephemeral: true });
    }
  },
};
