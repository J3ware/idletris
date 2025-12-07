// main.ts - Idletris Multi-Board Refactor
// Supports up to 7 boards with array-based architecture
// All boards contribute to global points/score

// =====================================================
// CANVAS SETUP
// =====================================================
const canvas = document.getElementById('game-canvas')! as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;

// =====================================================
// GAME CONSTANTS
// =====================================================
const GRID_WIDTH = 10;      // Number of columns
const GRID_HEIGHT = 20;     // Number of rows
const CELL_SIZE = 30;       // Pixels per cell (active board)
const CELL_SIZE_MINI = 10;  // Pixels per cell (minified boards - 1/3 size)
const PADDING = 40;         // Padding around active board
const PADDING_MINI = 5;     // Padding around mini boards

// Board dimensions
const BOARD_WIDTH = GRID_WIDTH * CELL_SIZE;           // 300px
const BOARD_HEIGHT = GRID_HEIGHT * CELL_SIZE;         // 600px
const BOARD_WIDTH_MINI = GRID_WIDTH * CELL_SIZE_MINI; // 100px
const BOARD_HEIGHT_MINI = GRID_HEIGHT * CELL_SIZE_MINI; // 200px

// Timing constants
const DROP_SPEED = 1000;          // Milliseconds between automatic drops
const BASE_AI_SPEED = 300;        // Starting AI speed in milliseconds
const MAX_AI_SPEED_UPGRADES = 5;  // Maximum speed upgrade levels

// Maximum number of boards (6 mini + 1 active = 7 total)
const MAX_BOARDS = 7;

// Take Control feature constants
const TAKE_CONTROL_PIECES = 30;   // Number of pieces player controls when using Take Control

// =====================================================
// SUPABASE CONFIGURATION
// =====================================================
const SUPABASE_URL = 'https://ztqqtchilsqamylhsqqa.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp0cXF0Y2hpbHNxYW15bGhzcXFhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ1MjcxODgsImV4cCI6MjA4MDEwMzE4OH0.LiTMLJRGkjPUgXZ600F2v9IbHM3mdDySEcIVr4UT834';

// =====================================================
// COST CONFIGURATION
// =====================================================
// Base costs for Board 1 (index 0)
const BASE_COSTS = {
    HARD_DROP: 1,                  // Global hard drop unlock
    HIRE_AI: 2,                    // Hire AI for a board
    AI_HARD_DROP: 10,               // AI hard drop upgrade
    AI_SPEED: 3,                  // Per speed level (5 levels total)
    UNLOCK_NEXT_BOARD: 15,         // Cost to unlock board 2
    RESET_BOARD: 5,               // Cost to reset board 1 after loss
    FORCE_NEXT_PIECE_UNLOCK: 4,   // Unlock force next piece feature
    FORCE_NEXT_PIECE_USE: 1,       // Cost per use
    TAKE_CONTROL: 5,              // Cost to pause AI and take control for 30 pieces
};

// Cost multiplier per board tier (1.5x each board)
const COST_MULTIPLIER = 2;

// =====================================================
// COST CALCULATION FUNCTIONS
// =====================================================

// Calculate the cost of an upgrade for a specific board
function getBoardCost(baseCost: number, boardIndex: number): number {
    // Apply board tier scaling (2x per board)
    const tieredCost = baseCost * Math.pow(COST_MULTIPLIER, boardIndex);
    // Apply prestige 50% cost reduction if purchased
    const reduction = hasHalfCost ? 0.5 : 1;
    return Math.round(tieredCost * reduction);
}

// Calculate the cost to reset a specific board after it loses
function getResetCost(boardIndex: number): number {
    const tieredCost = BASE_COSTS.RESET_BOARD * Math.pow(COST_MULTIPLIER, boardIndex);
    // Apply prestige 50% cost reduction if purchased
    const reduction = hasHalfCost ? 0.5 : 1;
    return Math.round(tieredCost * reduction);
}

// Calculate the cost to unlock the next board
function getNextBoardUnlockCost(currentBoardCount: number): number {
    const tieredCost = BASE_COSTS.UNLOCK_NEXT_BOARD * Math.pow(COST_MULTIPLIER, currentBoardCount - 1);
    // Apply prestige 50% cost reduction if purchased
    const reduction = hasHalfCost ? 0.5 : 1;
    return Math.round(tieredCost * reduction);
}

// =====================================================
// PIECE DEFINITIONS
// =====================================================
const PIECES: { [key: string]: number[][] } = {
    I: [
        [0, 0, 0, 0],
        [1, 1, 1, 1],
        [0, 0, 0, 0],
        [0, 0, 0, 0]
    ],
    O: [
        [1, 1],
        [1, 1]
    ],
    T: [
        [0, 1, 0],
        [1, 1, 1],
        [0, 0, 0]
    ],
    S: [
        [0, 1, 1],
        [1, 1, 0],
        [0, 0, 0]
    ],
    Z: [
        [1, 1, 0],
        [0, 1, 1],
        [0, 0, 0]
    ],
    J: [
        [1, 0, 0],
        [1, 1, 1],
        [0, 0, 0]
    ],
    L: [
        [0, 0, 1],
        [1, 1, 1],
        [0, 0, 0]
    ]
};

const PIECE_COLORS: { [key: string]: string } = {
    I: '#00F0F0',
    O: '#F0F000',
    T: '#A000F0',
    S: '#00F000',
    Z: '#F00000',
    J: '#0000F0',
    L: '#F0A000'
};

// =====================================================
// TYPE DEFINITIONS
// =====================================================
type PieceType = 'I' | 'O' | 'T' | 'S' | 'Z' | 'J' | 'L';

interface ActivePiece {
    type: PieceType;
    shape: number[][];
    x: number;
    y: number;
    color: string;
}

// Board interface - represents a single game board with all its state
interface Board {
    index: number;                    // 0-6 (board number - 1)
    grid: (string | null)[][];        // The board's block grid
    currentPiece: ActivePiece | null; // Currently falling piece
    nextPiece: PieceType | null;      // Next piece in queue
    isGameOver: boolean;              // Has this board lost?
    lastDropTime: number;             // For piece falling timing
    
    // AI state
    aiHired: boolean;
    aiEnabled: boolean;
    aiHardDropUnlocked: boolean;
    aiSpeedLevel: number;
    aiSpeed: number;
    aiLastMoveTime: number;
    aiTargetPosition: { x: number, rotation: number } | null;
    aiMoving: boolean;
    
    // UI references
    canvas: HTMLCanvasElement | null;
    container: HTMLElement | null;
    
    // Status flags
    isMaxedOut: boolean;
    isMinified: boolean;

    // Force Next Piece (per-board unlock)
    forceNextPieceUnlocked: boolean;
    
    // Take Control feature (pay-per-use)
    playerControlPiecesRemaining: number;  // Counts down from 30 to 0
}

// =====================================================
// GLOBAL STATE
// =====================================================
let boards: Board[] = [];
let activeBoardIndex: number = 0;
let globalPoints: number = 0;
let globalLinesCleared: number = 0;

// Global upgrades
let hardDropUnlocked: boolean = false;

// Game control state
let isGameOver: boolean = false;
let isPaused: boolean = false;

// =====================================================
// DIALOGUE SYSTEM STATE
// =====================================================
let dialogueQueue: string[] = [];
let currentDialogue: string | null = null;
let shownDialogues: Set<string> = new Set();
let displayedDialogues: Set<string> = new Set();
let tutorialsEnabled: boolean = true;

// =====================================================
// PRESTIGE SYSTEM STATE
// =====================================================
let prestigeCount: number = 0;           // How many times player has prestiged
let prestigeStars: number = 0;           // Spendable prestige currency
let hasDoublePoints: boolean = false;    // 2x points permanently
let hasHalfCost: boolean = false;        // 50% cost reduction permanently
let hasAutoReset: boolean = false;       // Auto-reset mini boards when they lose

const SCORE_PER_STAR = 5000;             // 5000 score (lines) = 1 star

const DIALOGUE_CONTENT: { [key: string]: { title: string; description: string } } = {
    'welcome': {
        title: 'Welcome to IDLETRIS!',
        description: 'Pieces fall from above - use arrow keys to move and rotate them. Clear lines to earn points! Spend points on upgrades to automate your boards. Game over happens when your active board fills up. Your goal: get the highest score possible!'
    },
    'global-harddrop': {
        title: 'Unlock Hard Drop',
        description: 'Spend 1 point to unlock Hard Drop. Use SPACE BAR to instantly drop pieces. This is permanent!'
    },
    'hire-ai': {
        title: 'Hire Basic AI Player',
        description: 'Hire a Basic AI to play automatically on this board. It analyzes the best position for each piece.'
    },
    'ai-harddrop': {
        title: 'Enable AI Hard Drop',
        description: 'Give AI the ability to instantly place pieces. This dramatically speeds up point generation!'
    },
    'ai-speed': {
        title: 'Increase AI Speed',
        description: 'Make your AI move faster! Each upgrade reduces delay between moves. Upgrade up to 5 times.'
    },
    'unlock-board': {
        title: 'Unlock New Board',
        description: 'Your board is maxed out! Unlock a new board to multiply your points earning potential.'
    },
    'force-next-piece': {
        title: 'Unlock Force Next Piece',
        description: 'Once unlocked, spend points to change the upcoming piece to whichever shape you want.'
    },
    'take-control': {
        title: 'Take Control',
        description: 'Temporarily pause the AI and take manual control for 30 pieces. Perfect for tricky situations or when you want to optimize piece placement yourself!'
    },
    'prestige': {
        title: 'Prestige Available!',
        description: 'You\'ve maxed out all 7 boards! Prestige to earn stars based on your score. Stars can be spent on permanent upgrades in the Prestige Shop that persist across runs.'
    },
};

// =====================================================
// BOARD FACTORY FUNCTIONS
// =====================================================

function createEmptyGrid(): (string | null)[][] {
    const grid: (string | null)[][] = [];
    for (let row = 0; row < GRID_HEIGHT; row++) {
        const newRow: (string | null)[] = [];
        for (let col = 0; col < GRID_WIDTH; col++) {
            newRow.push(null);
        }
        grid.push(newRow);
    }
    return grid;
}

function createBoard(index: number): Board {
    return {
        index,
        grid: createEmptyGrid(),
        currentPiece: null,
        nextPiece: null,
        isGameOver: false,
        lastDropTime: 0,
        aiHired: false,
        aiEnabled: false,
        aiHardDropUnlocked: false,
        aiSpeedLevel: 0,
        aiSpeed: BASE_AI_SPEED,
        aiLastMoveTime: 0,
        aiTargetPosition: null,
        aiMoving: false,
        canvas: null,
        container: null,
        isMaxedOut: false,
        isMinified: false,
        forceNextPieceUnlocked: false,
        playerControlPiecesRemaining: 0,
    };
}

function isBoardMaxedOut(board: Board): boolean {
    return board.aiHired && 
           board.aiHardDropUnlocked && 
           board.aiSpeedLevel >= MAX_AI_SPEED_UPGRADES &&
           board.forceNextPieceUnlocked;  // Now required for max-out
}

function canUnlockNextBoard(): boolean {
    if (boards.length >= MAX_BOARDS) return false;
    if (boards.length === 0) return false;
    const lastBoard = boards[boards.length - 1];
    return isBoardMaxedOut(lastBoard);
}

/*function getActiveBoard(): Board | null {
    return boards[activeBoardIndex] || null;
}*/

// =====================================================
// PIECE FUNCTIONS
// =====================================================

function getRandomPieceType(): PieceType {
    const types: PieceType[] = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];
    return types[Math.floor(Math.random() * types.length)];
}

function createPiece(type: PieceType): ActivePiece {
    const shape = PIECES[type].map(row => [...row]);
    return {
        type,
        shape,
        x: Math.floor(GRID_WIDTH / 2) - Math.floor(shape[0].length / 2),
        y: 0,
        color: PIECE_COLORS[type]
    };
}

function rotateShape(shape: number[][]): number[][] {
    const rows = shape.length;
    const cols = shape[0].length;
    const rotated: number[][] = [];
    
    for (let col = 0; col < cols; col++) {
        const newRow: number[] = [];
        for (let row = rows - 1; row >= 0; row--) {
            newRow.push(shape[row][col]);
        }
        rotated.push(newRow);
    }
    
    return rotated;
}

// =====================================================
// COLLISION DETECTION
// =====================================================

function checkCollision(board: Board): boolean {
    if (!board.currentPiece) return false;
    
    const piece = board.currentPiece;
    
    for (let row = 0; row < piece.shape.length; row++) {
        for (let col = 0; col < piece.shape[row].length; col++) {
            if (!piece.shape[row][col]) continue;
            
            const boardX = piece.x + col;
            const boardY = piece.y + row;
            
            if (boardX < 0 || boardX >= GRID_WIDTH) return true;
            if (boardY >= GRID_HEIGHT) return true;
            if (boardY >= 0 && board.grid[boardY][boardX]) return true;
        }
    }
    
    return false;
}

function checkCollisionForTest(piece: ActivePiece, testGrid: (string | null)[][]): boolean {
    for (let row = 0; row < piece.shape.length; row++) {
        for (let col = 0; col < piece.shape[row].length; col++) {
            if (!piece.shape[row][col]) continue;
            
            const boardX = piece.x + col;
            const boardY = piece.y + row;
            
            if (boardX < 0 || boardX >= GRID_WIDTH || boardY >= GRID_HEIGHT) {
                return true;
            }
            
            if (boardY >= 0 && testGrid[boardY][boardX]) {
                return true;
            }
        }
    }
    return false;
}

// =====================================================
// PIECE MOVEMENT
// =====================================================

function movePieceDown(board: Board): boolean {
    if (!board.currentPiece) return false;
    
    board.currentPiece.y++;
    
    if (checkCollision(board)) {
        board.currentPiece.y--;
        lockPiece(board);
        spawnNewPiece(board);
        return false;
    }
    
    return true;
}

function movePieceHorizontally(board: Board, direction: number): boolean {
    if (!board.currentPiece) return false;
    
    const originalX = board.currentPiece.x;
    board.currentPiece.x += direction;
    
    if (checkCollision(board)) {
        board.currentPiece.x = originalX;
        return false;
    }
    
    return true;
}

function rotatePiece(board: Board): boolean {
    if (!board.currentPiece) return false;
    if (board.currentPiece.type === 'O') return false;
    
    const originalShape = board.currentPiece.shape;
    board.currentPiece.shape = rotateShape(originalShape);
    
    if (!checkCollision(board)) {
        return true;
    }
    
    // Wall kicks
    const kicks = [1, -1, 2, -2];
    for (const kick of kicks) {
        board.currentPiece.x += kick;
        if (!checkCollision(board)) {
            return true;
        }
        board.currentPiece.x -= kick;
    }
    
    // Floor kick
    board.currentPiece.y -= 1;
    if (!checkCollision(board)) {
        return true;
    }
    board.currentPiece.y += 1;
    
    // Revert rotation
    board.currentPiece.shape = originalShape;
    return false;
}

function hardDrop(board: Board): void {
    if (!board.currentPiece) return;
    
    while (!checkCollision(board)) {
        board.currentPiece.y++;
    }
    board.currentPiece.y--;
    
    lockPiece(board);
    spawnNewPiece(board);
}

// =====================================================
// PIECE LOCKING AND LINE CLEARING
// =====================================================

function lockPiece(board: Board): void {
    if (!board.currentPiece) return;
    
    const piece = board.currentPiece;
    
    for (let row = 0; row < piece.shape.length; row++) {
        for (let col = 0; col < piece.shape[row].length; col++) {
            if (piece.shape[row][col]) {
                const boardX = piece.x + col;
                const boardY = piece.y + row;
                
                if (boardY >= 0 && boardY < GRID_HEIGHT && 
                    boardX >= 0 && boardX < GRID_WIDTH) {
                    board.grid[boardY][boardX] = piece.color;
                }
            }
        }
    }
    
    board.currentPiece = null;
    clearLines(board);
    
    // Decrement Take Control counter if player is temporarily in control
    if (board.playerControlPiecesRemaining > 0) {
        board.playerControlPiecesRemaining--;
        updateTakeControlDisplay(board.index);
        
        // If counter hits 0, re-enable AI
        if (board.playerControlPiecesRemaining === 0) {
            board.aiEnabled = true;
            console.log(`Board ${board.index + 1}: AI resumed control`);
        }
    }
}

function clearLines(board: Board): number {
    let linesCleared = 0;
    
    for (let row = GRID_HEIGHT - 1; row >= 0; row--) {
        let isFull = true;
        for (let col = 0; col < GRID_WIDTH; col++) {
            if (!board.grid[row][col]) {
                isFull = false;
                break;
            }
        }
        
        if (isFull) {
            linesCleared++;
            board.grid.splice(row, 1);
            const emptyRow: (string | null)[] = new Array(GRID_WIDTH).fill(null);
            board.grid.unshift(emptyRow);
            row++;
        }
    }
    
    if (linesCleared > 0) {
        globalLinesCleared += linesCleared;
        // Apply prestige 2x points multiplier if purchased
        const multiplier = hasDoublePoints ? 2 : 1;
        const pointsEarned = Math.round(linesCleared * multiplier);
        globalPoints += pointsEarned;
        updatePointsDisplay();
        flashEffect(board, linesCleared);
    }
    
    return linesCleared;
}

function spawnNewPiece(board: Board): void {
    const pieceType = board.nextPiece || getRandomPieceType();
    board.nextPiece = getRandomPieceType();
    board.currentPiece = createPiece(pieceType);
    
    if (checkCollision(board)) {
        handleBoardGameOver(board);
        return;
    }
    
    // Reset AI state for new piece
    board.aiTargetPosition = null;
    board.aiMoving = false;
    
    updateNextPiecePreview(board);
    updateForceNextPieceUI(board.index);
}

function handleBoardGameOver(board: Board): void {
    board.isGameOver = true;
    board.currentPiece = null;
    
    if (board.aiEnabled) {
        board.aiEnabled = false;
        board.aiTargetPosition = null;
        board.aiMoving = false;
    }
    
    // Check if this is the active board (true game over)
    if (board.index === activeBoardIndex) {
        isGameOver = true;
        showGameOverScreen();
    } else {
        // A minified AI board lost
        if (hasAutoReset) {
            // Auto-reset the board immediately (free reset from prestige upgrade)
            autoResetBoard(board.index);
        } else {
            // Show reset overlay for manual reset
            showBoardLostOverlay(board);
        }
    }
}

// =====================================================
// VISUAL EFFECTS
// =====================================================

function flashEffect(board: Board, linesCleared: number): void {
    const targetCanvas = board.canvas || canvas;
    
    const originalFilter = targetCanvas.style.filter;
    const brightness = 1 + (linesCleared * 0.3);
    targetCanvas.style.filter = `brightness(${brightness})`;
    
    setTimeout(() => {
        targetCanvas.style.filter = originalFilter;
    }, 200);
}

// =====================================================
// AI SYSTEM
// =====================================================

