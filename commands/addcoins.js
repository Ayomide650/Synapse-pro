const { PermissionsBitField } = require('discord.js');
const database = require('../utils/database');

module.exports = {
  name: 'addcoins',
  description: 'Adds coins to a user\'s balance.',
  options: [
    {
      name: 'user',
      type: 'USER',
      description: 'The user to add coins to',
      required: true,
    },
    {
      name: 'amount',
      type: 'INTEGER',
      description: 'Amount of coins to add',
      required: true,
    },
    {
      name: 'reason',
      type: 'STRING',
      description: 'Reason for adding coins',
      required: false,
    },
    {
      name: 'notify',
      type: 'BOOLEAN',
      description: 'Whether to notify the user via DM',
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
    const notify = interaction.options.getBoolean('notify') || false;

    if (amount <= 0) {
      return interaction.reply({ content: 'Amount must be positive.', ephemeral: true });
    }

    try {
      const userData = await database.readUserData(target.id, 'balance');
      const maxBalance = config.maxBalance || 1000000;

      if (userData.coins + amount > maxBalance) {
        return interaction.reply({ content: `This would exceed the maximum balance of ${maxBalance} coins.`, ephemeral: true });
      }

      userData.coins += amount;
      await database.writeUserData(target.id, userData, 'balance');

      if (notify) {
        try {
          await target.send(`💰 You received ${amount} coins from ${interaction.user.tag}.\nReason: ${reason}`);
        } catch (error) {
          console.error('Failed to send DM:', error);
        }
      }

      await interaction.reply({ content: `✅ Added ${amount} coins to ${target.tag}'s balance.` });

      // Log the transaction
      const action = {
        type: 'addcoins',
        user: target.tag,
        userId: target.id,
        amount: amount,
        newBalance: userData.coins,
        reason: reason,
        moderator: interaction.user.tag,
        moderatorId: interaction.user.id,
      };
      await database.logModerationAction(interaction.guild.id, action);

    } catch (error) {
      console.error('Error adding coins:', error);
      interaction.reply({ content: '❌ Failed to add coins.', ephemeral: true });
    }
  },
};
