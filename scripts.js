document.addEventListener('DOMContentLoaded', function() {
    // Check if we're on the main page or info page
    const isMainPage = !window.location.href.includes('info.html');
    
    if (isMainPage) {
        // Main page - Initialize visualization
        
        // Make sure the DOM is fully loaded and Three.js/OrbitControls are available
        if (typeof THREE !== 'undefined' && typeof OrbitControls !== 'undefined') {
            initVisualization();
        } else {
            console.error('Three.js or OrbitControls not loaded properly');
        }
    }
});