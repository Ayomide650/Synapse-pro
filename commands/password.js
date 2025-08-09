
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const crypto = require('crypto');
const database = require('../utils/database');

module.exports = {
  name: 'password',
  description: 'Generate a secure random password',
  options: [
    {
      name: 'length',
      type: 'INTEGER',
      description: 'Password length (default: 16)',
      required: false,
      min_value: 8,
      max_value: 128
    },
    {
      name: 'include_symbols',
      type: 'BOOLEAN',
      description: 'Include special symbols (default: true)',
      required: false
    },
    {
      name: 'include_numbers',
      type: 'BOOLEAN',
      description: 'Include numbers (default: true)',
      required: false
    },
    {
      name: 'include_uppercase',
      type: 'BOOLEAN',
      description: 'Include uppercase letters (default: true)',
      required: false
    },
    {
      name: 'include_lowercase',
      type: 'BOOLEAN',
      description: 'Include lowercase letters (default: true)',
      required: false
    },
    {
      name: 'count',
      type: 'INTEGER',
      description: 'Number of passwords to generate (default: 1, max: 5)',
      required: false,
      min_value: 1,
      max_value: 5
    }
  ],
  async execute(interaction) {
    try {
      const length = interaction.options.getInteger('length') || 16;
      const includeSymbols = interaction.options.getBoolean('include_symbols') ?? true;
      const includeNumbers = interaction.options.getBoolean('include_numbers') ?? true;
      const includeUppercase = interaction.options.getBoolean('include_uppercase') ?? true;
      const includeLowercase = interaction.options.getBoolean('include_lowercase') ?? true;
      const count = interaction.options.getInteger('count') || 1;

      // Character sets
      const lowercase = 'abcdefghijklmnopqrstuvwxyz';
      const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      const numbers = '0123456789';
      const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?';

      // Build character pool
      let charPool = '';
      if (includeLowercase) charPool += lowercase;
      if (includeUppercase) charPool += uppercase;
      if (includeNumbers) charPool += numbers;
      if (includeSymbols) charPool += symbols;

      if (charPool.length === 0) {
        const errorEmbed = new EmbedBuilder()
          .setTitle('❌ Error')
          .setDescription('You must include at least one character type!')
          .setColor('Red');

        return await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
      }

      // Generate passwords
      const passwords = [];
      for (let i = 0; i < count; i++) {
        let password = '';
        
        // Ensure at least one character from each selected type
        if (includeLowercase) password += lowercase[Math.floor(Math.random() * lowercase.length)];
        if (includeUppercase) password += uppercase[Math.floor(Math.random() * uppercase.length)];
        if (includeNumbers) password += numbers[Math.floor(Math.random() * numbers.length)];
        if (includeSymbols) password += symbols[Math.floor(Math.random() * symbols.length)];

        // Fill the rest randomly
        for (let j = password.length; j < length; j++) {
          const randomBytes = crypto.randomBytes(1);
          const randomIndex = randomBytes[0] % charPool.length;
          password += charPool[randomIndex];
        }

        // Shuffle the password to randomize the guaranteed characters
        password = password.split('').sort(() => Math.random() - 0.5).join('');
        passwords.push(password);
      }

      // Calculate password strength
      const getStrengthScore = (pwd) => {
        let score = 0;
        if (/[a-z]/.test(pwd)) score += 1;
        if (/[A-Z]/.test(pwd)) score += 1;
        if (/[0-9]/.test(pwd)) score += 1;
        if (/[^A-Za-z0-9]/.test(pwd)) score += 1;
        if (pwd.length >= 12) score += 1;
        if (pwd.length >= 16) score += 1;
        return score;
      };

      const getStrengthText = (score) => {
        if (score <= 2) return '🔴 Weak';
        if (score <= 4) return '🟡 Medium';
        if (score <= 5) return '🟢 Strong';
        return '🔵 Very Strong';
      };

      const strengthScore = getStrengthScore(passwords[0]);
      const strengthText = getStrengthText(strengthScore);

      const embed = new EmbedBuilder()
        .setTitle('🔐 Secure Password Generated')
        .setColor('Green')
        .addFields([
          { 
            name: 'Settings', 
            value: `Length: ${length}\nCharacter Types: ${[
              includeLowercase && 'Lowercase',
              includeUppercase && 'Uppercase', 
              includeNumbers && 'Numbers',
              includeSymbols && 'Symbols'
            ].filter(Boolean).join(', ')}`,
            inline: true 
          },
          { 
            name: 'Strength', 
            value: strengthText, 
            inline: true 
          }
        ]);

      // Add password fields
      passwords.forEach((password, index) => {
        embed.addFields([{
          name: count > 1 ? `Password ${index + 1}` : 'Password',
          value: `\`\`\`${password}\`\`\``,
          inline: false
        }]);
      });

      embed.setFooter({ text: '⚠️ Keep your passwords secure! • This message will be deleted in 2 minutes.' });

      const message = await interaction.reply({ embeds: [embed], ephemeral: true });

      // Auto-delete after 2 minutes for security
      setTimeout(async () => {
        try {
          await message.delete();
        } catch (error) {
          // Message might already be deleted
        }
      }, 120000);

      // Track command usage
      await database.trackCommandUsage('password', interaction.user.id, interaction.guild?.id);

    } catch (error) {
      console.error('Error generating password:', error);
      
      const errorEmbed = new EmbedBuilder()
        .setTitle('❌ Error')
        .setDescription('An error occurred while generating the password.')
        .setColor('Red');

      await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
    }
  },
};
