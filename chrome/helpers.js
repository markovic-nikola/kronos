export function formatTime(time) {
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
}

export function getCurrentFormattedTime(time) {
	return formatTime(time);
}

export function formatHumanTime(time) {
	if (time >= 3600) {
		var hours = formatToHours(time);
		return hours + ' h';
	} else if (time >= 60) {
		var minutes = round(time / 60);
		return minutes + ' m';
	} else {
		return time + ' s';
	}
}

export function formatToHours(time) {
	return round(time / 3600);
}

export function round(value) {
	if (value >= 10) {
		return Math.round(value);
	} else {
	return value.toFixed(1);
	}
}

export function formatCurrentHumanTime(time) {
	return formatHumanTime(time);
}