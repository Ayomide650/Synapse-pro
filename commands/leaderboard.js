const { EmbedBuilder } = require('discord.js');
const database = require('../utils/database');

module.exports = {
  name: 'leaderboard',
  description: 'Displays the server XP leaderboard.',
  options: [
    {
      name: 'page',
      type: 'INTEGER',
      description: 'The page number to view (10 users per page)',
      required: false,
    },
  ],
  async execute(interaction) {
    const page = interaction.options.getInteger('page') || 1;
    const usersPerPage = 10;

    try {
      const guildId = interaction.guild.id;
      const fileName = 'leveling/user_levels.json';
      const data = await database.read(fileName);

      const guildData = data[guildId] || {};
      const sortedUsers = Object.entries(guildData)
        .map(([userId, userData]) => ({ userId, ...userData }))
        .sort((a, b) => b.totalXp - a.totalXp);

      const totalPages = Math.ceil(sortedUsers.length / usersPerPage);
      if (page < 1 || page > totalPages) {
        return interaction.reply({ content: `Invalid page number. Please choose a page between 1 and ${totalPages}.`, ephemeral: true });
      }

      const startIndex = (page - 1) * usersPerPage;
      const leaderboard = sortedUsers.slice(startIndex, startIndex + usersPerPage);

      const embed = new EmbedBuilder()
        .setTitle(`🏆 Server XP Leaderboard (Page ${page}/${totalPages})`)
        .setColor('Gold')
        .setDescription(
          leaderboard
            .map((user, index) => {
              const rank = startIndex + index + 1;
              const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : '';
              const userTag = interaction.guild.members.cache.get(user.userId)?.user.tag || 'Unknown User';
              return `${medal} **#${rank}** - ${userTag}\nLevel: ${user.level}, XP: ${user.totalXp}`;
            })
            .join('\n\n')
        )
        .setFooter({ text: `Requested by ${interaction.user.tag}` });

      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error('Error fetching leaderboard data:', error);
      interaction.reply({ content: '❌ Failed to fetch leaderboard data. Please try again later.', ephemeral: true });
    }
  },
};
