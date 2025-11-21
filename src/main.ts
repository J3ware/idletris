    // main.ts - The entry point for our Idletris game

    // First, we need to tell TypeScript that we're working with the browser's Canvas API
    // The "!" after getElementById tells TypeScript "trust me, this element exists"
    const canvas = document.getElementById('game-canvas')! as HTMLCanvasElement;

    // The "context" is like our paintbrush - it's what we use to draw on the canvas
    // We're using '2d' because Idletris is a 2D game (not 3D)
    const ctx = canvas.getContext('2d')!;

    // GAME CONSTANTS - These define the size and structure of our Idletris board
    const GRID_WIDTH = 10;   // Number of columns (how wide)
    const GRID_HEIGHT = 20;  // Number of rows (how tall)

    // Each cell (block) in our grid will be a square of this size (in pixels)
    // You can make this bigger or smaller to change the overall game size
    const CELL_SIZE = 30;

    // Calculate the total size of our game board in pixels
    // We multiply the number of cells by the size of each cell
    const BOARD_WIDTH = GRID_WIDTH * CELL_SIZE;   // Will be 300 pixels wide
    const BOARD_HEIGHT = GRID_HEIGHT * CELL_SIZE;  // Will be 600 pixels tall

    // Scaled-down size for board 1 when second board is unlocked (60% of original)
const CELL_SIZE_SMALL = 15;  // 60% of 30px
const PADDING_SMALL = 20;     // 60% of 40px padding

// Calculate board dimensions for both regular and small sizes
const BOARD_WIDTH_SMALL = GRID_WIDTH * CELL_SIZE_SMALL;    // 180px wide (10 * 18)
const BOARD_HEIGHT_SMALL = GRID_HEIGHT * CELL_SIZE_SMALL;  // 360px tall (20 * 18)

    // CANVAS SETUP - Configure the canvas to fit our game
    // We add some padding around the board for a cleaner look
    const PADDING = 40;  // Extra space around the board (in pixels)
    // IDLETRIS PIECES
    // Each piece is represented as a 2D array where:
    // - 0 means empty space
    // - 1 means there's a block there
    // These are the "blueprints" for each piece shape

    // We'll store all our piece types in an object for easy access
    const PIECES = {
        // I-Piece: The long straight piece
        I: [
            [0, 0, 0, 0],
            [1, 1, 1, 1],
            [0, 0, 0, 0],
            [0, 0, 0, 0]
        ],
        
        // O-Piece: The square piece
        O: [
            [1, 1],
            [1, 1]
        ],
        
        // T-Piece: The T-shaped piece
        // Looks like:  █
        //            ███
        T: [
            [0, 1, 0],
            [1, 1, 1],
            [0, 0, 0]
        ],
        
        // S-Piece: The S-shaped piece
        // Looks like:  ██
        //            ██
        S: [
            [0, 1, 1],
            [1, 1, 0],
            [0, 0, 0]
        ],
        
        // Z-Piece: The Z-shaped piece
        // Looks like: ██
        //              ██
        Z: [
            [1, 1, 0],
            [0, 1, 1],
            [0, 0, 0]
        ],
        
        // J-Piece: The J-shaped piece
        // Looks like: █
        //            ███
        J: [
            [1, 0, 0],
            [1, 1, 1],
            [0, 0, 0]
        ],
        
        // L-Piece: The L-shaped piece
        // Looks like:   █
        //            ███
        L: [
            [0, 0, 1],
            [1, 1, 1],
            [0, 0, 0]
        ]
    };

    // PIECE COLORS
    // These are hex color codes (# followed by Red-Green-Blue values)
    const PIECE_COLORS = {
        I: '#00F0F0',  // Cyan (light blue)
        O: '#F0F000',  // Yellow
        T: '#A000F0',  // Purple
        S: '#00F000',  // Green
        Z: '#F00000',  // Red
        J: '#0000F0',  // Blue
        L: '#F0A000'   // Orange
    };

    // TYPE DEFINITIONS - This helps TypeScript understand our piece structure
    // A "type" in TypeScript is like a blueprint that describes what something looks like

    // This says "a PieceType can only be one of these exact strings"
    type PieceType = 'I' | 'O' | 'T' | 'S' | 'Z' | 'J' | 'L';

    // This describes what a piece looks like when it's actively in play
    interface ActivePiece {
        type: PieceType;        // Which of the 7 pieces it is
        shape: number[][];      // The 2D array pattern of blocks
        x: number;              // Horizontal position on the board (in grid units, not pixels)
        y: number;              // Vertical position on the board (in grid units, not pixels)
        color: string;          // The hex color code for this piece
    }

    // PIECE MANAGEMENT VARIABLES
    // This will hold the piece that's currently falling
    // It starts as null because there's no piece when the game first loads
    let currentPiece: ActivePiece | null = null;

    // This will hold all the pieces that have already landed and locked in place
    // It's a 2D array matching our grid size, where each cell stores a color or null
    let boardState: (string | null)[][] = [];

    // GAME STATE VARIABLES
    let isGameOver = false;  // Track if the game has ended
    let nextPiece: PieceType | null = null;  // Track which piece is coming next

    // SECOND BOARD VARIABLES
    const UNLOCK_SECOND_BOARD_COST = 25;  // Cost to unlock the second board
    let secondBoardUnlocked = false;  // Track if second board is unlocked

    // Track which board is currently being controlled by the player
    let activePlayerBoard = 1;  // 1 or 2, shows which board the player controls

    // Variables to track if requirements for second board are met
    function checkSecondBoardRequirements(): boolean {
        // Check if board 1 AI is maxed out
        return aiPlayerHired && aiHardDropUnlocked && aiSpeedLevel >= MAX_AI_SPEED_UPGRADES;
    }

    // POINTS SYSTEM VARIABLES
    // Track the player's current spendable points
    let points = 0;

    // Track total lines cleared (for statistics)
    let totalLinesCleared = 0;

    // UPGRADE SYSTEM VARIABLES
    let hardDropUnlocked = false;  // Track if hard drop has been purchased
    const HARD_DROP_COST = 1;  // Cost to unlock hard drop
    const AI_PLAYER_COST = 5;  // Cost for hiring an AI player
    const BUY_I_PIECE_COST = 5;// Cost for turning the next piece into an I piece
    let aiHardDropUnlocked = false;  // Track if AI can use hard drop
    const AI_HARD_DROP_COST = 5;  // Cost for AI hard drop upgrade
    let aiSpeedLevel = 0;  // Current speed upgrade level (0-5)
    const AI_SPEED_UPGRADE_COST = 5;  // Cost to upgrade AI speed
    const MAX_AI_SPEED_UPGRADES = 5;  // Maximum number of speed upgrades
    const BASE_AI_SPEED = 300;  // Starting AI speed in milliseconds

    // Track if AI player is hired (not functional yet, just for UI)
    let aiPlayerHired = false;

    // TIMING VARIABLES - Control how fast pieces fall
    // Track the last time we moved a piece down
    let lastDropTime = 0;

    // AI PLAYER VARIABLES
    let aiEnabled = false;  // Is the AI currently playing?
    let aiSpeed = 300;  // How fast the AI moves (milliseconds between actions)
    let aiLastMoveTime = 0;  // Track timing for AI moves
    let aiTargetPosition: { x: number, rotation: number } | null = null;  // Where AI wants to place the piece
    let aiMoving = false;  // Is AI currently moving a piece?

        // SECOND BOARD GAME STATE
    let currentPieceBoard2: ActivePiece | null = null;
    let boardStateBoard2: (string | null)[][] = [];
    let isGameOverBoard2 = false;
    let nextPieceBoard2: PieceType | null = null;
    let totalLinesClearedBoard2 = 0;

    // Board 2 AI variables (independent from board 1)
    //let aiPlayerHiredBoard2 = false;
    let aiEnabledBoard2 = false;
    //let aiHardDropUnlockedBoard2 = false;
    //let aiSpeedLevelBoard2 = 0;
    //let aiSpeedBoard2 = BASE_AI_SPEED;
    //let aiLastMoveTimeBoard2 = 0;
    //let aiTargetPositionBoard2: { x: number, rotation: number } | null = null;
    //let aiMovingBoard2 = false;
    

    // Board 2 timing
    let lastDropTimeBoard2 = 0;

    // How many milliseconds between automatic drops (1000ms = 1 second)
    // Lower number = faster falling
    const DROP_SPEED = 1000;  // Piece falls once per second

    // Set the canvas size to accommodate our board plus padding on all sides
    canvas.width = BOARD_WIDTH + (PADDING * 2);
    canvas.height = BOARD_HEIGHT + (PADDING * 2);

    // Give the canvas an ID for board 1
    // canvas.id = 'game-canvas-1';

