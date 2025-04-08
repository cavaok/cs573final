// PCA Visualization for Adversarial Examples
document.addEventListener('DOMContentLoaded', function() {
    // Supabase client setup
    const supabaseUrl = 'https://fxwzblzdvwowourssdih.supabase.co';
    const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ4d3pibHpkdndvd291cnNzZGloIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzY0NjA1NTUsImV4cCI6MjA1MjAzNjU1NX0.Kcc9aJmOcgn6xF76aqfGUs6rO9awnabimX8HJnPhzrQ';
    const supabase = supabaseClient.createClient(supabaseUrl, supabaseKey);

    const visualizationContainer = document.getElementById('visualization-container');
    
    // Utility functions
    function strToArray(s) {
        if (typeof s === 'string') {
            // Handle various string formats of arrays
            if (s.startsWith('[') && s.endsWith(']')) {
                return JSON.parse(s);
            }
            return s.split(/\s+/).map(parseFloat);
        }
        return s;
    }

    // Basic PCA implementation (simplified)
    function performPCA(data, numComponents = 3) {
        // Normalize the data
        const mean = data[0].map((_, colIndex) => 
            data.reduce((sum, row) => sum + row[colIndex], 0) / data.length
        );
        
        const normalizedData = data.map(row => 
            row.map((val, index) => val - mean[index])
        );

        // Compute covariance matrix
        const computeCovarianceMatrix = (matrix) => {
            const numRows = matrix.length;
            const numCols = matrix[0].length;
            const covMatrix = Array(numCols).fill().map(() => Array(numCols).fill(0));
            
            for (let i = 0; i < numCols; i++) {
                for (let j = 0; j < numCols; j++) {
                    const colI = matrix.map(row => row[i]);
                    const colJ = matrix.map(row => row[j]);
                    
                    const covariance = colI.reduce((sum, val, idx) => 
                        sum + val * colJ[idx], 0) / (numRows - 1);
                    
                    covMatrix[i][j] = covariance;
                }
            }
            
            return covMatrix;
        };

        const covMatrix = computeCovarianceMatrix(normalizedData);

        // Simplified eigenvalue handling
        const eigenvalues = covMatrix.map((row, i) => ({
            value: row[i],
            index: i
        })).sort((a, b) => b.value - a.value);

        // Select top components
        const topComponents = eigenvalues
            .slice(0, numComponents)
            .map(ev => normalizedData.map(row => row[ev.index]));

        // Transform data
        return data.map(row => 
            topComponents.map(component => 
                component.reduce((sum, val, idx) => sum + val * row[idx], 0)
            )
        );
    }

    // Function to create Plotly visualization
    function createPCAVisualization(modelName, originalImages, adversarialImages) {
        // Combine images for PCA
        const allImages = [...originalImages, ...adversarialImages];

        // Perform PCA
        const pcaResult = performPCA(allImages, 3);

        // Prepare Plotly data
        const data = [
            {
                x: pcaResult.slice(0, originalImages.length).map(point => point[0]),
                y: pcaResult.slice(0, originalImages.length).map(point => point[1]),
                z: pcaResult.slice(0, originalImages.length).map(point => point[2]),
                mode: 'markers',
                type: 'scatter3d',
                name: 'Original Images',
                marker: {
                    size: 5,
                    color: 'blue',
                    opacity: 0.7
                }
            },
            {
                x: pcaResult.slice(originalImages.length).map(point => point[0]),
                y: pcaResult.slice(originalImages.length).map(point => point[1]),
                z: pcaResult.slice(originalImages.length).map(point => point[2]),
                mode: 'markers',
                type: 'scatter3d',
                name: 'Adversarial Images',
                marker: {
                    size: 5,
                    color: 'red',
                    opacity: 0.7
                }
            }
        ];

        // Add connection lines
        const connectionTraces = originalImages.map((_, index) => ({
            x: [
                pcaResult[index][0], 
                pcaResult[originalImages.length + index][0]
            ],
            y: [
                pcaResult[index][1], 
                pcaResult[originalImages.length + index][1]
            ],
            z: [
                pcaResult[index][2], 
                pcaResult[originalImages.length + index][2]
            ],
            mode: 'lines',
            type: 'scatter3d',
            line: {
                color: 'grey',
                width: 1
            },
            opacity: 0.2,
            showlegend: false
        }));

        data.push(...connectionTraces);

        // Layout configuration
        const layout = {
            title: `PCA Visualization - ${modelName}`,
            scene: {
                xaxis: {title: 'PC1'},
                yaxis: {title: 'PC2'},
                zaxis: {title: 'PC3'}
            },
            height: 600,
            width: '100%'
        };

        // Render the plot
        Plotly.newPlot(visualizationContainer, data, layout);
    }

    // Function to load and process Supabase data
    async function loadModelData(modelName) {
        try {
            // Clear previous visualization
            visualizationContainer.innerHTML = 'Loading...';

            // Fetch data from Supabase
            const { data, error } = await supabase
                .from('adversarial_examples')
                .select('*')
                .eq('model', modelName);

            if (error) throw error;

            // Extract image data
            const originalImages = data
                .map(row => row.original_image ? strToArray(row.original_image) : null)
                .filter(img => img);

            const adversarialImages = data
                .map(row => row.adversarial_image ? strToArray(row.adversarial_image) : null)
                .filter(img => img);

            // Create visualization
            createPCAVisualization(modelName, originalImages, adversarialImages);

        } catch (error) {
            console.error('Error loading model data:', error);
            visualizationContainer.innerHTML = `Error loading data for ${modelName}`;
        }
    }

    // Model selection dropdown
    const modelSelector = document.getElementById('model-selector');
    
    // Populate model selector 
    async function populateModelSelector() {
        try {
            // Fetch unique model names from Supabase
            const { data, error } = await supabase
                .from('adversarial_examples')
                .select('model', { count: 'exact' })
                .distinct();

            if (error) throw error;

            // Clear existing options
            modelSelector.innerHTML = '';

            // Populate dropdown
            data.forEach(model => {
                const option = document.createElement('option');
                option.value = model.model;
                option.textContent = model.model;
                modelSelector.appendChild(option);
            });

            // Load initial model
            if (data.length > 0) {
                loadModelData(data[0].model);
            }
        } catch (error) {
            console.error('Error populating model selector:', error);
            modelSelector.innerHTML = '<option>Error loading models</option>';
        }
    }

    // Event listener for model selection
    modelSelector.addEventListener('change', (event) => {
        loadModelData(event.target.value);
    });

    // Populate model selector on page load
    populateModelSelector();
});