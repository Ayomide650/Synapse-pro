const { EmbedBuilder } = require('discord.js');
const database = require('../utils/database');

module.exports = {
  name: 'serverinfo',
  description: 'Displays detailed information about the server.',
  async execute(interaction) {
    const guild = interaction.guild;
    const owner = await guild.fetchOwner();
    const stats = await database.readServerData(guild.id, 'stats');

    // Get feature list with emojis
    const features = guild.features.map(feature => 
      `${feature.split('_').map(word => 
        word.charAt(0) + word.slice(1).toLowerCase()
      ).join(' ')} ✅`
    );

    const embed = new EmbedBuilder()
      .setTitle(guild.name)
      .setColor('Blue')
      .setThumbnail(guild.iconURL({ dynamic: true, size: 256 }))
      .addFields([
        { name: 'Owner', value: owner.user.tag, inline: true },
        { name: 'Created', value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:R>`, inline: true },
        { name: 'Boost Level', value: `Level ${guild.premiumTier}`, inline: true },
        { name: 'Members', value: `Total: ${guild.memberCount}\nOnline: ${guild.members.cache.filter(m => m.presence?.status !== 'offline').size}`, inline: true },
        { name: 'Channels', value: `Text: ${guild.channels.cache.filter(c => c.isTextBased()).size}\nVoice: ${guild.channels.cache.filter(c => c.isVoiceBased()).size}`, inline: true },
        { name: 'Roles', value: `${guild.roles.cache.size}`, inline: true },
        { name: 'Features', value: features.length ? features.join('\n') : 'None' },
      ]);

    if (guild.bannerURL()) {
      embed.setImage(guild.bannerURL({ size: 4096 }));
    }

    await interaction.reply({ embeds: [embed] });
  },
};
