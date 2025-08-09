const { EmbedBuilder } = require('discord.js');
const database = require('../utils/database');

module.exports = {
  name: 'ping',
  description: 'Shows bot latency and performance metrics.',
  async execute(interaction) {
    const startTime = Date.now();

    // Initial response
    await interaction.reply('🏓 Pinging...');

    // Test GitHub sync speed
    const githubStart = Date.now();
    await database.testGitHubConnection();
    const githubPing = Date.now() - githubStart;

    
    const wsPing = interaction.client.ws.ping;
    const botPing = Date.now() - startTime;

    // Color code based on performance
    const getColor = (ms) => {
      if (ms < 100) return 'Green';
      if (ms < 300) return 'Yellow';
      return 'Red';
    };

    const embed = new EmbedBuilder()
      .setTitle('🏓 Pong!')
      .setColor(getColor(wsPing))
      .addFields([
        { name: 'Bot Latency', value: `${botPing}ms`, inline: true },
        { name: 'WebSocket', value: `${wsPing}ms`, inline: true },
        { name: 'GitHub API', value: `${githubPing}ms`, inline: true },
      ])
      .setFooter({ text: 'Performance Indicators: 🟢 Good | 🟡 Fair | 🔴 Poor' });

    await interaction.editReply({ content: null, embeds: [embed] });
  },
};
