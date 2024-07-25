const servers = [
  { name: 'Server 1', ip: '20.55.64.20', url: 'https://server.hogwart.tech/' }
];

const getStatus = async (req, res) => {
  const serverStatusPromises = servers.map(async server => {
    try {
      const response = await fetch(server.url);
      const status = response.ok ? 'Online' : 'Offline';
      return {
        ...server,
        status,
        lastChecked: new Date().toLocaleString()
      };
    } catch (error) {
      return {
        ...server,
        status: 'Offline',
        lastChecked: new Date().toLocaleString()
      };
    }
  });

  const serverStatus = await Promise.all(serverStatusPromises);
  res.json(serverStatus);
};

module.exports = { getStatus };
