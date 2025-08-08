const { PermissionsBitField } = require('discord.js');
const database = require('../utils/database');

module.exports = {
  name: 'recreate',
  description: 'Deletes and recreates a channel with the same permissions.',
  options: [
    {
      name: 'channel',
      type: 'CHANNEL',
      description: 'The channel to recreate',
      required: true,
    },
    {
      name: 'reason',
      type: 'STRING',
      description: 'Reason for recreating the channel',
      required: false,
    },
  ],
  async execute(interaction) {
    if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
      return interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
    }

    const channel = interaction.options.getChannel('channel');
    const reason = interaction.options.getString('reason') || 'No reason provided';

    try {
      // Store channel data
      const channelData = {
        name: channel.name,
        type: channel.type,
        position: channel.position,
        topic: channel.topic,
        nsfw: channel.nsfw,
        bitrate: channel.bitrate,
        userLimit: channel.userLimit,
        rateLimitPerUser: channel.rateLimitPerUser,
        parent: channel.parentId,
        permissionOverwrites: channel.permissionOverwrites.cache.toJSON(),
      };

      // Delete channel
      await channel.delete(`Channel recreate: ${reason}`);

      // Create new channel
      const newChannel = await interaction.guild.channels.create({
        name: channelData.name,
        type: channelData.type,
        position: channelData.position,
        topic: channelData.topic,
        nsfw: channelData.nsfw,
        bitrate: channelData.bitrate,
        userLimit: channelData.userLimit,
        rateLimitPerUser: channelData.rateLimitPerUser,
        parent: channelData.parent,
        permissionOverwrites: channelData.permissionOverwrites,
      });

      // Log action
      const action = {
        type: 'recreate',
        channel: channelData.name,
        channelId: channel.id,
        newChannelId: newChannel.id,
        reason: reason,
        moderator: interaction.user.tag,
        moderatorId: interaction.user.id,
      };
      await database.logModerationAction(interaction.guild.id, action);

      await interaction.reply({ content: `✅ Channel ${channelData.name} has been recreated.` });
    } catch (error) {
      console.error('Error recreating channel:', error);
      interaction.reply({ content: '❌ Failed to recreate channel.', ephemeral: true });
    }
  },
};
