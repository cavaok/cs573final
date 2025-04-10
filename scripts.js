document.addEventListener('DOMContentLoaded', function() {
    // Set up Supabase client
    const supabaseUrl = 'https://fxwzblzdvwowourssdih.supabase.co';
    const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ4d3pibHpkdndvd291cnNzZGloIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzY0NjA1NTUsImV4cCI6MjA1MjAzNjU1NX0.Kcc9aJmOcgn6xF76aqfGUs6rO9awnabimX8HJnPhzrQY';
    // const supabase = supabaseClient.createClient(supabaseUrl, supabaseKey);
    
    // Check if we're on the main page or info page
    const isMainPage = !window.location.href.includes('info.html');
    
    if (isMainPage) {
        // Main page - Initialize visualization
        initMainVisualization();
    }
});

// Function to initialize the main PCA visualization
function initMainVisualization() {
    console.log('Initializing 3D PCA visualization with Three.js');
    
    // Create model selector
    const container = document.getElementById('visualization-container');
    
    // Add model selector UI at the top of the container
    const selectorDiv = document.createElement('div');
    selectorDiv.style.position = 'absolute';
    selectorDiv.style.top = '20px';
    selectorDiv.style.left = '20px';
    selectorDiv.style.zIndex = '10';
    
    const modelSelector = document.createElement('select');
    modelSelector.id = 'model-selector';
    modelSelector.style.padding = '5px';
    modelSelector.style.backgroundColor = '#000';
    modelSelector.style.color = '#fff';
    modelSelector.style.border = '1px solid #fff';
    
    // Add options for each model
    const models = ['auto64_1', 'auto64_2', 'auto64_3', 'auto64_4'];
    models.forEach(model => {
        const option = document.createElement('option');
        option.value = model;
        option.textContent = model;
        modelSelector.appendChild(option);
    });
    
    // Add selector label
    const selectorLabel = document.createElement('label');
    selectorLabel.htmlFor = 'model-selector';
    selectorLabel.textContent = 'Select Model: ';
    selectorLabel.style.color = '#fff';
    selectorLabel.style.marginRight = '10px';
    
    // Add reset view button
    const resetBtn = document.createElement('button');
    resetBtn.id = 'reset-view';
    resetBtn.textContent = 'Reset View';
    resetBtn.style.marginLeft = '10px';
    resetBtn.style.padding = '5px 10px';
    resetBtn.style.backgroundColor = '#000';
    resetBtn.style.color = '#fff';
    resetBtn.style.border = '1px solid #fff';
    resetBtn.style.cursor = 'pointer';
    
    // Add elements to the container
    selectorDiv.appendChild(selectorLabel);
    selectorDiv.appendChild(modelSelector);
    selectorDiv.appendChild(resetBtn);
    container.appendChild(selectorDiv);
    
    // Create legend
    const legend = document.createElement('div');
    legend.id = 'legend';
    legend.style.position = 'absolute';
    legend.style.top = '20px';
    legend.style.right = '20px';
    legend.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    legend.style.padding = '10px';
    legend.style.border = '1px solid #fff';
    legend.style.borderRadius = '5px';
    legend.style.zIndex = '10';
    
    legend.innerHTML = `
        <h3>LEGEND</h3>
        <div class="legend-item">
            <div class="legend-color" style="display: inline-block; width: 16px; height: 16px; background-color: #6baed6; margin-right: 5px;"></div>
            <span>Label 0</span>
        </div>
        <div class="legend-item">
            <div class="legend-color" style="display: inline-block; width: 16px; height: 16px; background-color: #fd8d3c; margin-right: 5px;"></div>
            <span>Label 1</span>
        </div>
        <div class="legend-item">
            <div class="legend-shape" style="display: inline-block; width: 16px; height: 16px; text-align: center; margin-right: 5px;">●</div>
            <span>Original</span>
        </div>
        <div class="legend-item">
            <div class="legend-shape" style="display: inline-block; width: 16px; height: 16px; text-align: center; margin-right: 5px;">✖</div>
            <span>Adversarial</span>
        </div>
        <div class="legend-item">
            <div class="legend-line" style="display: inline-block; width: 16px; border-top: 2px dashed #fff; margin-right: 5px;"></div>
            <span>Connected Pairs</span>
        </div>
    `;
    
    container.appendChild(legend);
    
    // Create stats area
    const statsArea = document.createElement('div');
    statsArea.id = 'stats-area';
    statsArea.style.position = 'absolute';
    statsArea.style.bottom = '20px';
    statsArea.style.left = '20px';
    statsArea.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    statsArea.style.padding = '10px';
    statsArea.style.border = '1px solid #fff';
    statsArea.style.borderRadius = '5px';
    
    statsArea.innerHTML = `
        <h4>OVERALL STATS</h4>
        <div id="stats-content">Loading...</div>
    `;
    
    container.appendChild(statsArea);
    
    // Initialize the 3D visualization
    const pca3D = new PCA3DVisualization(container);
    
    // Set up event listeners
    modelSelector.addEventListener('change', function() {
        pca3D.loadData(this.value);
    });
    
    resetBtn.addEventListener('click', function() {
        pca3D.resetView();
    });
    
    // Load data for the initially selected model
    pca3D.loadData(models[0]);
}

