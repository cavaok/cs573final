document.addEventListener('DOMContentLoaded', function() {
    // Set up Supabase client (you'll add your credentials later)
    const supabaseUrl = 'https://fxwzblzdvwowourssdih.supabase.co';
    const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ4d3pibHpkdndvd291cnNzZGloIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzY0NjA1NTUsImV4cCI6MjA1MjAzNjU1NX0.Kcc9aJmOcgn6xF76aqfGUs6rO9awnabimX8HJnPhzrQY';
    // const supabase = supabaseClient.createClient(supabaseUrl, supabaseKey);


    // Tab navigation functionality
    const tabs = document.querySelectorAll('nav a');
    const pages = document.querySelectorAll('.page');
    
    tabs.forEach(tab => {
        tab.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Remove active class from all tabs and pages
            tabs.forEach(t => t.classList.remove('active'));
            pages.forEach(p => p.classList.remove('active'));
            
            // Add active class to clicked tab
            this.classList.add('active');
            
            // Show the corresponding page
            const pageName = this.getAttribute('data-page');
            document.getElementById(pageName).classList.add('active');
            
            // Load visualizations for the active page
            loadVisualizations(pageName);
        });
    });
    
    // Function to load visualizations based on the active page
    function loadVisualizations(pageName) {
        switch(pageName) {
            case 'info':
                initInfoVisualizations();
                break;
            
            case 'analytics':
                initAnalyticsVisualizations();
                break;
            
            case 'exploration':
                initExplorationVisualizations();
                break;
            
            default:
                // Homepage doesn't need visualizations
                break;
        }
    }
    
    // Initial load - show home page visualizations
    loadVisualizations('home');
});