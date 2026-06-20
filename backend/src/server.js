const app = require('./app');
const env = require('./config/env');

app.listen(env.port, () => {
  console.log(`SiteCrew backend API running on http://localhost:${env.port}`);
});
