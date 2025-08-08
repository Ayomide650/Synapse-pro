const { PermissionsBitField } = require('discord.js');
const database = require('../utils/database');

module.exports = {
  name: 'addxp',
  description: 'Adds XP to a user and calculates level-ups.',
  options: [
    {
      name: 'user',
      type: 'USER',
      description: 'The user to add XP to',
      required: true,
    },
    {
      name: 'amount',
      type: 'INTEGER',
      description: 'Amount of XP to add',
      required: true,
    },
    {
      name: 'reason',
      type: 'STRING',
      description: 'Reason for adding XP',
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
      return interaction.reply({ content: 'XP amount must be positive.', ephemeral: true });
    }

    try {
      const guildId = interaction.guild.id;
      const fileName = 'leveling/user_levels.json';
      const data = await database.read(fileName);

      if (!data[guildId]) data[guildId] = {};
      if (!data[guildId][target.id]) {
        data[guildId][target.id] = {
          xp: 0,
          level: 1,
          totalXp: 0,
          lastActivity: new Date().toISOString()
        };
      }

      const userData = data[guildId][target.id];
      const oldLevel = userData.level;
      
      // Add XP
      userData.xp += amount;
      userData.totalXp += amount;
      userData.lastActivity = new Date().toISOString();

      // Calculate new level
      const newLevel = Math.floor(Math.sqrt(userData.totalXp / 100));
      if (newLevel > oldLevel) {
        userData.level = newLevel;
        // Level up announcement
        interaction.channel.send(`🎉 Congratulations ${target}! You've reached level ${newLevel}!`);
      }

      await database.write(fileName, data);

      await interaction.reply({
        content: `✅ Added ${amount} XP to ${target.tag}.\n` +
                `Current Level: ${userData.level}\n` +
                `Total XP: ${userData.totalXp}\n` +
                `Reason: ${reason}`
      });

      // Log the action
      const action = {
        type: 'addxp',
        user: target.tag,
        userId: target.id,
        amount: amount,
        reason: reason,
        oldLevel: oldLevel,
        newLevel: userData.level,
        moderator: interaction.user.tag,
        moderatorId: interaction.user.id,
      };
      await database.logModerationAction(guildId, action);

    } catch (error) {
      console.error('Error adding XP:', error);
      interaction.reply({ content: '❌ Failed to add XP. Please try again later.', ephemeral: true });
    }
  },
};
