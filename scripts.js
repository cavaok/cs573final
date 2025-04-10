document.addEventListener('DOMContentLoaded', function() {
    // Initialize visualization
    initVisualization();
});

function initVisualization() {
    console.log('Initializing 3D PCA visualization');
    
    // Set up model selector
    const modelSelector = document.getElementById('model-selector');
    const models = ['auto64_1', 'auto64_2', 'auto64_3', 'auto64_4'];
    
    models.forEach(model => {
        const option = document.createElement('option');
        option.value = model;
        option.textContent = model;
        modelSelector.appendChild(option);
    });
    
    // Initialize the 3D visualization
    const viz = new PCAVisualization(document.getElementById('visualization-container'));
    
    // Set up event listeners
    modelSelector.addEventListener('change', function() {
        viz.loadData(this.value);
    });
    
    document.getElementById('reset-view').addEventListener('click', function() {
        viz.resetView();
    });
    
    // Load initial data
    viz.loadData(models[0]);
}

class PCAVisualization {
    constructor(container) {
        this.container = container;
        this.width = window.innerWidth;
        this.height = window.innerHeight - 50; // Account for header
        
        // Initialize Three.js
        this.initThree();
        
        // Set up mouse interaction
        this.setupMouseInteraction();
        
        // Handle window resize
        window.addEventListener('resize', () => this.onWindowResize());
        
        // Start animation loop
        this.animate();
    }
    
    initThree() {
        // Create scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x000000);
        
        // Create camera
        this.camera = new THREE.PerspectiveCamera(60, this.width / this.height, 0.1, 1000);
        this.camera.position.set(20, 20, 20);
        this.camera.lookAt(0, 0, 0);
        
        // Create renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(this.width, this.height);
        this.container.appendChild(this.renderer.domElement);
        
        // Add OrbitControls
        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.25;
        
        // Add simple axes for reference
        const axesHelper = new THREE.AxesHelper(20);
        this.scene.add(axesHelper);
        
        // Add lights
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);
        
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(1, 1, 1);
        this.scene.add(directionalLight);
        
