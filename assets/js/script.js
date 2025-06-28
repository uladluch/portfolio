// Simple JavaScript for the coming soon page
document.addEventListener('DOMContentLoaded', function() {
    console.log('Portfolio coming soon page loaded');
    
    // Add a subtle animation to the title
    const title = document.querySelector('.title');
    if (title) {
        title.style.opacity = '0';
        title.style.transform = 'translateY(20px)';
        
        setTimeout(() => {
            title.style.transition = 'all 0.8s ease-out';
            title.style.opacity = '1';
            title.style.transform = 'translateY(0)';
        }, 300);
    }
    
    // Add animation to subtitle
    const subtitle = document.querySelector('.subtitle');
    if (subtitle) {
        subtitle.style.opacity = '0';
        subtitle.style.transform = 'translateY(20px)';
        
        setTimeout(() => {
            subtitle.style.transition = 'all 0.8s ease-out 0.2s';
            subtitle.style.opacity = '1';
            subtitle.style.transform = 'translateY(0)';
        }, 500);
    }
}); 