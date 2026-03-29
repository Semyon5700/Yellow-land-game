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

// Элементы диалоговой системы
let flyIndicator, dialogWindow, dialogText, dialogOptions;
let platformIndicator, teleportPrompt;
let ballPickupPrompt, ballThrowPrompt;

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

// Режим полёта
let flyMode = false;
let flyButtonEnabled = false;
let spacePressCount = 0;
let lastSpaceTime = 0;

// Массив кнопок полёта на домиках
let flyButtons = [];

// Платформа и кнопка телепортации
let platform = null;
let platformActive = false;
let villageTeleportButton = null;
let playerOnPlatform = false;

// Мяч
let ball = null;
let hasBall = false;
let ballVelocity = new THREE.Vector3();
let ballThrown = false;

// Диалоговая система
let currentDialogNode = null;

// Прыжки NPC
let npcPurpleY = 2;
let npcPurpleVel = 0;
let npcPurpleState = 'idle'; // 'idle', 'jumping', 'moving'
let npcPurpleMoveDir = new THREE.Vector3();
let npcPurpleMoveTime = 0;
let npcPurpleHitTime = 0;

let npcGreenY = 2;
let npcGreenVel = 0;
let npcGreenState = 'idle';
let npcGreenMoveDir = new THREE.Vector3();
let npcGreenMoveTime = 0;
let npcGreenHitTime = 0;

let npcPinkY = 2;
let npcPinkVel = 0;
let npcPinkState = 'idle';
let npcPinkMoveDir = new THREE.Vector3();
let npcPinkMoveTime = 0;
let npcPinkHitTime = 0;

// Оранжевый NPC
let npcOrangeVel = 0;
let npcOrangeState = 'idle';
let npcOrangeHitTime = 0;

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
    
    // Новые элементы UI
    flyIndicator = document.getElementById('fly-indicator');
    dialogWindow = document.getElementById('dialog-window');
    dialogText = document.getElementById('dialog-text');
    dialogOptions = document.getElementById('dialog-options');
    
    // Элементы платформы
    platformIndicator = document.getElementById('platform-indicator');
    teleportPrompt = document.getElementById('teleport-prompt');
    
    // Подсказки для мяча
    ballPickupPrompt = document.getElementById('ball-pickup-prompt');
    ballThrowPrompt = document.getElementById('ball-throw-prompt');

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
    
    // Создаём кнопку телепортации в деревне
    createVillageTeleportButton();

    // Генерируем деревья и горы
    generateNature();
    
    // Создаём мяч
    createBall();

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

    // Правая рука
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

    // Стены дома (увеличено в 1.5 раза от оригинала)
    const wallsGeometry = new THREE.BoxGeometry(12, 18, 12);
    const wallsMaterial = createMaterial(0xdeb887);
    const walls = new THREE.Mesh(wallsGeometry, wallsMaterial);
    walls.position.y = 9;
    walls.castShadow = currentGraphicsMode === 'high';
    walls.receiveShadow = currentGraphicsMode === 'high';
    houseGroup.add(walls);
    objectsWithMaterials.push(walls);

    // Крыша (пирамида, увеличена высота в 3 раза)
    const roofGeometry = new THREE.ConeGeometry(9, 12, 4);
    const roofMaterial = createMaterial(0x8b4513);
    const roof = new THREE.Mesh(roofGeometry, roofMaterial);
    roof.position.y = 24;
    roof.rotation.y = Math.PI / 4;
    roof.castShadow = currentGraphicsMode === 'high';
    roof.receiveShadow = currentGraphicsMode === 'high';
    houseGroup.add(roof);
    objectsWithMaterials.push(roof);

    houseGroup.position.set(x, 0, z);
    scene.add(houseGroup);
    villageBuildings.push(houseGroup);

    // Добавляем в препятствия для коллизий
    obstacles.push({ x, z, radius: 8, type: 'house' });
    
    // Добавляем кнопку полёта на крышу
    createFlyButton(x, z);
}

// Создание деревни
function createVillage() {
    // Создаём дорогу в центре деревни
    const roadGeometry = new THREE.PlaneGeometry(40, 40);
    const roadMaterial = createMaterial(0x8b7355);
    const road = new THREE.Mesh(roadGeometry, roadMaterial);
    road.rotation.x = -Math.PI / 2;
    road.position.set(-35, 0.1, -35); // Чуть выше земли
    road.receiveShadow = currentGraphicsMode === 'high';
    scene.add(road);
    objectsWithMaterials.push(road);

    // Создаём клочок земли с деревом в центре деревни (на тропинке)
    const groundGeometry = new THREE.CircleGeometry(4, 8);
    const groundMaterial = createMaterial(0x228b22);
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(-35, 0.15, -35); // Чуть выше дороги
    ground.receiveShadow = currentGraphicsMode === 'high';
    scene.add(ground);
    objectsWithMaterials.push(ground);
    
    // Добавляем дерево в центре деревни
    createTree(-35, -35);

    // Создаём дома с большими расстояниями (вокруг дороги)
    // Проверяем каждое место на пересечение с горами
    const housePositions = [
        { x: -55, z: -55 },
        { x: -15, z: -55 },
        { x: -55, z: -15 },
        { x: -15, z: -15 },
        { x: -65, z: -35 },
        { x: -5, z: -35 }
    ];

    housePositions.forEach(pos => {
        // Проверяем, не пересекается ли позиция с горами
        let overlapsWithMountain = false;
        for (const obstacle of obstacles) {
            if (obstacle.type === 'mountain') {
                const dist = Math.sqrt((pos.x - obstacle.x) ** 2 + (pos.z - obstacle.z) ** 2);
                if (dist < obstacle.radius + 8) { // 8 - радиус дома
                    overlapsWithMountain = true;
                    break;
                }
            }
        }
        
        // Создаём дом только если нет пересечения с горами
        if (!overlapsWithMountain) {
            createHouse(pos.x, pos.z);
        }
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
    obstacles.push({ x, z, radius: 12 * size, type: 'mountain' });
}

// Создание кнопки полёта на домике
function createFlyButton(x, z) {
    const buttonGeometry = new THREE.SphereGeometry(1.5, 16, 16);
    const buttonMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x00bfff,
        emissive: 0x0066ff,
        emissiveIntensity: 0.5
    });
    const button = new THREE.Mesh(buttonGeometry, buttonMaterial);
    // Позиция на крыше дома (крыша на высоте 24, добавляем немного)
    button.position.set(x, 30, z);
    button.castShadow = currentGraphicsMode === 'high';
    scene.add(button);
    
    // Добавляем в массив кнопок
    flyButtons.push({
        mesh: button,
        houseX: x,
        houseZ: z,
        active: true,
        type: 'fly'
    });
}

