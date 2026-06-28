const { publishLog, askAI } = require("./redisPublisher");

// Curated canned responses for the most common recon + crown-jewel files.
// These are instant and deterministic; everything else (including the bait and
// active tooling) falls through to the AI layer for dynamic emulation.
// publishLog runs first, so scoring / alerts / IOC fire for every command
// regardless of who ends up answering it.
const staticResponses = {
  pwd: "/root",
  whoami: "root",
  id: "uid=0(root) gid=0(root) groups=0(root)",
  "uname -a":
    "Linux server 5.15.0-76-generic #83-Ubuntu SMP Thu Jun 15 19:16:32 UTC 2023 x86_64 x86_64 x86_64 GNU/Linux",
  hostname: "server",
  ls: "snap  sys.log",
  "ls -la":
    "total 28\n" +
    "drwx------  3 root root 4096 Jun 28 14:02 .\n" +
    "drwxr-xr-x 18 root root 4096 Jun 10 09:14 ..\n" +
    "-rw-------  1 root root  431 Jun 28 13:55 .env\n" +
    "drwxr-xr-x  2 root root 4096 Jun 10 09:14 snap\n" +
    "-rw-r--r--  1 root root 1820 Jun 28 14:01 sys.log",
  "cat /etc/passwd":
    "root:x:0:0:root:/root:/bin/bash\n" +
    "daemon:x:1:1:daemon:/usr/sbin:/usr/sbin/nologin\n" +
    "www-data:x:33:33:www-data:/var/www:/usr/sbin/nologin\n" +
    "sshd:x:111:65534::/run/sshd:/usr/sbin/nologin\n" +
    "postgres:x:112:117:PostgreSQL administrator,,,:/var/lib/postgresql:/bin/bash\n" +
    "ubuntu:x:1000:1000:Ubuntu:/home/ubuntu:/bin/bash\n" +
    "deploy:x:1001:1001::/home/deploy:/bin/bash",
};

// Cheap deterministic handlers for variable-argument commands with predictable
// shell behaviour. Returns a string, or null to defer to the AI layer.
function quickHandle(command, cmdBase) {
  switch (cmdBase) {
    case "cd":
    case "chmod":
      return ""; // silent on success
    default:
      return null;
  }
}

async function handleCommand(sessionId, ipAddress, command) {
  // publish FIRST so scoring / alerts / IOC fire for every command
  publishLog(sessionId, ipAddress, command);
  const trimmed = command.trim();
  const cmdBase = trimmed.split(" ")[0];

  // 1. curated static layer (Option B) — instant & deterministic
  if (trimmed in staticResponses) {
    return staticResponses[trimmed];
  }

  // 2. simple echo handler
  if (cmdBase === "echo") {
    return command.substring(5).replace(/['"]/g, "");
  }

  // 3. cheap deterministic handlers
  const quick = quickHandle(trimmed, cmdBase);
  if (quick !== null) {
    return quick;
  }

  // 4. AI layer (Gemini) for everything else — now non-blocking & reliable
  //    (Option A). Handles the long tail, the '.env' bait, and active tooling.
  return await askAI(sessionId, command);
}

module.exports = {
  handleCommand,
};
