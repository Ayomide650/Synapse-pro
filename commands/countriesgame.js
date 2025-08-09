
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const database = require('../utils/database');

// Comprehensive list of countries
const COUNTRIES = [
  'Afghanistan', 'Albania', 'Algeria', 'Andorra', 'Angola', 'Antigua and Barbuda', 'Argentina', 'Armenia', 'Australia', 'Austria',
  'Azerbaijan', 'Bahamas', 'Bahrain', 'Bangladesh', 'Barbados', 'Belarus', 'Belgium', 'Belize', 'Benin', 'Bhutan',
  'Bolivia', 'Bosnia and Herzegovina', 'Botswana', 'Brazil', 'Brunei', 'Bulgaria', 'Burkina Faso', 'Burundi', 'Cambodia', 'Cameroon',
  'Canada', 'Cape Verde', 'Central African Republic', 'Chad', 'Chile', 'China', 'Colombia', 'Comoros', 'Congo', 'Costa Rica',
  'Croatia', 'Cuba', 'Cyprus', 'Czech Republic', 'Democratic Republic of Congo', 'Denmark', 'Djibouti', 'Dominica', 'Dominican Republic', 'East Timor',
  'Ecuador', 'Egypt', 'El Salvador', 'Equatorial Guinea', 'Eritrea', 'Estonia', 'Eswatini', 'Ethiopia', 'Fiji', 'Finland',
  'France', 'Gabon', 'Gambia', 'Georgia', 'Germany', 'Ghana', 'Greece', 'Grenada', 'Guatemala', 'Guinea',
  'Guinea-Bissau', 'Guyana', 'Haiti', 'Honduras', 'Hungary', 'Iceland', 'India', 'Indonesia', 'Iran', 'Iraq',
  'Ireland', 'Israel', 'Italy', 'Ivory Coast', 'Jamaica', 'Japan', 'Jordan', 'Kazakhstan', 'Kenya', 'Kiribati',
  'Kuwait', 'Kyrgyzstan', 'Laos', 'Latvia', 'Lebanon', 'Lesotho', 'Liberia', 'Libya', 'Liechtenstein', 'Lithuania',
  'Luxembourg', 'Madagascar', 'Malawi', 'Malaysia', 'Maldives', 'Mali', 'Malta', 'Marshall Islands', 'Mauritania', 'Mauritius',
  'Mexico', 'Micronesia', 'Moldova', 'Monaco', 'Mongolia', 'Montenegro', 'Morocco', 'Mozambique', 'Myanmar', 'Namibia',
  'Nauru', 'Nepal', 'Netherlands', 'New Zealand', 'Nicaragua', 'Niger', 'Nigeria', 'North Korea', 'North Macedonia', 'Norway',
  'Oman', 'Pakistan', 'Palau', 'Panama', 'Papua New Guinea', 'Paraguay', 'Peru', 'Philippines', 'Poland', 'Portugal',
  'Qatar', 'Romania', 'Russia', 'Rwanda', 'Saint Kitts and Nevis', 'Saint Lucia', 'Saint Vincent and the Grenadines', 'Samoa', 'San Marino', 'Sao Tome and Principe',
  'Saudi Arabia', 'Senegal', 'Serbia', 'Seychelles', 'Sierra Leone', 'Singapore', 'Slovakia', 'Slovenia', 'Solomon Islands', 'Somalia',
  'South Africa', 'South Korea', 'South Sudan', 'Spain', 'Sri Lanka', 'Sudan', 'Suriname', 'Sweden', 'Switzerland', 'Syria',
  'Taiwan', 'Tajikistan', 'Tanzania', 'Thailand', 'Togo', 'Tonga', 'Trinidad and Tobago', 'Tunisia', 'Turkey', 'Turkmenistan',
  'Tuvalu', 'Uganda', 'Ukraine', 'United Arab Emirates', 'United Kingdom', 'United States', 'Uruguay', 'Uzbekistan', 'Vanuatu', 'Vatican City',
  'Venezuela', 'Vietnam', 'Yemen', 'Zambia', 'Zimbabwe'
];

// Active games storage
const activeGames = new Map();

