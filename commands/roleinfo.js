const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const database = require('../utils/database');
//
module.exports = {
  name: 'roleinfo',
  description: 'Displays information about a role.',
  options: [
    {
      name: 'role',
      type: 'ROLE',
      description: 'The role to get info for',
      required: true,
    },
  ],
  async execute(interaction) {
    const role = interaction.options.getRole('role');
    const permissions = role.permissions.toArray().map(perm => 
      perm.split('_').map(word => 
        word.charAt(0) + word.slice(1).toLowerCase()
      ).join(' ')
    );

    const embed = new EmbedBuilder()
      .setTitle(`Role Info - ${role.name}`)
      .setColor(role.color || 'Grey')
      .addFields([
        { name: 'ID', value: role.id, inline: true },
        { name: 'Color', value: role.hexColor, inline: true },
        { name: 'Position', value: `${role.position}`, inline: true },
        { name: 'Members', value: `${role.members.size}`, inline: true },
        { name: 'Mentionable', value: role.mentionable ? 'Yes' : 'No', inline: true },
        { name: 'Hoisted', value: role.hoist ? 'Yes' : 'No', inline: true },
        { name: 'Created', value: `<t:${Math.floor(role.createdTimestamp / 1000)}:R>`, inline: true },
        { name: 'Permissions', value: permissions.length ? permissions.join(', ') : 'None' },
      ]);

    await interaction.reply({ embeds: [embed] });
  },
};
