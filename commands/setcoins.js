const { PermissionsBitField } = require('discord.js');
const database = require('../utils/database');

module.exports = {
  name: 'setcoins',
  description: 'Sets a user\'s coin balance to an exact amount.',
  options: [
    {
      name: 'user',
      type: 'USER',
      description: 'The user to set coins for',
      required: true,
    },
    {
      name: 'amount',
      type: 'INTEGER',
      description: 'The exact amount to set',
      required: true,
    },
    {
      name: 'reason',
      type: 'STRING',
      description: 'Reason for setting coins',
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

    if (amount < 0) {
      return interaction.reply({ content: 'Amount cannot be negative.', ephemeral: true });
    }

    try {
      const userData = await database.readUserData(target.id, 'balance');
      const oldBalance = userData.coins;
      userData.coins = amount;

      await database.writeUserData(target.id, userData, 'balance');
      await interaction.reply({ content: `✅ Set ${target.tag}'s balance to ${amount} coins.` });

      // Log the transaction
      const action = {
        type: 'setcoins',
        user: target.tag,
        userId: target.id,
        oldBalance: oldBalance,
        newBalance: amount,
        reason: reason,
        moderator: interaction.user.tag,
        moderatorId: interaction.user.id,
      };
      await database.logModerationAction(interaction.guild.id, action);

    } catch (error) {
      console.error('Error setting coins:', error);
      interaction.reply({ content: '❌ Failed to set coins.', ephemeral: true });
    }
  },
};
