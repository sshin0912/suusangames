// ゲーム基本設定
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// 物理パラメータ
const BIRD_HEIGHT = 30;
const BIRD_WIDTH = 35;
const JUMP_FORCE = -300;
const GRAVITY = 900;
const MAX_FALL_SPEED = 450;
const PIPE_WIDTH = 36;
const PIPE_CAP_HEIGHT = 25;
const BASE_PIPE_SPEED = 2;
const MIN_TAP_INTERVAL = 100;

// 間隔設定（110-170pxのランダム）
const MIN_GAP_SIZE = 110;
const MAX_GAP_SIZE = 170;

// ゲーム状態
let gameState = 'nameInput';
let gameStartTime = 0;
let lastTapTime = 0;
let distance = 0;
let bestDistance = 0;
let playerName = '';
let ranking = [];
let countdownValue = 3;
let countdownStartTime = 0;
let currentSpeed = BASE_PIPE_SPEED;
let pauseStartTime = 0;

// 鳥オブジェクト
const bird = {
    x: 100,
    y: canvas.height / 2,
    velocityY: 0,
    rotation: 0,
    flapAnimation: 0
};

// 障害物配列
let obstacles = [];
let clouds = [];
let effects = [];

// スピードアップと間隔調整関数（50mごと）
function getCurrentSpeed() {
    const speedMultiplier = 1 + Math.floor(distance / 50) * 0.1; // 50mごとに10%アップ
    return BASE_PIPE_SPEED * speedMultiplier;
}
function getGapSize() {
    const baseGap = Math.random() * (MAX_GAP_SIZE - MIN_GAP_SIZE) + MIN_GAP_SIZE;
    const gapIncrease = Math.floor(distance / 50) * 5; // 50mごとに5pxずつ広げる
    return baseGap + gapIncrease;
}

// 一時停止機能
function togglePause() {
    if (gameState === 'playing') {
        gameState = 'paused';
        pauseStartTime = Date.now();
        document.getElementById('pauseButton').textContent = '▶️';
        addEffect(canvas.width / 2, canvas.height / 2, '一時停止', '#FF69B4');
    } else if (gameState === 'paused') {
        gameState = 'playing';
        const pauseDuration = Date.now() - pauseStartTime;
        countdownStartTime += pauseDuration;
        gameStartTime += pauseDuration;
        document.getElementById('pauseButton').textContent = '⏸️';
        addEffect(canvas.width / 2, canvas.height / 2, '再開！', '#90EE90');
    }
}

// 雲の初期化
function initClouds() {
    clouds = [];
    for (let i = 0; i < 8; i++) {
        clouds.push({
            x: Math.random() * canvas.width * 2,
            y: Math.random() * canvas.height * 0.6,
            size: Math.random() * 40 + 20,
            speed: Math.random() * 0.5 + 0.2,
            opacity: Math.random() * 0.3 + 0.1
        });
    }
}

// エフェクト追加
function addEffect(x, y, text, color = '#FFD700') {
    effects.push({
        x: x,
        y: y,
        text: text,
        color: color,
        opacity: 1,
        life: 60,
        velocityY: -2
    });
}

// 障害物生成
function createObstacle() {
    const gapSize = getGapSize();
    const topPipeHeight = Math.random() * (canvas.height - gapSize - 100) + 50;
    const bottomPipeY = topPipeHeight + gapSize;
    obstacles.push({
        type: 'pipe',
        x: canvas.width,
        topHeight: topPipeHeight,
        bottomY: bottomPipeY,
        width: PIPE_WIDTH,
        passed: false,
        gapSize: gapSize
    });
}

// 鳥の更新
function updateBird() {
    if (gameState !== 'playing') return;

    bird.velocityY += GRAVITY * (1/60);
    bird.velocityY = Math.min(bird.velocityY, MAX_FALL_SPEED);
    bird.y += bird.velocityY * (1/60);
    bird.rotation = Math.max(-25, Math.min(25, bird.velocityY * 0.08));
    
    if (bird.flapAnimation > 0) {
        bird.flapAnimation--;
    }

    if (bird.y < 0 || bird.y > canvas.height) {
        gameOver();
    }
}

// 鳥のジャンプ
function birdJump() {
    const currentTime = Date.now();
    if (currentTime - lastTapTime < MIN_TAP_INTERVAL) return;
    bird.velocityY = JUMP_FORCE;
    bird.flapAnimation = 10;
    lastTapTime = currentTime;
    addEffect(bird.x + 20, bird.y, 'ふわっ', '#87CEEB');
}