// Canvas visual styling – layout is handled by index.html now
canvas.style.position = '';
canvas.style.left = '';
canvas.style.top = '';
canvas.style.transform = '';
canvas.style.boxShadow = '0 0 4px rgba(0, 0, 0, 0.3)';


    // Optional: Add a subtle shadow for depth
    canvas.style.boxShadow = '0 0 4px rgba(0, 0, 0, 0.3)';

    // UI ELEMENTS CREATION - Create the points display and AI button

    /**
     * Creates the global header that sits at the top of the screen
     * This contains the game title, global points, and global controls
     */
    function createGlobalHeader(): void {
        // Create the header container
        const header = document.createElement('div');
        header.id = 'global-header';
        
        // Style the header - full width at top of screen
        header.style.position = 'fixed';
        header.style.top = '0';
        header.style.left = '0';
        header.style.right = '0';
        header.style.height = '120px';
        header.style.backgroundColor = 'rgba(0, 0, 0, 0.9)';
        header.style.borderBottom = '2px solid #444';
        header.style.display = 'flex';
        header.style.alignItems = 'center';
        header.style.justifyContent = 'center';
        header.style.gap = '60px';
        header.style.padding = '20px';
        header.style.zIndex = '1000';
        header.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.3)';
        
        // Create title section
        const titleSection = document.createElement('div');
        titleSection.style.textAlign = 'center';
        
        const title = document.createElement('h1');
        title.textContent = 'IDLETRIS';
        title.style.margin = '0';
        title.style.fontSize = '36px';
        title.style.color = '#4CAF50';
        title.style.textShadow = '3px 3px 6px rgba(0,0,0,0.7)';
        title.style.fontFamily = 'Arial, sans-serif';
        title.style.letterSpacing = '4px';
        
        titleSection.appendChild(title);
        
        // Create global points display
        const pointsSection = document.createElement('div');
        pointsSection.style.textAlign = 'center';
        pointsSection.style.padding = '15px 30px';
        pointsSection.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
        pointsSection.style.borderRadius = '10px';
        pointsSection.innerHTML = `
            <div style="font-size: 14px; color: #888; margin-bottom: 5px;">Points</div>
            <div style="font-size: 32px; font-weight: bold; color: #4CAF50;">
                <span id="global-points-value">0</span>
            </div>
        `;
        
        // Create global controls section
        const controlsSection = document.createElement('div');
        controlsSection.id = 'global-controls-section';
        controlsSection.style.textAlign = 'center';
        controlsSection.style.padding = '15px 25px';
        controlsSection.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
        controlsSection.style.borderRadius = '10px';
        controlsSection.style.fontSize = '12px';
        controlsSection.style.color = '#aaa';
        controlsSection.innerHTML = `
            <div style="margin-bottom: 8px; font-weight: bold; color: #fff;">Controls</div>
            <div>← → : Move | ↑ : Rotate</div>
            <div>↓ : Soft Drop | <span id="space-control-text" style="opacity: 0.5;">Space : Locked</span></div>
        `;
        
        // Create global hard drop button container
        const globalUpgradesSection = document.createElement('div');
        globalUpgradesSection.id = 'global-upgrades';
        globalUpgradesSection.style.display = 'flex';
        globalUpgradesSection.style.gap = '15px';
        globalUpgradesSection.style.alignItems = 'center';
        
        // Add elements to header
        header.appendChild(titleSection);
        header.appendChild(pointsSection);
        header.appendChild(controlsSection);
        header.appendChild(globalUpgradesSection);
        
        // Add header to page
        document.body.appendChild(header);
        
        // Add the global hard drop button to the upgrades section
        createGlobalHardDropButton();
        
        // Add unlock second board button (hidden initially)
        createUnlockSecondBoardButton();
    }

    /**
     * Creates the global hard drop button in the header
     */
    function createGlobalHardDropButton(): void {
        const globalUpgradesSection = document.getElementById('global-upgrades');
        if (!globalUpgradesSection) return;
        
        const hardDropButton = document.createElement('button');
        hardDropButton.id = 'global-harddrop-button';
        hardDropButton.textContent = `Unlock Hard Drop (${HARD_DROP_COST} pt)`;
        hardDropButton.style.display = 'none';  // Hidden initially
        hardDropButton.style.padding = '10px 20px';
        hardDropButton.style.fontSize = '14px';
        hardDropButton.style.fontWeight = 'bold';
        hardDropButton.style.backgroundColor = '#2196F3';
        hardDropButton.style.color = 'white';
        hardDropButton.style.border = 'none';
        hardDropButton.style.borderRadius = '8px';
        hardDropButton.style.cursor = 'pointer';
        hardDropButton.style.transition = 'all 0.3s ease';
        
        // Add hover effect
        hardDropButton.addEventListener('mouseenter', () => {
            if (!hardDropButton.disabled) {
                hardDropButton.style.backgroundColor = '#1976D2';
                hardDropButton.style.transform = 'scale(1.05)';
            }
        });
        
        hardDropButton.addEventListener('mouseleave', () => {
            hardDropButton.style.backgroundColor = hardDropButton.disabled ? '#888888' : '#2196F3';
            hardDropButton.style.transform = 'scale(1)';
        });
        
        hardDropButton.addEventListener('click', () => {
            purchaseHardDrop();
        });
        
        globalUpgradesSection.appendChild(hardDropButton);
    }

    /**
     * Creates the unlock second board button
     */
    function createUnlockSecondBoardButton(): void {
        const globalUpgradesSection = document.getElementById('global-upgrades');
        if (!globalUpgradesSection) return;
        
        const unlockButton = document.createElement('button');
        unlockButton.id = 'unlock-second-board-button';
        unlockButton.textContent = `Unlock 2nd Board (25 pts)`;
        unlockButton.style.display = 'none';  // Hidden initially
        unlockButton.style.padding = '10px 20px';
        unlockButton.style.fontSize = '14px';
        unlockButton.style.fontWeight = 'bold';
        unlockButton.style.backgroundColor = '#FF5722';  // Orange-red for major upgrade
        unlockButton.style.color = 'white';
        unlockButton.style.border = 'none';
        unlockButton.style.borderRadius = '8px';
        unlockButton.style.cursor = 'pointer';
        unlockButton.style.transition = 'all 0.3s ease';
        unlockButton.style.animation = 'pulse 2s infinite';
        
        // Add hover effect
        unlockButton.addEventListener('mouseenter', () => {
            if (!unlockButton.disabled) {
                unlockButton.style.backgroundColor = '#E64A19';
                unlockButton.style.transform = 'scale(1.05)';
            }
        });
        
        unlockButton.addEventListener('mouseleave', () => {
            unlockButton.style.backgroundColor = unlockButton.disabled ? '#888888' : '#FF5722';
            unlockButton.style.transform = 'scale(1)';
        });
        
        unlockButton.addEventListener('click', () => {
            unlockSecondBoard();
        });
        
        globalUpgradesSection.appendChild(unlockButton);
    }

    /**
     * Creates the UI container for a specific board
     * This sits next to each game board and shows board-specific information
     */
    function createUI(): void {
        // First create the global header
        createGlobalHeader();
        
const gameContainer = document.createElement('div');
gameContainer.id = 'game-container';
gameContainer.style.display = 'flex';
gameContainer.style.gap = '40px';
gameContainer.style.alignItems = 'flex-start';
gameContainer.style.justifyContent = 'flex-start';  // ADD THIS - align to left, not center

// Let index.html handle the overall page layout.
const gameArea = document.getElementById('game-area');
if (gameArea) {
  gameArea.appendChild(gameContainer);
} else {
  // Fallback: append to body if #game-area is missing
  document.body.appendChild(gameContainer);
}

        
        // Create the first board's container
        const board1Container = document.createElement('div');
        board1Container.id = 'board-1-container';
        board1Container.style.display = 'flex';
        board1Container.style.gap = '20px';
        
        gameContainer.appendChild(board1Container);
        
        // Now create the board-specific UI
        createBoardUI(1);
    }
    /**
     * Creates the UI for a specific board (board 1 or 2)
     * Each board has its own upgrades and stats
     */
    function createBoardUI(boardNumber: number): void {
        const boardContainer = document.getElementById(`board-${boardNumber}-container`);
        if (!boardContainer) return;
        
        // Create the UI panel for this board
        const uiPanel = document.createElement('div');
        uiPanel.id = `board-${boardNumber}-ui`;
        uiPanel.style.width = '200px';
        uiPanel.style.padding = '20px';
        uiPanel.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        uiPanel.style.borderRadius = '12px';
        uiPanel.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.3)';
        uiPanel.style.color = 'white';
        uiPanel.style.fontFamily = 'Arial, sans-serif';
        
        // Board label
        const boardLabel = document.createElement('h3');
        boardLabel.textContent = `Board ${boardNumber}`;
        boardLabel.style.margin = '0 0 15px 0';
        boardLabel.style.textAlign = 'center';
        boardLabel.style.color = boardNumber === 1 ? '#4CAF50' : '#2196F3';
        boardLabel.style.fontSize = '18px';
        
        // Next piece preview for this board
        const nextPieceSection = document.createElement('div');
        nextPieceSection.style.marginBottom = '20px';
        nextPieceSection.style.padding = '15px';
        nextPieceSection.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
        nextPieceSection.style.borderRadius = '8px';
        nextPieceSection.innerHTML = `
            <div style="font-size: 14px; opacity: 0.7; margin-bottom: 10px; text-align: center;">Next Piece</div>
        `;
        
        const nextPieceCanvas = document.createElement('canvas');
        nextPieceCanvas.id = `next-piece-canvas-${boardNumber}`;
        nextPieceCanvas.width = 100;
        nextPieceCanvas.height = 80;
        nextPieceCanvas.style.display = 'block';
        nextPieceCanvas.style.margin = '0 auto';
        nextPieceCanvas.style.border = '2px solid #333';
        nextPieceCanvas.style.borderRadius = '4px';
        nextPieceCanvas.style.backgroundColor = '#111';
        
        nextPieceSection.appendChild(nextPieceCanvas);
        
        // Lines cleared for this board
        const statsSection = document.createElement('div');
        statsSection.style.marginBottom = '20px';
        statsSection.style.padding = '15px';
        statsSection.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
        statsSection.style.borderRadius = '8px';
        statsSection.innerHTML = `
            <div style="font-size: 14px; opacity: 0.7;">Lines Cleared</div>
            <div style="font-size: 24px; font-weight: bold;">
                <span id="board-${boardNumber}-lines">0</span>
            </div>
        `;
        
        // Board status (Player/AI)
        const statusSection = document.createElement('div');
        statusSection.id = `board-${boardNumber}-status`;
        statusSection.style.marginBottom = '20px';
        statusSection.style.padding = '10px';
        statusSection.style.backgroundColor = 'rgba(76, 175, 80, 0.2)';
        statusSection.style.borderRadius = '8px';
        statusSection.style.textAlign = 'center';
        statusSection.style.fontSize = '14px';
        statusSection.innerHTML = '<span>🎮 Player Control</span>';
        
        // Upgrades section for this board
        const upgradesSection = document.createElement('div');
        upgradesSection.id = `board-${boardNumber}-upgrades`;
        upgradesSection.style.display = 'flex';
        upgradesSection.style.flexDirection = 'column';
        upgradesSection.style.gap = '10px';
        
        // Assemble the UI panel
        // uiPanel.appendChild(boardLabel);
        uiPanel.appendChild(nextPieceSection);
        uiPanel.appendChild(statsSection);
        uiPanel.appendChild(statusSection);
        uiPanel.appendChild(upgradesSection);
        
        // Add to board container (UI goes after the canvas)
        boardContainer.appendChild(uiPanel);
        
        // For board 1, migrate the existing upgrade buttons
        if (boardNumber === 1) {
            // We'll handle this in the next step
            setTimeout(() => createBoardUpgradeButtons(1), 100);
        }
    }
    /**
     * Creates the upgrade buttons specific to a board
     * Each board has its own AI and upgrade progression
     */
    function createBoardUpgradeButtons(boardNumber: number): void {
        const upgradesSection = document.getElementById(`board-${boardNumber}-upgrades`);
        if (!upgradesSection) return;
        
        // Buy I Piece button
        const buyIPieceButton = document.createElement('button');
        buyIPieceButton.id = `buy-i-piece-button-${boardNumber}`;
        buyIPieceButton.textContent = `Buy 'I' Piece (${BUY_I_PIECE_COST} pts)`;
        buyIPieceButton.style.display = 'none';
        buyIPieceButton.style.width = '100%';
        buyIPieceButton.style.padding = '10px';
        buyIPieceButton.style.fontSize = '13px';
        buyIPieceButton.style.fontWeight = 'bold';
        buyIPieceButton.style.backgroundColor = '#9C27B0';
        buyIPieceButton.style.color = 'white';
        buyIPieceButton.style.border = 'none';
        buyIPieceButton.style.borderRadius = '6px';
        buyIPieceButton.style.cursor = 'pointer';
        buyIPieceButton.style.transition = 'all 0.3s ease';
        
        // Hire AI button
        const aiButton = document.createElement('button');
        aiButton.id = `ai-button-${boardNumber}`;
        aiButton.textContent = `Hire AI (${AI_PLAYER_COST} pts)`;
        aiButton.style.display = 'none';
        aiButton.style.width = '100%';
        aiButton.style.padding = '10px';
        aiButton.style.fontSize = '13px';
        aiButton.style.fontWeight = 'bold';
        aiButton.style.backgroundColor = '#4CAF50';
        aiButton.style.color = 'white';
        aiButton.style.border = 'none';
        aiButton.style.borderRadius = '6px';
        aiButton.style.cursor = 'pointer';
        aiButton.style.transition = 'all 0.3s ease';
        
        // AI Hard Drop button
        const aiHardDropButton = document.createElement('button');
        aiHardDropButton.id = `ai-harddrop-button-${boardNumber}`;
        aiHardDropButton.textContent = `AI Hard Drop (${AI_HARD_DROP_COST} pts)`;
        aiHardDropButton.style.display = 'none';
        aiHardDropButton.style.width = '100%';
        aiHardDropButton.style.padding = '10px';
        aiHardDropButton.style.fontSize = '13px';
        aiHardDropButton.style.fontWeight = 'bold';
        aiHardDropButton.style.backgroundColor = '#FF9800';
        aiHardDropButton.style.color = 'white';
        aiHardDropButton.style.border = 'none';
        aiHardDropButton.style.borderRadius = '6px';
        aiHardDropButton.style.cursor = 'pointer';
        aiHardDropButton.style.transition = 'all 0.3s ease';
        
        // AI Speed button
        const aiSpeedButton = document.createElement('button');
        aiSpeedButton.id = `ai-speed-button-${boardNumber}`;
        aiSpeedButton.textContent = `AI Speed Lv1 (${AI_SPEED_UPGRADE_COST} pts)`;
        aiSpeedButton.style.display = 'none';
        aiSpeedButton.style.width = '100%';
        aiSpeedButton.style.padding = '10px';
        aiSpeedButton.style.fontSize = '13px';
        aiSpeedButton.style.fontWeight = 'bold';
        aiSpeedButton.style.backgroundColor = '#00BCD4';
        aiSpeedButton.style.color = 'white';
        aiSpeedButton.style.border = 'none';
        aiSpeedButton.style.borderRadius = '6px';
        aiSpeedButton.style.cursor = 'pointer';
        aiSpeedButton.style.transition = 'all 0.3s ease';
        
        // Add all buttons to the upgrades section
        upgradesSection.appendChild(buyIPieceButton);
        upgradesSection.appendChild(aiButton);
        upgradesSection.appendChild(aiHardDropButton);
        upgradesSection.appendChild(aiSpeedButton);
        
        // Add event listeners based on board number
        buyIPieceButton.addEventListener('click', () => {
            if (boardNumber === 1) {
                buyIPiece();
            } else {
                // We'll implement buyIPieceBoard2() later
                console.log(`Buy I Piece for board ${boardNumber}`);
            }
        });
        
        aiButton.addEventListener('click', () => {
            if (boardNumber === 1) {
                hireAIPlayer();
            } else {
                // We'll implement hireAIPlayerBoard2() later
                console.log(`Hire AI for board ${boardNumber}`);
            }
        });
        
        aiHardDropButton.addEventListener('click', () => {
        if (boardNumber === 1) {
            purchaseAIHardDrop();
        } else {
            // We'll implement purchaseAIHardDropBoard2() when we add board 2
            console.log(`Purchase AI Hard Drop for board ${boardNumber}`);
        }
        });

        aiSpeedButton.addEventListener('click', () => {
        if (boardNumber === 1) {
            purchaseAISpeedUpgrade();
        } else {
            // We'll implement purchaseAISpeedUpgradeBoard2() when we add board 2
            console.log(`Purchase AI Speed Upgrade for board ${boardNumber}`);
        }
        });


        // Add hover effects
        [buyIPieceButton, aiButton, aiHardDropButton, aiSpeedButton].forEach(button => {
            button.addEventListener('mouseenter', () => {
                if (!button.disabled) {
                    button.style.transform = 'scale(1.05)';
                }
            });
            
            button.addEventListener('mouseleave', () => {
                button.style.transform = 'scale(1)';
            });
        });
    }

    /**
     * Handles purchasing an I piece to replace the next piece
     * Only works if next piece isn't already an I
     */
    function buyIPiece(): void {
        // Check if next piece is already an I
        if (nextPiece === 'I') {
            console.log("Next piece is already an 'I' piece!");
            // Flash the next piece preview to show it's already an I
            const previewCanvas = document.getElementById('next-piece-canvas-1') as HTMLCanvasElement;
            if (previewCanvas) {
                previewCanvas.style.transition = 'box-shadow 0.3s ease';
                previewCanvas.style.boxShadow = '0 0 20px rgba(0,240,240,0.8)';
                setTimeout(() => {
                    previewCanvas.style.boxShadow = '';
                }, 300);
            }
            return;
        }
        
        // Check if player has enough points
        if (points < BUY_I_PIECE_COST) {
            console.log("Not enough points to buy an I piece!");
            return;
        }
        
        // Deduct the points
        points -= BUY_I_PIECE_COST;
        
        // Change the next piece to I
        nextPiece = 'I';
        
        // Update displays
        updatePointsDisplay();
        updateNextPiecePreview(1);  // Update board 1's preview
        
        // Show success message
        console.log("Next piece changed to 'I' piece!");
        
        // Visual feedback - cyan flash for I piece
        const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
        if (canvas) {
            canvas.style.transition = 'box-shadow 0.5s ease';
            canvas.style.boxShadow = '0 0 40px rgba(0,240,240,0.8)';
            
            setTimeout(() => {
                canvas.style.boxShadow = '0 0 20px rgba(0,0,0,0.3)';
            }, 500);
        }
        
        // Also flash the next piece preview
        const previewCanvas = document.getElementById('next-piece-canvas-1') as HTMLCanvasElement;
        if (previewCanvas) {
            previewCanvas.style.transition = 'transform 0.3s ease';
            previewCanvas.style.transform = 'scale(1.2)';
            setTimeout(() => {
                previewCanvas.style.transform = 'scale(1)';
            }, 300);
        }
    }
    /**
     * Handles purchasing the AI Hard Drop upgrade
     * Allows AI to instantly place pieces instead of dropping row by row
     */
    function purchaseAIHardDrop(): void {
        // Check if player has enough points
        if (points < AI_HARD_DROP_COST) {
            console.log("Not enough points for AI Hard Drop!");
            return;
        }
        
        // Deduct the points
        points -= AI_HARD_DROP_COST;
        
        // Unlock AI hard drop
        aiHardDropUnlocked = true;
        
        // Update the display
        updatePointsDisplay();
        updateAIHardDropButtonBoard(1);  // Update board 1's button
        
        // Show success message
        console.log("AI Hard Drop unlocked! AI can now instantly place pieces.");
        
        // Visual feedback - orange flash
        const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
        if (canvas) {
            canvas.style.transition = 'box-shadow 0.5s ease';
            canvas.style.boxShadow = '0 0 40px rgba(255,152,0,0.8)';
            
            setTimeout(() => {
                canvas.style.boxShadow = '0 0 20px rgba(0,0,0,0.3)';
            }, 500);
        }
    }
    /**
     * Handles purchasing an AI speed upgrade
     * Makes the AI place pieces faster (up to 5 upgrades)
     */
    function purchaseAISpeedUpgrade(): void {
        // Check if already at max upgrades
        if (aiSpeedLevel >= MAX_AI_SPEED_UPGRADES) {
            console.log("AI speed already at maximum!");
            return;
        }
        
        // Check if player has enough points
        if (points < AI_SPEED_UPGRADE_COST) {
            console.log("Not enough points for AI speed upgrade!");
            return;
        }
        
        // Deduct the points
        points -= AI_SPEED_UPGRADE_COST;
        
        // Increase speed level
        aiSpeedLevel++;
        
        // Calculate new AI speed
        // Each upgrade multiplies speed by 1.5x (divides delay time by 1.5)
        // Formula: baseSpeed / (1.5 ^ upgradeLevel)
        aiSpeed = BASE_AI_SPEED / Math.pow(1.5, aiSpeedLevel);
        
        // Update the display
        updatePointsDisplay();
        updateAISpeedButtonBoard(1);  // Update board 1's button
        
        // Show success message
        console.log(`AI speed upgraded to level ${aiSpeedLevel}! New speed: ${aiSpeed.toFixed(0)}ms`);
        
        // Visual feedback - cyan flash
        const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
        if (canvas) {
            canvas.style.transition = 'box-shadow 0.5s ease';
            canvas.style.boxShadow = '0 0 40px rgba(0,188,212,0.8)';
            
            setTimeout(() => {
                canvas.style.boxShadow = '0 0 20px rgba(0,0,0,0.3)';
            }, 500);
        }
    }
    /**
     * Creates the Game Over overlay screen
     * This appears when the player loses, covering the game board
     */
    function createGameOverScreen(): void {
        // Create the dark overlay that covers everything
        const overlay = document.createElement('div');
        overlay.id = 'game-over-overlay';
        
        // Style the overlay - covers entire screen with semi-transparent black
        overlay.style.position = 'fixed';
        overlay.style.top = '0';
        overlay.style.left = '0';
        overlay.style.width = '100%';
        overlay.style.height = '100%';
        overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.85)';  // Dark semi-transparent background
        overlay.style.display = 'none';  // Hidden by default
        overlay.style.justifyContent = 'center';
        overlay.style.alignItems = 'center';
        overlay.style.zIndex = '9999';  // Appears above everything else
        overlay.style.opacity = '0';  // Start invisible for fade-in effect
        overlay.style.transition = 'opacity 0.5s ease';
        
        // Create the Game Over panel (the white box in the center)
        const panel = document.createElement('div');
        panel.style.backgroundColor = '#1a1a1a';  // Dark background for the panel
        panel.style.padding = '50px';
        panel.style.borderRadius = '20px';
        panel.style.boxShadow = '0 10px 40px rgba(0,0,0,0.5)';
        panel.style.textAlign = 'center';
        panel.style.maxWidth = '500px';
        panel.style.border = '3px solid #ff4444';  // Red border for emphasis
        
        // Create the "GAME OVER" title
        const title = document.createElement('h1');
        title.textContent = 'GAME OVER';
        title.style.color = '#ff4444';  // Red text
        title.style.fontSize = '48px';
        title.style.margin = '0 0 30px 0';
        title.style.fontFamily = 'Arial, sans-serif';
        title.style.textShadow = '2px 2px 8px rgba(255,68,68,0.5)';
        title.style.letterSpacing = '2px';
        
        // Create the stats section (shows final score)
        const stats = document.createElement('div');
        stats.id = 'game-over-stats';
        stats.style.color = 'white';
        stats.style.fontSize = '20px';
        stats.style.marginBottom = '40px';
        stats.style.lineHeight = '1.8';
        stats.innerHTML = `
            <div style="margin-bottom: 15px;">
                <span style="opacity: 0.7;">Final Score:</span>
                <span style="font-size: 32px; font-weight: bold; color: #4CAF50; margin-left: 10px;" id="final-points">0</span>
            </div>
            <div>
                <span style="opacity: 0.7;">Total Lines Cleared:</span>
                <span style="font-size: 24px; font-weight: bold; margin-left: 10px;" id="final-lines">0</span>
            </div>
        `;
        
        // Create the Reset button
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
        resetButton.style.fontFamily = 'Arial, sans-serif';
        
        // Add hover effect for the reset button
        resetButton.addEventListener('mouseenter', () => {
            resetButton.style.backgroundColor = '#45a049';
            resetButton.style.transform = 'scale(1.05)';
            resetButton.style.boxShadow = '0 6px 12px rgba(76,175,80,0.4)';
        });
        
        resetButton.addEventListener('mouseleave', () => {
            resetButton.style.backgroundColor = '#4CAF50';
            resetButton.style.transform = 'scale(1)';
            resetButton.style.boxShadow = '0 4px 6px rgba(0,0,0,0.3)';
        });
        
        // Add click handler to reset the game
        resetButton.addEventListener('click', () => {
            resetGame();
        });
        
        // Assemble the panel
        panel.appendChild(title);
        panel.appendChild(stats);
        panel.appendChild(resetButton);
        
        // Add panel to overlay
        overlay.appendChild(panel);
        
        // Add overlay to the page
        document.body.appendChild(overlay);
    }
    /**
     * Shows the Game Over screen with a smooth fade-in animation
     * Displays the player's final stats
     */
    function showGameOverScreen(): void {
        const overlay = document.getElementById('game-over-overlay');
        if (!overlay) return;
        
        // Update the final stats on the game over screen
        const finalPoints = document.getElementById('final-points');
        const finalLines = document.getElementById('final-lines');
        
        if (finalPoints) finalPoints.textContent = points.toString();
        if (finalLines) finalLines.textContent = totalLinesCleared.toString();
        
        // Show the overlay
        overlay.style.display = 'flex';
        
        // Trigger fade-in animation (small delay so CSS transition works)
        setTimeout(() => {
            overlay.style.opacity = '1';
        }, 10);
        
        console.log("Game Over! Final score:", points);
    }

    /**
     * Hides the Game Over screen with a fade-out animation
     */
    function hideGameOverScreen(): void {
        const overlay = document.getElementById('game-over-overlay');
        if (!overlay) return;
        
        // Fade out
        overlay.style.opacity = '0';
        
        // Hide completely after fade animation completes
        setTimeout(() => {
            overlay.style.display = 'none';
        }, 500);  // Match the transition duration
    }
    /**
     * Resets the entire game to starting state
     * Called when player clicks "Play Again" button
     */
    function resetGame(): void {
    console.log("Resetting game...");
    
    // Hide the game over screen
    hideGameOverScreen();
    
    // Reset game state for board 1
    isGameOver = false;
    currentPiece = null;
    nextPiece = null;
    
    // Reset scores and stats
    points = 0;
    totalLinesCleared = 0;
    
    // Reset all global / board 1 upgrades & AI
    hardDropUnlocked = false;
    aiPlayerHired = false;
    aiEnabled = false;
    aiHardDropUnlocked = false;
    aiSpeedLevel = 0;
    aiSpeed = BASE_AI_SPEED;  // Reset to base speed
    
    // Reset AI state for board 1
    aiTargetPosition = null;
    aiMoving = false;
    aiLastMoveTime = 0;
    
    // If a second board exists, fully reset and remove it
    if (secondBoardUnlocked) {
        resetSecondBoard();
    }
    
    // Player should control board 1 again
    activePlayerBoard = 1;
    updateBoardStatus(1);
    
    // Clear the board completely (board 1)
    initializeBoard();
    
    // Reset timing
    lastDropTime = performance.now();
    
    // Update all UI elements to reflect reset state
    updatePointsDisplay();
    updateControlsDisplay();
    
    // Spawn the first piece for the new game
    spawnNewPiece();
    
    // Visual feedback - quick green flash on the canvas
    const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
    if (canvas) {
        canvas.style.transition = 'box-shadow 0.3s ease';
        canvas.style.boxShadow = '0 0 30px rgba(76,175,80,0.6)';
        
        setTimeout(() => {
            canvas.style.boxShadow = '0 0 20px rgba(0,0,0,0.3)';
        }, 300);
    }
    
    console.log("Game reset complete! Good luck!");
}

    // Call createUI after the canvas is set up
    createUI();

    // Move the canvas into the board 1 container
    const board1Container = document.getElementById('board-1-container');
    if (board1Container) {
        // Remove old positioning styles
        canvas.style.position = '';
        canvas.style.left = '';
        canvas.style.top = '';
        canvas.style.transform = '';
        
        // Add the canvas to the board container
        board1Container.insertBefore(canvas, board1Container.firstChild);
    }

    // Create the Game Over screen (hidden by default)
    createGameOverScreen();

    // INITIALIZE THE BOARD STATE
    // Create an empty board - a 2D array filled with null values
    // This represents no blocks on the board initially
    function initializeBoard(): void {
        // Create a new empty array for the board
        boardState = [];
        
        // For each row in our grid...
        for (let row = 0; row < GRID_HEIGHT; row++) {
            // Create a new row array
            const newRow: (string | null)[] = [];
            
            // For each column in our grid...
            for (let col = 0; col < GRID_WIDTH; col++) {
                // Add an empty cell (null means no block here)
                newRow.push(null);
            }
            
            // Add this completed row to our board
            boardState.push(newRow);
        }
    }

    /**
 * Initializes board state for a specific board
 */