// Создание кнопки телепортации - КРАСНАЯ КНОПКА НА СТЕНЕ В ДЕРЕВНЕ
function createVillageTeleportButton() {
    // Позиция в деревне, недалеко от центрального дерева (-35, -35)
    const buttonX = -25;
    const buttonZ = -35;
    
    // Создаём небольшую стенку
    const wallGeometry = new THREE.BoxGeometry(4, 6, 0.5);
    const wallMaterial = new THREE.MeshStandardMaterial({ color: 0x666666 });
    const wall = new THREE.Mesh(wallGeometry, wallMaterial);
    wall.position.set(buttonX, 3, buttonZ);
    wall.castShadow = currentGraphicsMode === 'high';
    wall.receiveShadow = currentGraphicsMode === 'high';
    scene.add(wall);
    
    // Создаём красную кнопку на стенке
    const buttonGeometry = new THREE.CylinderGeometry(0.5, 0.5, 0.3, 16);
    const buttonMaterial = new THREE.MeshStandardMaterial({ 
        color: 0xff0000,
        emissive: 0xaa0000,
        emissiveIntensity: 0.5
    });
    const button = new THREE.Mesh(buttonGeometry, buttonMaterial);
    // Кнопка на передней стороне стенки
    button.rotation.x = Math.PI / 2;
    button.position.set(buttonX, 3.5, buttonZ + 0.4);
    button.castShadow = currentGraphicsMode === 'high';
    scene.add(button);
    
    villageTeleportButton = {
        mesh: button,
        wall: wall,
        x: buttonX,
        z: buttonZ,
        active: true,
        type: 'teleport'
    };
}

// Создание платформы - ЖЕЛЕЗНАЯ ПЛОСКАЯ ПЛАТФОРМА
function createPlatform() {
    const platformGeometry = new THREE.BoxGeometry(40, 1, 40);
    const platformMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x555555,
        metalness: 0.8,
        roughness: 0.2
    });
    platform = new THREE.Mesh(platformGeometry, platformMaterial);
    platform.position.set(0, 80, 0); // Платформа на высоте 80
    platform.castShadow = currentGraphicsMode === 'high';
    platform.receiveShadow = currentGraphicsMode === 'high';
    scene.add(platform);
}

// Активация платформы
function activatePlatform() {
    if (!platform) {
        createPlatform();
    }
    platformActive = true;
    platform.visible = true;
    
    // Телепортируем игрока на платформу
    player.position.set(0, 85, 0);
    player.position.y = 85;
    verticalVelocity = 0;
    isJumping = false;
}

// Деактивация платформы
function deactivatePlatform() {
    platformActive = false;
    if (platform) {
        platform.visible = false;
    }
    playerOnPlatform = false;
}

// Создание мяча
function createBall() {
    const ballGeometry = new THREE.SphereGeometry(1.5, 32, 32);
    const ballMaterial = new THREE.MeshStandardMaterial({ 
        color: 0xffffff,
        roughness: 0.4,
        metalness: 0.1
    });
    ball = new THREE.Mesh(ballGeometry, ballMaterial);
    ball.position.set(10, 2, 0);
    ball.castShadow = currentGraphicsMode === 'high';
    scene.add(ball);
}

