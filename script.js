// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('MindContent Demo page loaded successfully!');
    
    // Get button and message container elements
    const demoButton = document.getElementById('demo-button');
    const messageContainer = document.getElementById('message-container');
    
    // Add click event listener to the button
    demoButton.addEventListener('click', function() {
        // Toggle message display
        if (messageContainer.classList.contains('show')) {
            messageContainer.classList.remove('show');
            messageContainer.textContent = '';
        } else {
            messageContainer.classList.add('show');
            messageContainer.textContent = 'Hello! This is a demo of the MindContent SDK. The button click event was handled by script.js!';
        }
    });
    
    // Log to console for debugging
    console.log('Event listeners initialized');
});
