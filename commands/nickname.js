const { PermissionsBitField } = require('discord.js');
const database = require('../utils/database');

module.exports = {
  name: 'nickname',
  description: 'Changes a user\'s nickname.',
  options: [
    {
      name: 'user',
      type: 'USER',
      description: 'The user to change nickname for',
      required: true,
    },
    {
      name: 'nickname',
      type: 'STRING',
      description: 'New nickname (leave empty to reset)',
      required: false,
    },
  ],
  async execute(interaction) {
    if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageNicknames)) {
      return interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
    }

    const member = interaction.options.getMember('user');
    const newNickname = interaction.options.getString('nickname');

    if (!member.manageable) {
      return interaction.reply({ content: 'I cannot modify this user\'s nickname. Their role might be higher than mine.', ephemeral: true });
    }

    try {
      const oldNickname = member.nickname;
      await member.setNickname(newNickname || null);

      
      const action = {
        type: 'nickname',
        user: member.user.tag,
        userId: member.id,
        oldNickname: oldNickname || member.user.username,
        newNickname: newNickname || member.user.username,
        moderator: interaction.user.tag,
        moderatorId: interaction.user.id,
      };
      await database.logModerationAction(interaction.guild.id, action);

      await interaction.reply({
        content: newNickname
          ? `✅ Changed ${member.user.tag}'s nickname to: ${newNickname}`
          : `✅ Reset ${member.user.tag}'s nickname`,
      });
    } catch (error) {
      console.error('Error changing nickname:', error);
      interaction.reply({ content: '❌ Failed to change nickname.', ephemeral: true });
    }
  },
};
