const redis = require("redis");
const crypto = require("crypto");

const redisClient = redis.createClient({
  url: "redis://127.0.0.1:6379",
});

const redisSub = redis.createClient({
  url: "redis://127.0.0.1:6379",
});

redisClient.on("error", (err) => console.log("Redis Client Error", err));
redisSub.on("error", (err) => console.log("Redis Sub Error", err));

let isConnected = false;

// Latest tarpit delay (ms) the AI layer has decided for each session, received
// over channel:session_control. The SSH handler reads this to slow attackers.
const tarpitBySession = {};

async function connectRedis() {
  if (!isConnected) {
    await redisClient.connect();
    await redisSub.connect();
    isConnected = true;

    // Track per-session tarpit decisions published by the AI layer.
    await redisSub.subscribe("channel:session_control", (message) => {
      try {
        const data = JSON.parse(message);
        if (data.session_id != null) {
          tarpitBySession[data.session_id] = data.tarpit_ms || 0;
        }
      } catch (e) {
        console.log("session_control parse error", e);
      }
    });
  }
}

connectRedis();

// Current tarpit delay (ms) for a session; 0 if none decided yet.
function getTarpitMs(sessionId) {
  return tarpitBySession[sessionId] || 0;
}

// Free per-session tarpit state when a session ends.
function clearSession(sessionId) {
  delete tarpitBySession[sessionId];
}

function publishLog(sessionId, ipAddress, command) {
  const payload = JSON.stringify({
    session_id: sessionId,
    ip_address: ipAddress,
    command: command,
    timestamp: new Date().toISOString(),
  });
  // publish ke channel dashboard & logging
  redisClient.publish("channel:ssh_activity", payload);
}

// function to ask the AI layer via Redis and wait for a response
async function askAI(sessionId, command) {
  return new Promise((resolve, reject) => {
    const reqId = crypto.randomUUID();
    const responseChannel = `response:${reqId}`;

    // subscribes to the response channel
    redisSub.subscribe(responseChannel, (message) => {
      redisSub.unsubscribe(responseChannel);
      clearTimeout(timeout);
      try {
        const parsed = JSON.parse(message);
        resolve(parsed.response);
      } catch (e) {
        resolve("");
      }
    });

    // publish request to AI layer
    const payload = JSON.stringify({
      session_id: sessionId,
      command: command,
      response_channel: responseChannel,
    });

    redisClient.publish("channel:ai_request", payload);

    const timeout = setTimeout(() => {
      redisSub.unsubscribe(responseChannel);
      resolve("bash: " + command.split(" ")[0] + ": command not found");
    }, 30000);
  });
}

module.exports = {
  publishLog,
  askAI,
  getTarpitMs,
  clearSession,
};
