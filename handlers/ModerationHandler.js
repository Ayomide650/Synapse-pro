
const database = require('../utils/database');

class ModerationHandler {
  constructor(client) {
    this.client = client;
    this.checkInterval = 60000; // Check every minute
  }

  async start() {
    console.log('🛡️ Starting moderation handler...');
    this.startChecking();
  }

  async startChecking() {
    setInterval(async () => {
      try {
        await this.checkTempBans();
        await this.checkTempMutes();
        await this.checkTimeouts();
      } catch (error) {
        console.error('Error in moderation handler:', error);
      }
    }, this.checkInterval);
  }

  async checkTempBans() {
    try {
      const data = await database.read('moderation/temp_punishments.json');
      if (!data.tempbans) return;

      const now = Date.now();
      const toUnban = Object.entries(data.tempbans)
        .filter(([, ban]) => ban.expiresAt <= now);

      for (const [userId, ban] of toUnban) {
        const guild = this.client.guilds.cache.get(ban.guildId);
        if (guild) {
          try {
            await guild.members.unban(userId, 'Temporary ban expired');
            delete data.tempbans[userId];
            console.log(`Unbanned user ${userId} from ${guild.name}`);
          } catch (error) {
            console.error(`Failed to unban ${userId}:`, error);
          }
        }
      }

      if (toUnban.length > 0) {
        await database.write('moderation/temp_punishments.json', data);
      }
    } catch (error) {
      console.error('Error checking temp bans:', error);
    }
  }

  async checkTempMutes() {
    try {
      const data = await database.read('moderation/temp_punishments.json');
      if (!data.tempmutes) return;

      const now = Date.now();
      const toUnmute = Object.entries(data.tempmutes)
        .filter(([, mute]) => mute.expiresAt <= now);

      for (const [userId, mute] of toUnmute) {
        const guild = this.client.guilds.cache.get(mute.guildId);
        if (guild) {
          const member = guild.members.cache.get(userId);
          if (member && mute.muteRoleId) {
            try {
              await member.roles.remove(mute.muteRoleId, 'Temporary mute expired');
              delete data.tempmutes[userId];
              console.log(`Unmuted user ${userId} in ${guild.name}`);
            } catch (error) {
              console.error(`Failed to unmute ${userId}:`, error);
            }
          }
        }
      }

      if (toUnmute.length > 0) {
        await database.write('moderation/temp_punishments.json', data);
      }
    } catch (error) {
      console.error('Error checking temp mutes:', error);
    }
  }

  async checkTimeouts() {
    // Discord handles timeouts automatically, but we can clean up our records
    try {
      const data = await database.read('moderation/temp_punishments.json');
      if (!data.timeouts) return;

      const now = Date.now();
      const expired = Object.entries(data.timeouts)
        .filter(([, timeout]) => timeout.expiresAt <= now);

      for (const [userId] of expired) {
        delete data.timeouts[userId];
      }

      if (expired.length > 0) {
        await database.write('moderation/temp_punishments.json', data);
      }
    } catch (error) {
      console.error('Error checking timeouts:', error);
    }
  }
}

module.exports = ModerationHandler;
