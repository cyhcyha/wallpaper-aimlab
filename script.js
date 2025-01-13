/**
 * Wallpaper Engine 3D射击小球壁纸
 * 功能：
 * 1. 在3D场景中显示可点击的小球
 * 2. 支持两种模式：爆头模式(小球只在水平线上)和自由模式
 * 3. 点击小球后会消失并在随机位置重新生成
 * 4. 支持通过Wallpaper Engine进行参数配置
 */

// 配置参数
let BALL_NUMBER = 15; // 小球数量
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
 * 设置按钮禁用状态
 */
function setButtonDisabled(button, disabled) {
  button.disabled = disabled;
  if (disabled) {
    button.style.opacity = "0.5";
    button.style.cursor = "not-allowed";
  } else {
    button.style.opacity = "1";
    button.style.cursor = "pointer";
  }
}

/**
 * 更新所有按钮状态
 */
function updateButtonsState(isSelecting) {
  const refreshBtn = document.querySelector('button[data-btn="refresh"]');
  const modeBtn = document.querySelector('button[data-btn="mode"]');

  if (refreshBtn) setButtonDisabled(refreshBtn, isSelecting);
  if (modeBtn) setButtonDisabled(modeBtn, isSelecting);
}

/**
 * 创建刷新按钮
 */
function createRefreshBtn() {
  const refreshBtn = createStyledButton("刷新", 10);
  refreshBtn.setAttribute("data-btn", "refresh");

  // 阻止事件冒泡
  refreshBtn.addEventListener("mousedown", (e) => e.stopPropagation());
  refreshBtn.addEventListener("mousemove", (e) => e.stopPropagation());
  refreshBtn.addEventListener("mouseup", (e) => e.stopPropagation());

  refreshBtn.addEventListener("click", (e) => {
    if (refreshBtn.disabled) return;
    e.preventDefault();
    e.stopPropagation();
    removeAllBalls();
    initBalls();
  });

  document.body.appendChild(refreshBtn);
  return refreshBtn;
}

/**
 * 创建模式切换按钮
 */
function createModeToggleBtn() {
  const modeBtn = createStyledButton("爆头模式", 90);
  modeBtn.setAttribute("data-btn", "mode");

  // 设置初始状态
  modeBtn.textContent = headShotMode ? "切换自由模式" : "切换爆头模式";

  // 阻止事件冒泡
  modeBtn.addEventListener("mousedown", (e) => e.stopPropagation());
  modeBtn.addEventListener("mousemove", (e) => e.stopPropagation());
  modeBtn.addEventListener("mouseup", (e) => e.stopPropagation());

  modeBtn.addEventListener("click", (e) => {
    if (modeBtn.disabled) return;
    e.preventDefault();
    e.stopPropagation();

    headShotMode = !headShotMode;
    modeBtn.textContent = headShotMode ? "切换自由模式" : "切换爆头模式";

    removeAllBalls();
    initBalls();
  });

  document.body.appendChild(modeBtn);
  return modeBtn;
}

/**
 * 创建区域选择按钮
 */
function createAreaSelectionBtn() {
  const areaBtn = createStyledButton("选择区域", 50);
  let selectionState = "idle";

  // 阻止事件冒泡
  areaBtn.addEventListener("mousedown", (e) => e.stopPropagation());
  areaBtn.addEventListener("mousemove", (e) => e.stopPropagation());
  areaBtn.addEventListener("mouseup", (e) => e.stopPropagation());

  areaBtn.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();

    switch (selectionState) {
      case "idle":
        selectionState = "selecting";
        isAreaSelectionMode = true;
        areaBtn.textContent = "确认区域";
        handleAreaSelection();
        updateButtonsState(true); // 禁用其他按钮
        break;

      case "selecting":
        if (spawnArea.width > 0 && spawnArea.height > 0) {
          selectionState = "selected";
          isAreaSelectionMode = false;
          areaBtn.textContent = "清除区域";
          handleAreaSelection();
          updateButtonsState(false); // 启用其他按钮
          // 确认区域后重新生成小球
          removeAllBalls();
          initBalls();
        }
        break;

      case "selected":
        selectionState = "idle";
        isAreaSelectionMode = false;
        clearSpawnArea();
        areaBtn.textContent = "选择区域";
        updateButtonsState(false); // 启用其他按钮
        // 清除区域后重新生成小球
        removeAllBalls();
        initBalls();
        break;
    }
  });

  document.body.appendChild(areaBtn);
  return areaBtn;
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
 * 检查位置是否在可见区域内
 * @param {THREE.Vector3} position - 待检查的位置
 * @returns {boolean} - 如果位置在可见区域内返回true，否则返回false
 */
function isInVisibleArea(position) {
  const halfFrustumSize = frustumSize / 2;
  const aspect = renderWidth / renderHeight;
  const halfFrustumSizeX = halfFrustumSize * aspect;

  // 考虑小球大小，留出边距
  const margin = BALL_SIZE;

  return (
    position.x >= -halfFrustumSizeX + margin &&
    position.x <= halfFrustumSizeX - margin &&
    position.y >= -halfFrustumSize + margin &&
    position.y <= halfFrustumSize - margin
  );
}

/**
 * 获取有效的随机位置
 */
