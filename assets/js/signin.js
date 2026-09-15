// Log in with email + password (verified accounts only) or with Google.
// Google accounts come pre-verified, so they pass the account gate immediately.
import { auth, configured, isVerified } from "./auth-core.js";
import {
	signInWithEmailAndPassword,
	onAuthStateChanged,
	reload,
	signOut,
	GoogleAuthProvider,
	signInWithPopup
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";
import { getFriendlyFirebaseError } from "./firebase-config.js";

const form = document.getElementById("signin-form");
const msg = document.getElementById("auth-msg");
const btn = document.getElementById("submit-btn");
const warn = document.getElementById("config-warn");
const googleBtn = document.getElementById("google-btn");

// Where to go after a successful, verified login (defaults to the home page).
const next = new URLSearchParams(location.search).get("next") || "index.html";

function show(text, ok) {
	if (!msg) return;
	msg.textContent = text;
	msg.className = "mt-3 alert " + (ok ? "alert-success" : "alert-danger");
}

if (!configured || !auth) {
	warn?.classList.remove("d-none");
	if (btn) btn.disabled = true;
	if (googleBtn) googleBtn.disabled = true;
} else {
	// Already signed in and verified (persisted session) -> skip the form.
	onAuthStateChanged(auth, (user) => {
		if (isVerified(user)) window.location.replace(next);
	});

	form?.addEventListener("submit", async (event) => {
		event.preventDefault();
		const email = form.email.value.trim();
		const password = form.password.value;
		if (!email || !password) {
			show("Nhập đầy đủ email và mật khẩu.", false);
			return;
		}

		btn.disabled = true;
		btn.textContent = "Đang đăng nhập…";
		try {
			const cred = await signInWithEmailAndPassword(auth, email, password);
			await reload(cred.user);

			if (!cred.user.emailVerified) {
				await signOut(auth);
				show("Email chưa được xác minh. Hãy mở liên kết xác minh đã gửi tới email của bạn rồi đăng nhập lại.", false);
				btn.disabled = false;
				btn.textContent = "Đăng nhập";
				return;
			}

			show("Đăng nhập thành công! Đang mở trang…", true);
			setTimeout(() => window.location.replace(next), 900);
		} catch (error) {
			show(getFriendlyFirebaseError(error), false);
			btn.disabled = false;
			btn.textContent = "Đăng nhập";
		}
	});

	googleBtn?.addEventListener("click", async () => {
		const provider = new GoogleAuthProvider();
		provider.setCustomParameters({ prompt: "select_account" });
		googleBtn.disabled = true;
		try {
			await signInWithPopup(auth, provider);
			// Google emails are already verified -> straight in.
			show("Đăng nhập Google thành công! Đang mở trang…", true);
			setTimeout(() => window.location.replace(next), 700);
		} catch (error) {
			show(getFriendlyFirebaseError(error), false);
			googleBtn.disabled = false;
		}
	});
}
