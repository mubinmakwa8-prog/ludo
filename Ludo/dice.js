class Dice {
    constructor() {
        this.element = document.getElementById('dice');
        this.faceElement = document.getElementById('diceFace');
        this.valueElement = this.faceElement.querySelector('.dice-value');
        this.instructionElement = document.getElementById('diceInstruction');
        this.currentValue = 2;
        this.isRolling = false;
        this.enabled = true;

        this.diceSymbols = {
            1: '⚀',
            2: '⚁',
            3: '⚂',
            4: '⚃',
            5: '⚄',
            6: '⚅'
        };

        this.dotPatterns = {
            1: [[50, 50]],
            2: [[25, 25], [75, 75]],
            3: [[25, 25], [50, 50], [75, 75]],
            4: [[25, 25], [75, 25], [25, 75], [75, 75]],
            5: [[25, 25], [75, 25], [50, 50], [25, 75], [75, 75]],
            6: [[25, 25], [75, 25], [25, 50], [75, 50], [25, 75], [75, 75]]
        };
    }

    enable() {
        this.enabled = true;
        this.element.classList.remove('disabled');
        this.instructionElement.textContent = 'Tap to Roll';
        this.instructionElement.style.display = 'block';
    }

    disable() {
        this.enabled = false;
        this.element.classList.add('disabled');
        this.instructionElement.style.display = 'none';
    }

    async roll() {
        if (this.isRolling || !this.enabled) return null;

        this.isRolling = true;
        this.element.classList.add('rolling');
        this.instructionElement.style.display = 'none';

        // Play sound
        playSound('dice');

        // Animate through random values
        const duration = 800;
        const interval = 80;
        const iterations = Math.floor(duration / interval);

        for (let i = 0; i < iterations; i++) {
            const randomVal = Math.floor(Math.random() * 6) + 1;
            this.displayValue(randomVal);
            await this.sleep(interval);
        }

        // Final value
        this.currentValue = Math.floor(Math.random() * 6) + 1;
        this.displayValue(this.currentValue);
        
        this.element.classList.remove('rolling');
        this.isRolling = false;

        // Special effects for 6
        if (this.currentValue === 6) {
            this.celebrateSix();
        }

        return this.currentValue;
    }

    displayValue(value) {
        this.valueElement.innerHTML = this.renderDots(value);
    }

    renderDots(value) {
        const dots = this.dotPatterns[value];
        let html = '<svg viewBox="0 0 100 100" width="45" height="45">';
        
        dots.forEach(([cx, cy]) => {
            html += `<circle cx="${cx}" cy="${cy}" r="9" fill="white" 
                      filter="drop-shadow(0 0 3px rgba(0,212,255,0.8))"/>`;
        });
        
        html += '</svg>';
        return html;
    }

    celebrateSix() {
        this.faceElement.style.borderColor = '#ffd600';
        this.faceElement.style.boxShadow = '0 0 30px rgba(255, 214, 0, 0.5)';
        
        setTimeout(() => {
            this.faceElement.style.borderColor = '';
            this.faceElement.style.boxShadow = '';
        }, 1000);
    }

    setColor(color) {
        const colors = {
            red: '#ff2d55',
            green: '#00e676',
            yellow: '#ffd600',
            blue: '#2979ff'
        };
        this.faceElement.style.borderColor = colors[color] || 'rgba(0, 212, 255, 0.5)';
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Sound system
const sounds = {};
let soundEnabled = true;
let musicEnabled = true;

function playSound(type) {
    if (!soundEnabled) return;
    
    // Create audio context for web audio
    try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        
        const soundConfig = {
            dice: { freq: 400, duration: 0.1, type: 'square' },
            move: { freq: 600, duration: 0.08, type: 'sine' },
            kill: { freq: 200, duration: 0.3, type: 'sawtooth' },
            home: { freq: 800, duration: 0.2, type: 'sine' },
            win: { freq: 523, duration: 0.5, type: 'sine' },
            click: { freq: 1000, duration: 0.05, type: 'square' },
            six: { freq: 700, duration: 0.15, type: 'triangle' }
        };
        
        const config = soundConfig[type] || soundConfig.click;
        
        oscillator.type = config.type;
        oscillator.frequency.setValueAtTime(config.freq, audioCtx.currentTime);
        gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + config.duration);
        
        oscillator.start(audioCtx.currentTime);
        oscillator.stop(audioCtx.currentTime + config.duration);
    } catch (e) {
    
    }
}