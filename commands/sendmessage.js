const { PermissionsBitField } = require('discord.js');
const database = require('../utils/database');

module.exports = {
  name: 'sendmessage',
  description: 'Sends a message to a specified channel.',
  options: [
    {
      name: 'channel',
      type: 'CHANNEL',
      description: 'The channel to send the message to',
      required: true,
    },
    {
      name: 'message',
      type: 'STRING',
      description: 'The message to send',
      required: true,
    },
  ],
  async execute(interaction) {
    if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
      return interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
    }

    const channel = interaction.options.getChannel('channel');
    const message = interaction.options.getString('message');

    try {
      const sent = await channel.send(message);
      await interaction.reply({ content: `✅ Message sent to ${channel}`, ephemeral: true });

      
      const messageData = {
        type: 'sendmessage',
        content: message,
        channel: channel.id,
        messageId: sent.id,
        sender: interaction.user.tag,
        senderId: interaction.user.id,
        timestamp: new Date().toISOString(),
      };
      await database.logModerationAction(interaction.guild.id, messageData);
    } catch (error) {
      console.error('Error sending message:', error);
      interaction.reply({ content: '❌ Failed to send message.', ephemeral: true });
    }
  },
};