module.exports = {
  data: new SlashCommandBuilder()
    .setName('countriesgame')
    .setDescription('Play a countries listing game - PvAI or PvP!'),

  async execute(interaction) {
    const userId = interaction.user.id;
    const channelId = interaction.channel.id;

    // Check if there's already an active game in this channel
    if (activeGames.has(channelId)) {
      return interaction.reply({ 
        content: '❌ There\'s already an active game in this channel!', 
        ephemeral: true 
      });
    }

    // Create game mode selection embed
    const embed = new EmbedBuilder()
      .setTitle('🌍 Countries Game')
      .setDescription('Choose your game mode:')
      .addFields(
        { name: '🤖 Player vs AI', value: 'Play against the bot with different difficulty levels', inline: true },
        { name: '⚔️ Player vs Player', value: 'Compete against other players in turns', inline: true }
      )
      .setColor('#0099ff')
      .setThumbnail('🌎');

    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(`countries_pvai_${userId}`)
          .setLabel('🤖 PvAI')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId(`countries_pvp_${userId}`)
          .setLabel('⚔️ PvP')
          .setStyle(ButtonStyle.Success)
      );

    await interaction.reply({ embeds: [embed], components: [row] });

    // Set up collectors
    const filter = (i) => i.customId.includes('countries_') && i.user.id === userId;
    const collector = interaction.channel.createMessageComponentCollector({ filter, time: 60000 });

    collector.on('collect', async (i) => {
      if (i.customId.includes('pvai')) {
        await handlePvAISelection(i);
      } else if (i.customId.includes('pvp')) {
        await handlePvPLobby(i);
      } else if (i.customId.includes('difficulty')) {
        await startPvAIGame(i);
      }
    });

    collector.on('end', () => {
      // Update message to remove buttons after timeout
      interaction.editReply({ components: [] }).catch(() => {});
    });
  }
};

async function handlePvAISelection(interaction) {
  const embed = new EmbedBuilder()
    .setTitle('🤖 Player vs AI - Select Difficulty')
    .setDescription('Choose your difficulty level:')
    .addFields(
      { name: '🟢 Easy', value: 'Timer: 30s → 25s → 20s\nTime reduces after 5 and 12 countries', inline: true },
      { name: '🟡 Medium', value: 'Timer: 25s → 15s (minimum)\nSame reduction points as Easy', inline: true },
      { name: '🔴 Hard', value: 'Timer: 20s → 10s (minimum)\nSame reduction points as Easy', inline: true }
    )
    .setColor('#ff9900');

  const row = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId(`countries_difficulty_easy_${interaction.user.id}`)
        .setLabel('🟢 Easy')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`countries_difficulty_medium_${interaction.user.id}`)
        .setLabel('🟡 Medium')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(`countries_difficulty_hard_${interaction.user.id}`)
        .setLabel('🔴 Hard')
        .setStyle(ButtonStyle.Danger)
    );

  await interaction.update({ embeds: [embed], components: [row] });
}

async function startPvAIGame(interaction) {
  const difficulty = interaction.customId.split('_')[2];
  const userId = interaction.user.id;
  const channelId = interaction.channel.id;

  // Set up game parameters based on difficulty
  let gameSettings = {};
  switch (difficulty) {
    case 'easy':
      gameSettings = { startTime: 30000, minTime: 20000, reductionPoints: [5, 12] };
      break;
    case 'medium':
      gameSettings = { startTime: 25000, minTime: 15000, reductionPoints: [5, 12] };
      break;
    case 'hard':
      gameSettings = { startTime: 20000, minTime: 10000, reductionPoints: [5, 12] };
      break;
  }

  // Create game object
  const game = {
    type: 'pvai',
    difficulty,
    player: userId,
    listedCountries: [],
    currentTime: gameSettings.startTime,
    settings: gameSettings,
    startedAt: Date.now()
  };

  activeGames.set(channelId, game);

  // Start countdown
  await startGameCountdown(interaction, game);
}