function initializeBoardState(boardNumber: number): void {
    const newBoardState = [];
    
    for (let row = 0; row < GRID_HEIGHT; row++) {
        const newRow: (string | null)[] = [];
        for (let col = 0; col < GRID_WIDTH; col++) {
            newRow.push(null);
        }
        newBoardState.push(newRow);
    }
    
    if (boardNumber === 2) {
        boardStateBoard2 = newBoardState;
        lastDropTimeBoard2 = performance.now();
    } else {
        boardState = newBoardState;
        lastDropTime = performance.now();
    }
}

    // PIECE CREATION FUNCTIONS

    /**
     * Creates a new piece using the "next piece" system
     * The piece that was "next" becomes current, and a new "next" is generated
     */
    function spawnNewPiece(): void {
        // If there's no next piece yet (game just started), generate one
        if (nextPiece === null) {
            const pieceTypes = Object.keys(PIECES) as PieceType[];
            nextPiece = pieceTypes[Math.floor(Math.random() * pieceTypes.length)];
        }
        
        // Use the next piece as the current piece
        const pieceType = nextPiece;
        
        // Create the new piece object
        currentPiece = {
            type: pieceType,
            shape: PIECES[pieceType],
            x: Math.floor(GRID_WIDTH / 2) - 1,
            y: 0,
            color: PIECE_COLORS[pieceType]
        };
        
        // Check if the new piece immediately collides (game over)
        if (checkCollision()) {
            // GAME OVER! - Set the game over state
            isGameOver = true;
            currentPiece = null;
            
            // Disable AI if it was running
            if (aiEnabled) {
                aiEnabled = false;
                aiTargetPosition = null;
                aiMoving = false;
            }
            
            // Show the game over screen instead of alert
            showGameOverScreen();
            
            console.log("GAME OVER! Pieces reached the top.");
            return;
        }
        
        // Generate the next piece
        const pieceTypes = Object.keys(PIECES) as PieceType[];
        nextPiece = pieceTypes[Math.floor(Math.random() * pieceTypes.length)];
        
        // Update the preview display
        updateNextPiecePreview(1);
        
        // For debugging
        console.log(`Spawned piece: ${pieceType}, Next piece: ${nextPiece}`);
    }

    /**
 * Spawns a new piece for board 2
 */
