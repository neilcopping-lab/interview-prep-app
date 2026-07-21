/**
 * Coaching call booking — the £29 add-on.
 *
 * PROTOTYPE MODE: this is a real, working slot-booking system (generates
 * genuine availability, prevents double-booking) but stores bookings in a
 * plain JSON file on local disk. That's fine for testing, but has two real
 * limitations to fix before taking paying customers:
 *
 *   1. On Render's free tier, local disk does not persist across restarts
 *      or redeploys — bookings could be silently lost. Use Render's paid
 *      persistent disk, or (better) a real database, before going live.
 *   2. There's no payment gate here. In production, /api/booking/book
 *      should only succeed after a confirmed £29 Stripe payment for that
 *      specific slot — otherwise anyone can book Neil's time for free.
 *
 * Also worth doing before launch: sync this with a real calendar (Google
 * Calendar API, or a Calendly-style integration) so slots can't be double
 * booked across other tools, and so confirmations/reminders send themselves.
 */

const fs = require("fs");
const path = require("path");

const DATA_DIR = path.join(__dirname, "..", "data");
const DATA_FILE = path.join(DATA_DIR, "bookings.json");

const SLOT_MINUTES = 20;
const DAYS_AHEAD = 14;

// Neil's available windows, by weekday (0 = Sunday ... 6 = Saturday), 24h UK time.
// Edit this to change availability — no code changes needed elsewhere.
const WEEKLY_AVAILABILITY = [
  { day: 1, start: "18:00", end: "20:00" }, // Monday
  { day: 2, start: "18:00", end: "20:00" }, // Tuesday
  { day: 3, start: "18:00", end: "20:00" }, // Wednesday
  { day: 4, start: "18:00", end: "20:00" }, // Thursday
];

function ensureDataFile() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, JSON.stringify({ bookings: [] }, null, 2));
}

function readBookings() {
  ensureDataFile();
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, "utf8")).bookings || [];
  } catch {
    return [];
  }
}

function writeBookings(bookings) {
  ensureDataFile();
  fs.writeFileSync(DATA_FILE, JSON.stringify({ bookings }, null, 2));
}

function generateSlots() {
  const slots = [];
  const now = new Date();
  for (let d = 0; d < DAYS_AHEAD; d++) {
    const date = new Date(now);
    date.setDate(date.getDate() + d);
    const weekday = date.getDay();
    WEEKLY_AVAILABILITY.filter((w) => w.day === weekday).forEach((w) => {
      const [startH, startM] = w.start.split(":").map(Number);
      const [endH, endM] = w.end.split(":").map(Number);
      let cursor = new Date(date);
      cursor.setHours(startH, startM, 0, 0);
      const end = new Date(date);
      end.setHours(endH, endM, 0, 0);
      while (cursor < end) {
        if (cursor > now) slots.push(new Date(cursor).toISOString());
        cursor = new Date(cursor.getTime() + SLOT_MINUTES * 60000);
      }
    });
  }
  return slots;
}

function getAvailableSlots() {
  const booked = new Set(readBookings().map((b) => b.slot));
  return generateSlots().filter((s) => !booked.has(s));
}

function bookSlot({ slot, name, email, companyName }) {
  const bookings = readBookings();
  if (bookings.some((b) => b.slot === slot)) {
    return { ok: false, error: "That slot has just been booked by someone else — please pick another." };
  }
  if (!generateSlots().includes(slot)) {
    return { ok: false, error: "That slot is no longer available — please pick another." };
  }
  const booking = { slot, name, email, companyName: companyName || "", bookedAt: new Date().toISOString() };
  bookings.push(booking);
  writeBookings(bookings);
  return { ok: true, booking };
}

module.exports = { getAvailableSlots, bookSlot, SLOT_MINUTES, WEEKLY_AVAILABILITY };
