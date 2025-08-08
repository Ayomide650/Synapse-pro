const { PermissionsBitField } = require('discord.js');
const database = require('../utils/database');

module.exports = {
  name: 'modlog',
  description: 'Sets the modlog channel for the server.',
  options: [
    {
      name: 'channel',
      type: 'CHANNEL',
      description: 'The channel to set as the modlog',
      required: true,
    },
  ],
  async execute(interaction) {
    const channel = interaction.options.getChannel('channel');

    if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      return interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
    }

    try {
      const guildId = interaction.guild.id;
      const fileName = 'moderation/server_configs.json';
      const data = await database.read(fileName);

      if (!data[guildId]) data[guildId] = {};
      data[guildId].modLogChannel = channel.id;

      await database.write(fileName, data);
      await interaction.reply({ content: `✅ Modlog channel set to ${channel.name}.` });
    } catch (error) {
      console.error('Error setting modlog channel:', error);
      interaction.reply({ content: '❌ Failed to set the modlog channel. Please try again later.', ephemeral: true });
    }
  },
};
