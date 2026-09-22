/* ============================================================
   Quest popup bar — drops down from the top on every visit.
   ------------------------------------------------------------
   "Quick Quest · Easy Present"  [Continue] [No thanks]

   • Continue + no verified user  -> signup.html?next=quest.html
   • Continue + signed in         -> quest.html
   • No thanks                    -> hidden for the rest of the session
   • Already submitted / approved -> bar never shows
   ============================================================ */
import { auth, configured, isVerified } from "./auth-core.js";
import { db } from "./quest-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";
import { ref, get } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-database.js";

const DISMISS_KEY = "quest:dismissed";

function alreadyDismissed() {
	try { return sessionStorage.getItem(DISMISS_KEY) === "1"; } catch (_) { return false; }
}
function markDismissed() {
	try { sessionStorage.setItem(DISMISS_KEY, "1"); } catch (_) {}
}

function buildBar() {
	const bar = document.createElement("div");
	bar.id = "quest-bar";
	bar.setAttribute("role", "region");
	bar.setAttribute("aria-label", "Quest mời tham gia");
	bar.innerHTML = `
		<div class="qb-inner">
			<div class="qb-text">
				<span class="qb-spark" aria-hidden="true">🎁</span>
				<span class="qb-title">Quick Quest · Easy Present</span>
				<span class="qb-sub">Làm nhiệm vụ nhỏ — nhận token chơi vòng quay quà 🍬</span>
			</div>
			<div class="qb-actions">
				<button type="button" class="qb-btn qb-continue">Continue</button>
				<button type="button" class="qb-btn qb-no">No thanks</button>
			</div>
		</div>`;

	const style = document.createElement("style");
	style.textContent = `
		#quest-bar{position:sticky;top:0;z-index:1080;transform:translateY(-100%);
			transition:transform .45s cubic-bezier(.2,.8,.2,1);
			background:linear-gradient(90deg,#0d1b2a,#123524 55%,#1c5c3a);color:#fff;
			box-shadow:0 8px 24px -12px rgba(0,0,0,.6)}
		#quest-bar.show{transform:translateY(0)}
		#quest-bar .qb-inner{max-width:1140px;margin:0 auto;display:flex;align-items:center;
			justify-content:space-between;gap:16px;padding:10px 16px;flex-wrap:wrap}
		#quest-bar .qb-text{display:flex;align-items:center;gap:10px;flex-wrap:wrap;min-width:0}
		#quest-bar .qb-spark{font-size:1.35rem;animation:qbpop 1.8s ease-in-out infinite}
		@keyframes qbpop{0%,100%{transform:translateY(0) rotate(0)}50%{transform:translateY(-3px) rotate(-8deg)}}
		#quest-bar .qb-title{font-weight:700;letter-spacing:.02em;font-size:1.02rem}
		#quest-bar .qb-sub{font-size:.86rem;color:#cfe8d9}
		#quest-bar .qb-actions{display:flex;gap:8px;flex:0 0 auto}
		#quest-bar .qb-btn{cursor:pointer;border-radius:8px;border:1px solid rgba(255,255,255,.35);
			padding:8px 16px;font-weight:600;font-size:.9rem;transition:.15s}
		#quest-bar .qb-continue{background:#ffcf3f;border-color:#ffcf3f;color:#20180a}
		#quest-bar .qb-continue:hover{filter:brightness(1.06);transform:translateY(-1px)}
		#quest-bar .qb-no{background:transparent;color:#e6f2ea}
		#quest-bar .qb-no:hover{background:rgba(255,255,255,.12)}
		@media (max-width:560px){#quest-bar .qb-sub{display:none}}
		@media (prefers-reduced-motion:reduce){#quest-bar{transition:none}#quest-bar .qb-spark{animation:none}}
	`;
	document.head.appendChild(style);
	document.body.prepend(bar);
	return bar;
}

async function questDone(user) {
	// Bar stays hidden once a submission is pending/approved for this user.
	if (!db || !user) return false;
	try {
		const snap = await get(ref(db, `users/${user.uid}/quest/status`));
		const s = snap.val();
		return s === "submitted" || s === "approved";
	} catch (_) { return false; }
}

function showBar() {
	if (alreadyDismissed()) return;
	if (document.getElementById("quest-bar")) return;
	const bar = buildBar();

	bar.querySelector(".qb-continue").addEventListener("click", () => {
		const user = auth && auth.currentUser;
		if (isVerified(user)) {
			window.location.href = "quest.html";
		} else {
			window.location.href = "signup.html?next=quest.html";
		}
	});
	bar.querySelector(".qb-no").addEventListener("click", () => {
		markDismissed();
		bar.classList.remove("show");
		setTimeout(() => bar.remove(), 450);
	});

	requestAnimationFrame(() => setTimeout(() => bar.classList.add("show"), 350));
}

// Decide whether to show, once we know the auth state.
if (!alreadyDismissed()) {
	if (configured && auth) {
		onAuthStateChanged(auth, async (user) => {
			if (isVerified(user) && (await questDone(user))) return; // already in the flow
			showBar();
		});
	} else {
		showBar(); // not configured yet — still invite (Continue -> signup)
	}
}
