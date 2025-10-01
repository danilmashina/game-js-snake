const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Элементы интерфейса
const scoreElement = document.getElementById('score');
const highScoreElement = document.getElementById('highScore');
const levelElement = document.getElementById('level');
const startScreen = document.getElementById('startScreen');
const pauseScreen = document.getElementById('pauseScreen');
const gameOverScreen = document.getElementById('gameOverScreen');
const startButton = document.getElementById('startButton');
const restartButton = document.getElementById('restartButton');
const menuButton = document.getElementById('menuButton');
const pauseBtn = document.getElementById('pauseBtn');
const resumeButton = document.getElementById('resumeButton');
const soundBtn = document.getElementById('soundBtn');
const finalScore = document.getElementById('finalScore');
const finalHighScore = document.getElementById('finalHighScore');
const finalLevel = document.getElementById('finalLevel');
const newRecordMessage = document.getElementById('newRecordMessage');
const mobileControls = document.querySelectorAll('.control-btn');
const modeButtons = document.querySelectorAll('.mode-btn');

// Игровые константы
const gridSize = 20;
const tileCount = canvas.width / gridSize;

// Игровые переменные
let snake = [{ x: 10, y: 10 }];
let direction = { x: 0, y: 0 };
let nextDirection = { x: 0, y: 0 };
let food = { x: 15, y: 15, type: 'normal' };
let obstacles = [];
let score = 0;
let highScore = localStorage.getItem('snakeHighScore') || 0;
let level = 1;
let gameSpeed = 100;
let gameRunning = false;
let gamePaused = false;
let gameStarted = false;
let soundEnabled = true;
let gameMode = 'classic';
let speedBoost = false;
let speedBoostTimer = 0;
let slowDown = false;
let slowDownTimer = 0;

// Типы еды
const foodTypes = {
    normal: { color: '#ff6b6b', points: 10, chance: 0.7 },
    golden: { color: '#ffd700', points: 30, chance: 0.15 },
    speed: { color: '#4ecdc4', points: 10, chance: 0.075 },
    slow: { color: '#95e1d3', points: 10, chance: 0.075 }
};

// Инициализация
highScoreElement.textContent = highScore;

// Функция для создания препятствий
function createObstacles() {
    obstacles = [];
    const obstacleCount = 5 + level;
    for (let i = 0; i < obstacleCount; i++) {
        let obstacle;
        let valid = false;
        let attempts = 0;
        
        while (!valid && attempts < 50) {
            obstacle = {
                x: Math.floor(Math.random() * tileCount),
                y: Math.floor(Math.random() * tileCount)
            };
            
            valid = true;
            for (let segment of snake) {
                if (segment.x === obstacle.x && segment.y === obstacle.y) {
                    valid = false;
                    break;
                }
            }
            if (food.x === obstacle.x && food.y === obstacle.y) {
                valid = false;
            }
            for (let obs of obstacles) {
                if (obs.x === obstacle.x && obs.y === obstacle.y) {
                    valid = false;
                    break;
                }
            }
            attempts++;
        }
        
        if (valid) {
            obstacles.push(obstacle);
        }
    }
}

// Функция для размещения еды
function placeFood() {
    const random = Math.random();
    let foodType = 'normal';
    let cumulativeChance = 0;
    
    for (let type in foodTypes) {
        cumulativeChance += foodTypes[type].chance;
        if (random <= cumulativeChance) {
            foodType = type;
            break;
        }
    }
    
    let validPosition = false;
    let attempts = 0;
    
    while (!validPosition && attempts < 100) {
        food.x = Math.floor(Math.random() * tileCount);
        food.y = Math.floor(Math.random() * tileCount);
        food.type = foodType;
        
        validPosition = true;
        
        for (let segment of snake) {
            if (segment.x === food.x && segment.y === food.y) {
                validPosition = false;
                break;
            }
        }
        
        if (gameMode === 'obstacles') {
            for (let obstacle of obstacles) {
                if (obstacle.x === food.x && obstacle.y === food.y) {
                    validPosition = false;
                    break;
                }
            }
        }
        
        attempts++;
    }
}

