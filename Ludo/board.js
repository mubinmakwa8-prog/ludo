/*
 * LUDO MASTER - Board Renderer
 * © Mubin Makwa - All Rights Reserved
 */

class BoardRenderer {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.cellSize = 0;
        this.boardSize = 0;
        this.offsetX = 0;
        this.offsetY = 0;
        this.animationTokens = [];
        
        // Board is 15x15 grid
        this.gridSize = 15;
        
        // Colors
        this.colors = {
            red: { main: '#ff2d55', light: '#ff6b8a', dark: '#cc0033', glow: 'rgba(255,45,85,0.3)' },
            green: { main: '#00e676', light: '#69f0ae', dark: '#00c853', glow: 'rgba(0,230,118,0.3)' },
            yellow: { main: '#ffd600', light: '#ffea00', dark: '#f9a825', glow: 'rgba(255,214,0,0.3)' },
            blue: { main: '#2979ff', light: '#82b1ff', dark: '#2962ff', glow: 'rgba(41,121,255,0.3)' }
        };

        // Player home quadrants (colored areas)
        this.quadrants = {
            red:    { row: 0, col: 0, baseRow: 1, baseCol: 1 },     // Top-left
            green:  { row: 0, col: 9, baseRow: 1, baseCol: 10 },    // Top-right
            yellow: { row: 9, col: 9, baseRow: 10, baseCol: 10 },   // Bottom-right
            blue:   { row: 9, col: 0, baseRow: 10, baseCol: 1 }     // Bottom-left
        };

        // Safe positions (star positions) on the outer path
        this.safePositions = [0, 8, 13, 21, 26, 34, 39, 47];

        // Define the coordinates for each cell on the board
        this.setupBoardCoordinates();
        
