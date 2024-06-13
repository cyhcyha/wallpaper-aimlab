let BALL_NUMBER = 20;
let BALL_SIZE = 2;
let renderWidth = window.innerWidth;
let renderHeight = window.innerHeight;
let renderAreaTop = 0;
let renderAreaRight = 0;
let headShotMode = true;

//读取用户配置
window.wallpaperPropertyListener = {
  applyUserProperties: function (properties) {
    if (properties.ballNumber) {
      BALL_NUMBER = properties.ballNumber;
    }
    if (properties.ballSize) {
      BALL_SIZE = properties.ballSize;
    }
    if (properties.renderAreaTop) {
      renderAreaTop = properties.renderAreaTop;
    }
    if (properties.renderAreaRight) {
      renderAreaRight = properties.renderAreaRight;
    }
    if (properties.headShotMode) {
      headShotMode = properties.headShotMode;
    }
  },
};
// 场景, 相机, 渲染器r 初始化
const scene = new THREE.Scene();
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
const renderer = new THREE.WebGLRenderer();
renderer.setSize(renderWidth, renderHeight);
renderer.domElement.style.position = "absolute";
renderer.domElement.style.top = renderAreaTop + "px";
renderer.domElement.style.right = renderAreaRight + "px";
document.body.appendChild(renderer.domElement);

//点击射线
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

// 环境光
const ambientLight = new THREE.AmbientLight(0x404040);
scene.add(ambientLight);
//平行光
const directionalLight = new THREE.DirectionalLight(0xffffff, 1, 100);
directionalLight.position.set(10, 10, 10);
scene.add(directionalLight);

// 中间的虚线
const size = 100;
const divisions = 50;
const gridHelper = new THREE.GridHelper(size, divisions, 0x888888, 0x444444);
scene.add(gridHelper);

// 中间的圆圈
const targetGeometry = new THREE.RingGeometry(4, 5, 32);
const targetMaterial = new THREE.MeshBasicMaterial({
  color: 0xffffff,
  side: THREE.DoubleSide,
});
const target = new THREE.Mesh(targetGeometry, targetMaterial);
target.position.set(0, 0, 0);
scene.add(target);

let balls = [];

// 创建随机小球
function createRandomBall() {
  const ballGeometry = new THREE.SphereGeometry(BALL_SIZE, 32, 32);
  const ballMaterial = new THREE.MeshPhongMaterial({ color: 0x00ffff });
  const ball = new THREE.Mesh(ballGeometry, ballMaterial);

  // Generate positions within the camera's visible frustum
  const halfFrustumSize = frustumSize / 2;
  const aspect = renderWidth / renderHeight;
  const halfFrustumSizeX = halfFrustumSize * aspect;

  if (headShotMode) {
    ball.position.set((Math.random() - 0.5) * halfFrustumSizeX * 2, 0, 0);
  } else {
    ball.position.set(
      (Math.random() - 0.5) * halfFrustumSizeX * 2,
      (Math.random() - 0.5) * halfFrustumSize * 2,
      0 // Keep z position constant
    );
  }

  ball.name = "targetBall";
  balls.push(ball);
  scene.add(ball);
}

// Generate initial balls
function initBalls() {
  if (headShotMode) {
    for (let i = 0; i < 2; i++) {
      createRandomBall();
    }
  } else {
    for (let i = 0; i < 20; i++) {
      createRandomBall();
    }
  }
}

// Function to remove all balls
function removeAllBalls() {
  balls.forEach((ball) => scene.remove(ball));
  balls = [];
}

// 点击事件
function onMouseClick(event) {
  // Convert mouse position to normalized device coordinates
  mouse.x = (event.clientX / renderWidth) * 2 - 1;
  mouse.y = -(event.clientY / renderHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);

  // Calculate objects intersecting the picking ray
  const intersects = raycaster.intersectObjects(scene.children);

  for (let i = 0; i < intersects.length; i++) {
    console.log("intersects[i]: ", intersects[i]);
    if (intersects[i].object.name === "targetBall") {
      scene.remove(intersects[i].object);
      balls = balls.filter((ball) => ball !== intersects[i].object);
      createRandomBall();
    }
  }
}

window.addEventListener("click", onMouseClick);

//刷新按钮
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

// Render function
function animate() {
  requestAnimationFrame(animate);
  renderer.render(scene, camera);
}

animate();
initBalls();
createRefreshBtn();
