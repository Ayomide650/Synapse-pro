
const { Client, GatewayIntentBits, Collection, REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');
const database = require('./utils/database');
const ReminderHandler = require('./handlers/ReminderHandler');
const GiveawayHandler = require('./handlers/GiveawayHandler');
const ModerationHandler = require('./handlers/ModerationHandler');

// Create Discord client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildPresences
  ]
});

// Create commands collection
client.commands = new Collection();

// Load commands
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

const commands = [];

for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  const command = require(filePath);
  
  if ('name' in command && 'description' in command) {
    client.commands.set(command.name, command);
    
    // Build command data for registration
    const commandData = {
      name: command.name,
      description: command.description,
      options: command.options || []
    };
    
    commands.push(commandData);
  } else {
    console.log(`[WARNING] The command at ${filePath} is missing a required "name" or "description" property.`);
  }
}

// Load events
const eventsPath = path.join(__dirname, 'events');
if (fs.existsSync(eventsPath)) {
  const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));
  
  for (const file of eventFiles) {
    const filePath = path.join(eventsPath, file);
    const event = require(filePath);
    
    if (event.once) {
      client.once(event.name, (...args) => event.execute(...args));
    } else {
      client.on(event.name, (...args) => event.execute(...args));
    }
  }
}

// Bot ready event - initialize everything
client.once('ready', async () => {
  // Initialize database
  await database.createInitialDirectoryStructure();
  
  // Start handlers
  const reminderHandler = new ReminderHandler(client);
  await reminderHandler.start();
  
  const giveawayHandler = new GiveawayHandler(client);
  await giveawayHandler.start();
  
  const moderationHandler = new ModerationHandler(client);
  await moderationHandler.start();
  
  // Register slash commands
  const rest = new REST().setToken(process.env.DISCORD_TOKEN);
  
  try {
    console.log('🔄 Started refreshing application (/) commands.');
    
    await rest.put(
      Routes.applicationCommands(client.user.id),
      { body: commands },
    );
    
    console.log('✅ Successfully reloaded application (/) commands.');
  } catch (error) {
    console.error('❌ Error refreshing commands:', error);
  }
});

// Error handling
client.on('error', error => {
  console.error('Discord client error:', error);
});

process.on('unhandledRejection', error => {
  console.error('Unhandled promise rejection:', error);
});

process.on('uncaughtException', error => {
  console.error('Uncaught exception:', error);
  process.exit(1);
});

// Login to Discord
if (!process.env.DISCORD_TOKEN) {
  console.error('❌ DISCORD_TOKEN environment variable is required!');
  process.exit(1);
}

client.login(process.env.DISCORD_TOKEN);
