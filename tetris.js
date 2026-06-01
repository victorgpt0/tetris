// Configs, Constants and Global Variables
const shapes = [
    [
        [0,0,0,0],
        [1,1,1,1],
        [0,0,0,0],
        [0,0,0,0]
    ],
    [
        [1,0,0],
        [1,1,1],
        [0,0,0]
    ],
    [
        [0,0,1],
        [1,1,1],
        [0,0,0]
    ],
    [
        [1,1],
        [1,1]
    ],
    [
        [0,1,1],
        [1,1,0],
        [0,0,0]
    ],
    [
        [1,1,1],
        [0,1,0],
        [0,0,0]
    ],
    [
        [1,1,0],
        [0,1,1],
        [0,0,0]
    ],
];

const colors = [
    'cyan',
    'blue',
    'orange',
    'yellow',
    'green',
    'purple',
    'red'
];

const color_sidebar_border = '#ddd';
const color_empty_block = '#343434';
const color_game_over_overlay = '#000000bb';
const color_font = '#fff';

const block_size = 46;
const block_bg = '#292929';

const gravity_speed = 1;
const gravity_acceleration = 0.00001;
const gravity_threshold = 1000;

const grid_cols = 10;
const grid_rows = 20;

const sidebar_border = 20;
const sidebar_width_blocks = 6;

const max_dt = 100;

const keyMap = {
    ArrowLeft: 'moveLeft',
    ArrowRight: 'moveRight',
    ArrowDown: 'moveDown',
    ArrowUp: 'rotate',
    ' ': 'drop',
    r: 'restart',
    Escape: 'pause'
};

const grid_width = block_size * grid_cols;
const grid_height = block_size * grid_rows;

const sidebar_width = block_size * sidebar_width_blocks;
const sidebar_content_x = grid_width + sidebar_border + block_size;
const sidebar_content_y = block_size;

const canvas_width = grid_width + sidebar_width + sidebar_border;
const canvas_height = grid_height;

const block_empty = -1;

const INPUT_STATE_INITIAL = 0;
const INPUT_STATE_ACTIVE = 1;     // <--- Added this to fix the ReferenceError!
const INPUT_STATE_CHARGING = 2;
const INPUT_STATE_REPEATING = 3;
const INPUT_REPEAT_THRESHOLD = 200; // ms before a key starts repeating
const INPUT_REPEAT_INTERVAL = 50;   // ms velocity of repeat inputs

const buttons = [
    { label: '◀', input: 'moveLeft', x: sidebar_content_x, y: block_size * 9, w: 70, h: 60, color: '#555' },
    { label: '▶', input: 'moveRight', x: sidebar_content_x + 70, y: block_size * 9, w: 70, h: 60, color: '#555' },
    { label: '▼', input: 'moveDown', x: sidebar_content_x + 35, y: block_size * 10, w: 70, h: 60, color: '#555' },
    { label: '↻', input: 'rotate', x: sidebar_content_x, y: block_size * 12, w: 70, h: 70, color: '#555' },
    { label: '↧', input: 'drop', x: sidebar_content_x + 70, y: block_size * 12, w: 70, h: 70, color: '#555' },
    { label: 'Pause',   input: 'pause',   x: sidebar_content_x,    y: block_size * 16, w: 150, h: 50, color: '#f39c12' },
    { label: 'Restart', input: 'restart', x: sidebar_content_x,    y: block_size * 17.5, w: 150, h: 50, color: '#d33' }
];


// 1. APPLICATION STAGE (CPU Game Logic, Physics, and Memory Matrices)
// This updates our positional tracking vectors, handles time-step physics (gravity), 
// and manipulates abstract coordinate grids stored purely in internal computer RAM.