// Генерация деревьев и гор
function generateNature() {
    // Зоны для генерации (исключая центр с деревней и спавн)
    // Зона деревни увеличена в 2 раза (было 25, стало 50)
    const villageZone = { x: -35, z: -35, radius: 50 };
    const spawnZone = { x: 0, z: 10, radius: 15 };
    
    // Зона патрулирования оранжевого NPC (круг радиусом islandSize/2 - 10)
    const patrolRadius = islandSize / 2 - 10;
    const patrolZoneWidth = 15; // Увеличенная ширина зоны вокруг маршрута

    // Сначала генерируем горы и сохраняем их позиции
    const mountainPositions = [];
    for (let i = 0; i < 8; i++) {
        const angle = Math.random() * Math.PI * 2;
        const radius = islandSize / 2 - 15 - Math.random() * 20;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;

        const distToVillage = Math.sqrt((x - villageZone.x) ** 2 + (z - villageZone.z) ** 2);
        const distToSpawn = Math.sqrt((x - spawnZone.x) ** 2 + (z - spawnZone.z) ** 2);
        
        // Проверяем расстояние до маршрута патрулирования (расстояние от точки до круга)
        const distFromCenter = Math.sqrt(x * x + z * z);
        const distToPatrol = Math.abs(distFromCenter - patrolRadius);

        if (distToVillage > villageZone.radius + 10 && 
            distToSpawn > spawnZone.radius + 10 && 
            distToPatrol > patrolZoneWidth) {
            const size = 0.8 + Math.random() * 0.5;
            createMountain(x, z, size);
            // Сохраняем позицию горы с её радиусом
            mountainPositions.push({ x, z, radius: 12 * size });
        }
    }

    // Генерируем деревья с проверкой на пересечение с горами и маршрутом NPC
    for (let i = 0; i < 50; i++) {
        const angle = Math.random() * Math.PI * 2;
        const radius = Math.random() * (islandSize / 2 - 10);
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;

        // Проверяем, не слишком ли близко к деревне или спавну
        const distToVillage = Math.sqrt((x - villageZone.x) ** 2 + (z - villageZone.z) ** 2);
        const distToSpawn = Math.sqrt((x - spawnZone.x) ** 2 + (z - spawnZone.z) ** 2);
        
        // Проверяем расстояние до маршрута патрулирования
        const distFromCenter = Math.sqrt(x * x + z * z);
        const distToPatrol = Math.abs(distFromCenter - patrolRadius);

        if (distToVillage > villageZone.radius + 5 && 
            distToSpawn > spawnZone.radius + 5 && 
            distToPatrol > patrolZoneWidth) {
            // Проверяем пересечение с горами
            let overlapsWithMountain = false;
            for (const mountain of mountainPositions) {
                const distToMountain = Math.sqrt((x - mountain.x) ** 2 + (z - mountain.z) ** 2);
                // Если дерево слишком близко к горе (радиус горы + радиус дерева)
                if (distToMountain < mountain.radius + 2) {
                    overlapsWithMountain = true;
                    break;
                }
            }

            // Создаём дерево только если нет пересечения с горами
            if (!overlapsWithMountain) {
                createTree(x, z);
            }
        }
    }

    // Добавляем контролируемые деревья в зоне деревни (без гор, точно не заденут дома)
    addVillageTrees(villageZone);

    // Очищаем зону деревни от гор и лишних деревьев (кроме центрального дерева)
    clearVillageZone(villageZone);
}

// Добавление контролируемых деревьев в зоне деревни
function addVillageTrees(villageZone) {
    // Позиции для деревьев вокруг деревни (безопасные места)
    const treePositions = [
        { x: -80, z: -35 },
        { x: -55, z: -80 },
        { x: -15, z: -80 },
        { x: 10, z: -35 },
        { x: 10, z: -80 },
        { x: -80, z: -80 }
    ];

    treePositions.forEach(pos => {
        createTree(pos.x, pos.z);
    });
}

