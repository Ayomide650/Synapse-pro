const { PermissionsBitField } = require('discord.js');
const database = require('../utils/database');

module.exports = {
  name: 'setxp',
  description: 'Sets a user\'s XP to an exact amount.',
  options: [
    {
      name: 'user',
      type: 'USER',
      description: 'The user to set XP for',
      required: true,
    },
    {
      name: 'amount',
      type: 'INTEGER',
      description: 'The exact amount of XP to set',
      required: true,
    },
    {
      name: 'reason',
      type: 'STRING',
      description: 'Reason for setting XP',
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

    if (amount < 0) {
      return interaction.reply({ content: 'XP amount cannot be negative.', ephemeral: true });
    }

    try {
      const guildId = interaction.guild.id;
      const fileName = 'leveling/user_levels.json';
      const data = await database.read(fileName);

      if (!data[guildId]) data[guildId] = {};
      if (!data[guildId][target.id]) {
        data[guildId][target.id] = { xp: 0, level: 1, totalXp: 0 };
      }

      const userData = data[guildId][target.id];
      const oldXp = userData.xp;
      const oldLevel = userData.level;

      // Set new XP values
      userData.xp = amount;
      userData.totalXp = amount;
      userData.level = Math.floor(Math.sqrt(amount / 100));

      await database.write(fileName, data);

      // Log the action
      const action = {
        type: 'setxp',
        user: target.tag,
        userId: target.id,
        oldXp: oldXp,
        newXp: amount,
        oldLevel: oldLevel,
        newLevel: userData.level,
        reason: reason,
        moderator: interaction.user.tag,
        moderatorId: interaction.user.id,
      };
      await database.logModerationAction(guildId, action);

      await interaction.reply({
        content: `✅ Set ${target.tag}'s XP to ${amount}.\n` +
                `New Level: ${userData.level}`
      });

    } catch (error) {
      console.error('Error setting XP:', error);
      interaction.reply({ content: '❌ Failed to set XP. Please try again later.', ephemeral: true });
    }
  },
};
