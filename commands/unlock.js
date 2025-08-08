const { PermissionsBitField } = require('discord.js');
const database = require('../utils/database');

module.exports = {
  name: 'unlock',
  description: 'Unlocks a channel by restoring SEND_MESSAGES permission for @everyone.',
  options: [
    {
      name: 'channel',
      type: 'CHANNEL',
      description: 'The channel to unlock',
      required: true,
    },
  ],
  async execute(interaction) {
    const channel = interaction.options.getChannel('channel');

    if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
      return interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
    }

    try {
      const guildId = interaction.guild.id;
      const fileName = 'moderation/server_configs.json';
      const data = await database.read(fileName);

      if (!data[guildId]?.lockedChannels?.[channel.id]) {
        return interaction.reply({ content: `This channel is not locked.`, ephemeral: true });
      }

      const { allow, deny } = data[guildId].lockedChannels[channel.id];
      await channel.permissionOverwrites.edit(interaction.guild.roles.everyone, { allow, deny });
      delete data[guildId].lockedChannels[channel.id];
      await database.write(fileName, data);

      await interaction.reply({ content: `✅ Unlocked ${channel.name} for @everyone.` });

      // Announce in the channel
      await channel.send(`🔓 This channel has been unlocked.`);
    } catch (error) {
      console.error('Error unlocking channel:', error);
      interaction.reply({ content: '❌ Failed to unlock the channel. Please try again later.', ephemeral: true });
    }
  },
};
