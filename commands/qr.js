
const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const QRCode = require('qrcode');
const database = require('../utils/database');

module.exports = {
  name: 'qr',
  description: 'Generate a QR code for any text or URL',
  options: [
    {
      name: 'text',
      type: 'STRING',
      description: 'The text or URL to encode in the QR code',
      required: true,
      max_length: 2000
    },
    {
      name: 'size',
      type: 'INTEGER',
      description: 'Size of the QR code (default: 200)',
      required: false,
      min_value: 100,
      max_value: 1000
    }
  ],
  async execute(interaction) {
    await interaction.deferReply();

    try {
      const text = interaction.options.getString('text');
      const size = interaction.options.getInteger('size') || 200;

      // Generate QR code as buffer
      const qrBuffer = await QRCode.toBuffer(text, {
        width: size,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });

      // Create attachment
      const attachment = new AttachmentBuilder(qrBuffer, { name: 'qrcode.png' });

      const embed = new EmbedBuilder()
        .setTitle('🔗 QR Code Generated')
        .setDescription(`**Text:** ${text.length > 100 ? text.substring(0, 100) + '...' : text}`)
        .setColor('Blue')
        .setImage('attachment://qrcode.png')
        .setFooter({ text: `Size: ${size}x${size}px` });

      await interaction.editReply({ embeds: [embed], files: [attachment] });

      // Track command usage
      await database.trackCommandUsage('qr', interaction.user.id, interaction.guild?.id);

    } catch (error) {
      console.error('Error generating QR code:', error);
      
      const errorEmbed = new EmbedBuilder()
        .setTitle('❌ Error')
        .setDescription('Failed to generate QR code. Please try again.')
        .setColor('Red');

      await interaction.editReply({ embeds: [errorEmbed] });
    }
  },
};