class PCA3DVisualization {
    constructor(container) {
        this.container = container;
        this.width = container.clientWidth;
        this.height = container.clientHeight;
        this.data = [];
        this.pairs = [];
        
        // Colors for labels (matching your existing implementation)
        this.colors = {
            0: 0x6baed6, // Blue
            1: 0xfd8d3c  // Orange
        };
        
        // Initialize Three.js components
        this.initThree();
        
        // Set up raycasting for hover effects
        this.setupRaycasting();
        
        // Start animation loop
        this.animate();
        
        // Update axis labels
        this.updateAxisLabels();
        
        // Handle window resize
        window.addEventListener('resize', () => this.onWindowResize());
    }
    
    initThree() {
        // Create scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x000000); // Match your black background
        
        // Create camera
        this.camera = new THREE.PerspectiveCamera(75, this.width / this.height, 0.1, 1000);
        this.camera.position.set(30, 30, 30);
        this.camera.lookAt(0, 0, 0);
        
        // Create renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(this.width, this.height);
        this.container.appendChild(this.renderer.domElement);
        
        // Add orbit controls for rotation and zoom
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);

        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.25;
        
        // Add axes
        this.addAxes();
        
        // Add lights
        this.addLights();
        
        // Create object containers
        this.pointsGroup = new THREE.Group(); // Container for data points
        this.linesGroup = new THREE.Group(); // Container for connection lines
        this.scene.add(this.pointsGroup);
        this.scene.add(this.linesGroup);
    }
    
    addAxes() {
        // Create axes
        const axesHelper = new THREE.AxesHelper(30);
        
        // Change colors to match your theme
        axesHelper.setColors(
            new THREE.Color(0xff5555), // X axis (PC1) - red
            new THREE.Color(0x55ff55), // Y axis (PC2) - green
            new THREE.Color(0x5555ff)  // Z axis (PC3) - blue
        );
        this.scene.add(axesHelper);
        
        // Add grid helper for reference
        const gridHelper = new THREE.GridHelper(60, 20, 0x555555, 0x333333);
        this.scene.add(gridHelper);
    }
    
    addLights() {
        // Add ambient light
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        this.scene.add(ambientLight);
        
        // Add directional light
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(1, 1, 1);
        this.scene.add(directionalLight);
    }
    
    setupRaycasting() {
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        this.hoveredObject = null;
        
        // Add mouse move event listener
        window.addEventListener('mousemove', (event) => {
            // Calculate mouse position in normalized device coordinates
            this.mouse.x = (event.clientX / this.width) * 2 - 1;
            this.mouse.y = -(event.clientY / this.height) * 2 + 1;
        });
    }
    
    async loadData(modelName) {
        // Clear previous visualization
        this.clearVisualization();
        
        // Update loading state
        document.getElementById('stats-content').textContent = 'Loading...';
        
        try {
            // Load data from JSON file
            const filePath = `data/${modelName}_pca.json`;
            const response = await fetch(filePath);
            
            if (!response.ok) {
                throw new Error(`Failed to load data: ${response.status} ${response.statusText}`);
            }
            
            this.data = await response.json();
            console.log(`Loaded ${this.data.length} data points from ${filePath}`);
            
            // Process the data
            this.processData();
            
            // Render the visualization
            this.renderVisualization();
            
            // Update stats
            this.updateStats();
        } catch (error) {
            console.error('Error loading data:', error);
            
            // Use fallback sample data
            this.data = [
                {"id": "93", "case_idx": 0, "model_name": "auto64_1", "type": "original", "pc1": 4.75, "pc2": -0.19, "pc3": 3.05, "label": 0, "prediction": 0, "kld": 0.0, "mse": 0.0, "frob": 0.0},
                {"id": "93_adv", "case_idx": 0, "model_name": "auto64_1", "type": "adversarial", "pc1": 4.34, "pc2": 0.10, "pc3": 2.68, "label": 0, "prediction": 0, "kld": 0.02, "mse": 0.005, "frob": 2.11},
                {"id": "138", "case_idx": 1, "model_name": "auto64_1", "type": "original", "pc1": 4.75, "pc2": -0.19, "pc3": 3.05, "label": 0, "prediction": 0, "kld": 0.0, "mse": 0.0, "frob": 0.0},
                {"id": "138_adv", "case_idx": 1, "model_name": "auto64_1", "type": "adversarial", "pc1": 4.01, "pc2": -0.96, "pc3": 2.24, "label": 0, "prediction": 0, "kld": 0.06, "mse": 0.012, "frob": 3.17}
            ];
            
            this.processData();
            this.renderVisualization();
            this.updateStats();
            
            document.getElementById('stats-content').textContent = 'Using fallback sample data due to loading error';
        }
    }
    
    processData() {
        // Find min and max values for normalization
        this.dataMinMax = {
            pc1: { min: Infinity, max: -Infinity },
            pc2: { min: Infinity, max: -Infinity },
            pc3: { min: Infinity, max: -Infinity }
        };
        
        this.data.forEach(d => {
            this.dataMinMax.pc1.min = Math.min(this.dataMinMax.pc1.min, d.pc1);
            this.dataMinMax.pc1.max = Math.max(this.dataMinMax.pc1.max, d.pc1);
            this.dataMinMax.pc2.min = Math.min(this.dataMinMax.pc2.min, d.pc2);
            this.dataMinMax.pc2.max = Math.max(this.dataMinMax.pc2.max, d.pc2);
            this.dataMinMax.pc3.min = Math.min(this.dataMinMax.pc3.min, d.pc3);
            this.dataMinMax.pc3.max = Math.max(this.dataMinMax.pc3.max, d.pc3);
        });
        
        // Create pairs (original and adversarial examples)
        this.pairs = [];
        const originals = this.data.filter(d => d.type === 'original');
        
        originals.forEach(original => {
            // Find the matching adversarial example
            const adversarial = this.data.find(d => 
                d.type === 'adversarial' && 
                d.case_idx === original.case_idx &&
                d.model_name === original.model_name
            );
            
            if (adversarial) {
                this.pairs.push({ original, adversarial });
            }
        });
        
        console.log(`Created ${this.pairs.length} original-adversarial pairs`);
    }
    
    clearVisualization() {
        // Remove all points
        while (this.pointsGroup.children.length > 0) {
            const object = this.pointsGroup.children[0];
            if (object.geometry) object.geometry.dispose();
            if (object.material) object.material.dispose();
            this.pointsGroup.remove(object);
        }
        
        // Remove all lines
        while (this.linesGroup.children.length > 0) {
            const line = this.linesGroup.children[0];
            if (line.geometry) line.geometry.dispose();
            if (line.material) line.material.dispose();
            this.linesGroup.remove(line);
        }
    }
    
    renderVisualization() {
        // Scale factor for better visualization
        const scale = 20;
        
        // Normalize a value between min and max to [-1, 1] * scale
        const normalize = (val, min, max) => {
            return ((val - min) / (max - min) * 2 - 1) * scale;
        };
        
        // Draw connection lines between original and adversarial pairs
        this.pairs.forEach(pair => {
            const x1 = normalize(pair.original.pc1, this.dataMinMax.pc1.min, this.dataMinMax.pc1.max);
            const y1 = normalize(pair.original.pc2, this.dataMinMax.pc2.min, this.dataMinMax.pc2.max);
            const z1 = normalize(pair.original.pc3, this.dataMinMax.pc3.min, this.dataMinMax.pc3.max);
            
            const x2 = normalize(pair.adversarial.pc1, this.dataMinMax.pc1.min, this.dataMinMax.pc1.max);
            const y2 = normalize(pair.adversarial.pc2, this.dataMinMax.pc2.min, this.dataMinMax.pc2.max);
            const z2 = normalize(pair.adversarial.pc3, this.dataMinMax.pc3.min, this.dataMinMax.pc3.max);
            
            // Create line geometry
            const lineGeometry = new THREE.BufferGeometry();
            const linePositions = new Float32Array([
                x1, y1, z1,
                x2, y2, z2
            ]);
            lineGeometry.setAttribute('position', new THREE.BufferAttribute(linePositions, 3));
            
            // Create line material with dashed effect
            const lineMaterial = new THREE.LineDashedMaterial({
                color: this.colors[pair.original.label],
                dashSize: 1,
                gapSize: 1,
                opacity: 0.7,
                transparent: true
            });
            
            // Create line and add to group
            const line = new THREE.Line(lineGeometry, lineMaterial);
            line.computeLineDistances(); // Required for dashed lines
            this.linesGroup.add(line);
        });
        
        // Draw data points
        this.data.forEach(d => {
            const x = normalize(d.pc1, this.dataMinMax.pc1.min, this.dataMinMax.pc1.max);
            const y = normalize(d.pc2, this.dataMinMax.pc2.min, this.dataMinMax.pc2.max);
            const z = normalize(d.pc3, this.dataMinMax.pc3.min, this.dataMinMax.pc3.max);
            
            let object;
            const color = this.colors[d.label];
            
            if (d.type === 'original') {
                // Original points as spheres (circles in 3D)
                const geometry = new THREE.SphereGeometry(0.5, 16, 16);
                const material = new THREE.MeshLambertMaterial({ color: color });
                object = new THREE.Mesh(geometry, material);
            } else {
                // Adversarial points as crosses
                const crossSize = 0.5;
                object = new THREE.Group();
                
                // Create cross using lines
                const lineMaterial = new THREE.LineBasicMaterial({ color: color });
                
                // Line 1: top-left to bottom-right
                const line1Geometry = new THREE.BufferGeometry();
                const line1Positions = new Float32Array([
                    -crossSize, -crossSize, 0,
                    crossSize, crossSize, 0
                ]);
                line1Geometry.setAttribute('position', new THREE.BufferAttribute(line1Positions, 3));
                const line1 = new THREE.Line(line1Geometry, lineMaterial);
                
                // Line 2: top-right to bottom-left
                const line2Geometry = new THREE.BufferGeometry();
                const line2Positions = new Float32Array([
                    crossSize, -crossSize, 0,
                    -crossSize, crossSize, 0
                ]);
                line2Geometry.setAttribute('position', new THREE.BufferAttribute(line2Positions, 3));
                const line2 = new THREE.Line(line2Geometry, lineMaterial);
                
                object.add(line1);
                object.add(line2);
            }
            
            // Position the object
            object.position.set(x, y, z);
            
            // Store original data with the object for hover info
            object.userData = d;
            
            // Add to scene
            this.pointsGroup.add(object);
        });
    }
    
    updateStats() {
        if (this.data.length === 0) return;
        
        // Calculate statistics
        const originalCount = this.data.filter(d => d.type === 'original').length;
        const adversarialCount = this.data.filter(d => d.type === 'adversarial').length;
        const modelName = this.data[0].model_name;
        
        // Get average KLD and MSE for adversarial examples
        const adversarials = this.data.filter(d => d.type === 'adversarial');
        const avgKLD = adversarials.reduce((sum, d) => sum + d.kld, 0) / adversarials.length;
        const avgMSE = adversarials.reduce((sum, d) => sum + d.mse, 0) / adversarials.length;
        
        // Update stats display
        const statsContent = document.getElementById('stats-content');
        statsContent.innerHTML = `
            Model: ${modelName}<br>
            Points: ${this.data.length} (${originalCount} original, ${adversarialCount} adversarial)<br>
            Avg KLD: ${avgKLD.toFixed(4)}<br>
            Avg MSE: ${avgMSE.toFixed(4)}
        `;
    }
    
    updateAxisLabels() {
        // Position axis labels in the 3D space
        const xLabel = document.getElementById('x-axis-label');
        const yLabel = document.getElementById('y-axis-label');
        const zLabel = document.getElementById('z-axis-label');
        
        const updateLabelsPosition = () => {
            // Get the position in 3D space
            const xPos = new THREE.Vector3(25, 0, 0);
            const yPos = new THREE.Vector3(0, 25, 0);
            const zPos = new THREE.Vector3(0, 0, 25);
            
            // Project 3D positions to screen coordinates
            xPos.project(this.camera);
            yPos.project(this.camera);
            zPos.project(this.camera);
            
            // Convert to screen coordinates
            const xScreenPos = {
                x: (xPos.x * 0.5 + 0.5) * this.width,
                y: (-(xPos.y * 0.5) + 0.5) * this.height
            };
            
            const yScreenPos = {
                x: (yPos.x * 0.5 + 0.5) * this.width,
                y: (-(yPos.y * 0.5) + 0.5) * this.height
            };
            
            const zScreenPos = {
                x: (zPos.x * 0.5 + 0.5) * this.width,
                y: (-(zPos.y * 0.5) + 0.5) * this.height
            };
            
            // Update label positions
            xLabel.style.left = `${xScreenPos.x}px`;
            xLabel.style.top = `${xScreenPos.y}px`;
            xLabel.textContent = 'PC1';
            
            yLabel.style.left = `${yScreenPos.x}px`;
            yLabel.style.top = `${yScreenPos.y}px`;
            yLabel.textContent = 'PC2';
            
            zLabel.style.left = `${zScreenPos.x}px`;
            zLabel.style.top = `${zScreenPos.y}px`;
            zLabel.textContent = 'PC3';
        };
        
        // Call immediately
        updateLabelsPosition();
        
        // Store to call during animation
        this.updateLabelsPosition = updateLabelsPosition;
    }
    
    animate() {
        requestAnimationFrame(() => this.animate());
        
        // Update controls
        this.controls.update();
        
        // Update raycasting for hover effects
        this.updateRaycasting();
        
        // Update axis labels with camera movement
        if (this.updateLabelsPosition) {
            this.updateLabelsPosition();
        }
        
        // Render scene
        this.renderer.render(this.scene, this.camera);
    }
    
    updateRaycasting() {
        // Update the picking ray with the camera and mouse position
        this.raycaster.setFromCamera(this.mouse, this.camera);
        
        // Calculate objects intersecting the ray
        const intersects = this.raycaster.intersectObjects(this.pointsGroup.children, true);
        
        const infoPanel = document.getElementById('info-panel');
        
        // If we have intersections
        if (intersects.length > 0) {
            // Get the first intersected object that has userData
            let intersectedObject = null;
            
            for (let i = 0; i < intersects.length; i++) {
                // For group objects (crosses), check parent
                let object = intersects[i].object;
                if (!object.userData || !object.userData.id) {
                    if (object.parent && object.parent.userData && object.parent.userData.id) {
                        object = object.parent;
                    } else {
                        continue;
                    }
                }
                
                intersectedObject = object;
                break;
            }
            
            if (intersectedObject) {
                const pointData = intersectedObject.userData;
                
                // If we hover a new object
                if (this.hoveredObject !== intersectedObject) {
                    // Reset previous hover effect
                    if (this.hoveredObject) {
                        this.resetHoverEffect(this.hoveredObject);
                    }
                    
                    // Apply hover effect to new object
                    this.applyHoverEffect(intersectedObject);
                    
                    // Update hover reference
                    this.hoveredObject = intersectedObject;
                    
                    // Update info panel
                    infoPanel.style.display = 'block';
                    infoPanel.innerHTML = `
                        <strong>ID:</strong> ${pointData.id}<br>
                        <strong>Type:</strong> ${pointData.type}<br>
                        <strong>Label:</strong> ${pointData.label}<br>
                        <strong>Prediction:</strong> ${pointData.prediction}<br>
                        <strong>PCA:</strong> [${pointData.pc1.toFixed(2)}, ${pointData.pc2.toFixed(2)}, ${pointData.pc3.toFixed(2)}]<br>
                        ${pointData.type === 'adversarial' ? `<strong>KLD:</strong> ${pointData.kld.toFixed(4)}<br>` : ''}
                        ${pointData.type === 'adversarial' ? `<strong>MSE:</strong> ${pointData.mse.toFixed(4)}<br>` : ''}
                        ${pointData.type === 'adversarial' ? `<strong>Frob:</strong> ${pointData.frob.toFixed(4)}` : ''}
                    `;
                    
                    // Position the info panel near the mouse
                    infoPanel.style.left = `${Math.min(window.innerWidth - 220, event.clientX + 10)}px`;
                    infoPanel.style.top = `${Math.min(window.innerHeight - 150, event.clientY + 10)}px`;
                }
            }
        } else {
            // Reset hover effect
            if (this.hoveredObject) {
                this.resetHoverEffect(this.hoveredObject);
                this.hoveredObject = null;
            }
            
            // Hide info panel
            infoPanel.style.display = 'none';
        }
    }
    
    applyHoverEffect(object) {
        if (object.userData.type === 'original') {
            // Increase size for original (sphere)
            object.scale.set(1.5, 1.5, 1.5);
        } else {
            // Increase size for adversarial (cross)
            object.scale.set(1.5, 1.5, 1.5);
        }
    }
    
    resetHoverEffect(object) {
        // Reset to original size
        object.scale.set(1, 1, 1);
    }
    
    onWindowResize() {
        this.width = this.container.clientWidth;
        this.height = this.container.clientHeight;
        
        this.camera.aspect = this.width / this.height;
        this.camera.updateProjectionMatrix();
        
        this.renderer.setSize(this.width, this.height);
    }
    
    resetView() {
        // Reset camera to initial position
        this.camera.position.set(30, 30, 30);
        this.camera.lookAt(0, 0, 0);
        
        // Reset controls
        this.controls.reset();
    }
}

// This keeps our existing createPairs function but we don't need it anymore
// as it's now handled inside the PCA3DVisualization class
function createPairs(data) {
    const pairs = [];
    const originalPoints = data.filter(d => d.type === 'original');
    
    originalPoints.forEach(original => {
        // Find the matching adversarial example with the same case_idx
        const adversarial = data.find(d => 
            d.type === 'adversarial' && 
            d.case_idx === original.case_idx
        );
        
        if (adversarial) {
            pairs.push({
                original,
                adversarial
            });
        }
    });
    
    return pairs;
}