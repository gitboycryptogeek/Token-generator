const path = require('path');

module.exports = function(app) {
  // Handle static files
  app.use('/static', (req, res, next) => {
    try {
      const filePath = path.join(__dirname, '..', 'public', req.path);
      res.sendFile(filePath);
    } catch (error) {
      next(error);
    }
  });

  // Handle manifest.json and favicon.ico
  app.get('/manifest.json', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'manifest.json'));
  });

  app.get('/favicon.ico', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'favicon.ico'));
  });
};