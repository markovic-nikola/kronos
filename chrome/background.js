import { getCurrentFormattedTime, formatCurrentHumanTime } from "./helpers.js";

// --- Offscreen helpers ---
let creating;
async function hasOffscreenDocument() {
	const offscreenUrl = chrome.runtime.getURL("offscreen/offscreen.html");
	const existingContexts = await chrome.runtime.getContexts({
		contextTypes: ["OFFSCREEN_DOCUMENT"],
		documentUrls: [offscreenUrl],
	});
	return existingContexts.length > 0;
}

async function playAudio(path) {
	if (creating) {
		await creating;
	} else if (!(await hasOffscreenDocument())) {
		creating = chrome.offscreen.createDocument({
			url: "offscreen/offscreen.html",
			reasons: ["AUDIO_PLAYBACK"],
			justification: "Timer notifications require audio playback.",
		});
		await creating;
		creating = null;
	}
	await chrome.runtime.sendMessage({
		type: "play-audio",
		target: "offscreen",
		data: { path },
	});
}

// --- Main Timer Logic Object ---
const timer = {
	time: 0,
	interval: null,
	running: false,
	port: null,
	extensionUpdated: null,
	limitReached: false,

	setTime(time) {
		this.time = time;
		this.update();
	},

	play() {
		if (this.isRunning() || this.limitReached) {
			return;
		}
		this.setTime(this.time);
		this.interval = setInterval(() => {
			this.time++;
			this.setTime(this.time);
		}, 1000);
		this.setRunning(true);
		chrome.action.setBadgeBackgroundColor({ color: "#2980b9" });
		this.updateIdle();
	},

	update() {
		this.sendMessage({
			time: getCurrentFormattedTime(this.time),
			isRunning: this.isRunning(),
			timeRaw: this.time,
		});
		this.saveTime(this.time);
		chrome.action.setBadgeText({
			text: this.time > 0 ? formatCurrentHumanTime(this.time) : "",
		});
		this.checkTimerLimitReached();
	},

	pause() {
		clearInterval(this.interval);
		this.setRunning(false);
		this.update();
		chrome.action.setBadgeBackgroundColor({ color: "#d35400" });
	},

	stop() {
		this.pause();
		this.setTime(0);
		this.limitReached = false;
		this.checkTimerLimitReached();
		chrome.action.setBadgeBackgroundColor({ color: "#e74c3c" });
		chrome.action.setBadgeText({ text: "" });
		chrome.storage.sync.remove("time");
	},

	setRunning(value) {
		this.running = value;
	},

	isRunning() {
		return this.running;
	},

	saveTime(time, strict) {
		if (strict || time % 3 == 0) {
			chrome.storage.sync.set({ time: time });
		}
	},

	syncInitialTime() {
		chrome.storage.sync.get("time", (obj) => {
			if (obj && obj.time) {
				this.setTime(obj.time);
			}
			this.update();
		});
	},

	playReminderSound(isReminder) {
		chrome.storage.sync.get("sound_option", (obj) => {
			if (obj.sound_option && obj.sound_option == "no_sound") {
				return false;
			}
			const fileName = isReminder ? obj.sound_option || "beep" : "pause";
			playAudio(`/assets/${fileName}.mp3`);
		});
	},

	sendMessage(obj) {
		if (this.port) {
			this.port.postMessage(obj);
		}
	},

	checkExtensionUpdate() {
		this.sendMessage({
			extensionUpdated: this.extensionUpdated,
		});
	},

	checkTimerLimitReached() {
		chrome.storage.sync.get("time_limit_option", (obj) => {
			if (
				obj.time_limit_option &&
				obj.time_limit_option * 60 <= this.time
			) {
				this.limitReached = true;
				if (this.isRunning()) {
					this.playReminderSound(true);
					this.pause();
				}
			} else if (
				this.time === 1800 ||
				(this.time % 3600 === 0 && this.time !== 0)
			) {
				this.playReminderSound(true);
			} else {
				this.limitReached = false;
			}
			this.sendMessage({ timerLimitReached: this.limitReached });
		});
	},

	updateIdle() {
		chrome.storage.sync.get("idle", (obj) => {
			if (obj.idle && obj.idle > 0) {
				const idleSeconds = Math.max(15, obj.idle * 60);
				chrome.idle.setDetectionInterval(idleSeconds);
			}
		});
	},
};

// --- CHROME API EVENT LISTENERS ---
chrome.runtime.onConnect.addListener((port) => {
	timer.port = port;
	port.onMessage.addListener((msg) => {
		const callable_actions = [
			"play",
			"pause",
			"stop",
			"update",
			"checkExtensionUpdate",
			"checkTimerLimitReached",
		];
		if (msg.action && callable_actions.includes(msg.action)) {
			timer[msg.action]();
		}
	});
	port.onDisconnect.addListener(() => {
		timer.port = null;
	});
});

chrome.runtime.onInstalled.addListener((details) => {
	if (details.reason == "update") {
		timer.extensionUpdated = chrome.runtime.getManifest().version;
	}
	timer.updateIdle();
});

chrome.runtime.onStartup.addListener(() => {
	timer.syncInitialTime();
	timer.updateIdle();
});

chrome.commands.onCommand.addListener((command) => {
	if (command == "play_pause") {
		timer.isRunning() ? timer.pause() : timer.play();
	} else if (command == "stop") {
		timer.stop();
	}
});

chrome.storage.onChanged.addListener((changes, namespace) => {
	if (changes.idle) {
		timer.updateIdle();
	}
});

chrome.idle.onStateChanged.addListener((state) => {
	if (state === "idle" || state === "locked") {
		if (timer.isRunning()) {
			timer.pause();
			timer.playReminderSound();
		}
	}
});

// --- INITIALIZATION ---
timer.syncInitialTime();
chrome.action.setBadgeBackgroundColor({ color: "#e74c3c" });

self.timer = timer;