async function handlePvPLobby(interaction) {
  const userId = interaction.user.id;
  const channelId = interaction.channel.id;

  // Create PvP lobby
  const game = {
    type: 'pvp',
    host: userId,
    players: [userId],
    lobbyEndsAt: Date.now() + 60000,
    currentPlayerIndex: 0,
    listedCountries: [],
    currentTime: 30000,
    roundsCompleted: 0
  };

  activeGames.set(channelId, game);

  const embed = new EmbedBuilder()
    .setTitle('⚔️ Countries Game - PvP Lobby')
    .setDescription(`Welcome to list of countries!\nStarted by <@${userId}>\n\n**To participate, type \`join\`**\nYou have 1 minute`)
    .addFields(
      { name: '👥 Players', value: `<@${userId}>`, inline: true },
      { name: '⏰ Time Left', value: '60 seconds', inline: true }
    )
    .setColor('#00ff00');

  await interaction.update({ embeds: [embed], components: [] });

  // Set up lobby countdown
  setTimeout(() => sendLobbyWarning(interaction, 45), 15000);
  setTimeout(() => sendLobbyWarning(interaction, 30), 30000);
  setTimeout(() => sendLobbyWarning(interaction, 15), 45000);
  setTimeout(() => sendLobbyCountdown(interaction), 55000);

  // Set up message collector for join commands
  const filter = (m) => m.content.toLowerCase() === 'join' && !game.players.includes(m.author.id);
  const collector = interaction.channel.createMessageCollector({ filter, time: 60000 });

  collector.on('collect', async (message) => {
    game.players.push(message.author.id);
    
    const embed = new EmbedBuilder()
      .setTitle('⚔️ Countries Game - PvP Lobby')
      .setDescription(`<@${message.author.id}> has joined the game!`)
      .addFields(
        { name: '👥 Players', value: game.players.map(p => `<@${p}>`).join('\n'), inline: true }
      )
      .setColor('#00ff00');

    await interaction.editReply({ embeds: [embed] });
  });

  collector.on('end', async () => {
    if (game.players.length === 1) {
      activeGames.delete(channelId);
      const embed = new EmbedBuilder()
        .setTitle('❌ Game Cancelled')
        .setDescription('Not enough players joined the game.')
        .setColor('#ff0000');
      
      await interaction.editReply({ embeds: [embed] });
    } else {
      await startPvPGame(interaction, game);
    }
  });
}

async function sendLobbyWarning(interaction, seconds) {
  await interaction.followUp({ content: `⏰ **${seconds} seconds remaining to join!**` });
}

async function sendLobbyCountdown(interaction) {
  for (let i = 5; i >= 1; i--) {
    await new Promise(resolve => setTimeout(resolve, 1000));
    await interaction.followUp({ content: `**${i}**` });
  }
}

async function startGameCountdown(interaction, game) {
  // Send countdown messages
  await interaction.update({ 
    content: '🎮 **Starting game in 3...**', 
    embeds: [], 
    components: [] 
  });

  await new Promise(resolve => setTimeout(resolve, 1000));
  await interaction.editReply({ content: '🎮 **Starting game in 2...**' });

  await new Promise(resolve => setTimeout(resolve, 1000));
  await interaction.editReply({ content: '🎮 **Starting game in 1...**' });

  await new Promise(resolve => setTimeout(resolve, 1000));

  if (game.type === 'pvai') {
    await startPvAIRound(interaction, game);
  } else {
    await startPvPRound(interaction, game);
  }
}

async function startPvAIRound(interaction, game) {
  const embed = new EmbedBuilder()
    .setTitle('🌍 Countries Game - PvAI')
    .setDescription('**List a country name!**')
    .addFields(
      { name: '👤 User playing', value: `<@${game.player}>`, inline: true },
      { name: '📊 Countries listed', value: game.listedCountries.length.toString(), inline: true },
      { name: '⏰ Time', value: `${game.currentTime / 1000}s`, inline: true }
    )
    .setColor('#0099ff');

  await interaction.editReply({ content: '', embeds: [embed] });

  // Set up message collector
  const filter = (m) => m.author.id === game.player && !m.author.bot;
  const collector = interaction.channel.createMessageCollector({ 
    filter, 
    time: game.currentTime 
  });

  let timeoutId = setTimeout(async () => {
    await endPvAIGame(interaction, game, true);
  }, game.currentTime);

  collector.on('collect', async (message) => {
    const country = message.content.trim();
    const normalizedCountry = normalizeCountryName(country);
    
    if (isValidCountry(normalizedCountry) && !isCountryAlreadyListed(normalizedCountry, game.listedCountries)) {
      // Correct answer
      await message.react('✅');
      game.listedCountries.push(normalizedCountry);
      
      // Check if we need to reduce time
      checkTimeReduction(game);
      
      clearTimeout(timeoutId);
      collector.stop();
      
      // Start next round
      setTimeout(() => startPvAIRound(interaction, game), 1000);
    } else {
      // Wrong answer
      await message.react('❌');
    }
  });

  collector.on('end', (collected, reason) => {
    if (reason === 'time') {
      clearTimeout(timeoutId);
    }
  });
}

