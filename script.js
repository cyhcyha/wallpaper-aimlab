/**
 * Wallpaper Engine 3D射击小球壁纸
 * 功能：
 * 1. 在3D场景中显示可点击的小球
 * 2. 支持两种模式：爆头模式(小球只在水平线上)和自由模式
 * 3. 点击小球后会消失并在随机位置重新生成
 * 4. 支持通过Wallpaper Engine进行参数配置
 */

// 配置参数
let BALL_NUMBER = 20; // 小球数量
let BALL_SIZE = 2; // 小球大小
let renderWidth = window.innerWidth; // 渲染区域宽度
let renderHeight = window.innerHeight; // 渲染区域高度
let renderAreaTop = 0; // 渲染区域顶部偏移
let renderAreaRight = 0; // 渲染区域右侧偏移
let headShotMode = true; // 爆头模式开关
let isAreaSelectionMode = false; // 区域选择模式
let spawnArea = {
  startX: 0,
  startY: 0,
  width: 0,
  height: 0,
  isDrawing: false,
};

/**
 * Wallpaper Engine 属性监听器
 * 用于接收用户在WE中修改的配置
 */
window.wallpaperPropertyListener = {
  applyUserProperties: function (properties) {
    if (properties.ballNumber) BALL_NUMBER = properties.ballNumber;
    if (properties.ballSize) BALL_SIZE = properties.ballSize;
    if (properties.renderAreaTop) renderAreaTop = properties.renderAreaTop;
    if (properties.renderAreaRight)
      renderAreaRight = properties.renderAreaRight;
    if (properties.headShotMode) headShotMode = properties.headShotMode;
  },
};

/**
 * Three.js场景初始化
 */
const scene = new THREE.Scene();

// 设置正交相机
const aspect = renderWidth / renderHeight;
const frustumSize = 100;
const camera = new THREE.OrthographicCamera(
  (frustumSize * aspect) / -2,
  (frustumSize * aspect) / 2,
  frustumSize / 2,
  frustumSize / -2,
  0.1,
  1000
);
camera.position.z = 50;

// 初始化渲染器
const renderer = new THREE.WebGLRenderer();
renderer.setSize(renderWidth, renderHeight);
renderer.domElement.style.position = "absolute";
renderer.domElement.style.top = renderAreaTop + "px";
renderer.domElement.style.right = renderAreaRight + "px";
document.body.appendChild(renderer.domElement);

// 射线检测器（用于点击检测）
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

/**
 * 场景光源设置
 */
// 环境光
const ambientLight = new THREE.AmbientLight(0x404040);
scene.add(ambientLight);
// 平行光
const directionalLight = new THREE.DirectionalLight(0xffffff, 1, 100);
directionalLight.position.set(10, 10, 10);
scene.add(directionalLight);

/**
 * 场景装饰物
 */
// 网格辅助线
const size = 100;
const divisions = 50;
const gridHelper = new THREE.GridHelper(size, divisions, 0x888888, 0x444444);
scene.add(gridHelper);

// 中心环形标记
const targetGeometry = new THREE.RingGeometry(4, 5, 32);
const targetMaterial = new THREE.MeshBasicMaterial({
  color: 0xffffff,
  side: THREE.DoubleSide,
});
const target = new THREE.Mesh(targetGeometry, targetMaterial);
target.position.set(0, 0, 0);
scene.add(target);

// 存储所有小球的数组
let balls = [];

/**
 * 创建通用按钮样式
 */
function createStyledButton(text, top) {
  const btn = document.createElement("button");
  btn.style.position = "absolute";
  btn.style.top = top + "px";
  btn.style.right = "10px";
  btn.style.padding = "8px 16px";
  btn.style.zIndex = "1000";
  btn.style.cursor = "pointer";
  btn.style.backgroundColor = "#2c3e50";
  btn.style.color = "#ffffff";
  btn.style.border = "none";
  btn.style.borderRadius = "4px";
  btn.style.fontFamily = "Arial, sans-serif";
  btn.style.fontSize = "14px";
  btn.style.transition = "background-color 0.3s";
  btn.textContent = text;
  
  // 悬停效果
  btn.addEventListener("mouseover", () => {
    btn.style.backgroundColor = "#34495e";
  });
  btn.addEventListener("mouseout", () => {
    btn.style.backgroundColor = "#2c3e50";
  });
  
  return btn;
}

/**
 * 创建模式切换按钮
 */
