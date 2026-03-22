// Глобальные переменные
let camera, scene, renderer;
let player, npcOrange, npcPurple, npcGreen, npcPink;
let npcMessageElement;

// Элементы UI
let graphicsSelector, blocker, instructions, graphicsMenu, crosshair;
let currentGraphicsMode = 'high'; // Режим по умолчанию

// Игровые константы
const islandSize = 100;
const playerSpeed = 0.5;
const jumpForce = 0.3;
const gravity = 0.015;

// Состояние клавиш
let keyForward = false;
let keyBackward = false;
let keyLeft = false;
let keyRight = false;

let yaw = 0;
let pitch = 0;

let verticalVelocity = 0;
let isJumping = false;
let canJump = true;

const playerStartY = 2;

// Блокировка сообщения
let canShowMessage = true;

// Прыжки NPC
let npcPurpleY = 2;
let npcPurpleVel = 0;
let npcGreenY = 2;
let npcGreenVel = 0;
let npcPinkY = 2;
let npcPinkVel = 0;

// Массивы для хранения объектов с материалами (для смены режимов графики)
let objectsWithMaterials = [];
let directionalLight;

// Инициализация
init();
animate();

function init() {
    // Получаем элементы UI
    graphicsSelector = document.getElementById('graphics-selector');
    blocker = document.getElementById('blocker');
    instructions = document.getElementById('instructions');
    graphicsMenu = document.getElementById('graphics-menu');
    crosshair = document.getElementById('crosshair');
    npcMessageElement = document.getElementById('npc-message');

    // Проверяем сохранённые настройки графики
    const savedMode = localStorage.getItem('graphicsMode');
    if (savedMode && ['low', 'medium', 'high'].includes(savedMode)) {
        currentGraphicsMode = savedMode;
    }

    // Навешиваем обработчики на кнопки выбора графики
    setupGraphicsButtons();

    // Навешиваем обработчики меню паузы
    setupPauseMenu();

    // Сцена
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87ceeb);
    scene.fog = new THREE.Fog(0x87ceeb, 50, 200);

    // Камера
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 5, 10);

    // Рендерер (будет настроен после выбора графики)
    renderer = new THREE.WebGLRenderer({ antialias: currentGraphicsMode !== 'low' });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    // Свет
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(50, 100, 50);
    scene.add(directionalLight);

    // Зелёный остров
    const islandGeometry = new THREE.PlaneGeometry(islandSize, islandSize);
    const islandMaterial = createMaterial(0x228b22);
    const island = new THREE.Mesh(islandGeometry, islandMaterial);
    island.rotation.x = -Math.PI / 2;
    island.receiveShadow = currentGraphicsMode === 'high';
    scene.add(island);
    objectsWithMaterials.push(island);

    // === ЖЁЛТЫЙ ИГРОК ===
    const playerGeometry = new THREE.BoxGeometry(2, 4, 2);
    const playerMaterial = createMaterial(0xffff00);
    player = new THREE.Mesh(playerGeometry, playerMaterial);
    player.position.set(0, playerStartY, 10);
    player.castShadow = currentGraphicsMode === 'high';
    scene.add(player);
    objectsWithMaterials.push(player);

    // === ОРАНЖЕВЫЙ NPC (патрулирует) ===
    const npcOrangeGeo = new THREE.BoxGeometry(2, 4, 2);
    const npcOrangeMat = createMaterial(0xff8800);
    npcOrange = new THREE.Mesh(npcOrangeGeo, npcOrangeMat);
    npcOrange.position.set(20, 2, 20);
    npcOrange.castShadow = currentGraphicsMode === 'high';
    scene.add(npcOrange);
    objectsWithMaterials.push(npcOrange);

    // === ФИОЛЕТОВЫЙ NPC (прыгает) ===
    const npcPurpleGeo = new THREE.BoxGeometry(2, 4, 2);
    const npcPurpleMat = createMaterial(0x9932cc);
    npcPurple = new THREE.Mesh(npcPurpleGeo, npcPurpleMat);
    npcPurple.position.set(-15, 2, 15);
    npcPurple.castShadow = currentGraphicsMode === 'high';
    scene.add(npcPurple);
    objectsWithMaterials.push(npcPurple);

    // === ЗЕЛЁНЫЙ NPC (прыгает) ===
    const npcGreenGeo = new THREE.BoxGeometry(2, 4, 2);
    const npcGreenMat = createMaterial(0x00ff00);
    npcGreen = new THREE.Mesh(npcGreenGeo, npcGreenMat);
    npcGreen.position.set(15, 2, -15);
    npcGreen.castShadow = currentGraphicsMode === 'high';
    scene.add(npcGreen);
    objectsWithMaterials.push(npcGreen);

    // === РОЗОВЫЙ NPC (стоит в центре и прыгает) ===
    const npcPinkGeo = new THREE.BoxGeometry(2, 4, 2);
    const npcPinkMat = createMaterial(0xff69b4);
    npcPink = new THREE.Mesh(npcPinkGeo, npcPinkMat);
    npcPink.position.set(0, 2, 0);
    npcPink.castShadow = currentGraphicsMode === 'high';
    scene.add(npcPink);
    objectsWithMaterials.push(npcPink);

    // Применяем настройки графики
    applyGraphicsSettings(currentGraphicsMode);

    // Pointer Lock
    setupPointerLock();

    window.addEventListener('resize', onWindowResize);
}

