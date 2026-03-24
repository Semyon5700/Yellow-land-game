// Глобальные переменные
let camera, scene, renderer;
let player, npcOrange, npcPurple, npcGreen, npcPink;
let npcMessageElement, fpsCounter;

// Вспомогательный вектор для оптимизации
const tempVector = new THREE.Vector3();

// Переменные для FPS-счётчика
let fpsCounterElement;
let frameCount = 0;
let lastTime = performance.now();
let fps = 0;

// Массивы для хранения объектов с материалами (для смены режимов графики)
let objectsWithMaterials = [];
let directionalLight;

// Массивы для хранения препятствий (деревья, горы, здания)
let obstacles = [];
let villageBuildings = [];

// Элементы UI
let graphicsSelector, blocker, instructions, graphicsMenu, crosshair;
let currentGraphicsMode = 'high'; // Режим по умолчанию

// Игровые константы
const islandSize = 200;
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
let npcPurpleState = 'idle'; // 'idle', 'jumping', 'moving'
let npcPurpleMoveDir = new THREE.Vector3();
let npcPurpleMoveTime = 0;

let npcGreenY = 2;
let npcGreenVel = 0;
let npcGreenState = 'idle';
let npcGreenMoveDir = new THREE.Vector3();
let npcGreenMoveTime = 0;

let npcPinkY = 2;
let npcPinkVel = 0;
let npcPinkState = 'idle';
let npcPinkMoveDir = new THREE.Vector3();
let npcPinkMoveTime = 0;

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
    fpsCounterElement = document.getElementById('fps-counter');

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
    scene.fog = new THREE.Fog(0x87ceeb, 100, 400);

    // Камера
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 5, 10); // Начальная позиция (будет обновлена в updatePlayer)

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
    player = createHumanModel(0xffff00);
    player.position.set(0, playerStartY, 10);
    scene.add(player);

    // === ОРАНЖЕВЫЙ NPC (патрулирует) ===
    npcOrange = createHumanModel(0xff8800);
    npcOrange.position.set(20, 2, 20);
    scene.add(npcOrange);

    // === ФИОЛЕТОВЫЙ NPC (прыгает) ===
    npcPurple = createHumanModel(0x9932cc);
    npcPurple.position.set(-15, 2, 15);
    scene.add(npcPurple);

    // === ЗЕЛЁНЫЙ NPC (прыгает) ===
    npcGreen = createHumanModel(0x00ff00);
    npcGreen.position.set(15, 2, -15);
    scene.add(npcGreen);

    // === РОЗОВЫЙ NPC (стоит в центре и прыгает) ===
    npcPink = createHumanModel(0xff69b4);
    npcPink.position.set(0, 2, 0);
    scene.add(npcPink);

    // Создаём деревню
    createVillage();

    // Генерируем деревья и горы
    generateNature();

    // Применяем настройки графики
    applyGraphicsSettings(currentGraphicsMode);

    // Pointer Lock
    setupPointerLock();

    window.addEventListener('resize', onWindowResize);
}