function createModeToggleBtn() {
  const modeBtn = createStyledButton("爆头模式", 90);
  
  // 设置初始状态
  modeBtn.textContent = headShotMode ? "切换自由模式" : "切换爆头模式";
  
  // 阻止事件冒泡
  modeBtn.addEventListener("mousedown", (e) => e.stopPropagation());
  modeBtn.addEventListener("mousemove", (e) => e.stopPropagation());
  modeBtn.addEventListener("mouseup", (e) => e.stopPropagation());
  
  modeBtn.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    headShotMode = !headShotMode;
    modeBtn.textContent = headShotMode ? "切换自由模式" : "切换爆头模式";
    
    // 重新生成所有小球
    removeAllBalls();
    initBalls();
  });
  
  document.body.appendChild(modeBtn);
}

/**
 * 创建区域选择按钮
 */
function createAreaSelectionBtn() {
  const areaBtn = createStyledButton("选择区域", 50);
  let selectionState = 'idle';
  
  // 阻止事件冒泡
  areaBtn.addEventListener("mousedown", (e) => e.stopPropagation());
  areaBtn.addEventListener("mousemove", (e) => e.stopPropagation());
  areaBtn.addEventListener("mouseup", (e) => e.stopPropagation());
  
  areaBtn.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    switch (selectionState) {
      case 'idle':
        selectionState = 'selecting';
        isAreaSelectionMode = true;
        areaBtn.textContent = "确认区域";
        handleAreaSelection();
        break;
        
      case 'selecting':
        if (spawnArea.width > 0 && spawnArea.height > 0) {
          selectionState = 'selected';
          isAreaSelectionMode = false;
          areaBtn.textContent = "清除区域";
          handleAreaSelection();
        }
        break;
        
      case 'selected':
        selectionState = 'idle';
        isAreaSelectionMode = false;
        clearSpawnArea();
        areaBtn.textContent = "选择区域";
        break;
    }
  });
  
  document.body.appendChild(areaBtn);
}

/**
 * 清除生成区域
 */
function clearSpawnArea() {
  const existingArea = scene.getObjectByName("spawnAreaRect");
  if (existingArea) {
    scene.remove(existingArea);
  }
  // 重置所有相关状态
  spawnArea.startX = 0;
  spawnArea.startY = 0;
  spawnArea.width = 0;
  spawnArea.height = 0;
  spawnArea.isDrawing = false;
}

/**
 * 创建区域可视化矩形
 */
function createAreaRect(x1, y1, x2, y2) {
  // 移除现有的区域矩形
  const existingArea = scene.getObjectByName("spawnAreaRect");
  if (existingArea) scene.remove(existingArea);

  // 计算矩形的宽度和高度
  const width = Math.abs(x2 - x1);
  const height = Math.abs(y2 - y1);

  // 创建矩形边框
  const geometry = new THREE.BufferGeometry();
  const vertices = new Float32Array([
    x1,
    y1,
    0,
    x2,
    y1,
    0,
    x2,
    y2,
    0,
    x1,
    y2,
    0,
    x1,
    y1,
    0,
  ]);
  geometry.setAttribute("position", new THREE.BufferAttribute(vertices, 3));

  const material = new THREE.LineBasicMaterial({ color: 0x00ff00 });
  const rect = new THREE.Line(geometry, material);
  rect.name = "spawnAreaRect";

  scene.add(rect);

  // 更新生成区域配置
  spawnArea.startX = Math.min(x1, x2);
  spawnArea.startY = Math.min(y1, y2);
  spawnArea.width = width;
  spawnArea.height = height;
}

/**
 * 获取鼠标在世界坐标中的位置
 */
function getMouseWorldPosition(event) {
  const mouse = new THREE.Vector2();
  mouse.x = (event.clientX / renderWidth) * 2 - 1;
  mouse.y = -(event.clientY / renderHeight) * 2 + 1;

  const vector = new THREE.Vector3(mouse.x, mouse.y, 0);
  vector.unproject(camera);
  return vector;
}

/**
 * 处理区域选择的鼠标事件
 */
