const shapes = [
    [
        [0,0,0,0],
        [1,1,1,1],
        [0,0,0,0],
        [0,0,0,0]
    ],
    [
        [0,0,1,0],
        [0,0,1,0],
        [0,0,1,0],
        [0,0,1,0]
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
    'white',
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
    r: 'restart'
};

const grid_width = block_size * grid_cols;
const grid_height = block_size * grid_rows;

const sidebar_width = block_size * sidebar_width_blocks;
const sidebar_content_x = grid_width + sidebar_border + block_size;
const sidebar_content_y = block_size;

const canvas_width = grid_width + sidebar_width + sidebar_border;
const canvas_height = grid_height;

const block_empty = -1;

function initCanvas(){
    const canvas = document.getElementById('tetris');
    canvas.width = canvas_width;
    canvas.height = canvas_height;
    canvas.style.visibility = 'visible';

    return canvas.getContext('2d');
}

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

function update(state, inputs, dt){
    if(state.isGameOver){
        if(inputs.restart){
            Object.assign(state, getInitialState());
        }
        return;
    }

    // Handle inputs and update game state
    // (This function will be implemented in the next steps)
}

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
    ctx.fillStyle = block_bg;
    ctx.fillRect(0, 0, canvas_width, canvas_height);

    const { grid, currentPiece, nextShapeId } = state;

    for(let i = 0; i < grid.length; i++){
        for(let j = 0; j < grid[0].length; j++){
            const colorId = grid[i][j];

            const color = colorId === block_empty ? color_empty_block : colors[shapeId];
            
            drawBlock(ctx, color, j * block_size, i * block_size);
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

function collectInputs(inputs){
    function handleKeyEvent(e, inputValue){
        if(e.repeat) return;

        const inputType = keyMap[e.key];
        if(inputType){
            inputs[inputType] = inputValue;
        }
    }

    window.addEventListener('keydown', (e) => handleKeyEvent(e, true));

    window.addEventListener('keyup', (e) => handleKeyEvent(e, false));
}

function main(){
    const ctx = initCanvas();
    const state = getInitialState();
    const inputs = {};

    collectInputs(inputs);

    state.isGameOver = true;

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

main();