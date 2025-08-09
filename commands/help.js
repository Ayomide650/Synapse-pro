const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const database = require('../utils/database');
const path = require('path');
const fs = require('fs');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Get help for a command')
    .addStringOption(option =>
      option.setName('command')
        .setDescription('Command to get help for')
        .setRequired(false)),
  async execute(interaction) {
    const commandName = interaction.options.getString('command');
    const commandsDir = path.join(__dirname);
    const commandFiles = fs.readdirSync(commandsDir).filter(file => file.endsWith('.js') && file !== 'help.js');
    const commands = commandFiles.map(file => require(path.join(commandsDir, file)));

    if (!commandName) {
      // List all commands
      const embed = new EmbedBuilder()
        .setTitle('📖 Command List')
        .setDescription(commands.map(cmd => `• **/${cmd.name || cmd.data.name}** - ${cmd.description || cmd.data.description}`).join('\n'))
        .setFooter({ text: 'Use /help [command] for detailed info.' });
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    // Find command
    const cmd = commands.find(c => (c.name || c.data.name) === commandName);
    if (!cmd) {
      return interaction.reply({ content: `❌ Command \`${commandName}\` not found.`, ephemeral: true });
    }

    // Usage & permissions
    const usage = cmd.usage || `/${cmd.name || cmd.data.name} ${cmd.options ? cmd.options.map(o => o.required ? `<${o.name}>` : `[${o.name}]`).join(' ') : ''}`;
    const perms = cmd.permissions || cmd.requiredPermissions || 'None';

    // Related commands (by prefix)
    const related = commands
      .filter(c => (c.name || c.data.name).startsWith((cmd.name || cmd.data.name).split(/[a-z]/i)[0]) && (c.name || c.data.name) !== (cmd.name || cmd.data.name))
      .map(c => `/${c.name || c.data.name}`);

    const embed = new EmbedBuilder()
      .setTitle(`❓ Help: /${cmd.name || cmd.data.name}`)
      .setDescription(cmd.description || cmd.data.description)
      .addFields(
        { name: 'Usage', value: `\`${usage}\`` },
        { name: 'Required Permissions', value: Array.isArray(perms) ? perms.join(', ') : perms },
        ...(cmd.examples ? [{ name: 'Examples', value: cmd.examples.map(e => `\`${e}\``).join('\n') }] : []),
        ...(related.length ? [{ name: 'Related Commands', value: related.join(', ') }] : [])
      )
      .setFooter({ text: 'Use /help for a list of all commands.' });

    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
};