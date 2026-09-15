// Reflects login state in the navbar's #auth-actions box on every content page.
// Signed-in + verified  -> greeting + "Đăng xuất".
// Otherwise             -> the default "Sign in" / "Sign up" buttons.
import { auth, configured, isVerified } from "./auth-core.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";

const box = document.getElementById("auth-actions");

function renderSignedOut() {
	if (!box) return;
	box.textContent = "";

	const signin = document.createElement("a");
	signin.className = "btn btn-outline-secondary";
	signin.href = "signin.html";
	signin.textContent = "Sign in";

	const signup = document.createElement("a");
	signup.className = "btn btn-primary";
	signup.href = "signup.html";
	signup.textContent = "Sign up";

	box.append(signin, signup);
}

function renderSignedIn(user) {
	if (!box) return;
	box.textContent = "";

	const who = user.displayName || user.email || "Khách";
	const tag = document.createElement("span");
	tag.className = "navbar-text me-2 text-truncate";
	tag.style.maxWidth = "160px";
	tag.title = who;
	tag.textContent = "👋 " + who;

	const out = document.createElement("button");
	out.className = "btn btn-outline-secondary";
	out.type = "button";
	out.textContent = "Đăng xuất";
	out.addEventListener("click", async () => {
		try { await signOut(auth); } catch (_) {}
		location.reload();
	});

	box.append(tag, out);
}

// When Firebase isn't configured yet, leave the static HTML buttons in place.
if (box && configured && auth) {
	onAuthStateChanged(auth, (user) => {
		if (isVerified(user)) renderSignedIn(user);
		else renderSignedOut();
	});
}