function spawnNewPieceBoard2(): void {
    // If there's no next piece yet (game just started), generate one
    if (nextPieceBoard2 === null) {
        const pieceTypes = Object.keys(PIECES) as PieceType[];
        nextPieceBoard2 = pieceTypes[Math.floor(Math.random() * pieceTypes.length)];
    }
    
    // Use the next piece as the current piece
    const pieceType = nextPieceBoard2;
    
    // Create the new piece object
    currentPieceBoard2 = {
        type: pieceType,
        shape: PIECES[pieceType],
        x: Math.floor(GRID_WIDTH / 2) - 1,
        y: 0,
        color: PIECE_COLORS[pieceType]
    };
    
    // Check if the new piece immediately collides (game over)
    if (checkCollisionBoard2()) {
        // GAME OVER for board 2!
        isGameOverBoard2 = true;
        currentPieceBoard2 = null;
        
        // Disable AI if it was running on board 2
        if (aiEnabledBoard2) {
            aiEnabledBoard2 = false;
            //aiTargetPositionBoard2 = null;
            //aiMovingBoard2 = false;
        }
        
        console.log("GAME OVER on Board 2!");
        
        // Check if both boards are game over
        if (isGameOver && isGameOverBoard2) {
            showGameOverScreen();
        }
        return;
    }
    
    // Generate the next piece
    const pieceTypes = Object.keys(PIECES) as PieceType[];
    nextPieceBoard2 = pieceTypes[Math.floor(Math.random() * pieceTypes.length)];
    
    // Update the preview display
    updateNextPiecePreview(2);
    
    console.log(`Board 2: Spawned piece: ${pieceType}, Next piece: ${nextPieceBoard2}`);
}
/**
 * Checks collision for board 2's current piece
 */
function checkCollisionBoard2(): boolean {
    if (!currentPieceBoard2) return false;
    
    for (let row = 0; row < currentPieceBoard2.shape.length; row++) {
        for (let col = 0; col < currentPieceBoard2.shape[row].length; col++) {
            if (!currentPieceBoard2.shape[row][col]) continue;
            
            const boardX = currentPieceBoard2.x + col;
            const boardY = currentPieceBoard2.y + row;
            
            if (boardX < 0 || boardX >= GRID_WIDTH || boardY >= GRID_HEIGHT) {
                return true;
            }
            
            if (boardY >= 0 && boardStateBoard2[boardY][boardX]) {
                return true;
            }
        }
    }
    return false;
}

    /**
     * Rotates a piece shape 90 degrees clockwise
     * We'll use this later for piece rotation
     * @param shape - The 2D array representing the piece
     * @returns A new 2D array that's the rotated version
     */
    function rotateShape(shape: number[][]): number[][] {
        // Get the size of the shape (assumes square matrix)
        const size = shape.length;
        
        // Create a new array for the rotated shape
        const rotated: number[][] = [];
        
        // Initialize the rotated array with empty rows
        for (let i = 0; i < size; i++) {
            rotated.push(new Array(size).fill(0));
        }
        
        // Rotation algorithm: 
        // To rotate 90° clockwise, the element at [row][col] moves to [col][size-1-row]
        for (let row = 0; row < size; row++) {
            for (let col = 0; col < size; col++) {
                rotated[col][size - 1 - row] = shape[row][col];
            }
        }
        
        return rotated;
    }

    // DRAWING FUNCTIONS - These functions handle all our visual rendering

    /**
 * Draws the main game board
 * This creates the black background with grey grid lines
 */
function drawBoard(): void {
    // Determine if we should use small size for board 1
    const useSmallSize = secondBoardUnlocked;
    const cellSize = useSmallSize ? CELL_SIZE_SMALL : CELL_SIZE;
    const padding = useSmallSize ? PADDING_SMALL : PADDING;
    const boardWidth = useSmallSize ? BOARD_WIDTH_SMALL : BOARD_WIDTH;
    const boardHeight = useSmallSize ? BOARD_HEIGHT_SMALL : BOARD_HEIGHT;
    
    // Resize canvas if needed (only happens once when board 2 is unlocked)
    if (useSmallSize && canvas.width !== boardWidth + (padding * 2)) {
        canvas.width = boardWidth + (padding * 2);
        canvas.height = boardHeight + (padding * 2);
    }
    
    // First, clear everything on the canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw the black background for the game board
    ctx.fillStyle = '#000000';
    ctx.fillRect(padding, padding, boardWidth, boardHeight);
    
    // Now draw the grid lines
    ctx.strokeStyle = '#3b3b3bff';
    ctx.lineWidth = 1;
    
    // Draw vertical lines (columns)
    for (let col = 0; col <= GRID_WIDTH; col++) {
        const x = padding + (col * cellSize);
        ctx.beginPath();
        ctx.moveTo(x, padding);
        ctx.lineTo(x, padding + boardHeight);
        ctx.stroke();
    }
    
    // Draw horizontal lines (rows)
    for (let row = 0; row <= GRID_HEIGHT; row++) {
        const y = padding + (row * cellSize);
        ctx.beginPath();
        ctx.moveTo(padding, y);
        ctx.lineTo(padding + boardWidth, y);
        ctx.stroke();
    }
    
    // Draw a border around the entire board
    ctx.strokeStyle = '#666666';
    ctx.lineWidth = 2;
    ctx.strokeRect(padding, padding, boardWidth, boardHeight);
}

    // PIECE DRAWING FUNCTIONS - These make our pieces visible on screen

    /**
 * Draws a single block
 * This is the building block (pun intended!) for drawing pieces
 * @param x - The x position in grid units (0-9 for our board)
 * @param y - The y position in grid units (0-19 for our board)
 * @param color - The color to fill this block with
 */
function drawBlock(x: number, y: number, color: string): void {
    // Use smaller cell size if board 2 is unlocked
    const useSmallSize = secondBoardUnlocked;
    const cellSize = useSmallSize ? CELL_SIZE_SMALL : CELL_SIZE;
    const padding = useSmallSize ? PADDING_SMALL : PADDING;
    
    // Convert grid coordinates to pixel coordinates
    const pixelX = padding + (x * cellSize);
    const pixelY = padding + (y * cellSize);
    
    // Set the fill color for this block
    ctx.fillStyle = color;
    
    // Draw the main block square
    ctx.fillRect(pixelX, pixelY, cellSize, cellSize);
    
    // Add a subtle 3D effect with borders
    // Lighter border on top and left (gives "raised" appearance)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = useSmallSize ? 1 : 2;  // Thinner lines for smaller blocks
    ctx.beginPath();
    ctx.moveTo(pixelX, pixelY + cellSize);
    ctx.lineTo(pixelX, pixelY);
    ctx.lineTo(pixelX + cellSize, pixelY);
    ctx.stroke();
    
    // Darker border on bottom and right (gives "shadow" appearance)
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.beginPath();
    ctx.moveTo(pixelX + cellSize, pixelY);
    ctx.lineTo(pixelX + cellSize, pixelY + cellSize);
    ctx.lineTo(pixelX, pixelY + cellSize);
    ctx.stroke();
}

    /**
     * Draws the currently falling piece
     * Goes through the piece's shape array and draws each block
     */
    function drawCurrentPiece(): void {
        // First check if there actually is a current piece
        if (!currentPiece) return;  // Exit early if no piece exists
        
        // Loop through each row of the piece's shape
        for (let row = 0; row < currentPiece.shape.length; row++) {
            // Loop through each column of the piece's shape
            for (let col = 0; col < currentPiece.shape[row].length; col++) {
                // Check if there's a block at this position (1 means block, 0 means empty)
                if (currentPiece.shape[row][col]) {
                    // Calculate where this block should be drawn on the board
                    // We add the piece's position to the block's position within the piece
                    const boardX = currentPiece.x + col;
                    const boardY = currentPiece.y + row;
                    
                    // Draw this block with the piece's color
                    drawBlock(boardX, boardY, currentPiece.color);
                }
            }
        }
    }

    /**
     * Draws all the locked pieces on the board
     * These are pieces that have already landed and can't move anymore
     */
    function drawBoardState(): void {
        // Loop through every cell in our board
        for (let row = 0; row < GRID_HEIGHT; row++) {
            for (let col = 0; col < GRID_WIDTH; col++) {
                // Check if there's a block at this position
                const blockColor = boardState[row][col];
                
                // If there's a color stored here, draw a block
                if (blockColor) {
                    drawBlock(col, row, blockColor);
                }
            }
        }
    }

    /**
 * Draws board 2's game board
 */
