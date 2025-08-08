const { PermissionsBitField } = require('discord.js');
const database = require('../utils/database');
const ms = require('ms'); // Ensure the `ms` package is installed

module.exports = {
  name: 'tempban',
  description: 'Temporarily bans a user and logs the action.',
  options: [
    {
      name: 'user',
      type: 'USER',
      description: 'The user to temporarily ban',
      required: true,
    },
    {
      name: 'duration',
      type: 'STRING',
      description: 'Duration of the ban (e.g., 1h, 1d, 1w)',
      required: true,
    },
    {
      name: 'reason',
      type: 'STRING',
      description: 'Reason for the temporary ban',
      required: false,
    },
  ],
  async execute(interaction) {
    const member = interaction.options.getMember('user');
    const duration = interaction.options.getString('duration');
    const reason = interaction.options.getString('reason') || 'No reason provided';

    if (!interaction.member.permissions.has(PermissionsBitField.Flags.BanMembers)) {
      return interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
    }

    const durationMs = ms(duration);
    if (!durationMs || durationMs < 1000 || durationMs > 28 * 24 * 60 * 60 * 1000) {
      return interaction.reply({ content: 'Invalid duration. Please specify a duration between 1 second and 28 days.', ephemeral: true });
    }

    try {
      await member.ban({ reason });
      await interaction.reply({ content: `✅ Temporarily banned ${member.user.tag} for ${duration} with reason: ${reason}` });

      // Log the action
      const guildId = interaction.guild.id;
      const action = {
        type: 'tempban',
        user: member.user.tag,
        userId: member.id,
        moderator: interaction.user.tag,
        moderatorId: interaction.user.id,
        reason: reason,
        duration: duration,
        expiresAt: new Date(Date.now() + durationMs).toISOString(),
      };
      const fileName = 'moderation/temp_punishments.json';
      const data = await database.read(fileName);
      if (!data[guildId]) data[guildId] = [];
      data[guildId].push(action);
      await database.write(fileName, data);

      // Schedule unban
      setTimeout(async () => {
        try {
          await interaction.guild.members.unban(member.id, 'Temporary ban expired');
          console.log(`✅ Auto-unbanned ${member.user.tag} after temporary ban.`);
        } catch (error) {
          console.error(`❌ Failed to auto-unban ${member.user.tag}:`, error);
        }
      }, durationMs);
    } catch (error) {
      console.error('Error temporarily banning user:', error);
      interaction.reply({ content: '❌ Failed to temporarily ban the user. Please try again later.', ephemeral: true });
    }
  },
};
