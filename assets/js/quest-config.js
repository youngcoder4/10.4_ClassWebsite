/* ============================================================
   Quest + Minigame shared config — Lớp 10.4
   ------------------------------------------------------------
   One place for everything the quest flow, the admin review
   window and the token minigame need: who the admins are, the
   EmailJS keys, the prize table, and the Firebase Database /
   Storage handles.

   >>> THINGS YOU MUST FILL IN (see SETUP-quest.md) <<<
   • EMAILJS.*      — public IDs from https://emailjs.com
   • ADMIN_PASSWORD — unlocked via Ctrl+Shift+Alt+A on the sign-in page.
   ============================================================ */
import { configured } from "./auth-core.js";
import { getApp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-database.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-storage.js";

/* ---- admin unlock (hotkey Ctrl+Shift+Alt+A + password) ----
   NOTE: this password lives in client code, so it only keeps casual
   users out — it is NOT strong security. Firebase Database/Storage
   rules (which require a signed-in account) are the real guard. */
export const ADMIN_PASSWORD = "Bmc@172805";
const ADMIN_FLAG = "admin:unlocked";

export function adminUnlocked() {
	try { return sessionStorage.getItem(ADMIN_FLAG) === "1"; } catch (_) { return false; }
}
export function unlockAdmin(pw) {
	if (pw === ADMIN_PASSWORD) {
		try { sessionStorage.setItem(ADMIN_FLAG, "1"); } catch (_) {}
		return true;
	}
	return false;
}
export function lockAdmin() {
	try { sessionStorage.removeItem(ADMIN_FLAG); } catch (_) {}
}

/* ---- EmailJS (client-side email; keys are public by design) ----
   Make a free account at https://www.emailjs.com, add an email
   service + a template, then paste the 3 IDs below. The template
   should accept these variables: to_email, to_name, subject,
   message. Until these are filled, the app still works — it just
   stores the message on the user's account instead of emailing. */
export const EMAILJS = {
	publicKey:  "YOUR_EMAILJS_PUBLIC_KEY",   // Account → General → Public Key
	serviceId:  "service_75ls014",           // ✓ provided
	templateId: "YOUR_EMAILJS_TEMPLATE_ID"   // Email Templates → your template ID (template_xxxxxxx)
};

export function emailjsReady() {
	return (
		typeof window !== "undefined" &&
		window.emailjs &&
		EMAILJS.publicKey.indexOf("YOUR_") !== 0 &&
		EMAILJS.serviceId.indexOf("YOUR_") !== 0 &&
		EMAILJS.templateId.indexOf("YOUR_") !== 0
	);
}

/* Send one email through EmailJS. Returns true on success, false
   if EmailJS isn't configured or the send failed (caller decides
   what to do — we always also store the message in the database). */
export async function sendQuestEmail({ toEmail, toName, subject, message }) {
	if (!emailjsReady()) return false;
	try {
		window.emailjs.init({ publicKey: EMAILJS.publicKey });
		await window.emailjs.send(EMAILJS.serviceId, EMAILJS.templateId, {
			to_email: toEmail,
			to_name: toName || toEmail,
			subject: subject,
			message: message
		});
		return true;
	} catch (err) {
		console.warn("EmailJS send failed:", err);
		return false;
	}
}

/* ---- quest tuning ---- */
export const QUEST_IMAGE_MIN = 1;     // fewest images a user may submit
export const QUEST_IMAGE_MAX = 5;     // most images a user may submit
export const TOKENS_ON_APPROVE = 5;   // tokens granted when admin accepts

/* ---- minigame prize table ----
   `stock` seeds the inventory the FIRST time the game loads.
   `weight` sets how often the reel lands on it (higher = more
   common). "Try again" fills the rest so prizes stay limited. */
export const PRIZES = [
	{ id: "small",    code: "SM", name: "1 small bag of candy", stock: 10, weight: 20, emoji: "🍬", accent: "#22c55e" },
	{ id: "medium",   code: "MD", name: "Medium candy bag",     stock: 5,  weight: 9,  emoji: "🍭", accent: "#3b82f6" },
	{ id: "full",     code: "FL", name: "Full candy bag",       stock: 5,  weight: 6,  emoji: "🎁", accent: "#a855f7" },
	{ id: "mooncake", code: "MC", name: "Mooncake",             stock: 3,  weight: 3,  emoji: "🥮", accent: "#eab308" }
];
export const TRY_AGAIN = { id: "tryagain", code: "NA", name: "Try again", weight: 46, emoji: "🔁", accent: "#94a3b8" };

/* ---- Firebase Database + Storage (app is inited by auth-core) ---- */
export const db = configured ? getDatabase(getApp()) : null;
export const storage = configured ? getStorage(getApp()) : null;

/* A short RANDOM code — generated once per user and saved to the
   database, then reused every visit, so each user keeps one stable
   code they paste into their like/comment so the class can tell
   whose comment is whose. e.g. "K7F3Q" (no easily-confused chars). */
export function randomCode(len = 5) {
	const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no O/0/I/1
	let out = "";
	for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
	return out;
}

/* Short, human-readable proof id, e.g. Q104-MC-LZ4K9A. */
export function makeWinId(code) {
	const rnd = Math.random().toString(36).slice(2, 6).toUpperCase();
	const t = Date.now().toString(36).slice(-3).toUpperCase();
	return `Q104-${code}-${t}${rnd}`;
}
