// Log in with email + password, but only let VERIFIED accounts through —
// unverified users are signed back out with a reminder (StudentGpt behaviour).
import { auth, configured, isVerified } from "./auth-core.js";
import {
	signInWithEmailAndPassword,
	onAuthStateChanged,
	reload,
	signOut
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";
import { getFriendlyFirebaseError } from "./firebase-config.js";

const form = document.getElementById("signin-form");
const msg = document.getElementById("auth-msg");
const btn = document.getElementById("submit-btn");
const warn = document.getElementById("config-warn");

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
}
