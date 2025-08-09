
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const database = require('../utils/database');

class GiveawayHandler {
  constructor(client) {
    this.client = client;
    this.checkInterval = 30000; 
  }

  async start() {
    console.log('🎉 Starting giveaway handler...');
    this.startChecking();
  }

  async startChecking() {
    setInterval(async () => {
      try {
        const data = await database.read('features/giveaways.json');
        if (!data.active_giveaways) return;

        const now = Date.now();
        const toEnd = Object.entries(data.active_giveaways)
          .filter(([, giveaway]) => giveaway.endTime <= now);

        for (const [giveawayId, giveaway] of toEnd) {
          await this.endGiveaway(giveawayId, giveaway);
        }
      } catch (error) {
        console.error('Error checking giveaways:', error);
      }
    }, this.checkInterval);
  }

  async endGiveaway(giveawayId, giveaway) {
    try {
      const channel = this.client.channels.cache.get(giveaway.channelId);
      if (!channel) return;

      const message = await channel.messages.fetch(giveaway.messageId).catch(() => null);
      if (!message) return;

      // Get participants
      const participants = giveaway.participants || [];
      
      if (participants.length === 0) {
        const embed = new EmbedBuilder()
          .setTitle('🎉 Giveaway Ended')
          .setDescription(`**Prize:** ${giveaway.prize}\n\n❌ No valid participants`)
          .setColor('Red')
          .setTimestamp();

        await message.edit({ embeds: [embed], components: [] });
        return;
      }

      // Select winners
      const winners = [];
      const winnerCount = Math.min(giveaway.winners, participants.length);
      const shuffled = [...participants].sort(() => 0.5 - Math.random());
      
      for (let i = 0; i < winnerCount; i++) {
        winners.push(shuffled[i]);
      }

      // Update message
      const embed = new EmbedBuilder()
        .setTitle('🎉 Giveaway Ended')
        .setDescription(
          `**Prize:** ${giveaway.prize}\n\n` +
          `**Winners:** ${winners.map(id => `<@${id}>`).join(', ')}\n` +
          `**Total Participants:** ${participants.length}`
        )
        .setColor('Gold')
        .setTimestamp();

      await message.edit({ embeds: [embed], components: [] });

      // Announce winners
      await channel.send(
        `🎊 Congratulations ${winners.map(id => `<@${id}>`).join(', ')}! ` +
        `You won **${giveaway.prize}**!`
      );

      // Remove from active giveaways and add to history
      await this.moveToHistory(giveawayId, giveaway, winners, participants.length);

    } catch (error) {
      console.error('Error ending giveaway:', error);
    }
  }

  async moveToHistory(giveawayId, giveaway, winners, participantCount) {
    try {
      const data = await database.read('features/giveaways.json');
      
      // Remove from active
      if (data.active_giveaways && data.active_giveaways[giveawayId]) {
        delete data.active_giveaways[giveawayId];
      }

      // Add to history
      if (!data.giveaway_history) data.giveaway_history = {};
      data.giveaway_history[`${giveawayId}_${Date.now()}`] = {
        ...giveaway,
        winners: winners,
        finalParticipantCount: participantCount,
        endedAt: new Date().toISOString(),
        status: 'completed'
      };

      await database.write('features/giveaways.json', data);
    } catch (error) {
      console.error('Error moving giveaway to history:', error);
    }
  }
}

module.exports = GiveawayHandler;
