// JS/space_invaders.js - GeneralQA Space Invaders Game Engine & Leaderboard Integration

document.addEventListener('DOMContentLoaded', () => {
    // Canvas & Context Setup
    const canvas = document.getElementById('spaceInvadersCanvas');
    const ctx = canvas.getContext('2d');

    // UI Elements
    const gameOverlay = document.getElementById('gameOverlay');
    const overlayTitle = document.getElementById('overlayTitle');
    const overlaySubtitle = document.getElementById('overlaySubtitle');
    const startBtn = document.getElementById('startBtn');
    
    // Modal Elements
    const scoreModal = document.getElementById('scoreModal');
    const modalFinalScore = document.getElementById('modalFinalScore');
    const modalFinalWave = document.getElementById('modalFinalWave');
    const recordNickname = document.getElementById('recordNickname');
    const recordError = document.getElementById('recordError');
    const saveRecordBtn = document.getElementById('saveRecordBtn');
    const closeModalBtn = document.getElementById('closeModalBtn');
    const refreshScoresBtn = document.getElementById('refreshScoresBtn');
    const leaderboardBody = document.getElementById('leaderboardBody');

    // Touch Controls
    const touchLeftBtn = document.getElementById('touchLeftBtn');
    const touchRightBtn = document.getElementById('touchRightBtn');
    const touchShootBtn = document.getElementById('touchShootBtn');

    // Web Audio API Synthesizer
    let audioCtx = null;
    const initAudio = () => {
        if (!audioCtx) {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
    };

    const playTone = (freq, duration, type = 'square') => {
        if (!audioCtx) return;
        try {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = type;
            osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
            gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.start();
            osc.stop(audioCtx.currentTime + duration);
        } catch {}
    };

    const playShootSound = () => {
        if (!audioCtx) return;
        try {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(850, audioCtx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(120, audioCtx.currentTime + 0.12);
            gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
            gain.gain.linearRampToValueAtTime(0.01, audioCtx.currentTime + 0.12);
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.start();
            osc.stop(audioCtx.currentTime + 0.12);
        } catch {}
    };

    const playExplosionSound = () => {
        if (!audioCtx) return;
        try {
            const bufferSize = audioCtx.sampleRate * 0.25;
            const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                data[i] = Math.random() * 2 - 1;
            }
            const noise = audioCtx.createBufferSource();
            noise.buffer = buffer;
            const gain = audioCtx.createGain();
            gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.25);
            noise.connect(gain);
            gain.connect(audioCtx.destination);
            noise.start();
        } catch {}
    };

    const marchNotes = [160, 140, 120, 100];
    let marchNoteIndex = 0;
    const playMarchSound = () => {
        playTone(marchNotes[marchNoteIndex], 0.08, 'sawtooth');
        marchNoteIndex = (marchNoteIndex + 1) % 4;
    };

    // Game Constants
    const CANVAS_WIDTH = 800;
    const CANVAS_HEIGHT = 600;

    // Game State Variables
    let gameState = 'START'; // 'START', 'PLAYING', 'PAUSED', 'GAMEOVER'
    let score = 0;
    let wave = 1;
    let lives = 3;
    let highScore = 0;
    let topScoresCache = [];
    let isNewHighScoreQualified = false;

    // Keys State
    const keys = {
        left: false,
        right: false,
        shoot: false
    };

    // Player Object
    const player = {
        x: CANVAS_WIDTH / 2 - 22,
        y: CANVAS_HEIGHT - 50,
        width: 44,
        height: 22,
        speed: 6,
        isHit: false,
        hitTimer: 0
    };

    // Player Laser Object (RULE: Max 1 active player laser on screen!)
    const playerLaser = {
        x: 0,
        y: 0,
        width: 4,
        height: 14,
        speed: 10,
        active: false
    };

    // Aliens Armada (5 rows x 11 columns = 55 aliens)
    let aliens = [];
    let alienDirection = 1; // 1 = right, -1 = left
    let alienStepTimer = 0;
    let alienStepInterval = 0.6; // Dynamic step interval in seconds
    let alienDropNextStep = false;
    let alienBombs = [];

    // UFO / Mystery Ship
    const ufo = {
        x: -60,
        y: 45,
        width: 48,
        height: 20,
        speed: 2.5,
        active: false,
        timer: 0
    };

    // Bunkers (4 Bunkers with pixel destruction mask)
    let bunkers = [];

    const initBunkers = () => {
        bunkers = [];
        const bunkerWidth = 64;
        const bunkerHeight = 44;
        const spacing = (CANVAS_WIDTH - (4 * bunkerWidth)) / 5;

        for (let i = 0; i < 4; i++) {
            const bx = spacing + i * (bunkerWidth + spacing);
            const by = CANVAS_HEIGHT - 130;
            
            // Create pixel grid (16x11 cells, each 4x4px)
            const grid = [];
            for (let r = 0; r < 11; r++) {
                const row = [];
                for (let c = 0; c < 16; c++) {
                    // Cut out arch at bottom center
                    if (r >= 7 && c >= 5 && c <= 10) {
                        row.push(0);
                    } else if ((r === 0 && (c < 3 || c > 12))) {
                        // Slanted top corners
                        row.push(0);
                    } else {
                        row.push(1); // 1 = intact bunker pixel
                    }
                }
                grid.push(row);
            }
            bunkers.push({ x: bx, y: by, width: bunkerWidth, height: bunkerHeight, grid });
        }
    };

    const initAliens = () => {
        aliens = [];
        alienBombs = [];
        alienDirection = 1;
        alienDropNextStep = false;
        
        // Start Y level moves down per wave (up to wave 4)
        const startY = 80 + Math.min(wave - 1, 4) * 20;

        for (let r = 0; r < 5; r++) {
            for (let c = 0; c < 11; c++) {
                let points = 10;
                let type = 'large'; // Bottom row
                if (r === 0) { points = 30; type = 'small'; }
                else if (r === 1 || r === 2) { points = 20; type = 'medium'; }
                
                aliens.push({
                    x: 100 + c * 48,
                    y: startY + r * 38,
                    width: 32,
                    height: 24,
                    row: r,
                    col: c,
                    type: type,
                    points: points,
                    alive: true,
                    frame: 0
                });
            }
        }
        updateAlienStepInterval();
    };

    const updateAlienStepInterval = () => {
        const aliveCount = aliens.filter(a => a.alive).length;
        if (aliveCount === 0) return;
        // Accidental Dynamic Difficulty: As aliens decrease, interval drops dramatically
        // From ~0.6s at 55 aliens down to 0.03s for the last alien!
        const ratio = aliveCount / 55;
        alienStepInterval = Math.max(0.03, 0.6 * ratio);
    };

    // Load Leaderboard from REST API
    const loadLeaderboard = async () => {
        try {
            const res = await fetch('/api/scores');
            const data = await res.json();
            if (data.success && Array.isArray(data.scores)) {
                topScoresCache = data.scores;
                renderLeaderboard(data.scores);
                if (data.scores.length > 0) {
                    highScore = data.scores[0].score;
                }
            }
        } catch (err) {
            console.warn('[Leaderboard] Помилка завантаження рекордів з сервера:', err);
            leaderboardBody.innerHTML = `<tr><td colspan="5" class="error-cell">Не вдалося завантажити рекорди.</td></tr>`;
        }
    };

    const renderLeaderboard = (scores) => {
        if (!scores || scores.length === 0) {
            leaderboardBody.innerHTML = `<tr><td colspan="5" class="empty-cell">Рекордів ще немає. Станьте першим!</td></tr>`;
            return;
        }

        leaderboardBody.innerHTML = scores.map((s, idx) => {
            const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`;
            const dateStr = s.created_at ? new Date(s.created_at).toLocaleDateString('uk-UA') : '-';
            return `
                <tr class="${idx === 0 ? 'top-row' : ''}">
                    <td><strong>${medal}</strong></td>
                    <td><span class="player-nick">${escapeHtml(s.nickname)}</span></td>
                    <td><strong class="score-val">${s.score}</strong></td>
                    <td>Хвиля ${s.wave || 1}</td>
                    <td class="date-val">${dateStr}</td>
                </tr>
            `;
        }).join('');
    };

    const escapeHtml = (str) => {
        return String(str).replace(/[&<>"']/g, (m) => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
        }[m]));
    };

    const checkHighScoreQualification = (finalScore) => {
        if (finalScore <= 0) return false;
        if (topScoresCache.length < 10) return true;
        const minTopScore = topScoresCache[topScoresCache.length - 1].score;
        return finalScore > minTopScore;
    };

    // Event Listeners (Keyboard)
    window.addEventListener('keydown', (e) => {
        initAudio();
        if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') keys.left = true;
        if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') keys.right = true;
        if (e.key === ' ' || e.key === 'ArrowUp') {
            keys.shoot = true;
            if (gameState === 'START' || gameState === 'GAMEOVER') {
                startGame();
            } else if (gameState === 'PLAYING') {
                firePlayerLaser();
            }
        }
        if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') {
            togglePause();
        }
    });

    window.addEventListener('keyup', (e) => {
        if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') keys.left = false;
        if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') keys.right = false;
        if (e.key === ' ' || e.key === 'ArrowUp') keys.shoot = false;
    });

    // Touch Event Listeners for Mobile
    const bindTouchBtn = (btn, onPress, onRelease) => {
        btn.addEventListener('touchstart', (e) => { e.preventDefault(); initAudio(); onPress(); });
        btn.addEventListener('touchend', (e) => { e.preventDefault(); onRelease(); });
        btn.addEventListener('mousedown', (e) => { e.preventDefault(); initAudio(); onPress(); });
        btn.addEventListener('mouseup', (e) => { e.preventDefault(); onRelease(); });
    };

    bindTouchBtn(touchLeftBtn, () => { keys.left = true; }, () => { keys.left = false; });
    bindTouchBtn(touchRightBtn, () => { keys.right = true; }, () => { keys.right = false; });
    bindTouchBtn(touchShootBtn, () => {
        if (gameState === 'START' || gameState === 'GAMEOVER') {
            startGame();
        } else if (gameState === 'PLAYING') {
            firePlayerLaser();
        }
    }, () => {});

    startBtn.addEventListener('click', () => {
        initAudio();
        startGame();
    });

    refreshScoresBtn.addEventListener('click', () => {
        loadLeaderboard();
    });

    // Modal Events
    saveRecordBtn.addEventListener('click', async () => {
        const nick = recordNickname.value.trim();
        if (nick.length < 2 || nick.length > 15) {
            recordError.textContent = 'Нікнейм повинен містити від 2 до 15 символів.';
            return;
        }
        recordError.textContent = '';
        saveRecordBtn.disabled = true;
        saveRecordBtn.textContent = 'Збереження...';

        try {
            const res = await fetch('/api/scores', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nickname: nick, score: score, wave: wave })
            });
            const data = await res.json();
            if (data.success) {
                scoreModal.style.display = 'none';
                await loadLeaderboard();
            } else {
                recordError.textContent = data.message || 'Помилка збереження рекорду.';
            }
        } catch (err) {
            recordError.textContent = 'Помилка мережі при збереженні.';
        } finally {
            saveRecordBtn.disabled = false;
            saveRecordBtn.textContent = 'Зберегти рекорд';
        }
    });

    closeModalBtn.addEventListener('click', () => {
        scoreModal.style.display = 'none';
    });

    const firePlayerLaser = () => {
        // RULE: Only 1 active player laser allowed on screen!
        if (!playerLaser.active && !player.isHit) {
            playerLaser.active = true;
            playerLaser.x = player.x + player.width / 2 - playerLaser.width / 2;
            playerLaser.y = player.y - playerLaser.height;
            playShootSound();
        }
    };

    const togglePause = () => {
        if (gameState === 'PLAYING') {
            gameState = 'PAUSED';
            overlayTitle.textContent = 'ГРА НА ПАУЗІ';
            overlaySubtitle.textContent = 'Натисніть P або Esc для продовження';
            startBtn.textContent = 'ПРОДОВЖИТИ';
            gameOverlay.style.display = 'flex';
        } else if (gameState === 'PAUSED') {
            gameState = 'PLAYING';
            gameOverlay.style.display = 'none';
        }
    };

    const startGame = () => {
        score = 0;
        wave = 1;
        lives = 3;
        player.x = CANVAS_WIDTH / 2 - player.width / 2;
        player.isHit = false;
        playerLaser.active = false;
        initBunkers();
        initAliens();
        gameState = 'PLAYING';
        gameOverlay.style.display = 'none';
        scoreModal.style.display = 'none';
    };

    const triggerGameOver = (reason = 'LIVES') => {
        gameState = 'GAMEOVER';
        playExplosionSound();
        
        overlayTitle.textContent = reason === 'REACHED_BOTTOM' ? '👾 БАГИ ЗАХОПИЛИ БАЗУ! (GAME OVER)' : 'GAME OVER';
        overlaySubtitle.textContent = `Ваш рахунок: ${score} очок | Досягнуто хвилю: ${wave}`;
        startBtn.textContent = 'ГРАТИ ЗНОВУ';
        gameOverlay.style.display = 'flex';

        // Check if score qualifies for Top 10 Leaderboard
        if (checkHighScoreQualification(score)) {
            modalFinalScore.textContent = score;
            modalFinalWave.textContent = wave;
            recordNickname.value = '';
            recordError.textContent = '';
            scoreModal.style.display = 'flex';
        }
    };

    // Main Update Loop
    let lastTime = performance.now();

    const update = (dt) => {
        if (gameState !== 'PLAYING') return;

        // Player Movement
        if (keys.left) player.x = Math.max(10, player.x - player.speed);
        if (keys.right) player.x = Math.min(CANVAS_WIDTH - player.width - 10, player.x + player.speed);

        // Player Hit Invulnerability/Respawn Timer
        if (player.isHit) {
            player.hitTimer -= dt;
            if (player.hitTimer <= 0) {
                player.isHit = false;
            }
        }

        // Update Player Laser
        if (playerLaser.active) {
            playerLaser.y -= playerLaser.speed;

            // Screen Top Limit
            if (playerLaser.y + playerLaser.height < 0) {
                playerLaser.active = false;
            } else {
                // Collision Laser vs UFO
                if (ufo.active && checkCollision(playerLaser, ufo)) {
                    playerLaser.active = false;
                    ufo.active = false;
                    const pts = [50, 100, 150, 300][Math.floor(Math.random() * 4)];
                    score += pts;
                    playExplosionSound();
                    checkBonusLife();
                }

                // Collision Laser vs Aliens
                if (playerLaser.active) {
                    for (const alien of aliens) {
                        if (alien.alive && checkCollision(playerLaser, alien)) {
                            alien.alive = false;
                            playerLaser.active = false;
                            score += alien.points;
                            playExplosionSound();
                            updateAlienStepInterval();
                            checkBonusLife();
                            
                            // Check Wave Completion
                            if (aliens.every(a => !a.alive)) {
                                wave++;
                                initAliens();
                            }
                            break;
                        }
                    }
                }

                // Collision Laser vs Bunkers
                if (playerLaser.active) {
                    for (const bunker of bunkers) {
                        if (damageBunkerAtPoint(bunker, playerLaser.x + playerLaser.width / 2, playerLaser.y)) {
                            playerLaser.active = false;
                            break;
                        }
                    }
                }
            }
        }

        // Update Alien Armada Movement
        alienStepTimer += dt;
        if (alienStepTimer >= alienStepInterval) {
            alienStepTimer = 0;
            playMarchSound();

            const aliveAliens = aliens.filter(a => a.alive);
            if (aliveAliens.length > 0) {
                // Toggle animation frame
                aliveAliens.forEach(a => a.frame = 1 - a.frame);

                if (alienDropNextStep) {
                    aliveAliens.forEach(a => a.y += 18);
                    alienDirection *= -1;
                    alienDropNextStep = false;

                    // Check if aliens reached player Y line (Instant Game Over!)
                    const minDistanceToPlayer = Math.min(...aliveAliens.map(a => player.y - (a.y + a.height)));
                    if (minDistanceToPlayer <= 5) {
                        triggerGameOver('REACHED_BOTTOM');
                        return;
                    }
                } else {
                    let hitEdge = false;
                    aliveAliens.forEach(a => {
                        a.x += alienDirection * 12;
                        if (a.x <= 15 || a.x + a.width >= CANVAS_WIDTH - 15) {
                            hitEdge = true;
                        }
                    });

                    if (hitEdge) {
                        alienDropNextStep = true;
                    }
                }

                // Alien Bomb Dropping Logic
                if (Math.random() < 0.35 + Math.min(wave * 0.05, 0.3)) {
                    // Pick random bottom alien in a column
                    const columnsMap = {};
                    aliveAliens.forEach(a => {
                        if (!columnsMap[a.col] || a.row > columnsMap[a.col].row) {
                            columnsMap[a.col] = a;
                        }
                    });
                    const bottomAliens = Object.values(columnsMap);
                    if (bottomAliens.length > 0 && alienBombs.length < 3 + Math.min(wave, 3)) {
                        const shooter = bottomAliens[Math.floor(Math.random() * bottomAliens.length)];
                        alienBombs.push({
                            x: shooter.x + shooter.width / 2 - 2,
                            y: shooter.y + shooter.height,
                            width: 4,
                            height: 12,
                            speed: 4 + Math.random() * 2 + Math.min(wave * 0.5, 3)
                        });
                    }
                }
            }
        }

        // Update Alien Bombs
        for (let i = alienBombs.length - 1; i >= 0; i--) {
            const bomb = alienBombs[i];
            bomb.y += bomb.speed;

            // Screen Bottom Limit
            if (bomb.y > CANVAS_HEIGHT) {
                alienBombs.splice(i, 1);
                continue;
            }

            // Bomb vs Player Collision
            if (!player.isHit && checkCollision(bomb, player)) {
                alienBombs.splice(i, 1);
                lives--;
                playExplosionSound();
                player.isHit = true;
                player.hitTimer = 1.5;

                if (lives <= 0) {
                    triggerGameOver('LIVES');
                    return;
                }
                continue;
            }

            // Bomb vs Bunkers Collision
            for (const bunker of bunkers) {
                if (damageBunkerAtPoint(bunker, bomb.x + bomb.width / 2, bomb.y + bomb.height)) {
                    alienBombs.splice(i, 1);
                    break;
                }
            }
        }

        // Update UFO / Mystery Ship
        ufo.timer += dt;
        if (!ufo.active && ufo.timer > 18) {
            ufo.timer = 0;
            if (Math.random() < 0.6) {
                ufo.active = true;
                ufo.x = -ufo.width;
            }
        }

        if (ufo.active) {
            ufo.x += ufo.speed;
            if (ufo.x > CANVAS_WIDTH + ufo.width) {
                ufo.active = false;
            }
        }
    };

    let bonusLifeAwarded = false;
    const checkBonusLife = () => {
        if (score >= 1000 && !bonusLifeAwarded) {
            lives++;
            bonusLifeAwarded = true;
            playTone(880, 0.2, 'sine');
        }
    };

    // Helper Collision Detection
    const checkCollision = (r1, r2) => {
        return r1.x < r2.x + r2.width &&
               r1.x + r1.width > r2.x &&
               r1.y < r2.y + r2.height &&
               r1.y + r1.height > r2.y;
    };

    // Pixel Bunker Damage Helper
    const damageBunkerAtPoint = (bunker, px, py) => {
        if (px < bunker.x || px > bunker.x + bunker.width ||
            py < bunker.y || py > bunker.y + bunker.height) {
            return false;
        }

        const col = Math.floor((px - bunker.x) / 4);
        const row = Math.floor((py - bunker.y) / 4);

        if (row >= 0 && row < 11 && col >= 0 && col < 16 && bunker.grid[row][col] === 1) {
            // Destroy 3x3 pixel neighborhood around impact
            for (let r = Math.max(0, row - 1); r <= Math.min(10, row + 1); r++) {
                for (let c = Math.max(0, col - 1); c <= Math.min(15, col + 1); c++) {
                    bunker.grid[r][c] = 0;
                }
            }
            return true;
        }
        return false;
    };

    // Render Function
    const render = () => {
        // Clear Background
        ctx.fillStyle = '#181818';
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        // Render HUD Header Line
        ctx.fillStyle = '#3c3c3c';
        ctx.fillRect(0, 40, CANVAS_WIDTH, 2);

        // Render HUD Text
        ctx.font = 'bold 16px monospace';
        ctx.fillStyle = '#ffffff';
        ctx.fillText(`SCORE: ${String(score).padStart(5, '0')}`, 20, 26);

        ctx.fillStyle = '#0055ff';
        ctx.fillText(`HIGH: ${String(Math.max(score, highScore)).padStart(5, '0')}`, CANVAS_WIDTH / 2 - 60, 26);

        ctx.fillStyle = '#ffffff';
        ctx.fillText(`WAVE: ${wave}`, CANVAS_WIDTH - 220, 26);

        // Render Lives Icons
        ctx.fillStyle = '#0055ff';
        for (let i = 0; i < lives; i++) {
            ctx.fillText('🚀', CANVAS_WIDTH - 80 + i * 24, 26);
        }

        // Render Bunkers
        bunkers.forEach(bunker => {
            ctx.fillStyle = '#00cc66';
            for (let r = 0; r < 11; r++) {
                for (let c = 0; c < 16; c++) {
                    if (bunker.grid[r][c] === 1) {
                        ctx.fillRect(bunker.x + c * 4, bunker.y + r * 4, 4, 4);
                    }
                }
            }
        });

        // Render Player Cannon
        if (!player.isHit || Math.floor(performance.now() / 100) % 2 === 0) {
            ctx.fillStyle = '#0055ff';
            // Base
            ctx.fillRect(player.x, player.y + 8, player.width, player.height - 8);
            // Cannon turret
            ctx.fillRect(player.x + player.width / 2 - 4, player.y, 8, 8);
            ctx.fillRect(player.x + player.width / 2 - 2, player.y - 4, 4, 4);
        }

        // Render Player Laser
        if (playerLaser.active) {
            ctx.fillStyle = '#ffff00';
            ctx.fillRect(playerLaser.x, playerLaser.y, playerLaser.width, playerLaser.height);
        }

        // Render Aliens Armada
        aliens.forEach(alien => {
            if (!alien.alive) return;

            if (alien.type === 'small') ctx.fillStyle = '#ff3366'; // Top row
            else if (alien.type === 'medium') ctx.fillStyle = '#00ccff'; // Middle rows
            else ctx.fillStyle = '#ffaa00'; // Bottom row

            // Simple Sprite Rendering
            const frameOffset = alien.frame === 1 ? 2 : 0;
            ctx.fillRect(alien.x + frameOffset, alien.y, alien.width - frameOffset * 2, alien.height);
            
            // Bug eyes/antenna details
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(alien.x + 6, alien.y + 6, 4, 4);
            ctx.fillRect(alien.x + alien.width - 10, alien.y + 6, 4, 4);
        });

        // Render Alien Bombs
        ctx.fillStyle = '#ff3333';
        alienBombs.forEach(bomb => {
            ctx.fillRect(bomb.x, bomb.y, bomb.width, bomb.height);
        });

        // Render UFO / Mystery Ship
        if (ufo.active) {
            ctx.fillStyle = '#ff0055';
            ctx.beginPath();
            ctx.ellipse(ufo.x + ufo.width / 2, ufo.y + ufo.height / 2, ufo.width / 2, ufo.height / 2, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 10px sans-serif';
            ctx.fillText('UFO', ufo.x + 14, ufo.y + 14);
        }

        // Render Red Danger Line at Bottom
        ctx.strokeStyle = 'rgba(255, 51, 51, 0.3)';
        ctx.lineWidth = 1;
        ctx.setLineDash([6, 6]);
        ctx.beginPath();
        ctx.moveTo(0, player.y);
        ctx.lineTo(CANVAS_WIDTH, player.y);
        ctx.stroke();
        ctx.setLineDash([]);
    };

    // Main Game Loop Handler
    const loop = (timestamp) => {
        const dt = Math.min((timestamp - lastTime) / 1000, 0.1);
        lastTime = timestamp;

        update(dt);
        render();

        requestAnimationFrame(loop);
    };

    // Initial Setup on Load
    initBunkers();
    initAliens();
    loadLeaderboard();
    requestAnimationFrame(loop);
});
