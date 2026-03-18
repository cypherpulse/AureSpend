import { env } from "./config/env.js";
import { connectMongo } from "./db/mongoose.js";
import { app } from "./app.js";
import { startWorkers } from "./services/queue.js";

async function bootstrap() {
  await connectMongo();
  startWorkers();
  app.listen(env.PORT, () => {
    console.log(`Aurespend server listening on :${env.PORT}`);
  });
}

bootstrap().catch((error) => {
  console.error("Failed to start server", error);
  process.exit(1);
});