// Функция отрисовки игры
function drawGame() {
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.strokeStyle = 'rgba(78, 205, 196, 0.1)';
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= tileCount; i++) {
        ctx.beginPath();
        ctx.moveTo(i * gridSize, 0);
        ctx.lineTo(i * gridSize, canvas.height);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, i * gridSize);
        ctx.lineTo(canvas.width, i * gridSize);
        ctx.stroke();
    }
    
    if (gameMode === 'obstacles') {
        ctx.fillStyle = '#ff6b6b';
        ctx.shadowColor = '#ff6b6b';
        ctx.shadowBlur = 10;
        obstacles.forEach(obstacle => {
            ctx.fillRect(
                obstacle.x * gridSize + 1,
                obstacle.y * gridSize + 1,
                gridSize - 2,
                gridSize - 2
            );
        });
        ctx.shadowBlur = 0;
    }
    
    const foodColor = foodTypes[food.type].color;
    ctx.fillStyle = foodColor;
    ctx.shadowColor = foodColor;
    ctx.shadowBlur = 15;
    
    const pulse = Math.sin(Date.now() / 200) * 2;
    ctx.fillRect(
        food.x * gridSize + 1 - pulse/2,
        food.y * gridSize + 1 - pulse/2,
        gridSize - 2 + pulse,
        gridSize - 2 + pulse
    );
    ctx.shadowBlur = 0;
    
    snake.forEach((segment, index) => {
        if (index === 0) {
            ctx.fillStyle = speedBoost ? '#00ff00' : (slowDown ? '#ff9800' : '#4ecdc4');
            ctx.shadowColor = speedBoost ? '#00ff00' : (slowDown ? '#ff9800' : '#4ecdc4');
        } else {
            ctx.fillStyle = '#44a08d';
            ctx.shadowColor = '#44a08d';
        }
        
        ctx.shadowBlur = 10;
        const offset = index === 0 ? 0 : 1;
        ctx.fillRect(
            segment.x * gridSize + offset,
            segment.y * gridSize + offset,
            gridSize - offset * 2,
            gridSize - offset * 2
        );
    });
    ctx.shadowBlur = 0;
}

// Функция обновления змейки
function updateSnake() {
    direction = { ...nextDirection };
    
    const head = { x: snake[0].x + direction.x, y: snake[0].y + direction.y };
    
    if (gameMode === 'portal') {
        if (head.x < 0) head.x = tileCount - 1;
        if (head.x >= tileCount) head.x = 0;
        if (head.y < 0) head.y = tileCount - 1;
        if (head.y >= tileCount) head.y = 0;
    }
    
    snake.unshift(head);
    
    if (head.x === food.x && head.y === food.y) {
        const points = foodTypes[food.type].points;
        score += points;
        scoreElement.textContent = score;
        
        if (food.type === 'speed') {
            speedBoost = true;
            speedBoostTimer = 180;
        } else if (food.type === 'slow') {
            slowDown = true;
            slowDownTimer = 180;
        }
        
        createParticles(food.x * gridSize, food.y * gridSize, foodTypes[food.type].color);
        placeFood();
        
        if (score >= level * 50) {
            level++;
            levelElement.textContent = level;
            if (gameMode === 'obstacles') {
                createObstacles();
            }
            gameSpeed = Math.max(50, 100 - (level - 1) * 5);
        }
        
        if (soundEnabled) playEatSound();
    } else {
        snake.pop();
    }
}

// Проверка столкновений
function checkCollision() {
    const head = snake[0];
    
    if (gameMode !== 'portal') {
        if (head.x < 0 || head.x >= tileCount || head.y < 0 || head.y >= tileCount) {
            return true;
        }
    }
    
    for (let i = 1; i < snake.length; i++) {
        if (head.x === snake[i].x && head.y === snake[i].y) {
            return true;
        }
    }
    
    if (gameMode === 'obstacles') {
        for (let obstacle of obstacles) {
            if (head.x === obstacle.x && head.y === obstacle.y) {
                return true;
            }
        }
    }
    
    return false;
}

// Главный игровой цикл
function gameLoop() {
    if (!gameRunning || gamePaused) {
        requestAnimationFrame(gameLoop);
        return;
    }
    
    updateSnake();
    
    if (checkCollision()) {
        gameOver();
        return;
    }
    
    drawGame();
    
    if (speedBoostTimer > 0) {
        speedBoostTimer--;
        if (speedBoostTimer === 0) speedBoost = false;
    }
    if (slowDownTimer > 0) {
        slowDownTimer--;
        if (slowDownTimer === 0) slowDown = false;
    }
    
    const currentSpeed = speedBoost ? gameSpeed / 2 : (slowDown ? gameSpeed * 1.5 : gameSpeed);
    setTimeout(() => requestAnimationFrame(gameLoop), currentSpeed);
}

// Функция Game Over
function gameOver() {
    gameRunning = false;
    
    if (score > highScore) {
        highScore = score;
        localStorage.setItem('snakeHighScore', highScore);
        newRecordMessage.classList.remove('hidden');
    } else {
        newRecordMessage.classList.add('hidden');
    }
    
    finalScore.textContent = score;
    finalHighScore.textContent = highScore;
    finalLevel.textContent = level;
    
    gameOverScreen.classList.remove('hidden');
    
    if (soundEnabled) playGameOverSound();
}

