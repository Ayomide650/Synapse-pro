const { EmbedBuilder, version } = require('discord.js');
const database = require('../utils/database');

module.exports = {
  name: 'botinfo',
  description: 'Shows detailed bot information and statistics.',
  async execute(interaction) {
    const stats = await database.getStats();
    const commandStats = await database.read('features/command_stats.json');
    const todayKey = new Date().toISOString().split('T')[0];

    const embed = new EmbedBuilder()
      .setTitle('🤖 Bot Information')
      .setColor('Blue')
      .addFields([
        { 
          name: 'Version', 
          value: stats.version, 
          inline: true 
        },
        { 
          name: 'Discord.js', 
          value: version, 
          inline: true 
        },
        { 
          name: 'Node.js', 
          value: process.version, 
          inline: true 
        },
        {
          name: 'Servers',
          value: interaction.client.guilds.cache.size.toString(),
          inline: true
        },
        {
          name: 'Users',
          value: interaction.client.users.cache.size.toString(),
          inline: true
        },
        {
          name: 'Commands Today',
          value: (commandStats[todayKey]?.total || 0).toString(),
          inline: true
        },
        {
          name: 'GitHub Repository',
          value: `[${stats.githubRepo}](https://github.com/${stats.githubRepo})`,
          inline: true
        },
        {
          name: 'Database Size',
          value: `${(stats.totalSize / 1024).toFixed(2)} KB`,
          inline: true
        },
        {
          name: 'Files Tracked',
          value: stats.totalFiles.toString(),
          inline: true
        }
      ]);

    await interaction.reply({ embeds: [embed] });
  },
};
