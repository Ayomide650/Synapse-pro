
const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const database = require('../utils/database');

module.exports = {
  name: 'autoresponder',
  description: 'Set up automatic responses to specific keywords or phrases',
  data: new SlashCommandBuilder()
    .setName('autoresponder')
    .setDescription('Manage auto-responses to keywords')
    .addSubcommand(subcommand =>
      subcommand
        .setName('add')
        .setDescription('Add a new auto-response')
        .addStringOption(option =>
          option.setName('trigger')
            .setDescription('The keyword or phrase that triggers the response')
            .setRequired(true))
        .addStringOption(option =>
          option.setName('response')
            .setDescription('The message to send when triggered')
            .setRequired(true))
        .addBooleanOption(option =>
          option.setName('exact')
            .setDescription('Whether the trigger must be an exact match (default: false)')
            .setRequired(false)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('remove')
        .setDescription('Remove an auto-response')
        .addStringOption(option =>
          option.setName('trigger')
            .setDescription('The trigger to remove')
            .setRequired(true)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('list')
        .setDescription('List all auto-responses for this server'))
    .addSubcommand(subcommand =>
      subcommand
        .setName('toggle')
        .setDescription('Enable or disable auto-responses for this server')
        .addBooleanOption(option =>
          option.setName('enabled')
            .setDescription('Whether to enable auto-responses')
            .setRequired(true)))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

  async execute(interaction) {
    try {
      await interaction.deferReply();
      
      // Track command usage
      await database.trackCommandUsage('autoresponder', interaction.user.id, interaction.guild.id);

      const subcommand = interaction.options.getSubcommand();
      const guildId = interaction.guild.id;

      switch (subcommand) {
        case 'add':
          await this.handleAdd(interaction, guildId);
          break;
        case 'remove':
          await this.handleRemove(interaction, guildId);
          break;
        case 'list':
          await this.handleList(interaction, guildId);
          break;
        case 'toggle':
          await this.handleToggle(interaction, guildId);
          break;
      }

    } catch (error) {
      console.error('Error in autoresponder command:', error);
      const reply = {
        content: '❌ An error occurred while managing auto-responses.',
        ephemeral: true
      };

      if (interaction.deferred) {
        await interaction.editReply(reply);
      } else {
        await interaction.reply(reply);
      }
    }
  },

  async handleAdd(interaction, guildId) {
    const trigger = interaction.options.getString('trigger').toLowerCase();
    const response = interaction.options.getString('response');
    const exact = interaction.options.getBoolean('exact') || false;

    const data = await database.read('features/autoresponder.json');
    if (!data[guildId]) {
      data[guildId] = { enabled: true, responses: {} };
    }

    data[guildId].responses[trigger] = {
      response: response,
      exact: exact,
      createdBy: interaction.user.id,
      createdAt: new Date().toISOString(),
      uses: 0
    };

    await database.write('features/autoresponder.json', data);

    const embed = new EmbedBuilder()
      .setTitle('✅ Auto-Response Added')
      .setColor(0x00ff00)
      .addFields(
        { name: 'Trigger', value: `\`${trigger}\``, inline: true },
        { name: 'Response', value: response, inline: true },
        { name: 'Exact Match', value: exact ? 'Yes' : 'No', inline: true }
      )
      .setFooter({ text: 'Auto-responses are case-insensitive' });

    await interaction.editReply({ embeds: [embed] });
  },

  async handleRemove(interaction, guildId) {
    const trigger = interaction.options.getString('trigger').toLowerCase();

    const data = await database.read('features/autoresponder.json');
    if (!data[guildId] || !data[guildId].responses[trigger]) {
      return await interaction.editReply({
        content: '❌ That auto-response doesn\'t exist.',
        ephemeral: true
      });
    }

    delete data[guildId].responses[trigger];
    await database.write('features/autoresponder.json', data);

    const embed = new EmbedBuilder()
      .setTitle('🗑️ Auto-Response Removed')
      .setColor(0xff9900)
      .setDescription(`Removed auto-response for trigger: \`${trigger}\``)
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  },

  async handleList(interaction, guildId) {
    const data = await database.read('features/autoresponder.json');
    const guildData = data[guildId];

    if (!guildData || Object.keys(guildData.responses || {}).length === 0) {
      return await interaction.editReply({
        content: '📝 No auto-responses configured for this server.',
        ephemeral: true
      });
    }

    const embed = new EmbedBuilder()
      .setTitle('📋 Auto-Responses')
      .setColor(0x3498db)
      .setDescription(`Status: ${guildData.enabled ? '✅ Enabled' : '❌ Disabled'}`)
      .setFooter({ text: `${Object.keys(guildData.responses).length} auto-responses configured` });

    const responses = Object.entries(guildData.responses);
    const maxPerPage = 10;
    
    for (let i = 0; i < Math.min(responses.length, maxPerPage); i++) {
      const [trigger, data] = responses[i];
      const exactText = data.exact ? ' (exact)' : '';
      const usesText = data.uses ? ` • ${data.uses} uses` : '';
      
      embed.addFields({
        name: `\`${trigger}\`${exactText}`,
        value: `${data.response.substring(0, 100)}${data.response.length > 100 ? '...' : ''}${usesText}`,
        inline: false
      });
    }

    if (responses.length > maxPerPage) {
      embed.setFooter({ text: `Showing ${maxPerPage} of ${responses.length} auto-responses` });
    }

    await interaction.editReply({ embeds: [embed] });
  },

  async handleToggle(interaction, guildId) {
    const enabled = interaction.options.getBoolean('enabled');

    const data = await database.read('features/autoresponder.json');
    if (!data[guildId]) {
      data[guildId] = { enabled: enabled, responses: {} };
    } else {
      data[guildId].enabled = enabled;
    }

    await database.write('features/autoresponder.json', data);

    const embed = new EmbedBuilder()
      .setTitle(`${enabled ? '✅' : '❌'} Auto-Responses ${enabled ? 'Enabled' : 'Disabled'}`)
      .setColor(enabled ? 0x00ff00 : 0xff0000)
      .setDescription(`Auto-responses have been ${enabled ? 'enabled' : 'disabled'} for this server.`)
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  }
};
