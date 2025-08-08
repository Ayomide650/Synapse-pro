const { PermissionsBitField } = require('discord.js');
const database = require('../utils/database');

module.exports = {
  name: 'unmute',
  description: 'Removes mute role or timeout from a user and logs the action.',
  options: [
    {
      name: 'user',
      type: 'USER',
      description: 'The user to unmute',
      required: true,
    },
  ],
  async execute(interaction) {
    const member = interaction.options.getMember('user');

    if (!interaction.member.permissions.has(PermissionsBitField.Flags.ModerateMembers)) {
      return interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
    }

    if (!member.isCommunicationDisabled()) {
      return interaction.reply({ content: 'This user is not currently muted.', ephemeral: true });
    }

    try {
      await member.timeout(null); // Remove timeout
      await interaction.reply({ content: `✅ Successfully unmuted ${member.user.tag}` });

      // Log the action to the database
      const guildId = interaction.guild.id;
      const action = {
        type: 'unmute',
        user: member.user.tag,
        userId: member.id,
        moderator: interaction.user.tag,
        moderatorId: interaction.user.id,
      };
      await database.logModerationAction(guildId, action);
    } catch (error) {
      console.error('Error unmuting user:', error);
      interaction.reply({ content: '❌ Failed to unmute the user. Please try again later.', ephemeral: true });
    }
  },
};
