const { EmbedBuilder } = require('discord.js');
const ms = require('ms');
const database = require('../utils/database');

module.exports = {
  name: 'timer',
  description: 'Starts a countdown timer in the channel.',
  options: [
    {
      name: 'duration',
      type: 'STRING',
      description: 'Timer duration (e.g., 1h, 30m, 2d)',
      required: true,
    },
    {
      name: 'message',
      type: 'STRING',
      description: 'Message to show when timer completes',
      required: false,
    },
  ],
  async execute(interaction) {
    const durationStr = interaction.options.getString('duration');
    const message = interaction.options.getString('message') || 'Timer completed!';

    const duration = ms(durationStr);
    if (!duration || duration < 1000 || duration > 7 * 24 * 60 * 60 * 1000) {
      return interaction.reply({ 
        content: 'Please provide a valid duration between 1 second and 7 days.',
        ephemeral: true 
      });
    }

    const embed = new EmbedBuilder()
      .setTitle('⏰ Timer Started')
      .setColor('Blue')
      .setDescription('Time remaining: Calculating...')
      .setFooter({ text: `Set by ${interaction.user.tag}` });

    const reply = await interaction.reply({ embeds: [embed], fetchReply: true });

    // Store timer data
    const timer = {
      messageId: reply.id,
      channelId: interaction.channel.id,
      guildId: interaction.guild.id,
      endTime: Date.now() + duration,
      message: message,
      creator: interaction.user.tag,
      creatorId: interaction.user.id,
    };

    await database.write('features/timers.json', timer);

    // Update timer every minute
    const updateInterval = setInterval(async () => {
      const remaining = timer.endTime - Date.now();
      
      if (remaining <= 0) {
        clearInterval(updateInterval);
        const completionEmbed = new EmbedBuilder()
          .setTitle('⏰ Timer Completed!')
          .setColor('Green')
          .setDescription(message)
          .setFooter({ text: `Set by ${interaction.user.tag}` });

        await reply.edit({ embeds: [completionEmbed] });
        return;
      }

      const updatedEmbed = new EmbedBuilder()
        .setTitle('⏰ Timer Running')
        .setColor('Blue')
        .setDescription(`Time remaining: ${ms(remaining, { long: true })}`)
        .setFooter({ text: `Set by ${interaction.user.tag}` });

      await reply.edit({ embeds: [updatedEmbed] });
    }, 60000); // Update every minute
  },
};
