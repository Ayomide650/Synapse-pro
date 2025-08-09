
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const database = require('../utils/database');
const axios = require('axios');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('chatgpt')
    .setDescription('Chat with AI using ChatGPT or free alternatives')
    .addStringOption(option =>
      option.setName('message')
        .setDescription('Your message to the AI')
        .setRequired(true)
        .setMaxLength(1000))
    .addStringOption(option =>
      option.setName('model')
        .setDescription('AI model to use')
        .setRequired(false)
        .addChoices(
          { name: 'GPT-3.5 Turbo (OpenAI)', value: 'openai' },
          { name: 'Hugging Face (Free)', value: 'huggingface' },
          { name: 'Cohere (Free)', value: 'cohere' }
        )),

  async execute(interaction) {
    try {
      await interaction.deferReply();

      // Track command usage
      await database.trackCommandUsage('chatgpt', interaction.user.id, interaction.guild.id);

      const message = interaction.options.getString('message');
      const model = interaction.options.getString('model') || 'huggingface';

      // Check cooldown to prevent spam
      const cooldownKey = `chatgpt_${interaction.user.id}`;
      const lastUse = await this.getLastUse(cooldownKey);
      const cooldownTime = 30000; // 30 seconds

      if (lastUse && Date.now() - lastUse < cooldownTime) {
        const remaining = Math.ceil((cooldownTime - (Date.now() - lastUse)) / 1000);
        return await interaction.editReply({
          content: `⏰ Please wait ${remaining} seconds before using ChatGPT again.`,
          ephemeral: true
        });
      }

      // Set cooldown
      await this.setLastUse(cooldownKey);

      let response;
      switch (model) {
        case 'openai':
          response = await this.queryOpenAI(message);
          break;
        case 'huggingface':
          response = await this.queryHuggingFace(message);
          break;
        case 'cohere':
          response = await this.queryCohere(message);
          break;
        default:
          response = await this.queryHuggingFace(message);
      }

      const embed = new EmbedBuilder()
        .setTitle('🤖 AI Response')
        .setColor(0x00d4aa)
        .addFields(
          { name: '💭 Your Message', value: message.substring(0, 1000), inline: false },
          { name: '🎯 AI Response', value: response.substring(0, 1000), inline: false }
        )
        .setFooter({ text: `Model: ${this.getModelName(model)} • Response may be truncated` })
        .setTimestamp();

      if (response.length > 1000) {
        embed.setDescription('*Response was truncated due to length limits.*');
      }

      await interaction.editReply({ embeds: [embed] });

      // Log AI usage
      await this.logAIUsage(interaction.guild.id, interaction.user.id, model, message.length, response.length);

    } catch (error) {
      console.error('Error in chatgpt command:', error);
      
      let errorMessage = '❌ Failed to get AI response. ';
      if (error.message.includes('API key')) {
        errorMessage += 'API key not configured or invalid.';
      } else if (error.message.includes('quota')) {
        errorMessage += 'API quota exceeded. Try the free Hugging Face model.';
      } else {
        errorMessage += 'Please try again later.';
      }

      const reply = { content: errorMessage, ephemeral: true };

      if (interaction.deferred) {
        await interaction.editReply(reply);
      } else {
        await interaction.reply(reply);
      }
    }
  },

  async queryOpenAI(message) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const response = await axios.post('https://api.openai.com/v1/chat/completions', {
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: 'You are a helpful assistant in a Discord server. Keep responses concise and friendly.' },
        { role: 'user', content: message }
      ],
      max_tokens: 500,
      temperature: 0.7
    }, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    return response.data.choices[0].message.content;
  },

  async queryHuggingFace(message) {
    const apiKey = process.env.HUGGINGFACE_API_KEY;
    
    // Use free inference API (no key required for some models)
    const response = await axios.post(
      'https://api-inference.huggingface.co/models/microsoft/DialoGPT-medium',
      {
        inputs: message,
        parameters: {
          max_length: 500,
          temperature: 0.7,
          do_sample: true
        }
      },
      {
        headers: apiKey ? {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        } : {
          'Content-Type': 'application/json'
        }
      }
    );

    if (response.data.error) {
      throw new Error(response.data.error);
    }

    return response.data[0]?.generated_text || response.data.generated_text || 'Sorry, I couldn\'t generate a response.';
  },

  async queryCohere(message) {
    const apiKey = process.env.COHERE_API_KEY;
    if (!apiKey) {
      throw new Error('Cohere API key not configured');
    }

    const response = await axios.post('https://api.cohere.ai/v1/generate', {
      model: 'command-light',
      prompt: `Human: ${message}\nAI:`,
      max_tokens: 500,
      temperature: 0.7,
      stop_sequences: ['Human:', '\n\n']
    }, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    return response.data.generations[0].text.trim();
  },

  async getLastUse(key) {
    const data = await database.read('features/ai_cooldowns.json');
    return data[key] || null;
  },

  async setLastUse(key) {
    const data = await database.read('features/ai_cooldowns.json');
    data[key] = Date.now();
    await database.write('features/ai_cooldowns.json', data);
  },

  async logAIUsage(guildId, userId, model, inputLength, outputLength) {
    const data = await database.read('features/ai_usage_logs.json');
    const today = new Date().toISOString().split('T')[0];

    if (!data[today]) {
      data[today] = [];
    }

    data[today].push({
      guildId,
      userId,
      model,
      inputLength,
      outputLength,
      timestamp: new Date().toISOString()
    });

    // Keep only last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const cutoffDate = thirtyDaysAgo.toISOString().split('T')[0];

    Object.keys(data).forEach(date => {
      if (date < cutoffDate) {
        delete data[date];
      }
    });

    await database.write('features/ai_usage_logs.json', data);
  },

  getModelName(model) {
    const names = {
      openai: 'OpenAI GPT-3.5',
      huggingface: 'Hugging Face DialoGPT',
      cohere: 'Cohere Command'
    };
    return names[model] || 'Unknown';
  }
};
