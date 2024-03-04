import {getCurrentFormattedTime, formatCurrentHumanTime} from "./helpers.js";

var Timer = function() {

	var that = this;
    this.time = 0,
	this.interval = null,
    this.running = false,
    this.port = null,
	this.audio = null,
	this.extensionUpdated = null,
	this.limitReached = false,
	this.idle = 0,

	this.setTime = function(time) {
		that.time = time;
		that.update();
	},

	this.play = function() {
        if (that.isRunning() || that.limitReached) {
            return;
        }

		that.setTime(that.time);
		that.interval = setInterval(function() {
			that.time++;
			that.setTime(that.time);
		}, 1000);
		that.setRunning(true);
		chrome.action.setBadgeBackgroundColor({color: '#2980b9'});
		that.updateIdle();
	},

    this.update = function() {
		that.sendMessage({
			time: getCurrentFormattedTime(that.time),
			isRunning: that.isRunning(),
			timeRaw: that.time
		});

		that.saveTime(that.time);
		chrome.action.setBadgeText({text: (that.time > 0 ? formatCurrentHumanTime(that.time) : '')});
		that.checkTimerLimitReached();

    },

	this.pause = function() {
		clearInterval(that.interval);
        that.setRunning(false);
        that.update();
		chrome.action.setBadgeBackgroundColor({color: '#d35400'});
	},

	this.stop = function() {
		that.pause();
		that.setTime(0);
		that.limitReached = false;
		that.checkTimerLimitReached();
		chrome.action.setBadgeBackgroundColor({color: '#e74c3c'});
		chrome.action.setBadgeText({text: ''});
		chrome.storage.sync.remove('time');
	},

    this.setRunning = function(value) {
        that.running = value;
    },

	this.isRunning = function() {
		return that.running;
	},

    this.saveTime = function(time, strict) {
		// if it's not strict saving then save every 3 seconds -> escape quota limit
		if (strict || time % 3 == 0) {
			chrome.storage.sync.set({'time': time});
		}
    },

	this.syncInitialTime = function() {
		chrome.storage.sync.get('time', function(obj) {
			if (obj.time) {
				that.setTime(obj.time);
			}
			that.update();
		});
	},

	this.playReminderSound = function(isReminder) {
		chrome.storage.sync.get('sound_option', function(obj) {
			var fileName;
			if (obj.sound_option && obj.sound_option == 'no_sound') {
				return false;
			}

			if (isReminder) {
				fileName = obj.sound_option ? obj.sound_option : "beep"
			} else {
				fileName = 'pause';
			}

			that.sendMessage({playSound: "/assets/" + fileName + ".mp3"});
		});
	},

	this.sendMessage = function(obj) {
		if (that.port) {
			that.port.postMessage(obj);
		}
	},

	this.checkExtensionUpdate = function() {
		that.sendMessage({
			extensionUpdated: that.extensionUpdated
		});
	},

	this.checkTimerLimitReached = function() {
		chrome.storage.sync.get('time_limit_option', function(obj) {
			if (obj.time_limit_option && (obj.time_limit_option * 60) <= that.time) {
				that.limitReached = true;
				if (that.isRunning()) {
					that.playReminderSound(true);
					that.pause();
				}
			} else if (that.time === 1800 || (that.time % 3600 === 0 && that.time !== 0)) {
				that.playReminderSound(true);
			} else {
				that.limitReached = false;
			}

			that.sendMessage({ timerLimitReached: that.limitReached });
		});
	},

	this.updateIdle = function() {
		chrome.storage.sync.get('idle', function(obj) {
			if (obj.idle > 0) {
				chrome.idle.setDetectionInterval(obj.idle * 60);
				chrome.idle.onStateChanged.addListener(function(state) {
					if (that.isRunning()) {
						if (state == 'idle') {
							that.pause();
							that.playReminderSound();
						}
					}
				});
			}
		});
	},

	// init channel connection with popup
    chrome.runtime.onConnect.addListener(function(port) {
        that.port = port;
        port.onMessage.addListener(function(msg) {
			var callable_actions = ['play', 'pause', 'stop', 'update', 'checkExtensionUpdate', 'checkTimerLimitReached'];
			if (msg.action && callable_actions.includes(msg.action)) {
				that[msg.action]();
			}
		});

        port.onDisconnect.addListener(function() {
            that.port = null;
        });
    });

	// first run after install/update
	chrome.runtime.onInstalled.addListener(function(details) {
	    if (details.reason == "install") {} else if (details.reason == "update") {
			that.extensionUpdated = chrome.runtime.getManifest().version;
	    } else {
			that.update();
		}
	});

	chrome.runtime.onStartup.addListener(function() {
		timer.syncInitialTime();
	});

	// keyboard shortcuts
	chrome.commands.onCommand.addListener(function(command) {
	    if (command == 'play_pause') {
			that.isRunning() ? that.pause() : that.play();
		} else if (command == 'stop') {
			that.stop();
		}
	});

	chrome.action.setBadgeBackgroundColor({color: '#e74c3c'});
	this.syncInitialTime();
}

var timer = new Timer();
chrome.timer = timer;