// 障害物更新
function updateObstacles() {
    if (gameState !== 'playing') return;

    currentSpeed = getCurrentSpeed();

    if (obstacles.length === 0 || obstacles[obstacles.length - 1].x < canvas.width - 200) {
        createObstacle();
    }

    for (let i = obstacles.length - 1; i >= 0; i--) {
        const obstacle = obstacles[i];
        obstacle.x -= currentSpeed;

        if (checkCollision(bird, obstacle)) {
            gameOver();
            return;
        }

        if (!obstacle.passed && obstacle.x + obstacle.width < bird.x) {
            obstacle.passed = true;
            distance += 10;
            addEffect(bird.x + 30, bird.y - 20, '+10m', '#90EE90');
            
            if (distance % 50 === 0 && distance > 0) {
                addEffect(canvas.width / 2, canvas.height / 2, `${distance}m達成！スピードアップ！`, '#FF69B4');
            }
        }

        if (obstacle.x + obstacle.width < 0) {
            obstacles.splice(i, 1);
        }
    }
}

// パイプとの衝突判定
function checkCollision(bird, obstacle) {
    const birdLeft = bird.x - BIRD_WIDTH/2;
    const birdRight = bird.x + BIRD_WIDTH/2;
    const birdTop = bird.y - BIRD_HEIGHT/2;
    const birdBottom = bird.y + BIRD_HEIGHT/2;

    const pipeLeft = obstacle.x;
    const pipeRight = obstacle.x + obstacle.width;

    if (birdRight > pipeLeft && birdLeft < pipeRight) {
        if (birdTop < obstacle.topHeight || birdBottom > obstacle.bottomY) {
            return true;
        }
    }
    return false;
}

// エフェクト更新
function updateEffects() {
    if (gameState === 'paused') return;

    for (let i = effects.length - 1; i >= 0; i--) {
        const effect = effects[i];
        effect.y += effect.velocityY;
        effect.opacity -= 1/60;
        effect.life--;

        if (effect.life <= 0 || effect.opacity <= 0) {
            effects.splice(i, 1);
        }
    }
}

// 雲の更新
function updateClouds() {
    if (gameState === 'paused') return;

    clouds.forEach(cloud => {
        cloud.x -= cloud.speed * (currentSpeed / BASE_PIPE_SPEED);
        if (cloud.x + cloud.size < 0) {
            cloud.x = canvas.width + cloud.size;
            cloud.y = Math.random() * canvas.height * 0.6;
        }
    });
}

