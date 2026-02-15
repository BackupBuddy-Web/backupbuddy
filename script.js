// Smooth scrolling for navigation links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// Form submission handling
const form = document.getElementById('waitlistForm');
if (form) {
    form.addEventListener('submit', function(e) {
        // Let Formspree handle the submission
        // You can add custom success/error handling here if needed
    });
}

// Add scroll effect to navigation
window.addEventListener('scroll', function() {
    const nav = document.querySelector('.nav');
    if (window.scrollY > 50) {
        nav.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)';
    } else {
        nav.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
    }
});