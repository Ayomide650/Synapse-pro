const { EmbedBuilder } = require('discord.js');
const database = require('../utils/database');

module.exports = {
  name: 'level',
  description: 'Shows the current level and XP for a user.',
  options: [
    {
      name: 'user',
      type: 'USER',
      description: 'The user to check the level for',
      required: false,
    },
  ],
  async execute(interaction) {
    const target = interaction.options.getUser('user') || interaction.user;

    try {
      const guildId = interaction.guild.id;
      const fileName = 'leveling/user_levels.json';
      const data = await database.read(fileName);

      const userData = data[guildId]?.[target.id] || { xp: 0, level: 1, totalXp: 0 };
      const xpForNextLevel = Math.pow(userData.level, 2) * 100;
      const progress = Math.floor((userData.xp / xpForNextLevel) * 20);

      const embed = new EmbedBuilder()
        .setTitle(`${target.username}'s Level`)
        .setColor('Blue')
        .setDescription(
          `**Level**: ${userData.level}\n` +
          `**XP**: ${userData.xp}/${xpForNextLevel}\n` +
          `**Progress**: [${'█'.repeat(progress)}${'░'.repeat(20 - progress)}]`
        )
        .setFooter({ text: `Keep engaging to level up!` });

      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error('Error fetching level data:', error);
      interaction.reply({ content: '❌ Failed to fetch level data. Please try again later.', ephemeral: true });
    }
  },
};
