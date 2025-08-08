const { EmbedBuilder } = require('discord.js');
const database = require('../utils/database');
const os = require('os');

module.exports = {
  name: 'uptime',
  description: 'Shows bot uptime and system statistics.',
  async execute(interaction) {
    const stats = await database.getStats();
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;

    const embed = new EmbedBuilder()
      .setTitle('⏰ System Uptime')
      .setColor('Blue')
      .addFields([
        { 
          name: 'Bot Uptime', 
          value: formatUptime(stats.uptime), 
          inline: true 
        },
        { 
          name: 'Last Restart', 
          value: `<t:${Math.floor(Date.now() - stats.uptime)/1000}:R>`,
          inline: true 
        },
        { 
          name: 'System Uptime', 
          value: formatUptime(os.uptime() * 1000), 
          inline: true 
        },
        {
          name: 'Memory Usage',
          value: `${formatBytes(usedMem)} / ${formatBytes(totalMem)}`,
          inline: true
        },
        {
          name: 'Last GitHub Sync',
          value: stats.lastGitHubSync ? `<t:${Math.floor(new Date(stats.lastGitHubSync).getTime()/1000)}:R>` : 'Never',
          inline: true
        }
      ]);

    await interaction.reply({ embeds: [embed] });
  },
};

function formatUptime(ms) {
  const days = Math.floor(ms / (24 * 60 * 60 * 1000));
  const hours = Math.floor((ms % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
  const minutes = Math.floor((ms % (60 * 60 * 1000)) / (60 * 1000));
  return `${days}d ${hours}h ${minutes}m`;
}

function formatBytes(bytes) {
  const gb = bytes / (1024 * 1024 * 1024);
  return `${gb.toFixed(2)} GB`;
}
