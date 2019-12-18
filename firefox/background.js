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
		browser.browserAction.setBadgeBackgroundColor({color: '#2980b9'});
		browser.browserAction.setBadgeTextColor({color: '#fff'});
		that.updateIdle();
	},

    this.update = function() {

		that.sendMessage({
			time: that.getCurrentFormattedTime(),
			isRunning: that.isRunning(),
			timeRaw: that.time
		});

		that.saveTime(that.time);
		browser.browserAction.setBadgeText({text: (that.time > 0 ? that.formatCurrentHumanTime() : '')});
		that.checkTimerLimitReached();

    },

	this.formatTime = function(time) {
		var times = {
			hours: Math.floor(time / 60 / 60)
		};
		times.hoursInSeconds = times.hours * 60 * 60;
		times.minutes = Math.floor((time - times.hoursInSeconds) / 60);
		times.minutesInSeconds = times.minutes * 60;
		times.seconds = Math.floor(time - (times.hoursInSeconds + times.minutesInSeconds));

		function twoDigitFormat(value) {
			return ('0' + value).slice(-2);
		}

		if (times.hours < 10) {
			times.hours = '0' + times.hours;
		}

		return times.hours + ':' + twoDigitFormat(times.minutes) + ':' + twoDigitFormat(times.seconds);
	},

    this.getCurrentFormattedTime = function(time) {
        return that.formatTime(that.time);
    },

	this.formatHumanTime = function(time) {
		if (time >= 3600) {
			var hours = this.formatToHours(time);
			return hours + 'h';
		} else if (time >= 60) {
			var minutes = that.round(time / 60);
			return minutes + 'm';
		} else {
			return time + 's';
		}
	},

	this.formatToHours = function(time) {
		return that.round(time / 3600);
	},

	this.formatCurrentHumanTime = function() {
		return that.formatHumanTime(that.time);
	},

	this.pause = function() {
		clearInterval(that.interval);
        that.setRunning(false);
        that.update();
		browser.browserAction.setBadgeBackgroundColor({color: '#d35400'});
	},

	this.stop = function() {
		that.pause();
		that.setTime(0);
		that.limitReached = false;
		that.checkTimerLimitReached();
		browser.browserAction.setBadgeBackgroundColor({color: '#e74c3c'});
		browser.browserAction.setBadgeText({text: ''});
		browser.storage.sync.remove('time');
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
			browser.storage.sync.set({'time': time});
		}
    },

	this.round = function(value) {
		if (value >= 10) {
			return Math.round(value);
		} else {
		return value.toFixed(1);
		}
	},

	this.syncInitialTime = function() {
		browser.storage.sync.get('time', function(obj) {
			if (obj.time) {
				that.setTime(obj.time);
			}
			that.update();
		});
	},

	this.playReminderSound = function(isReminder) {
		browser.storage.sync.get('sound_option', function(obj) {

			var fileName;
			if (obj.sound_option && obj.sound_option == 'no_sound') {
				return false;
			}

			if (isReminder) {
				fileName = obj.sound_option ? obj.sound_option : "beep"
			} else {
				fileName = 'pause';
			}

			that.audio = new Audio();
			that.audio.src = "/assets/" + fileName + ".mp3";
			that.audio.play();

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
		browser.storage.sync.get('time_limit_option', function(obj) {
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
		browser.storage.sync.get('idle', function(obj) {
			if (obj.idle > 0) {
				browser.idle.setDetectionInterval(obj.idle * 60);
				browser.idle.onStateChanged.addListener(function(state) {
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
    browser.runtime.onConnect.addListener(function(port) {
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
	browser.runtime.onInstalled.addListener(function(details) {
		if (details.reason == "install") {} else if (details.reason == "update") {
			that.extensionUpdated = browser.runtime.getManifest().version;
		} else {
			that.update();
		}
	});

	browser.runtime.onStartup.addListener(function() {
		timer.syncInitialTime();
	});

	// keyboard shortcuts
	browser.commands.onCommand.addListener(function(command) {
		if (command == 'play_pause') {
			that.isRunning() ? that.pause() : that.play();
		} else if (command == 'stop') {
			that.stop();
		}
	});

	browser.browserAction.setBadgeBackgroundColor({color: '#e74c3c'});
	this.syncInitialTime();
}

var timer = new Timer();