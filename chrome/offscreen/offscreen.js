chrome.runtime.onMessage.addListener(async (msg) => {
	if (msg.target === "offscreen" && msg.type === "play-audio") {
		await playAudio(msg.data.path);
	}
});

// A separate function to play audio, this makes it easier to manage
function playAudio(path) {
	// Audio cannot be played without a user interaction, so we need to
	// create the audio element in the same "tick" as the message is received.
	const audio = new Audio(path);
	audio.play();
}
