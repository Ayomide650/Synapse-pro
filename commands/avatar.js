const { EmbedBuilder } = require('discord.js');
const database = require('../utils/database');

module.exports = {
  name: 'avatar',
  description: 'Displays a user\'s avatar in high quality.',
  options: [
    {
      name: 'user',
      type: 'USER',
      description: 'The user to get avatar for',
      required: false,
    },
    {
      name: 'type',
      type: 'STRING',
      description: 'Avatar type to display',
      required: false,
      choices: [
        { name: 'Global', value: 'global' },
        { name: 'Server', value: 'server' },
      ],
    },
  ],
  async execute(interaction) {
    const member = interaction.options.getMember('user') || interaction.member;
    const type = interaction.options.getString('type') || 'global';

    const avatarURL = type === 'server'
      ? member.displayAvatarURL({ size: 4096, dynamic: true })
      : member.user.displayAvatarURL({ size: 4096, dynamic: true });

    const embed = new EmbedBuilder()
      .setTitle(`${member.user.tag}'s ${type} Avatar`)
      .setImage(avatarURL)
      .setColor(member.displayHexColor)
      .setDescription(
        '**Download Links:**\n' +
        `[PNG](${avatarURL.replace('webp', 'png')}) | ` +
        `[JPG](${avatarURL.replace('webp', 'jpg')}) | ` +
        `[WebP](${avatarURL.replace('png', 'webp')})\n\n` +
        `**Direct URL:**\n${avatarURL}`
      );

    await interaction.reply({ embeds: [embed] });

    
    await database.logCommandUsage(interaction.guild.id, interaction.user.id, this.name);
  },
};
