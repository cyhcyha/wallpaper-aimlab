// Scene, camera, and renderer setup
const scene = new THREE.Scene();
const aspect = window.innerWidth / window.innerHeight;
const frustumSize = 100;
const camera = new THREE.OrthographicCamera(
  (frustumSize * aspect) / -2,
  (frustumSize * aspect) / 2,
  frustumSize / 2,
  frustumSize / -2,
  0.1,
  1000
);
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Add lighting
const ambientLight = new THREE.AmbientLight(0x404040);
scene.add(ambientLight);

const pointLight = new THREE.DirectionalLight(0xffffff, 1, 100);
pointLight.position.set(10, 10, 10);
scene.add(pointLight);

// Resize canvas on window resize
window.addEventListener("resize", () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
});

// Grid helper
const size = 100;
const divisions = 50;
const gridHelper = new THREE.GridHelper(size, divisions, 0x888888, 0x444444);
scene.add(gridHelper);

// Central target
const targetGeometry = new THREE.RingGeometry(4, 5, 32);
const targetMaterial = new THREE.MeshBasicMaterial({
  color: 0xffffff,
  side: THREE.DoubleSide,
});
const target = new THREE.Mesh(targetGeometry, targetMaterial);
target.position.set(0, 0, 0);
scene.add(target);

// Camera position
camera.position.z = 50;

let balls = [];
BALL_SIZE = 2;

// Function to create a random target ball
function createRandomBall() {
  const ballGeometry = new THREE.SphereGeometry(BALL_SIZE, 32, 32);
  const ballMaterial = new THREE.MeshPhongMaterial({ color: 0x00ffff });
  const ball = new THREE.Mesh(ballGeometry, ballMaterial);

  // Generate positions within the camera's visible frustum
  const halfFrustumSize = frustumSize / 2;
  const aspect = window.innerWidth / window.innerHeight;
  const halfFrustumSizeX = halfFrustumSize * aspect;

  ball.position.set(
    (Math.random() - 0.5) * halfFrustumSizeX * 2,
    (Math.random() - 0.5) * halfFrustumSize * 2,
    0 // Keep z position constant
  );

  ball.name = "targetBall";
  balls.push(ball);
  scene.add(ball);
}

// Generate initial balls
function initBalls() {
  for (let i = 0; i < 20; i++) {
    createRandomBall();
  }
}

// Function to remove all balls
function removeAllBalls() {
  balls.forEach((ball) => scene.remove(ball));
  balls = [];
}

// Raycaster for detecting clicks
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

function onMouseClick(event) {
  // Convert mouse position to normalized device coordinates
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);

  // Calculate objects intersecting the picking ray
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

// Create refresh button
function createRefreshBtn() {
  const refreshBtn = document.createElement("button");
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