function simulateMove(board: Board, piece: ActivePiece, targetX: number, rotation: number): (string | null)[][] | null {
    const testBoard = board.grid.map(row => [...row]);
    
    let testShape = piece.shape;
    for (let r = 0; r < rotation; r++) {
        testShape = rotateShape(testShape);
    }
    
    const testPiece: ActivePiece = {
        type: piece.type,
        shape: testShape,
        x: targetX,
        y: 0,
        color: piece.color
    };
    
    if (checkCollisionForTest(testPiece, testBoard)) {
        return null;
    }
    
    while (!checkCollisionForTest(testPiece, testBoard)) {
        testPiece.y++;
    }
    testPiece.y--;
    
    for (let row = 0; row < testPiece.shape.length; row++) {
        for (let col = 0; col < testPiece.shape[row].length; col++) {
            if (testPiece.shape[row][col]) {
                const boardY = testPiece.y + row;
                const boardX = testPiece.x + col;
                if (boardY >= 0 && boardY < GRID_HEIGHT && boardX >= 0 && boardX < GRID_WIDTH) {
                    testBoard[boardY][boardX] = testPiece.color;
                }
            }
        }
    }
    
    return testBoard;
}

function evaluateBoardState(testBoard: (string | null)[][]): number {
    let score = 0;
    
    // Count complete lines (huge bonus)
    let completeLines = 0;
    for (let row = 0; row < GRID_HEIGHT; row++) {
        let isFull = true;
        for (let col = 0; col < GRID_WIDTH; col++) {
            if (!testBoard[row][col]) {
                isFull = false;
                break;
            }
        }
        if (isFull) completeLines++;
    }
    score += completeLines * 1000;
    
    // Penalize height
    let maxHeight = 0;
    for (let col = 0; col < GRID_WIDTH; col++) {
        for (let row = 0; row < GRID_HEIGHT; row++) {
            if (testBoard[row][col]) {
                maxHeight = Math.max(maxHeight, GRID_HEIGHT - row);
                break;
            }
        }
    }
    score -= maxHeight * 10;
    
    // Penalize holes
    let holes = 0;
    for (let col = 0; col < GRID_WIDTH; col++) {
        let foundBlock = false;
        for (let row = 0; row < GRID_HEIGHT; row++) {
            if (testBoard[row][col]) {
                foundBlock = true;
            } else if (foundBlock) {
                holes++;
            }
        }
    }
    score -= holes * 50;
    
    // Penalize bumpiness
    let bumpiness = 0;
    let prevHeight = 0;
    for (let col = 0; col < GRID_WIDTH; col++) {
        let colHeight = 0;
        for (let row = 0; row < GRID_HEIGHT; row++) {
            if (testBoard[row][col]) {
                colHeight = GRID_HEIGHT - row;
                break;
            }
        }
        if (col > 0) {
            bumpiness += Math.abs(colHeight - prevHeight);
        }
        prevHeight = colHeight;
    }
    score -= bumpiness * 5;
    
    return score;
}

function calculateBestMove(board: Board): { x: number, rotation: number } | null {
    if (!board.currentPiece) return null;
    
    let bestScore = -Infinity;
    let bestMove = null;
    
    const maxRotations = board.currentPiece.type === 'O' ? 1 : 4;
    
    for (let rotation = 0; rotation < maxRotations; rotation++) {
        let testShape = board.currentPiece.shape;
        for (let r = 0; r < rotation; r++) {
            testShape = rotateShape(testShape);
        }
        
        // Find actual bounds of piece
        let minCol = testShape[0].length;
        let maxCol = -1;
        for (let row = 0; row < testShape.length; row++) {
            for (let col = 0; col < testShape[row].length; col++) {
                if (testShape[row][col]) {
                    minCol = Math.min(minCol, col);
                    maxCol = Math.max(maxCol, col);
                }
            }
        }
        const actualWidth = maxCol - minCol + 1;
        const leftOffset = minCol;
        
        for (let x = -leftOffset; x <= GRID_WIDTH - actualWidth - leftOffset; x++) {
            const resultBoard = simulateMove(board, board.currentPiece, x, rotation);
            
            if (resultBoard) {
                const score = evaluateBoardState(resultBoard);
                
                if (score > bestScore) {
                    bestScore = score;
                    bestMove = { x, rotation };
                }
            }
        }
    }
    
    if (!bestMove && board.currentPiece) {
        bestMove = { x: board.currentPiece.x, rotation: 0 };
    }
    
    return bestMove;
}

function executeAIMove(board: Board): void {
    if (!board.currentPiece || !board.aiTargetPosition || !board.aiEnabled) return;
    
    // Track rotations
    if (!(board.currentPiece as any).aiRotations) {
        (board.currentPiece as any).aiRotations = 0;
    }
    
    const currentRotations = (board.currentPiece as any).aiRotations;
    const targetRotation = board.aiTargetPosition.rotation;
    
    // Step 1: Rotate
    if (currentRotations < targetRotation) {
        if (rotatePiece(board)) {
            (board.currentPiece as any).aiRotations++;
        } else {
            (board.currentPiece as any).aiRotations = targetRotation;
        }
        return;
    }
    
    // Step 2: Move horizontally
    const currentX = board.currentPiece.x;
    const targetX = board.aiTargetPosition.x;
    
    if (currentX !== targetX) {
        const direction = targetX > currentX ? 1 : -1;
        
        if (!movePieceHorizontally(board, direction)) {
            movePieceDown(board);
            board.aiTargetPosition = null;
            board.aiMoving = false;
        }
        return;
    }
    
    // Step 3: Drop
    if (board.aiHardDropUnlocked) {
        hardDrop(board);
    } else {
        movePieceDown(board);
    }
    
    board.aiTargetPosition = null;
    board.aiMoving = false;
}

function updateAI(board: Board, currentTime: number): void {
    if (!board.aiEnabled || !board.currentPiece) return;
    
    // Safety timeout
    if (!(board.currentPiece as any).aiStartTime) {
        (board.currentPiece as any).aiStartTime = currentTime;
    }
    
    const pieceAge = currentTime - (board.currentPiece as any).aiStartTime;
    if (pieceAge > 5000) {
        movePieceDown(board);
        board.aiTargetPosition = null;
        board.aiMoving = false;
        return;
    }
    
    // Calculate target if needed
    if (!board.aiTargetPosition && !board.aiMoving) {
        board.aiTargetPosition = calculateBestMove(board);
        board.aiMoving = true;
        
        if (!board.aiTargetPosition) {
            movePieceDown(board);
            board.aiMoving = false;
            return;
        }
    }
    
    // Execute moves at AI speed
    if (currentTime - board.aiLastMoveTime > board.aiSpeed) {
        executeAIMove(board);
        board.aiLastMoveTime = currentTime;
    }
}

// =====================================================
// DRAWING FUNCTIONS
// =====================================================

function drawBoard(board: Board): void {
    const targetCanvas = board.canvas || canvas;
    const targetCtx = targetCanvas.getContext('2d');
    if (!targetCtx) return;
    
    const cellSize = board.isMinified ? CELL_SIZE_MINI : CELL_SIZE;
    const padding = board.isMinified ? PADDING_MINI : PADDING;
    const boardWidth = GRID_WIDTH * cellSize;
    const boardHeight = GRID_HEIGHT * cellSize;
    
    // Clear canvas
    targetCtx.clearRect(0, 0, targetCanvas.width, targetCanvas.height);
    
    // Draw background
    targetCtx.fillStyle = '#000000';
    targetCtx.fillRect(padding, padding, boardWidth, boardHeight);
    
    // Draw grid lines
    targetCtx.strokeStyle = '#3b3b3bff';
    targetCtx.lineWidth = board.isMinified ? 0.5 : 1;
    
    for (let col = 0; col <= GRID_WIDTH; col++) {
        const x = padding + (col * cellSize);
        targetCtx.beginPath();
        targetCtx.moveTo(x, padding);
        targetCtx.lineTo(x, padding + boardHeight);
        targetCtx.stroke();
    }
    
    for (let row = 0; row <= GRID_HEIGHT; row++) {
        const y = padding + (row * cellSize);
        targetCtx.beginPath();
        targetCtx.moveTo(padding, y);
        targetCtx.lineTo(padding + boardWidth, y);
        targetCtx.stroke();
    }
    
    // Draw border
    targetCtx.strokeStyle = '#666666';
    targetCtx.lineWidth = board.isMinified ? 1 : 2;
    targetCtx.strokeRect(padding, padding, boardWidth, boardHeight);
}

function drawBlock(board: Board, x: number, y: number, color: string): void {
    const targetCanvas = board.canvas || canvas;
    const targetCtx = targetCanvas.getContext('2d');
    if (!targetCtx) return;
    
    const cellSize = board.isMinified ? CELL_SIZE_MINI : CELL_SIZE;
    const padding = board.isMinified ? PADDING_MINI : PADDING;
    
    const pixelX = padding + (x * cellSize);
    const pixelY = padding + (y * cellSize);
    
    // Main block
    targetCtx.fillStyle = color;
    targetCtx.fillRect(pixelX, pixelY, cellSize, cellSize);
    
    // Light border (top-left)
    targetCtx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    targetCtx.lineWidth = board.isMinified ? 1 : 2;
    targetCtx.beginPath();
    targetCtx.moveTo(pixelX, pixelY + cellSize);
    targetCtx.lineTo(pixelX, pixelY);
    targetCtx.lineTo(pixelX + cellSize, pixelY);
    targetCtx.stroke();
    
    // Dark border (bottom-right)
    targetCtx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
    targetCtx.beginPath();
    targetCtx.moveTo(pixelX + cellSize, pixelY);
    targetCtx.lineTo(pixelX + cellSize, pixelY + cellSize);
    targetCtx.lineTo(pixelX, pixelY + cellSize);
    targetCtx.stroke();
}

function drawBoardState(board: Board): void {
    for (let row = 0; row < GRID_HEIGHT; row++) {
        for (let col = 0; col < GRID_WIDTH; col++) {
            const color = board.grid[row][col];
            if (color) {
                drawBlock(board, col, row, color);
            }
        }
    }
}

function drawCurrentPiece(board: Board): void {
    if (!board.currentPiece) return;
    
    for (let row = 0; row < board.currentPiece.shape.length; row++) {
        for (let col = 0; col < board.currentPiece.shape[row].length; col++) {
            if (board.currentPiece.shape[row][col]) {
                const boardX = board.currentPiece.x + col;
                const boardY = board.currentPiece.y + row;
                drawBlock(board, boardX, boardY, board.currentPiece.color);
            }
        }
    }
}

// =====================================================
// UI CREATION FUNCTIONS
// =====================================================

function createGlobalHeader(): void {
    const header = document.createElement('div');
    header.id = 'global-header';
    header.style.position = 'fixed';
    header.style.top = '0';
    header.style.left = '0';
    header.style.right = '0';
    header.style.height = '120px';
    header.style.backgroundColor = 'rgba(26, 26, 46, 0.95)';
    header.style.borderBottom = '2px solid #2d2d44';
    header.style.display = 'flex';
    header.style.alignItems = 'center';
    header.style.justifyContent = 'center';
    header.style.gap = '40px';
    header.style.padding = '20px';
    header.style.zIndex = '1000';
    header.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.5), 0 0 40px rgba(0, 212, 255, 0.1)';
    
    // Title section with logo image
    const titleSection = document.createElement('div');
    titleSection.style.textAlign = 'center';
    titleSection.style.display = 'flex';
    titleSection.style.alignItems = 'center';
    
    // Use PNG logo image
    const logo = document.createElement('img');
    logo.src = '/web-logo-transparent.png';
    logo.alt = 'IDLETRIS';
    logo.style.width = '120px';
    logo.style.height = 'auto';
    logo.style.filter = 'drop-shadow(0 0 8px rgba(255, 255, 255, 0.3))';
    titleSection.appendChild(logo);
    
    // Points section - neon green glow
    const pointsSection = document.createElement('div');
    pointsSection.style.textAlign = 'center';
    pointsSection.style.padding = '15px 25px';
    pointsSection.style.backgroundColor = 'rgba(0, 255, 136, 0.1)';
    pointsSection.style.borderRadius = '8px';
    pointsSection.style.border = '1px solid rgba(0, 255, 136, 0.3)';
    pointsSection.style.boxShadow = '0 0 20px rgba(0, 255, 136, 0.2), inset 0 0 20px rgba(0, 255, 136, 0.05)';
    pointsSection.innerHTML = `
        <div style="font-size: 10px; font-family: 'Press Start 2P', cursive; color: #00ff88; margin-bottom: 8px; text-shadow: 0 0 10px rgba(0, 255, 136, 0.5);">POINTS</div>
        <div style="font-size: 28px; font-weight: bold; color: #00ff88; text-shadow: 0 0 10px #00ff88, 0 0 20px #00cc6a;">
            <span id="global-points-value">0</span>
        </div>
    `;
    
    // Score section - neon blue glow
    const scoreSection = document.createElement('div');
    scoreSection.style.textAlign = 'center';
    scoreSection.style.padding = '15px 25px';
    scoreSection.style.backgroundColor = 'rgba(0, 212, 255, 0.1)';
    scoreSection.style.borderRadius = '8px';
    scoreSection.style.border = '1px solid rgba(0, 212, 255, 0.3)';
    scoreSection.style.boxShadow = '0 0 20px rgba(0, 212, 255, 0.2), inset 0 0 20px rgba(0, 212, 255, 0.05)';
    scoreSection.innerHTML = `
        <div style="font-size: 10px; font-family: 'Press Start 2P', cursive; color: #00d4ff; margin-bottom: 8px; text-shadow: 0 0 10px rgba(0, 212, 255, 0.5);">SCORE</div>
        <div style="font-size: 28px; font-weight: bold; color: #00d4ff; text-shadow: 0 0 10px #00d4ff, 0 0 20px #0099cc;">
            <span id="global-score-value">0</span>
        </div>
    `;
    
    // Controls section - retro arcade style
    const controlsSection = document.createElement('div');
    controlsSection.id = 'global-controls-section';
    controlsSection.style.textAlign = 'center';
    controlsSection.style.padding = '12px 20px';
    controlsSection.style.backgroundColor = 'rgba(0, 0, 0, 0.4)';
    controlsSection.style.borderRadius = '8px';
    controlsSection.style.border = '1px solid rgba(255, 255, 255, 0.1)';
    controlsSection.style.boxShadow = 'inset 0 0 20px rgba(0, 0, 0, 0.5)';
    controlsSection.innerHTML = `
        <div style="margin-bottom: 10px; font-family: 'Press Start 2P', cursive; font-size: 10px; color: #00ff88; text-shadow: 0 0 10px rgba(0, 255, 136, 0.5);">CONTROLS</div>
        <div style="font-family: 'Press Start 2P', cursive; font-size: 8px; color: #aaa; margin-bottom: 6px; line-height: 1.8;">
            <span style="color: #00d4ff;">←</span> <span style="color: #00d4ff;">→</span> MOVE 
            <span style="color: #444; margin: 0 6px;">|</span> 
            <span style="color: #00d4ff;">↑</span> ROTATE
        </div>
        <div style="font-family: 'Press Start 2P', cursive; font-size: 8px; color: #aaa; line-height: 1.8;">
            <span style="color: #00d4ff;">↓</span> DROP 
            <span style="color: #444; margin: 0 6px;">|</span> 
            <span id="space-control-text" style="color: #666;">SPACE: LOCKED</span>
        </div>
    `;
    
    // Global upgrades section
    const globalUpgradesSection = document.createElement('div');
    globalUpgradesSection.id = 'global-upgrades';
    globalUpgradesSection.style.display = 'flex';
    globalUpgradesSection.style.gap = '15px';
    globalUpgradesSection.style.alignItems = 'center';
    
    header.appendChild(titleSection);
    header.appendChild(pointsSection);
    header.appendChild(scoreSection);
    
    // Prestige stars section - gold glow style (only visible after first prestige)
    const starsSection = document.createElement('div');
    starsSection.id = 'stars-section';
    starsSection.style.textAlign = 'center';
    starsSection.style.padding = '15px 25px';
    starsSection.style.backgroundColor = 'rgba(255, 215, 0, 0.1)';
    starsSection.style.borderRadius = '8px';
    starsSection.style.border = '1px solid rgba(255, 215, 0, 0.3)';
    starsSection.style.boxShadow = '0 0 20px rgba(255, 215, 0, 0.2), inset 0 0 20px rgba(255, 215, 0, 0.05)';
    starsSection.style.cursor = 'pointer';
    starsSection.style.display = 'none';
    starsSection.style.transition = 'all 0.2s ease';
    starsSection.title = 'Click to open Prestige Shop';
    starsSection.innerHTML = `
        <div style="font-size: 10px; font-family: 'Press Start 2P', cursive; color: #ffd700; margin-bottom: 8px; text-shadow: 0 0 10px rgba(255, 215, 0, 0.5);">PRESTIGE</div>
        <div style="font-size: 28px; font-weight: bold; color: #ffd700; text-shadow: 0 0 10px #ffd700, 0 0 20px #cc9900;">
            ⭐ <span id="stars-value">0</span>
        </div>
    `;
    starsSection.addEventListener('click', openPrestigeShop);
    
    header.appendChild(starsSection);
    
    // Leaderboard button - gold arcade style
    const leaderboardButton = document.createElement('button');
    leaderboardButton.id = 'leaderboard-button';
    leaderboardButton.textContent = '🏆 Leaderboard';
    leaderboardButton.style.padding = '12px 24px';
    leaderboardButton.style.fontSize = '12px';
    leaderboardButton.style.fontWeight = 'bold';
    leaderboardButton.style.fontFamily = "'Press Start 2P', cursive";
    leaderboardButton.style.background = 'linear-gradient(180deg, #ffd700 0%, #cc9900 100%)';
    leaderboardButton.style.color = '#000';
    leaderboardButton.style.border = 'none';
    leaderboardButton.style.borderRadius = '4px';
    leaderboardButton.style.cursor = 'pointer';
    leaderboardButton.style.transition = 'all 0.15s ease';
    leaderboardButton.style.boxShadow = '0 4px 0 #997700, 0 0 15px rgba(255, 215, 0, 0.4)';
    leaderboardButton.style.textTransform = 'uppercase';
    
    leaderboardButton.addEventListener('mouseenter', () => {
        leaderboardButton.style.transform = 'translateY(-2px)';
        leaderboardButton.style.boxShadow = '0 6px 0 #997700, 0 0 25px rgba(255, 215, 0, 0.6)';
    });
    
    leaderboardButton.addEventListener('mouseleave', () => {
        leaderboardButton.style.transform = 'translateY(0)';
        leaderboardButton.style.boxShadow = '0 4px 0 #997700, 0 0 15px rgba(255, 215, 0, 0.4)';
    });
    
    leaderboardButton.addEventListener('mousedown', () => {
        leaderboardButton.style.transform = 'translateY(2px)';
        leaderboardButton.style.boxShadow = '0 2px 0 #997700, 0 0 10px rgba(255, 215, 0, 0.4)';
    });
    
    leaderboardButton.addEventListener('mouseup', () => {
        leaderboardButton.style.transform = 'translateY(-2px)';
        leaderboardButton.style.boxShadow = '0 6px 0 #997700, 0 0 25px rgba(255, 215, 0, 0.6)';
    });
    
    leaderboardButton.addEventListener('click', () => showLeaderboardModal(false));
    
    header.appendChild(leaderboardButton);
    header.appendChild(controlsSection);
    header.appendChild(globalUpgradesSection);
    
    document.body.appendChild(header);
    
    createGlobalHardDropButton();
    createUnlockNextBoardButton();
    addTutorialControls();
}

