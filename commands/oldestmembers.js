const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'oldestmembers',
  description: 'Lists the members with the oldest Discord accounts.',
  options: [
    {
      name: 'count',
      type: 'INTEGER',
      description: 'Number of members to show (default: 10, max: 25)',
      required: false,
      min_value: 1,
      max_value: 25,
    },
  ],
  async execute(interaction) {
    const count = Math.min(interaction.options.getInteger('count') || 10, 25);
    
    const members = [...interaction.guild.members.cache.values()]
      .sort((a, b) => a.user.createdTimestamp - b.user.createdTimestamp)
      .slice(0, count);

    const embed = new EmbedBuilder()
      .setTitle(`${count} Oldest Discord Accounts`)
      .setColor('Blue')
      .setDescription(
        members.map((member, index) => 
          `${index + 1}. ${member.user.tag}\n` +
          `Created: <t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`
        ).join('\n\n')
      );

    await interaction.reply({ embeds: [embed] });
  },
};
