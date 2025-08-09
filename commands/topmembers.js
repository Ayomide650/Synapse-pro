
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const database = require('../utils/database');

module.exports = {
  name: 'topmembers',
  description: 'Display the most active members ranked by messages or voice activity',
  data: new SlashCommandBuilder()
    .setName('topmembers')
    .setDescription('Show the most active members by messages or voice time')
    .addStringOption(option =>
      option.setName('type')
        .setDescription('Type of activity to rank by')
        .setRequired(false)
        .addChoices(
          { name: 'Messages', value: 'messages' },
          { name: 'Voice Time', value: 'voice' },
          { name: 'Both', value: 'both' }
        ))
    .addIntegerOption(option =>
      option.setName('count')
        .setDescription('Number of members to show (1-25)')
        .setRequired(false)
        .setMinValue(1)
        .setMaxValue(25)),

  async execute(interaction) {
    try {
      await interaction.deferReply();

      const type = interaction.options.getString('type') || 'messages';
      const count = interaction.options.getInteger('count') || 10;

      // Track command usage
      await database.trackCommandUsage('topmembers', interaction.user.id, interaction.guild.id);

      // Read activity data
      const activityData = await database.read('features/member_activity.json');
      const guildData = activityData[interaction.guild.id] || {};

      let topMembers = [];

      if (type === 'messages' || type === 'both') {
        const messageStats = guildData.messages || {};
        const messageLeaders = Object.entries(messageStats)
          .sort(([,a], [,b]) => (b.count || 0) - (a.count || 0))
          .slice(0, count);

        topMembers = messageLeaders.map(([userId, data]) => ({
          userId,
          messages: data.count || 0,
          voiceTime: guildData.voice?.[userId]?.totalTime || 0
        }));
      }

      if (type === 'voice') {
        const voiceStats = guildData.voice || {};
        const voiceLeaders = Object.entries(voiceStats)
          .sort(([,a], [,b]) => (b.totalTime || 0) - (a.totalTime || 0))
          .slice(0, count);

        topMembers = voiceLeaders.map(([userId, data]) => ({
          userId,
          messages: guildData.messages?.[userId]?.count || 0,
          voiceTime: data.totalTime || 0
        }));
      }

      const embed = new EmbedBuilder()
        .setTitle(`🏆 Top ${count} Most Active Members`)
        .setColor(0xffd700)
        .setDescription(this.getTypeDescription(type))
        .setFooter({ text: `Activity tracking • ${topMembers.length} members shown` })
        .setTimestamp();

      if (topMembers.length === 0) {
        embed.addFields({
          name: '📊 No Data',
          value: 'No activity data found for this server. Activity tracking starts when members send messages or join voice channels.',
          inline: false
        });
      } else {
        const description = await this.formatMemberList(topMembers, type, interaction.guild);
        embed.setDescription(description);
      }

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error('Error in topmembers command:', error);
      const reply = {
        content: '❌ Failed to fetch member activity data. Please try again.',
        ephemeral: true
      };

      if (interaction.deferred) {
        await interaction.editReply(reply);
      } else {
        await interaction.reply(reply);
      }
    }
  },

  async formatMemberList(topMembers, type, guild) {
    const lines = [];
    
    for (let i = 0; i < topMembers.length; i++) {
      const member = topMembers[i];
      const user = await guild.members.fetch(member.userId).catch(() => null);
      const username = user ? user.displayName : 'Unknown User';
      
      const medal = this.getMedal(i);
      
      if (type === 'messages') {
        lines.push(`${medal} **${username}** - ${member.messages.toLocaleString()} messages`);
      } else if (type === 'voice') {
        const hours = Math.floor(member.voiceTime / 3600000);
        const minutes = Math.floor((member.voiceTime % 3600000) / 60000);
        lines.push(`${medal} **${username}** - ${hours}h ${minutes}m voice time`);
      } else {
        const hours = Math.floor(member.voiceTime / 3600000);
        const minutes = Math.floor((member.voiceTime % 3600000) / 60000);
        lines.push(`${medal} **${username}** - ${member.messages.toLocaleString()} msgs, ${hours}h ${minutes}m voice`);
      }
    }
    
    return lines.join('\n');
  },

  getMedal(index) {
    const medals = ['🥇', '🥈', '🥉'];
    return medals[index] || `${index + 1}.`;
  },

  getTypeDescription(type) {
    const descriptions = {
      messages: '📝 Ranked by total messages sent',
      voice: '🎤 Ranked by total voice channel time',
      both: '📊 Showing both message and voice activity'
    };
    return descriptions[type] || '';
  }
};