function createGlobalHardDropButton(): void {
    const globalUpgradesSection = document.getElementById('global-upgrades');
    if (!globalUpgradesSection) return;
    
    const hardDropButton = document.createElement('button');
    hardDropButton.id = 'global-harddrop-button';
    hardDropButton.textContent = `Unlock Hard Drop (${BASE_COSTS.HARD_DROP} pt)`;
    hardDropButton.style.display = 'none';
    hardDropButton.style.padding = '12px 20px';
    hardDropButton.style.fontSize = '10px';
    hardDropButton.style.fontWeight = 'bold';
    hardDropButton.style.fontFamily = "'Press Start 2P', cursive";
    hardDropButton.style.background = 'linear-gradient(180deg, #00d4ff 0%, #0099cc 100%)';
    hardDropButton.style.color = '#000';
    hardDropButton.style.border = 'none';
    hardDropButton.style.borderRadius = '4px';
    hardDropButton.style.cursor = 'pointer';
    hardDropButton.style.transition = 'all 0.15s ease';
    hardDropButton.style.boxShadow = '0 4px 0 #007799, 0 0 15px rgba(0, 212, 255, 0.4)';
    hardDropButton.style.textTransform = 'uppercase';
    
    hardDropButton.addEventListener('mouseenter', () => {
        if (!hardDropButton.disabled) {
            hardDropButton.style.transform = 'translateY(-2px)';
            hardDropButton.style.boxShadow = '0 6px 0 #007799, 0 0 25px rgba(0, 212, 255, 0.6)';
        }
    });
    
    hardDropButton.addEventListener('mouseleave', () => {
        if (!hardDropButton.disabled) {
            hardDropButton.style.transform = 'translateY(0)';
            hardDropButton.style.boxShadow = '0 4px 0 #007799, 0 0 15px rgba(0, 212, 255, 0.4)';
        }
    });
    
    hardDropButton.addEventListener('click', purchaseHardDrop);
    
    globalUpgradesSection.appendChild(hardDropButton);
}

function createUnlockNextBoardButton(): void {
    const globalUpgradesSection = document.getElementById('global-upgrades');
    if (!globalUpgradesSection) return;
    
    const unlockButton = document.createElement('button');
    unlockButton.id = 'unlock-next-board-button';
    unlockButton.style.display = 'none';
    unlockButton.style.padding = '12px 20px';
    unlockButton.style.fontSize = '10px';
    unlockButton.style.fontWeight = 'bold';
    unlockButton.style.fontFamily = "'Press Start 2P', cursive";
    unlockButton.style.background = 'linear-gradient(180deg, #ff9f43 0%, #ff6b00 100%)';
    unlockButton.style.color = '#000';
    unlockButton.style.border = 'none';
    unlockButton.style.borderRadius = '4px';
    unlockButton.style.cursor = 'pointer';
    unlockButton.style.transition = 'all 0.15s ease';
    unlockButton.style.boxShadow = '0 4px 0 #cc5500, 0 0 15px rgba(255, 159, 67, 0.4)';
    unlockButton.style.textTransform = 'uppercase';
    
    unlockButton.addEventListener('mouseenter', () => {
        if (!unlockButton.disabled) {
            unlockButton.style.transform = 'translateY(-2px)';
            unlockButton.style.boxShadow = '0 6px 0 #cc5500, 0 0 25px rgba(255, 159, 67, 0.6)';
        }
    });
    
    unlockButton.addEventListener('mouseleave', () => {
        if (!unlockButton.disabled) {
            unlockButton.style.transform = 'translateY(0)';
            unlockButton.style.boxShadow = '0 4px 0 #cc5500, 0 0 15px rgba(255, 159, 67, 0.4)';
        }
    });
    
    unlockButton.addEventListener('click', unlockNextBoard);
    
    globalUpgradesSection.appendChild(unlockButton);
    
    // Prestige button - special gold with extra glow
    const prestigeButton = document.createElement('button');
    prestigeButton.id = 'prestige-button';
    prestigeButton.style.display = 'none';
    prestigeButton.style.padding = '12px 24px';
    prestigeButton.style.fontSize = '10px';
    prestigeButton.style.fontWeight = 'bold';
    prestigeButton.style.fontFamily = "'Press Start 2P', cursive";
    prestigeButton.style.background = 'linear-gradient(180deg, #ffd700 0%, #ffaa00 50%, #cc9900 100%)';
    prestigeButton.style.color = '#000';
    prestigeButton.style.border = '2px solid #ffee88';
    prestigeButton.style.borderRadius = '4px';
    prestigeButton.style.cursor = 'pointer';
    prestigeButton.style.transition = 'all 0.15s ease';
    prestigeButton.style.boxShadow = '0 4px 0 #997700, 0 0 20px rgba(255, 215, 0, 0.6), 0 0 40px rgba(255, 215, 0, 0.3)';
    prestigeButton.style.textTransform = 'uppercase';
    prestigeButton.style.animation = 'pulse-gold 2s infinite';
    
    prestigeButton.addEventListener('mouseenter', () => {
        prestigeButton.style.transform = 'translateY(-2px)';
        prestigeButton.style.boxShadow = '0 6px 0 #997700, 0 0 30px rgba(255, 215, 0, 0.8), 0 0 60px rgba(255, 215, 0, 0.4)';
    });
    
    prestigeButton.addEventListener('mouseleave', () => {
        prestigeButton.style.transform = 'translateY(0)';
        prestigeButton.style.boxShadow = '0 4px 0 #997700, 0 0 20px rgba(255, 215, 0, 0.6), 0 0 40px rgba(255, 215, 0, 0.3)';
    });
    
    prestigeButton.addEventListener('click', performPrestige);
    
    globalUpgradesSection.appendChild(prestigeButton);
}

// Helper function to apply arcade button styling
function applyArcadeButtonStyle(
    button: HTMLButtonElement, 
    colorType: 'green' | 'blue' | 'orange' | 'purple' | 'gold' | 'disabled'
): void {
    button.style.padding = '14px 16px';
    button.style.fontSize = '8px';
    button.style.fontFamily = "'Press Start 2P', cursive";
    button.style.fontWeight = 'bold';
    button.style.textTransform = 'uppercase';
    button.style.lineHeight = '1.4';
    button.style.border = 'none';
    button.style.borderRadius = '4px';
    button.style.cursor = colorType === 'disabled' ? 'not-allowed' : 'pointer';
    button.style.transition = 'all 0.15s ease';
    button.style.width = '100%';
    button.style.marginBottom = '12px';
    
    switch (colorType) {
        case 'green':
            button.style.background = 'linear-gradient(180deg, #00ff88 0%, #00cc6a 100%)';
            button.style.color = '#000';
            button.style.boxShadow = '0 3px 0 #009950, 0 0 10px rgba(0, 255, 136, 0.3)';
            break;
        case 'blue':
            button.style.background = 'linear-gradient(180deg, #00d4ff 0%, #0099cc 100%)';
            button.style.color = '#000';
            button.style.boxShadow = '0 3px 0 #007799, 0 0 10px rgba(0, 212, 255, 0.3)';
            break;
        case 'orange':
            button.style.background = 'linear-gradient(180deg, #ff9f43 0%, #ff6b00 100%)';
            button.style.color = '#000';
            button.style.boxShadow = '0 3px 0 #cc5500, 0 0 10px rgba(255, 159, 67, 0.3)';
            break;
        case 'purple':
            button.style.background = 'linear-gradient(180deg, #bf5fff 0%, #9932cc 100%)';
            button.style.color = '#fff';
            button.style.boxShadow = '0 3px 0 #7722aa, 0 0 10px rgba(191, 95, 255, 0.3)';
            break;
        case 'gold':
            button.style.background = 'linear-gradient(180deg, #ffd700 0%, #cc9900 100%)';
            button.style.color = '#000';
            button.style.boxShadow = '0 3px 0 #997700, 0 0 10px rgba(255, 215, 0, 0.3)';
            break;
        case 'disabled':
            button.style.background = 'linear-gradient(180deg, #555566 0%, #333344 100%)';
            button.style.color = '#888';
            button.style.boxShadow = '0 3px 0 #222233';
            break;
    }
}

function createPieceIcon(pieceType: PieceType, boardIndex: number): HTMLImageElement {
    const icon = document.createElement('img');
    icon.id = `force-piece-${pieceType}-${boardIndex}`;
    icon.src = `/pieces/${pieceType}.${pieceType === 'O' ? 'jpg' : 'png'}`;
    icon.alt = pieceType;
    icon.style.width = '24px';
    icon.style.height = '24px';
    icon.style.cursor = 'pointer';
    icon.style.borderRadius = '4px';
    icon.style.border = '2px solid transparent';
    icon.style.opacity = '0.5';
    icon.style.transition = 'all 0.2s ease';
    
    icon.addEventListener('mouseenter', () => {
        if (!icon.classList.contains('disabled') && !icon.classList.contains('selected')) {
            icon.style.transform = 'scale(1.15)';
            icon.style.opacity = '1';
        }
    });
    
    icon.addEventListener('mouseleave', () => {
        if (!icon.classList.contains('disabled') && !icon.classList.contains('selected')) {
            icon.style.transform = 'scale(1)';
            icon.style.opacity = '0.7';
        }
    });
    
    icon.addEventListener('click', () => {
        forceNextPiece(boardIndex, pieceType);
    });
    
    return icon;
}

function createUI(): void {
    // Create game container
    const gameArea = document.getElementById('game-area');
    if (!gameArea) return;
    
    const gameContainer = document.createElement('div');
    gameContainer.id = 'game-container';
    gameContainer.style.display = 'flex';
    gameContainer.style.gap = '20px';
    gameContainer.style.alignItems = 'flex-start';
    
    // Create mini boards column (for slots) - always visible to show progression
    const miniBoardsColumn = document.createElement('div');
    miniBoardsColumn.id = 'mini-boards-column';
    miniBoardsColumn.style.display = 'flex';  // Always visible now
    miniBoardsColumn.style.flexDirection = 'column';
    miniBoardsColumn.style.gap = '10px';
    
    // Create 3 rows of 2 slots each
    for (let row = 0; row < 3; row++) {
        const slotRow = document.createElement('div');
        slotRow.className = 'mini-board-row';
        slotRow.style.display = 'flex';
        slotRow.style.gap = '10px';
        
        for (let col = 0; col < 2; col++) {
            const slotIndex = row * 2 + col;
            const slot = document.createElement('div');
            slot.id = `mini-board-slot-${slotIndex}`;
            slot.className = 'mini-board-slot';
            slot.style.width = `${BOARD_WIDTH_MINI + PADDING_MINI * 2}px`;
            slot.style.height = `${BOARD_HEIGHT_MINI + PADDING_MINI * 2}px`;
            slot.style.backgroundColor = 'rgba(13, 13, 26, 0.9)';
            slot.style.borderRadius = '6px';
            slot.style.position = 'relative';
            slot.style.border = '2px dashed rgba(0, 212, 255, 0.2)';
            slot.style.boxShadow = 'inset 0 0 20px rgba(0, 0, 0, 0.5)';
            
            // Create lock overlay for empty slots with retro styling
            const lockOverlay = document.createElement('div');
            lockOverlay.id = `slot-lock-${slotIndex}`;
            lockOverlay.style.position = 'absolute';
            lockOverlay.style.top = '0';
            lockOverlay.style.left = '0';
            lockOverlay.style.width = '100%';
            lockOverlay.style.height = '100%';
            lockOverlay.style.display = 'flex';
            lockOverlay.style.flexDirection = 'column';
            lockOverlay.style.justifyContent = 'center';
            lockOverlay.style.alignItems = 'center';
            lockOverlay.style.borderRadius = '6px';
            lockOverlay.style.background = 'linear-gradient(180deg, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.5) 100%)';
            
            // Lock icon
            const lockIcon = document.createElement('div');
            lockIcon.className = 'lock-icon';
            lockIcon.textContent = '🔒';
            lockIcon.style.fontSize = '20px';
            lockIcon.style.marginBottom = '8px';
            lockIcon.style.opacity = '0.5';
            
            // Board number label
            const boardLabel = document.createElement('div');
            boardLabel.className = 'board-label';
            boardLabel.textContent = `BOARD ${slotIndex + 2}`;
            boardLabel.style.fontSize = '8px';
            boardLabel.style.fontFamily = "'Press Start 2P', cursive";
            boardLabel.style.color = 'rgba(255, 255, 255, 0.4)';
            boardLabel.style.marginBottom = '4px';
            
            // Unlock cost display
            const unlockCost = document.createElement('div');
            unlockCost.className = 'unlock-cost';
            // Calculate cost for this slot's board (slot 0 = board 2, etc.)
            const cost = Math.round(BASE_COSTS.UNLOCK_NEXT_BOARD * Math.pow(COST_MULTIPLIER, slotIndex));
            unlockCost.textContent = `${cost} PTS`;
            unlockCost.style.fontSize = '7px';
            unlockCost.style.fontFamily = "'Press Start 2P', cursive";
            unlockCost.style.color = 'rgba(255, 255, 255, 0.3)';
            unlockCost.style.marginTop = '2px';
            
            lockOverlay.appendChild(lockIcon);
            lockOverlay.appendChild(boardLabel);
            lockOverlay.appendChild(unlockCost);
            slot.appendChild(lockOverlay);
            
            slotRow.appendChild(slot);
        }
        
        miniBoardsColumn.appendChild(slotRow);
    }
    
    // Create active board container
    const activeBoardContainer = document.createElement('div');
    activeBoardContainer.id = 'active-board-container';
    activeBoardContainer.style.display = 'flex';
    activeBoardContainer.style.gap = '20px';
    
    // Board 1 container (starts as active)
    const board1Container = document.createElement('div');
    board1Container.id = 'board-0-container';
    board1Container.style.display = 'flex';
    board1Container.style.gap = '20px';
    board1Container.style.position = 'relative';
    
    activeBoardContainer.appendChild(board1Container);
    
    gameContainer.appendChild(miniBoardsColumn);
    gameContainer.appendChild(activeBoardContainer);
    
    gameArea.appendChild(gameContainer);
    
    // Move the main canvas to board 0 container
    board1Container.insertBefore(canvas, board1Container.firstChild);
    
    // Create UI panel for active board
    createBoardUI(0);
}

function createBoardUI(boardIndex: number): void {
    const boardContainer = document.getElementById(`board-${boardIndex}-container`);
    if (!boardContainer) return;
    
    const uiPanel = document.createElement('div');
    uiPanel.id = `board-${boardIndex}-ui`;
    uiPanel.style.width = '200px';
    uiPanel.style.padding = '20px';
    uiPanel.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    uiPanel.style.borderRadius = '12px';
    uiPanel.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.3)';
    uiPanel.style.color = 'white';
    uiPanel.style.fontFamily = 'Arial, sans-serif';
    
    // Next piece preview
    const nextPieceSection = document.createElement('div');
    nextPieceSection.id = `next-piece-section-${boardIndex}`;
    nextPieceSection.style.marginBottom = '20px';
    nextPieceSection.style.padding = '15px';
    nextPieceSection.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
    nextPieceSection.style.borderRadius = '8px';
    // Label for the next piece preview area with retro arcade styling
    nextPieceSection.innerHTML = `
        <div style="font-size: 10px; font-family: 'Press Start 2P', cursive; color: #aaa; text-shadow: 0 0 10px rgba(0, 212, 255, 0.5); margin-bottom: 10px; text-align: center; letter-spacing: 1px;">NEXT PIECE</div>
    `;
    
    const nextPieceCanvas = document.createElement('canvas');
    nextPieceCanvas.id = `next-piece-canvas-${boardIndex}`;
    nextPieceCanvas.width = 100;
    nextPieceCanvas.height = 80;
    nextPieceCanvas.style.display = 'block';
    nextPieceCanvas.style.margin = '0 auto';
    nextPieceCanvas.style.border = '2px solid #333';
    nextPieceCanvas.style.borderRadius = '4px';
    nextPieceCanvas.style.backgroundColor = '#111';
    nextPieceSection.appendChild(nextPieceCanvas);

    // Force Next Piece section (shows piece icons to select next piece)
    const forceNextPieceContainer = document.createElement('div');
    forceNextPieceContainer.id = `force-next-piece-container-${boardIndex}`;
    forceNextPieceContainer.style.marginTop = '10px';
    forceNextPieceContainer.style.display = 'none';  // Hidden until unlocked or affordable
    
    // Piece icons container - two rows, second row centered
    const pieceIconsRow = document.createElement('div');
    pieceIconsRow.id = `piece-icons-row-${boardIndex}`;
    pieceIconsRow.style.display = 'flex';
    pieceIconsRow.style.flexDirection = 'column';
    pieceIconsRow.style.alignItems = 'center';
    pieceIconsRow.style.gap = '4px';
    
    // First row: I, O, S, Z
    const row1 = document.createElement('div');
    row1.style.display = 'flex';
    row1.style.gap = '4px';
    
    // Second row: T, J, L (centered)
    const row2 = document.createElement('div');
    row2.style.display = 'flex';
    row2.style.gap = '4px';
    
    // Define which pieces go in which row
    const row1Pieces: PieceType[] = ['I', 'O', 'S', 'Z'];
    const row2Pieces: PieceType[] = ['T', 'J', 'L'];
    
    // Create icons for row 1
    row1Pieces.forEach(pieceType => {
        const icon = createPieceIcon(pieceType, boardIndex);
        row1.appendChild(icon);
    });
    
    // Create icons for row 2
    row2Pieces.forEach(pieceType => {
        const icon = createPieceIcon(pieceType, boardIndex);
        row2.appendChild(icon);
    });
    
    pieceIconsRow.appendChild(row1);
    pieceIconsRow.appendChild(row2);
    
    forceNextPieceContainer.appendChild(pieceIconsRow);
    nextPieceSection.appendChild(forceNextPieceContainer);
    
    // Upgrades section
    const upgradesSection = document.createElement('div');
    upgradesSection.id = `board-${boardIndex}-upgrades`;
    upgradesSection.style.display = 'flex';
    upgradesSection.style.flexDirection = 'column';
    upgradesSection.style.gap = '10px';
    
    uiPanel.appendChild(nextPieceSection);
    uiPanel.appendChild(upgradesSection);
    
    boardContainer.appendChild(uiPanel);
    
    createBoardUpgradeButtons(boardIndex);
}

