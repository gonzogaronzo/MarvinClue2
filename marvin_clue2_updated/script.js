/*
  script.js

  This script orchestrates the Morse‑code playback and visual blinking on
  the Marvin clue page.  When the user presses the play button, the
  pre‑generated audio file begins to play and a timer toggles an LED
  indicator according to the same timing sequence.  Pausing will halt
  both the audio and the light.  At the end of the message the
  interface resets automatically.
*/

document.addEventListener('DOMContentLoaded', () => {
    const morseMap = {
        'A': '.-',    'B': '-...',  'C': '-.-.',  'D': '-..',   'E': '.',
        'F': '..-.',  'G': '--.',   'H': '....',  'I': '..',    'J': '.---',
        'K': '-.-',   'L': '.-..',  'M': '--',    'N': '-.',    'O': '---',
        'P': '.--.',  'Q': '--.-',  'R': '.-.',   'S': '...',   'T': '-',
        'U': '..-',   'V': '...-',  'W': '.--',   'X': '-..-',  'Y': '-.--',
        'Z': '--..',
        '1': '.----', '2': '..---', '3': '...--', '4': '....-', '5': '.....',
        '6': '-....', '7': '--...', '8': '---..', '9': '----.', '0': '-----'
    };

    // Text for this clue.  It matches the audio file created server‑side.
    const message = 'FIND THE PHOTO FROM PIE DAY';
    const unit = 0.1; // 100 ms per Morse unit to match the audio file

    const playPauseButton = document.getElementById('play-pause');
    const light = document.getElementById('morse-light');
    const audio = document.getElementById('morse-audio');

    // Build a schedule of 'on' and 'off' durations from the message.  Each
    // entry specifies whether the light should be on or off and for how
    // many units.  This mirrors the way the audio file was composed.
    function buildSchedule() {
        const schedule = [];
        const words = message.split(' ');
        words.forEach((word, wIndex) => {
            const chars = word.toUpperCase().split('');
            chars.forEach((char, cIndex) => {
                const code = morseMap[char] || '';
                // Build dot/dash segments
                for (let i = 0; i < code.length; i++) {
                    const symbol = code[i];
                    if (symbol === '.') {
                        schedule.push({ type: 'on', duration: 1 });    // dot: 1 unit
                        schedule.push({ type: 'off', duration: 1 });   // intra-character gap
                    } else if (symbol === '-') {
                        schedule.push({ type: 'on', duration: 3 });    // dash: 3 units
                        schedule.push({ type: 'off', duration: 1 });   // intra-character gap
                    }
                }
                // Remove trailing intra-character gap after each character
                schedule.pop();
                // Append inter-character gap if not the last char in word
                if (cIndex < chars.length - 1) {
                    schedule.push({ type: 'off', duration: 3 }); // 3 units between characters
                }
            });
            // Append inter-word gap if not the last word
            if (wIndex < words.length - 1) {
                schedule.push({ type: 'off', duration: 7 }); // 7 units between words
            }
        });
        return schedule;
    }

    // Convert schedule into a timeline with absolute start and end times (in
    // seconds).  This makes it straightforward to determine the current
    // state of the light based on audio.currentTime.
    function buildTimeline(schedule) {
        const timeline = [];
        let cumulative = 0;
        schedule.forEach((segment) => {
            const start = cumulative;
            const end = cumulative + segment.duration * unit;
            timeline.push({ start, end, type: segment.type });
            cumulative = end;
        });
        return { timeline, totalDuration: cumulative };
    }

    const schedule = buildSchedule();
    const { timeline, totalDuration } = buildTimeline(schedule);

    let playing = false;
    let intervalId = null;

    // Update the visual indicator based on the current position within the
    // timeline.  If the audio has completed we reset the interface.
    function updateLight() {
        const current = audio.currentTime;
        if (current >= totalDuration) {
            // Reset when finished
            clearInterval(intervalId);
            playing = false;
            light.classList.remove('active');
            playPauseButton.textContent = 'Play Morse Code';
            // Rewind audio so user can replay from the start
            audio.pause();
            audio.currentTime = 0;
            return;
        }
        // Determine whether we are in an 'on' or 'off' segment
        for (let i = 0; i < timeline.length; i++) {
            const seg = timeline[i];
            if (current >= seg.start && current < seg.end) {
                if (seg.type === 'on') {
                    light.classList.add('active');
                } else {
                    light.classList.remove('active');
                }
                break;
            }
        }
    }

    // Toggle playback on button click
    playPauseButton.addEventListener('click', () => {
        if (!playing) {
            playing = true;
            audio.play().catch(() => {});
            updateLight(); // immediately set initial state
            intervalId = setInterval(updateLight, 50);
            playPauseButton.textContent = 'Pause';
        } else {
            playing = false;
            audio.pause();
            clearInterval(intervalId);
            playPauseButton.textContent = 'Play Morse Code';
        }
    });

    // In case the user manually uses the audio controls (not visible) or
    // the audio naturally ends before our timer detects it, ensure
    // everything resets correctly.
    audio.addEventListener('ended', () => {
        if (playing) {
            clearInterval(intervalId);
            playing = false;
            light.classList.remove('active');
            playPauseButton.textContent = 'Play Morse Code';
        }
    });
});