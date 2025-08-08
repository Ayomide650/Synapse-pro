const { SlashCommandBuilder } = require('discord.js');
const database = require('../utils/database');

const DICE_EMOJIS = ['', '⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('dice')
    .setDescription('Roll dice with custom sides and optional betting')
    .addIntegerOption(option =>
      option.setName('sides')
        .setDescription('Number of sides on each die (default: 6)')
        .setRequired(false)
        .setMinValue(2)
        .setMaxValue(100))
    .addIntegerOption(option =>
      option.setName('count')
        .setDescription('Number of dice to roll (default: 1, max: 10)')
        .setRequired(false)
        .setMinValue(1)
        .setMaxValue(10))
    .addIntegerOption(option =>
      option.setName('bet')
        .setDescription('Amount to bet (optional)')
        .setRequired(false)
        .setMinValue(1)),
  async execute(interaction) {
    try {
      const sides = interaction.options.getInteger('sides') || 6;
      const count = interaction.options.getInteger('count') || 1;
      const bet = interaction.options.getInteger('bet');
      const guildId = interaction.guild.id;
      const userId = interaction.user.id;

      // Economy config and user data
      const config = await database.readServerData(guildId, 'economyConfig');
      const minBet = config.gambling?.minBet || 10;
      const maxBet = config.gambling?.maxBet || 10000;
      const userData = await database.readUserData(userId, 'balance');

      // Betting validation
      if (bet) {
        if (bet < minBet || bet > maxBet) {
          return await interaction.reply({
            content: `❌ Bet amount must be between ${minBet} and ${maxBet} coins.`,
            ephemeral: true
          });
        }
        if (userData.coins < bet) {
          return await interaction.reply({
            content: `❌ You don't have enough coins! You have ${userData.coins} coins but tried to bet ${bet}.`,
            ephemeral: true
          });
        }
      }

      await interaction.reply('🎲 Rolling the dice...');

      // Simulate dice roll animation
      for (let i = 0; i < 2; i++) {
        const randomIndex = Math.floor(Math.random() * Math.min(sides, 6)) + 1;
        await new Promise(resolve => setTimeout(resolve, 700));
        await interaction.editReply(`🎲 Rolling... ${DICE_EMOJIS[randomIndex] || `[${randomIndex}]`}`);
      }

      // Roll dice
      const rolls = [];
      for (let i = 0; i < count; i++) {
        rolls.push(Math.floor(Math.random() * sides) + 1);
      }

      // Calculate win/loss
      let win = false;
      let winnings = 0;
      let resultMsg = `🎲 **Dice Results:** ${rolls.map(r => DICE_EMOJIS[r] || `[${r}]`).join(' ')}\n`;

      if (bet) {
        // Win if all dice are the same (jackpot), else lose bet
        if (rolls.every(r => r === rolls[0])) {
          win = true;
          winnings = bet * sides; // Higher reward for more sides
          userData.coins += winnings;
          resultMsg += `🎉 **JACKPOT!** All dice matched. You win **${winnings}** coins!\n`;
        } else {
          userData.coins -= bet;
          winnings = -bet;
          resultMsg += `💸 No match. You lost **${bet}** coins.\n`;
        }
        resultMsg += `🏦 New balance: **${userData.coins}** coins`;
      } else {
        resultMsg += `No bet placed.`;
      }

      // Update stats
      userData.diceStats = userData.diceStats || { wins: 0, losses: 0, total: 0 };
      userData.diceStats.total += 1;
      if (win) userData.diceStats.wins += 1;
      else userData.diceStats.losses += 1;
      await database.writeUserData(userId, userData, 'balance');

      // Log to gambling history
      const history = await database.read('economy/gambling_history.json');
      if (!history[guildId]) history[guildId] = [];
      history[guildId].push({
        userId,
        type: 'dice',
        bet: bet || 0,
        sides,
        count,
        rolls,
        win,
        winnings,
        timestamp: new Date().toISOString()
      });
      await database.write('economy/gambling_history.json', history);

      await interaction.editReply({
        content: resultMsg,
        ephemeral: true
      });

      // Optional: Log to game log channel if set
      const GAME_LOG_CHANNEL = process.env.GAME_LOG_CHANNEL;
      if (GAME_LOG_CHANNEL && interaction.guild) {
        const logChannel = interaction.guild.channels.cache.get(GAME_LOG_CHANNEL);
        if (logChannel) {
          const logMessage = `🎲 ${interaction.user} rolled [${rolls.join(', ')}] (${count}d${sides}) and ${win ? `won **${winnings}**` : `lost **${Math.abs(winnings)}**`} coins.`;
          await logChannel.send({ content: logMessage });
        }
      }

    } catch (error) {
      console.error('Error in dice command:', error);
      const errorMessage = '❌ An error occurred while processing your dice roll. Please try again later.';
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({ content: errorMessage, ephemeral: true });
      } else {
        await interaction.reply({ content: errorMessage, ephemeral: true });
      }
    }
  }
};
