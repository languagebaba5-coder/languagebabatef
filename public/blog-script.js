// Blog Page JavaScript
class BlogManager {
    constructor() {
        this.posts = [];
        this.currentCategory = 'all';
        this.init();
    }

    async init() {
        await this.loadPosts();
        this.setupEventListeners();
        this.setupScrollAnimations();
    }

    setupEventListeners() {
        // Filter buttons
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const category = e.currentTarget.dataset.category;
                this.filterPosts(category);
                
                // Update active button
                document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                e.currentTarget.classList.add('active');
            });
        });
    }

    setupScrollAnimations() {
        const observer = new IntersectionObserver((entries) => {
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

    async loadPosts() {
        try {
            // Load posts from API
            const response = await fetch('/api/blog-posts?status=published');
            
            if (response.ok) {
                this.posts = await response.json();
            } else {
                console.error('Failed to load blog posts:', response.status);
                this.posts = [];
            }
        } catch (error) {
            console.error('Error loading blog posts:', error);
            this.posts = [];
        }
        
        this.renderPosts();
    }

    filterPosts(category) {
        this.currentCategory = category;
        this.renderPosts();
    }

    renderPosts() {
        const container = document.getElementById('blog-posts');
        const noPostsDiv = document.getElementById('no-posts');
        
        if (!container) {
            console.error('Blog posts container not found!');
            return;
        }
        
        let filteredPosts = this.posts;
        
        if (this.currentCategory !== 'all') {
            filteredPosts = this.posts.filter(post => post.category === this.currentCategory);
        }
        
        // Only show published posts
        filteredPosts = filteredPosts.filter(post => post.status === 'published');
        
        if (filteredPosts.length === 0) {
            container.innerHTML = '';
            noPostsDiv.style.display = 'block';
            return;
        }
        
        noPostsDiv.style.display = 'none';
        container.innerHTML = '';
        
        filteredPosts.forEach(post => {
            const postElement = this.createPostElement(post);
            container.appendChild(postElement);
        });
    }

    createPostElement(post) {
        const div = document.createElement('div');
        div.className = 'blog-post';
        
        const imageHtml = post.featuredImageUrl ? 
            `<img src="${post.featuredImageUrl}" alt="${post.title}" class="blog-post-image">` :
            `<div class="blog-post-image" style="background: linear-gradient(135deg, #667eea, #764ba2); display: flex; align-items: center; justify-content: center; color: white; font-size: 48px;"><i class="fas fa-blog"></i></div>`;
        
        const createdDate = post.createdAt ? new Date(post.createdAt).toLocaleDateString() : 'Unknown date';
        const author = post.createdBy ? post.createdBy.username : 'Admin';
        
        div.innerHTML = `
            ${imageHtml}
            <div class="blog-post-content">
                <div class="blog-post-meta">
                    <span class="blog-post-category">${this.getCategoryDisplayName(post.category)}</span>
                    <span class="blog-post-date">${createdDate}</span>
                    <span class="blog-post-author">by ${author}</span>
                </div>
                <h2>${post.title}</h2>
                <div class="blog-post-excerpt">${post.excerpt || this.truncateText(post.content, 150)}</div>
                <div class="blog-post-actions">
                    <button class="btn-read-more" onclick="blogManager.readPost('${post.id}')">
                        <i class="fas fa-book-open"></i>
                        Read More
                    </button>
                </div>
            </div>
        `;
        
        return div;
    }

    getCategoryDisplayName(category) {
        const categoryNames = {
            'tef-canada': 'TEF Canada',
            'french-learning': 'French Learning',
            'canada-immigration': 'Canada Immigration',
            'tips': 'Tips & Tricks'
        };
        return categoryNames[category] || category;
    }

    truncateText(text, maxLength) {
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    }

    readPost(postId) {
        const post = this.posts.find(p => p.id === postId);
        if (!post) return;
        
        this.showPostModal(post);
    }

    showPostModal(post) {
        const modal = document.createElement('div');
        modal.className = 'blog-modal active';
        
        const createdDate = post.createdAt ? new Date(post.createdAt).toLocaleDateString() : 'Unknown date';
        const author = post.createdBy ? post.createdBy.username : 'Admin';
        
        modal.innerHTML = `
            <div class="blog-modal-content">
                <div class="blog-modal-header">
                    <h2 class="blog-modal-title">${post.title}</h2>
                    <button class="blog-modal-close" onclick="this.parentElement.parentElement.parentElement.remove()">&times;</button>
                </div>
                <div class="blog-modal-body">
                    <div class="blog-modal-meta">
                        <span class="blog-post-category">${this.getCategoryDisplayName(post.category)}</span>
                        <span class="blog-post-date">${createdDate}</span>
                        <span class="blog-post-author">by ${author}</span>
                    </div>
                    <div class="blog-modal-content-text">
                        ${this.formatContent(post.content)}
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Close modal when clicking outside
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }

    formatContent(content) {
        // Simple content formatting
        return content
            .replace(/\n\n/g, '</p><p>')
            .replace(/\n/g, '<br>')
            .replace(/^/, '<p>')
            .replace(/$/, '</p>')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/### (.*?)$/gm, '<h3>$1</h3>')
            .replace(/## (.*?)$/gm, '<h2>$1</h2>')
            .replace(/# (.*?)$/gm, '<h1>$1</h1>');
    }
}

// Initialize blog manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.blogManager = new BlogManager();
});