// Очистка зоны деревни от гор и лишних деревьев
function clearVillageZone(villageZone) {
    // Удаляем горы из зоны деревни
    for (let i = obstacles.length - 1; i >= 0; i--) {
        const obstacle = obstacles[i];
        const distToVillage = Math.sqrt((obstacle.x - villageZone.x) ** 2 + (obstacle.z - villageZone.z) ** 2);
        
        // Если гора в зоне деревни
        if (obstacle.type === 'mountain' && distToVillage < villageZone.radius) {
            // Находим и удаляем меш горы из сцены
            for (let j = scene.children.length - 1; j >= 0; j--) {
                const child = scene.children[j];
                if (child.type === 'Mesh' && child.geometry && child.geometry.type === 'ConeGeometry') {
                    const worldPos = new THREE.Vector3();
                    child.getWorldPosition(worldPos);
                    const distToObstacle = Math.sqrt((worldPos.x - obstacle.x) ** 2 + (worldPos.z - obstacle.z) ** 2);
                    if (distToObstacle < 1) {
                        scene.remove(child);
                        break;
                    }
                }
            }
            obstacles.splice(i, 1);
        }
    }
    
    // Удаляем деревья из зоны деревни (кроме центрального -35, -35)
    for (let i = obstacles.length - 1; i >= 0; i--) {
        const obstacle = obstacles[i];
        const distToVillage = Math.sqrt((obstacle.x - villageZone.x) ** 2 + (obstacle.z - villageZone.z) ** 2);
        
        // Если дерево в зоне деревни и это не центральное дерево
        if (obstacle.type !== 'house' && obstacle.type !== 'mountain' && distToVillage < villageZone.radius - 5) {
            // Проверяем, не центральное ли это дерево
            const distToCenter = Math.sqrt((obstacle.x + 35) ** 2 + (obstacle.z + 35) ** 2);
            if (distToCenter > 3) { // Не центральное дерево
                // Находим и удаляем меш дерева из сцены
                for (let j = scene.children.length - 1; j >= 0; j--) {
                    const child = scene.children[j];
                    if (child.type === 'Group') {
                        const worldPos = new THREE.Vector3();
                        child.getWorldPosition(worldPos);
                        const distToObstacle = Math.sqrt((worldPos.x - obstacle.x) ** 2 + (worldPos.z - obstacle.z) ** 2);
                        if (distToObstacle < 1) {
                            scene.remove(child);
                            break;
                        }
                    }
                }
                obstacles.splice(i, 1);
            }
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
                // Обработка двойного нажатия для отключения полёта
                const currentTime = performance.now();
                if (flyMode) {
                    if (currentTime - lastSpaceTime < 300) {
                        // Двойное нажатие - отключаем полёт
                        flyMode = false;
                        flyIndicator.classList.add('hidden');
                        spacePressCount = 0;
                    } else {
                        spacePressCount = 1;
                    }
                    lastSpaceTime = currentTime;
                } else {
                    if (canJump && !isJumping) {
                        verticalVelocity = jumpForce;
                        isJumping = true;
                        canJump = false;
                    }
                }
                break;
            case 'KeyE':
                tryInteract();
                break;
            case 'KeyF':
                // Активация режима полёта кнопкой F (альтернатива)
                if (flyButtonEnabled && !flyMode) {
                    activateFlyMode();
                }
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
    // Проверяем, не открыто ли диалоговое окно
    if (!dialogWindow.classList.contains('hidden')) {
        return;
    }
    
    // Проверяем кнопку телепортации в деревне
    if (villageTeleportButton && villageTeleportButton.active && !platformActive) {
        const distToTeleport = player.position.distanceTo(villageTeleportButton.mesh.position);
        if (distToTeleport < 10) {
            activatePlatform();
            return;
        }
    }
    
    // Проверяем кнопки полёта
    if (!flyMode && !platformActive) {
        for (const button of flyButtons) {
            if (!button.active || button.type !== 'fly') continue;
            
            const dist = player.position.distanceTo(button.mesh.position);
            if (dist < 8) {
                activateFlyMode();
                return;
            }
        }
    }
    
    // Проверяем мяч
    if (ball && !hasBall) {
        const distToBall = player.position.distanceTo(ball.position);
        if (distToBall < 5) {
            pickUpBall();
            return;
        }
    }
    
    // Если мяч у игрока - бросаем
    if (hasBall) {
        throwBall();
        return;
    }
    
    // Проверяем NPC
    const distance = player.position.distanceTo(npcOrange.position);
    if (distance < 10) {
        startDialog();
    }
}

// Активация режима полёта
function activateFlyMode() {
    flyMode = true;
    flyIndicator.classList.remove('hidden');
    isJumping = false;
    canJump = true;
    verticalVelocity = 0;
}

// Подбор мяча
function pickUpBall() {
    hasBall = true;
    ballThrown = false;
    // Прикрепляем мяч к камере (визуально)
    ball.position.copy(camera.position);
    // Смещаем немного вперёд и вниз
    const forward = new THREE.Vector3(
        -Math.sin(yaw),
        0,
        -Math.cos(yaw)
    );
    ball.position.add(forward.multiplyScalar(3));
    ball.position.y -= 1;
}

// Бросок мяча
function throwBall() {
    hasBall = false;
    ballThrown = true;
    
    // Направление броска - ПРОТИВОПОЛОЖНОЕ тому, куда смотрит игрок
    const throwDir = new THREE.Vector3(
        Math.sin(yaw) * Math.cos(pitch),  // Инвертировано
        -Math.sin(pitch),                  // Инвертировано по вертикали
        Math.cos(yaw) * Math.cos(pitch)    // Инвертировано
    );
    throwDir.normalize();
    
    // Скорость броска
    const throwSpeed = 2;
    ballVelocity.copy(throwDir).multiplyScalar(throwSpeed);
}

// Обновление физики мяча
function updateBall() {
    if (!ball) return;
    
    if (hasBall) {
        // Мяч у игрока - следует за камерой
        const forward = new THREE.Vector3(
            -Math.sin(yaw),
            0,
            -Math.cos(yaw)
        );
        ball.position.copy(camera.position);
        ball.position.add(forward.multiplyScalar(3));
        ball.position.y -= 1;
        ballVelocity.set(0, 0, 0);
    } else if (ballThrown) {
        // Мяч в полёте
        const oldPos = ball.position.clone();
        ball.position.add(ballVelocity);
        
        // Гравитация
        ballVelocity.y -= 0.05;
        
        // Проверка столкновения с землёй
        if (ball.position.y <= 2) {
            ball.position.y = 2;
            ballVelocity.y = -ballVelocity.y * 0.6; // Отскок
            ballVelocity.x *= 0.8;
            ballVelocity.z *= 0.8;
            
            // Если скорость маленькая - останавливаем
            if (Math.abs(ballVelocity.y) < 0.1) {
                ballVelocity.y = 0;
                ballThrown = false;
            }
        }
        
        // Проверка коллизий с препятствиями
        for (const obstacle of obstacles) {
            const dx = ball.position.x - obstacle.x;
            const dz = ball.position.z - obstacle.z;
            const distance = Math.sqrt(dx * dx + dz * dz);
            
            if (distance < obstacle.radius + 1.5) {
                // Отскок от препятствия
                const normal = new THREE.Vector3(dx, 0, dz).normalize();
                const dot = ballVelocity.dot(normal);
                ballVelocity.sub(normal.multiplyScalar(2 * dot));
                ballVelocity.multiplyScalar(0.7); // Потеря энергии
            }
        }
        
        // Проверка попадания в NPC
        const npcs = [npcOrange, npcPurple, npcGreen, npcPink];
        for (const npc of npcs) {
            const dist = ball.position.distanceTo(npc.position);
            if (dist < 4) {
                // Попадание! NPC подлетает
                hitNPC(npc);
                ballVelocity.y = -ballVelocity.y * 0.5;
                ballVelocity.x *= 0.5;
                ballVelocity.z *= 0.5;
            }
        }
        
        // Границы острова
        const limit = islandSize / 2 - 2;
        if (Math.abs(ball.position.x) > limit || Math.abs(ball.position.z) > limit) {
            // Возвращаем мяч на исходную позицию
            resetBall();
        }
    }
}

// Попадание в NPC
function hitNPC(npc) {
    // NPC подлетает вверх и получает состояние "оглушён"
    if (npc === npcOrange) {
        npcOrangeVel = 0.6;
        npcOrangeState = 'hit';
        npcOrangeHitTime = 60; // 60 кадров = 1 секунда на восстановление
    } else if (npc === npcPurple) {
        npcPurpleVel = 0.6;
        npcPurpleState = 'hit';
        npcPurpleHitTime = 60;
    } else if (npc === npcGreen) {
        npcGreenVel = 0.6;
        npcGreenState = 'hit';
        npcGreenHitTime = 60;
    } else if (npc === npcPink) {
        npcPinkVel = 0.6;
        npcPinkState = 'hit';
        npcPinkHitTime = 60;
    }
}

// Сброс мяча
function resetBall() {
    ballThrown = false;
    hasBall = false;
    ballVelocity.set(0, 0, 0);
    ball.position.set(10, 2, 0);
}

// Структура диалогов
const dialogTree = {
    start: [
        {
            text: "Привет! Я фанат новой земли!",
            options: [
                { text: "Привет! Расскажи о себе", next: "about" },
                { text: "Что ты здесь делаешь?", next: "what_doing" },
                { text: "Пока!", next: "goodbye" }
            ]
        },
        {
            text: "Привет, как дела?",
            options: [
                { text: "Хорошо, а у тебя?", next: "how_are_you" },
                { text: "Нормально. Что нового?", next: "whats_new" },
                { text: "Пока!", next: "goodbye" }
            ]
        },
        {
            text: "Привет!",
            options: [
                { text: "Привет! Как жизнь?", next: "how_life" },
                { text: "Здравствуй! Есть новости?", next: "whats_new" },
                { text: "Пока!", next: "goodbye" }
            ]
        }
    ],
    about: [
        {
            text: "Я живу на этом острове уже давно. Мне нравится наблюдать за новыми землями!",
            options: [
                { text: "Что такое новая земля?", next: "new_land" },
                { text: "А давно ты здесь?", next: "how_long" },
                { text: "Понятно. Пока!", next: "goodbye" }
            ]
        }
    ],
    how_are_you: [
        {
            text: "Отлично! Каждый день гуляю по острову, любуюсь видами.",
            options: [
                { text: "Здорово! А не скучно?", next: "boring" },
                { text: "Расскажи про остров", next: "about_island" },
                { text: "Пока!", next: "goodbye" }
            ]
        }
    ],
    how_life: [
        {
            text: "Жизнь прекрасна! Остров большой, есть где погулять.",
            options: [
                { text: "А что на острове интересного?", next: "about_island" },
                { text: "Понятно. Пока!", next: "goodbye" }
            ]
        }
    ],
    what_doing: [
        {
            text: "Патрулирую территорию. Люблю прогуляться вокруг острова.",
            options: [
                { text: "А зачем патрулируешь?", next: "why_patrol" },
                { text: "Понятно. Пока!", next: "goodbye" }
            ]
        }
    ],
    whats_new: [
        {
            text: "Да ничего особенного. Деревья растут, горы стоят... Красота!",
            options: [
                { text: "А люди есть ещё?", next: "other_people" },
                { text: "Понятно. Пока!", next: "goodbye" }
            ]
        }
    ],
    new_land: [
        {
            text: "Это земли за пределами нашего острова. Говорят, там есть другие миры!",
            options: [
                { text: "Интересно... А ты был там?", next: "been_there" },
                { text: "Понятно. Пока!", next: "goodbye" }
            ]
        }
    ],
    how_long: [
        {
            text: "О, уже очень давно! С тех пор как построили эти дома.",
            options: [
                { text: "Кто построил дома?", next: "who_built" },
                { text: "Понятно. Пока!", next: "goodbye" }
            ]
        }
    ],
    boring: [
        {
            text: "Что ты! Здесь всегда что-то происходит. То мяч прикатится, то ещё кто-то появится.",
            options: [
                { text: "Да, тут весело!", next: "goodbye" },
                { text: "Пока!", next: "goodbye" }
            ]
        }
    ],
    about_island: [
        {
            text: "Остров большой! Есть деревня, горы, леса. Красивое место!",
            options: [
                { text: "Согласен! Пока!", next: "goodbye" }
            ]
        }
    ],
    why_patrol: [
        {
            text: "Просто люблю порядок. Чтобы всё было на своих местах.",
            options: [
                { text: "Похвально! Пока!", next: "goodbye" }
            ]
        }
    ],
    other_people: [
        {
            text: "Конечно! Вон сколько вокруг: фиолетовый, зелёный, розовый...",
            options: [
                { text: "Да, я видел их. Пока!", next: "goodbye" }
            ]
        }
    ],
    been_there: [
        {
            text: "Нет, но мечтаю когда-нибудь добраться!",
            options: [
                { text: "Удачи! Пока!", next: "goodbye" }
            ]
        }
    ],
    who_built: [
        {
            text: "Говорят, древние строители. Но это уже легенда...",
            options: [
                { text: "Интересно! Пока!", next: "goodbye" }
            ]
        }
    ],
    goodbye: [
        {
            text: "Пока! Заходи ещё!",
            options: []
        }
    ]
};

// Начало диалога
function startDialog() {
    if (!dialogWindow.classList.contains('hidden')) {
        return;
    }
    
    // Выбираем случайную стартовую фразу
    const startDialogs = dialogTree.start;
    const randomIndex = Math.floor(Math.random() * startDialogs.length);
    currentDialogNode = startDialogs[randomIndex];
    
    showDialogNode(currentDialogNode);
}

// Показ узла диалога
function showDialogNode(node) {
    dialogText.textContent = node.text;
    dialogOptions.innerHTML = '';

    if (node.options.length === 0) {
        // Конец диалога - автоматически закрываем через 2 секунды
        const closeInfo = document.createElement('div');
        closeInfo.style.color = '#aaa';
        closeInfo.style.fontSize = '14px';
        closeInfo.style.marginTop = '10px';
        closeInfo.textContent = 'Диалог закроется автоматически...';
        dialogOptions.appendChild(closeInfo);
        
        setTimeout(() => {
            closeDialog();
        }, 2000);
    } else {
        node.options.forEach(option => {
            const btn = document.createElement('button');
            btn.className = 'dialog-option-btn';
            btn.textContent = option.text;
            btn.addEventListener('click', () => {
                if (option.next) {
                    const nextNode = dialogTree[option.next][0];
                    currentDialogNode = nextNode;
                    showDialogNode(nextNode);
                }
            });
            dialogOptions.appendChild(btn);
        });
    }

    dialogWindow.classList.remove('hidden');
    document.exitPointerLock();
}

// Закрытие диалога
function closeDialog() {
    dialogWindow.classList.add('hidden');
    document.body.requestPointerLock();
    currentDialogNode = null;
}

// Обработка клавиши Esc для закрытия диалога
document.addEventListener('keydown', (event) => {
    if (event.code === 'Escape' && !dialogWindow.classList.contains('hidden')) {
        closeDialog();
    }
});

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

    // Проверяем коллизии с NPC (NPC - твёрдые объекты)
    const npcRadius = 2;
    const npcs = [npcOrange, npcPurple, npcGreen, npcPink];

    for (const npc of npcs) {
        const dx = newX - npc.position.x;
        const dz = newZ - npc.position.z;
        const distance = Math.sqrt(dx * dx + dz * dz);

        if (distance < playerRadius + npcRadius) {
            return true; // Столкновение с NPC
        }
    }

    return false;
}

// Проверка коллизии NPC с препятствиями
function checkObstacleCollision(npc, newX, newZ) {
    const npcRadius = 2;

    for (const obstacle of obstacles) {
        const dx = newX - obstacle.x;
        const dz = newZ - obstacle.z;
        const distance = Math.sqrt(dx * dx + dz * dz);

        if (distance < npcRadius + obstacle.radius) {
            return true; // Столкновение
        }
    }
    
    // Проверяем коллизии с другими NPC
    const npcs = [npcOrange, npcPurple, npcGreen, npcPink];
    for (const otherNpc of npcs) {
        if (otherNpc === npc) continue; // Не проверять себя
        
        const dx = newX - otherNpc.position.x;
        const dz = newZ - otherNpc.position.z;
        const distance = Math.sqrt(dx * dx + dz * dz);
        
        if (distance < npcRadius + 2) { // 2 - радиус другого NPC
            return true;
        }
    }

    return false;
}

// Вытолкнуть NPC из препятствия если он застрял
function pushNpcOutOfObstacles(npc) {
    const npcRadius = 2;
    const pushDistance = 0.2;
    
    for (const obstacle of obstacles) {
        const dx = npc.position.x - obstacle.x;
        const dz = npc.position.z - obstacle.z;
        const distance = Math.sqrt(dx * dx + dz * dz);
        const minDistance = npcRadius + obstacle.radius;
        
        if (distance < minDistance && distance > 0) {
            // Выталкиваем NPC из препятствия
            const pushX = (dx / distance) * pushDistance;
            const pushZ = (dz / distance) * pushDistance;
            npc.position.x += pushX;
            npc.position.z += pushZ;
        }
    }
}

// Проверка и обработка коллизий с NPC (толкание)
function checkNPCCollisions() {
    const playerRadius = 2.5;
    const npcRadius = 2;
    const pushForce = 0.15; // Сила толчка

    const npcs = [npcOrange, npcPurple, npcGreen, npcPink];

    for (const npc of npcs) {
        const dx = player.position.x - npc.position.x;
        const dz = player.position.z - npc.position.z;
        const distance = Math.sqrt(dx * dx + dz * dz);

        // Если есть столкновение
        if (distance < playerRadius + npcRadius) {
            // Вычисляем направление отталкивания
            const pushDirX = dx / distance;
            const pushDirZ = dz / distance;

            // Толкаем NPC
            npc.position.x -= pushDirX * pushForce;
            npc.position.z -= pushDirZ * pushForce;

            // Ограничиваем позицию NPC
            const limit = islandSize / 2 - 5;
            npc.position.x = Math.max(-limit, Math.min(limit, npc.position.x));
            npc.position.z = Math.max(-limit, Math.min(limit, npc.position.z));
        }
    }
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

        if (flyMode) {
            // В режиме полёта игрок летит без ограничений
            player.position.x += moveX;
            player.position.z += moveZ;
            
            // Вертикальное движение в режиме полёта (W/S + Space/Ctrl)
            if (keyForward) {
                player.position.y += playerSpeed;
            }
            if (keyBackward) {
                player.position.y -= playerSpeed;
            }
            
            // Ограничения по высоте в режиме полёта
            const flyLimit = 50;
            player.position.y = Math.max(2, Math.min(flyLimit, player.position.y));
        } else if (platformActive) {
            // Игрок на платформе
            const platformLimit = 19; // Половина размера платформы (40/2 - 1)
            
            // Двигаем игрока
            player.position.x += moveX;
            player.position.z += moveZ;
            
            // Проверяем, находится ли игрок на платформе
            const onPlatform = Math.abs(player.position.x) <= platformLimit && 
                              Math.abs(player.position.z) <= platformLimit &&
                              player.position.y >= 84;
            
            if (onPlatform) {
                // Игрок на платформе - фиксируем высоту
                player.position.y = 85;
                verticalVelocity = 0;
                isJumping = false;
            } else {
                // Игрок сошёл с платформы или упал - обычная физика
                player.position.y += verticalVelocity;
                verticalVelocity -= gravity;
                
                if (player.position.y <= 2) {
                    player.position.y = 2;
                    verticalVelocity = 0;
                    isJumping = false;
                    canJump = true;
                }
                
                // Если игрок упал ниже платформы - деактивируем её
                if (player.position.y < 80) {
                    deactivatePlatform();
                }
            }
        } else {
            // Обычное движение с коллизиями
            const newX = player.position.x + moveX;
            const newZ = player.position.z + moveZ;

            if (!checkCollision(newX, player.position.z)) {
                player.position.x = newX;
            }
            if (!checkCollision(player.position.x, newZ)) {
                player.position.z = newZ;
            }
            
            // Гравитация
            player.position.y += verticalVelocity;
            verticalVelocity -= gravity;

            if (player.position.y <= playerStartY) {
                player.position.y = playerStartY;
                verticalVelocity = 0;
                isJumping = false;
                canJump = true;
            }
        }

        const limit = islandSize / 2 - 2;
        player.position.x = Math.max(-limit, Math.min(limit, player.position.x));
        player.position.z = Math.max(-limit, Math.min(limit, player.position.z));

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
        camera.position.y = player.position.y + eyeHeight;
        camera.position.z = player.position.z;

        // Вычисляем направление взгляда с учётом yaw и pitch
        const lookDist = 10;
        const lookX = camera.position.x + Math.sin(yaw) * lookDist;
        const lookY = camera.position.y + Math.tan(pitch) * lookDist;
        const lookZ = camera.position.z + Math.cos(yaw) * lookDist;

        // Направляем камеру в сторону взгляда
        camera.lookAt(lookX, lookY, lookZ);

        // Проверяем коллизии с NPC (толкание)
        checkNPCCollisions();
        
        // Проверяем доступность кнопок полёта
        flyButtonEnabled = false;
        if (!flyMode && !platformActive) {
            for (const button of flyButtons) {
                if (!button.active || button.type !== 'fly') continue;
                const dist = player.position.distanceTo(button.mesh.position);
                if (dist < 8) {
                    flyButtonEnabled = true;
                    break;
                }
            }
        }
        
        // Обновляем индикаторы
        if (platformIndicator) {
            platformIndicator.classList.toggle('hidden', !platformActive);
        }
        
        // Показываем подсказку телепортации если рядом с кнопкой
        if (teleportPrompt && villageTeleportButton) {
            const distToTeleport = player.position.distanceTo(villageTeleportButton.mesh.position);
            teleportPrompt.classList.toggle('hidden', distToTeleport >= 10 || platformActive);
        }
        
        // Подсказки для мяча
        if (ballPickupPrompt && ball && !hasBall) {
            const distToBall = player.position.distanceTo(ball.position);
            ballPickupPrompt.classList.toggle('hidden', distToBall >= 5);
        } else if (ballPickupPrompt) {
            ballPickupPrompt.classList.add('hidden');
        }
        
        if (ballThrowPrompt && hasBall) {
            ballThrowPrompt.classList.remove('hidden');
        } else if (ballThrowPrompt) {
            ballThrowPrompt.classList.add('hidden');
        }
    }
}

