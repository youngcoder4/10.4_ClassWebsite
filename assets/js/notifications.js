/* Global notification bell — shown in the navbar on every page.
   Live-reads the signed-in user's /users/<uid>/notifications (the
   approve / deny messages the admin sends) and shows an unread
   badge + a dropdown list. Injected next to the auth buttons so it
   survives navbar-auth.js re-rendering #auth-actions. */
import { auth, configured, isVerified } from "./auth-core.js";
import { db } from "./quest-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";
import { ref, onValue } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-database.js";

let wrap, btn, badge, panel, listEl;
let items = [];
let uid = null;
let unsub = null;

function seenKey() { return "notif:seen:" + (uid || "x"); }
function getSeen() { try { return Number(localStorage.getItem(seenKey())) || 0; } catch (_) { return 0; } }
function setSeen(t) { try { localStorage.setItem(seenKey(), String(t)); } catch (_) {} }

function build() {
	if (wrap) return;
	const host = document.getElementById("auth-actions") ||
		document.querySelector(".navbar .navbar-collapse .d-flex");
	if (!host || !host.parentNode) return;

	wrap = document.createElement("div");
	wrap.id = "notif-wrap";
	wrap.style.cssText = "position:relative;display:none;align-items:center";
	wrap.innerHTML = `
		<button type="button" id="notif-btn" class="btn btn-outline-secondary position-relative" aria-label="Thông báo" title="Thông báo">
			🔔
			<span id="notif-badge" class="position-absolute top-0 start-100 translate-middle badge rounded-pill text-bg-danger" style="display:none">0</span>
		</button>
		<div id="notif-panel" style="display:none;position:absolute;right:0;top:calc(100% + 8px);width:320px;max-width:86vw;z-index:1090;
			background:var(--bs-body-bg);border:1px solid var(--bs-border-color);border-radius:12px;box-shadow:0 24px 60px -24px rgba(0,0,0,.5);overflow:hidden">
			<div style="padding:12px 14px;font-weight:700;border-bottom:1px solid var(--bs-border-color)">Thông báo</div>
			<div id="notif-list" style="max-height:60vh;overflow:auto"></div>
		</div>`;
	host.parentNode.insertBefore(wrap, host);

	btn = wrap.querySelector("#notif-btn");
	badge = wrap.querySelector("#notif-badge");
	panel = wrap.querySelector("#notif-panel");
	listEl = wrap.querySelector("#notif-list");

	btn.addEventListener("click", togglePanel);
	document.addEventListener("click", (e) => { if (!wrap.contains(e.target)) closePanel(); });
	document.addEventListener("keydown", (e) => { if (e.key === "Escape") closePanel(); });
}

function esc(s) {
	return String(s == null ? "" : s).replace(/[&<>"']/g, (c) =>
		({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function render() {
	if (!listEl) return;
	if (!items.length) {
		listEl.innerHTML = `<div style="padding:22px 14px;color:var(--bs-secondary-color);text-align:center">Chưa có thông báo.</div>`;
	} else {
		listEl.innerHTML = items.map((n) => {
			const when = n.createdAt ? new Date(n.createdAt).toLocaleString("vi-VN") : "";
			return `<div style="padding:11px 14px;border-bottom:1px solid var(--bs-border-color)">
				<div style="font-weight:600;margin-bottom:2px">${esc(n.subject || "Thông báo")}</div>
				<div style="font-size:.86rem;color:var(--bs-secondary-color);white-space:pre-wrap">${esc(n.message || "")}</div>
				<div style="font-size:.72rem;color:var(--bs-secondary-color);margin-top:4px">${esc(when)}</div>
			</div>`;
		}).join("");
	}
	updateBadge();
}

function updateBadge() {
	if (!badge) return;
	const seen = getSeen();
	const unread = items.filter((n) => (n.createdAt || 0) > seen).length;
	if (unread > 0) { badge.textContent = unread > 99 ? "99+" : unread; badge.style.display = ""; }
	else badge.style.display = "none";
}

function togglePanel() { panel.style.display === "none" ? openPanel() : closePanel(); }
function openPanel() {
	if (!panel) return;
	panel.style.display = "block";
	// mark everything read
	const newest = items.reduce((m, n) => Math.max(m, n.createdAt || 0), 0);
	if (newest) setSeen(newest);
	updateBadge();
}
function closePanel() { if (panel) panel.style.display = "none"; }

function subscribe(user) {
	uid = user.uid;
	if (unsub) { unsub(); unsub = null; }
	unsub = onValue(ref(db, `users/${uid}/notifications`), (snap) => {
		const val = snap.val() || {};
		items = Object.values(val).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
		render();
	});
}

function showBell() { if (wrap) wrap.style.display = "flex"; }
function hideBell() {
	if (wrap) wrap.style.display = "none";
	if (unsub) { unsub(); unsub = null; }
	items = [];
}

if (configured && auth) {
	onAuthStateChanged(auth, (user) => {
		build();
		if (isVerified(user)) { showBell(); subscribe(user); }
		else hideBell();
	});
}
