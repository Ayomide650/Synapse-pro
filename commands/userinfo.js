const { EmbedBuilder, PermissionsBitField } = require('discord.js');
const database = require('../utils/database');
//
module.exports = {
  name: 'userinfo',
  description: 'Displays comprehensive information about a user.',
  options: [
    {
      name: 'user',
      type: 'USER',
      description: 'The user to get info for',
      required: false,
    },
  ],
  async execute(interaction) {
    const member = interaction.options.getMember('user') || interaction.member;
    const user = member.user;

    const keyPermissions = Object.entries(PermissionsBitField.Flags)
      .filter(([, bit]) => member.permissions.has(bit))
      .map(([name]) => name.split('_').map(word => 
        word.charAt(0) + word.slice(1).toLowerCase()
      ).join(' '))
      .slice(0, 10);

    const activities = member.presence?.activities.map(activity => {
      let text = `${activity.type}: ${activity.name}`;
      if (activity.state) text += ` (${activity.state})`;
      return text;
    }).join('\n') || 'None';

    const embed = new EmbedBuilder()
      .setTitle(`User Info - ${user.tag}`)
      .setThumbnail(user.displayAvatarURL({ dynamic: true, size: 256 }))
      .setColor(member.displayHexColor)
      .addFields([
        { name: 'ID', value: user.id, inline: true },
        { name: 'Nickname', value: member.nickname || 'None', inline: true },
        { name: 'Bot', value: user.bot ? 'Yes' : 'No', inline: true },
        { name: 'Account Created', value: `<t:${Math.floor(user.createdTimestamp / 1000)}:R>`, inline: true },
        { name: 'Joined Server', value: `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>`, inline: true },
        { name: 'Highest Role', value: member.roles.highest.toString(), inline: true },
        { name: `Roles [${member.roles.cache.size - 1}]`, value: member.roles.cache.size > 1 
          ? member.roles.cache.filter(r => r.id !== interaction.guild.id).map(r => r.toString()).join(', ')
          : 'None'
        },
        { name: 'Key Permissions', value: keyPermissions.length ? keyPermissions.join(', ') : 'None' },
        { name: 'Activities', value: activities },
      ]);

    await interaction.reply({ embeds: [embed] });
    
    await database.logCommandUsage(interaction.user.id, interaction.guild.id, interaction.commandName);
  },
};
