process.env.FFMPEG_PATH = require("ffmpeg-static");

const {
  Client,
  GatewayIntentBits,
  ChannelType,
} = require("discord.js");
const {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
  VoiceConnectionStatus,
  StreamType,
  entersState,
  NoSubscriberBehavior,
} = require("@discordjs/voice");
const { createClient } = require("@supabase/supabase-js");
const googleTTS = require("google-tts-api");

const required = ["DISCORD_TOKEN", "DISCORD_GUILD_ID", "DISCORD_VOICE_CHANNEL_ID", "SUPABASE_URL", "SUPABASE_ANON_KEY"];
for (const key of required) {
  if (!process.env[key]) {
    console.error(`필수 환경변수가 없습니다: ${key}`);
    process.exit(1);
  }
}

// Railway/Render 서버의 시간대를 한국으로 고정하세요.
process.env.TZ = process.env.TZ || "Asia/Seoul";

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates] });
const player = createAudioPlayer({ behaviors: { noSubscriber: NoSubscriberBehavior.Play } });

const BOSSES = [
  { id: "chrysopagos", name: "크리소파고스", cycle: 8 },
  { id: "amorpos", name: "아모르포스", cycle: 8 },
  { id: "trason", name: "트라손", cycle: 8 },
  { id: "alastor", name: "알라스토르", cycle: 8 },
  { id: "vedix", name: "베딕스", cycle: 8 },
  { id: "gotsis", name: "고트시스", cycle: 8 },
  { id: "iocanthos", name: "이오칸토스", cycle: 12 },
  { id: "kini", name: "키니 러우리", cycle: 12 },
  { id: "tripok", name: "트리포크", cycle: 12 },
  { id: "giant-hand", name: "거인의 세번째 손", cycle: 12 },
  { id: "sealed-amorpos", name: "봉인된 아모르포스", cycle: 8, isInterBoss: true },
  { id: "sealed-vdeles", name: "봉인된 브델레스", cycle: 24 },
  { id: "argus", name: "아르고스", fixedDays: [1], fixedTime: "21:00" },
  { id: "medea", name: "메데이아", fixedDays: [2], fixedTime: "21:00" },
  { id: "arachne", name: "아라크네", fixedDays: [3], fixedTime: "21:00" },
  { id: "cerberus", name: "케르베로스", fixedDays: [5], fixedTime: "21:00" },
  { id: "chimera", name: "키메라", fixedDays: [6], fixedTime: "21:00" },
  { id: "skotolasma-front", name: "선봉의 스코톨라스마", fixedDays: [4, 1], fixedTime: "21:00" },
  { id: "skotolasma-fall", name: "함락의 스코톨라스마", fixedDays: [4, 1], fixedTime: "21:00" },
  { id: "abyss", name: "심연의 틈", dailyHours: [0, 12, 18] },
];

const POLL_MS = 10_000;
const ALERT_WINDOW_MS = 5 * 60_000 + POLL_MS;
const announced = new Set();
let voiceConnection = null;
let speaking = false;
const speechQueue = [];

function nextWeekly(days, time, now) {
  if (!Array.isArray(days) || !days.length || !time) return null;
  const [hour, minute] = time.split(":").map(Number);
  for (let offset = 0; offset <= 7; offset++) {
    const candidate = new Date(now);
    candidate.setDate(candidate.getDate() + offset);
    if (days.includes(candidate.getDay())) {
      candidate.setHours(hour, minute || 0, 0, 0);
      if (candidate > now) return candidate;
    }
  }
  return null;
}

function nextDaily(hours, now) {
  if (!Array.isArray(hours) || !hours.length) return null;
  const candidates = hours.map((hour) => {
    const d = new Date(now);
    d.setHours(hour, 0, 0, 0);
    if (d <= now) d.setDate(d.getDate() + 1);
    return d;
  });
  return candidates.sort((a, b) => a - b)[0] || null;
}

function nextSpawn(boss, state, definition, now) {
  const days = definition ? (definition.fixed_days || []) : boss.fixedDays;
  const fixedTime = definition ? definition.fixed_time : boss.fixedTime;
  if (days?.length) return nextWeekly(days, fixedTime, now);
  if (boss.dailyHours) return nextDaily(boss.dailyHours, now);

  const saved = state?.next_spawn_at ? new Date(state.next_spawn_at) : null;
  if (boss.cycle && saved && !Number.isNaN(saved.getTime())) {
    if (saved > now) return saved;
    const period = boss.cycle * 60 * 60 * 1000;
    const passed = Math.floor((now.getTime() - saved.getTime()) / period) + 1;
    return new Date(saved.getTime() + passed * period);
  }
  if (saved && saved > now) return saved;
  return null;
}

