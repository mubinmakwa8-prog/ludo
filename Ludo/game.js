/*
 * LUDO MASTER - Main Game Controller
 * © Mubin Makwa - All Rights Reserved
 * Game rights and ownership: Mubin Makwa
 */

// Game State
let game = null;
let boardRenderer = null;
let dice = null;

const PLAYER_COLORS = ['red', 'green', 'yellow', 'blue'];
const PLAYER_NAMES = ['RED', 'GREEN', 'YELLOW', 'BLUE'];
const PLAYER_EMOJIS = ['🔴', '🟢', '🟡', '🔵'];

class LudoGame {
    constructor(numPlayers) {
        this.numPlayers = numPlayers;
        this.players = [];
        this.currentPlayerIndex = 0;
        this.diceValue = 0;
        this.gameState = 'WAITING_FOR_ROLL'; // WAITING_FOR_ROLL, WAITING_FOR_MOVE, ANIMATING, GAME_OVER
        this.turnCount = 0;
        this.consecutiveSixes = 0;
        this.gameStartTime = Date.now();
        this.winners = [];
        this.isPaused = false;
        
        this.initPlayers(numPlayers);
        this.render();
        this.updateUI();
        
        dice.enable();
        dice.setColor(this.currentPlayer().color);
    }

    initPlayers(num) {
        const activeColors = PLAYER_COLORS.slice(0, num);
        
        activeColors.forEach((color, idx) => {
            const path = boardRenderer.getPlayerPath(color);
            const player = new Player(
                idx,
                PLAYER_NAMES[idx],
                color,
                boardRenderer.playerStartIndex[color],
                boardRenderer.baseTokenPositions[color],
                path
            );
            this.players.push(player);
        });
    }

    currentPlayer() {
        return this.players[this.currentPlayerIndex];
    }

    async rollDice() {
        if (this.gameState !== 'WAITING_FOR_ROLL' || this.isPaused) return;
        
        this.gameState = 'ANIMATING';
        dice.disable();
        
        const value = await dice.roll();
        this.diceValue = value;
        this.currentPlayer().moves++;
        
        if (value === 6) {
            this.currentPlayer().sixCount++;
            this.consecutiveSixes++;
            showToast('🎲 SIX! Extra Turn!', 'six');
            playSound('six');
            
            // Three consecutive sixes - lose turn
            if (this.consecutiveSixes >= 3) {
                showToast('⚠️ Three 6s! Turn Lost!', 'kill');
                this.consecutiveSixes = 0;
                this.nextTurn();
                return;
            }
        } else {
            this.consecutiveSixes = 0;
        }
        
        // Check if any token can move
        const movableTokens = this.currentPlayer().getMovableTokens(value);
        
        if (movableTokens.length === 0) {
            showToast('❌ No valid moves!');
            await this.sleep(1000);
            this.nextTurn();
            return;
        }
        
        if (movableTokens.length === 1) {
            // Auto-move single option
            await this.moveToken(movableTokens[0]);
        } else {
            // Multiple options - highlight and wait for selection
            this.gameState = 'WAITING_FOR_MOVE';
            boardRenderer.highlightMovableTokens(this.currentPlayer(), value);
            this.render();
            showToast('👆 Select a token to move');
        }
    }

    async moveToken(token) {
        this.gameState = 'ANIMATING';
        boardRenderer.clearHighlights();
        dice.disable();
        
        const player = this.currentPlayer();
        const value = this.diceValue;
        
        if (token.isInBase()) {
            // Move out of base
            token.isOut = true;
            token.pathIndex = 0;
            playSound('move');
            showToast(`${PLAYER_EMOJIS[player.id]} Token deployed!`);
        } else {
            // Move along path
            const startIdx = token.pathIndex;
            const endIdx = token.pathIndex + value;
            
            // Animate step by step
            for (let i = startIdx + 1; i <= endIdx; i++) {
                token.pathIndex = i;
                this.render();
                playSound('move');
                await this.sleep(150);
            }
            
            // Check if reached home
            if (token.pathIndex >= player.path.length - 1) {
                token.pathIndex = player.path.length - 1;
                token.isHome = true;
                token.isOut = false;
                player.tokensHome++;
                showToast(`🏠 ${player.name} token reached HOME!`, 'home');
                playSound('home');
                
                // Check for win
                if (player.allTokensHome()) {
                    player.hasWon = true;
                    this.winners.push(player);
                    player.finishOrder = this.winners.length;
                    
                    if (this.winners.length >= this.numPlayers - 1 || this.numPlayers === 2) {
                        this.gameOver();
                        return;
                    } else {
                        showToast(`🎉 ${player.name} finished #${player.finishOrder}!`, 'home');
                    }
                }
            } else {
                // Check for kills
                await this.checkKill(token, player);
            }
        }
        
        this.render();
        
        // Extra turn for 6 or kill
        if (this.diceValue === 6 && !player.hasWon) {
            await this.sleep(500);
            this.gameState = 'WAITING_FOR_ROLL';
            dice.enable();
            dice.setColor(player.color);
            this.updateUI();
            return;
        }
        
        await this.sleep(300);
        this.nextTurn();
    }

