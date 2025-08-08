const { EmbedBuilder } = require('discord.js');
const database = require('../utils/database');

module.exports = {
  name: 'xp',
  description: 'Shows detailed XP information for a user.',
  options: [
    {
      name: 'user',
      type: 'USER',
      description: 'The user to check XP for',
      required: false,
    },
  ],
  async execute(interaction) {
    const target = interaction.options.getUser('user') || interaction.user;

    try {
      const guildId = interaction.guild.id;
      const fileName = 'leveling/user_levels.json';
      const data = await database.read(fileName);

      const userData = data[guildId]?.[target.id] || { xp: 0, level: 1, totalXp: 0, lastActivity: null };
      const xpForNextLevel = Math.pow(userData.level, 2) * 100;
      const timeToNextLevel = ((xpForNextLevel - userData.xp) / 20).toFixed(2); // Assuming 20 XP per message

      const embed = new EmbedBuilder()
        .setTitle(`${target.username}'s XP Details`)
        .setColor('Green')
        .setDescription(
          `**Total XP**: ${userData.totalXp}\n` +
          `**Current Level**: ${userData.level}\n` +
          `**XP for Next Level**: ${xpForNextLevel - userData.xp}\n` +
          `**Estimated Time to Next Level**: ${timeToNextLevel} messages\n` +
          `**Last Activity**: ${userData.lastActivity ? new Date(userData.lastActivity).toLocaleString() : 'No activity yet'}`
        )
        .setFooter({ text: `Keep engaging to earn more XP!` });

      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error('Error fetching XP data:', error);
      interaction.reply({ content: '❌ Failed to fetch XP data. Please try again later.', ephemeral: true });
    }
  },
};