function createBoardUpgradeButtons(boardIndex: number): void {
    const upgradesSection = document.getElementById(`board-${boardIndex}-upgrades`);
    if (!upgradesSection) return;
    
    const board = boards[boardIndex];
    if (!board) return;
    
    /* Calculate costs for this board
    const aiCost = getBoardCost(BASE_COSTS.HIRE_AI, boardIndex);
    const hardDropCost = getBoardCost(BASE_COSTS.AI_HARD_DROP, boardIndex);
    const speedCost = getBoardCost(BASE_COSTS.AI_SPEED, boardIndex);*/
    
    // Hire AI button - hidden until affordable
    const aiButton = document.createElement('button');
    aiButton.id = `ai-button-${boardIndex}`;
    applyArcadeButtonStyle(aiButton, 'green');
    aiButton.style.display = 'none';
    
    aiButton.addEventListener('click', () => hireAI(boardIndex));
    
    // AI Hard Drop button - hidden until affordable
    const aiHardDropButton = document.createElement('button');
    aiHardDropButton.id = `ai-harddrop-button-${boardIndex}`;
    applyArcadeButtonStyle(aiHardDropButton, 'blue');
    aiHardDropButton.style.display = 'none';
    
    aiHardDropButton.addEventListener('click', () => purchaseAIHardDrop(boardIndex));
    
    // AI Speed button - hidden until affordable
    const aiSpeedButton = document.createElement('button');
    aiSpeedButton.id = `ai-speed-button-${boardIndex}`;
    applyArcadeButtonStyle(aiSpeedButton, 'orange');
    aiSpeedButton.style.display = 'none';
    
    aiSpeedButton.addEventListener('click', () => purchaseAISpeedUpgrade(boardIndex));
    
    upgradesSection.appendChild(aiButton);
    upgradesSection.appendChild(aiHardDropButton);
    upgradesSection.appendChild(aiSpeedButton);
    
    // Force Next Piece unlock button - hidden until affordable
    const forceNextPieceButton = document.createElement('button');
    forceNextPieceButton.id = `force-next-piece-button-${boardIndex}`;
    applyArcadeButtonStyle(forceNextPieceButton, 'purple');
    forceNextPieceButton.style.display = 'none';
    
    forceNextPieceButton.addEventListener('click', () => purchaseForceNextPiece(boardIndex));
    upgradesSection.appendChild(forceNextPieceButton);
    
    // Take Control button - hidden until AI is active and affordable
    const takeControlButton = document.createElement('button');
    takeControlButton.id = `take-control-button-${boardIndex}`;
    applyArcadeButtonStyle(takeControlButton, 'gold');
    takeControlButton.style.display = 'none';
    
    takeControlButton.addEventListener('click', () => activateTakeControl(boardIndex));
    upgradesSection.appendChild(takeControlButton);
    
    // Take Control counter display (shows pieces remaining when player has control)
    const takeControlCounter = document.createElement('div');
    takeControlCounter.id = `take-control-counter-${boardIndex}`;
    takeControlCounter.style.display = 'none';
    takeControlCounter.style.padding = '8px';
    takeControlCounter.style.backgroundColor = 'rgba(233, 30, 99, 0.2)';
    takeControlCounter.style.borderRadius = '6px';
    takeControlCounter.style.textAlign = 'center';
    takeControlCounter.style.fontSize = '12px';
    takeControlCounter.innerHTML = `<span>🎮 Pieces left: <strong id="take-control-count-${boardIndex}">0</strong></span>`;
    upgradesSection.appendChild(takeControlCounter);
}

// =====================================================
// PURCHASE FUNCTIONS
// =====================================================

function purchaseHardDrop(): void {
    if (globalPoints < BASE_COSTS.HARD_DROP) return;
    
    globalPoints -= BASE_COSTS.HARD_DROP;
    hardDropUnlocked = true;
    
    updatePointsDisplay();
    updateGlobalHardDropButton();
    updateControlsDisplay();
    
    console.log("Hard Drop unlocked!");
}

function hireAI(boardIndex: number): void {
    const board = boards[boardIndex];
    if (!board) return;
    
    const cost = getBoardCost(BASE_COSTS.HIRE_AI, boardIndex);
    if (globalPoints < cost) return;
    
    globalPoints -= cost;
    board.aiHired = true;
    board.aiEnabled = true;
    
    updatePointsDisplay();
    updateBoardButtons(boardIndex);
    
    console.log(`AI hired for board ${boardIndex + 1}!`);
}

function purchaseAIHardDrop(boardIndex: number): void {
    const board = boards[boardIndex];
    if (!board || !board.aiHired) return;
    
    const cost = getBoardCost(BASE_COSTS.AI_HARD_DROP, boardIndex);
    if (globalPoints < cost) return;
    
    globalPoints -= cost;
    board.aiHardDropUnlocked = true;
    
    updatePointsDisplay();
    updateBoardButtons(boardIndex);
    checkBoardMaxedOut(boardIndex);
    
    console.log(`AI Hard Drop unlocked for board ${boardIndex + 1}!`);
}

function purchaseAISpeedUpgrade(boardIndex: number): void {
    const board = boards[boardIndex];
    if (!board || !board.aiHired) return;
    if (board.aiSpeedLevel >= MAX_AI_SPEED_UPGRADES) return;
    
    const cost = getBoardCost(BASE_COSTS.AI_SPEED, boardIndex);
    if (globalPoints < cost) return;
    
    globalPoints -= cost;
    board.aiSpeedLevel++;
    board.aiSpeed = BASE_AI_SPEED / Math.pow(1.5, board.aiSpeedLevel);
    
    updatePointsDisplay();
    updateBoardButtons(boardIndex);
    checkBoardMaxedOut(boardIndex);
    
    console.log(`AI Speed upgraded to level ${board.aiSpeedLevel} for board ${boardIndex + 1}!`);
}

function purchaseForceNextPiece(boardIndex: number): void {
    const board = boards[boardIndex];
    if (!board || board.forceNextPieceUnlocked) return;
    
    const cost = getBoardCost(BASE_COSTS.FORCE_NEXT_PIECE_UNLOCK, boardIndex);
    if (globalPoints < cost) return;
    
    globalPoints -= cost;
    board.forceNextPieceUnlocked = true;
    
    updatePointsDisplay();
    updateBoardButtons(boardIndex);
    updateForceNextPieceUI(boardIndex);
    checkBoardMaxedOut(boardIndex);
    
    console.log(`Force Next Piece unlocked for board ${boardIndex + 1}!`);
}

function forceNextPiece(boardIndex: number, pieceType: PieceType): void {
    const board = boards[boardIndex];
    if (!board || !board.forceNextPieceUnlocked) return;
    
    // Can't change to the same piece
    if (board.nextPiece === pieceType) return;
    
    const cost = getBoardCost(BASE_COSTS.FORCE_NEXT_PIECE_USE, boardIndex);
    if (globalPoints < cost) return;
    
    globalPoints -= cost;
    board.nextPiece = pieceType;
    
    updatePointsDisplay();
    updateNextPiecePreview(board);
    updateForceNextPieceUI(boardIndex);
    
    console.log(`Board ${boardIndex + 1}: Next piece forced to ${pieceType}`);
}

function activateTakeControl(boardIndex: number): void {
    const board = boards[boardIndex];
    // Only works on active board when AI is in control
    if (!board || board.index !== activeBoardIndex || !board.aiEnabled) return;
    
    const cost = getBoardCost(BASE_COSTS.TAKE_CONTROL, boardIndex);
    if (globalPoints < cost) return;
    
    globalPoints -= cost;
    
    // Pause AI and give player control for 30 pieces
    board.aiEnabled = false;
    board.playerControlPiecesRemaining = TAKE_CONTROL_PIECES;
    board.aiTargetPosition = null;
    board.aiMoving = false;
    
    updatePointsDisplay();
    updateTakeControlDisplay(boardIndex);
    
    console.log(`Board ${boardIndex + 1}: Player taking control for ${TAKE_CONTROL_PIECES} pieces`);
}

function updateTakeControlDisplay(boardIndex: number): void {
    const board = boards[boardIndex];
    if (!board) return;
    
    const counter = document.getElementById(`take-control-counter-${boardIndex}`);
    const countValue = document.getElementById(`take-control-count-${boardIndex}`);
    const button = document.getElementById(`take-control-button-${boardIndex}`) as HTMLButtonElement;
    
    // Only show Take Control UI on the active board
    if (board.index !== activeBoardIndex) {
        if (counter) counter.style.display = 'none';
        if (button) button.style.display = 'none';
        return;
    }
    
    if (board.playerControlPiecesRemaining > 0) {
        // Player is in control - show counter, hide button
        if (counter) counter.style.display = 'block';
        if (countValue) countValue.textContent = board.playerControlPiecesRemaining.toString();
        if (button) button.style.display = 'none';
        
    } else if (board.aiEnabled && !board.isGameOver) {
        // AI is controlling the active board - show Take Control button if affordable
        if (counter) counter.style.display = 'none';
        const cost = getBoardCost(BASE_COSTS.TAKE_CONTROL, boardIndex);
        if (button) {
            if (globalPoints >= cost) {
                button.style.display = 'block';
                button.style.backgroundColor = '#E91E63';
                button.style.cursor = 'pointer';
                button.disabled = false;
                button.textContent = `Take Control (${cost} pts)`;
                // Show dialogue hint when take control becomes affordable
                showDialogue('take-control', button);
            } else {
                button.style.display = 'none';
            }
        }
    } else {
        // Player is already in control or game over - hide both
        if (counter) counter.style.display = 'none';
        if (button) button.style.display = 'none';
    }
}

function updateForceNextPieceUI(boardIndex: number): void {
    const board = boards[boardIndex];
    if (!board) return;
    
    const container = document.getElementById(`force-next-piece-container-${boardIndex}`);
    if (!container) return;
    
    // Only show on active board
    if (board.index !== activeBoardIndex) {
        container.style.display = 'none';
        return;
    }
    
    if (board.forceNextPieceUnlocked) {
        container.style.display = 'block';
        
        // Update each piece icon
        const pieceTypes: PieceType[] = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];
        const useCost = getBoardCost(BASE_COSTS.FORCE_NEXT_PIECE_USE, boardIndex);
        
        pieceTypes.forEach(pieceType => {
            const icon = document.getElementById(`force-piece-${pieceType}-${boardIndex}`) as HTMLImageElement;
            if (!icon) return;
            
            const isCurrentNext = board.nextPiece === pieceType;
            const canAfford = globalPoints >= useCost;
            
            if (isCurrentNext) {
                // This is the current next piece - hide it but keep space
                icon.style.visibility = 'hidden';
                icon.classList.add('selected');
                icon.classList.remove('disabled');
            } else if (canAfford) {
                // Can afford to select this piece - show it
                icon.style.visibility = 'visible';
                icon.style.border = '2px solid transparent';
                icon.style.opacity = '0.7';
                icon.classList.remove('selected', 'disabled');
                icon.style.cursor = 'pointer';
            } else {
                // Can't afford - show but dimmed
                icon.style.visibility = 'visible';
                icon.style.border = '2px solid transparent';
                icon.style.opacity = '0.3';
                icon.classList.add('disabled');
                icon.classList.remove('selected');
                icon.style.cursor = 'not-allowed';
            }
        });
    } else {
        container.style.display = 'none';
    }
}

function checkBoardMaxedOut(boardIndex: number): void {
    const board = boards[boardIndex];
    if (!board) return;
    
    if (isBoardMaxedOut(board) && !board.isMaxedOut) {
        board.isMaxedOut = true;
        updateUnlockNextBoardButton();
        updatePrestigeButton();
        console.log(`Board ${boardIndex + 1} is maxed out!`);
    }
}

function unlockNextBoard(): void {
    if (!canUnlockNextBoard()) return;
    
    const cost = getNextBoardUnlockCost(boards.length);
    if (globalPoints < cost) return;
    
    globalPoints -= cost;
    
    // Minify the current active board
    const currentActiveBoard = boards[activeBoardIndex];
    minifyBoard(currentActiveBoard);
    
    // Create new board
    const newBoardIndex = boards.length;
    const newBoard = createBoard(newBoardIndex);
    boards.push(newBoard);
    
    // Set up the new board
    createNewBoardUI(newBoardIndex);
    
    // Update active board
    activeBoardIndex = newBoardIndex;
    newBoard.lastDropTime = performance.now();
    spawnNewPiece(newBoard);
    
    updatePointsDisplay();
    updateUnlockNextBoardButton();
    
    console.log(`Board ${newBoardIndex + 1} unlocked!`);
}

// =====================================================
// PRESTIGE SYSTEM FUNCTIONS
// =====================================================

function canPrestige(): boolean {
    // Must have all 7 boards AND board 7 must be maxed out AND have at least 5000 points
    if (boards.length < MAX_BOARDS) return false;
    const lastBoard = boards[MAX_BOARDS - 1];
    if (!lastBoard || !isBoardMaxedOut(lastBoard)) return false;
    if (globalLinesCleared < SCORE_PER_STAR) return false;
    return true;
}

function getStarsFromScore(score: number): number {
    return Math.floor(score / SCORE_PER_STAR);
}

function updatePrestigeButton(): void {
    const button = document.getElementById('prestige-button') as HTMLButtonElement;
    if (!button) return;
    
    if (canPrestige()) {
        const starsToEarn = getStarsFromScore(globalLinesCleared);
        button.style.display = 'block';
        button.textContent = `⭐ Prestige (+${starsToEarn} ⭐)`;
        // Show dialogue hint when prestige becomes available
        showDialogue('prestige', button);
    } else {
        button.style.display = 'none';
    }
}

// Updates the lock icons on mini board slots based on current game state
function updateSlotLocks(): void {
    for (let slotIndex = 0; slotIndex < 6; slotIndex++) {
        const lockOverlay = document.getElementById(`slot-lock-${slotIndex}`);
        if (!lockOverlay) continue;
        
        const boardForThisSlot = slotIndex; // Slot 0 holds board index 0, etc.
        const board = boards[boardForThisSlot];
        
        // If this slot has a board in it, hide the lock completely
        if (board && board.isMinified) {
            lockOverlay.style.display = 'none';
            continue;
        }
        
        // Show the lock overlay
        lockOverlay.style.display = 'flex';
        
        // Find lock icon and update its appearance based on unlock availability
        const lockIcon = lockOverlay.querySelector('.lock-icon') as HTMLElement;
        const boardLabel = lockOverlay.querySelector('.board-label') as HTMLElement;
        const unlockCostEl = lockOverlay.querySelector('.unlock-cost') as HTMLElement;
        
        if (!lockIcon || !boardLabel || !unlockCostEl) continue;
        
        // Calculate which board needs to be maxed to unlock this slot
        // Slot 0 (Board 2) unlocks when Board 1 (index 0) is maxed
        // Slot 1 (Board 3) unlocks when Board 2 (index 1) is maxed, etc.
        const requiredBoardIndex = slotIndex;
        const requiredBoard = boards[requiredBoardIndex];
        
        // Check if the prerequisite board exists and is maxed out
        const prerequisiteMet = requiredBoard && isBoardMaxedOut(requiredBoard);
        
        // Recalculate cost with prestige discount
        const baseCost = BASE_COSTS.UNLOCK_NEXT_BOARD * Math.pow(COST_MULTIPLIER, slotIndex);
        const reduction = hasHalfCost ? 0.5 : 1;
        const cost = Math.round(baseCost * reduction);
        unlockCostEl.textContent = `${cost} pts`;
        
        if (prerequisiteMet) {
            // This slot is ready to be unlocked (previous board is maxed)
            lockIcon.textContent = '🔓';
            lockIcon.style.opacity = '1';
            lockIcon.style.filter = 'drop-shadow(0 0 8px rgba(0, 255, 136, 0.8))';
            boardLabel.style.color = '#00ff88';
            boardLabel.style.textShadow = '0 0 10px rgba(0, 255, 136, 0.5)';
            unlockCostEl.style.color = '#00ff88';
            unlockCostEl.style.textShadow = '0 0 10px rgba(0, 255, 136, 0.5)';
            
            // Update slot border to show it's ready
            const slot = document.getElementById(`mini-board-slot-${slotIndex}`);
            if (slot) {
                slot.style.border = '2px dashed rgba(0, 255, 136, 0.5)';
                slot.style.boxShadow = 'inset 0 0 20px rgba(0, 0, 0, 0.5), 0 0 15px rgba(0, 255, 136, 0.2)';
            }
        } else {
            // Still locked (previous board not maxed yet)
            lockIcon.textContent = '🔒';
            lockIcon.style.opacity = '0.5';
            lockIcon.style.filter = 'none';
            boardLabel.style.color = 'rgba(255, 255, 255, 0.4)';
            boardLabel.style.textShadow = 'none';
            unlockCostEl.style.color = 'rgba(255, 255, 255, 0.3)';
            unlockCostEl.style.textShadow = 'none';
            
            // Reset slot border
            const slot = document.getElementById(`mini-board-slot-${slotIndex}`);
            if (slot) {
                slot.style.border = '2px dashed rgba(0, 212, 255, 0.2)';
                slot.style.boxShadow = 'inset 0 0 20px rgba(0, 0, 0, 0.5)';
            }
        }
    }
}

function performPrestige(): void {
    if (!canPrestige()) return;
    
    // Calculate stars earned from current score (lines cleared)
    const starsEarned = getStarsFromScore(globalLinesCleared);
    prestigeStars += starsEarned;
    prestigeCount++;
    
    console.log(`Prestige #${prestigeCount}! Earned ${starsEarned} stars. Total stars: ${prestigeStars}`);
    
    // Reset game state but keep prestige upgrades
    resetForPrestige();
    
    // Show stars section now that player has prestiged
    updateStarsDisplay();
}

