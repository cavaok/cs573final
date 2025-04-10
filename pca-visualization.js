// Global initialization function that will be called after modules are loaded
window.initVisualization = function() {
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
};

class PCAVisualization {
    constructor(container) {
        this.container = container;
        this.width = container.clientWidth;
        this.height = container.clientHeight;
        this.data = [];
        
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
        this.scene.background = new THREE.Color(0x111111);
        
        // Create camera
        this.camera = new THREE.PerspectiveCamera(60, this.width / this.height, 0.1, 1000);
        this.camera.position.set(20, 20, 20);
        this.camera.lookAt(0, 0, 0);
        
        // Create renderer with improved quality
        this.renderer = new THREE.WebGLRenderer({ 
            antialias: true,
            powerPreference: "high-performance"
        });
        this.renderer.setSize(this.width, this.height);
        
        // Set pixel ratio for sharper rendering (but cap it to avoid performance issues)
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        
        // Enable shadow mapping for better quality
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        
        this.container.appendChild(this.renderer.domElement);
        
        // Add OrbitControls
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.25;
        
        // Add gridlines instead of axes
        this.addGrids();
        
        // Add lights with improved positioning
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);
        
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(1, 1, 1);
        this.scene.add(directionalLight);
        
        // Add a second directional light from another angle for better illumination
        const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.5);
        directionalLight2.position.set(-1, -1, -1);
        this.scene.add(directionalLight2);
        
        // Create object groups
        this.pointsGroup = new THREE.Group();
        this.linesGroup = new THREE.Group();
        this.scene.add(this.pointsGroup);
        this.scene.add(this.linesGroup);
    }
    
    addGrids() {
        const gridSize = 30;
        const gridDivisions = 30;
        const gridColor = 0x333333;
        
        // XZ plane grid (horizontal)
        const gridXZ = new THREE.GridHelper(gridSize, gridDivisions, gridColor, gridColor);
        gridXZ.position.y = 0;
        this.scene.add(gridXZ);
        
        // XY plane grid (vertical)
        const gridXY = new THREE.GridHelper(gridSize, gridDivisions, gridColor, gridColor);
        gridXY.position.z = 0;
        gridXY.rotation.x = Math.PI / 2;
        this.scene.add(gridXY);
        
        // YZ plane grid (vertical)
        const gridYZ = new THREE.GridHelper(gridSize, gridDivisions, gridColor, gridColor);
        gridYZ.position.x = 0;
        gridYZ.rotation.z = Math.PI / 2;
        this.scene.add(gridYZ);
        
        // Add subtle axis labels to maintain orientation
        this.addAxisLabels();
    }
    
    addAxisLabels() {
        // Create labels for axes
        const labelOffset = 16;
        
        // X-axis label
        const xLabel = document.createElement('div');
        xLabel.className = 'axis-label';
        xLabel.textContent = 'PC1';
        xLabel.style.position = 'absolute';
        xLabel.style.color = '#666666';
        xLabel.style.fontSize = '12px';
        xLabel.style.fontWeight = 'bold';
        xLabel.style.bottom = '10px';
        xLabel.style.right = '10px';
        this.container.appendChild(xLabel);
        
        // Y-axis label
        const yLabel = document.createElement('div');
        yLabel.className = 'axis-label';
        yLabel.textContent = 'PC2';
        yLabel.style.position = 'absolute';
        yLabel.style.color = '#666666';
        yLabel.style.fontSize = '12px';
        yLabel.style.fontWeight = 'bold';
        yLabel.style.top = '10px';
        yLabel.style.left = '10px';
        this.container.appendChild(yLabel);
        
        // Z-axis label
        const zLabel = document.createElement('div');
        zLabel.className = 'axis-label';
        zLabel.textContent = 'PC3';
        zLabel.style.position = 'absolute';
        zLabel.style.color = '#666666';
        zLabel.style.fontSize = '12px';
        zLabel.style.fontWeight = 'bold';
        zLabel.style.top = '10px';
        zLabel.style.right = '10px';
        this.container.appendChild(zLabel);
    }
    
    setupMouseInteraction() {
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        this.hoveredObject = null;
        
        // Get container position for calculating mouse coordinates
        let containerRect = this.container.getBoundingClientRect();
        
        this.container.addEventListener('mousemove', (event) => {
            // Calculate mouse position relative to the container
            const x = event.clientX - containerRect.left;
            const y = event.clientY - containerRect.top;
            
            // Convert to normalized device coordinates (-1 to +1)
            this.mouse.x = (x / this.width) * 2 - 1;
            this.mouse.y = -(y / this.height) * 2 + 1;
            
            // Update raycasting
            this.updateRaycasting(event);
        });
        
        // Update container position on scroll
        window.addEventListener('scroll', () => {
            containerRect = this.container.getBoundingClientRect();
        });
        
        // Clear hover when mouse leaves container
        this.container.addEventListener('mouseleave', () => {
            if (this.hoveredObject) {
                this.hoveredObject.scale.set(1, 1, 1);
                this.hoveredObject = null;
            }
            document.getElementById('info-panel').style.display = 'none';
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
            this.data = data;
            
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
            
            this.data = sampleData;
            const samplePairs = this.createPairs(sampleData);
            const sampleBounds = this.calculateBounds(sampleData);
            this.createVisualization(sampleData, samplePairs, sampleBounds);
        }
    }
    
    clearVisualization() {
        // Remove all axis labels
        const labels = this.container.querySelectorAll('.axis-label');
        labels.forEach(label => this.container.removeChild(label));
        
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
        const scale = 12; // Scale factor for visualization
        
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
            
            // Create line material - gray line for all connections
            const lineMaterial = new THREE.LineBasicMaterial({
                color: 0x888888,
                opacity: 0.5,
                transparent: true
            });
            
            // Create line and add to group
            const line = new THREE.Line(lineGeometry, lineMaterial);
            this.linesGroup.add(line);
        });
        
        // Draw data points with improved geometry
        data.forEach(d => {
            const x = normalize(d.pc1, bounds.pc1.min, bounds.pc1.max);
            const y = normalize(d.pc2, bounds.pc2.min, bounds.pc2.max);
            const z = normalize(d.pc3, bounds.pc3.min, bounds.pc3.max);
            
            let object;
            
            if (d.type === 'original') {
                // Black spheres with white outline for originals
                // Higher segment count for smoother spheres
                const geometry = new THREE.SphereGeometry(0.4, 24, 24);
                const material = new THREE.MeshPhongMaterial({
                    color: 0x000000,
                    specular: 0x111111,
                    shininess: 30,
                    transparent: false
                });
                
                object = new THREE.Mesh(geometry, material);
                
                // Add white outline with improved material
                const outlineMaterial = new THREE.MeshBasicMaterial({
                    color: 0xffffff,
                    side: THREE.BackSide
                });
                const outlineMesh = new THREE.Mesh(
                    new THREE.SphereGeometry(0.45, 24, 24),
                    outlineMaterial
                );
                object.add(outlineMesh);
                
            } else {
                // White semi-transparent spheres for adversarials with improved material
                const geometry = new THREE.SphereGeometry(0.4, 24, 24);
                const material = new THREE.MeshPhongMaterial({
                    color: 0xffffff,
                    specular: 0x222222,
                    shininess: 30,
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
                    
                    // Updated info panel with improved styling
                    infoPanel.style.display = 'block';
                    infoPanel.style.background = 'rgba(0, 0, 0, 0.8)';
                    infoPanel.style.color = '#ffffff';
                    infoPanel.style.padding = '8px 12px';
                    infoPanel.style.borderRadius = '4px';
                    infoPanel.style.fontSize = '14px';
                    infoPanel.style.fontFamily = 'monospace';
                    infoPanel.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.5)';
                    infoPanel.style.zIndex = '1000';
                    
                    // Add more details to the panel
                    infoPanel.innerHTML = `
                        <div style="font-weight: bold; margin-bottom: 5px;">ID: ${pointData.id}</div>
                        <div>Type: ${pointData.type}</div>
                        <div>PCA: [${pointData.pc1.toFixed(2)}, ${pointData.pc2.toFixed(2)}, ${pointData.pc3.toFixed(2)}]</div>
                        <div>Label: ${pointData.label}</div>
                    `;
                    
                    // Show adversarial-specific properties if available
                    if (pointData.type === 'adversarial' && pointData.kld !== undefined) {
                        infoPanel.innerHTML += `
                            <div>KL Divergence: ${pointData.kld.toFixed(4)}</div>
                            <div>MSE: ${pointData.mse.toFixed(6)}</div>
                        `;
                    }
                    
                    // Calculate position relative to the container
                    const containerRect = this.container.getBoundingClientRect();
                    infoPanel.style.left = `${event.clientX - containerRect.left + 15}px`;
                    infoPanel.style.top = `${event.clientY - containerRect.top + 15}px`;
                    
                    // Ensure the panel stays within the container bounds
                    const panelRect = infoPanel.getBoundingClientRect();
                    if (panelRect.right > containerRect.right) {
                        infoPanel.style.left = `${event.clientX - containerRect.left - panelRect.width - 15}px`;
                    }
                    if (panelRect.bottom > containerRect.bottom) {
                        infoPanel.style.top = `${event.clientY - containerRect.top - panelRect.height - 15}px`;
                    }
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
        // Get new container dimensions
        this.width = this.container.clientWidth;
        this.height = this.container.clientHeight;
        
        // Update camera
        this.camera.aspect = this.width / this.height;
        this.camera.updateProjectionMatrix();
        
        // Update renderer
        this.renderer.setSize(this.width, this.height);
    }
    
    resetView() {
        // Reset camera position
        this.camera.position.set(20, 20, 20);
        this.camera.lookAt(0, 0, 0);
        
        // Reset controls
        this.controls.reset();
    }
}