function update(state, inputs, dt){
    if(state.isGameOver){
        if(inputs.restart || inputs.moveLeft || inputs.moveRight || inputs.moveDown || inputs.rotate || inputs.drop || inputs.pause){
            Object.assign(state, getInitialState());
            Object.keys(inputs).forEach(key => inputs[key] = undefined);
        }
        return;
    }

    if(handleInputState(inputs.pause, dt)){
        state.isPaused = !state.isPaused;
        inputs.pause = undefined; // Reset pause input to prevent immediate re-toggling
    }

    if(state.isPaused) return;

    updateCurrentPiece(state, inputs, dt);
    updateGravity(state, dt);
}

function moveCurrentPiece(grid,currentPiece, dx, dy){
    const {shape, position} = currentPiece;
    const {x, y} = position;
    const canMove = canGridFitShape(grid, shape, x + dx, y + dy);

    if(canMove) {
        position.x += dx;
        position.y += dy;
    }

    return canMove;
}

function clearFullLines(grid){
    let linesCleared = 0;

    for(let i = grid.length - 1; i >= 0; i--){
        if(grid[i].every(cell => cell !== block_empty)){
            grid.splice(i, 1);
            grid.unshift(Array(grid[0].length).fill(block_empty));
            linesCleared++;
            i++;
        }
    }

    return linesCleared;
}

function updateCurrentPiece(state, inputs, dt){
    const { grid, currentPiece } = state;

    const isInputActive = (inputType) => handleInputState(inputs[inputType], dt);

    if(isInputActive('moveLeft')){
        moveCurrentPiece(grid, currentPiece, -1, 0);
    }
    if(isInputActive('moveRight')){
        moveCurrentPiece(grid, currentPiece, 1, 0);
    }
    if(isInputActive('moveDown')){
        moveCurrentPiece(grid, currentPiece, 0, 1);
    }
    if(isInputActive('rotate')){
        rotateCurrentPiece(state);
    }
    if(isInputActive('drop')){
        while(moveCurrentPieceDown(state)){}
    }
}

function handleCurrentPieceLanding(state){
    attachToGrid(state.grid, state.currentPiece);
    const linesCleared = clearFullLines(state.grid);

    if(linesCleared > 0){
        state.score += linesCleared * 100;
    }

    const newShapeId = state.nextShapeId;
    state.currentPiece = createCurrentPiece(newShapeId);
    state.nextShapeId = getRandomShapeId();

    if(!canGridFitShape(state.grid, state.currentPiece.shape, state.currentPiece.position.x, state.currentPiece.position.y)){
        state.isGameOver = true;
    }
}

function moveCurrentPieceDown(state){
    state.gravity.progress = 0;

    const canMoveDown = moveCurrentPiece(state.grid, state.currentPiece, 0, 1);

    if(!canMoveDown){
        handleCurrentPieceLanding(state);
    }

    return canMoveDown;
}

function canGridFitShape(grid, shape, shapeX, shapeY){
    return shape.every((row, i) => {
        const gridY = shapeY + i;
        
        return row.every((isSolid, j) => {
            if(!isSolid) return true;

            if(gridY >= grid.length) return false;

            const gridX = shapeX + j;
            if(gridX < 0 || gridX >= grid[0].length) return false;
            
            return grid[gridY][gridX] === block_empty;
        });
    });
}

function attachToGrid(grid, currentPiece){
    const {shape, shapeId, position} = currentPiece;
    const {x, y} = position;

    shape.forEach((row, i) => {
        row.forEach((isSolid, j) => {
            if(isSolid){
                grid[y + i][x + j] = shapeId;
            }
        });
    });
}

function handleInputState(input, dt){
    if(!input){
        return false;
    }

    input.timer += dt;

    switch(input.state){
        case INPUT_STATE_INITIAL:
            input.state = INPUT_STATE_ACTIVE;
            return true;
        
        case INPUT_STATE_CHARGING:
            const isCharged = input.timer >= INPUT_REPEAT_THRESHOLD;
            if(isCharged){
                input.state = INPUT_STATE_REPEATING;
                input.timer = 0;
            }

            return isCharged;

        case INPUT_STATE_REPEATING:
            const shouldRepeat = input.timer >= INPUT_REPEAT_INTERVAL;
            if(shouldRepeat){
                input.timer = 0;
            }

            return shouldRepeat;
    }

}

