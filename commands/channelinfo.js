const { EmbedBuilder } = require('discord.js');
const database = require('../utils/database');

module.exports = {
  name: 'channelinfo',
  description: 'Displays information about a channel.',
  options: [
    {
      name: 'channel',
      type: 'CHANNEL',
      description: 'The channel to get info for',
      required: false,
    },
  ],
  async execute(interaction) {
    const channel = interaction.options.getChannel('channel') || interaction.channel;

    const overwrites = channel.permissionOverwrites.cache.map(overwrite => {
      const target = overwrite.type === 'role'
        ? interaction.guild.roles.cache.get(overwrite.id)
        : interaction.guild.members.cache.get(overwrite.id);

      return `${target?.toString() || 'Deleted'}: +${overwrite.allow.toArray().join(', ')} -${overwrite.deny.toArray().join(', ')}`;
    });

    const embed = new EmbedBuilder()
      .setTitle(`#${channel.name}`)
      .setColor('Blue')
      .addFields([
        { name: 'ID', value: channel.id, inline: true },
        { name: 'Type', value: channel.type, inline: true },
        { name: 'Category', value: channel.parent?.name || 'None', inline: true },
        { name: 'Created', value: `<t:${Math.floor(channel.createdTimestamp / 1000)}:R>`, inline: true },
        { name: 'Position', value: `${channel.position}`, inline: true },
        { name: 'Topic', value: channel.topic || 'None' },
        { name: 'Permission Overwrites', value: overwrites.length ? overwrites.join('\n') : 'None' },
      ]);
    //
    await interaction.reply({ embeds: [embed] });
  },
};