function updateOrangeNPC() {
    // Сначала выталкиваем NPC если он застрял в препятствии
    pushNpcOutOfObstacles(npcOrange);
    
    // Если идёт диалог - NPC стоит на месте
    if (!dialogWindow.classList.contains('hidden')) {
        // Анимация стояния
        npcOrange.userData.leftArm.rotation.x = 0;
        npcOrange.userData.rightArm.rotation.x = 0;
        npcOrange.userData.leftLeg.rotation.x = 0;
        npcOrange.userData.rightLeg.rotation.x = 0;
        return;
    }

    // Если NPC оглушён попаданием мяча
    if (npcOrangeState === 'hit') {
        npcOrangeHitTime--;

        // Гравитация
        npcOrangeVel -= gravity;
        npcOrange.position.y += npcOrangeVel;

        if (npcOrange.position.y <= 2) {
            npcOrange.position.y = 2;
            npcOrangeVel = 0;

            // После приземления ждём ещё немного и возвращаемся к патрулированию
            if (npcOrangeHitTime <= 0) {
                npcOrangeState = 'idle';
            }
        }

        // Анимация падения
        npcOrange.userData.leftArm.rotation.x = -Math.PI / 2;
        npcOrange.userData.rightArm.rotation.x = -Math.PI / 2;
        npcOrange.userData.leftLeg.rotation.x = -0.3;
        npcOrange.userData.rightLeg.rotation.x = -0.3;
        return;
    }

    const patrolRadius = islandSize / 2 - 10;
    const time = Date.now() * 0.00015; // Скорость понижена до ~0.30 (было 0.0005)

    // Вычисляем следующую позицию
    const nextX = Math.cos(time) * patrolRadius;
    const nextZ = Math.sin(time) * patrolRadius;
    
    // Проверяем коллизии с препятствиями
    if (!checkObstacleCollision(npcOrange, nextX, nextZ)) {
        npcOrange.position.x = nextX;
        npcOrange.position.z = nextZ;
    }
    // Если есть препятствие - NPC остаётся на месте пока не пройдёт
    
    npcOrange.position.y = 2;

    // Поворачиваем по направлению движения
    const lookAheadTime = time + 0.1;
    const lookX = Math.cos(lookAheadTime) * patrolRadius;
    const lookZ = Math.sin(lookAheadTime) * patrolRadius;
    npcOrange.lookAt(lookX, 2, lookZ);

    // Анимация ходьбы
    npcOrange.userData.walkTime += 0.15;
    npcOrange.userData.leftArm.rotation.x = Math.sin(npcOrange.userData.walkTime) * 0.5;
    npcOrange.userData.rightArm.rotation.x = Math.sin(npcOrange.userData.walkTime + Math.PI) * 0.5;
    npcOrange.userData.leftLeg.rotation.x = Math.sin(npcOrange.userData.walkTime + Math.PI) * 0.5;
    npcOrange.userData.rightLeg.rotation.x = Math.sin(npcOrange.userData.walkTime) * 0.5;
}