function updateGravity(state, dt){
    state.gravity.speed += gravity_acceleration * dt;
    state.gravity.progress += state.gravity.speed * dt;


    if(state.gravity.progress >= gravity_threshold){
        moveCurrentPieceDown(state);
    }
}

function resetGameState(state){
    Object.assign(state, getInitialState());
}

// 2. GEOMETRY STAGE (Coordinate Transforms & Matrix Rotations)
// Translates abstract, localized data definitions into screen coordinate domains.
// Example: Multiplying array index configurations by 'block_size' vectors to find exact pixel points.

function rotate(shape){
    return Array.from({ length: shape[0].length }, (_, i) =>
        shape.map(row => row[i]).reverse()
    );
}

function rotateCurrentPiece(state){
    const { grid, currentPiece } = state;
    const rotatedShape = rotate(currentPiece.shape);

    if(canGridFitShape(grid, rotatedShape, currentPiece.position.x, currentPiece.position.y)){
        currentPiece.shape = rotatedShape;
    }
}

// 3. RASTERIZATION STAGE (Converting Vectors to Screen Frame Pixels via GPU)
// Communicates with WebGL / HTML Canvas drawing rendering contexts. 
// Instructs hardware processors to map mathematical vector bounding regions directly to colored physical pixels.

function drawBlock(ctx, x, y, color){
    ctx.fillStyle = color;
    ctx.fillRect(x+1, y+1, block_size-1, block_size-1);
}

function drawShape(ctx, shape, colorId, x, y){
    const color = colors[colorId];

    for(let i = 0; i < shape.length; i++){
        for(let j = 0; j < shape[i].length; j++){
            if(shape[i][j]){
                drawBlock(ctx, x + j * block_size, y + i * block_size, color);
            }
        }
    }
}

function render(ctx, state){
    ctx.clearRect(0, 0, canvas_width, canvas_height);
    ctx.fillStyle = block_bg;
    ctx.fillRect(0, 0, canvas_width, canvas_height);

    const { grid, currentPiece, nextShapeId } = state;

    for(let i = 0; i < grid.length; i++){
        for(let j = 0; j < grid[0].length; j++){
            const colorId = grid[i][j];

            const color = colorId === block_empty ? color_empty_block : colors[colorId];
            
            drawBlock(ctx, j * block_size, i * block_size, color);
        }
    }

    drawShape(
        ctx, 
        currentPiece.shape, 
        currentPiece.shapeId,
        currentPiece.position.x * block_size,
        currentPiece.position.y * block_size
    );

     drawShape(
        ctx, 
        shapes[nextShapeId], 
        nextShapeId,
        sidebar_content_x,
        block_size
    );

    ctx.fillStyle = color_sidebar_border;
    ctx.fillRect(grid_width, 0, sidebar_border, canvas_height);

    ctx.font = 'bold 32px monospace';
    ctx.fillStyle = color_font;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    const score = `${state.score}`.padStart(6, '0');
    ctx.fillText('Score', sidebar_content_x, sidebar_content_y + 5 * block_size);
    ctx.fillText(score, sidebar_content_x, sidebar_content_y + 6 * block_size);

    buttons.forEach(btn => {
        ctx.fillStyle = btn.color;
        ctx.fillRect(btn.x, btn.y, btn.w, btn.h);

        ctx.strokeStyle = btn.color;
        ctx.lineWidth = 2;
        ctx.strokeRect(btn.x, btn.y, btn.w, btn.h);

        ctx.fillStyle = color_font;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = 'bold 20px monospace';
        ctx.fillText(btn.label, btn.x + btn.w / 2, btn.y + btn.h / 2);
    });

    if(state.isPaused){
        ctx.fillStyle = color_game_over_overlay;
        ctx.fillRect(0, 0, grid_width, grid_height);

        ctx.fillStyle = color_font;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = 'bold 48px monospace';
        ctx.fillText('PAUSED', grid_width / 2, grid_height / 2);
    }

    if(state.isGameOver){
        ctx.fillStyle = color_game_over_overlay;
        ctx.fillRect(0, 0, grid_width, grid_height);

        ctx.fillStyle = color_font;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = 'bold 48px monospace';
        ctx.fillText('GAME OVER', grid_width / 2, grid_height / 2 - block_size);
        ctx.font = 'bold 24px monospace';
        ctx.fillText('Press r to Restart', grid_width / 2, grid_height / 2 + block_size);
    }

}


