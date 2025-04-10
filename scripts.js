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
    console.log('Initializing PCA visualization with D3');
    
    // Create model selector
    const container = document.getElementById('visualization-container');
    
    // Add model selector UI at the top of the container
    const selectorDiv = document.createElement('div');
    selectorDiv.style.marginBottom = '10px';
    selectorDiv.style.textAlign = 'center';
    
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
    
    // Add elements to the container
    selectorDiv.appendChild(selectorLabel);
    selectorDiv.appendChild(modelSelector);
    container.appendChild(selectorDiv);
    
    // Create a div for the SVG
    const svgContainer = document.createElement('div');
    svgContainer.id = 'pca-svg-container';
    svgContainer.style.width = '100%';
    svgContainer.style.height = 'calc(100% - 40px)';
    container.appendChild(svgContainer);
    
    // Load data for the initially selected model
    loadAndDisplayData(models[0]);
    
    // Add event listener for model selection change
    modelSelector.addEventListener('change', function() {
        loadAndDisplayData(this.value);
    });
}

// Function to load and display data for a selected model
async function loadAndDisplayData(modelName) {
    // Get container dimensions
    const container = document.getElementById('pca-svg-container');
    const width = container.clientWidth;
    const height = container.clientHeight;
    
    // Clear the previous visualization
    d3.select('#pca-svg-container').html('');
    
    // Create SVG element
    const svg = d3.select('#pca-svg-container')
        .append('svg')
        .attr('width', width)
        .attr('height', height)
        .style('background-color', '#000');
    
    // Add loading indicator
    const loadingText = svg.append('text')
        .attr('x', width / 2)
        .attr('y', height / 2)
        .attr('text-anchor', 'middle')
        .attr('fill', '#fff')
        .style('font-family', 'Space Grotesk, sans-serif')
        .style('font-size', '18px')
        .text('Loading data...');
    
    // Load the data for the selected model
    const data = await loadPCAData(modelName);
    
    // Remove loading indicator
    loadingText.remove();
    
    if (data.length === 0) {
        // Show error message if no data
        svg.append('text')
            .attr('x', width / 2)
            .attr('y', height / 2)
            .attr('text-anchor', 'middle')
            .attr('fill', '#fff')
            .style('font-family', 'Space Grotesk, sans-serif')
            .style('font-size', '18px')
            .text('No data available or error loading data');
        return;
    }
    
    // Add a group for the visualization
    const g = svg.append('g')
        .attr('transform', `translate(${width / 2}, ${height / 2})`);
    
    // Add title with model name
    svg.append('text')
        .attr('x', 10)
        .attr('y', 30)
        .attr('fill', '#fff')
        .style('font-family', 'Space Grotesk, sans-serif')
        .style('font-size', '16px')
        .text(`Model: ${modelName}`);
    
    // Create a key/legend
    const legend = svg.append('g')
        .attr('transform', `translate(${width - 150}, 30)`);
    
    legend.append('text')
        .attr('x', 0)
        .attr('y', 0)
        .attr('fill', '#fff')
        .style('font-family', 'Space Grotesk, sans-serif')
        .style('font-size', '16px')
        .text('KEY');
    
    // Original image legend item
    legend.append('circle')
        .attr('cx', 20)
        .attr('cy', 25)
        .attr('r', 6)
        .attr('fill', '#fff');
    
    legend.append('text')
        .attr('x', 35)
        .attr('y', 30)
        .attr('fill', '#fff')
        .text('Original Image');
    
    // Adversarial example legend item
    legend.append('path')
        .attr('d', d3.symbol().type(d3.symbolCross).size(80))
        .attr('transform', 'translate(20, 50)')
        .attr('fill', '#fff');
    
    legend.append('text')
        .attr('x', 35)
        .attr('y', 55)
        .attr('fill', '#fff')
        .text('Adversarial Example');
    
    // Connecting line legend item
    legend.append('line')
        .attr('x1', 5)
        .attr('y1', 75)
        .attr('x2', 35)
        .attr('y2', 75)
        .attr('stroke', '#fff')
        .attr('stroke-width', 1)
        .attr('stroke-dasharray', '3,3');
    
    legend.append('text')
        .attr('x', 45)
        .attr('y', 80)
        .attr('fill', '#fff')
        .text('Pairs');
    
    // Process the data to create pairs
    const pairs = createPairs(data);
    
    // Set up scales for the 3D to 2D projection
    const xScale = d3.scaleLinear()
        .domain([d3.min(data, d => d.pc1), d3.max(data, d => d.pc1)])
        .range([-width/3, width/3]);
    
    const yScale = d3.scaleLinear()
        .domain([d3.min(data, d => d.pc2), d3.max(data, d => d.pc2)])
        .range([height/3, -height/3]);
    
    // Color scale for different labels
    const colorScale = d3.scaleOrdinal()
        .domain([0, 1])
        .range(['#6baed6', '#fd8d3c']);
    
    // Draw connection lines between original and adversarial pairs
    g.selectAll('.pair-line')
        .data(pairs)
        .enter()
        .append('line')
        .attr('class', 'pair-line')
        .attr('x1', d => xScale(d.original.pc1))
        .attr('y1', d => yScale(d.original.pc2))
        .attr('x2', d => xScale(d.adversarial.pc1))
        .attr('y2', d => yScale(d.adversarial.pc2))
        .attr('stroke', d => colorScale(d.original.label))
        .attr('stroke-width', 1)
        .attr('stroke-dasharray', '3,3')
        .attr('opacity', 0.7);
    
    // Draw original points
    g.selectAll('.original-point')
        .data(data.filter(d => d.type === 'original'))
        .enter()
        .append('circle')
        .attr('class', 'original-point')
        .attr('cx', d => xScale(d.pc1))
        .attr('cy', d => yScale(d.pc2))
        .attr('r', 6)
        .attr('fill', d => colorScale(d.label))
        .attr('stroke', '#fff')
        .attr('stroke-width', 1)
        .on('mouseover', function(event, d) {
            d3.select(this)
                .attr('r', 8)
                .attr('stroke-width', 2);
            
            // Display info about this point
            showPointInfo(svg, d, event.pageX, event.pageY);
        })
        .on('mouseout', function() {
            d3.select(this)
                .attr('r', 6)
                .attr('stroke-width', 1);
            
            // Hide info
            svg.select('.point-info').remove();
        });
    
    // Draw adversarial points using a different symbol
    g.selectAll('.adversarial-point')
        .data(data.filter(d => d.type === 'adversarial'))
        .enter()
        .append('path')
        .attr('class', 'adversarial-point')
        .attr('d', d3.symbol().type(d3.symbolCross).size(80))
        .attr('transform', d => `translate(${xScale(d.pc1)}, ${yScale(d.pc2)})`)
        .attr('fill', d => colorScale(d.label))
        .attr('stroke', '#fff')
        .attr('stroke-width', 1)
        .on('mouseover', function(event, d) {
            d3.select(this)
                .attr('d', d3.symbol().type(d3.symbolCross).size(120))
                .attr('stroke-width', 2);
            
            // Display info about this point
            showPointInfo(svg, d, event.pageX, event.pageY);
        })
        .on('mouseout', function() {
            d3.select(this)
                .attr('d', d3.symbol().type(d3.symbolCross).size(80))
                .attr('stroke-width', 1);
            
            // Hide info
            svg.select('.point-info').remove();
        });
    
    // Add stats display area
    const statsArea = svg.append('g')
        .attr('transform', `translate(20, ${height - 100})`);
    
    statsArea.append('rect')
        .attr('width', 200)
        .attr('height', 80)
        .attr('fill', '#000')
        .attr('stroke', '#fff')
        .attr('stroke-width', 1);
    
    statsArea.append('text')
        .attr('x', 10)
        .attr('y', 20)
        .attr('fill', '#fff')
        .style('font-family', 'Space Grotesk, sans-serif')
        .text('OVERALL STATS');
    
    // Add comparison window area (placeholder)
    const compareArea = svg.append('g')
        .attr('transform', `translate(${width - 220}, ${height - 100})`);
    
    compareArea.append('rect')
        .attr('width', 200)
        .attr('height', 80)
        .attr('fill', '#000')
        .attr('stroke', '#fff')
        .attr('stroke-width', 1);
    
    compareArea.append('text')
        .attr('x', 10)
        .attr('y', 20)
        .attr('fill', '#fff')
        .style('font-family', 'Space Grotesk, sans-serif')
        .text('COMPARE WINDOW');
}

