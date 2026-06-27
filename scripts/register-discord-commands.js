// Register slash commands for the Dispatch bot with Discord API
// Usage: node scripts/register-discord-commands.js

require('dotenv').config({ path: '.env.local' });

const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN_DISPATCH;
const APP_ID = process.env.DISCORD_APP_ID_DISPATCH;

if (!BOT_TOKEN || !APP_ID) {
  console.error('Missing DISCORD_BOT_TOKEN_DISPATCH or DISCORD_APP_ID_DISPATCH in .env.local');
  process.exit(1);
}

const commands = [
  {
    name: 'status',
    description: 'Show the status of all bot agents and their schedules',
  },
  {
    name: 'dispatch',
    description: "Show today's dispatch schedule and job assignments",
  },
  {
    name: 'report',
    description: 'Generate a daily operations report',
  },
  {
    name: 'finance',
    description: "Show today's financial snapshot and MTD numbers",
  },
  {
    name: 'security',
    description: 'Run a security scan and show results',
  },
  {
    name: 'seo',
    description: 'Run an SEO audit on hardenhvacr.com',
  },
  {
    name: 'webdev',
    description: 'Show the last Web Developer bot run and fixes applied',
  },
];

async function registerCommands() {
  const url = `https://discord.com/api/v10/applications/${APP_ID}/commands`;

  console.log(`Registering ${commands.length} slash commands for app ${APP_ID}...\n`);

  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `Bot ${BOT_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(commands),
  });

  const data = await res.json();

  if (!res.ok) {
    console.error('Failed to register commands:', data);
    process.exit(1);
  }

  console.log(`Successfully registered ${data.length} commands:`);
  data.forEach((cmd) => console.log(`  /${cmd.name} — ${cmd.description}`));
  console.log('\nNow set the Interactions Endpoint URL in the Discord Developer Portal:');
  console.log('  https://hardenhvacr.com/api/webhooks/discord');
}

registerCommands();
