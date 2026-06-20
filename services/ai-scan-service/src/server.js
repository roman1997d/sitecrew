const app = require('./app');
const env = require('./config/env');

app.listen(env.port, () => {
  console.log(`AI Scan Service running on http://localhost:${env.port}`);
});