// Создание материала в зависимости от режима графики
function createMaterial(color) {
    if (currentGraphicsMode === 'low') {
        return new THREE.MeshLambertMaterial({ color: color });
    } else {
        return new THREE.MeshStandardMaterial({ color: color });
    }
}

// Применение настроек графики
function applyGraphicsSettings(mode) {
    currentGraphicsMode = mode;
    localStorage.setItem('graphicsMode', mode);

    // Настройка рендерера
    const oldDomElement = renderer.domElement;
    const antialias = mode !== 'low';
    
    // Пересоздаём рендерер с новыми настройками
    const newRenderer = new THREE.WebGLRenderer({ antialias: antialias });
    newRenderer.setSize(window.innerWidth, window.innerHeight);
    newRenderer.shadowMap.enabled = mode === 'high';
    
    // Заменяем старый рендерер
    document.body.removeChild(oldDomElement);
    oldDomElement.remove();
    renderer = newRenderer;
    document.body.appendChild(renderer.domElement);

    // Настройка теней
    const enableShadows = mode === 'high';
    
    if (directionalLight) {
        directionalLight.castShadow = enableShadows;
        if (enableShadows) {
            directionalLight.shadow.camera.left = -50;
            directionalLight.shadow.camera.right = 50;
            directionalLight.shadow.camera.top = 50;
            directionalLight.shadow.camera.bottom = -50;
            directionalLight.shadow.mapSize.width = 2048;
            directionalLight.shadow.mapSize.height = 2048;
        }
    }

    // Обновляем материалы и тени у объектов
    objectsWithMaterials.forEach(obj => {
        if (obj.material) {
            const oldColor = obj.material.color.getHex();
            obj.material.dispose();
            obj.material = createMaterial(oldColor);
        }
        
        if (obj.castShadow !== undefined) {
            obj.castShadow = enableShadows;
        }
        if (obj.receiveShadow !== undefined) {
            obj.receiveShadow = enableShadows;
        }
    });

    // Обновляем отображение текущего режима в меню
    updateCurrentGraphicsDisplay();
}

// Обновление отображения текущего режима графики
function updateCurrentGraphicsDisplay() {
    const modeNames = {
        'low': 'Низкий',
        'medium': 'Средний',
        'high': 'Высокий'
    };
    const modeElement = document.getElementById('current-graphics-mode');
    if (modeElement) {
        modeElement.textContent = modeNames[currentGraphicsMode];
    }
}

