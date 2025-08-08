const { EmbedBuilder } = require('discord.js');
const database = require('../utils/database');

module.exports = {
  name: 'levelroles',
  description: 'Shows all configured level roles.',
  async execute(interaction) {
    try {
      const guildId = interaction.guild.id;
      const fileName = 'leveling/level_roles_config.json';
      const data = await database.read(fileName);

      if (!data[guildId] || Object.keys(data[guildId]).length === 0) {
        return interaction.reply({ content: 'No level roles configured.', ephemeral: true });
      }

      // Sort roles by level requirement
      const sortedRoles = Object.entries(data[guildId])
        .sort(([levelA], [levelB]) => Number(levelA) - Number(levelB));

      const embed = new EmbedBuilder()
        .setTitle('📊 Level Roles')
        .setColor('Blue')
        .setDescription(
          sortedRoles.map(([level, roleId]) => {
            const role = interaction.guild.roles.cache.get(roleId);
            if (!role) return null;

            const userHasLevel = false; // TODO: Check user's actual level
            const emoji = userHasLevel ? '✅' : '❌';
            const color = role.hexColor === '#000000' ? '#99AAB5' : role.hexColor;

            return `${emoji} Level **${level}** → <@&${roleId}>`
              + `\n\`${role.name}\` (${color})`;
          })
          .filter(Boolean)
          .join('\n\n')
        )
        .setFooter({ text: 'Keep chatting to earn roles!' });

      await interaction.reply({ embeds: [embed] });

    } catch (error) {
      console.error('Error listing level roles:', error);
      interaction.reply({ content: '❌ Failed to list level roles.', ephemeral: true });
    }
  },
};
