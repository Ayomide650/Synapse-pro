const { PermissionsBitField } = require('discord.js');
const database = require('../utils/database');

module.exports = {
  name: 'purge',
  description: 'Bulk deletes messages and logs the action.',
  options: [
    {
      name: 'amount',
      type: 'INTEGER',
      description: 'Number of messages to delete (1-100)',
      required: true,
    },
    {
      name: 'user',
      type: 'USER',
      description: 'Delete messages only from this user (optional)',
      required: false,
    },
    {
      name: 'content_filter',
      type: 'STRING',
      description: 'Filter messages containing specific text (optional)',
      required: false,
    },
  ],
  async execute(interaction) {
    const amount = interaction.options.getInteger('amount');
    const user = interaction.options.getUser('user');
    const contentFilter = interaction.options.getString('content_filter');

    if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
      return interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
    }

    if (amount < 1 || amount > 100) {
      return interaction.reply({ content: 'You can only delete between 1 and 100 messages.', ephemeral: true });
    }

    try {
      const messages = await interaction.channel.messages.fetch({ limit: amount });
      const filteredMessages = messages.filter((msg) => {
        if (user && msg.author.id !== user.id) return false;
        if (contentFilter && !msg.content.includes(contentFilter)) return false;
        return true;
      });

      const deletedMessages = await interaction.channel.bulkDelete(filteredMessages, true);
      await interaction.reply({ content: `✅ Deleted ${deletedMessages.size} messages.`, ephemeral: true });

      // Log the action
      const guildId = interaction.guild.id;
      const action = {
        type: 'purge',
        amount: deletedMessages.size,
        user: user ? user.tag : 'All',
        contentFilter: contentFilter || 'None',
        moderator: interaction.user.tag,
        moderatorId: interaction.user.id,
        timestamp: new Date().toISOString(),
      };
      await database.logModerationAction(guildId, action);
    } catch (error) {
      console.error('Error purging messages:', error);
      interaction.reply({ content: '❌ Failed to purge messages. Please try again later.', ephemeral: true });
    }
  },
};
