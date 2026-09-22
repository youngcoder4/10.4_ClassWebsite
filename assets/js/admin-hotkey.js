/* Global admin unlock — press Ctrl+Shift+Alt+A anywhere to open a
   password window. Correct password -> jump to the admin hub.
   Self-contained (no Bootstrap needed) so it works on every page. */
import { unlockAdmin } from "./quest-config.js";

let overlay = null;

function buildOverlay() {
	overlay = document.createElement("div");
	overlay.id = "admin-hotkey-overlay";
	overlay.innerHTML = `
		<div class="ah-box" role="dialog" aria-modal="true" aria-label="Admin login">
			<div class="ah-title">🔐 Admin</div>
			<p class="ah-sub">Nhập mật khẩu quản trị để tiếp tục.</p>
			<input type="password" class="ah-input" placeholder="Mật khẩu" autocomplete="off" aria-label="Mật khẩu admin">
			<div class="ah-msg" role="status"></div>
			<div class="ah-actions">
				<button type="button" class="ah-btn ah-cancel">Huỷ</button>
				<button type="button" class="ah-btn ah-ok">Vào admin</button>
			</div>
		</div>`;

	const style = document.createElement("style");
	style.textContent = `
		#admin-hotkey-overlay{position:fixed;inset:0;z-index:2000;display:flex;align-items:center;justify-content:center;
			background:rgba(6,10,16,.7);backdrop-filter:blur(2px);padding:16px}
		#admin-hotkey-overlay .ah-box{width:100%;max-width:340px;background:#0e121a;color:#eef1f7;border:1px solid #2f3743;
			border-radius:14px;padding:22px;box-shadow:0 30px 70px -20px #000;font-family:system-ui,sans-serif}
		#admin-hotkey-overlay .ah-title{font-size:1.3rem;font-weight:700;margin-bottom:4px}
		#admin-hotkey-overlay .ah-sub{font-size:.86rem;color:#8b93a6;margin:0 0 14px}
		#admin-hotkey-overlay .ah-input{width:100%;padding:11px 12px;border-radius:9px;border:1px solid #2f3743;
			background:#05070b;color:#fff;font-size:1rem;letter-spacing:.05em}
		#admin-hotkey-overlay .ah-input:focus{outline:2px solid #ffcf3f;border-color:#ffcf3f}
		#admin-hotkey-overlay .ah-msg{min-height:18px;font-size:.82rem;color:#ff6b6b;margin:8px 2px 0}
		#admin-hotkey-overlay .ah-actions{display:flex;gap:8px;justify-content:flex-end;margin-top:14px}
		#admin-hotkey-overlay .ah-btn{cursor:pointer;border-radius:9px;padding:9px 16px;font-weight:600;font-size:.9rem;border:1px solid #2f3743;background:#12151d;color:#eef1f7}
		#admin-hotkey-overlay .ah-ok{background:linear-gradient(180deg,#ffe07a,#f3a712);border-color:#f3a712;color:#20180a}
		#admin-hotkey-overlay .ah-btn:hover{filter:brightness(1.08)}
	`;
	document.head.appendChild(style);
	document.body.appendChild(overlay);

	const input = overlay.querySelector(".ah-input");
	const msg = overlay.querySelector(".ah-msg");

	const submit = () => {
		if (unlockAdmin(input.value)) {
			msg.style.color = "#5be08a";
			msg.textContent = "✓ Đúng — đang mở admin…";
			const here = location.pathname.split("/").pop();
			if (here === "admin-review.html") location.reload();
			else location.href = "admin-review.html";
		} else {
			msg.style.color = "#ff6b6b";
			msg.textContent = "✗ Sai mật khẩu.";
			input.select();
		}
	};

	overlay.querySelector(".ah-ok").addEventListener("click", submit);
	overlay.querySelector(".ah-cancel").addEventListener("click", close);
	input.addEventListener("keydown", (e) => { if (e.key === "Enter") submit(); });
	overlay.addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });
	overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); });
}

function open() {
	if (!overlay) buildOverlay();
	overlay.style.display = "flex";
	const input = overlay.querySelector(".ah-input");
	input.value = "";
	overlay.querySelector(".ah-msg").textContent = "";
	setTimeout(() => input.focus(), 30);
}
function close() { if (overlay) overlay.style.display = "none"; }

// Ctrl + Shift + Alt + A
window.addEventListener("keydown", (e) => {
	if (e.ctrlKey && e.shiftKey && e.altKey && (e.key === "a" || e.key === "A" || e.code === "KeyA")) {
		e.preventDefault();
		open();
	}
});
