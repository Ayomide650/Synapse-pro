const { PermissionsBitField } = require('discord.js');
const database = require('../utils/database');

module.exports = {
  name: 'lock',
  description: 'Locks a channel by removing SEND_MESSAGES permission from @everyone.',
  options: [
    {
      name: 'channel',
      type: 'CHANNEL',
      description: 'The channel to lock',
      required: true,
    },
    {
      name: 'reason',
      type: 'STRING',
      description: 'Reason for locking the channel',
      required: false,
    },
  ],
  async execute(interaction) {
    const channel = interaction.options.getChannel('channel');
    const reason = interaction.options.getString('reason') || 'No reason provided';

    if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
      return interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
    }

    try {
      const originalPermissions = channel.permissionOverwrites.cache.get(interaction.guild.roles.everyone.id);
      const originalAllow = originalPermissions?.allow.bitfield || 0;
      const originalDeny = originalPermissions?.deny.bitfield || 0;

      await channel.permissionOverwrites.edit(interaction.guild.roles.everyone, { SEND_MESSAGES: false });
      await interaction.reply({ content: `✅ Locked ${channel.name} for @everyone. Reason: ${reason}` });

      // Log the action and store original permissions
      const guildId = interaction.guild.id;
      const fileName = 'moderation/server_configs.json';
      const data = await database.read(fileName);
      if (!data[guildId]) data[guildId] = { lockedChannels: {} };
      data[guildId].lockedChannels[channel.id] = { allow: originalAllow, deny: originalDeny };
      await database.write(fileName, data);

      // Announce in the channel
      await channel.send(`🔒 This channel has been locked. Reason: ${reason}`);
    } catch (error) {
      console.error('Error locking channel:', error);
      interaction.reply({ content: '❌ Failed to lock the channel. Please try again later.', ephemeral: true });
    }
  },
};
