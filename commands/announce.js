const { EmbedBuilder, PermissionsBitField } = require('discord.js');
const database = require('../utils/database');

module.exports = {
  name: 'announce',
  description: 'Sends a rich embed announcement.',
  options: [
    {
      name: 'title',
      type: 'STRING',
      description: 'The title of the announcement',
      required: true,
    },
    {
      name: 'message',
      type: 'STRING',
      description: 'The announcement message',
      required: true,
    },
    {
      name: 'channel',
      type: 'CHANNEL',
      description: 'The channel to send the announcement to',
      required: false,
    },
    {
      name: 'color',
      type: 'STRING',
      description: 'The color of the embed (hex code or basic color name)',
      required: false,
      choices: [
        { name: 'Blue', value: 'Blue' },
        { name: 'Red', value: 'Red' },
        { name: 'Green', value: 'Green' },
        { name: 'Yellow', value: 'Yellow' },
        { name: 'Purple', value: 'Purple' },
      ],
    },
  ],
  async execute(interaction) {
    if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      return interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
    }

    const title = interaction.options.getString('title');
    const message = interaction.options.getString('message');
    const channel = interaction.options.getChannel('channel') || interaction.channel;
    const color = interaction.options.getString('color') || 'Blue';

    try {
      const embed = new EmbedBuilder()
        .setTitle(title)
        .setDescription(message)
        .setColor(color)
        .setTimestamp()
        .setFooter({ text: `Announced by ${interaction.user.tag}` });

      const sent = await channel.send({ embeds: [embed] });

      // Log the announcement
      const announcement = {
        type: 'announcement',
        title,
        message,
        color,
        channel: channel.id,
        messageId: sent.id,
        announcer: interaction.user.tag,
        announcerId: interaction.user.id,
        timestamp: new Date().toISOString(),
      };
      await database.logModerationAction(interaction.guild.id, announcement);

      await interaction.reply({ content: `✅ Announcement sent to ${channel}`, ephemeral: true });
    } catch (error) {
      console.error('Error sending announcement:', error);
      interaction.reply({ content: '❌ Failed to send announcement.', ephemeral: true });
    }
  },
};