function handleAreaSelection() {
  let startPos = { x: 0, y: 0 };
  
  function onMouseDown(event) {
    if (!isAreaSelectionMode) return;
    const worldPos = getMouseWorldPosition(event);
    startPos.x = worldPos.x;
    startPos.y = worldPos.y;
    spawnArea.isDrawing = true;
  }

  function onMouseMove(event) {
    if (!isAreaSelectionMode || !spawnArea.isDrawing) return;
    const worldPos = getMouseWorldPosition(event);
    createAreaRect(startPos.x, startPos.y, worldPos.x, worldPos.y);
  }

  function onMouseUp(event) {
    if (!isAreaSelectionMode) return;
    const worldPos = getMouseWorldPosition(event);
    createAreaRect(startPos.x, startPos.y, worldPos.x, worldPos.y);
    spawnArea.isDrawing = false;
  }

  // 移除之前的事件监听器
  window.removeEventListener("mousedown", onMouseDown);
  window.removeEventListener("mousemove", onMouseMove);
  window.removeEventListener("mouseup", onMouseUp);

  // 如果是选择模式，添加新的事件监听器
  if (isAreaSelectionMode) {
    window.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  }
}

/**
 * 创建随机位置的小球
 * 在爆头模式下，小球只在水平线上生成
 */
function createRandomBall() {
  const ballGeometry = new THREE.SphereGeometry(BALL_SIZE, 32, 32);
  const ballMaterial = new THREE.MeshPhongMaterial({ color: 0x00ffff });
  const ball = new THREE.Mesh(ballGeometry, ballMaterial);
  console.log("spawnArea: ", spawnArea);
  // 检查是否存在有效的生成区域
  if (spawnArea.width > 0 && spawnArea.height > 0) {
    // 在指定区域内生成
    if (headShotMode) {
      const randomX = spawnArea.startX + Math.random() * spawnArea.width;
      ball.position.set(randomX, 0, 0);
    } else {
      const randomX = spawnArea.startX + Math.random() * spawnArea.width;
      const randomY = spawnArea.startY + Math.random() * spawnArea.height;
      ball.position.set(randomX, randomY, 0);
    }
  } else {
    // 使用默认生成方式
    const halfFrustumSize = frustumSize / 2;
    const aspect = renderWidth / renderHeight;
    const halfFrustumSizeX = halfFrustumSize * aspect;

    if (headShotMode) {
      ball.position.set((Math.random() - 0.5) * halfFrustumSizeX * 2, 0, 0);
    } else {
      ball.position.set(
        (Math.random() - 0.5) * halfFrustumSizeX * 2,
        (Math.random() - 0.5) * halfFrustumSize * 2,
        0
      );
    }
  }

  ball.name = "targetBall";
  balls.push(ball);
  scene.add(ball);
}

/**
 * 初始化场景中的小球
 * 根据模式决定初始小球数量
 */
function initBalls() {
  const initialCount = headShotMode ? 2 : 20;
  for (let i = 0; i < initialCount; i++) {
    createRandomBall();
  }
}

/**
 * 清除场景中的所有小球
 */
function removeAllBalls() {
  balls.forEach((ball) => scene.remove(ball));
  balls = [];
}

/**
 * 鼠标点击事件处理
 * 检测点击的小球并重新生成新的小球
 */
function onMouseClick(event) {
  // 如果在选择区域模式下，不处理点击事件
  if (isAreaSelectionMode) return;
  
  // 检查点击是否发生在按钮上
  const target = event.target;
  if (target.tagName === 'BUTTON') return;

  mouse.x = (event.clientX / renderWidth) * 2 - 1;
  mouse.y = -(event.clientY / renderHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(scene.children);

  for (let i = 0; i < intersects.length; i++) {
    if (intersects[i].object.name === "targetBall") {
      scene.remove(intersects[i].object);
      balls = balls.filter((ball) => ball !== intersects[i].object);
      createRandomBall();
    }
  }
}

window.addEventListener("click", onMouseClick);

/**
 * 创建刷新按钮
 */
function createRefreshBtn() {
  const refreshBtn = createStyledButton("刷新", 10);
  
  // 阻止事件冒泡
  refreshBtn.addEventListener("mousedown", (e) => e.stopPropagation());
  refreshBtn.addEventListener("mousemove", (e) => e.stopPropagation());
  refreshBtn.addEventListener("mouseup", (e) => e.stopPropagation());
  
  refreshBtn.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    removeAllBalls();
    initBalls();
  });
  
  document.body.appendChild(refreshBtn);
}

/**
 * 动画渲染循环
 */
function animate() {
  requestAnimationFrame(animate);
  renderer.render(scene, camera);
}

// 初始化场景
function initScene() {
  animate();
  initBalls();
  createRefreshBtn();
  createAreaSelectionBtn();
  createModeToggleBtn(); // 添加模式切换按钮
  handleAreaSelection();
}

// 替换原来的初始化调用
initScene();
