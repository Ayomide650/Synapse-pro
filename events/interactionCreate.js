
const database = require('../utils/database');

module.exports = {
  name: 'interactionCreate',
  async execute(interaction) {
    if (interaction.isChatInputCommand()) {
      const command = interaction.client.commands.get(interaction.commandName);
      
      if (!command) {
        console.error(`No command matching ${interaction.commandName} was found.`);
        return;
      }
      
      try {
        
        await database.trackCommand(interaction.commandName);
        
        // Execute command
        await command.execute(interaction);
      } catch (error) {
        console.error(`Error executing command ${interaction.commandName}:`, error);
        
        const errorMessage = { 
          content: 'There was an error while executing this command!', 
          ephemeral: true 
        };
        
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp(errorMessage);
        } else {
          await interaction.reply(errorMessage);
        }
      }
    }
    
    // Handle button interactions for giveaways
    if (interaction.isButton()) {
      if (interaction.customId.startsWith('giveaway_')) {
        const giveawayCommand = interaction.client.commands.get('giveaway');
        if (giveawayCommand && giveawayCommand.handleButton) {
          await giveawayCommand.handleButton(interaction);
        }
      }
    }
    
    // Handle modal submissions
    if (interaction.isModalSubmit()) {
      if (interaction.customId.startsWith('giveaway_')) {
        const giveawayCommand = interaction.client.commands.get('giveaway');
        if (giveawayCommand && giveawayCommand.handleModal) {
          await giveawayCommand.handleModal(interaction);
        }
      }
    }
  },
};