        this.resize();
        window.addEventListener('resize', () => this.resize());
    }

    setupBoardCoordinates() {
        // The main path around the board (52 cells)
        // Starting from red's start, going clockwise
        this.mainPath = [
            // Red exit going up (column 6)
            {r:6, c:1}, {r:6, c:2}, {r:6, c:3}, {r:6, c:4}, {r:6, c:5},
            // Top edge going right
            {r:5, c:6}, {r:4, c:6}, {r:3, c:6}, {r:2, c:6}, {r:1, c:6}, {r:0, c:6},
            // Turn right
            {r:0, c:7}, {r:0, c:8},
            // Right side going down
            {r:1, c:8}, {r:2, c:8}, {r:3, c:8}, {r:4, c:8}, {r:5, c:8},
            // Going right to green
            {r:6, c:9}, {r:6, c:10}, {r:6, c:11}, {r:6, c:12}, {r:6, c:13}, {r:6, c:14},
            // Turn down
            {r:7, c:14}, {r:8, c:14},
            // Bottom right going left  
            {r:8, c:13}, {r:8, c:12}, {r:8, c:11}, {r:8, c:10}, {r:8, c:9},
            // Going down from green to yellow
            {r:9, c:8}, {r:10, c:8}, {r:11, c:8}, {r:12, c:8}, {r:13, c:8}, {r:14, c:8},
            // Turn left
            {r:14, c:7}, {r:14, c:6},
            // Left side going up
            {r:13, c:6}, {r:12, c:6}, {r:11, c:6}, {r:10, c:6}, {r:9, c:6},
            // Going left from yellow to blue
            {r:8, c:5}, {r:8, c:4}, {r:8, c:3}, {r:8, c:2}, {r:8, c:1}, {r:8, c:0},
            // Turn up
            {r:7, c:0}, {r:6, c:0}
            // This connects back to mainPath[0]
        ];

        // Home stretch paths (final 5 cells + home for each player)
        this.homeStretch = {
            red:    [{r:7, c:1}, {r:7, c:2}, {r:7, c:3}, {r:7, c:4}, {r:7, c:5}, {r:7, c:6}],
            green:  [{r:1, c:7}, {r:2, c:7}, {r:3, c:7}, {r:4, c:7}, {r:5, c:7}, {r:6, c:7}],
            yellow: [{r:7, c:13},{r:7, c:12},{r:7, c:11},{r:7, c:10},{r:7, c:9}, {r:7, c:8}],
            blue:   [{r:13, c:7},{r:12, c:7},{r:11, c:7},{r:10, c:7},{r:9, c:7}, {r:8, c:7}]
        };

        // Each player's full path (outer path start index + home stretch)
        // Red starts at index 0
        // Green starts at index 13
        // Yellow starts at index 26
        // Blue starts at index 39
        this.playerStartIndex = {
            red: 0,
            green: 13,
            yellow: 26,
            blue: 39
        };

        // Entry to home stretch
        this.homeEntryIndex = {
            red: 50,
            green: 11,
            yellow: 24,
            blue: 37
        };

        // Base positions for tokens (4 per player)
        this.baseTokenPositions = {
            red:    [{r:1.5, c:1.5}, {r:1.5, c:4}, {r:4, c:1.5}, {r:4, c:4}],
            green:  [{r:1.5, c:10.5},{r:1.5, c:13}, {r:4, c:10.5},{r:4, c:13}],
            yellow: [{r:10.5,c:10.5},{r:10.5,c:13}, {r:13, c:10.5},{r:13, c:13}],
            blue:   [{r:10.5,c:1.5}, {r:10.5,c:4}, {r:13, c:1.5}, {r:13, c:4}]
        };
    }

    getPlayerPath(color) {
        const startIdx = this.playerStartIndex[color];
        const homeEntry = this.homeEntryIndex[color];
        let path = [];
        
        // Build the main path from this player's start
        for (let i = 0; i < 51; i++) {
            const idx = (startIdx + i) % 52;
            path.push(this.mainPath[idx]);
        }
        
        // Add home stretch
        path.push(...this.homeStretch[color]);
        
        return path;
    }

    resize() {
        const parent = this.canvas.parentElement;
        const maxSize = Math.min(
            parent.clientWidth - 20,
            parent.clientHeight - 200,
            600
        );
        
        this.boardSize = maxSize;
        this.cellSize = maxSize / this.gridSize;
        this.canvas.width = maxSize;
        this.canvas.height = maxSize;
        
        this.offsetX = 0;
        this.offsetY = 0;
    }

    clear() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    drawBoard(players) {
        this.clear();
        this.drawBackground();
        this.drawQuadrants();
        this.drawGrid();
        this.drawSafeSpots();
        this.drawHomeStretches();
        this.drawCenter();
        this.drawArrows();
        if (players) {
            this.drawTokens(players);
        }
    }

    drawBackground() {
        const ctx = this.ctx;
        const size = this.boardSize;
        
        // Main board background
        ctx.fillStyle = '#1a1a4e';
        ctx.beginPath();
        ctx.roundRect(0, 0, size, size, 12);
        ctx.fill();
        
        // Grid background
        ctx.fillStyle = '#0d0d35';
        ctx.fillRect(0, 0, size, size);
        
        // Outer glow
        const gradient = ctx.createRadialGradient(
            size/2, size/2, size*0.2,
            size/2, size/2, size*0.7
        );
        gradient.addColorStop(0, 'rgba(0, 212, 255, 0.05)');
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0.3)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, size, size);
    }

    drawQuadrants() {
        const ctx = this.ctx;
        const cs = this.cellSize;
        
        const quads = [
            { color: 'red', x: 0, y: 0 },
            { color: 'green', x: 9 * cs, y: 0 },
            { color: 'yellow', x: 9 * cs, y: 9 * cs },
            { color: 'blue', x: 0, y: 9 * cs }
        ];
        
        quads.forEach(q => {
            const c = this.colors[q.color];
            
            // Background
            ctx.fillStyle = c.dark + '40';
            ctx.fillRect(q.x, q.y, 6 * cs, 6 * cs);
            
            // Border
            ctx.strokeStyle = c.main + '60';
            ctx.lineWidth = 2;
            ctx.strokeRect(q.x + 1, q.y + 1, 6 * cs - 2, 6 * cs - 2);
            
            // Inner base area
            const padding = cs * 0.7;
            ctx.fillStyle = c.dark + '30';
            ctx.beginPath();
            ctx.roundRect(q.x + padding, q.y + padding, 6*cs - padding*2, 6*cs - padding*2, 10);
            ctx.fill();
            
            ctx.strokeStyle = c.main + '40';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.roundRect(q.x + padding, q.y + padding, 6*cs - padding*2, 6*cs - padding*2, 10);
            ctx.stroke();
            
            // Draw base circles (where tokens start)
            const basePositions = this.baseTokenPositions[q.color];
            basePositions.forEach(pos => {
                const cx = pos.c * cs + cs/2;
                const cy = pos.r * cs + cs/2;
                
                ctx.beginPath();
                ctx.arc(cx, cy, cs * 0.35, 0, Math.PI * 2);
                ctx.fillStyle = c.dark + '60';
                ctx.fill();
                ctx.strokeStyle = c.main + '80';
                ctx.lineWidth = 1.5;
                ctx.stroke();
            });
        });
    }

    drawGrid() {
        const ctx = this.ctx;
        const cs = this.cellSize;
        
        // Draw the path cells
        this.mainPath.forEach((cell, idx) => {
            const x = cell.c * cs;
            const y = cell.r * cs;
            
            // Cell background
            ctx.fillStyle = 'rgba(30, 30, 80, 0.8)';
            ctx.fillRect(x + 1, y + 1, cs - 2, cs - 2);
            
            // Cell border
            ctx.strokeStyle = 'rgba(0, 212, 255, 0.15)';
            ctx.lineWidth = 0.5;
            ctx.strokeRect(x + 1, y + 1, cs - 2, cs - 2);

            // Color the start positions
            const startColors = {
                0: 'red',
                13: 'green',
                26: 'yellow',
                39: 'blue'
            };
            
            if (startColors[idx]) {
                const c = this.colors[startColors[idx]];
                ctx.fillStyle = c.main + '40';
                ctx.fillRect(x + 1, y + 1, cs - 2, cs - 2);
            }
        });
    }

    drawSafeSpots() {
        const ctx = this.ctx;
        const cs = this.cellSize;
        
        this.safePositions.forEach(idx => {
            if (idx < this.mainPath.length) {
                const cell = this.mainPath[idx];
                const cx = cell.c * cs + cs / 2;
                const cy = cell.r * cs + cs / 2;
                
                // Star shape
                ctx.save();
                ctx.translate(cx, cy);
                ctx.fillStyle = 'rgba(255, 214, 0, 0.6)';
                ctx.font = `${cs * 0.6}px serif`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('★', 0, 0);
                ctx.restore();
            }
        });
    }

    drawHomeStretches() {
        const ctx = this.ctx;
        const cs = this.cellSize;
        
        Object.entries(this.homeStretch).forEach(([color, cells]) => {
            const c = this.colors[color];
            cells.forEach((cell, idx) => {
                const x = cell.c * cs;
                const y = cell.r * cs;
                
                ctx.fillStyle = c.main + (idx === cells.length - 1 ? '60' : '30');
                ctx.fillRect(x + 1, y + 1, cs - 2, cs - 2);
                
                ctx.strokeStyle = c.main + '50';
                ctx.lineWidth = 0.5;
                ctx.strokeRect(x + 1, y + 1, cs - 2, cs - 2);
                
                // Arrow or indicator
                if (idx < cells.length - 1) {
                    ctx.fillStyle = c.main + '40';
                    ctx.font = `${cs * 0.3}px sans-serif`;
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText('▸', x + cs/2, y + cs/2);
                }
            });
        });
    }

    drawCenter() {
        const ctx = this.ctx;
        const cs = this.cellSize;
        const centerX = 6 * cs;
        const centerY = 6 * cs;
        const centerSize = 3 * cs;
        
        // Center triangles
        const triangleColors = [
            { color: this.colors.red.main, points: [[7.5, 6], [6, 6], [6, 7.5]] },
            { color: this.colors.green.main, points: [[7.5, 6], [9, 6], [9, 7.5]] },
            { color: this.colors.yellow.main, points: [[7.5, 9], [9, 9], [9, 7.5]] },
            { color: this.colors.blue.main, points: [[7.5, 9], [6, 9], [6, 7.5]] }
        ];
        
        triangleColors.forEach(tri => {
            ctx.beginPath();
            ctx.moveTo(tri.points[0][0] * cs, tri.points[0][1] * cs);
            tri.points.slice(1).forEach(p => ctx.lineTo(p[0] * cs, p[1] * cs));
            ctx.closePath();
            ctx.fillStyle = tri.color + '60';
            ctx.fill();
            ctx.strokeStyle = tri.color + '80';
            ctx.lineWidth = 1;
            ctx.stroke();
        });
        
        // Center circle (HOME)
        const homeCx = 7.5 * cs;
        const homeCy = 7.5 * cs;
        const homeR = cs * 0.8;
        
        const gradient = ctx.createRadialGradient(homeCx, homeCy, 0, homeCx, homeCy, homeR);
        gradient.addColorStop(0, 'rgba(255, 255, 255, 0.2)');
        gradient.addColorStop(1, 'rgba(0, 212, 255, 0.1)');
        
        ctx.beginPath();
        ctx.arc(homeCx, homeCy, homeR, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();
        ctx.strokeStyle = 'rgba(0, 212, 255, 0.5)';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // HOME text
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.font = `bold ${cs * 0.35}px Orbitron`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('HOME', homeCx, homeCy);
    }

    drawArrows() {
        // Visual start arrows for each player
        const ctx = this.ctx;
        const cs = this.cellSize;
        
        const arrows = [
            { color: 'red', x: 6, y: 1, dir: '↑' },
            { color: 'green', x: 13, y: 6, dir: '←' },
            { color: 'yellow', x: 8, y: 13, dir: '↓' },
            { color: 'blue', x: 1, y: 8, dir: '→' }
        ];
        
        arrows.forEach(a => {
            ctx.fillStyle = this.colors[a.color].main + '60';
            ctx.font = `bold ${cs * 0.5}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(a.dir, a.x * cs + cs/2, a.y * cs + cs/2);
        });
    }

    drawTokens(players) {
        const ctx = this.ctx;
        const cs = this.cellSize;
        
        players.forEach(player => {
            if (!player) return;
            const c = this.colors[player.color];
            
            player.tokens.forEach((token, tIdx) => {
                let cx, cy;
                
                if (token.isHome) {
                    // Token is in the center - draw small near home
                    cx = 7.5 * cs + (tIdx % 2 - 0.5) * cs * 0.4;
                    cy = 7.5 * cs + (Math.floor(tIdx / 2) - 0.5) * cs * 0.4;
                    this.drawToken(cx, cy, cs * 0.2, c, true);
                    return;
                }
                
                if (token.isInBase()) {
                    // Token is in the base
                    const basePos = this.baseTokenPositions[player.color][tIdx];
                    cx = basePos.c * cs + cs/2;
                    cy = basePos.r * cs + cs/2;
                } else {
                    // Token is on the path
                    const path = this.getPlayerPath(player.color);
                    if (token.pathIndex >= 0 && token.pathIndex < path.length) {
                        const cell = path[token.pathIndex];
                        cx = cell.c * cs + cs / 2;
                        cy = cell.r * cs + cs / 2;
                    } else {
                        return;
                    }
                }
                
                // Store position for click detection
                token.x = cx;
                token.y = cy;
                
                this.drawToken(cx, cy, cs * 0.32, c, false, token.playerId === this.highlightPlayer && token.canMoveFlag);
            });
        });
    }

    drawToken(cx, cy, radius, color, isSmall, isHighlighted) {
        const ctx = this.ctx;
        
        // Glow effect
        if (isHighlighted) {
            ctx.beginPath();
            ctx.arc(cx, cy, radius * 1.8, 0, Math.PI * 2);
            ctx.fillStyle = color.glow;
            ctx.fill();
        }
        
        // Outer ring
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        const gradient = ctx.createRadialGradient(cx - radius*0.3, cy - radius*0.3, 0, cx, cy, radius);
        gradient.addColorStop(0, color.light);
        gradient.addColorStop(1, color.dark);
        ctx.fillStyle = gradient;
        ctx.fill();
        
        // Border
        ctx.strokeStyle = 'rgba(255,255,255,0.5)';
        ctx.lineWidth = isSmall ? 1 : 2;
        ctx.stroke();
        
        // Inner highlight
        if (!isSmall) {
            ctx.beginPath();
            ctx.arc(cx, cy, radius * 0.5, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255,255,255,0.3)';
            ctx.fill();
            
            // Shine effect
            ctx.beginPath();
            ctx.arc(cx - radius*0.2, cy - radius*0.2, radius * 0.2, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255,255,255,0.5)';
            ctx.fill();
        }
        
        // Pulsing animation for highlighted tokens
        if (isHighlighted) {
            ctx.beginPath();
            ctx.arc(cx, cy, radius * 1.3, 0, Math.PI * 2);
            ctx.strokeStyle = color.main;
            ctx.lineWidth = 2;
            ctx.setLineDash([3, 3]);
            ctx.stroke();
            ctx.setLineDash([]);
        }
    }

    // Convert canvas click to grid coordinates
    getClickedToken(x, y, players) {
        const cs = this.cellSize;
        let closest = null;
        let closestDist = cs * 0.5;
        
        players.forEach(player => {
            if (!player) return;
            player.tokens.forEach(token => {
                if (token.isHome) return;
                const dx = x - token.x;
                const dy = y - token.y;
                const dist = Math.sqrt(dx*dx + dy*dy);
                if (dist < closestDist) {
                    closest = token;
                    closestDist = dist;
                }
            });
        });
        
        return closest;
    }

    highlightMovableTokens(player, diceValue) {
        this.highlightPlayer = player.id;
        player.tokens.forEach(token => {
            token.canMoveFlag = token.canMove(diceValue, player.path.length - 1);
        });
    }

    clearHighlights() {
        this.highlightPlayer = -1;
    }
}