    async checkKill(token, player) {
        const path = player.path;
        const currentCell = path[token.pathIndex];
        
        // Check if position is safe
        // Get the main path index for the current position
        const mainPathIdx = this.mainPath.findIndex(
            cell => cell.r === currentCell.r && cell.c === currentCell.c
        );
        
        if (mainPathIdx !== -1 && boardRenderer.safePositions.includes(mainPathIdx)) {
            return; // Safe spot
        }
        
        // Check all other players' tokens
        for (const otherPlayer of this.players) {
            if (otherPlayer.id === player.id || otherPlayer.hasWon) continue;
            
            for (const otherToken of otherPlayer.tokens) {
                if (!otherToken.isOut || otherToken.isHome) continue;
                
                const otherPath = otherPlayer.path;
                const otherCell = otherPath[otherToken.pathIndex];
                
                if (otherCell.r === currentCell.r && otherCell.c === currentCell.c) {
                    // KILL!
                    otherToken.isOut = false;
                    otherToken.pathIndex = -1;
                    player.kills++;
                    
                    showToast(`💥 ${player.name} eliminated ${otherPlayer.name}'s token!`, 'kill');
                    playSound('kill');
                    
                    this.render();
                    await this.sleep(500);
                }
            }
        }
    }

    get mainPath() {
        return boardRenderer.mainPath;
    }

    nextTurn() {
        // Skip players who have won
        let nextIndex = this.currentPlayerIndex;
        let attempts = 0;
        
        do {
            nextIndex = (nextIndex + 1) % this.numPlayers;
            attempts++;
        } while (this.players[nextIndex].hasWon && attempts < this.numPlayers);
        
        if (attempts >= this.numPlayers) {
            this.gameOver();
            return;
        }
        
        this.currentPlayerIndex = nextIndex;
        this.consecutiveSixes = 0;
        this.turnCount++;
        this.gameState = 'WAITING_FOR_ROLL';
        
        dice.enable();
        dice.setColor(this.currentPlayer().color);
        this.updateUI();
        this.render();
    }

    gameOver() {
        this.gameState = 'GAME_OVER';
        dice.disable();
        
        const winner = this.winners[0];
        const elapsed = Math.floor((Date.now() - this.gameStartTime) / 1000);
        const minutes = Math.floor(elapsed / 60);
        const seconds = elapsed % 60;
        
        // Show victory screen
        document.getElementById('victoryScreen').classList.remove('hidden');
        document.getElementById('victoryPlayer').textContent = `${winner.name} Player Wins!`;
        document.getElementById('victoryPlayer').style.color = this.getColorHex(winner.color);
        
        document.getElementById('victoryStats').innerHTML = `
            <div class="stat-item">
                <div class="stat-value">${winner.kills}</div>
                <div class="stat-label">KILLS</div>
            </div>
            <div class="stat-item">
                <div class="stat-value">${this.turnCount}</div>
                <div class="stat-label">TURNS</div>
            </div>
            <div class="stat-item">
                <div class="stat-value">${minutes}:${seconds.toString().padStart(2, '0')}</div>
                <div class="stat-label">TIME</div>
            </div>
        `;
        
        // Start confetti
        confettiSystem = new ConfettiSystem('confettiCanvas');
        confettiSystem.start();
        
        playSound('win');
    }

    getColorHex(color) {
        const map = { red: '#ff2d55', green: '#00e676', yellow: '#ffd600', blue: '#2979ff' };
        return map[color];
    }

    handleBoardClick(event) {
        if (this.gameState !== 'WAITING_FOR_MOVE' || this.isPaused) return;
        
        const rect = boardRenderer.canvas.getBoundingClientRect();
        const scaleX = boardRenderer.canvas.width / rect.width;
        const scaleY = boardRenderer.canvas.height / rect.height;
        const x = (event.clientX - rect.left) * scaleX;
        const y = (event.clientY - rect.top) * scaleY;
        
        const clickedToken = boardRenderer.getClickedToken(x, y, this.players);
        
        if (clickedToken && clickedToken.playerId === this.currentPlayer().id) {
            const token = this.currentPlayer().tokens[clickedToken.tokenIndex];
            if (token.canMove(this.diceValue, this.currentPlayer().path.length - 1)) {
                playSound('click');
                this.moveToken(token);
            }
        }
    }

    render() {
        boardRenderer.drawBoard(this.players);
    }

    updateUI() {
        const player = this.currentPlayer();
        const indicator = document.getElementById('turnIndicator');
        indicator.textContent = `${player.name}'s Turn`;
        indicator.className = `turn-indicator ${player.color}`;
        
        // Update player panels
        this.updatePlayerPanels();
    }

