// Custom server for Railway: runs Next.js + the cron scheduler in one
// always-on process. Replaces Vercel's vercel.json crons.
//
// Schedules (all America/Los_Angeles, so DST is handled automatically):
//   - Build the day's queue:  8:30 AM, weekdays
//   - Send due emails:        every 5 min, 9:00 AM – 3:55 PM, weekdays
//   - Check Gmail for replies: hourly at :15
const next = require("next");
const http = require("http");
const cron = require("node-cron");

const port = parseInt(process.env.PORT || "3000", 10);
const dev = process.env.NODE_ENV !== "production";
const app = next({ dev });
const handle = app.getRequestHandler();

const TZ = "America/Los_Angeles";

async function hitCron(path) {
  try {
    const res = await fetch(`http://127.0.0.1:${port}${path}`, {
      headers: { authorization: `Bearer ${process.env.CRON_SECRET}` },
    });
    const body = await res.text();
    console.log(`[cron] ${path} -> ${res.status} ${body.slice(0, 300)}`);
  } catch (err) {
    console.error(`[cron] ${path} failed:`, err.message);
  }
}

app.prepare().then(() => {
  http
    .createServer((req, res) => handle(req, res))
    .listen(port, () => {
      console.log(`> Ready on port ${port}`);

      // 8:30 AM PT, Mon–Fri: build today's send queue (120 new + 80 follow-ups)
      cron.schedule("30 8 * * 1-5", () => hitCron("/api/cron/build-queue"), { timezone: TZ });

      // Every 5 min, 9 AM – 3:55 PM PT, Mon–Fri: send emails that are due.
      // The extra hour past 3 PM only flushes stragglers — the queue builder
      // schedules all send times inside the 9 AM – 3 PM window.
      cron.schedule("*/5 9-15 * * 1-5", () => hitCron("/api/cron/send"), { timezone: TZ });

      // Hourly: check tracked Gmail threads for replies
      cron.schedule("15 * * * *", () => hitCron("/api/cron/check-replies"), { timezone: TZ });

      console.log("> Cron scheduler armed (America/Los_Angeles)");
    });
});