async function speak(text) {
  speechQueue.push(text);
  if (speaking) return;
  speaking = true;
  while (speechQueue.length) {
    const line = speechQueue.shift();
    try {
      const url = googleTTS.getAudioUrl(line, { lang: "ko", slow: false, host: "https://translate.google.com" });
      const resource = createAudioResource(url, { inputType: StreamType.Arbitrary });
      await new Promise((resolve, reject) => {
        const onIdle = () => cleanup(resolve);
        const onError = (error) => cleanup(() => reject(error));
        const cleanup = (done) => {
          player.off(AudioPlayerStatus.Idle, onIdle);
          player.off("error", onError);
          done();
        };
        player.once(AudioPlayerStatus.Idle, onIdle);
        player.once("error", onError);
        player.play(resource);
      });
    } catch (error) {
      console.error("음성 안내 실패:", error.message);
    }
  }
  speaking = false;
}

async function connectVoice() {
  const channel = await client.channels.fetch(process.env.DISCORD_VOICE_CHANNEL_ID);
  if (!channel || ![ChannelType.GuildVoice, ChannelType.GuildStageVoice].includes(channel.type)) {
    throw new Error("DISCORD_VOICE_CHANNEL_ID가 올바른 음성 채널 ID가 아닙니다.");
  }
  if (channel.guild.id !== process.env.DISCORD_GUILD_ID) {
    throw new Error("음성 채널이 설정한 디스코드 서버에 속해 있지 않습니다.");
  }

  if (voiceConnection) {
    try { voiceConnection.destroy(); } catch {}
  }
  voiceConnection = joinVoiceChannel({
    channelId: channel.id,
    guildId: channel.guild.id,
    adapterCreator: channel.guild.voiceAdapterCreator,
    selfDeaf: true,
    selfMute: false,
  });
  voiceConnection.subscribe(player);
  await entersState(voiceConnection, VoiceConnectionStatus.Ready, 30_000);
  console.log(`음성 채널 접속 완료: ${channel.name}`);
}

async function checkBosses() {
  const [{ data: states, error: stateError }, { data: definitions, error: defError }] = await Promise.all([
    supabase.from("boss_state").select("boss_id,next_spawn_at"),
    supabase.from("boss_definitions").select("id,name,fixed_days,fixed_time,is_inter_boss"),
  ]);
  if (stateError) throw stateError;
  if (defError) throw defError;

  const stateMap = new Map((states || []).map((row) => [row.boss_id, row]));
  const definitionMap = new Map((definitions || []).map((row) => [row.id, row]));
  const now = new Date();

  const customBosses = (definitions || []).filter((row) => row.id.startsWith("custom-")).map((row) => ({ id: row.id, name: row.name, fixedDays: row.fixed_days || [], fixedTime: row.fixed_time }));
  for (const boss of [...BOSSES, ...customBosses]) {
    const next = nextSpawn(boss, stateMap.get(boss.id), definitionMap.get(boss.id), now);
    if (!next) continue;
    const remaining = next.getTime() - now.getTime();
    const key = `${boss.id}:${next.toISOString()}`;
    if (remaining > 0 && remaining <= ALERT_WINDOW_MS && !announced.has(key)) {
      announced.add(key);
      const name = definitionMap.get(boss.id)?.name || boss.name;
      console.log(`5분 전 알림: ${name} / ${next.toLocaleString("ko-KR")}`);
      await speak(`${name}, 보스 출현 5분 전입니다.`);
    }
  }

  // 오래된 키를 정리해 메모리 증가를 막습니다.
  if (announced.size > 500) announced.clear();
}

client.once("ready", async () => {
  console.log(`디스코드 로그인 완료: ${client.user.tag}`);
  try {
    await connectVoice();
  } catch (error) {
    console.error("음성 채널 접속 실패:", error.message);
    process.exit(1);
  }

  await checkBosses().catch((error) => console.error("젠타임 확인 실패:", error.message));
  setInterval(() => {
    checkBosses().catch((error) => console.error("젠타임 확인 실패:", error.message));
  }, POLL_MS);
});

client.on("error", (error) => console.error("디스코드 클라이언트 오류:", error));
client.login(process.env.DISCORD_TOKEN);