    updatePlayerPanels() {
        const container = document.getElementById('playerPanels');
        container.innerHTML = '';
        
        this.players.forEach((player, idx) => {
            const panel = document.createElement('div');
            panel.className = `player-panel ${player.color} ${idx === this.currentPlayerIndex ? 'active' : ''}`;
            
            let tokenDots = '';
            player.tokens.forEach(token => {
                tokenDots += `<div class="token-dot ${token.isHome ? 'home' : ''}" 
                              style="color: ${this.getColorHex(player.color)}"></div>`;
            });
            
            panel.innerHTML = `
                <div class="player-avatar">${PLAYER_EMOJIS[idx]}</div>
                <div class="player-info">
                    <span class="player-name">${player.name}</span>
                    <span class="player-score">Kills: ${player.kills}</span>
                </div>
                <div class="token-indicators">${tokenDots}</div>
            `;
            
            container.appendChild(panel);
        });
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// ============================================
// UI Functions
// ============================================

function startGame(numPlayers) {
    playSound('click');
    document.getElementById('mainMenu').classList.add('hidden');
    document.getElementById('gameScreen').classList.remove('hidden');
    
    // Initialize board renderer
    if (!boardRenderer) {
        boardRenderer = new BoardRenderer('gameBoard');
    }
    boardRenderer.resize();
    
    // Initialize dice
    if (!dice) {
        dice = new Dice();
    }
    
    // Create game
    game = new LudoGame(numPlayers);
    
    // Setup board click handler
    boardRenderer.canvas.addEventListener('click', (e) => {
        if (game) game.handleBoardClick(e);
    });
    
    boardRenderer.canvas.addEventListener('touchstart', (e) => {
        e.preventDefault();
        if (game) {
            const touch = e.touches[0];
            game.handleBoardClick(touch);
        }
    }, { passive: false });
}

async function rollDice() {
    if (game && game.gameState === 'WAITING_FOR_ROLL') {
        game.rollDice();
    }
}

function showPauseMenu() {
    playSound('click');
    if (game) game.isPaused = true;
    document.getElementById('pauseMenu').classList.remove('hidden');
}

function resumeGame() {
    playSound('click');
    if (game) game.isPaused = false;
    document.getElementById('pauseMenu').classList.add('hidden');
}

function restartGame() {
    playSound('click');
    document.getElementById('pauseMenu').classList.add('hidden');
    document.getElementById('victoryScreen').classList.add('hidden');
    if (confettiSystem) confettiSystem.stop();
    
    if (game) {
        const numPlayers = game.numPlayers;
        game = new LudoGame(numPlayers);
    }
}

function quitToMenu() {
    playSound('click');
    document.getElementById('pauseMenu').classList.add('hidden');
    document.getElementById('victoryScreen').classList.add('hidden');
    document.getElementById('gameScreen').classList.add('hidden');
    document.getElementById('mainMenu').classList.remove('hidden');
    if (confettiSystem) confettiSystem.stop();
    game = null;
}

function toggleSettings() {
    playSound('click');
    const panel = document.getElementById('settingsPanel');
    panel.classList.toggle('hidden');
}

function showRules() {
    playSound('click');
    const panel = document.getElementById('rulesPanel');
    panel.classList.toggle('hidden');
}

function showToast(message, type = '') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.remove();
    }, 3000);
}

// ============================================
// Settings Handlers
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    // Sound toggle
    const soundToggle = document.getElementById('soundToggle');
    if (soundToggle) {
        soundToggle.addEventListener('change', (e) => {
            soundEnabled = e.target.checked;
        });
    }
    
    const musicToggle = document.getElementById('musicToggle');
    if (musicToggle) {
        musicToggle.addEventListener('change', (e) => {
            musicEnabled = e.target.checked;
        });
    }
});

// ============================================
// Loading Screen
// ============================================

window.addEventListener('load', () => {
    const loadingFill = document.getElementById('loadingFill');
    const loadingScreen = document.getElementById('loadingScreen');
    const mainMenu = document.getElementById('mainMenu');
    
    let progress = 0;
    const loadInterval = setInterval(() => {
        progress += Math.random() * 15 + 5;
        if (progress >= 100) {
            progress = 100;
            clearInterval(loadInterval);
            
            setTimeout(() => {
                loadingScreen.classList.add('fade-out');
                setTimeout(() => {
                    loadingScreen.classList.add('hidden');
                    mainMenu.classList.remove('hidden');
                }, 500);
            }, 300);
        }
        loadingFill.style.width = progress + '%';
    }, 200);
});

// ============================================
// Service Worker Registration (PWA)
// ============================================

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js')
            .then(reg => console.log('SW registered'))
            .catch(err => console.log('SW registration failed'));
    });
}

// ============================================
// Keyboard Controls
// ============================================

document.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
        e.preventDefault();
        rollDice();
    }
    if (e.code === 'Escape') {
        if (game && !game.isPaused) {
            showPauseMenu();
        } else if (game && game.isPaused) {
            resumeGame();
        }
    }
});

// Prevent zoom on mobile
document.addEventListener('gesturestart', e => e.preventDefault());
document.addEventListener('gesturechange', e => e.preventDefault());

console.log('%c LUDO MASTER ', 'background: #0a0a2e; color: #00d4ff; font-size: 20px; font-family: Orbitron;');
console.log('%c © Mubin Makwa - All Rights Reserved ', 'background: #1a1a4e; color: #b400ff; font-size: 12px;');