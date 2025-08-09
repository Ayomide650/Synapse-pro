
const database = require('../utils/database');
const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'guildMemberAdd',
  async execute(member) {
    try {
      // Get welcome configuration
      const welcomeConfig = await database.readServerData(member.guild.id, 'welcomeConfig');
      
      if (welcomeConfig.enabled && welcomeConfig.channelId) {
        const channel = member.guild.channels.cache.get(welcomeConfig.channelId);
        if (channel) {
          const embed = new EmbedBuilder()
            .setTitle('Welcome!')
            .setDescription(welcomeConfig.message || `Welcome to the server, ${member}!`)
            .setColor('Green')
            .setThumbnail(member.user.displayAvatarURL())
            .setTimestamp();
          
          await channel.send({ embeds: [embed] });
        }
      }
      
      // Auto-assign roles
      if (welcomeConfig.autoRoles && welcomeConfig.autoRoles.length > 0) {
        for (const roleId of welcomeConfig.autoRoles) {
          const role = member.guild.roles.cache.get(roleId);
          if (role) {
            await member.roles.add(role);
          }
        }
      }
    } catch (error) {
      console.error('Error in guildMemberAdd event:', error);
    }
  },
};
