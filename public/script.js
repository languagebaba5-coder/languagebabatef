// Language Baba TEF Canada Landing Page JavaScript
// WhatsApp Integration and Interactive Features

// Configuration
const WHATSAPP_NUMBER = '917303619158';

// WhatsApp Messages for different contexts
const whatsappMessages = {
    general: "Hi Language Baba, I want more details about your small batch TEF Canada courses (5-8 students)",
    demo: "Hi Language Baba, I want to book the Demo Class for ₹800",
    sevenMonth: "Hi, I'm interested in the 7-Month small batch program for ₹77,000",
    tenMonth: "Hi, I want details about the 10-Month small batch program for ₹80,000",
    batchInfo: "Hi, I want to know more about your 5-8 students per batch policy"
};

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('Language Baba TEF Canada page loaded successfully');
    
    // Initialize all features
    initMobileNavigation();
    initContactForm();
    initSmoothScrolling();
    initWhatsAppTracking();
    initScrollAnimations();
    loadTestimonials(); // Load testimonials dynamically
    
    // Add loading complete class
    document.body.classList.add('loaded');

    // Section scroll animation
    initSectionFadeInAnimation();
    // Mouse movement animation
    initMouseMoveAnimation();
// Mouse movement animation for home page
function initMouseMoveAnimation() {
    const bg = document.getElementById('mouse-anim-bg');
    if (!bg) return;
    document.addEventListener('mousemove', function(e) {
        const dot = document.createElement('div');
        dot.className = 'mouse-anim-dot';
        dot.style.left = (e.clientX - 16) + 'px';
        dot.style.top = (e.clientY - 16) + 'px';
        bg.appendChild(dot);
        setTimeout(() => {
            dot.style.opacity = '0';
            dot.style.transform = 'scale(1.7)';
        }, 10);
        setTimeout(() => {
            if (dot.parentNode) dot.parentNode.removeChild(dot);
        }, 700);
    });
}

// Fade-in and slide-up animation for sections
function initSectionFadeInAnimation() {
    const observer = new window.IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.15 });
    document.querySelectorAll('.fade-in-up').forEach(section => {
        observer.observe(section);
    });
}
});

