document.addEventListener('DOMContentLoaded', function() {

    // on load populate options from storage
    document.querySelectorAll('.option').forEach(function(element) {
        var name = element.getAttribute('name');
        chrome.storage.sync.get(name, function(obj) {
            if (obj[name]) {
                element.value = obj[name];
            }
        });
    });

    document.getElementById('sound').addEventListener('change', function(event) {
        chrome.storage.sync.set({'sound_option': this.value});
    })

    document.getElementById('sound_btn').addEventListener('click', function(event) {
        var audio = new Audio();
        var value = document.getElementById('sound').value;
        audio.src = "/assets/" + value + ".mp3";
        audio.play();
    });

});