// Настройка кнопок выбора графики
function setupGraphicsButtons() {
    const buttons = document.querySelectorAll('#graphics-selector .graphics-btn');
    buttons.forEach(btn => {
        btn.addEventListener('click', () => {
            const mode = btn.getAttribute('data-mode');
            graphicsSelector.classList.add('hidden');
            applyGraphicsSettings(mode);
            // Показываем меню инструкций
            blocker.style.display = 'flex';
        });
    });
}

// Настройка меню паузы
function setupPauseMenu() {
    const resumeBtn = document.getElementById('resume-btn');
    const graphicsMenuBtn = document.getElementById('graphics-menu-btn');
    const closeGraphicsMenuBtn = document.getElementById('close-graphics-menu');
    const graphicsModeButtons = document.querySelectorAll('#graphics-menu .graphics-btn');

    // Кнопка "Продолжить"
    if (resumeBtn) {
        resumeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            document.body.requestPointerLock();
        });
    }

    // Кнопка "Графика"
    if (graphicsMenuBtn) {
        graphicsMenuBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault();
            blocker.style.display = 'none';
            graphicsMenu.classList.remove('hidden');
            updateCurrentGraphicsDisplay();
        });
    }

    // Кнопка закрытия меню графики
    if (closeGraphicsMenuBtn) {
        closeGraphicsMenuBtn.addEventListener('click', () => {
            graphicsMenu.classList.add('hidden');
            blocker.style.display = 'flex';
        });
    }

    // Кнопки выбора режима в меню графики
    graphicsModeButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const mode = btn.getAttribute('data-mode');
            applyGraphicsSettings(mode);
            graphicsMenu.classList.add('hidden');
            blocker.style.display = 'flex';
        });
    });
}

// Настройка Pointer Lock
function setupPointerLock() {
    const instructions = document.getElementById('instructions');

    instructions.addEventListener('click', () => {
        document.body.requestPointerLock();
    });

    document.addEventListener('keydown', (event) => {
        if (event.code === 'Enter' && document.pointerLockElement !== document.body) {
            document.body.requestPointerLock();
        }
        if (event.code === 'Escape' && document.pointerLockElement === document.body) {
            document.exitPointerLock();
        }
    });

    document.addEventListener('pointerlockchange', () => {
        if (document.pointerLockElement === document.body) {
            blocker.style.display = 'none';
            graphicsMenu.classList.add('hidden');
            crosshair.classList.remove('hidden');
        } else {
            blocker.style.display = 'flex';
            crosshair.classList.add('hidden');
        }
    });

    document.addEventListener('mousemove', (event) => {
        if (document.pointerLockElement === document.body) {
            yaw -= event.movementX * 0.002;
            pitch -= event.movementY * 0.002;
            pitch = Math.max(-Math.PI / 2 + 0.1, Math.min(Math.PI / 2 - 0.1, pitch));
        }
    });

    // Клавиши движения
    document.addEventListener('keydown', (event) => {
        switch (event.code) {
            case 'KeyW': keyForward = true; break;
            case 'KeyS': keyBackward = true; break;
            case 'KeyA': keyLeft = true; break;
            case 'KeyD': keyRight = true; break;
            case 'Space':
                if (canJump && !isJumping) {
                    verticalVelocity = jumpForce;
                    isJumping = true;
                    canJump = false;
                }
                break;
            case 'KeyE':
                tryInteract();
                break;
        }
    });

    document.addEventListener('keyup', (event) => {
        switch (event.code) {
            case 'KeyW': keyForward = false; break;
            case 'KeyS': keyBackward = false; break;
            case 'KeyA': keyLeft = false; break;
            case 'KeyD': keyRight = false; break;
        }
    });

    // ПКМ
    document.addEventListener('contextmenu', (event) => {
        event.preventDefault();
        tryInteract();
    });
}

function tryInteract() {
    if (!canShowMessage) return;

    const distance = player.position.distanceTo(npcOrange.position);
    if (distance < 10) {
        showNPCMessage();
    }
}