        // Create object groups
        this.pointsGroup = new THREE.Group();
        this.linesGroup = new THREE.Group();
        this.scene.add(this.pointsGroup);
        this.scene.add(this.linesGroup);
    }
    
    setupMouseInteraction() {
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        this.hoveredObject = null;
        
        window.addEventListener('mousemove', (event) => {
            // Calculate mouse position in normalized device coordinates
            this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
            this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
            
            // Update raycasting for hover effects
            this.updateRaycasting(event);
        });
    }
    
    async loadData(modelName) {
        // Clear previous visualization
        this.clearVisualization();
        
        try {
            // Load data from JSON file
            const response = await fetch(`data/${modelName}_pca.json`);
            
            if (!response.ok) {
                throw new Error(`Failed to load data: ${response.status}`);
            }
            
            const data = await response.json();
            console.log(`Loaded ${data.length} points for ${modelName}`);
            
            // Create pairs
            const pairs = this.createPairs(data);
            
            // Calculate min/max for normalization
            const bounds = this.calculateBounds(data);
            
            // Create visualization
            this.createVisualization(data, pairs, bounds);
            
        } catch (error) {
            console.error('Error loading data:', error);
            
            // Use fallback sample data if real data can't be loaded
            const sampleData = [
                {"id": "93", "case_idx": 0, "model_name": "auto64_1", "type": "original", "pc1": 4.75, "pc2": -0.19, "pc3": 3.05, "label": 0, "prediction": 0},
                {"id": "93_adv", "case_idx": 0, "model_name": "auto64_1", "type": "adversarial", "pc1": 4.34, "pc2": 0.10, "pc3": 2.68, "label": 0, "prediction": 0, "kld": 0.02, "mse": 0.005},
                {"id": "138", "case_idx": 1, "model_name": "auto64_1", "type": "original", "pc1": -2.5, "pc2": 1.7, "pc3": -0.8, "label": 1, "prediction": 1},
                {"id": "138_adv", "case_idx": 1, "model_name": "auto64_1", "type": "adversarial", "pc1": -2.1, "pc2": 1.2, "pc3": -1.3, "label": 1, "prediction": 1, "kld": 0.06, "mse": 0.012}
            ];
            
            const samplePairs = this.createPairs(sampleData);
            const sampleBounds = this.calculateBounds(sampleData);
            this.createVisualization(sampleData, samplePairs, sampleBounds);
        }
    }
    
    clearVisualization() {
        // Clear points
        while(this.pointsGroup.children.length > 0) {
            const object = this.pointsGroup.children[0];
            if (object.geometry) object.geometry.dispose();
            if (object.material) {
                if (Array.isArray(object.material)) {
                    object.material.forEach(m => m.dispose());
                } else {
                    object.material.dispose();
                }
            }
            this.pointsGroup.remove(object);
        }
        
        // Clear lines
        while(this.linesGroup.children.length > 0) {
            const line = this.linesGroup.children[0];
            if (line.geometry) line.geometry.dispose();
            if (line.material) line.material.dispose();
            this.linesGroup.remove(line);
        }
    }
    
    createPairs(data) {
        const pairs = [];
        const originals = data.filter(d => d.type === 'original');
        
        originals.forEach(original => {
            const adversarial = data.find(d => 
                d.type === 'adversarial' && 
                d.case_idx === original.case_idx
            );
            
            if (adversarial) {
                pairs.push({ original, adversarial });
            }
        });
        
        return pairs;
    }
    
    calculateBounds(data) {
        const bounds = {
            pc1: { min: Infinity, max: -Infinity },
            pc2: { min: Infinity, max: -Infinity },
            pc3: { min: Infinity, max: -Infinity }
        };
        
        data.forEach(d => {
            bounds.pc1.min = Math.min(bounds.pc1.min, d.pc1);
            bounds.pc1.max = Math.max(bounds.pc1.max, d.pc1);
            bounds.pc2.min = Math.min(bounds.pc2.min, d.pc2);
            bounds.pc2.max = Math.max(bounds.pc2.max, d.pc2);
            bounds.pc3.min = Math.min(bounds.pc3.min, d.pc3);
            bounds.pc3.max = Math.max(bounds.pc3.max, d.pc3);
        });
        
        return bounds;
    }
    
    createVisualization(data, pairs, bounds) {
        const scale = 15; // Scale factor for visualization
        
        // Normalize function
        const normalize = (val, min, max) => {
            return ((val - min) / (max - min) * 2 - 1) * scale;
        };
        
        // Draw connecting lines first
        pairs.forEach(pair => {
            const x1 = normalize(pair.original.pc1, bounds.pc1.min, bounds.pc1.max);
            const y1 = normalize(pair.original.pc2, bounds.pc2.min, bounds.pc2.max);
            const z1 = normalize(pair.original.pc3, bounds.pc3.min, bounds.pc3.max);
            
            const x2 = normalize(pair.adversarial.pc1, bounds.pc1.min, bounds.pc1.max);
            const y2 = normalize(pair.adversarial.pc2, bounds.pc2.min, bounds.pc2.max);
            const z2 = normalize(pair.adversarial.pc3, bounds.pc3.min, bounds.pc3.max);
            
            // Create line geometry
            const lineGeometry = new THREE.BufferGeometry();
            const linePositions = new Float32Array([
                x1, y1, z1,
                x2, y2, z2
            ]);
            lineGeometry.setAttribute('position', new THREE.BufferAttribute(linePositions, 3));
            
            // Create line material - white line for all connections
            const lineMaterial = new THREE.LineBasicMaterial({
                color: 0x888888,
                opacity: 0.5,
                transparent: true
            });
            
            // Create line and add to group
            const line = new THREE.Line(lineGeometry, lineMaterial);
            this.linesGroup.add(line);
        });
        
        // Draw data points
        data.forEach(d => {
            const x = normalize(d.pc1, bounds.pc1.min, bounds.pc1.max);
            const y = normalize(d.pc2, bounds.pc2.min, bounds.pc2.max);
            const z = normalize(d.pc3, bounds.pc3.min, bounds.pc3.max);
            
            let object;
            
            if (d.type === 'original') {
                // Black spheres with white outline for originals
                const geometry = new THREE.SphereGeometry(0.5, 16, 16);
                const material = new THREE.MeshBasicMaterial({
                    color: 0x000000,
                    transparent: false
                });
                
                object = new THREE.Mesh(geometry, material);
                
                // Add white outline
                const outlineMaterial = new THREE.MeshBasicMaterial({
                    color: 0xffffff,
                    side: THREE.BackSide
                });
                const outlineMesh = new THREE.Mesh(
                    new THREE.SphereGeometry(0.55, 16, 16),
                    outlineMaterial
                );
                object.add(outlineMesh);
                
            } else {
                // White semi-transparent spheres for adversarials
                const geometry = new THREE.SphereGeometry(0.5, 16, 16);
                const material = new THREE.MeshBasicMaterial({
                    color: 0xffffff,
                    transparent: true,
                    opacity: 0.6
                });
                object = new THREE.Mesh(geometry, material);
            }
            
            // Position the object
            object.position.set(x, y, z);
            
            // Store data with the object for hover display
            object.userData = d;
            
            // Add to scene
            this.pointsGroup.add(object);
        });
    }
    
    updateRaycasting(event) {
        // Update the picking ray with the camera and mouse position
        this.raycaster.setFromCamera(this.mouse, this.camera);
        
        // Calculate objects intersecting the ray
        const intersects = this.raycaster.intersectObjects(this.pointsGroup.children, true);
        
        const infoPanel = document.getElementById('info-panel');
        
        // If we have intersections
        if (intersects.length > 0) {
            // Find the first object with userData
            let intersectedObject = null;
            
            for (let i = 0; i < intersects.length; i++) {
                const object = intersects[i].object;
                if (object.parent && object.parent.userData && object.parent.userData.id) {
                    intersectedObject = object.parent;
                    break;
                } else if (object.userData && object.userData.id) {
                    intersectedObject = object;
                    break;
                }
            }
            
            if (intersectedObject) {
                const pointData = intersectedObject.userData;
                
                // If we hover a new object
                if (this.hoveredObject !== intersectedObject) {
                    // Reset previous hover effect
                    if (this.hoveredObject) {
                        this.hoveredObject.scale.set(1, 1, 1);
                    }
                    
                    // Apply hover effect to new object
                    intersectedObject.scale.set(1.5, 1.5, 1.5);
                    
                    // Update hover reference
                    this.hoveredObject = intersectedObject;
                    
                    // Update info panel
                    infoPanel.style.display = 'block';
                    infoPanel.innerHTML = `
                        <div>ID: ${pointData.id}</div>
                        <div>Type: ${pointData.type}</div>
                        <div>PCA: [${pointData.pc1.toFixed(2)}, ${pointData.pc2.toFixed(2)}, ${pointData.pc3.toFixed(2)}]</div>
                        <div>Label: ${pointData.label}</div>
                    `;
                    
                    // Position the info panel near the mouse
                    infoPanel.style.left = `${event.clientX + 15}px`;
                    infoPanel.style.top = `${event.clientY + 15}px`;
                }
            }
        } else {
            // Reset hover effect if not hovering over an object
            if (this.hoveredObject) {
                this.hoveredObject.scale.set(1, 1, 1);
                this.hoveredObject = null;
            }
            
            // Hide info panel
            infoPanel.style.display = 'none';
        }
    }
    
    animate() {
        requestAnimationFrame(() => this.animate());
        
        // Update controls
        this.controls.update();
        
        // Render scene
        this.renderer.render(this.scene, this.camera);
    }
    
    onWindowResize() {
        this.width = window.innerWidth;
        this.height = window.innerHeight - 50;
        
        this.camera.aspect = this.width / this.height;
        this.camera.updateProjectionMatrix();
        
        this.renderer.setSize(this.width, this.height);
    }
    
    resetView() {
        this.camera.position.set(20, 20, 20);
        this.camera.lookAt(0, 0, 0);
        this.controls.reset();
    }
}