// 描画関数
function drawBird() {
    ctx.save();
    ctx.translate(bird.x, bird.y);
    ctx.rotate(bird.rotation * Math.PI / 180);

    ctx.fillStyle = '#FFD700';
    ctx.beginPath();
    ctx.ellipse(0, 0, BIRD_WIDTH/2, BIRD_HEIGHT/2, 0, 0, Math.PI * 2);
    ctx.fill();

    const wingOffset = bird.flapAnimation > 5 ? -5 : 0;
    ctx.fillStyle = '#FFA500';
    ctx.beginPath();
    ctx.ellipse(-10, wingOffset, 8, 15, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(5, -5, 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
}

function drawObstacles() {
    obstacles.forEach(obstacle => {
        // グラデーションと明るい縁取り
        const grad = ctx.createLinearGradient(obstacle.x, 0, obstacle.x + obstacle.width, 0);
        grad.addColorStop(0, '#4CAF50'); // 明るい緑
        grad.addColorStop(1, '#2E7D32'); // 濃い緑
        ctx.fillStyle = grad;
        ctx.fillRect(obstacle.x, 0, obstacle.width, obstacle.topHeight);
        ctx.fillRect(obstacle.x, obstacle.bottomY, obstacle.width, canvas.height - obstacle.bottomY);
        
        // 縁取り
        ctx.fillStyle = '#81C784';
        ctx.fillRect(obstacle.x - 5, obstacle.topHeight - PIPE_CAP_HEIGHT, obstacle.width + 10, PIPE_CAP_HEIGHT);
        ctx.fillRect(obstacle.x - 5, obstacle.bottomY, obstacle.width + 10, PIPE_CAP_HEIGHT);

        // パイプにアクセント（白いライン）
        ctx.save();
        ctx.strokeStyle = 'rgba(255,255,255,0.5)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(obstacle.x + 7, 0);
        ctx.lineTo(obstacle.x + 7, obstacle.topHeight);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(obstacle.x + obstacle.width - 7, obstacle.bottomY);
        ctx.lineTo(obstacle.x + obstacle.width - 7, canvas.height);
        ctx.stroke();
        ctx.restore();
    });
}

function drawClouds() {
    clouds.forEach(cloud => {
        ctx.save();
        ctx.globalAlpha = cloud.opacity;
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(cloud.x, cloud.y, cloud.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    });
}

function drawEffects() {
    effects.forEach(effect => {
        ctx.save();
        ctx.globalAlpha = effect.opacity;
        ctx.fillStyle = effect.color;
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(effect.text, effect.x, effect.y);
        ctx.restore();
    });
}

function drawUI() {
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`${distance}m`, canvas.width / 2, 40);

    ctx.font = '16px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(`最高: ${bestDistance}m`, 10, 30);
    ctx.fillText(`スピード: x${(currentSpeed / BASE_PIPE_SPEED).toFixed(1)}`, 10, 50);

    if (gameState === 'countdown') {
        ctx.fillStyle = '#FF69B4';
        ctx.font = 'bold 72px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(countdownValue > 0 ? countdownValue : 'スタート！', canvas.width / 2, canvas.height / 2);
    }

    if (gameState === 'paused') {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 48px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('一時停止中', canvas.width / 2, canvas.height / 2);
        
        ctx.font = '20px Arial';
        ctx.fillText('▶️ボタンまたはタップで再開', canvas.width / 2, canvas.height / 2 + 50);
    }

    if (gameState === 'gameOver') {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 32px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('ゲームオーバー', canvas.width / 2, canvas.height / 2 - 100);

        ctx.font = '20px Arial';
        ctx.fillText(`今回: ${distance}m`, canvas.width / 2, canvas.height / 2 - 60);
        ctx.fillText(`最高: ${bestDistance}m`, canvas.width / 2, canvas.height / 2 - 30);

        ctx.fillText('タップでリスタート', canvas.width / 2, canvas.height / 2 + 50);
    }
}

// ゲームオーバー処理
function gameOver() {
    gameState = 'gameOver';
    document.getElementById('pauseButton').style.display = 'none';
    if (distance > bestDistance) {
        bestDistance = distance;
        addEffect(canvas.width / 2, canvas.height / 2 + 20, '新記録！', '#FFD700');
    }
}

// ゲームリセット
function resetGame() {
    bird.x = 100;
    bird.y = canvas.height / 2;
    bird.velocityY = 0;
    bird.rotation = 0;
    bird.flapAnimation = 0;
    distance = 0;
    obstacles = [];
    effects = [];
    currentSpeed = BASE_PIPE_SPEED;
    gameState = 'countdown';
    countdownValue = 3;
    countdownStartTime = Date.now();
    document.getElementById('pauseButton').style.display = 'block';
    document.getElementById('pauseButton').textContent = '⏸️';
}

// カウントダウン更新
function updateCountdown() {
    const elapsed = Date.now() - countdownStartTime;
    if (elapsed > 1000) {
        countdownValue--;
        countdownStartTime = Date.now();
        if (countdownValue < 0) {
            gameState = 'playing';
            gameStartTime = Date.now();
        }
    }
}

// メインゲームループ
function gameLoop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, '#87CEEB');
    gradient.addColorStop(1, '#98D8E8');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    updateClouds();
    drawClouds();

    if (gameState === 'countdown') {
        updateCountdown();
    }

    if (gameState === 'playing') {
        updateBird();
        updateObstacles();
    }

    updateEffects();

    drawObstacles();
    drawBird();
    drawEffects();
    drawUI();

    requestAnimationFrame(gameLoop);
}

// イベントリスナー
canvas.addEventListener('click', () => {
    if (gameState === 'playing') {
        birdJump();
    } else if (gameState === 'paused') {
        togglePause();
    } else if (gameState === 'gameOver') {
        resetGame();
    }
});

canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    if (gameState === 'playing') {
        birdJump();
    } else if (gameState === 'paused') {
        togglePause();
    } else if (gameState === 'gameOver') {
        resetGame();
    }
});

document.addEventListener('keydown', (e) => {
    if (e.code === 'Space' || e.code === 'ArrowUp') {
        e.preventDefault();
        if (gameState === 'playing') {
            birdJump();
        } else if (gameState === 'paused') {
            togglePause();
        } else if (gameState === 'gameOver') {
            resetGame();
        }
    } else if (e.code === 'KeyP' || e.code === 'Escape') {
        e.preventDefault();
        if (gameState === 'playing' || gameState === 'paused') {
            togglePause();
        }
    }
});

// 一時停止ボタンのイベントリスナー
document.getElementById('pauseButton').addEventListener('click', togglePause);

// 名前入力システム
document.getElementById('startGameButton').addEventListener('click', () => {
    const nameInput = document.getElementById('playerNameInput');
    playerName = nameInput.value.trim() || '名無し';
    document.getElementById('nameInputScreen').style.display = 'none';
    resetGame();
});

// 初期化
function init() {
    initClouds();
    gameLoop();
}

init();