function updateJumpingNPC(npc, npcY, npcVel, moveDir, moveTime, state, hitTime, npcName) {
    const limit = islandSize / 2 - 5;

    // Сначала выталкиваем NPC если он застрял в препятствии
    pushNpcOutOfObstacles(npc);

    // Если NPC оглушён попаданием мяча
    if (state === 'hit') {
        hitTime--;
        
        // Гравитация
        npcVel -= gravity;
        npcY += npcVel;
        
        if (npcY <= 2) {
            npcY = 2;
            npcVel = 0;
            
            // После приземления ждём ещё немного и возвращаемся к обычному состоянию
            if (hitTime <= 0) {
                state = 'idle';
            }
        }
        
        // Анимация падения
        npc.userData.leftArm.rotation.x = -Math.PI / 2;
        npc.userData.rightArm.rotation.x = -Math.PI / 2;
        npc.userData.leftLeg.rotation.x = -0.3;
        npc.userData.rightLeg.rotation.x = -0.3;
        
        // Возвращаем значения обратно
        return { npcY, npcVel, moveDir, moveTime, state, hitTime };
    }

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

        // Вычисляем новую позицию
        const newX = npc.position.x + moveDir.x * 0.1;
        const newZ = npc.position.z + moveDir.z * 0.1;

        // Проверяем коллизии с препятствиями
        if (!checkObstacleCollision(npc, newX, newZ)) {
            // Двигаемся только если нет препятствий
            npc.position.x = newX;
            npc.position.z = newZ;
        } else {
            // Если препятствие - меняем направление
            state = 'idle';
        }

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
    return { npcY, npcVel, moveDir, moveTime, state, hitTime };
}

