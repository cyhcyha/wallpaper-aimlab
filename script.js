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
 * 创建随机位置的小球
 * 在爆头模式下，小球只在水平线上生成
 */
function createRandomBall() {
  const ballGeometry = new THREE.SphereGeometry(BALL_SIZE, 32, 32);
  const ballMaterial = new THREE.MeshPhongMaterial({ color: 0x00ffff });
  const ball = new THREE.Mesh(ballGeometry, ballMaterial);

  const halfFrustumSize = frustumSize / 2;
  const aspect = renderWidth / renderHeight;
  const halfFrustumSizeX = halfFrustumSize * aspect;

  // 根据模式设置小球位置
  if (headShotMode) {
    ball.position.set((Math.random() - 0.5) * halfFrustumSizeX * 2, 0, 0);
  } else {
    ball.position.set(
      (Math.random() - 0.5) * halfFrustumSizeX * 2,
      (Math.random() - 0.5) * halfFrustumSize * 2,
      0
    );
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
 * 用于重置场景中的所有小球
 */
function createRefreshBtn() {
  const refreshBtn = document.createElement("button");
  refreshBtn.style.position = "absolute";
  refreshBtn.style.top = "10px";
  refreshBtn.style.right = "10px";
  refreshBtn.textContent = "Refresh";
  refreshBtn.addEventListener("click", () => {
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
animate();
initBalls();
createRefreshBtn();
