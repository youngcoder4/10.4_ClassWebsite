// Shared Firebase bootstrap for the whole 10.4 site.
// Every auth-aware script imports `auth` + `configured` from here, so the app
// is initialised exactly once (getApps() guard) no matter how many modules load.
import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js";
import { getAuth, setPersistence, browserLocalPersistence } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";
import { firebaseConfig, isConfigured } from "./firebase-config.js";

// True only after the real Firebase keys have been pasted into firebase-config.js.
export const configured = isConfigured();

// `auth` is null until the project is configured — importers must guard on `configured`.
export let auth = null;

if (configured) {
	const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
	auth = getAuth(app);
	// Keep sessions in localStorage so a login survives closing the browser.
	setPersistence(auth, browserLocalPersistence).catch((error) =>
		console.warn("Auth persistence unavailable; session may not survive restart.", error)
	);
}

// A user counts as "official" only when signed in AND email-verified.
export function isVerified(user) {
	return !!(user && user.emailVerified);
}
