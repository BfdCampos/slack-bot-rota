const { App } = require('@slack/bolt')

require('dotenv').config()

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET
})

// Logging for debugging
app.use(async ({ logger, next }) => {
  logger.info('Received a message')
  await next()
})

app.event('app_mention', async ({ event, say }) => {
  console.log(`Got message from user ${event.user}: ${event.text}`)
  await say(`Hello, <@${event.user}>`)
});

(async () => {
  await app.start(process.env.PORT || 3000)
  console.log('⚡️ Bolt app is running!')
})()
