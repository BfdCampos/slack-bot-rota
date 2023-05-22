// Import required libraries
require('dotenv').config();
const { App } = require('@slack/bolt');

// Initialise your app with your bot token and signing secret
const app = new App({
	token: process.env.SLACK_BOT_TOKEN,
	signingSecret: process.env.SLACK_SIGNING_SECRET
});

// Listens to incoming messages that contain "hello"
app.message('hello', async ({ message, say }) => {
	// say() sends a message to the channel where the event was triggered
	await say({
		blocks: [
			{
				type: 'section',
				text: {
					type: 'mrkdwn',
					text: `Hey there <@${message.user}>!`
				},
				accessory: {
					type: 'button',
					text: {
						type: 'plain_text',
						text: 'Click Me'
					},
					action_id: 'button_click'
				}
			}
		],
		text: `Hey there <@${message.user}>!`
	});
});

(async () => {
	// Start your app
	await app.start(process.env.PORT || 3000);

	console.log('⚡️ Bolt app is running!');
})();

