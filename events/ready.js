
module.exports = {
  name: 'ready',
  once: true,
  async execute(client) {
    console.log(`✅ Logged in as ${client.user.tag}!`);
    console.log(`📊 Serving ${client.guilds.cache.size} servers with ${client.users.cache.size} users`);
    
    // Set bot status
    client.user.setActivity('Managing servers', { type: 'WATCHING' });
  },
};