// Создание человеческой модели из примитивов
function createHumanModel(color) {
    const humanGroup = new THREE.Group();
    
    const material = createMaterial(color);
    
    // Голова
    const headGeometry = new THREE.SphereGeometry(1, 16, 16);
    const head = new THREE.Mesh(headGeometry, material);
    head.position.y = 3.5;
    head.castShadow = currentGraphicsMode === 'high';
    head.receiveShadow = currentGraphicsMode === 'high';
    humanGroup.add(head);
    objectsWithMaterials.push(head);
    
    // Туловище
    const bodyGeometry = new THREE.BoxGeometry(2.5, 3, 1.5);
    const body = new THREE.Mesh(bodyGeometry, material);
    body.position.y = 1.5;
    body.castShadow = currentGraphicsMode === 'high';
    body.receiveShadow = currentGraphicsMode === 'high';
    humanGroup.add(body);
    objectsWithMaterials.push(body);
    
    // Руки (левая и правая)
    const armGeometry = new THREE.CylinderGeometry(0.3, 0.3, 2.5, 8);
    
    const leftArm = new THREE.Mesh(armGeometry, material);
    leftArm.position.set(-1.8, 1.5, 0);
    leftArm.rotation.z = 0.2;
    leftArm.castShadow = currentGraphicsMode === 'high';
    leftArm.receiveShadow = currentGraphicsMode === 'high';
    humanGroup.add(leftArm);
    objectsWithMaterials.push(leftArm);
    
    const rightArm = new THREE.Mesh(armGeometry, material);
    rightArm.position.set(1.8, 1.5, 0);
    rightArm.rotation.z = -0.2;
    rightArm.castShadow = currentGraphicsMode === 'high';
    rightArm.receiveShadow = currentGraphicsMode === 'high';
    humanGroup.add(rightArm);
    objectsWithMaterials.push(rightArm);
    
    // Ноги (левая и правая)
    const legGeometry = new THREE.CylinderGeometry(0.4, 0.4, 2.5, 8);
    
    const leftLeg = new THREE.Mesh(legGeometry, material);
    leftLeg.position.set(-0.7, -1.25, 0);
    leftLeg.castShadow = currentGraphicsMode === 'high';
    leftLeg.receiveShadow = currentGraphicsMode === 'high';
    humanGroup.add(leftLeg);
    objectsWithMaterials.push(leftLeg);
    
    const rightLeg = new THREE.Mesh(legGeometry, material);
    rightLeg.position.set(0.7, -1.25, 0);
    rightLeg.castShadow = currentGraphicsMode === 'high';
    rightLeg.receiveShadow = currentGraphicsMode === 'high';
    humanGroup.add(rightLeg);
    objectsWithMaterials.push(rightLeg);
    
    // Сохраняем ссылки на части тела для анимации
    humanGroup.userData = {
        leftArm,
        rightArm,
        leftLeg,
        rightLeg,
        walkTime: 0
    };
    
    return humanGroup;
}

// Создание материала в зависимости от режима графики
function createMaterial(color) {
    if (currentGraphicsMode === 'low') {
        return new THREE.MeshLambertMaterial({ color: color });
    } else {
        return new THREE.MeshStandardMaterial({ color: color });
    }
}

// Создание дома для деревни
function createHouse(x, z) {
    const houseGroup = new THREE.Group();
    
    // Стены дома
    const wallsGeometry = new THREE.BoxGeometry(8, 6, 8);
    const wallsMaterial = createMaterial(0xdeb887);
    const walls = new THREE.Mesh(wallsGeometry, wallsMaterial);
    walls.position.y = 3;
    walls.castShadow = currentGraphicsMode === 'high';
    walls.receiveShadow = currentGraphicsMode === 'high';
    houseGroup.add(walls);
    objectsWithMaterials.push(walls);
    
    // Крыша (пирамида)
    const roofGeometry = new THREE.ConeGeometry(6, 4, 4);
    const roofMaterial = createMaterial(0x8b4513);
    const roof = new THREE.Mesh(roofGeometry, roofMaterial);
    roof.position.y = 8;
    roof.rotation.y = Math.PI / 4;
    roof.castShadow = currentGraphicsMode === 'high';
    roof.receiveShadow = currentGraphicsMode === 'high';
    houseGroup.add(roof);
    objectsWithMaterials.push(roof);
    
    houseGroup.position.set(x, 0, z);
    scene.add(houseGroup);
    villageBuildings.push(houseGroup);
    
    // Добавляем в препятствия для коллизий
    obstacles.push({ x, z, radius: 5 });
}

// Создание деревни
function createVillage() {
    // Создаём несколько домов в центре острова (со смещением)
    const housePositions = [
        { x: -30, z: -30 },
        { x: -40, z: -25 },
        { x: -35, z: -40 },
        { x: -25, z: -35 },
        { x: -45, z: -35 }
    ];
    
    housePositions.forEach(pos => {
        createHouse(pos.x, pos.z);
    });
}