function drawBoard2(): void {
    const canvas2 = document.getElementById('game-canvas-2') as HTMLCanvasElement;
    if (!canvas2) return;
    
    const ctx2 = canvas2.getContext('2d');
    if (!ctx2) return;
    
    // Clear the canvas
    ctx2.clearRect(0, 0, canvas2.width, canvas2.height);
    
    // Draw background
    ctx2.fillStyle = '#000000';
    ctx2.fillRect(PADDING, PADDING, BOARD_WIDTH, BOARD_HEIGHT);
    
    // Draw grid lines
    ctx2.strokeStyle = '#3b3b3bff';
    ctx2.lineWidth = 1;
    
    // Vertical lines
    for (let col = 0; col <= GRID_WIDTH; col++) {
        const x = PADDING + (col * CELL_SIZE);
        ctx2.beginPath();
        ctx2.moveTo(x, PADDING);
        ctx2.lineTo(x, PADDING + BOARD_HEIGHT);
        ctx2.stroke();
    }
    
    // Horizontal lines
    for (let row = 0; row <= GRID_HEIGHT; row++) {
        const y = PADDING + (row * CELL_SIZE);
        ctx2.beginPath();
        ctx2.moveTo(PADDING, y);
        ctx2.lineTo(PADDING + BOARD_WIDTH, y);
        ctx2.stroke();
    }
    
    // Border
    ctx2.strokeStyle = '#666666';
    ctx2.lineWidth = 2;
    ctx2.strokeRect(PADDING, PADDING, BOARD_WIDTH, BOARD_HEIGHT);
}

/**
 * Draws a block on board 2
 */
function drawBlockBoard2(x: number, y: number, color: string): void {
    const canvas2 = document.getElementById('game-canvas-2') as HTMLCanvasElement;
    if (!canvas2) return;
    
    const ctx2 = canvas2.getContext('2d');
    if (!ctx2) return;
    
    const pixelX = PADDING + (x * CELL_SIZE);
    const pixelY = PADDING + (y * CELL_SIZE);
    
    // Main block
    ctx2.fillStyle = color;
    ctx2.fillRect(pixelX, pixelY, CELL_SIZE, CELL_SIZE);
    
    // 3D effect - light border
    ctx2.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx2.lineWidth = 2;
    ctx2.beginPath();
    ctx2.moveTo(pixelX, pixelY + CELL_SIZE);
    ctx2.lineTo(pixelX, pixelY);
    ctx2.lineTo(pixelX + CELL_SIZE, pixelY);
    ctx2.stroke();
    
    // 3D effect - dark border
    ctx2.strokeStyle = 'rgba(0, 0, 0, 0.3)';
    ctx2.beginPath();
    ctx2.moveTo(pixelX + CELL_SIZE, pixelY);
    ctx2.lineTo(pixelX + CELL_SIZE, pixelY + CELL_SIZE);
    ctx2.lineTo(pixelX, pixelY + CELL_SIZE);
    ctx2.stroke();
}

/**
 * Draws board 2's current piece
 */
function drawCurrentPieceBoard2(): void {
    if (!currentPieceBoard2) return;
    
    for (let row = 0; row < currentPieceBoard2.shape.length; row++) {
        for (let col = 0; col < currentPieceBoard2.shape[row].length; col++) {
            if (currentPieceBoard2.shape[row][col]) {
                const boardX = currentPieceBoard2.x + col;
                const boardY = currentPieceBoard2.y + row;
                drawBlockBoard2(boardX, boardY, currentPieceBoard2.color);
            }
        }
    }
}

/**
 * Draws board 2's locked pieces
 */
function drawBoardStateBoard2(): void {
    for (let row = 0; row < GRID_HEIGHT; row++) {
        for (let col = 0; col < GRID_WIDTH; col++) {
            const blockColor = boardStateBoard2[row][col];
            if (blockColor) {
                drawBlockBoard2(col, row, blockColor);
            }
        }
    }
}

    /**
     * Updates the next piece preview display
     * Now supports multiple boards
     */
    function updateNextPiecePreview(boardNumber: number = 1): void {
    const previewCanvas = document.getElementById(`next-piece-canvas-${boardNumber}`) as HTMLCanvasElement;
    
    // Determine which next piece to show
    const pieceToShow = boardNumber === 1 ? nextPiece : nextPieceBoard2;
    
    if (!previewCanvas || !pieceToShow) return;
    
    const previewCtx = previewCanvas.getContext('2d');
    if (!previewCtx) return;
    
    // Clear the preview canvas
    previewCtx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
    
    // Fill background
    previewCtx.fillStyle = '#000000';
    previewCtx.fillRect(0, 0, previewCanvas.width, previewCanvas.height);
    
    // Get the piece shape
    const shape = PIECES[pieceToShow];
    const color = PIECE_COLORS[pieceToShow];
        
        // Calculate centering offset
        const blockSize = 20;  // Smaller blocks for preview
        const shapeWidth = shape[0].length;
        const shapeHeight = shape.length;
        
        // Center the piece in the preview
        const offsetX = (previewCanvas.width - (shapeWidth * blockSize)) / 2;
        const offsetY = (previewCanvas.height - (shapeHeight * blockSize)) / 2;
        
        // Draw the piece
        for (let row = 0; row < shape.length; row++) {
            for (let col = 0; col < shape[row].length; col++) {
                if (shape[row][col]) {
                    const x = offsetX + (col * blockSize);
                    const y = offsetY + (row * blockSize);
                    
                    // Draw block
                    previewCtx.fillStyle = color;
                    previewCtx.fillRect(x, y, blockSize, blockSize);
                    
                    // Draw 3D effect borders
                    // Light border (top-left)
                    previewCtx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
                    previewCtx.lineWidth = 1;
                    previewCtx.beginPath();
                    previewCtx.moveTo(x, y + blockSize);
                    previewCtx.lineTo(x, y);
                    previewCtx.lineTo(x + blockSize, y);
                    previewCtx.stroke();
                    
                    // Dark border (bottom-right)
                    previewCtx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
                    previewCtx.beginPath();
                    previewCtx.moveTo(x + blockSize, y);
                    previewCtx.lineTo(x + blockSize, y + blockSize);
                    previewCtx.lineTo(x, y + blockSize);
                    previewCtx.stroke();
                }
            }
        }
        
        // Draw grid lines for style
        previewCtx.strokeStyle = '#333333';
        previewCtx.lineWidth = 0.5;
        previewCtx.strokeRect(0, 0, previewCanvas.width, previewCanvas.height);

        // Update buy I piece button state since next piece changed
        updateBuyIPieceButtonBoard(boardNumber);
    }

    // PIECE MOVEMENT FUNCTIONS - These handle how pieces fall and move

    /**
     * Moves the current piece down by one row
     * This is what makes pieces "fall"
     * @returns true if the move was successful, false if it hit something
     */
    function movePieceDown(): boolean {
        // Check if there's a piece to move
        if (!currentPiece) return false;
        
        // Try moving the piece down by incrementing its y position
        currentPiece.y++;
        
        // Check if this new position is valid (not colliding with anything)
        if (checkCollision()) {
            // Oops! The piece hit something. Move it back up
            currentPiece.y--;
            
            // The piece can't move down anymore, so we should lock it in place
            lockPiece();
            
            // Spawn a new piece for the player to control
            spawnNewPiece();
            
            // Return false to indicate the move failed
            return false;
        }
        
        // Move was successful!
        return true;
    }
    /**
     * Moves the current piece left or right
     * @param direction - Either -1 for left or 1 for right
     * @returns true if the move was successful
     */
    function movePieceHorizontally(direction: number): boolean {
        // Safety check
        if (!currentPiece) return false;
        
        // Store the original position in case we need to revert
        const originalX = currentPiece.x;
        
        // Move the piece in the specified direction
        currentPiece.x += direction;
        
        // Check if this new position is valid
        if (checkCollision()) {
            // Hit something! Revert the move
            currentPiece.x = originalX;
            return false;
        }
        
        // Move was successful
        return true;
    }

    /**
     * Rotates the current piece 90 degrees clockwise
     * Uses "wall kicks" - if rotation fails, tries nearby positions
     * @returns true if rotation was successful
     */
    function rotatePiece(): boolean {
        // Safety check
        if (!currentPiece) return false;
        
        // Don't rotate the O-piece (the square) - it looks the same in all orientations
        if (currentPiece.type === 'O') return false;
        
        // Store the original shape in case we need to revert
        const originalShape = currentPiece.shape;
        
        // Rotate the shape 90 degrees clockwise
        currentPiece.shape = rotateShape(currentPiece.shape);
        
        // Check if the rotated piece fits in its current position
        if (!checkCollision()) {
            // Rotation successful!
            return true;
        }
        
        // WALL KICKS - Try to find a nearby position where the piece fits
        // This makes the game feel better when rotating near walls
        
        // Try moving left
        currentPiece.x -= 1;
        if (!checkCollision()) return true;  // Found a valid position!
        
        // That didn't work, try moving right instead (2 spaces from original)
        currentPiece.x += 2;
        if (!checkCollision()) return true;
        
        // Try moving back to center but up one row
        currentPiece.x -= 1;  // Back to original X
        currentPiece.y -= 1;  // Up one row
        if (!checkCollision()) return true;
        
        // Nothing worked - revert everything
        currentPiece.y += 1;  // Back to original Y
        currentPiece.shape = originalShape;  // Back to original shape
        return false;
    }

    /**
     * Instantly drops the piece to the bottom (hard drop)
     * Gives players quick placement and usually bonus points
     */
    function hardDrop(): void {
        // Safety check
        if (!currentPiece) return;
        
        // Keep moving down until we hit something
        while (!checkCollision()) {
            currentPiece.y++;
        }
        
        // We went one step too far, move back up
        currentPiece.y--;
        
        // Lock the piece immediately
        lockPiece();
        
        // Spawn a new piece
        spawnNewPiece();
        
        // Reset the drop timer so the new piece doesn't immediately fall
        lastDropTime = performance.now();
    }

    /**
     * Checks if the current piece is colliding with walls, floor, or other pieces
     * This is crucial for game logic - pieces can't phase through things!
     * @returns true if there's a collision, false if position is valid
     */
    function checkCollision(): boolean {
        // Safety check
        if (!currentPiece) return false;
        
        // Check each block in the current piece
        for (let row = 0; row < currentPiece.shape.length; row++) {
            for (let col = 0; col < currentPiece.shape[row].length; col++) {
                // Skip empty spaces in the piece shape
                if (!currentPiece.shape[row][col]) continue;
                
                // Calculate where this block is on the board
                const boardX = currentPiece.x + col;
                const boardY = currentPiece.y + row;
                
                // Check if the block is outside the board boundaries
                // Left wall check
                if (boardX < 0) return true;
                
                // Right wall check
                if (boardX >= GRID_WIDTH) return true;
                
                // Floor check (bottom of board)
                if (boardY >= GRID_HEIGHT) return true;
                
                // Check if there's already a locked block at this position
                // We only check this if we're not above the board (during spawn)
                if (boardY >= 0 && boardState[boardY][boardX]) {
                    return true;
                }
            }
        }
        
        // No collision detected - the position is valid!
        return false;
    }

    /**
     * Locks the current piece in place on the board
     * Now also checks for line clears!
     */
    function lockPiece(): void {
        // Safety check
        if (!currentPiece) return;
        
        // Add each block of the piece to the board state
        for (let row = 0; row < currentPiece.shape.length; row++) {
            for (let col = 0; col < currentPiece.shape[row].length; col++) {
                // Only process actual blocks (not empty spaces)
                if (currentPiece.shape[row][col]) {
                    // Calculate board position
                    const boardX = currentPiece.x + col;
                    const boardY = currentPiece.y + row;
                    
                    // Make sure we're within bounds before locking
                    if (boardY >= 0) {
                        // Store this block's color in the board state
                        boardState[boardY][boardX] = currentPiece.color;
                    }
                }
            }
        }
        
        // Clear the current piece (it's now part of the board)
        currentPiece = null;
        
        // Check for and clear any completed lines
        clearLines();
    }

    /**
 * Moves board 2's piece down by one row
 */
function movePieceDownBoard2(): boolean {
    if (!currentPieceBoard2) return false;
    
    currentPieceBoard2.y++;
    
    if (checkCollisionBoard2()) {
        currentPieceBoard2.y--;
        lockPieceBoard2();
        spawnNewPieceBoard2();
        return false;
    }
    
    return true;
}

/**
 * Moves board 2's piece horizontally
 */