// Функция сброса игры
function resetGame() {
    snake = [{ x: 10, y: 10 }];
    direction = { x: 0, y: 0 };
    nextDirection = { x: 0, y: 0 };
    score = 0;
    level = 1;
    gameSpeed = 100;
    speedBoost = false;
    speedBoostTimer = 0;
    slowDown = false;
    slowDownTimer = 0;
    
    scoreElement.textContent = score;
    levelElement.textContent = level;
    
    if (gameMode === 'obstacles') {
        createObstacles();
    } else {
        obstacles = [];
    }
    
    placeFood();
}

// Функция старта игры
function startGame() {
    resetGame();
    gameRunning = true;
    gamePaused = false;
    gameStarted = true;
    startScreen.classList.add('hidden');
    pauseScreen.classList.add('hidden');
    gameOverScreen.classList.add('hidden');
    gameLoop();
}

// Функция паузы
function togglePause() {
    if (!gameStarted || !gameRunning) return;
    
    gamePaused = !gamePaused;
    if (gamePaused) {
        pauseScreen.classList.remove('hidden');
    } else {
        pauseScreen.classList.add('hidden');
        gameLoop();
    }
}

// ИСПРАВЛЕНО: Управление клавиатурой с корректными названиями клавиш
document.addEventListener('keydown', (e) => {
    // Предотвращаем стандартное поведение для клавиш управления
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyW', 'KeyA', 'KeyS', 'KeyD', 'Space'].includes(e.code)) {
        e.preventDefault();
    }
    
    if (e.code === 'Space' || e.key === 'Escape') {
        if (!gameStarted) {
            startGame();
        } else {
            togglePause();
        }
        return;
    }
    
    if (!gameRunning || gamePaused) return;
    
    // Используем e.code для более надежного определения клавиш
    switch (e.code) {
        case 'ArrowUp':
        case 'KeyW':
            if (direction.y === 0) nextDirection = { x: 0, y: -1 };
            break;
        case 'ArrowDown':
        case 'KeyS':
            if (direction.y === 0) nextDirection = { x: 0, y: 1 };
            break;
        case 'ArrowLeft':
        case 'KeyA':
            if (direction.x === 0) nextDirection = { x: -1, y: 0 };
            break;
        case 'ArrowRight':
        case 'KeyD':
            if (direction.x === 0) nextDirection = { x: 1, y: 0 };
            break;
    }
});

// Обработчики кнопок
startButton.addEventListener('click', startGame);
restartButton.addEventListener('click', startGame);
resumeButton.addEventListener('click', togglePause);
pauseBtn.addEventListener('click', togglePause);

menuButton.addEventListener('click', () => {
    gameRunning = false;
    gamePaused = false;
    gameStarted = false;
    gameOverScreen.classList.add('hidden');
    startScreen.classList.remove('hidden');
});

soundBtn.addEventListener('click', () => {
    soundEnabled = !soundEnabled;
    soundBtn.textContent = soundEnabled ? '🔊 ЗВУК' : '🔇 ЗВУК';
});

// Выбор режима игры
modeButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        modeButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        gameMode = btn.dataset.mode;
    });
});

// Мобильное управление
mobileControls.forEach(btn => {
    btn.addEventListener('click', () => {
        if (!gameRunning || gamePaused) return;
        
        const dir = btn.dataset.direction;
        switch (dir) {
            case 'up':
                if (direction.y === 0) nextDirection = { x: 0, y: -1 };
                break;
            case 'down':
                if (direction.y === 0) nextDirection = { x: 0, y: 1 };
                break;
            case 'left':
                if (direction.x === 0) nextDirection = { x: -1, y: 0 };
                break;
            case 'right':
                if (direction.x === 0) nextDirection = { x: 1, y: 0 };
                break;
        }
    });
});

// Функция создания частиц
function createParticles(x, y, color) {
    const particleContainer = document.getElementById('particles');
    const particleCount = 15;
    
    for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        particle.style.left = x + 'px';
        particle.style.top = y + 'px';
        particle.style.background = color;
        
        const angle = (Math.PI * 2 * i) / particleCount;
        const velocity = 50 + Math.random() * 50;
        const tx = Math.cos(angle) * velocity;
        const ty = Math.sin(angle) * velocity;
        
        particle.style.setProperty('--tx', tx + 'px');
        particle.style.setProperty('--ty', ty + 'px');
        
        particleContainer.appendChild(particle);
        
        setTimeout(() => particle.remove(), 1000);
    }
}

// Звуковые эффекты
function playEatSound() {
    try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        
        oscillator.frequency.value = 800;
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
        
        oscillator.start(audioCtx.currentTime);
        oscillator.stop(audioCtx.currentTime + 0.1);
    } catch (e) {
        // Звук не поддерживается
    }
}

function playGameOverSound() {
    try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        
        oscillator.frequency.value = 200;
        oscillator.type = 'sawtooth';
        
        gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
        
        oscillator.start(audioCtx.currentTime);
        oscillator.stop(audioCtx.currentTime + 0.5);
    } catch (e) {
        // Звук не поддерживается
    }
}

// Инициализация игры
drawGame();