function resetForPrestige(): void {
    // Reset points but NOT score (globalLinesCleared persists)
    globalPoints = 0;
    
    // Reset game over state
    isGameOver = false;
    isPaused = false;
    
    // Hide game over screen if showing
    const gameOverScreen = document.getElementById('game-over-screen');
    if (gameOverScreen) gameOverScreen.style.display = 'none';
    
    // Reset global upgrades
    hardDropUnlocked = false;
    
    // Clear all boards
    boards = [];
    activeBoardIndex = 0;
    
    // Clear mini board slots (keep column visible, just clear contents)
    const miniBoardsColumn = document.getElementById('mini-boards-column');
    if (miniBoardsColumn) {
        // Don't hide the column - keep slots visible with locks
        for (let i = 0; i < 6; i++) {
            const slot = document.getElementById(`mini-board-slot-${i}`);
            if (slot) {
                slot.innerHTML = '';
                slot.style.backgroundColor = 'rgba(13, 13, 26, 0.9)';
                slot.style.border = '2px dashed rgba(0, 212, 255, 0.2)';
                slot.style.boxShadow = 'inset 0 0 20px rgba(0, 0, 0, 0.5)';
                
                // Recreate lock overlay
                const lockOverlay = document.createElement('div');
                lockOverlay.id = `slot-lock-${i}`;
                lockOverlay.style.position = 'absolute';
                lockOverlay.style.top = '0';
                lockOverlay.style.left = '0';
                lockOverlay.style.width = '100%';
                lockOverlay.style.height = '100%';
                lockOverlay.style.display = 'flex';
                lockOverlay.style.flexDirection = 'column';
                lockOverlay.style.justifyContent = 'center';
                lockOverlay.style.alignItems = 'center';
                lockOverlay.style.borderRadius = '6px';
                
                const lockIcon = document.createElement('div');
                lockIcon.className = 'lock-icon';
                lockIcon.textContent = '🔒';
                lockIcon.style.fontSize = '20px';
                lockIcon.style.marginBottom = '8px';
                lockIcon.style.opacity = '0.5';
                
                const boardLabel = document.createElement('div');
                boardLabel.className = 'board-label';
                boardLabel.textContent = `BOARD ${i + 2}`;
                boardLabel.style.fontSize = '8px';
                boardLabel.style.fontFamily = "'Press Start 2P', cursive";
                boardLabel.style.color = 'rgba(255, 255, 255, 0.4)';
                boardLabel.style.marginBottom = '4px';
                
                const unlockCost = document.createElement('div');
                unlockCost.className = 'unlock-cost';
                const cost = Math.round(BASE_COSTS.UNLOCK_NEXT_BOARD * Math.pow(COST_MULTIPLIER, i));
                unlockCost.textContent = `${cost} PTS`;
                unlockCost.style.fontSize = '7px';
                unlockCost.style.fontFamily = "'Press Start 2P', cursive";
                unlockCost.style.color = 'rgba(255, 255, 255, 0.3)';
                unlockCost.style.marginTop = '2px';
                
                lockOverlay.appendChild(lockIcon);
                lockOverlay.appendChild(boardLabel);
                lockOverlay.appendChild(unlockCost);
                slot.appendChild(lockOverlay);
            }
        }
    }
    
    // Remove any existing board containers except the first
    const activeBoardContainer = document.getElementById('active-board-container');
    if (activeBoardContainer) {
        activeBoardContainer.innerHTML = '';
        
        // Recreate board 0 container
        const board0Container = document.createElement('div');
        board0Container.id = 'board-0-container';
        board0Container.style.display = 'flex';
        board0Container.style.gap = '20px';
        board0Container.style.position = 'relative';
        
        // Move canvas back to board 0
        board0Container.appendChild(canvas);
        activeBoardContainer.appendChild(board0Container);
    }
    
    // Create fresh board 0
    const board0 = createBoard(0);
    board0.canvas = canvas;
    boards.push(board0);
    
    // Clear the canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Recreate UI for board 0
    createBoardUI(0);
    
    // Start the game
    spawnNewPiece(board0);
    board0.lastDropTime = performance.now();
    
    // Update all displays
    updatePointsDisplay();
    updateGlobalHardDropButton();
    updateUnlockNextBoardButton();
    updatePrestigeButton();
    updateBoardButtons(0);
    updateControlsDisplay();
    
    console.log('Game reset for prestige. Permanent upgrades retained.');
}

function updateStarsDisplay(): void {
    const starsSection = document.getElementById('stars-section');
    const starsValue = document.getElementById('stars-value');
    
    if (prestigeCount > 0) {
        if (starsSection) starsSection.style.display = 'block';
        if (starsValue) starsValue.textContent = prestigeStars.toString();
    } else {
        if (starsSection) starsSection.style.display = 'none';
    }
}

function openPrestigeShop(): void {
    // Remove existing modal if any
    const existingModal = document.getElementById('prestige-shop-overlay');
    if (existingModal) existingModal.remove();
    
    // Create overlay with dark background
    const overlay = document.createElement('div');
    overlay.id = 'prestige-shop-overlay';
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100%';
    overlay.style.height = '100%';
    overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.9)';
    overlay.style.display = 'flex';
    overlay.style.justifyContent = 'center';
    overlay.style.alignItems = 'center';
    overlay.style.zIndex = '3000';
    
    // Create modal with retro arcade styling
    const modal = document.createElement('div');
    modal.style.backgroundColor = '#0d0d1a';
    modal.style.border = '3px solid #ffd700';
    modal.style.borderRadius = '8px';
    modal.style.padding = '30px 40px';
    modal.style.minWidth = '420px';
    modal.style.color = 'white';
    modal.style.fontFamily = "'Press Start 2P', cursive";
    modal.style.textAlign = 'center';
    modal.style.boxShadow = '0 0 30px rgba(255, 215, 0, 0.3), 0 0 60px rgba(255, 215, 0, 0.1), inset 0 0 30px rgba(0, 0, 0, 0.5)';
    
    // Title with neon glow
    const title = document.createElement('h2');
    title.textContent = '⭐ PRESTIGE SHOP ⭐';
    title.style.margin = '0 0 10px 0';
    title.style.color = '#ffd700';
    title.style.fontSize = '16px';
    title.style.textShadow = '0 0 10px rgba(255, 215, 0, 0.5)';
    modal.appendChild(title);
    
    // Stars balance display
    const balance = document.createElement('div');
    balance.style.fontSize = '12px';
    balance.style.marginBottom = '8px';
    balance.style.color = '#ffd700';
    balance.style.textShadow = '0 0 10px rgba(255, 215, 0, 0.5)';
    balance.innerHTML = `YOUR STARS: <span style="font-size: 16px;">${prestigeStars}</span> ⭐`;
    modal.appendChild(balance);
    
    // Prestige count subtitle
    const prestigeInfo = document.createElement('div');
    prestigeInfo.style.fontSize = '8px';
    prestigeInfo.style.marginBottom = '25px';
    prestigeInfo.style.color = '#666';
    prestigeInfo.textContent = `TIMES PRESTIGED: ${prestigeCount}`;
    modal.appendChild(prestigeInfo);
    
    // Upgrades container
    const upgradesContainer = document.createElement('div');
    upgradesContainer.style.display = 'flex';
    upgradesContainer.style.flexDirection = 'column';
    upgradesContainer.style.gap = '12px';
    upgradesContainer.style.textAlign = 'left';
    
    // Helper function to create upgrade rows
    function createUpgradeRow(name: string, description: string, isPurchased: boolean, onPurchase: () => void): HTMLElement {
        const row = document.createElement('div');
        row.style.backgroundColor = 'rgba(255, 215, 0, 0.05)';
        row.style.borderRadius = '6px';
        row.style.padding = '14px';
        row.style.borderLeft = isPurchased ? '3px solid #00ff88' : '3px solid #ffd700';
        row.style.display = 'flex';
        row.style.justifyContent = 'space-between';
        row.style.alignItems = 'center';
        row.style.gap = '15px';
        
        // Left side - name and description
        const textContainer = document.createElement('div');
        textContainer.style.flex = '1';
        
        const nameEl = document.createElement('div');
        nameEl.style.fontSize = '10px';
        nameEl.style.marginBottom = '6px';
        nameEl.style.color = isPurchased ? '#00ff88' : '#ffd700';
        nameEl.style.textShadow = isPurchased ? '0 0 10px rgba(0, 255, 136, 0.5)' : '0 0 10px rgba(255, 215, 0, 0.3)';
        nameEl.textContent = name;
        textContainer.appendChild(nameEl);
        
        const descEl = document.createElement('div');
        descEl.style.fontSize = '8px';
        descEl.style.color = '#888';
        descEl.style.lineHeight = '1.6';
        descEl.textContent = description;
        textContainer.appendChild(descEl);
        
        row.appendChild(textContainer);
        
        // Right side - button
        const buyButton = document.createElement('button');
        buyButton.style.padding = '10px 16px';
        buyButton.style.border = 'none';
        buyButton.style.borderRadius = '4px';
        buyButton.style.fontSize = '8px';
        buyButton.style.fontFamily = "'Press Start 2P', cursive";
        buyButton.style.cursor = 'pointer';
        buyButton.style.transition = 'all 0.15s ease';
        buyButton.style.whiteSpace = 'nowrap';
        
        if (isPurchased) {
            // Already purchased - show checkmark
            buyButton.textContent = '✓ OWNED';
            buyButton.style.background = 'linear-gradient(180deg, #00ff88 0%, #00cc6a 100%)';
            buyButton.style.color = '#000';
            buyButton.style.boxShadow = '0 3px 0 #009950, 0 0 10px rgba(0, 255, 136, 0.3)';
            buyButton.style.cursor = 'default';
            buyButton.disabled = true;
        } else if (prestigeStars >= 1) {
            // Can afford - show buy button
            buyButton.textContent = 'BUY 1 ⭐';
            buyButton.style.background = 'linear-gradient(180deg, #ffd700 0%, #cc9900 100%)';
            buyButton.style.color = '#000';
            buyButton.style.boxShadow = '0 3px 0 #997700, 0 0 10px rgba(255, 215, 0, 0.3)';
            
            buyButton.addEventListener('mouseenter', () => {
                buyButton.style.transform = 'translateY(-2px)';
                buyButton.style.boxShadow = '0 5px 0 #997700, 0 0 20px rgba(255, 215, 0, 0.5)';
            });
            buyButton.addEventListener('mouseleave', () => {
                buyButton.style.transform = 'translateY(0)';
                buyButton.style.boxShadow = '0 3px 0 #997700, 0 0 10px rgba(255, 215, 0, 0.3)';
            });
            buyButton.addEventListener('click', () => {
                onPurchase();
                // Refresh the shop
                overlay.remove();
                openPrestigeShop();
            });
        } else {
            // Can't afford - disabled button
            buyButton.textContent = 'NEED 1 ⭐';
            buyButton.style.background = 'linear-gradient(180deg, #444 0%, #333 100%)';
            buyButton.style.color = '#666';
            buyButton.style.boxShadow = '0 3px 0 #222';
            buyButton.style.cursor = 'not-allowed';
            buyButton.disabled = true;
        }
        
        row.appendChild(buyButton);
        return row;
    }
    
    // Create the three upgrade rows
    const doublePointsRow = createUpgradeRow(
        '2X POINTS',
        'Double all points earned from clearing lines.',
        hasDoublePoints,
        () => purchasePrestigeUpgrade('doublePoints')
    );
    upgradesContainer.appendChild(doublePointsRow);
    
    const halfCostRow = createUpgradeRow(
        '50% COST',
        'All upgrades cost half as many points.',
        hasHalfCost,
        () => purchasePrestigeUpgrade('halfCost')
    );
    upgradesContainer.appendChild(halfCostRow);
    
    const autoResetRow = createUpgradeRow(
        'AUTO-RESET',
        'Mini boards automatically reset when they lose.',
        hasAutoReset,
        () => purchasePrestigeUpgrade('autoReset')
    );
    upgradesContainer.appendChild(autoResetRow);
    
    modal.appendChild(upgradesContainer);
    
    // Shop status - check if all upgrades are purchased
    if (hasDoublePoints && hasHalfCost && hasAutoReset) {
        const shopStatus = document.createElement('div');
        shopStatus.style.marginTop = '20px';
        shopStatus.style.fontSize = '10px';
        shopStatus.style.color = '#00ff88';
        shopStatus.style.textShadow = '0 0 10px rgba(0, 255, 136, 0.5)';
        shopStatus.textContent = '✓ SHOP COMPLETE!';
        modal.appendChild(shopStatus);
    }
    
    // Close button with arcade styling
    const closeButton = document.createElement('button');
    closeButton.textContent = 'CLOSE';
    closeButton.style.display = 'block';
    closeButton.style.margin = '25px auto 0';
    closeButton.style.padding = '12px 30px';
    closeButton.style.background = 'linear-gradient(180deg, #00d4ff 0%, #0099cc 100%)';
    closeButton.style.color = '#000';
    closeButton.style.border = 'none';
    closeButton.style.borderRadius = '4px';
    closeButton.style.fontSize = '10px';
    closeButton.style.fontFamily = "'Press Start 2P', cursive";
    closeButton.style.cursor = 'pointer';
    closeButton.style.boxShadow = '0 4px 0 #007799, 0 0 15px rgba(0, 212, 255, 0.4)';
    closeButton.style.transition = 'all 0.15s ease';
    
    closeButton.addEventListener('mouseenter', () => {
        closeButton.style.transform = 'translateY(-2px)';
        closeButton.style.boxShadow = '0 6px 0 #007799, 0 0 25px rgba(0, 212, 255, 0.6)';
    });
    closeButton.addEventListener('mouseleave', () => {
        closeButton.style.transform = 'translateY(0)';
        closeButton.style.boxShadow = '0 4px 0 #007799, 0 0 15px rgba(0, 212, 255, 0.4)';
    });
    closeButton.addEventListener('click', () => overlay.remove());
    modal.appendChild(closeButton);
    
    // Close on overlay click
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) overlay.remove();
    });
    
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
}

function purchasePrestigeUpgrade(upgradeType: 'doublePoints' | 'halfCost' | 'autoReset'): void {
    if (prestigeStars < 1) return;
    
    if (upgradeType === 'doublePoints' && !hasDoublePoints) {
        prestigeStars--;
        hasDoublePoints = true;
        console.log('Purchased 2x Points!');
    } else if (upgradeType === 'halfCost' && !hasHalfCost) {
        prestigeStars--;
        hasHalfCost = true;
        console.log('Purchased 50% Cost Reduction!');
    } else if (upgradeType === 'autoReset' && !hasAutoReset) {
        prestigeStars--;
        hasAutoReset = true;
        console.log('Purchased Auto-Reset!');
    }
    
    updateStarsDisplay();
    // Update all button costs since they may have changed
    updateBoardButtons(activeBoardIndex);
    updateUnlockNextBoardButton();
    updateSlotLocks();
}

function minifyBoard(board: Board): void {
    board.isMinified = true;
    
    // Make sure AI is enabled
    if (!board.aiEnabled && board.aiHired) {
        board.aiEnabled = true;
    }
    
    // Find an empty slot
    const slotIndex = board.index;
    const slot = document.getElementById(`mini-board-slot-${slotIndex}`);
    if (!slot) return;
    
    // Show the mini boards column
    const miniBoardsColumn = document.getElementById('mini-boards-column');
    if (miniBoardsColumn) {
        miniBoardsColumn.style.display = 'flex';
    }
    
    // Create mini canvas
    const miniCanvas = document.createElement('canvas');
    miniCanvas.id = `mini-canvas-${board.index}`;
    miniCanvas.width = BOARD_WIDTH_MINI + PADDING_MINI * 2;
    miniCanvas.height = BOARD_HEIGHT_MINI + PADDING_MINI * 2;
    miniCanvas.style.borderRadius = '4px';
    board.canvas = miniCanvas;
    
    // Clear slot (removes lock overlay) and add canvas
    slot.innerHTML = '';
    slot.appendChild(miniCanvas);
    slot.style.position = 'relative';
    slot.style.border = 'none';  // Remove dashed border when board is placed
    slot.style.backgroundColor = 'transparent';
    
    // Remove the old board container from active area
    const oldContainer = document.getElementById(`board-${board.index}-container`);
    if (oldContainer) {
        oldContainer.remove();
    }
    
    // Store container reference
    board.container = slot;
}

function createNewBoardUI(boardIndex: number): void {
    const activeBoardContainer = document.getElementById('active-board-container');
    if (!activeBoardContainer) return;
    
    // Create container for new active board
    const boardContainer = document.createElement('div');
    boardContainer.id = `board-${boardIndex}-container`;
    boardContainer.style.display = 'flex';
    boardContainer.style.gap = '20px';
    boardContainer.style.position = 'relative';
    
    // Create canvas for new board
    const newCanvas = document.createElement('canvas');
    newCanvas.id = `game-canvas-${boardIndex}`;
    newCanvas.width = BOARD_WIDTH + (PADDING * 2);
    newCanvas.height = BOARD_HEIGHT + (PADDING * 2);
    newCanvas.style.backgroundColor = '#000000';
    newCanvas.style.borderRadius = '12px';
    newCanvas.style.boxShadow = '0 0 20px rgba(0, 0, 0, 0.3)';
    
    boardContainer.appendChild(newCanvas);
    
    // Set canvas reference
    boards[boardIndex].canvas = newCanvas;
    boards[boardIndex].container = boardContainer;
    
    // Clear active board container and add new board
    activeBoardContainer.innerHTML = '';
    activeBoardContainer.appendChild(boardContainer);
    
    // Create UI for new board
    createBoardUI(boardIndex);
}

// =====================================================
// UPDATE FUNCTIONS
// =====================================================

function updatePointsDisplay(): void {
    const pointsDisplay = document.getElementById('global-points-value');
    const scoreDisplay = document.getElementById('global-score-value');
    
    if (pointsDisplay) pointsDisplay.textContent = globalPoints.toString();
    if (scoreDisplay) scoreDisplay.textContent = globalLinesCleared.toString();
    
    // Update all button states
    updateGlobalHardDropButton();
    updateUnlockNextBoardButton();
    
    for (let i = 0; i < boards.length; i++) {
        if (!boards[i].isMinified) {
            updateBoardButtons(i);
        }
        updateBoardLostOverlay(i);
        updateTakeControlDisplay(i);
        updateForceNextPieceUI(i);
    }
    updatePrestigeButton();
    updateSlotLocks();
}

function updateGlobalHardDropButton(): void {
    const button = document.getElementById('global-harddrop-button') as HTMLButtonElement;
    if (!button) return;
    
    if (hardDropUnlocked) {
        button.textContent = 'Hard Drop ✓';
        button.style.display = 'block';
        button.style.background = 'linear-gradient(180deg, #555566 0%, #333344 100%)';
        button.style.color = '#00ff88';
        button.style.boxShadow = '0 4px 0 #222233, 0 0 10px rgba(0, 255, 136, 0.3)';
        button.style.cursor = 'default';
        button.disabled = true;
    } else if (globalPoints >= BASE_COSTS.HARD_DROP) {
        button.style.display = 'block';
        button.style.background = 'linear-gradient(180deg, #00d4ff 0%, #0099cc 100%)';
        button.style.color = '#000';
        button.style.boxShadow = '0 4px 0 #007799, 0 0 15px rgba(0, 212, 255, 0.4)';
        button.style.cursor = 'pointer';
        button.disabled = false;
        showDialogue('global-harddrop', button);
    } else {
        button.style.display = 'none';
    }
}

function updateUnlockNextBoardButton(): void {
    const button = document.getElementById('unlock-next-board-button') as HTMLButtonElement;
    if (!button) return;
    
    if (!canUnlockNextBoard()) {
        button.style.display = 'none';
        return;
    }
    
    const cost = getNextBoardUnlockCost(boards.length);
    const nextBoardNum = boards.length + 1;
    
    if (globalPoints >= cost) {
        button.style.display = 'block';
        button.style.backgroundColor = '#FF5722';
        button.style.cursor = 'pointer';
        button.disabled = false;
        button.textContent = `Unlock Board ${nextBoardNum} (${cost} pts)`;
    } else {
        button.style.display = 'block';
        button.style.backgroundColor = '#888888';
        button.style.cursor = 'not-allowed';
        button.disabled = true;
        button.textContent = `Unlock Board ${nextBoardNum} (need ${cost} pts)`;
    }
}

