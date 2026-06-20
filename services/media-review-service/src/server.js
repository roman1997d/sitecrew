const app = require('./app');
const env = require('./config/env');

app.listen(env.port, () => {
  console.log(`Media Review Service running on http://localhost:${env.port}`);
});
