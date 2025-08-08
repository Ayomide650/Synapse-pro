const { PermissionsBitField } = require('discord.js');
const database = require('../utils/database');

module.exports = {
  name: 'warn',
  description: 'Issues a formal warning to a user and logs it.',
  options: [
    {
      name: 'user',
      type: 'USER',
      description: 'The user to warn',
      required: true,
    },
    {
      name: 'reason',
      type: 'STRING',
      description: 'Reason for the warning',
      required: true,
    },
  ],
  async execute(interaction) {
    const member = interaction.options.getMember('user');
    const reason = interaction.options.getString('reason');

    if (!interaction.member.permissions.has(PermissionsBitField.Flags.ModerateMembers)) {
      return interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
    }

    try {
      const guildId = interaction.guild.id;
      const action = {
        type: 'warn',
        user: member.user.tag,
        userId: member.id,
        moderator: interaction.user.tag,
        moderatorId: interaction.user.id,
        reason: reason,
        timestamp: new Date().toISOString(),
      };

      // Log the warning to the database
      const fileName = 'moderation/user_warnings.json';
      const data = await database.read(fileName);
      if (!data[guildId]) data[guildId] = {};
      if (!data[guildId][member.id]) data[guildId][member.id] = [];
      data[guildId][member.id].push(action);
      await database.write(fileName, data);

      await interaction.reply({ content: `✅ Successfully warned ${member.user.tag} for: ${reason}` });
    } catch (error) {
      console.error('Error issuing warning:', error);
      interaction.reply({ content: '❌ Failed to issue the warning. Please try again later.', ephemeral: true });
    }
  },
};
