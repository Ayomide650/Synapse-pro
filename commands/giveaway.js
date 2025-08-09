const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, PermissionFlagsBits } = require('discord.js');
const cron = require('node-cron');
const db = require('../utils/database');

// --- Giveaway Cron Job ---
if (!global.giveawayCronInitialized) {
  cron.schedule('* * * * *', async () => {
    const now = Date.now();
    const data = await db.read('features/giveaways.json');
    const giveaways = data.active_giveaways || {};
    for (const [id, g] of Object.entries(giveaways)) {
      if (g.endTime && now >= new Date(g.endTime).getTime()) {
        await endGiveaway(id);
      }
    }
  });
  global.giveawayCronInitialized = true;
}

// --- Utility Functions ---
function parseTime(timeString) {
  const match = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec(timeString);
  if (!match) throw new Error('Invalid time format. Use "5:30PM" or "11:45AM"');
  let [ , hours, minutes, period ] = match;
  hours = parseInt(hours); minutes = parseInt(minutes);
  if (period.toUpperCase() === 'PM' && hours !== 12) hours += 12;
  if (period.toUpperCase() === 'AM' && hours === 12) hours = 0;
  const now = new Date(Date.now() + 3600000); // WAT
  const end = new Date(now); end.setHours(hours, minutes, 0, 0);
  if (end <= now) end.setDate(end.getDate() + 1);
  return new Date(end.getTime() - 3600000); // back to UTC
}
function formatEndTime(date) {
  const wat = new Date(date.getTime() + 3600000);
  return wat.toLocaleString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: true }) + ' WAT';
}
async function endGiveaway(giveawayId, forceEnd = false) {
  const data = await db.read('features/giveaways.json');
  const giveaways = data.active_giveaways || {};
  const giveaway = giveaways[giveawayId];
  if (!giveaway) return;

  const channel = await global.client.channels.fetch(giveaway.channelId).catch(() => null);
  if (!channel) return;
  const message = await channel.messages.fetch(giveaway.messageId).catch(() => null);
  
  let winnersList = [];
  if (giveaway.participants.length === 0) {
    if (message) await message.edit({ embeds: [new EmbedBuilder().setTitle('🎉 Giveaway Ended').setDescription(`**Prize:** ${giveaway.prize}\n\n❌ No participants joined this giveaway.`).setColor('#ff0000').setTimestamp()], components: [] });
  } else {
    const shuffled = [...giveaway.participants].sort(() => 0.5 - Math.random());
    winnersList = shuffled.slice(0, Math.min(giveaway.winners, giveaway.participants.length));
    const winnersText = winnersList.map(id => `<@${id}>`).join(', ');
    if (message) await message.edit({ embeds: [new EmbedBuilder().setTitle('🎉 Giveaway Ended').setDescription(`**Prize:** ${giveaway.prize}\n\n🏆 **Winners:** ${winnersText}\n\n**Total Participants:** ${giveaway.participants.length}`).setColor('#00ff00').setTimestamp()], components: [] });
    if (winnersList.length > 0) await channel.send(`🎉 Congratulations ${winnersText}! You won: **${giveaway.prize}**`);
  }

  const history = data.giveaway_history || {};
  const historyId = `${giveawayId}_${Date.now()}`;
  history[historyId] = { ...giveaway, endedAt: new Date().toISOString(), winners: winnersList, status: forceEnd ? 'force_ended' : 'completed', finalParticipantCount: giveaway.participants.length };
  await db.write('features/giveaways.json', { ...data, giveaway_history: history });

  delete giveaways[giveawayId];
  await db.write('features/giveaways.json', { ...data, active_giveaways: giveaways });
}

// --- Command Definition ---
module.exports = {
  data: new SlashCommandBuilder()
    .setName('giveaway')
    .setDescription('Create and manage giveaways')
    .addSubcommand(sub => sub.setName('create').setDescription('Create a new giveaway'))
    .addSubcommand(sub => sub.setName('end').setDescription('End an active giveaway').addStringOption(opt => opt.setName('giveaway_id').setDescription('ID of the giveaway to end').setRequired(true)))
    .addSubcommand(sub => sub.setName('list').setDescription('List all active giveaways'))
    .addSubcommand(sub => sub.setName('history').setDescription('View giveaway history').addIntegerOption(opt => opt.setName('limit').setDescription('Number of recent giveaways to show (default: 5)').setMinValue(1).setMaxValue(20)))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    if (sub === 'create') return this.handleCreate(interaction);
    if (sub === 'end') return this.handleEnd(interaction);
    if (sub === 'list') return this.handleList(interaction);
    if (sub === 'history') return this.handleHistory(interaction);
  },

  async handleCreate(interaction) {
    const embed = new EmbedBuilder()
      .setTitle('🎉 Create Giveaway')
      .setDescription('Click the button below to set up your giveaway!')
      .setColor('#0099ff');
    const setupButton = new ButtonBuilder()
      .setCustomId('giveaway_setup')
      .setLabel('Setup Giveaway')
      .setStyle(ButtonStyle.Primary)
      .setEmoji('🎁');
    const row = new ActionRowBuilder().addComponents(setupButton);
    await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
  },

  async handleList(interaction) {
    const data = await db.read('features/giveaways.json');
    const giveaways = data.active_giveaways || {};

    if (Object.keys(giveaways).length === 0) {
      await interaction.reply({ content: 'No active giveaways found.', ephemeral: true });
      return;
    }

    const embed = new EmbedBuilder().setTitle('🎉 Active Giveaways').setColor('#0099ff').setTimestamp();
    let description = '';

    for (const [id, g] of Object.entries(giveaways)) {
      description += `**ID:** ${id}\n**Prize:** ${g.prize}\n**Participants:** ${g.participants?.length || 0}\n**Ends:** ${formatEndTime(new Date(g.endTime))}\n\n`;
    }

    embed.setDescription(description);
    await interaction.reply({ embeds: [embed], ephemeral: true });
  },

  async handleHistory(interaction) {
    const limit = interaction.options.getInteger('limit') || 5;
    const data = await db.read('features/giveaways.json');
    const history = data.giveaway_history || {};

    if (Object.keys(history).length === 0) {
      await interaction.reply({ content: 'No giveaway history found.', ephemeral: true });
      return;
    }

    const sorted = Object.entries(history)
      .sort(([,a], [,b]) => new Date(b.endedAt) - new Date(a.endedAt))
      .slice(0, limit);

    const embed = new EmbedBuilder().setTitle('📜 Giveaway History').setColor('#9932cc').setTimestamp();
    let description = '';

    for (const [historyId, g] of sorted) {
      const id = historyId.split('_')[0];
      description += `**ID:** ${id}\n**Prize:** ${g.prize}\n**Status:** ${g.status}\n**Participants:** ${g.finalParticipantCount}\n**Winners:** ${g.winners?.length || 0}\n**Ended:** ${formatEndTime(new Date(g.endedAt))}\n\n`;
    }

    embed.setDescription(description);
    await interaction.reply({ embeds: [embed], ephemeral: true });
  },

  async handleEnd(interaction) {
    const giveawayId = interaction.options.getString('giveaway_id');
    const data = await db.read('features/giveaways.json');

    if (!data.active_giveaways?.[giveawayId]) {
      await interaction.reply({ content: '❌ No active giveaway found with that ID.', ephemeral: true });
      return;
    }

    await endGiveaway(giveawayId, true);
    await interaction.reply({ content: `✅ Giveaway ${giveawayId} has been ended and logged to database.`, ephemeral: true });
  },

  
  async handleButton(interaction) {
    
  },
  async handleModal(interaction) {
    
  }
};
