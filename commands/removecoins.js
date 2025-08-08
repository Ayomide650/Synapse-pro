const { PermissionsBitField } = require('discord.js');
const database = require('../utils/database');

module.exports = {
  name: 'removecoins',
  description: 'Removes coins from a user\'s balance.',
  options: [
    {
      name: 'user',
      type: 'USER',
      description: 'The user to remove coins from',
      required: true,
    },
    {
      name: 'amount',
      type: 'INTEGER',
      description: 'Amount of coins to remove',
      required: true,
    },
    {
      name: 'reason',
      type: 'STRING',
      description: 'Reason for removing coins',
      required: false,
    },
  ],
  async execute(interaction) {
    const config = await database.readServerData(interaction.guild.id, 'economyConfig');
    if (!interaction.member.roles.cache.has(config.economyAdminRole)) {
      return interaction.reply({ content: 'You do not have permission to manage the economy.', ephemeral: true });
    }

    const target = interaction.options.getUser('user');
    const amount = interaction.options.getInteger('amount');
    const reason = interaction.options.getString('reason') || 'No reason provided';

    if (amount <= 0) {
      return interaction.reply({ content: 'Amount must be positive.', ephemeral: true });
    }

    try {
      const userData = await database.readUserData(target.id, 'balance');
      const oldBalance = userData.coins;
      userData.coins = Math.max(0, userData.coins - amount);

      await database.writeUserData(target.id, userData, 'balance');
      await interaction.reply({ content: `✅ Removed ${amount} coins from ${target.tag}'s balance.` });

      // Log the transaction
      const action = {
        type: 'removecoins',
        user: target.tag,
        userId: target.id,
        amount: amount,
        oldBalance: oldBalance,
        newBalance: userData.coins,
        reason: reason,
        moderator: interaction.user.tag,
        moderatorId: interaction.user.id,
      };
      await database.logModerationAction(interaction.guild.id, action);

    } catch (error) {
      console.error('Error removing coins:', error);
      interaction.reply({ content: '❌ Failed to remove coins.', ephemeral: true });
    }
  },
};
