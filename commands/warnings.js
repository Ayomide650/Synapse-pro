const { EmbedBuilder } = require('discord.js');
const database = require('../utils/database');

module.exports = {
  name: 'warnings',
  description: 'Displays all warnings for a specific user.',
  options: [
    {
      name: 'user',
      type: 'USER',
      description: 'The user to view warnings for',
      required: true,
    },
  ],
  async execute(interaction) {
    const member = interaction.options.getMember('user');

    try {
      const guildId = interaction.guild.id;
      const fileName = 'moderation/user_warnings.json';
      const data = await database.read(fileName);
      const warnings = data[guildId]?.[member.id] || [];

      if (warnings.length === 0) {
        return interaction.reply({ content: `${member.user.tag} has no warnings.`, ephemeral: true });
      }

      const embed = new EmbedBuilder()
        .setTitle(`Warnings for ${member.user.tag}`)
        .setColor(warnings.length < 3 ? 'Green' : warnings.length < 5 ? 'Yellow' : 'Red')
        .setDescription(
          warnings
            .map(
              (warn, index) =>
                `**#${index + 1}**\nReason: ${warn.reason}\nModerator: ${warn.moderator}\nDate: ${new Date(
                  warn.timestamp
                ).toLocaleString()}`
            )
            .join('\n\n')
        )
        .setFooter({ text: `Total Warnings: ${warnings.length}` });

      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error('Error fetching warnings:', error);
      interaction.reply({ content: '❌ Failed to fetch warnings. Please try again later.', ephemeral: true });
    }
  },
};
