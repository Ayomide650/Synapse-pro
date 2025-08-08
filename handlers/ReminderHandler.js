const { EmbedBuilder } = require('discord.js');
const database = require('../utils/database');

class ReminderHandler {
  constructor(client) {
    this.client = client;
    this.checkInterval = 60000; // Check every minute
    this.activeReminders = new Map();
  }

  async start() {
    console.log('🔄 Starting reminder handler...');
    await this.loadReminders();
    this.startChecking();
  }

  async loadReminders() {
    try {
      const data = await database.read('features/reminders.json');
      if (!Array.isArray(data.reminders)) data.reminders = [];

      // Clear existing timeouts
      this.activeReminders.forEach(timeout => clearTimeout(timeout));
      this.activeReminders.clear();

      // Set up timeouts for all reminders
      data.reminders.forEach(reminder => {
        const timeLeft = reminder.remindAt - Date.now();
        if (timeLeft > 0) {
          this.scheduleReminder(reminder);
        } else {
          this.handleExpiredReminder(reminder);
        }
      });

      console.log(`✅ Loaded ${data.reminders.length} reminders`);
    } catch (error) {
      console.error('Error loading reminders:', error);
    }
  }

  scheduleReminder(reminder) {
    const timeLeft = reminder.remindAt - Date.now();
    if (timeLeft <= 0) return;

    const timeout = setTimeout(() => {
      this.triggerReminder(reminder);
    }, timeLeft);

    this.activeReminders.set(reminder.userId + reminder.setAt, timeout);
  }

  async handleExpiredReminder(reminder) {
    try {
      await this.triggerReminder(reminder);
      await this.removeReminder(reminder);
    } catch (error) {
      console.error('Error handling expired reminder:', error);
    }
  }

  async triggerReminder(reminder) {
    try {
      const user = await this.client.users.fetch(reminder.userId);
      if (!user) return;

      const embed = new EmbedBuilder()
        .setTitle('⏰ Reminder')
        .setColor('Blue')
        .setDescription(
          `You asked me to remind you:\n` +
          `> ${reminder.message}\n\n` +
          `Reminder set: <t:${Math.floor(reminder.setAt / 1000)}:R>`
        );

      await user.send({ embeds: [embed] });
      await this.removeReminder(reminder);
    } catch (error) {
      console.error('Error triggering reminder:', error);
    }
  }

  async removeReminder(reminder) {
    try {
      const data = await database.read('features/reminders.json');
      if (!Array.isArray(data.reminders)) return;

      const index = data.reminders.findIndex(r => 
        r.userId === reminder.userId && r.setAt === reminder.setAt
      );

      if (index !== -1) {
        data.reminders.splice(index, 1);
        await database.write('features/reminders.json', data);
      }

      // Clear timeout
      const timeoutKey = reminder.userId + reminder.setAt;
      if (this.activeReminders.has(timeoutKey)) {
        clearTimeout(this.activeReminders.get(timeoutKey));
        this.activeReminders.delete(timeoutKey);
      }
    } catch (error) {
      console.error('Error removing reminder:', error);
    }
  }

  startChecking() {
    // Periodically check and reload reminders
    setInterval(() => this.loadReminders(), this.checkInterval);
  }

  stop() {
    this.activeReminders.forEach(timeout => clearTimeout(timeout));
    this.activeReminders.clear();
  }
}

module.exports = ReminderHandler;
