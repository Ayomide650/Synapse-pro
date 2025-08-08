const { PermissionsBitField } = require('discord.js');
const database = require('../utils/database');

module.exports = {
  name: 'serverinvite',
  description: 'Generates a server invite link with optional expiration and use limits.',
  options: [
    {
      name: 'expires',
      type: 'STRING',
      description: 'Expiration time (e.g., 1h, 1d, 7d)',
      required: false,
    },
    {
      name: 'max_uses',
      type: 'INTEGER',
      description: 'Maximum number of uses (0 for unlimited)',
      required: false,
    },
  ],
  async execute(interaction) {
    if (!interaction.member.permissions.has(PermissionsBitField.Flags.CreateInstantInvite)) {
      return interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
    }

    const expires = interaction.options.getString('expires');
    const maxUses = interaction.options.getInteger('max_uses') || 0;

    try {
      // Convert time string to seconds
      let expiresIn = 0;
      if (expires) {
        const match = expires.match(/^(\d+)([hdw])$/);
        if (match) {
          const [, amount, unit] = match;
          expiresIn = amount * (unit === 'h' ? 3600 : unit === 'd' ? 86400 : 604800);
        }
      }

      const invite = await interaction.channel.createInvite({
        maxAge: expiresIn,
        maxUses: maxUses,
        unique: true,
        reason: `Created by ${interaction.user.tag}`,
      });

      // Log invite creation
      const action = {
        type: 'createinvite',
        code: invite.code,
        creator: interaction.user.tag,
        creatorId: interaction.user.id,
        maxAge: expiresIn,
        maxUses: maxUses,
      };
      await database.logModerationAction(interaction.guild.id, action);

      await interaction.reply({
        content: `✅ Created invite: ${invite.url}\n` +
                `Expires: ${expiresIn ? `in ${expires}` : 'never'}\n` +
                `Max uses: ${maxUses || 'unlimited'}`,
      });
    } catch (error) {
      console.error('Error creating invite:', error);
      interaction.reply({ content: '❌ Failed to create invite.', ephemeral: true });
    }
  },
};
