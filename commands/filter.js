const { PermissionsBitField } = require('discord.js');
const database = require('../utils/database');

module.exports = {
  name: 'filter',
  description: 'Manages the server word filter.',
  options: [
    {
      name: 'action',
      type: 'STRING',
      description: 'Action to perform (add, remove, list)',
      required: true,
      choices: [
        { name: 'Add', value: 'add' },
        { name: 'Remove', value: 'remove' },
        { name: 'List', value: 'list' },
      ],
    },
    {
      name: 'word',
      type: 'STRING',
      description: 'The word to add or remove (optional for list)',
      required: false,
    },
    {
      name: 'filter_action',
      type: 'STRING',
      description: 'Action to take on match (delete, mute, warn, ban)',
      required: false,
      choices: [
        { name: 'Delete', value: 'delete' },
        { name: 'Mute', value: 'mute' },
        { name: 'Warn', value: 'warn' },
        { name: 'Ban', value: 'ban' },
      ],
    },
  ],
  async execute(interaction) {
    const action = interaction.options.getString('action');
    const word = interaction.options.getString('word');
    const filterAction = interaction.options.getString('filter_action');

    if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      return interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
    }

    try {
      const guildId = interaction.guild.id;
      const fileName = 'features/word_filters.json';
      const data = await database.read(fileName);

      if (!data[guildId]) data[guildId] = [];

      if (action === 'add') {
        if (!word || !filterAction) {
          return interaction.reply({ content: 'You must specify both a word and an action to add.', ephemeral: true });
        }

        data[guildId].push({ word, action: filterAction });
        await database.write(fileName, data);
        return interaction.reply({ content: `✅ Added filter for word "${word}" with action "${filterAction}".` });
      }

      if (action === 'remove') {
        if (!word) {
          return interaction.reply({ content: 'You must specify a word to remove.', ephemeral: true });
        }

        const index = data[guildId].findIndex((filter) => filter.word === word);
        if (index === -1) {
          return interaction.reply({ content: `❌ No filter found for word "${word}".`, ephemeral: true });
        }

        data[guildId].splice(index, 1);
        await database.write(fileName, data);
        return interaction.reply({ content: `✅ Removed filter for word "${word}".` });
      }

      if (action === 'list') {
        if (data[guildId].length === 0) {
          return interaction.reply({ content: 'No filters are currently set.', ephemeral: true });
        }

        const filterList = data[guildId]
          .map((filter, index) => `**#${index + 1}** - Word: "${filter.word}", Action: "${filter.action}"`)
          .join('\n');
        return interaction.reply({ content: `📜 Current Filters:\n${filterList}`, ephemeral: true });
      }
    } catch (error) {
      console.error('Error managing filters:', error);
      interaction.reply({ content: '❌ Failed to manage filters. Please try again later.', ephemeral: true });
    }
  },
};