function movePieceHorizontallyBoard2(direction: number): boolean {
    if (!currentPieceBoard2) return false;
    
    const originalX = currentPieceBoard2.x;
    currentPieceBoard2.x += direction;
    
    if (checkCollisionBoard2()) {
        currentPieceBoard2.x = originalX;
        return false;
    }
    
    return true;
}

/**
 * Rotates board 2's piece
 */
function rotatePieceBoard2(): boolean {
    if (!currentPieceBoard2) return false;
    
    if (currentPieceBoard2.type === 'O') return false;
    
    const originalShape = currentPieceBoard2.shape;
    currentPieceBoard2.shape = rotateShape(currentPieceBoard2.shape);
    
    if (!checkCollisionBoard2()) {
        return true;
    }
    
    // Wall kicks
    currentPieceBoard2.x -= 1;
    if (!checkCollisionBoard2()) return true;
    
    currentPieceBoard2.x += 2;
    if (!checkCollisionBoard2()) return true;
    
    currentPieceBoard2.x -= 1;
    currentPieceBoard2.y -= 1;
    if (!checkCollisionBoard2()) return true;
    
    // Revert
    currentPieceBoard2.y += 1;
    currentPieceBoard2.shape = originalShape;
    return false;
}

/**
 * Hard drops board 2's piece
 */
function hardDropBoard2(): void {
    if (!currentPieceBoard2) return;
    
    while (!checkCollisionBoard2()) {
        currentPieceBoard2.y++;
    }
    
    currentPieceBoard2.y--;
    lockPieceBoard2();
    spawnNewPieceBoard2();
    lastDropTimeBoard2 = performance.now();
}

/**
 * Locks board 2's piece in place
 */
function lockPieceBoard2(): void {
    if (!currentPieceBoard2) return;
    
    for (let row = 0; row < currentPieceBoard2.shape.length; row++) {
        for (let col = 0; col < currentPieceBoard2.shape[row].length; col++) {
            if (currentPieceBoard2.shape[row][col]) {
                const boardX = currentPieceBoard2.x + col;
                const boardY = currentPieceBoard2.y + row;
                
                if (boardY >= 0) {
                    boardStateBoard2[boardY][boardX] = currentPieceBoard2.color;
                }
            }
        }
    }
    
    currentPieceBoard2 = null;
    clearLinesBoard2();
}

/**
 * Clears completed lines on board 2
 */
function clearLinesBoard2(): number {
    let linesCleared = 0;
    
    for (let row = GRID_HEIGHT - 1; row >= 0; row--) {
        let isLineFull = true;
        
        for (let col = 0; col < GRID_WIDTH; col++) {
            if (!boardStateBoard2[row][col]) {
                isLineFull = false;
                break;
            }
        }
        
        if (isLineFull) {
            boardStateBoard2.splice(row, 1);
            const newRow: (string | null)[] = new Array(GRID_WIDTH).fill(null);
            boardStateBoard2.unshift(newRow);
            linesCleared++;
            row++;  // Check the same row again
        }
    }
    
    if (linesCleared > 0) {
        console.log(`Board 2: Cleared ${linesCleared} line(s)!`);
        
        // Add to global points
        points += linesCleared;
        totalLinesClearedBoard2 += linesCleared;
        
        // Update displays
        updatePointsDisplay();
        
        // Update board 2's lines display
        const board2LinesElement = document.getElementById('board-2-lines');
        if (board2LinesElement) {
            board2LinesElement.textContent = totalLinesClearedBoard2.toString();
        }
        
        // Flash effect for board 2
        const canvas2 = document.getElementById('game-canvas-2') as HTMLCanvasElement;
        if (canvas2) {
            const originalFilter = canvas2.style.filter;
            const brightness = 1 + (linesCleared * 0.3);
            canvas2.style.filter = `brightness(${brightness})`;
            setTimeout(() => {
                canvas2.style.filter = originalFilter;
            }, 200);
        }
    }
    
    return linesCleared;
}

    /**
     * Checks for and clears any completed lines
     * This is the core scoring mechanic of Idletris!
     * @returns The number of lines cleared
     */
    function clearLines(): number {
        // Keep track of how many lines we clear
        let linesCleared = 0;
        
        // Check each row from bottom to top
        // We go bottom-up because we'll be removing rows
        for (let row = GRID_HEIGHT - 1; row >= 0; row--) {
            // Check if this row is completely filled
            let isLineFull = true;
            
            for (let col = 0; col < GRID_WIDTH; col++) {
                // If any cell in this row is empty, the line isn't full
                if (!boardState[row][col]) {
                    isLineFull = false;
                    break;  // No need to check rest of row
                }
            }
            
            // If the line is full, clear it!
            if (isLineFull) {
                // Remove this row from the board
                boardState.splice(row, 1);
                
                // Add a new empty row at the top
                // This makes everything above "fall down"
                const newRow: (string | null)[] = new Array(GRID_WIDTH).fill(null);
                boardState.unshift(newRow);  // unshift adds to beginning of array
                
                // Count this cleared line
                linesCleared++;
                
                // Check the same row again since everything shifted down
                // (The row that was above is now at this index)
                row++;  // This will get decremented by the loop, keeping us at same index
            }
        }
        
        // Log cleared lines for debugging (we'll add scoring later)
        if (linesCleared > 0) {
            console.log(`Cleared ${linesCleared} line${linesCleared > 1 ? 's' : ''}!`);
            
            // Add points (1 point per line)
            addPoints(linesCleared);
            
            // Add a visual flash effect when lines clear
            flashEffect(linesCleared);
        }
        
        return linesCleared;
    }

    /**
     * Updates the points display on screen
     * Now updates the global points in the header
     */
    function updatePointsDisplay(): void {
        // Update the global points value in header
        const globalPointsElement = document.getElementById('global-points-value');
        if (globalPointsElement) {
            globalPointsElement.textContent = points.toString();
        }
        
        // Update board 1 lines
        const board1LinesElement = document.getElementById('board-1-lines');
        if (board1LinesElement) {
            board1LinesElement.textContent = totalLinesCleared.toString();
        }
        
        // Update all the buttons
        updateGlobalHardDropButton();
        updateUnlockSecondBoardButton();
        updateBoard1Buttons();
    }

    /**
     * Updates the global hard drop button in the header
     */
    function updateGlobalHardDropButton(): void {
        const hardDropButton = document.getElementById('global-harddrop-button') as HTMLButtonElement;
        if (!hardDropButton) return;
        
        if (hardDropUnlocked) {
            // Already purchased - show as disabled
            hardDropButton.textContent = 'Hard Drop ✓';
            hardDropButton.style.display = 'block';
            hardDropButton.style.backgroundColor = '#888888';
            hardDropButton.style.cursor = 'default';
            hardDropButton.disabled = true;
        } else if (points >= HARD_DROP_COST) {
            // Player has enough points - show available button
            hardDropButton.style.display = 'block';
            hardDropButton.style.backgroundColor = '#2196F3';
            hardDropButton.style.cursor = 'pointer';
            hardDropButton.disabled = false;
        } else {
            // Not enough points - hide button
            hardDropButton.style.display = 'none';
        }
    }

    /**
     * Updates the unlock second board button visibility
     */
    function updateUnlockSecondBoardButton(): void {
        const unlockButton = document.getElementById('unlock-second-board-button') as HTMLButtonElement;
        if (!unlockButton) return;
        
        // Check if requirements are met and board not already unlocked
        if (!secondBoardUnlocked && checkSecondBoardRequirements()) {
            if (points >= UNLOCK_SECOND_BOARD_COST) {
                // Can unlock - show button
                unlockButton.style.display = 'block';
                unlockButton.style.backgroundColor = '#FF5722';
                unlockButton.style.cursor = 'pointer';
                unlockButton.disabled = false;
            } else {
                // Requirements met but not enough points - show disabled
                unlockButton.style.display = 'block';
                unlockButton.style.backgroundColor = '#888888';
                unlockButton.style.cursor = 'not-allowed';
                unlockButton.disabled = true;
                unlockButton.textContent = `Unlock 2nd Board (need ${UNLOCK_SECOND_BOARD_COST} pts)`;
            }
        } else if (secondBoardUnlocked) {
            // Already unlocked - hide button
            unlockButton.style.display = 'none';
        } else {
            // Requirements not met - hide button
            unlockButton.style.display = 'none';
        }
    }

    /**
     * Updates all board 1 specific buttons
     */
    function updateBoard1Buttons(): void {
        updateBuyIPieceButtonBoard(1);
        updateAIButtonBoard(1);
        updateAIHardDropButtonBoard(1);
        updateAISpeedButtonBoard(1);
    }

    /**
     * Generic function to update buy I piece button for a specific board
     */
    function updateBuyIPieceButtonBoard(boardNumber: number): void {
        const buyIPieceButton = document.getElementById(`buy-i-piece-button-${boardNumber}`) as HTMLButtonElement;
        if (!buyIPieceButton) return;
        
        // For now, only board 1 logic (board 2 will be added when we create it)
        if (boardNumber === 1) {
            const isNextPieceI = nextPiece === 'I';
            
            if (points >= BUY_I_PIECE_COST && !isNextPieceI) {
                buyIPieceButton.style.display = 'block';
                buyIPieceButton.style.backgroundColor = '#9C27B0';
                buyIPieceButton.style.cursor = 'pointer';
                buyIPieceButton.disabled = false;
                buyIPieceButton.textContent = `Buy 'I' Piece (${BUY_I_PIECE_COST} pts)`;
            } else if (points >= BUY_I_PIECE_COST && isNextPieceI) {
                buyIPieceButton.style.display = 'block';
                buyIPieceButton.style.backgroundColor = '#888888';
                buyIPieceButton.style.cursor = 'not-allowed';
                buyIPieceButton.disabled = true;
                buyIPieceButton.textContent = `Next is 'I'`;
            } else {
                buyIPieceButton.style.display = 'none';
            }
        }
    }

    /**
     * Generic function to update AI button for a specific board
     */
    function updateAIButtonBoard(boardNumber: number): void {
        const aiButton = document.getElementById(`ai-button-${boardNumber}`) as HTMLButtonElement;
        if (!aiButton) return;
        
        // For now, only board 1 logic
        if (boardNumber === 1) {
            if (aiPlayerHired && aiEnabled) {
                aiButton.textContent = '🤖 AI Active';
                aiButton.style.display = 'block';
                aiButton.style.backgroundColor = '#888888';
                aiButton.style.cursor = 'default';
                aiButton.disabled = true;
            } else if (points >= AI_PLAYER_COST && !aiPlayerHired) {
                aiButton.style.display = 'block';
                aiButton.style.backgroundColor = '#4CAF50';
                aiButton.style.cursor = 'pointer';
                aiButton.disabled = false;
                aiButton.textContent = `Hire AI (${AI_PLAYER_COST} pts)`;
            } else {
                aiButton.style.display = 'none';
            }
        }
    }

    /**
     * Updates AI hard drop button for a specific board
     */
    function updateAIHardDropButtonBoard(boardNumber: number): void {
        const aiHardDropButton = document.getElementById(`ai-harddrop-button-${boardNumber}`) as HTMLButtonElement;
        if (!aiHardDropButton) return;
        
        if (boardNumber === 1) {
            if (!aiPlayerHired) {
                aiHardDropButton.style.display = 'none';
            } else if (aiHardDropUnlocked) {
                aiHardDropButton.textContent = 'AI Hard Drop ✓';
                aiHardDropButton.style.display = 'block';
                aiHardDropButton.style.backgroundColor = '#888888';
                aiHardDropButton.style.cursor = 'default';
                aiHardDropButton.disabled = true;
            } else if (points >= AI_HARD_DROP_COST) {
                aiHardDropButton.style.display = 'block';
                aiHardDropButton.style.backgroundColor = '#FF9800';
                aiHardDropButton.style.cursor = 'pointer';
                aiHardDropButton.disabled = false;
            } else {
                aiHardDropButton.style.display = 'none';
            }
        }
    }

    /**
     * Updates AI speed button for a specific board
     */
    function updateAISpeedButtonBoard(boardNumber: number): void {
        const aiSpeedButton = document.getElementById(`ai-speed-button-${boardNumber}`) as HTMLButtonElement;
        if (!aiSpeedButton) return;
        
        if (boardNumber === 1) {
            if (!aiPlayerHired) {
                aiSpeedButton.style.display = 'none';
            } else if (aiSpeedLevel >= MAX_AI_SPEED_UPGRADES) {
                aiSpeedButton.textContent = 'AI Speed MAX ✓';
                aiSpeedButton.style.display = 'block';
                aiSpeedButton.style.backgroundColor = '#888888';
                aiSpeedButton.style.cursor = 'default';
                aiSpeedButton.disabled = true;
            } else if (points >= AI_SPEED_UPGRADE_COST) {
                aiSpeedButton.style.display = 'block';
                aiSpeedButton.style.backgroundColor = '#00BCD4';
                aiSpeedButton.style.cursor = 'pointer';
                aiSpeedButton.disabled = false;
                aiSpeedButton.textContent = `AI Speed Lv${aiSpeedLevel + 1} (${AI_SPEED_UPGRADE_COST} pts)`;
            } else {
                aiSpeedButton.style.display = 'none';
            }
        }
    }

    /**
     * Adds points when lines are cleared
     * @param linesCleared - Number of lines that were cleared
     */
    function addPoints(linesCleared: number): void {
        // Each line cleared gives 1 point
        points += linesCleared;
        totalLinesCleared += linesCleared;
        
        // Update the display
        updatePointsDisplay();
        
        // Log for debugging
        console.log(`Earned ${linesCleared} point${linesCleared > 1 ? 's' : ''}! Total points: ${points}`);
        
        // Show a floating points animation
        showPointsAnimation(linesCleared);
    }

    /**
     * Shows a floating "+X points" animation when earning points
     * @param pointsEarned - Number of points that were earned
     */
    function showPointsAnimation(pointsEarned: number): void {
        // Create a temporary div for the animation
        const floater = document.createElement('div');
        floater.textContent = `+${pointsEarned} point${pointsEarned > 1 ? 's' : ''}!`;
        
        // Style the floating text
        floater.style.position = 'fixed';
        floater.style.left = '50%';
        floater.style.top = '50%';
        floater.style.transform = 'translateX(-50%)';
        floater.style.color = '#4CAF50';
        floater.style.fontSize = '28px';
        floater.style.fontWeight = 'bold';
        floater.style.textShadow = '2px 2px 4px rgba(0,0,0,0.8)';
        floater.style.zIndex = '2000';
        floater.style.pointerEvents = 'none';  // Can't click on it
        floater.style.animation = 'floatUp 1.5s ease-out forwards';
        
        // Add the float animation if it doesn't exist
        if (!document.getElementById('float-animation')) {
            const style = document.createElement('style');
            style.id = 'float-animation';
            style.textContent = `
                @keyframes floatUp {
                    0% { 
                        opacity: 1; 
                        transform: translateX(-50%) translateY(0);
                    }
                    100% { 
                        opacity: 0; 
                        transform: translateX(-50%) translateY(-100px);
                    }
                }
            `;
            document.head.appendChild(style);
        }
        
        // Add to page
        document.body.appendChild(floater);
        
        // Remove after animation completes
        setTimeout(() => {
            floater.remove();
        }, 1500);
    }

    /**
     * Handles hiring the AI player
     */
    function hireAIPlayer(): void {
        // Check if player has enough points
        if (points < AI_PLAYER_COST) {
            console.log("Not enough points!");
            return;
        }
        
        // Deduct the points
        points -= AI_PLAYER_COST;
        
        // Mark AI as hired and ENABLE IT
        aiPlayerHired = true;
        aiEnabled = true;  // Turn on the AI
        // Update board status to show AI control
        updateBoardStatus(1);
        
        // Update the display
        updatePointsDisplay();
        
        // Show success message
        console.log("AI Player hired and activated!");
        
        // Show a special effect
        const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
        if (canvas) {
            canvas.style.transition = 'box-shadow 0.5s ease';
            canvas.style.boxShadow = '0 0 40px rgba(76,175,80,0.8)';
            
            setTimeout(() => {
                canvas.style.boxShadow = '0 0 20px rgba(0,0,0,0.3)';
            }, 500);
        }
    }

    /**
     * Updates the board status display (Player/AI control)
     */
    function updateBoardStatus(boardNumber: number): void {
        const statusSection = document.getElementById(`board-${boardNumber}-status`);
        if (!statusSection) return;
        
        if (boardNumber === 1 && aiEnabled) {
            statusSection.style.backgroundColor = 'rgba(255, 152, 0, 0.2)';
            statusSection.innerHTML = '<span>🤖 AI Control</span>';
        } else {
            statusSection.style.backgroundColor = 'rgba(76, 175, 80, 0.2)';
            statusSection.innerHTML = '<span>🎮 Player Control</span>';
        }
    }

    /**
     * Handles purchasing the Hard Drop upgrade
     * Unlocks spacebar control permanently
     */
    function purchaseHardDrop(): void {
        // Check if player has enough points
        if (points < HARD_DROP_COST) {
            console.log("Not enough points for Hard Drop!");
            return;
        }
        
        // Deduct the points
        points -= HARD_DROP_COST;
        
        // Unlock hard drop
        hardDropUnlocked = true;
        
        // Update the display
        updatePointsDisplay();
        updateGlobalHardDropButton();
        
        // Update the controls display to show spacebar is now available
        updateControlsDisplay();
        
        // Show success message
        console.log("Hard Drop unlocked! You can now use spacebar.");
        
        // Visual feedback
        const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
        if (canvas) {
            canvas.style.transition = 'box-shadow 0.5s ease';
            canvas.style.boxShadow = '0 0 40px rgba(33,150,243,0.8)';
            
            setTimeout(() => {
                canvas.style.boxShadow = '0 0 20px rgba(0,0,0,0.3)';
            }, 500);
        }
    }



    /**
     * Updates the controls display in the header
     */
    function updateControlsDisplay(): void {
        const spaceControlText = document.getElementById('space-control-text');
        if (!spaceControlText) return;
        
        if (hardDropUnlocked) {
            spaceControlText.style.opacity = '1';
            spaceControlText.style.color = '#4CAF50';
            spaceControlText.innerHTML = 'Space : Hard Drop ✓';
        } else {
            spaceControlText.style.opacity = '0.5';
            spaceControlText.style.color = '#aaa';
            spaceControlText.innerHTML = 'Space : Locked';
        }
    }
    /**
     * Unlocks the second game board
     * Creates a whole new independent game instance
     */
    function unlockSecondBoard(): void {
        // Check requirements
        if (!checkSecondBoardRequirements()) {
            console.log("Requirements not met for second board!");
            return;
        }
        
        // Check if player has enough points
        if (points < UNLOCK_SECOND_BOARD_COST) {
            console.log("Not enough points for second board!");
            return;
        }
        
        // Deduct points
        points -= UNLOCK_SECOND_BOARD_COST;
        
        // Set flag
        secondBoardUnlocked = true;
        
        // Create the second board
        console.log("Second board unlocked! Creating board 2...");
        
        // Update displays
        updatePointsDisplay();
        
        /* Visual feedback - epic unlock animation!
        const gameContainer = document.getElementById('game-container');
        if (gameContainer) {
            gameContainer.style.transition = 'transform 0.5s ease';
            gameContainer.style.transform = 'translateX(-50%) scale(1.05)';
            
            setTimeout(() => {
                gameContainer.style.transform = 'translateX(-50%) scale(1)';
            }, 500);
        } */
        
        createSecondBoard();
    }

    /**
 * Creates the second game board and its UI
 */
