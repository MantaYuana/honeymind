const { Server } = require("ssh2");
const fs = require("fs");
const crypto = require("crypto");
const path = require("path");
const { handleCommand } = require("./hybridRouter");

const PORT = 2222;
const KEY_PATH = path.join(__dirname, "host.key");

// generate RSA key if doesn't exist
if (!fs.existsSync(KEY_PATH)) {
  console.log("Generating RSA Host Key...");
  const { privateKey } = crypto.generateKeyPairSync("rsa", {
    modulusLength: 2048,
    publicKeyEncoding: { type: "spki", format: "pem" },
    privateKeyEncoding: { type: "pkcs1", format: "pem" },
  });
  fs.writeFileSync(KEY_PATH, privateKey);
}

const server = new Server(
  {
    hostKeys: [fs.readFileSync(KEY_PATH)],
  },
  (client) => {
    let clientIp = client._sock ? client._sock.remoteAddress : "unknown";
    let sessionId = crypto.randomUUID();
    console.log(`[${sessionId}] Client connected from ${clientIp}`);

    client
      .on("authentication", (ctx) => {
        // accept any username/password combination
        if (ctx.method === "password") {
          return ctx.accept();
        } else {
          return ctx.reject(["password"]);
        }
      })
      .on("ready", () => {
        client.on("session", (accept, reject) => {
          const session = accept();
          session.once("pty", (accept, reject, info) => {
            accept();
          });
          session.on("shell", (accept, reject) => {
            const stream = accept();
            stream.write(
              "Welcome to Ubuntu 22.04 LTS (GNU/Linux 5.15.0-76-generic x86_64)\r\n\r\n",
            );
            stream.write(" * Documentation:  https://help.ubuntu.com\r\n");
            stream.write(" * Management:     https://landscape.canonical.com\r\n");
            stream.write(" * Support:        https://ubuntu.com/advantage\r\n\r\n");
            stream.write("root@server:~# ");

            let inputBuffer = "";

            stream.on("data", async (data) => {
              const char = data.toString();

              if (char === "\r" || char === "\n") {
                stream.write("\r\n");
                const command = inputBuffer.trim();
                inputBuffer = "";

                if (command === "exit") {
                  stream.end();
                  client.end();
                  return;
                }

                if (command.length > 0) {
                  try {
                    const response = await handleCommand(sessionId, clientIp, command);
                    if (response) {
                      // fix newlines for PTY
                      const formattedResponse = response.replace(/\n/g, "\r\n");
                      stream.write(formattedResponse);
                      if (!formattedResponse.endsWith("\r\n")) {
                        stream.write("\r\n");
                      }
                    }
                  } catch (error) {
                    console.error("Error handling command:", error);
                  }
                }

                stream.write("root@server:~# ");
              }
              // this to handle Backspace
              else if (char === "\x7F" || char === "\b") {
                if (inputBuffer.length > 0) {
                  inputBuffer = inputBuffer.slice(0, -1);
                  stream.write("\b \b");
                }
              }
              // handle Ctrl+C
              else if (char === "\x03") {
                stream.write("^C\r\nroot@server:~# ");
                inputBuffer = "";
              } else {
                inputBuffer += char;
                stream.write(char);
              }
            });
          });
        });
      })
      .on("close", () => {
        console.log(`[${sessionId}] Client disconnected`);
      })
      .on("error", (err) => {
        console.error(`[${sessionId}] Client error:`, err);
      });
  },
);

server.listen(PORT, "0.0.0.0", () => {
  console.log(`SSH Honeypot listening on port ${PORT}`);
});