// WhatsApp Integration Functions
function openWhatsApp(messageType = 'general') {
    const message = whatsappMessages[messageType] || whatsappMessages.general;
    const encodedMessage = encodeURIComponent(message);
    const whatsappURL = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodedMessage}`;
    
    // Track the interaction
    console.log(`WhatsApp clicked: ${messageType}`);
    
    // Open WhatsApp
    window.open(whatsappURL, '_blank');
    
    // Optional: Add analytics tracking here
    if (typeof gtag !== 'undefined') {
        gtag('event', 'whatsapp_click', {
            'event_category': 'engagement',
            'event_label': messageType
        });
    }
}

// Mobile Navigation Toggle
function initMobileNavigation() {
    const navToggle = document.getElementById('navToggle');
    const navLinks = document.getElementById('navLinks');
    
    if (navToggle && navLinks) {
        navToggle.addEventListener('click', function() {
            navLinks.classList.toggle('active');
            
            // Animate hamburger icon
            if (navLinks.classList.contains('active')) {
                navToggle.innerHTML = '✕';
            } else {
                navToggle.innerHTML = '☰';
            }
        });
        
        // Close menu when clicking on links
        const links = navLinks.querySelectorAll('a');
        links.forEach(link => {
            link.addEventListener('click', () => {
                navLinks.classList.remove('active');
                navToggle.innerHTML = '☰';
            });
        });
        
        // Close menu when clicking outside
        document.addEventListener('click', function(event) {
            if (!navToggle.contains(event.target) && !navLinks.contains(event.target)) {
                navLinks.classList.remove('active');
                navToggle.innerHTML = '☰';
            }
        });
    }
}

// Contact Form Handler
function initContactForm() {
    const form = document.getElementById('contactForm');
    
    if (form) {
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            
            // Get form data
            const name = document.getElementById('name').value.trim();
            const phone = document.getElementById('phone').value.trim();
            const email = document.getElementById('email').value.trim();
            const program = document.getElementById('program').value;
            
            // Basic validation
            if (!name || !phone || !email || !program) {
                alert('Please fill in all required fields');
                return;
            }
            
            // Email validation
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                alert('Please enter a valid email address');
                return;
            }
            
            // Phone validation (basic)
            const phoneRegex = /^[+]?[0-9\s\-\(\)]{10,}$/;
            if (!phoneRegex.test(phone)) {
                alert('Please enter a valid phone number');
                return;
            }
            
            // Program names mapping
            const programNames = {
                demo: 'Demo Class (₹800)',
                '7month': '7-Month Small Batch Program (₹77,000)',
                '10month': '10-Month Elite Program (₹80,000)'
            };
            
            // Construct WhatsApp message
            const message = `New inquiry from languagebaba.live small batch landing page:\n\nName: ${name}\nPhone: ${phone}\nEmail: ${email}\nInterested in: ${programNames[program] || program}\n\nI want to join the small batch TEF Canada program with only 5-8 students per class. Please provide more details and next steps.`;
            
            const whatsappURL = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
            
            // Open WhatsApp
            window.open(whatsappURL, '_blank');
            
            // Show success message
            showSuccessMessage();
            
            // Reset form
            form.reset();
            
            // Track form submission
            console.log('Form submitted successfully');
        });
    }
}

// Show success message
function showSuccessMessage() {
    // Create success overlay
    const overlay = document.createElement('div');
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0,0,0,0.8);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
    `;
    
    const message = document.createElement('div');
    message.style.cssText = `
        background: white;
        padding: 40px;
        border-radius: 20px;
        text-align: center;
        max-width: 400px;
        margin: 20px;
    `;
    
    message.innerHTML = `
        <div style="font-size: 48px; color: #25D366; margin-bottom: 20px;">✅</div>
        <h3 style="margin-bottom: 15px; color: #333;">Success!</h3>
        <p style="margin-bottom: 20px; color: #666;">Opening WhatsApp with your details. We'll respond within minutes!</p>
        <button onclick="this.parentElement.parentElement.remove()" style="
            background: #25D366;
            color: white;
            border: none;
            padding: 10px 30px;
            border-radius: 25px;
            cursor: pointer;
            font-weight: 600;
        ">Close</button>
    `;
    
    overlay.appendChild(message);
    document.body.appendChild(overlay);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (overlay.parentElement) {
            overlay.remove();
        }
    }, 5000);
}

// FAQ Toggle Function
function toggleFAQ(button) {
    const faqItem = button.parentElement;
    const isActive = faqItem.classList.contains('active');
    const icon = button.querySelector('span');
    
    // Close all FAQ items
    document.querySelectorAll('.faq-item').forEach(item => {
        item.classList.remove('active');
        item.querySelector('.faq-question span').textContent = '+';
    });
    
    // Open clicked item if it wasn't active
    if (!isActive) {
        faqItem.classList.add('active');
        icon.textContent = '−';
    }
}

// Smooth Scrolling for anchor links
function initSmoothScrolling() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            const href = this.getAttribute('href');
            if (href.startsWith('#') && href.length > 1) {
                e.preventDefault();
                const target = document.querySelector(href);
                if (target) {
                    const headerHeight = document.querySelector('.header').offsetHeight;
                    const targetPosition = target.offsetTop - headerHeight - 20;
                    
                    window.scrollTo({
                        top: targetPosition,
                        behavior: 'smooth'
                    });
                }
            }
        });
    });
}

// WhatsApp Tracking and Analytics
function initWhatsAppTracking() {
    // Track WhatsApp float button clicks
    const whatsappFloat = document.querySelector('.whatsapp-float');
    if (whatsappFloat) {
        whatsappFloat.addEventListener('click', function() {
            console.log('WhatsApp float button clicked');
        });
    }
    
    // Track all WhatsApp buttons
    document.querySelectorAll('[onclick*="openWhatsApp"]').forEach(button => {
        button.addEventListener('click', function() {
            console.log('WhatsApp button clicked:', this.textContent.trim());
        });
    });
}

// Scroll Animations
function initScrollAnimations() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate-in');
            }
        });
    }, observerOptions);
    
    // Observe elements for animation
    document.querySelectorAll('.benefit-card, .price-card, .testimonial, .module-card').forEach(el => {
        observer.observe(el);
    });
}