function updatePurpleNPC() {
    const result = updateJumpingNPC(
        npcPurple,
        npcPurpleY,
        npcPurpleVel,
        npcPurpleMoveDir,
        npcPurpleMoveTime,
        npcPurpleState,
        npcPurpleHitTime,
        'purple'
    );
    npcPurpleY = result.npcY;
    npcPurpleVel = result.npcVel;
    npcPurpleMoveDir = result.moveDir;
    npcPurpleMoveTime = result.moveTime;
    npcPurpleState = result.state;
    npcPurpleHitTime = result.hitTime;
}

function updateGreenNPC() {
    const result = updateJumpingNPC(
        npcGreen,
        npcGreenY,
        npcGreenVel,
        npcGreenMoveDir,
        npcGreenMoveTime,
        npcGreenState,
        npcGreenHitTime,
        'green'
    );
    npcGreenY = result.npcY;
    npcGreenVel = result.npcVel;
    npcGreenMoveDir = result.moveDir;
    npcGreenMoveTime = result.moveTime;
    npcGreenState = result.state;
    npcGreenHitTime = result.hitTime;
}

function updatePinkNPC() {
    const result = updateJumpingNPC(
        npcPink,
        npcPinkY,
        npcPinkVel,
        npcPinkMoveDir,
        npcPinkMoveTime,
        npcPinkState,
        npcPinkHitTime,
        'pink'
    );
    npcPinkY = result.npcY;
    npcPinkVel = result.npcVel;
    npcPinkMoveDir = result.moveDir;
    npcPinkMoveTime = result.moveTime;
    npcPinkState = result.state;
    npcPinkHitTime = result.hitTime;
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
    updateBall();

    renderer.render(scene, camera);
}
