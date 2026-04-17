class Token {
    constructor(playerId, tokenIndex, homePosition) {
        this.playerId = playerId;
        this.tokenIndex = tokenIndex;
        this.homePosition = homePosition;
        this.position = -1; // -1 means in base
        this.isHome = false; // reached home/center
        this.isOut = false; // on the board
        this.pathIndex = -1; // index on the player's path
        this.animating = false;
        this.x = 0;
        this.y = 0;
    }

    isInBase() {
        return !this.isOut && !this.isHome;
    }

    canMove(diceValue, pathLength) {
        if (this.isHome) return false;
        if (this.isInBase()) return diceValue === 6;
        // Check if movement won't exceed the path
        return (this.pathIndex + diceValue) <= pathLength;
    }
}

class Player {
    constructor(id, name, color, startPosition, basePositions, path) {
        this.id = id;
        this.name = name;
        this.color = color;
        this.startPosition = startPosition;
        this.basePositions = basePositions;
        this.path = path;
        this.tokens = [];
        this.kills = 0;
        this.moves = 0;
        this.sixCount = 0;
        this.tokensHome = 0;
        this.hasWon = false;
        this.finishOrder = 0;

        for (let i = 0; i < 4; i++) {
            this.tokens.push(new Token(id, i, basePositions[i]));
        }
    }

    getMovableTokens(diceValue) {
        return this.tokens.filter(t => t.canMove(diceValue, this.path.length - 1));
    }

    allTokensHome() {
        return this.tokens.every(t => t.isHome);
    }

    tokensOnBoard() {
        return this.tokens.filter(t => t.isOut && !t.isHome).length;
    }

    tokensInBase() {
        return this.tokens.filter(t => t.isInBase()).length;
    }
}