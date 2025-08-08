const { PermissionsBitField } = require('discord.js');
const database = require('../utils/database');

module.exports = {
  name: 'rankrole',
  description: 'Manages level-based role rewards.',
  options: [
    {
      name: 'action',
      type: 'STRING',
      description: 'Action to perform',
      required: true,
      choices: [
        { name: 'Add', value: 'add' },
        { name: 'Remove', value: 'remove' },
        { name: 'List', value: 'list' },
      ],
    },
    {
      name: 'level',
      type: 'INTEGER',
      description: 'Level requirement (1-100)',
      required: false,
    },
    {
      name: 'role',
      type: 'ROLE',
      description: 'Role to assign at this level',
      required: false,
    },
  ],
  async execute(interaction) {
    if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      return interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
    }

    const action = interaction.options.getString('action');
    const level = interaction.options.getInteger('level');
    const role = interaction.options.getRole('role');

    try {
      const guildId = interaction.guild.id;
      const fileName = 'leveling/level_roles_config.json';
      const data = await database.read(fileName);

      if (!data[guildId]) data[guildId] = {};

      if (action === 'add') {
        if (!level || !role || level < 1 || level > 100) {
          return interaction.reply({ 
            content: 'Please provide a valid level (1-100) and role.', 
            ephemeral: true 
          });
        }

        data[guildId][level] = role.id;
        await database.write(fileName, data);
        return interaction.reply(`✅ Role ${role.name} will be assigned at level ${level}`);
      }

      if (action === 'remove') {
        if (!level || !data[guildId][level]) {
          return interaction.reply({ 
            content: 'No role configured for this level.', 
            ephemeral: true 
          });
        }

        delete data[guildId][level];
        await database.write(fileName, data);
        return interaction.reply(`✅ Removed role reward for level ${level}`);
      }

      // List action - handled by /levelroles command
      return interaction.reply({ 
        content: 'Please use the `/levelroles` command to view configured roles.', 
        ephemeral: true 
      });

    } catch (error) {
      console.error('Error managing rank roles:', error);
      interaction.reply({ content: '❌ Failed to manage rank roles.', ephemeral: true });
    }
  },
};