// Создание дерева
function createTree(x, z) {
    const treeGroup = new THREE.Group();
    
    // Ствол
    const trunkGeometry = new THREE.CylinderGeometry(0.5, 0.8, 4, 8);
    const trunkMaterial = createMaterial(0x8b4513);
    const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
    trunk.position.y = 2;
    trunk.castShadow = currentGraphicsMode === 'high';
    trunk.receiveShadow = currentGraphicsMode === 'high';
    treeGroup.add(trunk);
    objectsWithMaterials.push(trunk);
    
    // Крона (конус)
    const leavesGeometry = new THREE.ConeGeometry(3, 6, 8);
    const leavesMaterial = createMaterial(0x228b22);
    const leaves = new THREE.Mesh(leavesGeometry, leavesMaterial);
    leaves.position.y = 7;
    leaves.castShadow = currentGraphicsMode === 'high';
    leaves.receiveShadow = currentGraphicsMode === 'high';
    treeGroup.add(leaves);
    objectsWithMaterials.push(leaves);
    
    treeGroup.position.set(x, 0, z);
    scene.add(treeGroup);
    
    // Добавляем в препятствия для коллизий
    obstacles.push({ x, z, radius: 2 });
}

// Создание горы
function createMountain(x, z, size = 1) {
    const mountainGeometry = new THREE.ConeGeometry(15 * size, 20 * size, 8);
    const mountainMaterial = createMaterial(0x808080);
    const mountain = new THREE.Mesh(mountainGeometry, mountainMaterial);
    mountain.position.set(x, 10 * size, z);
    mountain.castShadow = currentGraphicsMode === 'high';
    mountain.receiveShadow = currentGraphicsMode === 'high';
    scene.add(mountain);
    objectsWithMaterials.push(mountain);
    
    // Добавляем в препятствия для коллизий
    obstacles.push({ x, z, radius: 12 * size });
}

// Генерация деревьев и гор
function generateNature() {
    // Зоны для генерации (исключая центр с деревней и спавн)
    const villageZone = { x: -35, z: -35, radius: 25 };
    const spawnZone = { x: 0, z: 10, radius: 15 };
    
    // Генерируем деревья
    for (let i = 0; i < 50; i++) {
        const angle = Math.random() * Math.PI * 2;
        const radius = Math.random() * (islandSize / 2 - 10);
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;
        
        // Проверяем, не слишком ли близко к деревне или спавну
        const distToVillage = Math.sqrt((x - villageZone.x) ** 2 + (z - villageZone.z) ** 2);
        const distToSpawn = Math.sqrt((x - spawnZone.x) ** 2 + (z - spawnZone.z) ** 2);
        
        if (distToVillage > villageZone.radius + 5 && distToSpawn > spawnZone.radius + 5) {
            createTree(x, z);
        }
    }
    
    // Генерируем горы по краям острова
    for (let i = 0; i < 8; i++) {
        const angle = Math.random() * Math.PI * 2;
        const radius = islandSize / 2 - 15 - Math.random() * 20;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;
        
        const distToVillage = Math.sqrt((x - villageZone.x) ** 2 + (z - villageZone.z) ** 2);
        const distToSpawn = Math.sqrt((x - spawnZone.x) ** 2 + (z - spawnZone.z) ** 2);
        
        if (distToVillage > villageZone.radius + 10 && distToSpawn > spawnZone.radius + 10) {
            const size = 0.8 + Math.random() * 0.5;
            createMountain(x, z, size);
        }
    }
}

