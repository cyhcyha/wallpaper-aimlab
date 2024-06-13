// Scene, camera, and renderer setup
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Resize canvas on window resize
window.addEventListener('resize', () => {
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
const targetMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide });
const target = new THREE.Mesh(targetGeometry, targetMaterial);
target.position.set(0, 0, 0);
scene.add(target);

// Camera position
camera.position.z = 50;

// Render function
function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
}

animate();

// Function to create a random target ball
function createRandomBall() {
    const ball = document.createElement('div');
    ball.classList.add('target');
    ball.style.left = `${Math.random() * (window.innerWidth - 20)}px`;
    ball.style.top = `${Math.random() * (window.innerHeight - 20)}px`;

    // Add event listener for click
    ball.addEventListener('click', () => {
        ball.remove();
    });

    document.body.appendChild(ball);
}

// Generate a ball every 2 seconds
setInterval(createRandomBall, 2000);
