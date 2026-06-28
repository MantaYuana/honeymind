const { createServer } = require("http");
const { parse } = require("url");
const next = require("next");
const { Server } = require("socket.io");
const redis = require("redis");

const dev = process.env.NODE_ENV !== "production";
const hostname = "localhost";
const port = 3000;
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(async () => {
  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error("Error occurred handling", req.url, err);
      res.statusCode = 500;
      res.end("internal server error");
    }
  });

  const io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  const redisSub = redis.createClient({
    url: "redis://127.0.0.1:6379",
  });

  redisSub.on("error", (err) => console.log("Redis Sub Error", err));
  await redisSub.connect();

  // Relay each AI/hub Redis channel to the browser over Socket.IO.
  const relay = (channel, event) => {
    redisSub.subscribe(channel, (message) => {
      try {
        io.emit(event, JSON.parse(message));
      } catch (e) {
        console.error(`Error parsing message on ${channel}`, e);
      }
    });
  };

  relay("channel:ssh_activity", "ssh_activity"); // raw command stream
  relay("channel:intel", "intel"); // per-session score / archetype / tier
  relay("channel:ioc_feed", "ioc_feed"); // exported IOC bundles (tier 3)

  io.on("connection", (socket) => {
    console.log("Client connected to dashboard socket");
    socket.on("disconnect", () => {
      console.log("Client disconnected");
    });
  });

  server.listen(port, () => {
    console.log(`> Ready on http://${hostname}:${port}`);
  });
});
