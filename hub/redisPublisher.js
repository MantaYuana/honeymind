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

async function connectRedis() {
  if (!isConnected) {
    await redisClient.connect();
    await redisSub.connect();
    isConnected = true;
  }
}

connectRedis();

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

    // kill if AI too slow
    const timeout = setTimeout(() => {
      redisSub.unsubscribe(responseChannel);
      resolve("bash: " + command.split(" ")[0] + ": command not found");
    }, 15000);
  });
}

module.exports = {
  publishLog,
  askAI,
};
