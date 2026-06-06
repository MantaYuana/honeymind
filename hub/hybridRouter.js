const { publishLog, askAI } = require("./redisPublisher");

// commands dictionary
const staticResponses = {
  pwd: "/root",
  whoami: "root",
  id: "uid=0(root) gid=0(root) groups=0(root)",
  "uname -a":
    "Linux server 5.15.0-76-generic #83-Ubuntu SMP Thu Jun 15 19:16:32 UTC 2023 x86_64 x86_64 x86_64 GNU/Linux",
  ls: "snap  sys.log",
  hostname: "server",
};

async function handleCommand(sessionId, ipAddress, command) {
  // publish to logger
  publishLog(sessionId, ipAddress, command);
  const cmdBase = command.trim().split(" ")[0];

  // check static responses first
  if (staticResponses[command.trim()]) {
    return staticResponses[command.trim()];
  }

  // simple echo handler
  if (cmdBase === "echo") {
    return command.substring(5).replace(/['"]/g, "");
  }

  // send to AI Layer via Redis
  // only if its a complex command (like ls -la, cat /etc/passwd)
  const aiResponse = await askAI(sessionId, command);
  return aiResponse;
}

module.exports = {
  handleCommand,
};
