const axios = require('axios');

const servers = [
  { name: 'USA - NYC', ip: '204.48.23.28', url: 'https://server.hogwart.tech/api/trends' },
  { name: 'IND - DELHI', ip: '192.168.1.2', url: 'https://server.hogwart.tech/api/trends' },
];

const getStatus = async (req, res) => {
  try {
    const serverStatusPromises = servers.map(async server => {
      try {
        const startTime = Date.now();
        const response = await axios.get(server.url, { timeout: 5000 });
        const endTime = Date.now();
        const latency = endTime - startTime;

        return {
          name: server.name,
          ip: server.ip,
          status: response.status === 200 ? 'Online' : 'Offline',
          latency: `${latency}ms`,
          lastChecked: new Date().toISOString(),
          error: null
        };
      } catch (error) {
        return {
          name: server.name,
          ip: server.ip,
          status: 'Offline',
          latency: null,
          lastChecked: new Date().toISOString(),
          error: error.message
        };
      }
    });

    const serverStatus = await Promise.all(serverStatusPromises);
    res.json(serverStatus);
  } catch (error) {
    console.error('Error checking server status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = { getStatus };