function createSecondBoard(): void {
    // Get the game container
    const gameContainer = document.getElementById('game-container');
    if (!gameContainer) return;
    
    // Create board 2 container
    const board2Container = document.createElement('div');
    board2Container.id = 'board-2-container';
    board2Container.style.display = 'flex';
    board2Container.style.gap = '20px';
    
    // Create the canvas for board 2
    const canvas2 = document.createElement('canvas');
    canvas2.id = 'game-canvas-2';
    canvas2.width = BOARD_WIDTH + (PADDING * 2);
    canvas2.height = BOARD_HEIGHT + (PADDING * 2);
    
    // Add canvas to container
    board2Container.appendChild(canvas2);
    
    // Add to game container
    gameContainer.appendChild(board2Container);
    
    // Create the UI for board 2
    createBoardUI(2);
    
    // Create upgrade buttons for board 2
    createBoardUpgradeButtons(2);
    
    // Initialize board 2's game state
    initializeBoardState(2);
    
    // Spawn first piece for board 2
    spawnNewPieceBoard2();
    
    // Update board 2 status to show player control
    updateBoardStatus(2);
    
    // Board 1 becomes AI-controlled when board 2 is created
    activePlayerBoard = 2;  // Player now controls board 2
    
    // Make sure board 1's AI stays active
    if (!aiEnabled) {
        aiEnabled = true;
        updateBoardStatus(1);
    }
    
    console.log("Board 2 created! Player now controls board 2, AI controls board 1.");
    }
    // AI PLAYER FUNCTIONS

    /**
     * Evaluates a board state and returns a score
     * Higher scores mean better positions
     * This is the "brain" of our AI - it decides what's good or bad
     */
    function evaluateBoardState(testBoard: (string | null)[][]): number {
        let score = 0;
        
        // Factor 1: Aggregate Height (lower is better)
        // We penalize tall stacks because they're risky
        let totalHeight = 0;
        let heights: number[] = [];  // Track individual column heights
        for (let col = 0; col < GRID_WIDTH; col++) {
            let columnHeight = 0;
            for (let row = 0; row < GRID_HEIGHT; row++) {
                if (testBoard[row][col]) {
                    columnHeight = GRID_HEIGHT - row;
                    totalHeight += columnHeight;
                    break;  // Found the highest block in this column
                }
            }
            heights.push(columnHeight);
        }
        score -= totalHeight * 0.5;  // Penalty for height
        
        // Factor 2: Complete Lines (more is better)
        // Reward the AI for completing lines
        let completeLines = 0;
        for (let row = 0; row < GRID_HEIGHT; row++) {
            let isComplete = true;
            for (let col = 0; col < GRID_WIDTH; col++) {
                if (!testBoard[row][col]) {
                    isComplete = false;
                    break;
                }
            }
            if (isComplete) completeLines++;
        }
        score += completeLines * 100;  // Big bonus for completing lines!
        
        // Factor 3: Holes (fewer is better)
        // Count empty cells that have filled cells above them
        let holes = 0;
        for (let col = 0; col < GRID_WIDTH; col++) {
            let foundBlock = false;
            for (let row = 0; row < GRID_HEIGHT; row++) {
                if (testBoard[row][col]) {
                    foundBlock = true;
                } else if (foundBlock) {
                    holes++;  // Empty cell below a filled cell = hole
                }
            }
        }
        score -= holes * 30;  // Big penalty for creating holes
        
        // Factor 4: Bumpiness (smoother is better)
        // Measure the difference in height between adjacent columns
        let bumpiness = 0;
        for (let col = 1; col < heights.length; col++) {
            bumpiness += Math.abs(heights[col] - heights[col - 1]);
        }
        score -= bumpiness * 1;  // Small penalty for uneven surfaces
        
        // Factor 5: Wall bonus (NEW!)
        // Give a small bonus for pieces touching walls to encourage using full width
        let wallBonus = 0;
        for (let row = 0; row < GRID_HEIGHT; row++) {
            if (testBoard[row][0]) wallBonus += 0.5;  // Left wall
            if (testBoard[row][GRID_WIDTH - 1]) wallBonus += 0.5;  // Right wall
        }
        score += wallBonus;
        
        // Factor 6: Empty column penalty (NEW!)
        // Heavily penalize leaving columns completely empty
        let emptyColumns = 0;
        for (let col = 0; col < GRID_WIDTH; col++) {
            let columnEmpty = true;
            for (let row = 0; row < GRID_HEIGHT; row++) {
                if (testBoard[row][col]) {
                    columnEmpty = false;
                    break;
                }
            }
            if (columnEmpty) emptyColumns++;
        }
        // Only penalize empty columns if the board has a reasonable amount of pieces
        if (totalHeight > 20) {  // If we have some pieces on the board
            score -= emptyColumns * 10;  // Penalty for empty columns
        }
        
        return score;
    }

    function resetSecondBoard(): void {
    // Remove board 2 container from the DOM
    const board2Container = document.getElementById('board-2-container');
    if (board2Container && board2Container.parentElement) {
        board2Container.parentElement.removeChild(board2Container);
    }

    // Reset all board 2 state
    currentPieceBoard2 = null;
    boardStateBoard2 = [];
    isGameOverBoard2 = false;
    nextPieceBoard2 = null;
    totalLinesClearedBoard2 = 0;

    // Reset board 2 AI + timing
    //aiPlayerHiredBoard2 = false;
    aiEnabledBoard2 = false;
    //aiHardDropUnlockedBoard2 = false;
    //aiSpeedLevelBoard2 = 0;
    //aiSpeedBoard2 = BASE_AI_SPEED;
    //aiLastMoveTimeBoard2 = 0;
    //aiTargetPositionBoard2 = null;
    //aiMovingBoard2 = false;
    lastDropTimeBoard2 = 0;

    // Mark second board as locked again
    secondBoardUnlocked = false;
}


    /**
     * Simulates dropping a piece at a specific position
     * Returns the resulting board state for evaluation
     */
    function simulateMove(piece: ActivePiece, targetX: number, rotation: number): (string | null)[][] | null {
        // Create a deep copy of the current board
        const testBoard = boardState.map(row => [...row]);
        
        // Apply rotations to get the desired shape
        let testShape = piece.shape;
        for (let r = 0; r < rotation; r++) {
            testShape = rotateShape(testShape);
        }
        
        // Create a test piece at the target position
        const testPiece: ActivePiece = {
            type: piece.type,
            shape: testShape,
            x: targetX,
            y: 0,
            color: piece.color
        };
        
        // Check if initial position is valid
        if (checkCollisionForTest(testPiece, testBoard)) {
            return null;  // Can't place piece here
        }
        
        // Drop the piece down until it hits something
        while (!checkCollisionForTest(testPiece, testBoard)) {
            testPiece.y++;
        }
        testPiece.y--;  // Back up one step
        
        // Lock the piece into the test board
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

    /**
     * Check collision for testing (doesn't modify the actual game state)
     */
    function checkCollisionForTest(piece: ActivePiece, testBoard: (string | null)[][]): boolean {
        for (let row = 0; row < piece.shape.length; row++) {
            for (let col = 0; col < piece.shape[row].length; col++) {
                if (!piece.shape[row][col]) continue;
                
                const boardX = piece.x + col;
                const boardY = piece.y + row;
                
                // Check boundaries
                if (boardX < 0 || boardX >= GRID_WIDTH || boardY >= GRID_HEIGHT) {
                    return true;
                }
                
                // Check collision with locked pieces
                if (boardY >= 0 && testBoard[boardY][boardX]) {
                    return true;
                }
            }
        }
        return false;
    }

    /**
     * Main AI decision function
     * Determines the best position and rotation for the current piece
     */
    function calculateBestMove(): { x: number, rotation: number } | null {
        if (!currentPiece) return null;
        
        let bestScore = -Infinity;
        let bestMove = null;
        
        // Try all possible rotations (0-3)
        const maxRotations = currentPiece.type === 'O' ? 1 : 4;  // O piece doesn't need rotation
        
        for (let rotation = 0; rotation < maxRotations; rotation++) {
            // Get the shape after rotation
            let testShape = currentPiece.shape;
            for (let r = 0; r < rotation; r++) {
                testShape = rotateShape(testShape);
            }
            
            // Find the actual bounds of the piece (ignoring empty rows/columns)
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
            
            // Try all possible x positions - INCLUDING negative positions for pieces with offset
            // This allows pieces to go all the way to the walls
            for (let x = -leftOffset; x <= GRID_WIDTH - actualWidth - leftOffset; x++) {
                // Simulate this move
                const resultBoard = simulateMove(currentPiece, x, rotation);
                
                if (resultBoard) {
                    // Evaluate how good this position is
                    const score = evaluateBoardState(resultBoard);
                    
                    // Is this the best move so far?
                    if (score > bestScore) {
                        bestScore = score;
                        bestMove = { x, rotation };
                    }
                }
            }
        }
        
        // If no valid move was found, just drop at current position
        if (!bestMove) {
            console.log("AI: No valid moves found, dropping at current position");
            bestMove = { x: currentPiece.x, rotation: 0 };
        }
        
        console.log(`AI found best move: x=${bestMove.x}, rotation=${bestMove.rotation}, score=${bestScore.toFixed(2)}`);
        return bestMove;
    }

    /**
     * Executes the AI's planned move step by step
     * Makes the AI look more natural by moving pieces gradually
     */
    function executeAIMove(): void {
        if (!currentPiece || !aiTargetPosition || !aiEnabled) return;
        
        // First, check if we need to rotate
        // We'll track how many times we've rotated to avoid infinite loops
        if (!currentPiece.hasOwnProperty('aiRotations')) {
            (currentPiece as any).aiRotations = 0;
        }
        
        const currentRotations = (currentPiece as any).aiRotations;
        const targetRotation = aiTargetPosition.rotation;
        
        // Step 1: Rotate to target rotation (if needed)
        if (currentRotations < targetRotation) {
            if (rotatePiece()) {
                (currentPiece as any).aiRotations++;
            } else {
                // Can't rotate, skip to movement
                (currentPiece as any).aiRotations = targetRotation;
            }
            return;  // Exit early, we'll continue next frame
        }
        
        // Step 2: Move horizontally to target position
        const currentX = currentPiece.x;
        const targetX = aiTargetPosition.x;
        
        if (currentX !== targetX) {
            const direction = targetX > currentX ? 1 : -1;
            
            // Try to move horizontally
            if (!movePieceHorizontally(direction)) {
                // Can't move horizontally, might be blocked
                // Just drop the piece where it is
                console.log("AI: Can't reach target position, dropping here");
                movePieceDown();
                aiTargetPosition = null;
                aiMoving = false;
            }
            return;  // Exit early, continue next frame
        }
        
        // Step 3: We're in position! Drop the piece
    if (aiHardDropUnlocked) {
        // AI has hard drop - instantly place the piece
        hardDrop();
    } else {
        // AI doesn't have hard drop - move down one row at a time
        movePieceDown();
    }
        
        // Clear the target since we've reached it
        aiTargetPosition = null;
        aiMoving = false;
    }

    /**
     * Main AI control function
     * Called every frame to manage AI behavior
     */
    function updateAI(currentTime: number): void {
        // Check if AI should be active
        if (!aiEnabled || !currentPiece) return;
        
        // Safety check: if a piece has been active for too long, just drop it
        if (!currentPiece.hasOwnProperty('aiStartTime')) {
            (currentPiece as any).aiStartTime = currentTime;
        }
        
        const pieceAge = currentTime - (currentPiece as any).aiStartTime;
        if (pieceAge > 5000) {  // 5 seconds timeout
            console.log("AI: Piece timeout, forcing drop");
            movePieceDown();
            aiTargetPosition = null;
            aiMoving = false;
            return;
        }
        
        // If AI doesn't have a target, calculate one
        if (!aiTargetPosition && !aiMoving) {
            aiTargetPosition = calculateBestMove();
            aiMoving = true;
            
            // If no valid move found, just drop the piece
            if (!aiTargetPosition) {
                movePieceDown();
                aiMoving = false;
                return;
            }
        }
        
        // Execute moves at AI speed
        if (currentTime - aiLastMoveTime > aiSpeed) {
            executeAIMove();
            aiLastMoveTime = currentTime;
        }
    }

    /**
     * Checks if the game is over (pieces reached the top)
     * @returns true if game is over
     
    function checkGameOver(): boolean {
        // Check if there are any blocks in the top row
        for (let col = 0; col < GRID_WIDTH; col++) {
            if (boardState[0][col]) {
                return true;  // Game over!
            }
        }
        return false;
    } */

    /**
     * Creates a brief visual effect when lines are cleared
     * This gives satisfying feedback to the player
     * @param linesCleared - Number of lines that were cleared
     */
    function flashEffect(linesCleared: number): void {
        // Save the current canvas filter
        const originalFilter = canvas.style.filter;
        
        // Apply a brightness filter based on lines cleared
        // More lines = brighter flash
        const brightness = 1 + (linesCleared * 0.3);
        canvas.style.filter = `brightness(${brightness})`;
        
        // Remove the effect after a short delay
        setTimeout(() => {
            canvas.style.filter = originalFilter;
        }, 200);  // Flash lasts 200 milliseconds
    }


    /**
     * Handles keyboard input for controlling pieces
     * This is what makes the game interactive!
     */
    document.addEventListener('keydown', (event: KeyboardEvent) => {
    // Determine which board to control based on activePlayerBoard
    const boardToControl = secondBoardUnlocked ? activePlayerBoard : 1;
    
    // Don't allow input if the controlled board is game over
    if (boardToControl === 1 && isGameOver) return;
    if (boardToControl === 2 && isGameOverBoard2) return;
    
    // Don't allow control if AI is controlling this board
    if (boardToControl === 1 && aiEnabled) return;
    if (boardToControl === 2 && aiEnabledBoard2) return;
    
    // Get the current piece for the active board
    const piece = boardToControl === 1 ? currentPiece : currentPieceBoard2;
    if (!piece) return;
    
    // Prevent default browser behaviors
    if (['ArrowLeft', 'ArrowRight', 'ArrowDown', 'ArrowUp', ' '].includes(event.key)) {
        event.preventDefault();
    }
    
    // Handle controls for the active board
    if (boardToControl === 1) {
        switch(event.key) {
            case 'ArrowLeft':
                movePieceHorizontally(-1);
                break;
            case 'ArrowRight':
                movePieceHorizontally(1);
                break;
            case 'ArrowDown':
                movePieceDown();
                lastDropTime = performance.now();
                break;
            case 'ArrowUp':
                rotatePiece();
                break;
            case ' ':
                if (hardDropUnlocked) {
                    hardDrop();
                }
                break;
        }
    } else if (boardToControl === 2) {
        switch(event.key) {
            case 'ArrowLeft':
                movePieceHorizontallyBoard2(-1);
                break;
            case 'ArrowRight':
                movePieceHorizontallyBoard2(1);
                break;
            case 'ArrowDown':
                movePieceDownBoard2();
                lastDropTimeBoard2 = performance.now();
                break;
            case 'ArrowUp':
                rotatePieceBoard2();
                break;
            case ' ':
                if (hardDropUnlocked) {
                    hardDropBoard2();
                }
                break;
        }
    }
});

    /**
     * The main game loop that runs every frame
     * Now handles drawing everything, making pieces fall, and AI control!
     * @param currentTime - The current timestamp (provided by requestAnimationFrame)
     */
    /**
     * The main game loop that runs every frame
     * Handles drawing, piece falling, and AI control
     * Stops running when game is over
     * @param currentTime - The current timestamp (provided by requestAnimationFrame)
     */
    function gameLoop(currentTime: number = 0): void {
    // BOARD 1 LOGIC
    if (!isGameOver) {
        if (aiEnabled) {
            updateAI(currentTime);
        } else {
            const timeSinceDrop = currentTime - lastDropTime;
            if (timeSinceDrop > DROP_SPEED) {
                movePieceDown();
                lastDropTime = currentTime;
            }
        }
    }
    
    // BOARD 2 LOGIC (if it exists)
    if (secondBoardUnlocked && !isGameOverBoard2) {
        if (aiEnabledBoard2) {
            // Board 2 AI logic would go here (not implemented yet)
        } else {
            // Player controls board 2
            const timeSinceDropBoard2 = currentTime - lastDropTimeBoard2;
            if (timeSinceDropBoard2 > DROP_SPEED) {
                movePieceDownBoard2();
                lastDropTimeBoard2 = currentTime;
            }
        }
    }
    
    // DRAWING BOARD 1
    drawBoard();
    drawBoardState();
    if (!isGameOver) {
        drawCurrentPiece();
    }
    
    // DRAWING BOARD 2 (if it exists)
    if (secondBoardUnlocked) {
        drawBoard2();
        drawBoardStateBoard2();
        if (!isGameOverBoard2) {
            drawCurrentPieceBoard2();
        }
    }
    
    requestAnimationFrame(gameLoop);
}



    // Call initializeBoard when the game starts
    // Add this right before your gameLoop() call at the bottom
    initializeBoard();

    // For testing: spawn a piece (but it won't appear yet since we're not drawing it)
    // Add this right after initializeBoard();
    spawnNewPiece();
    // START THE GAME
    // This kicks off our game loop for the first time
    gameLoop();