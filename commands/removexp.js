const { PermissionsBitField } = require('discord.js');
const database = require('../utils/database');

module.exports = {
  name: 'removexp',
  description: 'Removes XP from a user and recalculates their level.',
  options: [
    {
      name: 'user',
      type: 'USER',
      description: 'The user to remove XP from',
      required: true,
    },
    {
      name: 'amount',
      type: 'INTEGER',
      description: 'Amount of XP to remove',
      required: true,
    },
    {
      name: 'reason',
      type: 'STRING',
      description: 'Reason for removing XP',
      required: false,
    },
  ],
  async execute(interaction) {
    if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      return interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
    }

    const target = interaction.options.getUser('user');
    const amount = interaction.options.getInteger('amount');
    const reason = interaction.options.getString('reason') || 'No reason provided';

    if (amount <= 0) {
      return interaction.reply({ content: 'Amount must be positive.', ephemeral: true });
    }

    try {
      const guildId = interaction.guild.id;
      const fileName = 'leveling/user_levels.json';
      const data = await database.read(fileName);

      if (!data[guildId]?.[target.id]) {
        return interaction.reply({ content: `${target.tag} has no XP to remove.`, ephemeral: true });
      }

      const userData = data[guildId][target.id];
      const oldLevel = userData.level;
      const oldXp = userData.xp;

      // Remove XP (don't go below 0)
      userData.xp = Math.max(0, userData.xp - amount);
      userData.totalXp = Math.max(0, userData.totalXp - amount);

      // Recalculate level
      userData.level = Math.floor(Math.sqrt(userData.totalXp / 100));

      await database.write(fileName, data);

      // Log the action
      const action = {
        type: 'removexp',
        user: target.tag,
        userId: target.id,
        amount: amount,
        reason: reason,
        oldXp: oldXp,
        newXp: userData.xp,
        oldLevel: oldLevel,
        newLevel: userData.level,
        moderator: interaction.user.tag,
        moderatorId: interaction.user.id,
      };
      await database.logModerationAction(guildId, action);

      await interaction.reply({
        content: `✅ Removed ${amount} XP from ${target.tag}.\n` +
                `New Level: ${userData.level}\n` +
                `Remaining XP: ${userData.xp}`
      });

    } catch (error) {
      console.error('Error removing XP:', error);
      interaction.reply({ content: '❌ Failed to remove XP. Please try again later.', ephemeral: true });
    }
  },
};