function updateBoardButtons(boardIndex: number): void {
    const board = boards[boardIndex];
    if (!board) return;
    
    const aiCost = getBoardCost(BASE_COSTS.HIRE_AI, boardIndex);
    const hardDropCost = getBoardCost(BASE_COSTS.AI_HARD_DROP, boardIndex);
    const speedCost = getBoardCost(BASE_COSTS.AI_SPEED, boardIndex);
    
    // AI Button
    const aiButton = document.getElementById(`ai-button-${boardIndex}`) as HTMLButtonElement;
    if (aiButton) {
        if (board.aiHired) {
            aiButton.textContent = '🤖 AI Active';
            applyArcadeButtonStyle(aiButton, 'disabled');
            aiButton.style.color = '#00ff88';  // Green text for "completed"
            aiButton.disabled = true;
        } else if (globalPoints >= aiCost) {
            aiButton.style.display = 'block';
            applyArcadeButtonStyle(aiButton, 'green');
            aiButton.textContent = `Hire AI (${aiCost} pts)`;
            aiButton.disabled = false;
        } else {
            aiButton.style.display = 'none';
        }
    }
        // Trigger dialogue hints based on current state
    if (!board.aiHired && globalPoints >= aiCost) {
        const aiButton = document.getElementById(`ai-button-${boardIndex}`);
        showDialogue('hire-ai', aiButton);
    }
    
    if (board.aiHired && !board.aiHardDropUnlocked && globalPoints >= hardDropCost) {
        const hdButton = document.getElementById(`ai-harddrop-button-${boardIndex}`);
        showDialogue('ai-harddrop', hdButton);
    }
    
    if (board.aiHired && board.aiHardDropUnlocked && board.aiSpeedLevel < MAX_AI_SPEED_UPGRADES && globalPoints >= speedCost) {
        const speedButton = document.getElementById(`ai-speed-button-${boardIndex}`);
        showDialogue('ai-speed', speedButton);
    }
    
    if (isBoardMaxedOut(board) && boards.length < MAX_BOARDS) {
        const unlockButton = document.getElementById('unlock-next-board-button');
        showDialogue('unlock-board', unlockButton);
    }
    
    
    // AI Hard Drop Button
    const hardDropButton = document.getElementById(`ai-harddrop-button-${boardIndex}`) as HTMLButtonElement;
    if (hardDropButton) {
        if (!board.aiHired) {
            hardDropButton.style.display = 'none';
        } else if (board.aiHardDropUnlocked) {
            hardDropButton.textContent = 'AI Hard Drop ✓';
            hardDropButton.style.display = 'block';
            hardDropButton.style.backgroundColor = '#888888';
            hardDropButton.style.cursor = 'default';
            hardDropButton.disabled = true;
        } else if (globalPoints >= hardDropCost) {
            hardDropButton.style.display = 'block';
            hardDropButton.style.backgroundColor = '#FF9800';
            hardDropButton.style.cursor = 'pointer';
            hardDropButton.disabled = false;
            hardDropButton.textContent = `AI Hard Drop (${hardDropCost} pts)`;
        } else {
            hardDropButton.style.display = 'none';
        }
    }
    
    // AI Speed Button
    const speedButton = document.getElementById(`ai-speed-button-${boardIndex}`) as HTMLButtonElement;
    if (speedButton) {
        if (!board.aiHired) {
            speedButton.style.display = 'none';
        } else if (board.aiSpeedLevel >= MAX_AI_SPEED_UPGRADES) {
            speedButton.textContent = 'AI Speed MAX ✓';
            speedButton.style.display = 'block';
            speedButton.style.backgroundColor = '#888888';
            speedButton.style.cursor = 'default';
            speedButton.disabled = true;
        } else if (globalPoints >= speedCost) {
            speedButton.style.display = 'block';
            speedButton.style.backgroundColor = '#00BCD4';
            speedButton.style.cursor = 'pointer';
            speedButton.disabled = false;
            speedButton.textContent = `AI Speed Lv${board.aiSpeedLevel + 1} (${speedCost} pts)`;
        } else {
            speedButton.style.display = 'none';
        }
    }
    // Force Next Piece unlock button (available without AI)
    const forceNextPieceCost = getBoardCost(BASE_COSTS.FORCE_NEXT_PIECE_UNLOCK, boardIndex);
    const forceNextPieceButton = document.getElementById(`force-next-piece-button-${boardIndex}`) as HTMLButtonElement;
    if (forceNextPieceButton) {
        if (board.forceNextPieceUnlocked) {
            // Already unlocked - show checkmark
            forceNextPieceButton.textContent = 'Force Piece ✓';
            forceNextPieceButton.style.display = 'block';
            forceNextPieceButton.style.backgroundColor = '#888888';
            forceNextPieceButton.style.cursor = 'default';
            forceNextPieceButton.disabled = true;
        } else if (globalPoints >= forceNextPieceCost) {
            // Can afford - show button (no AI required)
            forceNextPieceButton.style.display = 'block';
            forceNextPieceButton.style.backgroundColor = '#9C27B0';
            forceNextPieceButton.style.cursor = 'pointer';
            forceNextPieceButton.disabled = false;
            forceNextPieceButton.textContent = `Force Piece (${forceNextPieceCost} pts)`;
            // Show dialogue hint when force next piece becomes affordable
            showDialogue('force-next-piece', forceNextPieceButton);
        } else {
            // Can't afford - hide button
            forceNextPieceButton.style.display = 'none';
        }
    }
    
    // Update Force Next Piece icons
    updateForceNextPieceUI(boardIndex);
    
    // Update Take Control button/counter
    updateTakeControlDisplay(boardIndex);
}

function updateControlsDisplay(): void {
    const spaceControlText = document.getElementById('space-control-text');
    if (!spaceControlText) return;
    
    if (hardDropUnlocked) {
        spaceControlText.style.color = '#00ff88';
        spaceControlText.style.textShadow = '0 0 10px rgba(0, 255, 136, 0.5)';
        spaceControlText.innerHTML = 'Space : Hard Drop ✓';
    } else {
        spaceControlText.style.opacity = '0.5';
        spaceControlText.style.color = '#aaa';
        spaceControlText.innerHTML = 'Space : Locked';
    }
}

function updateNextPiecePreview(board: Board): void {
    const previewCanvas = document.getElementById(`next-piece-canvas-${board.index}`) as HTMLCanvasElement;
    if (!previewCanvas || !board.nextPiece) return;
    
    const previewCtx = previewCanvas.getContext('2d');
    if (!previewCtx) return;
    
    previewCtx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
    previewCtx.fillStyle = '#000000';
    previewCtx.fillRect(0, 0, previewCanvas.width, previewCanvas.height);
    
    const shape = PIECES[board.nextPiece];
    const color = PIECE_COLORS[board.nextPiece];
    
    const blockSize = 20;
    const shapeWidth = shape[0].length;
    const shapeHeight = shape.length;
    
    const offsetX = (previewCanvas.width - (shapeWidth * blockSize)) / 2;
    const offsetY = (previewCanvas.height - (shapeHeight * blockSize)) / 2;
    
    for (let row = 0; row < shape.length; row++) {
        for (let col = 0; col < shape[row].length; col++) {
            if (shape[row][col]) {
                const x = offsetX + (col * blockSize);
                const y = offsetY + (row * blockSize);
                
                previewCtx.fillStyle = color;
                previewCtx.fillRect(x, y, blockSize, blockSize);
                
                previewCtx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
                previewCtx.lineWidth = 1;
                previewCtx.beginPath();
                previewCtx.moveTo(x, y + blockSize);
                previewCtx.lineTo(x, y);
                previewCtx.lineTo(x + blockSize, y);
                previewCtx.stroke();
                
                previewCtx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
                previewCtx.beginPath();
                previewCtx.moveTo(x + blockSize, y);
                previewCtx.lineTo(x + blockSize, y + blockSize);
                previewCtx.lineTo(x, y + blockSize);
                previewCtx.stroke();
            }
        }
    }
}

// =====================================================
// GAME OVER FUNCTIONS
// =====================================================

function createGameOverScreen(): void {
    const overlay = document.createElement('div');
    overlay.id = 'game-over-overlay';
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100%';
    overlay.style.height = '100%';
    overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.85)';
    overlay.style.display = 'none';
    overlay.style.justifyContent = 'center';
    overlay.style.alignItems = 'center';
    overlay.style.zIndex = '9999';
    overlay.style.opacity = '0';
    overlay.style.transition = 'opacity 0.5s ease';
    
    const panel = document.createElement('div');
    panel.style.backgroundColor = '#1a1a1a';
    panel.style.padding = '50px';
    panel.style.borderRadius = '20px';
    panel.style.boxShadow = '0 10px 40px rgba(0,0,0,0.5)';
    panel.style.textAlign = 'center';
    panel.style.maxWidth = '500px';
    panel.style.border = '3px solid #ff4444';
    
    const title = document.createElement('h1');
    title.textContent = 'GAME OVER';
    title.style.color = '#ff4444';
    title.style.fontSize = '48px';
    title.style.margin = '0 0 30px 0';
    title.style.fontFamily = 'Arial, sans-serif';
    title.style.textShadow = '2px 2px 8px rgba(255,68,68,0.5)';
    
    const stats = document.createElement('div');
    stats.id = 'game-over-stats';
    stats.style.color = 'white';
    stats.style.fontSize = '20px';
    stats.style.marginBottom = '40px';
    stats.style.lineHeight = '1.8';
    stats.innerHTML = `
        <div style="margin-bottom: 15px;">
            <span style="opacity: 0.7;">Final Score:</span>
            <span style="font-size: 32px; font-weight: bold; color: #4CAF50; margin-left: 10px;" id="final-score">0</span>
        </div>
    `;
    
    const resetButton = document.createElement('button');
    resetButton.textContent = 'PLAY AGAIN';
    resetButton.style.padding = '15px 50px';
    resetButton.style.fontSize = '20px';
    resetButton.style.fontWeight = 'bold';
    resetButton.style.backgroundColor = '#4CAF50';
    resetButton.style.color = 'white';
    resetButton.style.border = 'none';
    resetButton.style.borderRadius = '10px';
    resetButton.style.cursor = 'pointer';
    resetButton.style.boxShadow = '0 4px 6px rgba(0,0,0,0.3)';
    resetButton.style.transition = 'all 0.3s ease';
    
    resetButton.addEventListener('mouseenter', () => {
        resetButton.style.backgroundColor = '#45a049';
        resetButton.style.transform = 'scale(1.05)';
    });
    
    resetButton.addEventListener('mouseleave', () => {
        resetButton.style.backgroundColor = '#4CAF50';
        resetButton.style.transform = 'scale(1)';
    });
    
    resetButton.addEventListener('click', resetGame);
    
    panel.appendChild(title);
    panel.appendChild(stats);
    panel.appendChild(resetButton);
    overlay.appendChild(panel);
    document.body.appendChild(overlay);
}

function showGameOverScreen(): void {
    // Show name entry instead of the old game over screen
    showNameEntry();
}

function hideGameOverScreen(): void {
    const overlay = document.getElementById('game-over-overlay');
    if (!overlay) return;
    
    overlay.style.opacity = '0';
    setTimeout(() => { overlay.style.display = 'none'; }, 500);
}

function showBoardLostOverlay(board: Board): void {
    if (!board.isMinified || !board.container) return;
    
    // Check if overlay already exists
    const existingOverlay = document.getElementById(`board-lost-overlay-${board.index}`);
    if (existingOverlay) return;
    
    const overlay = document.createElement('div');
    overlay.id = `board-lost-overlay-${board.index}`;
    overlay.style.position = 'absolute';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100%';
    overlay.style.height = '100%';
    overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.85)';
    overlay.style.display = 'flex';
    overlay.style.flexDirection = 'column';
    overlay.style.justifyContent = 'center';
    overlay.style.alignItems = 'center';
    overlay.style.borderRadius = '8px';
    overlay.style.zIndex = '100';
    
    const resetCost = getResetCost(board.index);
    
    const resetButton = document.createElement('button');
    resetButton.id = `reset-board-button-${board.index}`;
    resetButton.textContent = `Reset (${resetCost})`;
    resetButton.style.padding = '8px 16px';
    resetButton.style.fontSize = '11px';
    resetButton.style.fontWeight = 'bold';
    resetButton.style.backgroundColor = globalPoints >= resetCost ? '#4CAF50' : '#888888';
    resetButton.style.color = 'white';
    resetButton.style.border = 'none';
    resetButton.style.borderRadius = '6px';
    resetButton.style.cursor = globalPoints >= resetCost ? 'pointer' : 'not-allowed';
    resetButton.disabled = globalPoints < resetCost;
    
    resetButton.addEventListener('click', () => {
        if (globalPoints >= resetCost) {
            resetBoard(board.index);
        }
    });
    
    overlay.appendChild(resetButton);
    board.container.appendChild(overlay);
}

function updateBoardLostOverlay(boardIndex: number): void {
    const board = boards[boardIndex];
    if (!board || !board.isGameOver) return;
    
    const resetButton = document.getElementById(`reset-board-button-${boardIndex}`) as HTMLButtonElement;
    if (!resetButton) return;
    
    const resetCost = getResetCost(boardIndex);
    const canAfford = globalPoints >= resetCost;
    
    resetButton.disabled = !canAfford;
    resetButton.style.backgroundColor = canAfford ? '#4CAF50' : '#888888';
    resetButton.style.cursor = canAfford ? 'pointer' : 'not-allowed';
}

function resetBoard(boardIndex: number): void {
    const board = boards[boardIndex];
    if (!board) return;
    
    const resetCost = getResetCost(boardIndex);
    if (globalPoints < resetCost) return;
    
    globalPoints -= resetCost;
    
    // Remove overlay
    const overlay = document.getElementById(`board-lost-overlay-${boardIndex}`);
    if (overlay) overlay.remove();
    
    // Reset board state
    board.grid = createEmptyGrid();
    board.currentPiece = null;
    board.nextPiece = null;
    board.isGameOver = false;
    board.lastDropTime = performance.now();
    
    // Keep AI settings (board stays maxed out)
    board.aiEnabled = true;
    board.aiTargetPosition = null;
    board.aiMoving = false;
    
    spawnNewPiece(board);
    updatePointsDisplay();
    
    console.log(`Board ${boardIndex + 1} reset!`);
}

function autoResetBoard(boardIndex: number): void {
    const board = boards[boardIndex];
    if (!board) return;
    
    // Reset board state without costing any points
    board.grid = createEmptyGrid();
    board.currentPiece = null;
    board.nextPiece = null;
    board.isGameOver = false;
    board.lastDropTime = performance.now();
    
    // Keep AI settings (board stays maxed out)
    board.aiEnabled = true;
    board.aiTargetPosition = null;
    board.aiMoving = false;
    
    spawnNewPiece(board);
    
    console.log(`Board ${boardIndex + 1} auto-reset!`);
}

function resetGame(): void {
    hideGameOverScreen();
    
    // Reset global state
    isGameOver = false;
    isPaused = false;
    globalPoints = 0;
    globalLinesCleared = 0;
    hardDropUnlocked = false;
    
    // Clear all boards completely
    boards = [];
    activeBoardIndex = 0;
    
    // Clear mini board slots (keep column visible, just clear contents)
    const miniBoardsColumn = document.getElementById('mini-boards-column');
    if (miniBoardsColumn) {
        // Don't hide the column - keep slots visible with locks
        for (let i = 0; i < 6; i++) {
            const slot = document.getElementById(`mini-board-slot-${i}`);
            if (slot) {
                slot.innerHTML = '';
                slot.style.backgroundColor = 'rgba(13, 13, 26, 0.9)';
                slot.style.border = '2px dashed rgba(0, 212, 255, 0.2)';
                slot.style.boxShadow = 'inset 0 0 20px rgba(0, 0, 0, 0.5)';
                
                // Recreate lock overlay
                const lockOverlay = document.createElement('div');
                lockOverlay.id = `slot-lock-${i}`;
                lockOverlay.style.position = 'absolute';
                lockOverlay.style.top = '0';
                lockOverlay.style.left = '0';
                lockOverlay.style.width = '100%';
                lockOverlay.style.height = '100%';
                lockOverlay.style.display = 'flex';
                lockOverlay.style.flexDirection = 'column';
                lockOverlay.style.justifyContent = 'center';
                lockOverlay.style.alignItems = 'center';
                lockOverlay.style.borderRadius = '6px';
                
                const lockIcon = document.createElement('div');
                lockIcon.className = 'lock-icon';
                lockIcon.textContent = '🔒';
                lockIcon.style.fontSize = '20px';
                lockIcon.style.marginBottom = '8px';
                lockIcon.style.opacity = '0.5';
                
                const boardLabel = document.createElement('div');
                boardLabel.className = 'board-label';
                boardLabel.textContent = `BOARD ${i + 2}`;
                boardLabel.style.fontSize = '8px';
                boardLabel.style.fontFamily = "'Press Start 2P', cursive";
                boardLabel.style.color = 'rgba(255, 255, 255, 0.4)';
                boardLabel.style.marginBottom = '4px';
                
                const unlockCost = document.createElement('div');
                unlockCost.className = 'unlock-cost';
                const cost = Math.round(BASE_COSTS.UNLOCK_NEXT_BOARD * Math.pow(COST_MULTIPLIER, i));
                unlockCost.textContent = `${cost} PTS`;
                unlockCost.style.fontSize = '7px';
                unlockCost.style.fontFamily = "'Press Start 2P', cursive";
                unlockCost.style.color = 'rgba(255, 255, 255, 0.3)';
                unlockCost.style.marginTop = '2px';
                
                lockOverlay.appendChild(lockIcon);
                lockOverlay.appendChild(boardLabel);
                lockOverlay.appendChild(unlockCost);
                slot.appendChild(lockOverlay);
            }
        }
    }
    
    // Remove any existing board containers and recreate board 0
    const activeBoardContainer = document.getElementById('active-board-container');
    if (activeBoardContainer) {
        activeBoardContainer.innerHTML = '';
        
        // Recreate board 0 container
        const board0Container = document.createElement('div');
        board0Container.id = 'board-0-container';
        board0Container.style.display = 'flex';
        board0Container.style.gap = '20px';
        board0Container.style.position = 'relative';
        
        // Move canvas back to board 0
        board0Container.appendChild(canvas);
        activeBoardContainer.appendChild(board0Container);
    }
    
    // Create fresh board 0
    const board0 = createBoard(0);
    board0.canvas = canvas;
    boards.push(board0);
    
    // Clear the canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Recreate UI for board 0
    createBoardUI(0);
    
    // Start the game
    spawnNewPiece(board0);
    board0.lastDropTime = performance.now();
    
    // Update all displays
    updatePointsDisplay();
    updateGlobalHardDropButton();
    updateUnlockNextBoardButton();
    updatePrestigeButton();
    updateBoardButtons(0);
    updateControlsDisplay();
    updateStarsDisplay();
    
    // Show welcome dialogue for new players
    if (tutorialsEnabled && !shownDialogues.has('welcome')) {
        showDialogue('welcome', null);
    }
    
    console.log("Game reset!");
}

// =====================================================
// LEADERBOARD SYSTEM
// =====================================================

