const { App } = require('@slack/bolt')

require('dotenv').config()

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET
})

app.message('hello', async ({ message, say }) => {
  console.log('Message received: ', message)
  await say(`Hey there <@${message.user}>!`)
});

(async () => {
  // Start your app
  try {
    await app.start(process.env.PORT || 3000)
    console.log('⚡️ Bolt app is running!')
  } catch (error) {
    console.error('Error starting app:', error)
  }
})()