// 4. Initialization and Main Game Loop
// Sets up our HTML canvas and starts the recursive 'requestAnimationFrame' loop that drives our game updates and renders.

function getRandomIndex(n){
    return Math.floor(Math.random() * n);
}

function getRandomShapeId(){
    return getRandomIndex(shapes.length);
}

function createCurrentPiece(shapeId){
    const shape = shapes[shapeId];
    return {
        shapeId,
        shape,
        position: {
            x: getRandomIndex(grid_cols - shape[0].length + 1),
            y: 0
        }
    };
}

function getInitialState(){
    const initialShapeId = getRandomShapeId();

    return {
        isGameOver: false,
        isPaused: false,
        score: 0,
        gravity: {
            progress: 0,
            speed: gravity_speed
        },
        currentPiece: createCurrentPiece(initialShapeId),
        nextShapeId: getRandomShapeId(),
        grid: Array.from({ length: grid_rows }, () => Array(grid_cols).fill(block_empty))
    };
}   

function initCanvas(){
    const canvas = document.getElementById('tetris');
    canvas.width = canvas_width;
    canvas.height = canvas_height;
    canvas.style.visibility = 'visible';

    return canvas.getContext('2d');
}


function collectInputs(inputs, ctx){
    function handleKeyEvent(e, inputValue){
        if(e.repeat) return;

        const inputType = keyMap[e.key];
        if(inputType){
            inputs[inputType] = inputValue;
        }
    }

    window.addEventListener('keydown', (e) => handleKeyEvent(e, {state: INPUT_STATE_INITIAL, timer: 0}));

    window.addEventListener('keyup', (e) => handleKeyEvent(e, undefined));

    function handlePointerDown(clientX, clientY){
        const rect = ctx.canvas.getBoundingClientRect();
        const scaleX = ctx.canvas.width / rect.width;
        const scaleY = ctx.canvas.height / rect.height;
        const x = (clientX - rect.left) * scaleX;
        const y = (clientY - rect.top) * scaleY;

        const btn = buttons.find(b => 
            x >= b.x && x <= b.x + b.w &&
            y >= b.y && y <= b.y + b.h
        );

        if(btn){
            inputs[btn.input] = {state: INPUT_STATE_INITIAL, timer: 0};
        }
    }

    window.addEventListener('pointerdown', (e) => handlePointerDown(e.clientX, e.clientY));

    function handlePointerUp() {
        buttons.forEach(btn => {
            inputs[btn.input] = undefined;
        });
    }

    window.addEventListener('touchstart', (e) => {
            e.preventDefault(); // Prevents mobile browser from double-tapping zoom behavior
            const touch = e.touches[0];
            handlePointerDown(touch.clientX, touch.clientY);
    }, { passive: false });

    window.addEventListener('touchend', () => {
        handlePointerUp();
    });
}

function main(){
    const ctx = initCanvas();
    const state = getInitialState();
    const inputs = {};

    collectInputs(inputs, ctx);

    // state.isGameOver = true;

    let previousTime = performance.now();

    function gameLoop(currentTime){
        const dt = Math.min(currentTime - previousTime, max_dt);
        previousTime = currentTime;

        update(state, inputs, dt);
        render(ctx, state);

        requestAnimationFrame(gameLoop);
    }

    requestAnimationFrame(gameLoop);

}

// Start the game
main();