// Get the first day of current month in Pacific Time
function getMonthStartPacific(): string {
    const now = new Date();
    // Convert to Pacific Time
    const pacificTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }));
    const year = pacificTime.getFullYear();
    const month = pacificTime.getMonth();
    // First day of month at midnight Pacific
    const firstDay = new Date(year, month, 1, 0, 0, 0);
    return firstDay.toISOString();
}

// Fetch top 10 scores for current month
async function fetchLeaderboard(): Promise<{ name: string; score: number; created_at: string }[]> {
    const monthStart = getMonthStartPacific();
    
    const response = await fetch(
        `${SUPABASE_URL}/rest/v1/leaderboard?select=name,score,created_at&created_at=gte.${monthStart}&order=score.desc&limit=10`,
        {
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
            }
        }
    );
    
    if (!response.ok) {
        console.error('Failed to fetch leaderboard');
        return [];
    }
    
    return await response.json();
}

// Submit a score to the leaderboard
async function submitScore(name: string, score: number): Promise<boolean> {
    const response = await fetch(
        `${SUPABASE_URL}/rest/v1/leaderboard`,
        {
            method: 'POST',
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=minimal'
            },
            body: JSON.stringify({
                name: name.toUpperCase(),
                score: score
            })
        }
    );
    
    if (!response.ok) {
        console.error('Failed to submit score');
        return false;
    }
    
    console.log(`Score submitted: ${name} - ${score}`);
    return true;
}

// Show the leaderboard modal
async function showLeaderboardModal(startNewGameOnClose: boolean): Promise<void> {
    // Remove existing modal if any
    const existingModal = document.getElementById('leaderboard-overlay');
    if (existingModal) existingModal.remove();
    
    // Create overlay
    const overlay = document.createElement('div');
    overlay.id = 'leaderboard-overlay';
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100%';
    overlay.style.height = '100%';
    overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.9)';
    overlay.style.display = 'flex';
    overlay.style.justifyContent = 'center';
    overlay.style.alignItems = 'center';
    overlay.style.zIndex = '10000';
    
    // Create modal with retro arcade styling
    const modal = document.createElement('div');
    modal.style.backgroundColor = '#0d0d1a';
    modal.style.border = '3px solid #ffd700';
    modal.style.borderRadius = '8px';
    modal.style.padding = '30px 40px';
    modal.style.minWidth = '380px';
    modal.style.color = 'white';
    modal.style.fontFamily = "'Press Start 2P', cursive";
    modal.style.textAlign = 'center';
    modal.style.boxShadow = '0 0 30px rgba(255, 215, 0, 0.3), 0 0 60px rgba(255, 215, 0, 0.1), inset 0 0 30px rgba(0, 0, 0, 0.5)';
    
    // Title
    const title = document.createElement('h2');
    title.textContent = '🏆 LEADERBOARD 🏆';
    title.style.margin = '0 0 10px 0';
    title.style.color = '#ffd700';
    title.style.fontSize = '16px';
    title.style.textShadow = '0 0 10px rgba(255, 215, 0, 0.5)';
    modal.appendChild(title);
    
    // Month indicator
    const monthNames = ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE',
                        'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'];
    const now = new Date();
    const monthLabel = document.createElement('div');
    monthLabel.textContent = `${monthNames[now.getMonth()]} ${now.getFullYear()}`;
    monthLabel.style.color = '#00d4ff';
    monthLabel.style.fontSize = '10px';
    monthLabel.style.marginBottom = '20px';
    monthLabel.style.textShadow = '0 0 10px rgba(0, 212, 255, 0.5)';
    modal.appendChild(monthLabel);
    
    // Loading indicator
    const loadingText = document.createElement('div');
    loadingText.textContent = 'LOADING...';
    loadingText.style.color = '#888';
    loadingText.style.padding = '20px';
    loadingText.style.fontSize = '10px';
    modal.appendChild(loadingText);
    
    // Close instruction
    const closeHint = document.createElement('div');
    closeHint.textContent = startNewGameOnClose ? 'CLICK TO PLAY AGAIN' : 'CLICK TO CLOSE';
    closeHint.style.marginTop = '20px';
    closeHint.style.color = '#666';
    closeHint.style.fontSize = '8px';
    modal.appendChild(closeHint);
    
    // Close on click
    overlay.addEventListener('click', () => {
        overlay.remove();
        if (startNewGameOnClose) {
            resetGameSkipWelcome();
        }
    });
    
    // Prevent modal clicks from closing
    modal.addEventListener('click', (e) => e.stopPropagation());
    
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    
    // Fetch and display leaderboard
    const scores = await fetchLeaderboard();
    
    // Remove loading text
    loadingText.remove();
    
    // Create leaderboard table
    const table = document.createElement('div');
    table.style.textAlign = 'left';
    
    if (scores.length === 0) {
        const noScores = document.createElement('div');
        noScores.textContent = 'NO SCORES YET. BE THE FIRST!';
        noScores.style.color = '#00d4ff';
        noScores.style.padding = '20px';
        noScores.style.textAlign = 'center';
        noScores.style.fontSize = '10px';
        noScores.style.textShadow = '0 0 10px rgba(0, 212, 255, 0.5)';
        table.appendChild(noScores);
    } else {
        scores.forEach((entry, index) => {
            const row = document.createElement('div');
            row.style.display = 'flex';
            row.style.justifyContent = 'space-between';
            row.style.alignItems = 'center';
            row.style.padding = '12px 15px';
            row.style.borderRadius = '4px';
            row.style.marginBottom = '6px';
            
            // Highlight top 3 with neon glow
            if (index === 0) {
                row.style.backgroundColor = 'rgba(255, 215, 0, 0.15)';
                row.style.border = '1px solid #ffd700';
                row.style.boxShadow = '0 0 10px rgba(255, 215, 0, 0.3)';
            } else if (index === 1) {
                row.style.backgroundColor = 'rgba(192, 192, 192, 0.15)';
                row.style.border = '1px solid #c0c0c0';
                row.style.boxShadow = '0 0 10px rgba(192, 192, 192, 0.2)';
            } else if (index === 2) {
                row.style.backgroundColor = 'rgba(205, 127, 50, 0.15)';
                row.style.border = '1px solid #cd7f32';
                row.style.boxShadow = '0 0 10px rgba(205, 127, 50, 0.2)';
            } else {
                row.style.backgroundColor = 'rgba(255, 255, 255, 0.03)';
                row.style.border = '1px solid rgba(255, 255, 255, 0.1)';
            }
            
            // Rank
            const rank = document.createElement('span');
            rank.style.width = '30px';
            rank.style.fontSize = '12px';
            if (index === 0) rank.textContent = '🥇';
            else if (index === 1) rank.textContent = '🥈';
            else if (index === 2) rank.textContent = '🥉';
            else rank.textContent = `${index + 1}.`;
            rank.style.color = index < 3 ? '#ffd700' : '#666';
            
            // Name
            const name = document.createElement('span');
            name.textContent = entry.name;
            name.style.fontSize = '12px';
            name.style.letterSpacing = '3px';
            name.style.flex = '1';
            name.style.marginLeft = '10px';
            name.style.color = '#e8e8e8';
            
            // Score
            const score = document.createElement('span');
            score.textContent = entry.score.toLocaleString();
            score.style.color = '#00ff88';
            score.style.fontSize = '12px';
            score.style.textShadow = '0 0 10px rgba(0, 255, 136, 0.5)';
            
            row.appendChild(rank);
            row.appendChild(name);
            row.appendChild(score);
            table.appendChild(row);
        });
    }
    
    // Insert table before close hint
    modal.insertBefore(table, closeHint);
}

// Show arcade-style name entry
function showNameEntry(): void {
    // Remove existing modal if any
    const existingModal = document.getElementById('name-entry-overlay');
    if (existingModal) existingModal.remove();
    
    // Create overlay
    const overlay = document.createElement('div');
    overlay.id = 'name-entry-overlay';
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100%';
    overlay.style.height = '100%';
    overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.9)';
    overlay.style.display = 'flex';
    overlay.style.justifyContent = 'center';
    overlay.style.alignItems = 'center';
    overlay.style.zIndex = '10000';
    
    // Create modal with retro arcade styling matching the leaderboard
    const modal = document.createElement('div');
    modal.style.backgroundColor = '#0d0d1a';
    modal.style.border = '3px solid #ff4444';
    modal.style.borderRadius = '8px';
    modal.style.padding = '30px 40px';
    modal.style.minWidth = '380px';
    modal.style.color = 'white';
    modal.style.fontFamily = "'Press Start 2P', cursive";
    modal.style.textAlign = 'center';
    modal.style.boxShadow = '0 0 30px rgba(255, 68, 68, 0.3), 0 0 60px rgba(255, 68, 68, 0.1), inset 0 0 30px rgba(0, 0, 0, 0.5)';
    
    // Game Over title with neon glow effect
    const title = document.createElement('h1');
    title.textContent = 'GAME OVER';
    title.style.margin = '0 0 10px 0';
    title.style.color = '#ff4444';
    title.style.fontSize = '20px';
    title.style.textShadow = '0 0 10px rgba(255, 68, 68, 0.5), 0 0 20px rgba(255, 68, 68, 0.3)';
    modal.appendChild(title);
    
    // Score display with retro arcade styling
    const scoreDisplay = document.createElement('div');
    scoreDisplay.style.marginBottom = '25px';
    scoreDisplay.innerHTML = `
        <div style="color: #888; font-size: 10px; margin-bottom: 8px;">YOUR SCORE</div>
        <div style="color: #00ff88; font-size: 28px; text-shadow: 0 0 10px rgba(0, 255, 136, 0.5);">${globalLinesCleared.toLocaleString()}</div>
    `;
    modal.appendChild(scoreDisplay);
    
    // Enter initials prompt with gold arcade styling
    const prompt = document.createElement('div');
    prompt.textContent = 'ENTER YOUR INITIALS';
    prompt.style.color = '#ffd700';
    prompt.style.fontSize = '10px';
    prompt.style.marginBottom = '20px';
    prompt.style.textShadow = '0 0 10px rgba(255, 215, 0, 0.5)';
    modal.appendChild(prompt);
    
    // Current selection state
    let currentInitials = ['A', 'A', 'A'];
    //let currentPosition = 0;
    
    // Initials display container
    const initialsContainer = document.createElement('div');
    initialsContainer.style.display = 'flex';
    initialsContainer.style.justifyContent = 'center';
    initialsContainer.style.gap = '15px';
    initialsContainer.style.marginBottom = '30px';
    
    // Create 3 letter selectors
    const letterDisplays: HTMLDivElement[] = [];
    
    for (let i = 0; i < 3; i++) {
        const letterBox = document.createElement('div');
        letterBox.style.display = 'flex';
        letterBox.style.flexDirection = 'column';
        letterBox.style.alignItems = 'center';
        
        // Up arrow with retro arcade styling
        const upArrow = document.createElement('button');
        upArrow.textContent = '▲';
        upArrow.style.backgroundColor = 'transparent';
        upArrow.style.border = 'none';
        upArrow.style.color = '#00ff88';
        upArrow.style.fontSize = '20px';
        upArrow.style.cursor = 'pointer';
        upArrow.style.padding = '5px 15px';
        upArrow.style.textShadow = '0 0 10px rgba(0, 255, 136, 0.5)';
        upArrow.style.transition = 'all 0.15s ease';
        upArrow.addEventListener('mouseenter', () => { upArrow.style.transform = 'scale(1.2)'; });
        upArrow.addEventListener('mouseleave', () => { upArrow.style.transform = 'scale(1)'; });
        upArrow.addEventListener('click', () => {
            const charCode = currentInitials[i].charCodeAt(0);
            currentInitials[i] = charCode >= 90 ? 'A' : String.fromCharCode(charCode + 1);
            letterDisplays[i].textContent = currentInitials[i];
        });
        
        // Letter display with retro arcade styling
        const letterDisplay = document.createElement('div');
        letterDisplay.textContent = currentInitials[i];
        letterDisplay.style.width = '50px';
        letterDisplay.style.height = '60px';
        letterDisplay.style.backgroundColor = '#1a1a2e';
        letterDisplay.style.border = '2px solid #00ff88';
        letterDisplay.style.borderRadius = '6px';
        letterDisplay.style.display = 'flex';
        letterDisplay.style.justifyContent = 'center';
        letterDisplay.style.alignItems = 'center';
        letterDisplay.style.fontSize = '28px';
        letterDisplay.style.fontFamily = "'Press Start 2P', cursive";
        letterDisplay.style.color = '#00ff88';
        letterDisplay.style.textShadow = '0 0 10px rgba(0, 255, 136, 0.5)';
        letterDisplay.style.boxShadow = '0 0 15px rgba(0, 255, 136, 0.2), inset 0 0 20px rgba(0, 0, 0, 0.5)';
        letterDisplays.push(letterDisplay);
        
        // Down arrow with retro arcade styling
        const downArrow = document.createElement('button');
        downArrow.textContent = '▼';
        downArrow.style.backgroundColor = 'transparent';
        downArrow.style.border = 'none';
        downArrow.style.color = '#00ff88';
        downArrow.style.fontSize = '20px';
        downArrow.style.cursor = 'pointer';
        downArrow.style.padding = '5px 15px';
        downArrow.style.textShadow = '0 0 10px rgba(0, 255, 136, 0.5)';
        downArrow.style.transition = 'all 0.15s ease';
        downArrow.addEventListener('mouseenter', () => { downArrow.style.transform = 'scale(1.2)'; });
        downArrow.addEventListener('mouseleave', () => { downArrow.style.transform = 'scale(1)'; });
        downArrow.addEventListener('click', () => {
            const charCode = currentInitials[i].charCodeAt(0);
            currentInitials[i] = charCode <= 65 ? 'Z' : String.fromCharCode(charCode - 1);
            letterDisplays[i].textContent = currentInitials[i];
        });
        
        letterBox.appendChild(upArrow);
        letterBox.appendChild(letterDisplay);
        letterBox.appendChild(downArrow);
        initialsContainer.appendChild(letterBox);
    }
    
    modal.appendChild(initialsContainer);
    
    // Submit button with retro arcade 3D styling
    const submitButton = document.createElement('button');
    submitButton.textContent = 'SUBMIT SCORE';
    submitButton.style.padding = '12px 30px';
    submitButton.style.fontSize = '10px';
    submitButton.style.fontFamily = "'Press Start 2P', cursive";
    submitButton.style.background = 'linear-gradient(180deg, #00ff88 0%, #00cc6a 100%)';
    submitButton.style.color = '#000';
    submitButton.style.border = 'none';
    submitButton.style.borderRadius = '4px';
    submitButton.style.cursor = 'pointer';
    submitButton.style.boxShadow = '0 4px 0 #009950, 0 0 15px rgba(0, 255, 136, 0.4)';
    submitButton.style.transition = 'all 0.15s ease';
    
    submitButton.addEventListener('mouseenter', () => {
        submitButton.style.transform = 'translateY(-2px)';
        submitButton.style.boxShadow = '0 6px 0 #009950, 0 0 25px rgba(0, 255, 136, 0.6)';
    });
    
    submitButton.addEventListener('mouseleave', () => {
        submitButton.style.transform = 'translateY(0)';
        submitButton.style.boxShadow = '0 4px 0 #009950, 0 0 15px rgba(0, 255, 136, 0.4)';
    });
    
    submitButton.addEventListener('click', async () => {
        const name = currentInitials.join('');
        submitButton.textContent = 'SUBMITTING...';
        submitButton.disabled = true;
        
        await submitScore(name, globalLinesCleared);
        
        // Remove name entry and show leaderboard
        overlay.remove();
        showLeaderboardModal(true);
    });
    
    modal.appendChild(submitButton);
    
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
}

// Reset game but skip welcome dialogue
function resetGameSkipWelcome(): void {
    hideGameOverScreen();
    
    // Reset global state
    isGameOver = false;
    isPaused = false;
    globalPoints = 0;
    globalLinesCleared = 0;
    hardDropUnlocked = false;
    
    // Clear all boards completely
    boards = [];
    activeBoardIndex = 0;
    
    // Clear mini board slots (keep column visible, just clear contents)
    const miniBoardsColumn = document.getElementById('mini-boards-column');
    if (miniBoardsColumn) {
        // Don't hide the column - keep slots visible with locks
        for (let i = 0; i < 6; i++) {
            const slot = document.getElementById(`mini-board-slot-${i}`);
            if (slot) {
                slot.innerHTML = '';
                slot.style.backgroundColor = 'rgba(13, 13, 26, 0.9)';
                slot.style.border = '2px dashed rgba(0, 212, 255, 0.2)';
                slot.style.boxShadow = 'inset 0 0 20px rgba(0, 0, 0, 0.5)';
                
                // Recreate lock overlay
                const lockOverlay = document.createElement('div');
                lockOverlay.id = `slot-lock-${i}`;
                lockOverlay.style.position = 'absolute';
                lockOverlay.style.top = '0';
                lockOverlay.style.left = '0';
                lockOverlay.style.width = '100%';
                lockOverlay.style.height = '100%';
                lockOverlay.style.display = 'flex';
                lockOverlay.style.flexDirection = 'column';
                lockOverlay.style.justifyContent = 'center';
                lockOverlay.style.alignItems = 'center';
                lockOverlay.style.borderRadius = '6px';
                
                const lockIcon = document.createElement('div');
                lockIcon.className = 'lock-icon';
                lockIcon.textContent = '🔒';
                lockIcon.style.fontSize = '20px';
                lockIcon.style.marginBottom = '8px';
                lockIcon.style.opacity = '0.5';
                
                const boardLabel = document.createElement('div');
                boardLabel.className = 'board-label';
                boardLabel.textContent = `BOARD ${i + 2}`;
                boardLabel.style.fontSize = '8px';
                boardLabel.style.fontFamily = "'Press Start 2P', cursive";
                boardLabel.style.color = 'rgba(255, 255, 255, 0.4)';
                boardLabel.style.marginBottom = '4px';
                
                const unlockCost = document.createElement('div');
                unlockCost.className = 'unlock-cost';
                const cost = Math.round(BASE_COSTS.UNLOCK_NEXT_BOARD * Math.pow(COST_MULTIPLIER, i));
                unlockCost.textContent = `${cost} PTS`;
                unlockCost.style.fontSize = '7px';
                unlockCost.style.fontFamily = "'Press Start 2P', cursive";
                unlockCost.style.color = 'rgba(255, 255, 255, 0.3)';
                unlockCost.style.marginTop = '2px';
                
                lockOverlay.appendChild(lockIcon);
                lockOverlay.appendChild(boardLabel);
                lockOverlay.appendChild(unlockCost);
                slot.appendChild(lockOverlay);
            }
        }
    }
    
    // Remove any existing board containers and recreate board 0
    const activeBoardContainer = document.getElementById('active-board-container');
    if (activeBoardContainer) {
        activeBoardContainer.innerHTML = '';
        
        const board0Container = document.createElement('div');
        board0Container.id = 'board-0-container';
        board0Container.style.display = 'flex';
        board0Container.style.gap = '20px';
        board0Container.style.position = 'relative';
        
        board0Container.appendChild(canvas);
        activeBoardContainer.appendChild(board0Container);
    }
    
    // Create fresh board 0
    const board0 = createBoard(0);
    board0.canvas = canvas;
    boards.push(board0);
    
    // Clear the canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Recreate UI for board 0
    createBoardUI(0);
    
    // Start the game
    spawnNewPiece(board0);
    board0.lastDropTime = performance.now();
    
    // Update all displays
    updatePointsDisplay();
    updateGlobalHardDropButton();
    updateUnlockNextBoardButton();
    updatePrestigeButton();
    updateBoardButtons(0);
    updateControlsDisplay();
    updateStarsDisplay();
    
    // Skip welcome dialogue - go straight to playing
    console.log("Game reset (welcome skipped)!");
}