async function startPvPGame(interaction, game) {
  await startGameCountdown(interaction, game);
}

async function startPvPRound(interaction, game) {
  const currentPlayer = game.players[game.currentPlayerIndex];
  const nextPlayerIndex = (game.currentPlayerIndex + 1) % game.players.length;
  const nextPlayer = game.players[nextPlayerIndex];

  const embed = new EmbedBuilder()
    .setTitle('⚔️ Countries Game - PvP')
    .setDescription('**List a country name!**')
    .addFields(
      { name: '👤 Now', value: `<@${currentPlayer}>`, inline: true },
      { name: '⏭️ Next', value: `<@${nextPlayer}> get ready`, inline: true },
      { name: '⏰ Time', value: `${game.currentTime / 1000} seconds`, inline: true }
    )
    .setColor('#ff6600');

  await interaction.editReply({ embeds: [embed] });

  // Set up message collector
  const filter = (m) => m.author.id === currentPlayer && !m.author.bot;
  const collector = interaction.channel.createMessageCollector({ 
    filter, 
    time: game.currentTime 
  });

  let timeoutId = setTimeout(async () => {
    await eliminatePlayer(interaction, game, currentPlayer);
  }, game.currentTime);

  collector.on('collect', async (message) => {
    const country = message.content.trim();
    const normalizedCountry = normalizeCountryName(country);
    
    if (isValidCountry(normalizedCountry) && !isCountryAlreadyListed(normalizedCountry, game.listedCountries)) {
      // Correct answer
      await message.react('✅');
      game.listedCountries.push(normalizedCountry);
      game.currentPlayerIndex = nextPlayerIndex;
      
      // Check for round completion and time reduction
      if (game.currentPlayerIndex === 0) {
        game.roundsCompleted++;
        checkPvPTimeReduction(game);
      }
      
      clearTimeout(timeoutId);
      collector.stop();
      
      // Check if game should continue
      if (game.players.length > 1) {
        setTimeout(() => startPvPRound(interaction, game), 1000);
      } else {
        await endPvPGame(interaction, game);
      }
    } else {
      // Wrong answer
      await message.react('❌');
      clearTimeout(timeoutId);
      collector.stop();
      await eliminatePlayer(interaction, game, currentPlayer);
    }
  });

  collector.on('end', (collected, reason) => {
    if (reason === 'time') {
      clearTimeout(timeoutId);
    }
  });
}

function normalizeCountryName(country) {
  return country.toLowerCase().trim().replace(/[^\w\s]/g, '');
}

function isValidCountry(normalizedCountry) {
  return COUNTRIES.some(country => 
    normalizeCountryName(country) === normalizedCountry
  );
}

function isCountryAlreadyListed(normalizedCountry, listedCountries) {
  return listedCountries.some(country => 
    normalizeCountryName(country) === normalizedCountry
  );
}

function checkTimeReduction(game) {
  const count = game.listedCountries.length;
  
  if (count === game.settings.reductionPoints[0]) {
    game.currentTime = Math.max(game.currentTime - 5000, game.settings.minTime);
  } else if (count === game.settings.reductionPoints[1]) {
    game.currentTime = Math.max(game.currentTime - 5000, game.settings.minTime);
  }
}

function checkPvPTimeReduction(game) {
  const rounds = game.roundsCompleted;
  
  if (rounds === 2) {
    game.currentTime = Math.max(game.currentTime - 5000, 10000); // 25s
  } else if (rounds === 4) {
    game.currentTime = Math.max(game.currentTime - 5000, 10000); // 20s
  } else if (rounds === 7) {
    game.currentTime = Math.max(game.currentTime - 5000, 10000); // 15s
  } else if (rounds === 10) {
    game.currentTime = 10000; // Final minimum 10s
  }
}