// Function to load PCA data from JSON files in the data folder
async function loadPCAData(modelName = 'auto64_1') {
    try {
        // Construct the file path based on the model name
        const filePath = `data/${modelName}.json`;
        
        // Use fetch to load the JSON file
        const response = await fetch(filePath);
        
        // Check if the fetch was successful
        if (!response.ok) {
            throw new Error(`Failed to load data: ${response.status} ${response.statusText}`);
        }
        
        // Parse the JSON response
        const jsonData = await response.json();
        console.log(`Loaded ${jsonData.length} data points from ${filePath}`);
        
        return jsonData;
    } catch (error) {
        console.error('Error loading PCA data:', error);
        // Return sample data as fallback
        console.log('Using fallback sample data');
        return [
            {"id": "93", "case_idx": 0, "model_name": "auto64_1", "type": "original", "pc1": 4.7532216349018785, "pc2": -0.19813814775625677, "pc3": 3.0581665774536675, "label": 0, "prediction": 0, "kld": 0.0, "mse": 0.0, "frob": 0.0},
            {"id": "93_adv", "case_idx": 0, "model_name": "auto64_1", "type": "adversarial", "pc1": 4.348511479828073, "pc2": 0.1068211643920772, "pc3": 2.6833043391784464, "label": 0, "prediction": 0, "kld": 0.0200746059417725, "mse": 0.0056967865675687, "frob": 2.11335778236389},
            {"id": "138", "case_idx": 1, "model_name": "auto64_1", "type": "original", "pc1": 4.7532216349018785, "pc2": -0.19813814775625677, "pc3": 3.0581665774536675, "label": 0, "prediction": 0, "kld": 0.0, "mse": 0.0, "frob": 0.0},
            {"id": "138_adv", "case_idx": 1, "model_name": "auto64_1", "type": "adversarial", "pc1": 4.019374616213383, "pc2": -0.9692336053065028, "pc3": 2.242816109815959, "label": 0, "prediction": 0, "kld": 0.0677064657211304, "mse": 0.0128182275220752, "frob": 3.17009329795837}
        ];
    }
}