function getValidRandomPosition(isHeadShot = false) {
  const maxAttempts = 50; // 最大尝试次数
  let attempts = 0;

  // 获取场景边界
  const halfFrustumSize = frustumSize / 2;
  const aspect = renderWidth / renderHeight;
  const halfFrustumSizeX = halfFrustumSize * aspect;
  const margin = BALL_SIZE;

  while (attempts < maxAttempts) {
    let position = new THREE.Vector3();

    if (spawnArea.width > 0 && spawnArea.height > 0) {
      // 在指定区域内生成，考虑边界限制
      const minX = Math.max(spawnArea.startX, -halfFrustumSizeX + margin);
      const maxX = Math.min(
        spawnArea.startX + spawnArea.width,
        halfFrustumSizeX - margin
      );
      const minY = Math.max(spawnArea.startY, -halfFrustumSize + margin);
      const maxY = Math.min(
        spawnArea.startY + spawnArea.height,
        halfFrustumSize - margin
      );

      if (isHeadShot) {
        const centerY = (minY + maxY) / 2; // 使用区域的垂直中心
        const randomX = minX + Math.random() * (maxX - minX);
        position.set(randomX, centerY, 0);
      } else {
        const randomX = minX + Math.random() * (maxX - minX);
        const randomY = minY + Math.random() * (maxY - minY);
        position.set(randomX, randomY, 0);
      }
    } else {
      // 使用默认生成方式，考虑边界
      const maxX = halfFrustumSizeX - margin;
      const maxY = halfFrustumSize - margin;

      if (isHeadShot) {
        position.set(Math.random() * (maxX * 2) - maxX, 0, 0);
      } else {
        position.set(
          Math.random() * (maxX * 2) - maxX,
          Math.random() * (maxY * 2) - maxY,
          0
        );
      }
    }

    // 检查位置是否在可见区域内且与其他小球保持距离
    if (isInVisibleArea(position) && isValidPosition(position)) {
      return position;
    }

    attempts++;
  }

  return null;
}

/**
 * 创建区域可视化矩形
 */
function createAreaRect(x1, y1, x2, y2) {
  // 移除现有的区域矩形
  const existingArea = scene.getObjectByName("spawnAreaRect");
  if (existingArea) scene.remove(existingArea);

  // 限制区域在可见范围内
  const halfFrustumSize = frustumSize / 2;
  const aspect = renderWidth / renderHeight;
  const halfFrustumSizeX = halfFrustumSize * aspect;
  const margin = BALL_SIZE;

  x1 = Math.max(
    Math.min(x1, halfFrustumSizeX - margin),
    -halfFrustumSizeX + margin
  );
  x2 = Math.max(
    Math.min(x2, halfFrustumSizeX - margin),
    -halfFrustumSizeX + margin
  );
  y1 = Math.max(
    Math.min(y1, halfFrustumSize - margin),
    -halfFrustumSize + margin
  );
  y2 = Math.max(
    Math.min(y2, halfFrustumSize - margin),
    -halfFrustumSize + margin
  );

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

  const material = new THREE.LineBasicMaterial({ color: 0xcccccc });
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
 * 检查位置是否与现有小球重叠
 * @param {THREE.Vector3} position - 待检查的位置
 * @param {number} minDistance - 最小距离（小球直径的倍数）
 * @returns {boolean} - 如果位置合适返回true，否则返回false
 */
function isValidPosition(position, minDistance = 2.5) {
  const minDistanceValue = BALL_SIZE * minDistance; // 最小间距为小球直径的2.5倍

  for (const ball of balls) {
    const distance = position.distanceTo(ball.position);
    if (distance < minDistanceValue) {
      return false;
    }
  }
  return true;
}

/**
 * 创建随机位置的小球
 * 在爆头模式下，小球在区域中心线上生成
 */
function createRandomBall() {
  const ballGeometry = new THREE.SphereGeometry(BALL_SIZE, 32, 32);
  const ballMaterial = new THREE.MeshPhongMaterial({ color: 0x00ffff });
  const ball = new THREE.Mesh(ballGeometry, ballMaterial);

  const position = getValidRandomPosition(headShotMode);

  if (position) {
    ball.position.copy(position);
  } else {
    // 如果找不到合适的位置，尝试一次不考虑间距的生成
    if (spawnArea.width > 0 && spawnArea.height > 0) {
      const minX = Math.max(spawnArea.startX, -halfFrustumSizeX + margin);
      const maxX = Math.min(
        spawnArea.startX + spawnArea.width,
        halfFrustumSizeX - margin
      );
      const minY = Math.max(spawnArea.startY, -halfFrustumSize + margin);
      const maxY = Math.min(
        spawnArea.startY + spawnArea.height,
        halfFrustumSize - margin
      );

      if (headShotMode) {
        const centerY = (minY + maxY) / 2;
        const randomX = minX + Math.random() * (maxX - minX);
        ball.position.set(randomX, centerY, 0);
      } else {
        const randomX = minX + Math.random() * (maxX - minX);
        const randomY = minY + Math.random() * (maxY - minY);
        ball.position.set(randomX, randomY, 0);
      }
    } else {
      // 默认生成逻辑
      const halfFrustumSize = frustumSize / 2;
      const aspect = renderWidth / renderHeight;
      const halfFrustumSizeX = halfFrustumSize * aspect;
      const margin = BALL_SIZE;
      const maxX = halfFrustumSizeX - margin;
      const maxY = halfFrustumSize - margin;

      if (headShotMode) {
        ball.position.set(Math.random() * (maxX * 2) - maxX, 0, 0);
      } else {
        ball.position.set(
          Math.random() * (maxX * 2) - maxX,
          Math.random() * (maxY * 2) - maxY,
          0
        );
      }
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
  if (target.tagName === "BUTTON") return;

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