// Применение настроек графики
function applyGraphicsSettings(mode) {
    currentGraphicsMode = mode;
    localStorage.setItem('graphicsMode', mode);

    // Настройка рендерера - переиспользуем существующий
    const antialias = mode !== 'low';
    renderer.setPixelRatio(antialias ? window.devicePixelRatio : 1);
    renderer.shadowMap.enabled = mode === 'high';

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

// Проверка коллизии с препятствиями
function checkCollision(newX, newZ) {
    const playerRadius = 2;
    
    for (const obstacle of obstacles) {
        const dx = newX - obstacle.x;
        const dz = newZ - obstacle.z;
        const distance = Math.sqrt(dx * dx + dz * dz);
        
        if (distance < playerRadius + obstacle.radius) {
            return true; // Столкновение
        }
    }
    
    return false;
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

        // Исправлено: W - вперёд, S - назад, A - влево, D - вправо
        if (keyForward) {
            moveX -= forward.x * playerSpeed;
            moveZ -= forward.z * playerSpeed;
        }
        if (keyBackward) {
            moveX += forward.x * playerSpeed;
            moveZ += forward.z * playerSpeed;
        }
        if (keyLeft) {
            moveX += right.x * playerSpeed;
            moveZ += right.z * playerSpeed;
        }
        if (keyRight) {
            moveX -= right.x * playerSpeed;
            moveZ -= right.z * playerSpeed;
        }

        // Проверяем коллизии по отдельности для X и Z
        const newX = player.position.x + moveX;
        const newZ = player.position.z + moveZ;

        if (!checkCollision(newX, player.position.z)) {
            player.position.x = newX;
        }
        if (!checkCollision(player.position.x, newZ)) {
            player.position.z = newZ;
        }

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

        // Поворачиваем тело игрока в сторону взгляда
        player.rotation.y = yaw;

        // Анимация ходьбы
        if (keyForward || keyBackward || keyLeft || keyRight) {
            player.userData.walkTime += 0.15;
            player.userData.leftArm.rotation.x = Math.sin(player.userData.walkTime) * 0.5;
            player.userData.rightArm.rotation.x = Math.sin(player.userData.walkTime + Math.PI) * 0.5;
            player.userData.leftLeg.rotation.x = Math.sin(player.userData.walkTime + Math.PI) * 0.5;
            player.userData.rightLeg.rotation.x = Math.sin(player.userData.walkTime) * 0.5;
        } else {
            player.userData.leftArm.rotation.x = 0;
            player.userData.rightArm.rotation.x = 0;
            player.userData.leftLeg.rotation.x = 0;
            player.userData.rightLeg.rotation.x = 0;
        }

        // Камера от первого лица (на уровне глаз)
        const eyeHeight = 3.5;
        camera.position.x = player.position.x;
        camera.position.z = player.position.z;
        camera.position.y = player.position.y + eyeHeight + pitch * 2;
        
        // Направляем камеру в сторону взгляда
        const lookDist = 10;
        camera.lookAt(
            player.position.x + Math.sin(yaw) * lookDist,
            player.position.y + eyeHeight + pitch * 2,
            player.position.z + Math.cos(yaw) * lookDist
        );
    }
}

function updateOrangeNPC() {
    const patrolRadius = islandSize / 2 - 10;
    const time = Date.now() * 0.0005;

    npcOrange.position.x = Math.cos(time) * patrolRadius;
    npcOrange.position.z = Math.sin(time) * patrolRadius;
    npcOrange.position.y = 2;

    const nextTime = Date.now() * 0.0005 + 0.1;
    const nextX = Math.cos(nextTime) * patrolRadius;
    const nextZ = Math.sin(nextTime) * patrolRadius;
    npcOrange.lookAt(nextX, 2, nextZ);
    
    // Анимация ходьбы
    npcOrange.userData.walkTime += 0.15;
    npcOrange.userData.leftArm.rotation.x = Math.sin(npcOrange.userData.walkTime) * 0.5;
    npcOrange.userData.rightArm.rotation.x = Math.sin(npcOrange.userData.walkTime + Math.PI) * 0.5;
    npcOrange.userData.leftLeg.rotation.x = Math.sin(npcOrange.userData.walkTime + Math.PI) * 0.5;
    npcOrange.userData.rightLeg.rotation.x = Math.sin(npcOrange.userData.walkTime) * 0.5;
}

