
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const database = require('../utils/database');

module.exports = {
  name: 'base64',
  description: 'Encode or decode base64 text',
  options: [
    {
      name: 'action',
      type: 'STRING',
      description: 'Choose to encode or decode',
      required: true,
      choices: [
        { name: 'Encode', value: 'encode' },
        { name: 'Decode', value: 'decode' }
      ]
    },
    {
      name: 'text',
      type: 'STRING',
      description: 'The text to encode or decode',
      required: true,
      max_length: 1500
    }
  ],
  async execute(interaction) {
    try {
      const action = interaction.options.getString('action');
      const text = interaction.options.getString('text');
      
      let result;
      let title;
      
      if (action === 'encode') {
        result = Buffer.from(text, 'utf8').toString('base64');
        title = '🔒 Base64 Encoded';
      } else {
        try {
          result = Buffer.from(text, 'base64').toString('utf8');
          title = '🔓 Base64 Decoded';
        } catch (error) {
          throw new Error('Invalid base64 string');
        }
      }

      // Split long results into multiple fields
      const maxFieldLength = 1024;
      const fields = [];
      
      if (result.length <= maxFieldLength) {
        fields.push({ name: 'Result', value: `\`\`\`${result}\`\`\`` });
      } else {
        let chunks = [];
        for (let i = 0; i < result.length; i += maxFieldLength - 6) {
          chunks.push(result.substring(i, i + maxFieldLength - 6));
        }
        
        chunks.forEach((chunk, index) => {
          fields.push({
            name: `Result (Part ${index + 1}/${chunks.length})`,
            value: `\`\`\`${chunk}\`\`\``
          });
        });
      }

      const embed = new EmbedBuilder()
        .setTitle(title)
        .setColor(action === 'encode' ? 'Green' : 'Blue')
        .addFields([
          { name: 'Input', value: `\`\`\`${text.length > 200 ? text.substring(0, 200) + '...' : text}\`\`\`` },
          ...fields
        ])
        .setFooter({ text: `${action === 'encode' ? 'Encoded' : 'Decoded'} ${text.length} characters` });

      await interaction.reply({ embeds: [embed] });

      
      await database.trackCommandUsage('base64', interaction.user.id, interaction.guild?.id);

    } catch (error) {
      console.error('Error with base64 operation:', error);
      
      const errorEmbed = new EmbedBuilder()
        .setTitle('❌ Error')
        .setDescription(error.message === 'Invalid base64 string' 
          ? 'Invalid base64 string provided for decoding.' 
          : 'An error occurred while processing your request.')
        .setColor('Red');

      await interaction.reply({ embeds: [errorEmbed] });
    }
  },
};
