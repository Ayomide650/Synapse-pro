const { SlashCommandBuilder } = require('discord.js');
const database = require('../utils/database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('coinflip')
    .setDescription('Flip a coin to win or lose coins')
    .addIntegerOption(option =>
      option.setName('amount')
        .setDescription('Amount of coins to bet (minimum 1)')
        .setRequired(true)
        .setMinValue(1))
    .addStringOption(option =>
      option.setName('choice')
        .setDescription('Choose heads or tails')
        .setRequired(true)
        .addChoices(
          { name: 'Heads', value: 'heads' },
          { name: 'Tails', value: 'tails' }
        )),
  async execute(interaction) {
    try {
      const amount = interaction.options.getInteger('amount');
      const choice = interaction.options.getString('choice');
      const guildId = interaction.guild.id;
      const userId = interaction.user.id;

      // Get config and user data from database
      const config = await database.readServerData(guildId, 'economyConfig');
      const minBet = config.gambling?.minBet || 10;
      const maxBet = config.gambling?.maxBet || 10000;
      if (amount < minBet || amount > maxBet) {
        return await interaction.reply({
          content: `❌ Bet amount must be between ${minBet} and ${maxBet} coins.`,
          ephemeral: true
        });
      }

      const userData = await database.readUserData(userId, 'balance');
      if (userData.coins < amount) {
        return await interaction.reply({
          content: `❌ You don't have enough coins! You have ${userData.coins} coins but tried to bet ${amount}.`,
          ephemeral: true
        });
      }

      await interaction.reply('🪙 Flipping the coin...');

      // Simulate coin flip animation
      const flips = ['Heads', 'Tails'];
      let lastFlip = '';
      for (let i = 0; i < 3; i++) {
        lastFlip = flips[Math.floor(Math.random() * 2)];
        await new Promise(resolve => setTimeout(resolve, 800));
        await interaction.editReply(`🪙 ${lastFlip}...`);
      }

      // Final flip and result
      const result = Math.random() < 0.5 ? 'heads' : 'tails';
      const won = choice === result;
      const coinChange = won ? amount : -amount;

      // Update balance and stats
      userData.coins = Math.max(0, userData.coins + coinChange);
      userData.coinflipStats = userData.coinflipStats || { wins: 0, losses: 0, total: 0 };
      userData.coinflipStats.total += 1;
      if (won) userData.coinflipStats.wins += 1;
      else userData.coinflipStats.losses += 1;
      await database.writeUserData(userId, userData, 'balance');

      // Log to gambling history
      const history = await database.read('economy/gambling_history.json');
      if (!history[guildId]) history[guildId] = [];
      history[guildId].push({
        userId,
        type: 'coinflip',
        amount,
        choice,
        result,
        win: won,
        coin_change: coinChange,
        timestamp: new Date().toISOString()
      });
      await database.write('economy/gambling_history.json', history);

      // Create result message
      const resultEmoji = result === 'heads' ? '🪙' : '🎯';
      const outcomeEmoji = won ? '🎉' : '💸';
      const resultMessage = `${resultEmoji} Coin landed on **${result.toUpperCase()}**!\n` +
        `${outcomeEmoji} You ${won ? 'won' : 'lost'} **${Math.abs(coinChange)}** coins!\n` +
        `💰 Your new balance: **${userData.coins}** coins\n\n` +
        `Stats: ${userData.coinflipStats.wins}W/${userData.coinflipStats.losses}L (${userData.coinflipStats.total} games)`;

      await interaction.editReply({
        content: resultMessage,
        ephemeral: true
      });

      // Optional: Log to game log channel if set
      const GAME_LOG_CHANNEL = process.env.GAME_LOG_CHANNEL;
      if (GAME_LOG_CHANNEL && interaction.guild) {
        const logChannel = interaction.guild.channels.cache.get(GAME_LOG_CHANNEL);
        if (logChannel) {
          const logMessage = `🪙 ${interaction.user} flipped **${result.toUpperCase()}** and ${won ? 'won' : 'lost'} **${Math.abs(coinChange)}** coins!\n` +
            `Bet: ${amount} | Choice: ${choice}`;
          await logChannel.send({ content: logMessage });
        }
      }

    } catch (error) {
      console.error('Error in coinflip command:', error);
      const errorMessage = '❌ An error occurred while processing your coinflip. Please try again later.';
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({ content: errorMessage, ephemeral: true });
      } else {
        await interaction.reply({ content: errorMessage, ephemeral: true });
      }
    }
  }
};
