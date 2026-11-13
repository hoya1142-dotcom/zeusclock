# ZEUS BOSS CLOCK Discord Voice Bot

The bot stays connected to one Discord voice channel and speaks Korean when a boss is five minutes from its next spawn time.

## Required environment variables

Set these as private environment variables in your bot host. Never commit tokens or secrets to GitHub.

- `DISCORD_TOKEN`: Discord bot token
- `DISCORD_GUILD_ID`: Discord server ID
- `DISCORD_VOICE_CHANNEL_ID`: Voice channel ID where the bot should stay
- `SUPABASE_URL`: `https://wpeqlhkidhtyrncixmxd.supabase.co`
- `SUPABASE_ANON_KEY`: Supabase publishable/anon key used by the website

## Discord bot permissions

Invite the bot with:
- View Channel
- Connect
- Speak

The bot needs the `bot` OAuth2 scope. It does not need Administrator.

## Run

Use Node.js 20 or newer:

```bash
npm install
npm start
```

Set the service to a persistent/always-on worker. Do not use a sleeping web service for voice alerts.

## Notes

- The bot checks Supabase every 10 seconds.
- It announces only the five-minute warning.
- The bot uses Asia/Seoul time.
- The bot must be able to SELECT from the existing `boss_state` and `boss_definitions` tables.
- Keep the bot running on an always-on worker. A process restart can cause a repeat alert if it restarts inside the five-minute window.
- Built-in boss recurrence and weekly schedules are mirrored from the ZEUS BOSS CLOCK website source.