// Function to create pairs of original and adversarial examples
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

// Function to show information about a point on hover
function showPointInfo(svg, d, x, y) {
    // Remove any existing info
    svg.select('.point-info').remove();
    
    // Create info box
    const info = svg.append('g')
        .attr('class', 'point-info')
        .attr('transform', `translate(${x - 100}, ${y - 120})`);
    
    info.append('rect')
        .attr('width', 200)
        .attr('height', 100)
        .attr('fill', '#000')
        .attr('stroke', '#fff')
        .attr('stroke-width', 1)
        .attr('rx', 5)
        .attr('ry', 5);
    
    info.append('text')
        .attr('x', 10)
        .attr('y', 20)
        .attr('fill', '#fff')
        .text(`ID: ${d.id}`);
    
    info.append('text')
        .attr('x', 10)
        .attr('y', 40)
        .attr('fill', '#fff')
        .text(`Type: ${d.type}`);
    
    info.append('text')
        .attr('x', 10)
        .attr('y', 60)
        .attr('fill', '#fff')
        .text(`Label: ${d.label}, Pred: ${d.prediction}`);
    
    if (d.type === 'adversarial') {
        info.append('text')
            .attr('x', 10)
            .attr('y', 80)
            .attr('fill', '#fff')
            .text(`KLD: ${d.kld.toFixed(4)}, MSE: ${d.mse.toFixed(4)}`);
    }
}