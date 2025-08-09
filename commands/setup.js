const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const database = require('../utils/database');

module.exports = {
  name: 'setup',
  description: 'Interactive server setup wizard for configuring bot features',
  data: new SlashCommandBuilder()
    .setName('setup')
    .setDescription('Interactive server setup wizard'),
  async execute(interaction) {
    if (!interaction.member.permissions.has('Administrator')) {
      return interaction.reply({ content: 'You need Administrator permission to run setup.', ephemeral: true });
    }

    await interaction.reply({ content: '🛠️ Starting setup wizard...', ephemeral: true });

    // Step 1: Modlog channel
    await interaction.followUp({ content: 'Please mention the channel to use for modlog (or type "skip"):' });
    const modlogMsg = await interaction.channel.awaitMessages({
      filter: m => m.author.id === interaction.user.id,
      max: 1, time: 60000
    }).catch(() => null);
    const modlogChannel = modlogMsg?.first()?.mentions.channels.first();
    if (modlogChannel) {
      const config = await database.readServerData(interaction.guild.id, 'config');
      config.modLogChannel = modlogChannel.id;
      await database.writeServerData(interaction.guild.id, config, 'config');
      await interaction.followUp({ content: `✅ Modlog channel set to ${modlogChannel}` });
    } else {
      await interaction.followUp({ content: 'Modlog setup skipped.' });
    }

    // Step 2: Economy currency
    await interaction.followUp({ content: 'Enter the currency symbol for your server economy (default: 🪙):' });
    const currencyMsg = await interaction.channel.awaitMessages({
      filter: m => m.author.id === interaction.user.id,
      max: 1, time: 60000
    }).catch(() => null);
    const currencySymbol = currencyMsg?.first()?.content || '🪙';
    const econConfig = await database.readServerData(interaction.guild.id, 'economyConfig');
    econConfig.currencySymbol = currencySymbol;
    await database.writeServerData(interaction.guild.id, econConfig, 'economyConfig');
    await interaction.followUp({ content: `✅ Currency symbol set to ${currencySymbol}` });

    // Step 3: Leveling system
    await interaction.followUp({ content: 'Enable leveling system? (yes/no)' });
    const levelMsg = await interaction.channel.awaitMessages({
      filter: m => m.author.id === interaction.user.id,
      max: 1, time: 60000
    }).catch(() => null);
    const enableLeveling = levelMsg?.first()?.content.toLowerCase().startsWith('y');
    const levelConfig = await database.readServerData(interaction.guild.id, 'levelConfig');
    levelConfig.xpEnabled = !!enableLeveling;
    await database.writeServerData(interaction.guild.id, levelConfig, 'levelConfig');
    await interaction.followUp({ content: `✅ Leveling system ${enableLeveling ? 'enabled' : 'disabled'}` });

    // Step 4: Create initial directory structure if needed
    await database.createInitialDirectoryStructure();
    await interaction.followUp({ content: '✅ Initial directory structure ensured.' });

    await interaction.followUp({ content: '🎉 Setup complete! You can now use all Synapse features.', ephemeral: true });
  }
};