async function eliminatePlayer(interaction, game, playerId) {
  game.players = game.players.filter(p => p !== playerId);
  
  const embed = new EmbedBuilder()
    .setTitle('❌ Player Eliminated!')
    .setDescription(`<@${playerId}> ran out of time and has been eliminated!`)
    .addFields(
      { name: '👥 Players Remaining', value: game.players.map(p => `<@${p}>`).join('\n') || 'None' },
      { name: '📊 Countries Listed', value: game.listedCountries.length.toString() }
    )
    .setColor('#ff0000');

  await interaction.followUp({ embeds: [embed] });

  if (game.players.length <= 1) {
    await endPvPGame(interaction, game);
  } else {
    // Adjust current player index if needed
    if (game.currentPlayerIndex >= game.players.length) {
      game.currentPlayerIndex = 0;
    }
    setTimeout(() => startPvPRound(interaction, game), 2000);
  }
}

async function endPvAIGame(interaction, game, timeout = false) {
  const channelId = interaction.channel.id;
  activeGames.delete(channelId);

  const duration = Math.floor((Date.now() - game.startedAt) / 1000);
  
  const embed = new EmbedBuilder()
    .setTitle(timeout ? '⏰ Time\'s Up!' : '🎉 Game Over!')
    .setDescription(`<@${game.player}> ${timeout ? 'ran out of time!' : 'finished the game!'}`)
    .addFields(
      { name: '📊 Countries Listed', value: game.listedCountries.length.toString(), inline: true },
      { name: '⏱️ Time Used', value: `${duration} seconds`, inline: true },
      { name: '🎯 Difficulty', value: game.difficulty.charAt(0).toUpperCase() + game.difficulty.slice(1), inline: true }
    )
    .setColor(timeout ? '#ff0000' : '#00ff00');

  if (game.listedCountries.length > 0) {
    embed.addFields({
      name: '🌍 Countries Listed',
      value: game.listedCountries.join(', '),
      inline: false
    });
  }

  await interaction.followUp({ embeds: [embed] });

  // Save stats to database
  await saveGameStats(game.player, 'pvai', game.difficulty, game.listedCountries.length, duration);
}

async function endPvPGame(interaction, game) {
  const channelId = interaction.channel.id;
  activeGames.delete(channelId);

  const winner = game.players[0];
  const duration = Math.floor((Date.now() - game.startedAt) / 1000);

  const embed = new EmbedBuilder()
    .setTitle('🏆 PvP Game Complete!')
    .setDescription(`**Winner: <@${winner}>**`)
    .addFields(
      { name: '📊 Total Countries Listed', value: game.listedCountries.length.toString(), inline: true },
      { name: '⏱️ Game Duration', value: `${duration} seconds`, inline: true },
      { name: '🔄 Rounds Completed', value: game.roundsCompleted.toString(), inline: true }
    )
    .setColor('#gold');

  if (game.listedCountries.length > 0) {
    embed.addFields({
      name: '🌍 Countries Listed',
      value: game.listedCountries.slice(-20).join(', ') + (game.listedCountries.length > 20 ? '...' : ''),
      inline: false
    });
  }

  await interaction.followUp({ embeds: [embed] });

  // Save stats for winner
  await saveGameStats(winner, 'pvp', 'multiplayer', game.listedCountries.length, duration);
}

async function saveGameStats(userId, gameType, difficulty, countriesListed, duration) {
  try {
    const data = await database.read('features/countries_game_stats.json');
    
    if (!data[userId]) {
      data[userId] = { games: [], totalCountries: 0, totalGames: 0 };
    }

    data[userId].games.push({
      gameType,
      difficulty,
      countriesListed,
      duration,
      timestamp: new Date().toISOString()
    });

    data[userId].totalCountries += countriesListed;
    data[userId].totalGames++;

    // Keep only last 50 games per user
    if (data[userId].games.length > 50) {
      data[userId].games = data[userId].games.slice(-50);
    }

    await database.write('features/countries_game_stats.json', data);
  } catch (error) {
    console.error('Error saving game stats:', error);
  }
}
