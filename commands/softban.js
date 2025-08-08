const { PermissionsBitField } = require('discord.js');
const database = require('../utils/database');

module.exports = {
  name: 'softban',
  description: 'Bans a user and immediately unbans them to delete their messages.',
  options: [
    {
      name: 'user',
      type: 'USER',
      description: 'The user to softban',
      required: true,
    },
    {
      name: 'reason',
      type: 'STRING',
      description: 'Reason for the softban',
      required: false,
    },
  ],
  async execute(interaction) {
    const member = interaction.options.getMember('user');
    const reason = interaction.options.getString('reason') || 'No reason provided';

    if (!interaction.member.permissions.has(PermissionsBitField.Flags.BanMembers)) {
      return interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
    }

    try {
      await member.ban({ days: 7, reason });
      await interaction.guild.members.unban(member.id, 'Softban completed');
      await interaction.reply({ content: `✅ Softbanned ${member.user.tag} for: ${reason}` });

      // Log the action
      const guildId = interaction.guild.id;
      const action = {
        type: 'softban',
        user: member.user.tag,
        userId: member.id,
        moderator: interaction.user.tag,
        moderatorId: interaction.user.id,
        reason: reason,
        timestamp: new Date().toISOString(),
      };
      const fileName = 'moderation/user_warnings.json';
      const data = await database.read(fileName);
      if (!data[guildId]) data[guildId] = [];
      data[guildId].push(action);
      await database.write(fileName, data);
    } catch (error) {
      console.error('Error softbanning user:', error);
      interaction.reply({ content: '❌ Failed to softban the user. Please try again later.', ephemeral: true });
    }
  },
};
