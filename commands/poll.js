const { EmbedBuilder } = require('discord.js');
const database = require('../utils/database');

module.exports = {
  name: 'poll',
  description: 'Creates a reaction-based poll.',
  options: [
    {
      name: 'question',
      type: 'STRING',
      description: 'The poll question',
      required: true,
    },
    ...[...Array(10)].map((_, i) => ({
      name: `option${i + 1}`,
      type: 'STRING',
      description: `Poll option ${i + 1}`,
      required: i < 2, // First 2 options required
    })),
    {
      name: 'duration',
      type: 'STRING',
      description: 'Poll duration (e.g., 1h, 1d) - optional',
      required: false,
    },
  ],
  async execute(interaction) {
    const question = interaction.options.getString('question');
    const duration = interaction.options.getString('duration');
    const options = [];

    // Collect all provided options
    for (let i = 1; i <= 10; i++) {
      const option = interaction.options.getString(`option${i}`);
      if (option) options.push(option);
    }

    const reactions = ['🇦', '🇧', '🇨', '🇩', '🇪', '🇫', '🇬', '🇭', '🇮', '🇯'];
    const pollOptions = options.map((opt, i) => `${reactions[i]} ${opt}`).join('\n\n');

    const embed = new EmbedBuilder()
      .setTitle('📊 ' + question)
      .setDescription(pollOptions)
      .setColor('Blue')
      .setFooter({ text: `Poll by ${interaction.user.tag}` });

    if (duration) {
      embed.setTimestamp(Date.now() + ms(duration));
    }

    try {
      const pollMessage = await interaction.channel.send({ embeds: [embed] });

      // Add reactions
      for (let i = 0; i < options.length; i++) {
        await pollMessage.react(reactions[i]);
      }

      // Store poll data
      const pollData = {
        type: 'poll',
        question,
        options,
        messageId: pollMessage.id,
        channelId: interaction.channel.id,
        creator: interaction.user.tag,
        creatorId: interaction.user.id,
        timestamp: new Date().toISOString(),
        duration: duration || null,
      };
      await database.write('features/polls.json', pollData);

      await interaction.reply({ content: '✅ Poll created!', ephemeral: true });

      // Set up auto-end if duration specified
      if (duration) {
        setTimeout(async () => {
          const msg = await interaction.channel.messages.fetch(pollMessage.id).catch(() => null);
          if (msg) {
            const results = options.map((opt, i) => {
              const reaction = msg.reactions.cache.get(reactions[i]);
              return `${reactions[i]} ${opt}: ${reaction?.count - 1 || 0} votes`;
            }).join('\n');

            const resultsEmbed = new EmbedBuilder()
              .setTitle('📊 Poll Results: ' + question)
              .setDescription(results)
              .setColor('Green')
              .setFooter({ text: 'Poll ended' });

            await msg.edit({ embeds: [resultsEmbed] });
          }
        }, ms(duration));
      }
    } catch (error) {
      console.error('Error creating poll:', error);
      interaction.reply({ content: '❌ Failed to create poll.', ephemeral: true });
    }
  },
};