// =====================================================
// DIALOGUE SYSTEM
// =====================================================

function createDialogueSystem(): void {
    // Dark overlay behind dialogue
    const overlay = document.createElement('div');
    overlay.id = 'dialogue-overlay';
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100%';
    overlay.style.height = '100%';
    overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.85)';
    overlay.style.display = 'none';
    overlay.style.zIndex = '2000';
    overlay.style.cursor = 'pointer';
    
    // Dialogue box with retro arcade styling
    const dialogueBox = document.createElement('div');
    dialogueBox.id = 'dialogue-box';
    dialogueBox.style.position = 'absolute';
    dialogueBox.style.backgroundColor = '#0d0d1a';
    dialogueBox.style.border = '3px solid #00ff88';
    dialogueBox.style.borderRadius = '8px';
    dialogueBox.style.padding = '24px';
    dialogueBox.style.minWidth = '320px';
    dialogueBox.style.maxWidth = '420px';
    dialogueBox.style.boxShadow = '0 0 30px rgba(0, 255, 136, 0.3), 0 0 60px rgba(0, 255, 136, 0.1), inset 0 0 30px rgba(0, 0, 0, 0.5)';
    dialogueBox.style.display = 'none';
    dialogueBox.style.zIndex = '2001';
    
    // Title with retro font
    const title = document.createElement('h3');
    title.id = 'dialogue-title';
    title.style.margin = '0 0 16px 0';
    title.style.color = '#00ff88';
    title.style.fontSize = '14px';
    title.style.fontFamily = "'Press Start 2P', cursive";
    title.style.textShadow = '0 0 10px rgba(0, 255, 136, 0.5)';
    title.style.lineHeight = '1.4';
    
    // Description text with retro font
    const description = document.createElement('p');
    description.id = 'dialogue-description';
    description.style.margin = '0 0 20px 0';
    description.style.color = '#e8e8e8';
    description.style.fontSize = '9px';
    description.style.fontFamily = "'Press Start 2P', cursive";
    description.style.lineHeight = '2';
    
    // Hint text at bottom
    const hint = document.createElement('div');
    hint.style.fontSize = '10px';
    hint.style.fontFamily = "'Press Start 2P', cursive";
    hint.style.color = '#666';
    hint.style.textAlign = 'center';
    hint.style.paddingTop = '12px';
    hint.style.borderTop = '1px solid rgba(255, 255, 255, 0.1)';
    hint.textContent = 'CLICK TO CONTINUE';
    
    dialogueBox.appendChild(title);
    dialogueBox.appendChild(description);
    dialogueBox.appendChild(hint);
    
    overlay.addEventListener('click', closeCurrentDialogue);
    
    document.body.appendChild(overlay);
    document.body.appendChild(dialogueBox);
}

function showDialogue(dialogueId: string, targetElement: HTMLElement | null): void {
    // Track that this dialogue has been unlocked (for help menu)
    shownDialogues.add(dialogueId);
    
    // Skip if tutorials are disabled
    if (!tutorialsEnabled) return;
    
    // Skip if this dialogue has already been shown this session
    if (displayedDialogues.has(dialogueId)) return;
    
    // Skip if dialogue content doesn't exist
    const content = DIALOGUE_CONTENT[dialogueId];
    if (!content) return;
    
    // Mark as displayed BEFORE queuing to prevent duplicate queue entries
    displayedDialogues.add(dialogueId);
    
    // If another dialogue is showing, queue this one for later
    if (currentDialogue) {
        dialogueQueue.push(dialogueId);
        return;
    }
    
    const overlay = document.getElementById('dialogue-overlay');
    const box = document.getElementById('dialogue-box');
    const titleEl = document.getElementById('dialogue-title');
    const descEl = document.getElementById('dialogue-description');
    
    if (!overlay || !box || !titleEl || !descEl) return;
    
    isPaused = true;
    currentDialogue = dialogueId;
    document.body.classList.add('noscroll');
    
    titleEl.textContent = content.title;
    descEl.textContent = content.description;
    
    overlay.style.display = 'block';
    
    if (targetElement) {
        const rect = targetElement.getBoundingClientRect();
        box.style.display = 'block';
        box.style.left = (rect.left - 420) + 'px';
        box.style.top = (rect.top + rect.height / 2 - 50) + 'px';
        
        const boxRect = box.getBoundingClientRect();
        if (boxRect.left < 20) box.style.left = '20px';
        if (boxRect.top < 140) box.style.top = '140px';
    } else {
        box.style.display = 'block';
        box.style.left = '50%';
        box.style.top = '30%';
        box.style.transform = 'translate(-50%, -50%)';
    }
}

function closeCurrentDialogue(): void {
    const overlay = document.getElementById('dialogue-overlay');
    const box = document.getElementById('dialogue-box');
    
    if (!overlay || !box) return;
    
    overlay.style.display = 'none';
    box.style.display = 'none';
    box.style.transform = '';
    
    currentDialogue = null;
    
    // Clear the queue and unpause - don't chain dialogues back-to-back
    // This prevents the game from feeling stuck when multiple upgrades unlock at once
    dialogueQueue.length = 0;
    isPaused = false;
    document.body.classList.remove('noscroll');
}

function addTutorialControls(): void {
    const controlsSection = document.getElementById('global-controls-section');
    if (!controlsSection) return;
    
    const tutorialControls = document.createElement('div');
    tutorialControls.style.marginTop = '6px';
    tutorialControls.style.display = 'flex';
    tutorialControls.style.alignItems = 'center';
    tutorialControls.style.justifyContent = 'center';
    tutorialControls.style.gap = '8px';
    
    // Custom styled checkbox - wrapper is clickable
    const checkboxWrapper = document.createElement('div');
    checkboxWrapper.style.position = 'relative';
    checkboxWrapper.style.width = '16px';
    checkboxWrapper.style.height = '16px';
    checkboxWrapper.style.cursor = 'pointer';
    
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = 'tutorial-toggle';
    checkbox.checked = tutorialsEnabled;
    checkbox.style.position = 'absolute';
    checkbox.style.opacity = '0';
    checkbox.style.cursor = 'pointer';
    checkbox.style.width = '100%';
    checkbox.style.height = '100%';
    checkbox.style.margin = '0';
    checkbox.style.zIndex = '1';
    
    const checkboxVisual = document.createElement('div');
    checkboxVisual.style.width = '14px';
    checkboxVisual.style.height = '14px';
    checkboxVisual.style.border = '2px solid #00ff88';
    checkboxVisual.style.borderRadius = '3px';
    checkboxVisual.style.backgroundColor = tutorialsEnabled ? '#00ff88' : 'transparent';
    checkboxVisual.style.display = 'flex';
    checkboxVisual.style.alignItems = 'center';
    checkboxVisual.style.justifyContent = 'center';
    checkboxVisual.style.transition = 'all 0.15s ease';
    checkboxVisual.style.boxShadow = tutorialsEnabled ? '0 0 8px rgba(0, 255, 136, 0.5)' : 'none';
    checkboxVisual.style.pointerEvents = 'none';
    checkboxVisual.innerHTML = tutorialsEnabled ? '<span style="color: #000; font-size: 10px;">✓</span>' : '';
    
    // Update visual when checkbox changes
    const updateCheckboxVisual = () => {
        checkboxVisual.style.backgroundColor = tutorialsEnabled ? '#00ff88' : 'transparent';
        checkboxVisual.style.boxShadow = tutorialsEnabled ? '0 0 8px rgba(0, 255, 136, 0.5)' : 'none';
        checkboxVisual.innerHTML = tutorialsEnabled ? '<span style="color: #000; font-size: 10px;">✓</span>' : '';
    };
    
    checkbox.addEventListener('change', () => {
        tutorialsEnabled = checkbox.checked;
        updateCheckboxVisual();
    });
    
    // Also toggle when clicking the visual wrapper
    checkboxWrapper.addEventListener('click', () => {
        checkbox.checked = !checkbox.checked;
        tutorialsEnabled = checkbox.checked;
        updateCheckboxVisual();
    });
    
    checkboxWrapper.appendChild(checkboxVisual);
    checkboxWrapper.appendChild(checkbox);
    
    const label = document.createElement('label');
    label.htmlFor = 'tutorial-toggle';
    label.textContent = 'TIPS';
    label.style.fontSize = '8px';
    label.style.fontFamily = "'Press Start 2P', cursive";
    label.style.color = '#888';
    label.style.cursor = 'pointer';
    
    tutorialControls.appendChild(checkboxWrapper);
    tutorialControls.appendChild(label);
    
    // Help button (question mark) with retro styling
    const helpButton = document.createElement('button');
    helpButton.id = 'help-button';
    helpButton.textContent = '?';
    helpButton.title = 'View all tutorials';
    helpButton.style.width = '22px';
    helpButton.style.height = '22px';
    helpButton.style.borderRadius = '50%';
    helpButton.style.border = '2px solid #00ff88';
    helpButton.style.backgroundColor = 'transparent';
    helpButton.style.color = '#00ff88';
    helpButton.style.fontSize = '12px';
    helpButton.style.fontFamily = "'Press Start 2P', cursive";
    helpButton.style.cursor = 'pointer';
    helpButton.style.transition = 'all 0.15s ease';
    helpButton.style.boxShadow = '0 0 8px rgba(0, 255, 136, 0.3)';
    helpButton.style.marginLeft = '4px';
    
    helpButton.addEventListener('mouseenter', () => {
        helpButton.style.backgroundColor = '#00ff88';
        helpButton.style.color = '#000';
        helpButton.style.boxShadow = '0 0 15px rgba(0, 255, 136, 0.6)';
    });
    
    helpButton.addEventListener('mouseleave', () => {
        helpButton.style.backgroundColor = 'transparent';
        helpButton.style.color = '#00ff88';
        helpButton.style.boxShadow = '0 0 8px rgba(0, 255, 136, 0.3)';
    });
    
    helpButton.addEventListener('click', showHelpModal);
    
    tutorialControls.appendChild(helpButton);
    controlsSection.appendChild(tutorialControls);
}

// Show all unlocked dialogues in a modal with retro arcade styling
function showHelpModal(): void {
    // Remove existing modal if any
    const existingModal = document.getElementById('help-modal-overlay');
    if (existingModal) existingModal.remove();
    
    // Create overlay
    const overlay = document.createElement('div');
    overlay.id = 'help-modal-overlay';
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100%';
    overlay.style.height = '100%';
    overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.85)';
    overlay.style.display = 'flex';
    overlay.style.justifyContent = 'center';
    overlay.style.alignItems = 'center';
    overlay.style.zIndex = '3000';
    
    // Create modal box with retro styling
    const modal = document.createElement('div');
    modal.style.backgroundColor = '#0d0d1a';
    modal.style.border = '3px solid #00ff88';
    modal.style.borderRadius = '8px';
    modal.style.padding = '24px';
    modal.style.maxWidth = '500px';
    modal.style.maxHeight = '80vh';
    modal.style.overflowY = 'auto';
    modal.style.color = 'white';
    modal.style.fontFamily = "'Press Start 2P', cursive";
    modal.style.boxShadow = '0 0 30px rgba(0, 255, 136, 0.3), 0 0 60px rgba(0, 255, 136, 0.1), inset 0 0 30px rgba(0, 0, 0, 0.5)';
    
    // Title
    const title = document.createElement('h2');
    title.textContent = 'GAME HELP';
    title.style.margin = '0 0 20px 0';
    title.style.color = '#00ff88';
    title.style.textAlign = 'center';
    title.style.fontSize = '16px';
    title.style.textShadow = '0 0 10px rgba(0, 255, 136, 0.5)';
    modal.appendChild(title);
    
    // Get all unlocked dialogues (from shownDialogues set)
    const unlockedDialogues = Array.from(shownDialogues);
    
    if (unlockedDialogues.length === 0) {
        const noContent = document.createElement('p');
        noContent.textContent = 'NO TIPS UNLOCKED YET. KEEP PLAYING!';
        noContent.style.textAlign = 'center';
        noContent.style.color = '#666';
        noContent.style.fontSize = '8px';
        noContent.style.lineHeight = '2';
        modal.appendChild(noContent);
    } else {
        // Show each unlocked dialogue
        unlockedDialogues.forEach(dialogueId => {
            const content = DIALOGUE_CONTENT[dialogueId];
            if (!content) return;
            
            const entry = document.createElement('div');
            entry.style.marginBottom = '16px';
            entry.style.padding = '14px';
            entry.style.backgroundColor = 'rgba(0, 255, 136, 0.05)';
            entry.style.borderRadius = '6px';
            entry.style.borderLeft = '3px solid #00ff88';
            
            const entryTitle = document.createElement('div');
            entryTitle.textContent = content.title.toUpperCase();
            entryTitle.style.marginBottom = '10px';
            entryTitle.style.color = '#00ff88';
            entryTitle.style.fontSize = '10px';
            entryTitle.style.textShadow = '0 0 8px rgba(0, 255, 136, 0.4)';
            
            const entryDesc = document.createElement('div');
            entryDesc.textContent = content.description;
            entryDesc.style.fontSize = '8px';
            entryDesc.style.color = '#ccc';
            entryDesc.style.lineHeight = '2';
            
            entry.appendChild(entryTitle);
            entry.appendChild(entryDesc);
            modal.appendChild(entry);
        });
    }
    
    // Close button with arcade styling
    const closeButton = document.createElement('button');
    closeButton.textContent = 'CLOSE';
    closeButton.style.display = 'block';
    closeButton.style.margin = '20px auto 0';
    closeButton.style.padding = '12px 30px';
    closeButton.style.background = 'linear-gradient(180deg, #00ff88 0%, #00cc6a 100%)';
    closeButton.style.color = '#000';
    closeButton.style.border = 'none';
    closeButton.style.borderRadius = '4px';
    closeButton.style.fontSize = '10px';
    closeButton.style.fontFamily = "'Press Start 2P', cursive";
    closeButton.style.cursor = 'pointer';
    closeButton.style.boxShadow = '0 4px 0 #009950, 0 0 15px rgba(0, 255, 136, 0.4)';
    closeButton.style.transition = 'all 0.15s ease';
    
    closeButton.addEventListener('mouseenter', () => {
        closeButton.style.transform = 'translateY(-2px)';
        closeButton.style.boxShadow = '0 6px 0 #009950, 0 0 25px rgba(0, 255, 136, 0.6)';
    });
    
    closeButton.addEventListener('mouseleave', () => {
        closeButton.style.transform = 'translateY(0)';
        closeButton.style.boxShadow = '0 4px 0 #009950, 0 0 15px rgba(0, 255, 136, 0.4)';
    });
    
    closeButton.addEventListener('click', () => overlay.remove());
    modal.appendChild(closeButton);
    
    // Close on overlay click
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) overlay.remove();
    });
    
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
}

// =====================================================
// KEYBOARD INPUT
// =====================================================

document.addEventListener('keydown', (event: KeyboardEvent) => {
    if (isPaused) return;
    if (isGameOver) return;
    
    const activeBoard = boards[activeBoardIndex];
    if (!activeBoard || activeBoard.isGameOver || activeBoard.aiEnabled) return;
    
    if (['ArrowLeft', 'ArrowRight', 'ArrowDown', 'ArrowUp', ' '].includes(event.key)) {
        event.preventDefault();
    }
    
    switch (event.key) {
        case 'ArrowLeft':
            movePieceHorizontally(activeBoard, -1);
            break;
        case 'ArrowRight':
            movePieceHorizontally(activeBoard, 1);
            break;
        case 'ArrowDown':
            movePieceDown(activeBoard);
            activeBoard.lastDropTime = performance.now();
            break;
        case 'ArrowUp':
            rotatePiece(activeBoard);
            break;
        case ' ':
            if (hardDropUnlocked) {
                hardDrop(activeBoard);
            }
            break;
    }
});

// =====================================================
// MAIN GAME LOOP
// =====================================================

function gameLoop(currentTime: number = 0): void {
    if (!isPaused && !isGameOver) {
        // Update all boards
        for (const board of boards) {
            if (board.isGameOver) continue;
            
            if (board.aiEnabled) {
                // AI-controlled board
                updateAI(board, currentTime);
            } else if (board.index === activeBoardIndex) {
                // Player-controlled board - handle automatic dropping
                const timeSinceDrop = currentTime - board.lastDropTime;
                if (timeSinceDrop > DROP_SPEED) {
                    movePieceDown(board);
                    board.lastDropTime = currentTime;
                }
            }
        }
    }
    
    // Draw all boards
    for (const board of boards) {
        drawBoard(board);
        drawBoardState(board);
        if (!board.isGameOver && board.currentPiece) {
            drawCurrentPiece(board);
        }
    }
    
    requestAnimationFrame(gameLoop);
}

// =====================================================
// INITIALIZATION
// =====================================================

// Set up canvas
canvas.width = BOARD_WIDTH + (PADDING * 2);
canvas.height = BOARD_HEIGHT + (PADDING * 2);
canvas.style.backgroundColor = '#000000';
canvas.style.borderRadius = '12px';
canvas.style.boxShadow = '0 0 20px rgba(0, 0, 0, 0.3)';

// Create first board
const board0 = createBoard(0);
board0.canvas = canvas;
boards.push(board0);

// Create UI
createGlobalHeader();
createUI();
createDialogueSystem();
createGameOverScreen();
updateStarsDisplay();
updatePrestigeButton();
updateSlotLocks();

// Show welcome dialogue on first game start
if (tutorialsEnabled) {
    showDialogue('welcome', null);
}

/*DEBUG: Remove this after testing prestige
const debugButton = document.createElement('button');
debugButton.textContent = '🐛 DEBUG: Add 10k Score';
debugButton.style.position = 'fixed';
debugButton.style.bottom = '10px';
debugButton.style.right = '10px';
debugButton.style.padding = '10px 20px';
debugButton.style.backgroundColor = '#ff0000';
debugButton.style.color = 'white';
debugButton.style.border = 'none';
debugButton.style.borderRadius = '8px';
debugButton.style.cursor = 'pointer';
debugButton.style.zIndex = '9999';
debugButton.addEventListener('click', () => {
    globalLinesCleared = 10000;
    globalPoints = 10000;
    updatePointsDisplay();
    console.log('DEBUG: Score set to 10000, Points set to 1000');
});
document.body.appendChild(debugButton);*/

// Start the game
board0.lastDropTime = performance.now();
spawnNewPiece(board0);

// Start game loop
gameLoop();

console.log("Idletris Multi-Board initialized!");