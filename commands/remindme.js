const { EmbedBuilder } = require('discord.js');
const ms = require('ms');
const database = require('../utils/database');

module.exports = {
  name: 'remindme',
  description: 'Sets a personal reminder via DM.',
  options: [
    {
      name: 'duration',
      type: 'STRING',
      description: 'When to remind you (e.g., 1h30m, 2d)',
      required: true,
    },
    {
      name: 'message',
      type: 'STRING',
      description: 'What to remind you about',
      required: true,
    },
  ],
  async execute(interaction) {
    const durationStr = interaction.options.getString('duration');
    const message = interaction.options.getString('message');

    const duration = ms(durationStr);
    if (!duration || duration < 60000 || duration > 30 * 24 * 60 * 60 * 1000) {
      return interaction.reply({ 
        content: 'Please provide a valid duration between 1 minute and 30 days.',
        ephemeral: true 
      });
    }

    try {
      const reminderTime = Date.now() + duration;
      
      // Store reminder
      const reminder = {
        userId: interaction.user.id,
        channelId: interaction.channel.id,
        guildId: interaction.guild.id,
        message: message,
        setAt: Date.now(),
        remindAt: reminderTime,
      };

      const data = await database.read('features/reminders.json');
      if (!Array.isArray(data.reminders)) data.reminders = [];
      data.reminders.push(reminder);
      await database.write('features/reminders.json', data);

      const embed = new EmbedBuilder()
        .setTitle('⏰ Reminder Set')
        .setColor('Green')
        .setDescription(
          `I'll remind you in ${ms(duration, { long: true })}:\n` +
          `> ${message}\n\n` +
          `Reminder will be sent <t:${Math.floor(reminderTime / 1000)}:R>`
        );

      await interaction.reply({ embeds: [embed], ephemeral: true });

      // Set timeout for reminder
      setTimeout(async () => {
        try {
          const reminderEmbed = new EmbedBuilder()
            .setTitle('⏰ Reminder')
            .setColor('Blue')
            .setDescription(
              `You asked me to remind you:\n` +
              `> ${message}\n\n` +
              `Reminder set: <t:${Math.floor(Date.now() / 1000)}:R>`
            );

          await interaction.user.send({ embeds: [reminderEmbed] });
        } catch (error) {
          console.error('Failed to send reminder DM:', error);
        }
      }, duration);

    } catch (error) {
      console.error('Error setting reminder:', error);
      interaction.reply({ 
        content: '❌ Failed to set reminder. Please try again later.',
        ephemeral: true 
      });
    }
  },
};