function updateJumpingNPC(npc, npcY, npcVel, moveDir, moveTime, state) {
    const limit = islandSize / 2 - 5;
    
    // Обновляем состояние
    if (state === 'idle') {
        // Случайный выбор действия
        if (Math.random() < 0.02) {
            state = 'moving';
            // Выбираем случайное направление
            const angle = Math.random() * Math.PI * 2;
            moveDir.set(Math.cos(angle), 0, Math.sin(angle));
            moveTime = 60 + Math.random() * 60; // Двигаемся 60-120 кадров
        }
    } else if (state === 'moving') {
        moveTime--;
        
        // Двигаемся
        npc.position.x += moveDir.x * 0.1;
        npc.position.z += moveDir.z * 0.1;
        
        // Ограничиваем позицию
        npc.position.x = Math.max(-limit, Math.min(limit, npc.position.x));
        npc.position.z = Math.max(-limit, Math.min(limit, npc.position.z));
        
        // Поворачиваем по направлению движения
        npc.lookAt(npc.position.x + moveDir.x, npcY, npc.position.z + moveDir.z);
        
        // Анимация ходьбы
        npc.userData.walkTime += 0.15;
        npc.userData.leftArm.rotation.x = Math.sin(npc.userData.walkTime) * 0.5;
        npc.userData.rightArm.rotation.x = Math.sin(npc.userData.walkTime + Math.PI) * 0.5;
        npc.userData.leftLeg.rotation.x = Math.sin(npc.userData.walkTime + Math.PI) * 0.5;
        npc.userData.rightLeg.rotation.x = Math.sin(npc.userData.walkTime) * 0.5;
        
        // Случайный прыжок во время движения
        if (npcY <= 2 && Math.random() < 0.05) {
            state = 'jumping';
            npcVel = 0.3;
        }
        
        if (moveTime <= 0) {
            state = 'idle';
        }
    } else if (state === 'jumping') {
        // Анимация прыжка
        npc.userData.leftArm.rotation.x = -Math.PI / 2;
        npc.userData.rightArm.rotation.x = -Math.PI / 2;
        npc.userData.leftLeg.rotation.x = -0.3;
        npc.userData.rightLeg.rotation.x = -0.3;
        
        if (npcY <= 2) {
            state = 'moving'; // После прыжка продолжаем движение
        }
    }
    
    // Гравитация
    npcVel -= gravity;
    npcY += npcVel;

    if (npcY <= 2) {
        npcY = 2;
        npcVel = 0;
    }
    
    npc.position.y = npcY;
    
    // Возвращаем значения обратно
    return { npcY, npcVel, moveDir, moveTime, state };
}

function updatePurpleNPC() {
    const result = updateJumpingNPC(
        npcPurple, 
        npcPurpleY, 
        npcPurpleVel, 
        npcPurpleMoveDir, 
        npcPurpleMoveTime, 
        npcPurpleState
    );
    npcPurpleY = result.npcY;
    npcPurpleVel = result.npcVel;
    npcPurpleMoveDir = result.moveDir;
    npcPurpleMoveTime = result.moveTime;
    npcPurpleState = result.state;
}

function updateGreenNPC() {
    const result = updateJumpingNPC(
        npcGreen, 
        npcGreenY, 
        npcGreenVel, 
        npcGreenMoveDir, 
        npcGreenMoveTime, 
        npcGreenState
    );
    npcGreenY = result.npcY;
    npcGreenVel = result.npcVel;
    npcGreenMoveDir = result.moveDir;
    npcGreenMoveTime = result.moveTime;
    npcGreenState = result.state;
}

function updatePinkNPC() {
    const result = updateJumpingNPC(
        npcPink, 
        npcPinkY, 
        npcPinkVel, 
        npcPinkMoveDir, 
        npcPinkMoveTime, 
        npcPinkState
    );
    npcPinkY = result.npcY;
    npcPinkVel = result.npcVel;
    npcPinkMoveDir = result.moveDir;
    npcPinkMoveTime = result.moveTime;
    npcPinkState = result.state;
}

function updateNPCMessagePosition() {
    // Переиспользуем глобальный вектор вместо clone()
    tempVector.copy(npcOrange.position);
    tempVector.y += 4;

    tempVector.project(camera);

    const x = (tempVector.x * 0.5 + 0.5) * window.innerWidth;
    const y = (-(tempVector.y * 0.5) + 0.5) * window.innerHeight;

    if (tempVector.z < 1) {
        npcMessageElement.style.left = x + 'px';
        npcMessageElement.style.top = y + 'px';
    }
}

// Обновление FPS-счётчика
function updateFPS() {
    frameCount++;
    const currentTime = performance.now();
    
    if (currentTime - lastTime >= 500) {
        fps = Math.round((frameCount * 1000) / (currentTime - lastTime));
        fpsCounterElement.textContent = `FPS: ${fps}`;
        frameCount = 0;
        lastTime = currentTime;
    }
}

function animate() {
    requestAnimationFrame(animate);

    updateFPS();
    updatePlayer();
    updateOrangeNPC();
    updatePurpleNPC();
    updateGreenNPC();
    updatePinkNPC();
    updateNPCMessagePosition();

    renderer.render(scene, camera);
}
