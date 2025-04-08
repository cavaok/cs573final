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
    // This function will be expanded when you implement the actual visualization
    console.log('Initializing main PCA visualization');
    
    // Placeholder for visualization initialization code
    const visualizationContainer = document.getElementById('visualization-container');
    if (visualizationContainer) {
        visualizationContainer.innerHTML = '<p>PCA visualization will be displayed here</p>';
    }
}