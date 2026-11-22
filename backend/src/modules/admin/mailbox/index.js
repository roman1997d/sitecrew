const router = require('./routes');
const {
  listMessages,
  getMessage,
  searchRecipients,
  sendMessage,
} = require('./service');

module.exports = {
  router,
  listMessages,
  getMessage,
  searchRecipients,
  sendMessage,
};