// Load Testimonials
async function loadTestimonials() {
    try {
        const response = await fetch('/api/public/testimonials');
        if (response.ok) {
            const testimonials = await response.json();
            renderTestimonials(testimonials);
        } else {
            console.error('Failed to load testimonials:', response.status);
            showFallbackTestimonials();
        }
    } catch (error) {
        console.error('Error loading testimonials:', error);
        showFallbackTestimonials();
    }
}

function renderTestimonials(testimonials) {
    const container = document.getElementById('testimonials-container');
    if (!container) return;
    
    if (testimonials.length === 0) {
        showFallbackTestimonials();
        return;
    }
    
    container.innerHTML = '';
    
    testimonials.forEach(testimonial => {
        const testimonialElement = createTestimonialElement(testimonial);
        container.appendChild(testimonialElement);
    });
    
    // Re-initialize scroll animations for new elements
    initScrollAnimations();
}

function createTestimonialElement(testimonial) {
    const div = document.createElement('div');
    div.className = 'testimonial';
    
    // Get initials from name
    const initials = getInitials(testimonial.name);
    
    // Create LinkedIn connect link if URL is provided
    const linkedinLink = testimonial.linkedin ? 
        `<a href="${testimonial.linkedin}" target="_blank" rel="noopener noreferrer" class="linkedin-connect">
            <i class="fab fa-linkedin"></i> Connect
        </a>` : '';
    
    div.innerHTML = `
        <div class="testimonial-header">
            <div class="testimonial-avatar">${initials}</div>
            <div class="testimonial-info">
                <h4>${testimonial.name}</h4>
                <div class="testimonial-score">${testimonial.score}</div>
                <div class="batch-mention">${testimonial.batch}</div>
            </div>
        </div>
        <p>"${testimonial.content}"</p>
        ${linkedinLink ? `<div class="testimonial-actions">${linkedinLink}</div>` : ''}
    `;
    
    return div;
}

function getInitials(name) {
    return name.split(' ')
        .map(word => word.charAt(0).toUpperCase())
        .join('')
        .substring(0, 2);
}

function showFallbackTestimonials() {
    const container = document.getElementById('testimonials-container');
    if (!container) return;
    
    container.innerHTML = `
        <div class="testimonial">
            <div class="testimonial-header">
                <div class="testimonial-avatar">PS</div>
                <div class="testimonial-info">
                    <h4>Priya Sharma</h4>
                    <div class="testimonial-score">TEF 350+ | Mumbai</div>
                    <div class="batch-mention">6 students in batch</div>
                </div>
            </div>
            <p>"The small batch size made all the difference! With only 6 students in my group, I got personal attention and my French improved rapidly. Got my Canada PR approved!"</p>
        </div>
        <div class="testimonial">
            <div class="testimonial-header">
                <div class="testimonial-avatar">RP</div>
                <div class="testimonial-info">
                    <h4>Raj Patel</h4>
                    <div class="testimonial-score">TEF 330+ | Delhi</div>
                    <div class="batch-mention">7 students in batch</div>
                </div>
            </div>
            <p>"Language Baba's small batch approach is amazing. I was comfortable asking questions and practicing with just 7 other students. The teacher knew everyone's strengths and weaknesses."</p>
        </div>
        <div class="testimonial">
            <div class="testimonial-header">
                <div class="testimonial-avatar">MS</div>
                <div class="testimonial-info">
                    <h4>Meera Singh</h4>
                    <div class="testimonial-score">TEF 340+ | Bangalore</div>
                    <div class="batch-mention">8 students in batch</div>
                </div>
            </div>
            <p>"The 8-student batch was perfect. Not too small to be boring, not too large to lose focus. Every student got individual feedback and support. Living in Canada now!"</p>
        </div>
    `;
    
    // Re-initialize scroll animations
    initScrollAnimations();
}

// Export functions for global access
window.openWhatsApp = openWhatsApp;
window.toggleFAQ = toggleFAQ;
window.submitForm = function(event) {
    event.preventDefault();
    initContactForm();
};