function showNPCMessage() {
    canShowMessage = false;
    npcMessageElement.style.display = 'block';

    setTimeout(() => {
        npcMessageElement.style.display = 'none';
        canShowMessage = true;
    }, 3000);
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function updatePlayer() {
    if (document.pointerLockElement === document.body) {
        const forward = new THREE.Vector3(
            -Math.sin(yaw),
            0,
            -Math.cos(yaw)
        );
        const right = new THREE.Vector3(
            Math.cos(yaw),
            0,
            -Math.sin(yaw)
        );

        let moveX = 0;
        let moveZ = 0;

        if (keyForward) {
            moveX += forward.x * playerSpeed;
            moveZ += forward.z * playerSpeed;
        }
        if (keyBackward) {
            moveX -= forward.x * playerSpeed;
            moveZ -= forward.z * playerSpeed;
        }
        if (keyLeft) {
            moveX -= right.x * playerSpeed;
            moveZ -= right.z * playerSpeed;
        }
        if (keyRight) {
            moveX += right.x * playerSpeed;
            moveZ += right.z * playerSpeed;
        }

        player.position.x += moveX;
        player.position.z += moveZ;

        const limit = islandSize / 2 - 2;
        player.position.x = Math.max(-limit, Math.min(limit, player.position.x));
        player.position.z = Math.max(-limit, Math.min(limit, player.position.z));

        // Гравитация
        player.position.y += verticalVelocity;
        verticalVelocity -= gravity;

        if (player.position.y <= playerStartY) {
            player.position.y = playerStartY;
            verticalVelocity = 0;
            isJumping = false;
            canJump = true;
        }

        // Камера
        const cameraDist = 10;
        const cameraHeight = 5;
        camera.position.x = player.position.x + Math.sin(yaw) * cameraDist;
        camera.position.z = player.position.z + Math.cos(yaw) * cameraDist;
        camera.position.y = player.position.y + cameraHeight + pitch * 3;
        camera.lookAt(player.position.x, player.position.y + 2, player.position.z);
    }
}

function updateOrangeNPC() {
    const patrolRadius = islandSize / 2 - 5;
    const time = Date.now() * 0.0005;

    npcOrange.position.x = Math.cos(time) * patrolRadius;
    npcOrange.position.z = Math.sin(time) * patrolRadius;
    npcOrange.position.y = 2;

    const nextTime = Date.now() * 0.0005 + 0.1;
    const nextX = Math.cos(nextTime) * patrolRadius;
    const nextZ = Math.sin(nextTime) * patrolRadius;
    npcOrange.lookAt(nextX, 2, nextZ);
}

function updatePurpleNPC() {
    npcPurpleVel -= gravity;
    npcPurpleY += npcPurpleVel;

    if (npcPurpleY <= 2) {
        npcPurpleY = 2;
        npcPurpleVel = 0.25; // Прыжок
    }

    npcPurple.position.y = npcPurpleY;
}

function updateGreenNPC() {
    npcGreenVel -= gravity;
    npcGreenY += npcGreenVel;

    if (npcGreenY <= 2) {
        npcGreenY = 2;
        npcGreenVel = 0.25; // Прыжок
    }

    npcGreen.position.y = npcGreenY;
}

function updatePinkNPC() {
    npcPinkVel -= gravity;
    npcPinkY += npcPinkVel;

    if (npcPinkY <= 2) {
        npcPinkY = 2;
        npcPinkVel = 0.3; // Прыжок
    }

    npcPink.position.y = npcPinkY;
}

function updateNPCMessagePosition() {
    const npcPos = npcOrange.position.clone();
    npcPos.y += 4;

    npcPos.project(camera);

    const x = (npcPos.x * 0.5 + 0.5) * window.innerWidth;
    const y = (-(npcPos.y * 0.5) + 0.5) * window.innerHeight;

    if (npcPos.z < 1) {
        npcMessageElement.style.left = x + 'px';
        npcMessageElement.style.top = y + 'px';
    }
}

function animate() {
    requestAnimationFrame(animate);

    updatePlayer();
    updateOrangeNPC();
    updatePurpleNPC();
    updateGreenNPC();
    updatePinkNPC();
    updateNPCMessagePosition();

    renderer.render(scene, camera);
}
