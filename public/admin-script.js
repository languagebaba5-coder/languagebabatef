// Admin Panel JavaScript
class AdminPanel {
    constructor() {
        this.currentSection = 'dashboard';
        this.currentTab = 'hero';
        this.data = this.loadData();
        this.blogPosts = []; // Store blog posts for filtering
        this.currentBlogFilter = 'all'; // Current filter status
        this.currentEditingBenefit = null; // Current benefit being edited
        this.currentEditingTestimonial = null; // Current testimonial being edited
        this.currentEditingFAQ = null; // Current FAQ being edited
        this.currentEditingPricing = null; // Current pricing plan being edited
        
        // Auto-logout configuration
        this.autoLogoutTimeout = 30 * 60 * 1000; // 30 minutes in milliseconds
        this.logoutWarningTime = 5 * 60 * 1000; // 5 minutes warning before logout
        this.logoutTimer = null;
        this.logoutWarningTimer = null;
        this.lastActivity = Date.now();
        
        // Device authorization
        this.deviceFingerprint = this.generateDeviceFingerprint();
        this.isDeviceAuthorized = false;
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadDashboard();
        this.loadContent();
        this.loadPricing();
        this.loadBlog();
        this.loadSEO();
        this.updateCharCounts();
        this.initializeActivityLogs();
        // Don't initialize auto-logout here - wait for successful login
    }

    setupEventListeners() {
        // Sidebar navigation
        document.querySelectorAll('.menu-item').forEach(item => {
            item.addEventListener('click', async (e) => {
                const section = e.currentTarget.dataset.section;
                await this.showSection(section);
            });
        });

        // Sidebar toggle
        const sidebarToggle = document.querySelector('.sidebar-toggle');
        if (sidebarToggle) {
            sidebarToggle.addEventListener('click', () => {
                document.querySelector('.sidebar').classList.toggle('active');
            });
        }

        // Content tabs
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const tab = e.currentTarget.dataset.tab;
                console.log('Tab clicked:', tab); // Debug log
                this.showTab(tab);
            });
        });

        // Form submissions
        this.setupFormHandlers();

        // Character count updates
        this.setupCharCountUpdates();
        
        // LinkedIn URL auto-formatting
        this.setupLinkedInAutoFormat();
        
        // Activity tracking for auto-logout
        this.setupActivityTracking();
    }

    // Device Management Methods
    async loadDevices() {
        try {
            const response = await this.requestMiddleware('/api/admin/devices');
            if (response && response.ok) {
                const devices = await response.json();
                this.renderDevices(devices);
            } else {
                const error = await response.json().catch(() => ({ error: 'Unknown error' }));
                console.error('Failed to load devices:', error);
                this.showNotification(error.error || 'Failed to load devices', 'error');
            }
        } catch (error) {
            console.error('Error loading devices:', error);
            this.showNotification('Network error while loading devices', 'error');
        }
    }

    renderDevices(devices) {
        const tbody = document.getElementById('device-list-tbody');
        if (!tbody) return;

        tbody.innerHTML = devices.map(device => `
            <tr>
                <td>${device.deviceName || 'Unnamed Device'}</td>
                <td><code>${device.deviceFingerprint.substring(0, 20)}...</code></td>
                <td>${device.ipAddress || 'Any IP'}</td>
                <td>${device.lastAccess ? this.getTimeAgo(device.lastAccess) : 'Never'}</td>
                <td>${device.authorizedBy ? device.authorizedBy.username : 'Unknown'}</td>
                <td><span class="status-badge ${device.isActive ? 'active' : 'inactive'}">${device.isActive ? 'Active' : 'Inactive'}</span></td>
                <td>
                    <div class="action-buttons">
                        <button class="action-btn delete" onclick="revokeDevice('${device.id}')" title="Revoke Authorization">
                            <i class="fas fa-ban"></i> Revoke
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    async authorizeDevice(formData) {
        try {
            const response = await this.requestMiddleware('/api/admin/devices', {
                method: 'POST',
                body: JSON.stringify(formData)
            });

            if (response && response.ok) {
                this.showNotification('Device authorized successfully!', 'success');
                document.getElementById('add-device-form').reset();
                await this.loadDevices();
            } else {
                const error = await response.json();
                this.showNotification(error.error || 'Failed to authorize device', 'error');
            }
        } catch (error) {
            console.error('Error authorizing device:', error);
            this.showNotification('Failed to authorize device', 'error');
        }
    }

    async revokeDevice(deviceId) {
        if (!confirm('Are you sure you want to revoke authorization for this device?')) {
            return;
        }

        try {
            const response = await this.requestMiddleware(`/api/admin/devices/${deviceId}`, {
                method: 'DELETE'
            });

            if (response && response.ok) {
                this.showNotification('Device authorization revoked successfully!', 'success');
                await this.loadDevices();
            } else {
                const error = await response.json();
                this.showNotification(error.error || 'Failed to revoke device authorization', 'error');
            }
        } catch (error) {
            console.error('Error revoking device:', error);
            this.showNotification('Failed to revoke device authorization', 'error');
        }
    }

    async showSection(section) {
        // Check authentication first
        if (!await this.checkAuth()) {
            return;
        }
        
        // Update active menu item
        document.querySelectorAll('.menu-item').forEach(item => {
            item.classList.remove('active');
        });
        document.querySelector(`[data-section="${section}"]`).classList.add('active');

        // Update active content section
        document.querySelectorAll('.content-section').forEach(sec => {
            sec.classList.remove('active');
        });
        document.getElementById(section).classList.add('active');

        // Update page title
        const titles = {
            dashboard: 'Dashboard',
            content: 'Content Management',
            pricing: 'Pricing Section',
            blog: 'Blog Management',
            seo: 'SEO Management',
            settings: 'Settings',
            'admin-management': 'Admin Management',
            'device-management': 'Device Management'
        };
        document.getElementById('page-title').textContent = titles[section];

        this.currentSection = section;

        // Load section-specific data
        if (section === 'dashboard') {
            this.loadDashboard();
        } else if (section === 'content') {
            this.loadContent();
        } else if (section === 'pricing') {
            this.loadPricing();
        } else if (section === 'blog') {
            this.loadBlog();
        } else if (section === 'seo') {
            this.loadSEO();
        } else if (section === 'admin-management') {
            this.loadAdminUsers();
            // Show users tab by default
            this.showAdminTab('users');
        }
    }

    showAdminTab(tab) {
        // Hide all admin tab contents
        document.querySelectorAll('.admin-tab-content').forEach(content => {
            content.classList.remove('active');
        });

        // Show selected tab content
        const selectedTab = document.getElementById(`admin-${tab}-tab`);
        if (selectedTab) {
            selectedTab.classList.add('active');
        }

        // Update active tab button
        document.querySelectorAll('.admin-tabs .tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[onclick="showAdminTab('${tab}')"]`).classList.add('active');

        // Load tab-specific data
        if (tab === 'devices') {
            this.loadDevices();
        }
    }

    showTab(tab) {
        console.log('showTab called with:', tab); // Debug log
        
        // Update active tab button
        const activeSection = document.querySelector('.content-section.active');
        console.log('Active section:', activeSection); // Debug log
        
        if (activeSection) {
            const tabContainer = activeSection.querySelector('.content-tabs, .seo-tabs');
            console.log('Tab container:', tabContainer); // Debug log
            
            if (tabContainer) {
                tabContainer.querySelectorAll('.tab-btn').forEach(btn => {
                    btn.classList.remove('active');
                });
                const targetBtn = tabContainer.querySelector(`[data-tab="${tab}"]`);
                console.log('Target button:', targetBtn); // Debug log
                
                if (targetBtn) {
                    targetBtn.classList.add('active');
                }
            }

            // Update active tab content
            activeSection.querySelectorAll('.tab-content').forEach(content => {
                content.classList.remove('active');
            });
            const targetContent = activeSection.querySelector(`#${tab}`);
            console.log('Target content:', targetContent); // Debug log
            
            if (targetContent) {
                targetContent.classList.add('active');
            }
        }

        this.currentTab = tab;
        
        // Load data when switching to specific tabs
        if (tab === 'testimonials') {
            this.loadTestimonials();
        } else if (tab === 'benefits') {
            this.loadBenefits();
        } else if (tab === 'faq') {
            this.loadFAQ();
        }
    }

    setupFormHandlers() {
        // Hero section form
        const heroForm = document.querySelector('#hero .content-form');
        if (heroForm) {
            heroForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.saveHeroContent();
            });
        }

        // SEO forms
        const seoForm = document.querySelector('.seo-form');
        if (seoForm) {
            seoForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.saveSEO();
            });
        }

        // Settings forms
        const settingsForm = document.querySelector('.settings-form');
        if (settingsForm) {
            settingsForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.saveSettings();
            });
        }

        // Blog editor form
        const blogForm = document.getElementById('blog-editor-form');
        if (blogForm) {
            blogForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.saveBlogPost();
            });
        }

        // Blog filter dropdown
        const blogFilter = document.getElementById('blog-filter');
        if (blogFilter) {
            blogFilter.addEventListener('change', (e) => {
                this.filterBlogPosts(e.target.value);
            });
        }
    }

    setupCharCountUpdates() {
        // Title character count
        const titleInput = document.getElementById('home-title');
        if (titleInput) {
            titleInput.addEventListener('input', () => {
                this.updateCharCount(titleInput, 60);
            });
        }

        // Description character count
        const descInput = document.getElementById('home-description');
        if (descInput) {
            descInput.addEventListener('input', () => {
                this.updateCharCount(descInput, 160);
            });
        }
    }

    updateCharCount(input, maxLength) {
        const count = input.value.length;
        const charCount = input.parentElement.querySelector('.char-count');
        if (charCount) {
            charCount.textContent = `${count}/${maxLength} characters`;
            charCount.style.color = count > maxLength ? '#e74c3c' : '#666';
        }
    }

    updateCharCounts() {
        const titleInput = document.getElementById('home-title');
        const descInput = document.getElementById('home-description');
        
        if (titleInput) this.updateCharCount(titleInput, 60);
        if (descInput) this.updateCharCount(descInput, 160);
    }

    setupLinkedInAutoFormat() {
        // Add event listeners to LinkedIn input fields
        const linkedinInputs = [
            'add-testimonial-linkedin',
            'edit-testimonial-linkedin'
        ];

        linkedinInputs.forEach(inputId => {
            const input = document.getElementById(inputId);
            if (input) {
                input.addEventListener('blur', () => {
                    this.formatLinkedInUrl(input);
                });
            }
        });
    }

    formatLinkedInUrl(input) {
        let url = input.value.trim();
        
        if (!url) return;
        
        // If it starts with www.linkedin.com but doesn't have https://, add it
        if (url.startsWith('www.linkedin.com') && !url.startsWith('https://')) {
            url = 'https://' + url;
            input.value = url;
        }
        // If it starts with linkedin.com but doesn't have https://, add it
        else if (url.startsWith('linkedin.com') && !url.startsWith('https://')) {
            url = 'https://' + url;
            input.value = url;
        }
    }

    // Data Management
    loadData() {
        const defaultData = {
            hero: {
                title: "Master French for Canada PR with TEF Canada Success",
                subtitle: "Only 5-8 Students Per Class!",
                description: "Get personalized attention and achieve your Canadian dreams with our exclusive small batch TEF Canada preparation program",
                successRate: "95%",
                studentsCount: "1000+"
            },
            benefits: [
                {
                    id: 1,
                    icon: "👥",
                    title: "Personal Attention",
                    description: "With only 5-8 students, every individual gets focused attention from expert instructors. No student is left behind."
                },
                {
                    id: 2,
                    icon: "🗣️",
                    title: "Interactive Learning",
                    description: "Small groups enable active participation, discussions, and comfortable speaking practice for better French fluency."
                },
                {
                    id: 3,
                    icon: "⚡",
                    title: "Faster Progress",
                    description: "Customized pace based on group needs ensures rapid improvement and efficient TEF Canada preparation."
                },
                {
                    id: 4,
                    icon: "💪",
                    title: "Confidence Building",
                    description: "Comfortable environment to practice speaking and ask questions without hesitation or embarrassment."
                },
                {
                    id: 5,
                    icon: "🏆",
                    title: "Proven Results",
                    description: "95% of our small batch students achieve their target TEF Canada scores for successful Canada PR applications."
                },
                {
                    id: 6,
                    icon: "👨‍🏫",
                    title: "Expert Instructors",
                    description: "Certified French teachers with specialized TEF Canada training and years of successful student outcomes."
                }
            ],
            testimonials: [
                {
                    id: 1,
                    name: "Priya Sharma",
                    initials: "PS",
                    score: "TEF 350+ | Mumbai",
                    batch: "6 students in batch",
                    content: "The small batch size made all the difference! With only 6 students in my group, I got personal attention and my French improved rapidly. Got my Canada PR approved!"
                },
                {
                    id: 2,
                    name: "Raj Patel",
                    initials: "RP",
                    score: "TEF 330+ | Delhi",
                    batch: "7 students in batch",
                    content: "Language Baba's small batch approach is amazing. I was comfortable asking questions and practicing with just 7 other students. The teacher knew everyone's strengths and weaknesses."
                },
                {
                    id: 3,
                    name: "Meera Singh",
                    initials: "MS",
                    score: "TEF 340+ | Bangalore",
                    batch: "8 students in batch",
                    content: "The 8-student batch was perfect. Not too small to be boring, not too large to lose focus. Every student got individual feedback and support. Living in Canada now!"
                }
            ],
            faq: [
                {
                    id: 1,
                    question: "Why do you limit classes to only 5-8 students?",
                    answer: "Small batch sizes ensure every student receives personalized attention, immediate feedback, and focused support. This leads to faster learning, better TEF Canada scores, and higher success rates compared to large classes of 20-30 students."
                },
                {
                    id: 2,
                    question: "What is TEF Canada and why is it important?",
                    answer: "TEF Canada is a French proficiency test accepted by Immigration, Refugees and Citizenship Canada (IRCC) for immigration purposes. It can significantly boost your CRS score for Express Entry and help you achieve your Canadian permanent residency faster."
                },
                {
                    id: 3,
                    question: "Which program should I choose - 7 months or 10 months?",
                    answer: "The 7-month program is ideal if you have some basic French knowledge. The 10-month program is perfect for complete beginners or those who want more comprehensive preparation with individual coaching sessions in our small batch environment."
                },
                {
                    id: 4,
                    question: "What is your success rate with small batches?",
                    answer: "95% of our students achieve their target TEF Canada scores. Our small batch approach with just 5-8 students per class ensures personalized attention, immediate doubt resolution, and proven results for Canadian immigration success."
                },
                {
                    id: 5,
                    question: "What is included in the course materials?",
                    answer: "Both programs include comprehensive study materials, practice tests, audio recordings, grammar guides, vocabulary lists, and access to online resources specifically designed for TEF Canada preparation. All materials are FREE with enrollment."
                }
            ],
            pricing: [
                {
                    id: "1",
                    title: "Demo Class",
                    price: "₹800",
                    badge: "5-8 Students Only",
                    features: [
                        "Experience small batch teaching",
                        "Meet our expert instructors",
                        "Understand TEF format",
                        "Ask unlimited questions",
                        "No commitment required"
                    ],
                    buttonText: "Book Demo via WhatsApp",
                    buttonType: "general",
                    buttonUrl: null,
                    isPopular: false
                },
                {
                    id: "2",
                    title: "7-Month Program",
                    price: "₹77,000",
                    badge: "Only 5-8 Students",
                    features: [
                        "Exclusive 5-8 student batches",
                        "Complete TEF Canada preparation",
                        "Personal attention guaranteed",
                        "FREE course materials",
                        "Mock tests and evaluations",
                        "WhatsApp support group"
                    ],
                    buttonText: "Join 7-Month Program",
                    buttonType: "primary",
                    buttonUrl: null,
                    isPopular: true
                },
                {
                    id: "3",
                    title: "10-Month Elite Program",
                    price: "₹80,000",
                    badge: "Maximum 8 Students",
                    features: [
                        "Premium small batch experience",
                        "Extended preparation time",
                        "Individual coaching sessions",
                        "FREE comprehensive materials",
                        "Unlimited practice tests",
                        "Personal mentor support",
                        "Success guarantee"
                    ],
                    buttonText: "Join 10-Month Program",
                    buttonType: "secondary",
                    buttonUrl: null,
                    isPopular: false
                }
            ],
            blog: [],
            seo: {
                home: {
                    title: "Language Baba - TEF Canada Small Batch Excellence | Only 5-8 Students Per Class",
                    description: "Master TEF Canada with Language Baba's exclusive small batch classes. Only 5-8 students per batch for personalized attention. 95% success rate, expert instructors.",
                    keywords: "TEF Canada, French learning, small batch, Canada PR, French classes"
                },
                meta: {
                    ogTitle: "",
                    ogDescription: "",
                    ogImage: "",
                    twitterCard: "summary"
                }
            },
            settings: {
                siteName: "Language Baba",
                whatsappNumber: "917303619158",
                contactEmail: "languagebaba5@gmail.com"
            }
        };

        const savedData = localStorage.getItem('languageBabaAdminData');
        return savedData ? { ...defaultData, ...JSON.parse(savedData) } : defaultData;
    }

    saveData() {
        localStorage.setItem('languageBabaAdminData', JSON.stringify(this.data));
        this.showMessage('Data saved successfully!', 'success');
    }

    // Dashboard
    async loadDashboard() {
        if (!await this.checkAuth()) return;
        
        this.loadingMiddleware(true);
        
        try {
            // Load dashboard stats
            const statsResponse = await this.requestMiddleware('/api/dashboard/stats');
            if (statsResponse && statsResponse.ok) {
                const stats = await statsResponse.json();
                this.updateDashboardStats(stats);
            }
            
            // Load recent activity logs from database
            await this.loadRecentActivity();
            
        } catch (error) {
            this.errorMiddleware(error, 'loadDashboard');
        } finally {
            this.loadingMiddleware(false);
        }
    }

    async loadRecentActivity() {
        // Initialize pagination state
        this.activityPagination = {
            currentPage: 0,
            pageSize: 3,
            hasMore: true,
            loading: false
        };
        
        // Clear existing activities
        const container = document.getElementById('activity-list');
        if (container) {
            container.innerHTML = '';
        }
        
        // Hide all indicators
        this.showActivityLoading(false);
        this.showActivityEnd(false);
        this.showLoadMoreButton(false);
        
        // Load first page
        await this.loadMoreActivities();
        
        // Set up scroll listener after a short delay to ensure DOM is ready
        setTimeout(() => {
            this.setupActivityScrollListener();
        }, 100);
    }

    async loadMoreActivities() {
        if (this.activityPagination.loading || !this.activityPagination.hasMore) {
            return;
        }

        this.activityPagination.loading = true;
        this.showActivityLoading(true);

        try {
            const offset = this.activityPagination.currentPage * this.activityPagination.pageSize;
            const response = await this.requestMiddleware(`/api/activity-logs?limit=${this.activityPagination.pageSize}&offset=${offset}`);
            
            if (response && response.ok) {
                const activities = await response.json();
                
                if (activities.length === 0) {
                    this.activityPagination.hasMore = false;
                    this.showActivityEnd(true);
                    this.showLoadMoreButton(false);
                } else {
                    this.appendActivityLogs(activities);
                    this.activityPagination.currentPage++;
                    
                    // If we got fewer activities than requested, we've reached the end
                    if (activities.length < this.activityPagination.pageSize) {
                        this.activityPagination.hasMore = false;
                        this.showActivityEnd(true);
                        this.showLoadMoreButton(false);
                    } else {
                        // Show load more button if there might be more activities
                        this.showLoadMoreButton(true);
                    }
                }
            } else {
                console.error('Failed to load activities:', response?.status);
                // Fallback to local data when API fails
                this.loadLocalActivities();
            }
        } catch (error) {
            console.error('Failed to load recent activity:', error);
            // Fallback to local data when API fails
            this.loadLocalActivities();
        } finally {
            this.activityPagination.loading = false;
            this.showActivityLoading(false);
        }
    }

    loadLocalActivities() {
        // Load activities from local storage as fallback
        if (!this.data.activityLogs || this.data.activityLogs.length === 0) {
            const container = document.getElementById('activity-list');
            if (container) {
                container.innerHTML = '<div class="no-activities">No recent activity</div>';
            }
            return;
        }

        // Get activities for current page
        const offset = this.activityPagination.currentPage * this.activityPagination.pageSize;
        const activities = this.data.activityLogs.slice(offset, offset + this.activityPagination.pageSize);
        
        if (activities.length === 0) {
            this.activityPagination.hasMore = false;
            this.showActivityEnd(true);
            this.showLoadMoreButton(false);
        } else {
            this.appendActivityLogs(activities);
            this.activityPagination.currentPage++;
            
            // Check if there are more activities
            const remainingActivities = this.data.activityLogs.length - (offset + activities.length);
            if (remainingActivities <= 0) {
                this.activityPagination.hasMore = false;
                this.showActivityEnd(true);
                this.showLoadMoreButton(false);
            } else {
                this.showLoadMoreButton(true);
            }
        }
    }

    setupActivityScrollListener() {
        const activityList = document.getElementById('activity-list');
        if (!activityList) {
            console.error('Activity list element not found');
            return;
        }
        
        // Check if content is scrollable
        const isScrollable = activityList.scrollHeight > activityList.clientHeight;
        
        activityList.addEventListener('scroll', () => {
            const { scrollTop, scrollHeight, clientHeight } = activityList;
            const scrollPercentage = (scrollTop + clientHeight) / scrollHeight;
            
            // Load more when user scrolls to 80% of the content
            if (scrollPercentage > 0.8 && this.activityPagination.hasMore && !this.activityPagination.loading) {
                this.loadMoreActivities();
            }
        });
        
        // If content is not scrollable but we have more data, show load more button
        if (!isScrollable && this.activityPagination.hasMore) {
            this.showLoadMoreButton(true);
        }
    }

    showActivityLoading(show) {
        const loadingElement = document.getElementById('activity-loading');
        if (loadingElement) {
            loadingElement.style.display = show ? 'flex' : 'none';
        }
    }

    showActivityEnd(show) {
        const endElement = document.getElementById('activity-end');
        if (endElement) {
            endElement.style.display = show ? 'block' : 'none';
        }
    }

    showLoadMoreButton(show) {
        const loadMoreElement = document.getElementById('activity-load-more');
        if (loadMoreElement) {
            loadMoreElement.style.display = show ? 'block' : 'none';
        }
    }

    appendActivityLogs(activities) {
        const container = document.getElementById('activity-list');
        if (!container) return;

        activities.forEach((activity, index) => {
            const activityItem = document.createElement('div');
            activityItem.className = 'activity-item';
            activityItem.style.animationDelay = `${index * 0.1}s`;
            
            const icon = this.getActivityIcon(activity.activityType || activity.type, activity.severity);
            const timeAgo = this.getTimeAgo(activity.createdAt || activity.timestamp);
            
            // Determine display name based on user info
            let displayName = 'System';
            if (activity.user) {
                // Use role-based display names for better clarity
                if (activity.user.role === 'superuser') {
                    displayName = 'Super Admin';
                } else if (activity.user.role === 'admin') {
                    displayName = 'Admin';
                } else if (activity.user.role === 'editor') {
                    displayName = 'Editor';
                } else if (activity.user.role === 'viewer') {
                    displayName = 'Viewer';
                } else {
                    // Fallback to fullName or username
                    displayName = activity.user.fullName || activity.user.username;
                }
            }
            
            activityItem.innerHTML = `
                <i class="${icon}"></i>
                <div class="activity-content">
                    <p>${activity.action} ${activity.user ? `by ${displayName}` : ''}</p>
                    <span>${timeAgo}</span>
                    ${activity.description ? `<small>${activity.description}</small>` : ''}
                </div>
            `;
            
            container.appendChild(activityItem);
        });
    }

    async refreshActivities() {
        // Reset pagination state
        this.activityPagination = {
            currentPage: 0,
            pageSize: 3,
            hasMore: true,
            loading: false
        };
        
        // Clear existing activities
        const container = document.getElementById('activity-list');
        if (container) {
            container.innerHTML = '';
        }
        
        // Hide all indicators
        this.showActivityEnd(false);
        this.showLoadMoreButton(false);
        this.showActivityLoading(false);
        
        // Load first page
        await this.loadMoreActivities();
        
        // Re-setup scroll listener
        setTimeout(() => {
            this.setupActivityScrollListener();
        }, 100);
    }

    updateDashboardStats(stats) {
        // Update stats display
        if (stats.totalBlogPosts !== undefined) {
            document.getElementById('blog-count').textContent = stats.totalBlogPosts;
        }
        if (stats.totalUsers !== undefined) {
            document.getElementById('user-count').textContent = stats.totalUsers;
        }
        if (stats.totalBenefits !== undefined) {
            document.getElementById('content-count').textContent = stats.totalBenefits;
        }
        if (stats.totalPricingPlans !== undefined) {
            document.getElementById('pricing-count').textContent = stats.totalPricingPlans;
        }
    }

    // Content Management
    async loadContent() {
        this.loadHeroContent();
        this.loadBenefits();
        await this.loadTestimonials();
        this.loadFAQ();
    }

    loadHeroContent() {
        const hero = this.data.hero;
        document.getElementById('hero-title').value = hero.title;
        document.getElementById('hero-subtitle').value = hero.subtitle;
        document.getElementById('hero-description').value = hero.description;
        document.getElementById('success-rate').value = hero.successRate;
        document.getElementById('students-count').value = hero.studentsCount;
    }

    saveHeroContent() {
        this.data.hero = {
            title: document.getElementById('hero-title').value,
            subtitle: document.getElementById('hero-subtitle').value,
            description: document.getElementById('hero-description').value,
            successRate: document.getElementById('success-rate').value,
            studentsCount: document.getElementById('students-count').value
        };
        this.logActivity('content', 'Hero section updated', 'success', 'Main title, subtitle, and stats modified');
        this.saveData();
        this.updateMainWebsite();
    }

    loadBenefits() {
        const container = document.getElementById('benefits-list');
        container.innerHTML = '';
        
        this.data.benefits.forEach(benefit => {
            const item = this.createBenefitItem(benefit);
            container.appendChild(item);
        });
    }

    createBenefitItem(benefit) {
        const div = document.createElement('div');
        div.className = 'content-item';
        div.innerHTML = `
            <div class="content-item-header">
                <div class="content-item-title">${benefit.icon} ${benefit.title}</div>
                <div class="content-item-actions">
                    <button class="btn btn-small btn-secondary" onclick="adminPanel.editBenefit(${benefit.id})">Edit</button>
                    <button class="btn btn-small btn-danger" onclick="adminPanel.deleteBenefit(${benefit.id})">Delete</button>
                </div>
            </div>
            <div class="content-item-content">${benefit.description}</div>
        `;
        return div;
    }

    addBenefit() {
        const icon = prompt('Enter emoji icon:');
        const title = prompt('Enter benefit title:');
        const description = prompt('Enter benefit description:');
        
        if (icon && title && description) {
            const newBenefit = {
                id: Date.now(),
                icon,
                title,
                description
            };
            this.data.benefits.push(newBenefit);
            this.logActivity('content', 'Benefit added', 'success', `"${title}" benefit created`);
            this.saveData();
            this.loadBenefits();
            this.updateMainWebsite();
        }
    }

    editBenefit(id) {
        const benefit = this.data.benefits.find(b => b.id === id);
        if (benefit) {
            this.currentEditingBenefit = benefit;
            this.showEditBenefitModal(benefit);
        }
    }

    showEditBenefitModal(benefit) {
        const modal = document.getElementById('edit-benefit-modal');
        const form = document.getElementById('edit-benefit-form');
        
        // Populate form with existing data
        document.getElementById('edit-benefit-icon').value = benefit.icon || '';
        document.getElementById('edit-benefit-title').value = benefit.title || '';
        document.getElementById('edit-benefit-description').value = benefit.description || '';
        
        // Show modal
        modal.classList.add('active');
        
        // Setup form submission
        form.onsubmit = (e) => {
            e.preventDefault();
            this.saveBenefitEdit();
        };
    }

    saveBenefitEdit() {
        const benefit = this.currentEditingBenefit;
        if (!benefit) return;
        
        const icon = document.getElementById('edit-benefit-icon').value;
        const title = document.getElementById('edit-benefit-title').value;
        const description = document.getElementById('edit-benefit-description').value;
        
        if (icon && title && description) {
            const oldTitle = benefit.title;
            benefit.icon = icon;
            benefit.title = title;
            benefit.description = description;
            this.logActivity('content', 'Benefit edited', 'info', `"${oldTitle}" updated to "${title}"`);
            this.saveData();
            this.loadBenefits();
            this.updateMainWebsite();
            this.closeEditBenefitModal();
            this.showNotification(`Benefit "${oldTitle}" updated successfully!`, 'success');
        }
    }

    closeEditBenefitModal() {
        const modal = document.getElementById('edit-benefit-modal');
        modal.classList.remove('active');
        this.currentEditingBenefit = null;
    }

    deleteBenefit(id) {
        if (confirm('Are you sure you want to delete this benefit?')) {
            const benefit = this.data.benefits.find(b => b.id === id);
            this.data.benefits = this.data.benefits.filter(b => b.id !== id);
            this.logActivity('content', 'Benefit deleted', 'warning', `"${benefit ? benefit.title : 'Unknown'}" benefit removed`);
            this.saveData();
            this.loadBenefits();
            this.updateMainWebsite();
        }
    }

    async loadTestimonials() {
        try {
            const response = await this.requestMiddleware('/api/testimonials');
            if (response && response.ok) {
                const testimonials = await response.json();
                this.data.testimonials = testimonials;
                this.saveData();
            }
        } catch (error) {
            console.error('Error loading testimonials:', error);
        }
        
        const container = document.getElementById('testimonials-list');
        container.innerHTML = '';
        
        this.data.testimonials.forEach(testimonial => {
            const item = this.createTestimonialItem(testimonial);
            container.appendChild(item);
        });
    }

    createTestimonialItem(testimonial) {
        console.log('Creating testimonial item for:', testimonial);
        const div = document.createElement('div');
        div.className = 'content-item';
        
        // Create LinkedIn link if URL is provided
        const linkedinLink = testimonial.linkedin ? 
            `<a href="${testimonial.linkedin}" target="_blank" rel="noopener noreferrer" class="linkedin-connect">
                <i class="fab fa-linkedin"></i> Connect
            </a>` : '';
        
        div.innerHTML = `
            <div class="content-item-header">
                <div class="content-item-title">${testimonial.name} - ${testimonial.score}</div>
                <div class="content-item-actions">
                    <button class="btn btn-small btn-secondary" onclick="adminPanel.editTestimonial('${testimonial.id}')">Edit</button>
                    <button class="btn btn-small btn-danger" onclick="adminPanel.deleteTestimonial('${testimonial.id}')">Delete</button>
                </div>
            </div>
            <div class="content-item-content">${testimonial.content}</div>
            <div class="testimonial-meta">
                <span>Batch: ${testimonial.batch}</span>
                ${linkedinLink}
            </div>
        `;
        return div;
    }

    addTestimonial() {
        this.showAddTestimonialModal();
    }

    showAddTestimonialModal() {
        const modal = document.getElementById('add-testimonial-modal');
        const form = document.getElementById('add-testimonial-form');
        
        // Clear form
        form.reset();
        
        // Show modal
        modal.classList.add('active');
        
        // Setup LinkedIn auto-format for this modal
        const linkedinInput = document.getElementById('add-testimonial-linkedin');
        if (linkedinInput) {
            linkedinInput.addEventListener('blur', () => {
                this.formatLinkedInUrl(linkedinInput);
            });
        }
        
        // Setup form submission
        form.onsubmit = (e) => {
            e.preventDefault();
            this.saveNewTestimonial();
        };
    }

    async saveNewTestimonial() {
        const name = document.getElementById('add-testimonial-name').value;
        const initials = document.getElementById('add-testimonial-initials').value;
        const score = document.getElementById('add-testimonial-score').value;
        const batch = document.getElementById('add-testimonial-batch').value;
        const content = document.getElementById('add-testimonial-content').value;
        const linkedin = document.getElementById('add-testimonial-linkedin').value;
        
        if (name && initials && score && batch && content) {
            try {
                // Show loading state
                const submitBtn = document.querySelector('#add-testimonial-form button[type="submit"]');
                const originalText = submitBtn.textContent;
                submitBtn.textContent = 'Adding...';
                submitBtn.disabled = true;
                
                // Create testimonial via API
                const response = await this.requestMiddleware('/api/testimonials', {
                    method: 'POST',
                    body: JSON.stringify({
                        name,
                        initials,
                        score,
                        batch,
                        content,
                        linkedin: linkedin || null
                    })
                });
                
                if (response && response.ok) {
                    const newTestimonial = await response.json();
                    
                    // Update local data
                    this.data.testimonials.push(newTestimonial);
                    this.logActivity('content', 'Testimonial added', 'info', `"${name}" added`);
                    this.saveData();
                    this.loadTestimonials();
                    this.updateMainWebsite();
                    this.closeAddTestimonialModal();
                    this.showNotification(`Testimonial "${name}" added successfully!`, 'success');
                } else {
                    this.showNotification('Failed to add testimonial', 'error');
                }
            } catch (error) {
                console.error('Error adding testimonial:', error);
                this.showNotification('Failed to add testimonial', 'error');
            } finally {
                // Restore button state
                const submitBtn = document.querySelector('#add-testimonial-form button[type="submit"]');
                if (submitBtn) {
                    submitBtn.textContent = 'Add Testimonial';
                    submitBtn.disabled = false;
                }
            }
        }
    }

    closeAddTestimonialModal() {
        const modal = document.getElementById('add-testimonial-modal');
        modal.classList.remove('active');
    }

    async editTestimonial(id) {
        console.log('Edit testimonial called with ID:', id, 'Type:', typeof id);
        try {
            const response = await this.requestMiddleware(`/api/testimonials/${id}`);
            console.log('Response received:', response);
            console.log('Response status:', response ? response.status : 'null');
            console.log('Response ok:', response ? response.ok : 'null');
            
            if (response && response.ok) {
                const testimonial = await response.json();
                console.log('Testimonial data loaded:', testimonial);
                this.currentEditingTestimonial = testimonial;
                this.showEditTestimonialModal(testimonial);
            } else {
                console.error('Failed to load testimonial. Response:', response);
                this.showNotification('Failed to load testimonial', 'error');
            }
        } catch (error) {
            console.error('Error loading testimonial:', error);
            this.showNotification('Failed to load testimonial', 'error');
        }
    }

    showEditTestimonialModal(testimonial) {
        console.log('showEditTestimonialModal called with:', testimonial);
        const modal = document.getElementById('edit-testimonial-modal');
        const form = document.getElementById('edit-testimonial-form');
        
        console.log('Modal element:', modal);
        console.log('Form element:', form);
        
        if (!modal) {
            console.error('Edit testimonial modal not found!');
            return;
        }
        
        if (!form) {
            console.error('Edit testimonial form not found!');
            return;
        }
        
        // Populate form with existing data
        document.getElementById('edit-testimonial-name').value = testimonial.name || '';
        document.getElementById('edit-testimonial-initials').value = testimonial.initials || '';
        document.getElementById('edit-testimonial-score').value = testimonial.score || '';
        document.getElementById('edit-testimonial-batch').value = testimonial.batch || '';
        document.getElementById('edit-testimonial-content').value = testimonial.content || '';
        document.getElementById('edit-testimonial-linkedin').value = testimonial.linkedin || '';
        
        // Setup LinkedIn auto-format for this modal
        const linkedinInput = document.getElementById('edit-testimonial-linkedin');
        if (linkedinInput) {
            linkedinInput.addEventListener('blur', () => {
                this.formatLinkedInUrl(linkedinInput);
            });
        }
        
        // Show modal
        modal.classList.add('active');
        console.log('Modal should now be visible');
        
        // Setup form submission
        form.onsubmit = (e) => {
            e.preventDefault();
            this.saveTestimonialEdit();
        };
    }

    async saveTestimonialEdit() {
        const testimonial = this.currentEditingTestimonial;
        if (!testimonial) return;
        
        const name = document.getElementById('edit-testimonial-name').value;
        const initials = document.getElementById('edit-testimonial-initials').value;
        const score = document.getElementById('edit-testimonial-score').value;
        const batch = document.getElementById('edit-testimonial-batch').value;
        const content = document.getElementById('edit-testimonial-content').value;
        const linkedin = document.getElementById('edit-testimonial-linkedin').value;
        
        if (name && initials && score && batch && content) {
            try {
                // Show loading state
                const submitBtn = document.querySelector('#edit-testimonial-form button[type="submit"]');
                const originalText = submitBtn.textContent;
                submitBtn.textContent = 'Saving...';
                submitBtn.disabled = true;
                
                // Update testimonial via API
                const response = await this.requestMiddleware(`/api/testimonials/${testimonial.id}`, {
                    method: 'PUT',
                    body: JSON.stringify({
                        name,
                        initials,
                        score,
                        batch,
                        content,
                        linkedin: linkedin || null
                    })
                });
                
                if (response && response.ok) {
                    const updatedTestimonial = await response.json();
                    
                    // Update local data
                    const index = this.data.testimonials.findIndex(t => t.id === testimonial.id);
                    if (index !== -1) {
                        this.data.testimonials[index] = updatedTestimonial;
                    }
                    
                    this.logActivity('content', 'Testimonial edited', 'info', `"${name}" updated`);
                    this.saveData();
                    this.loadTestimonials();
                    this.updateMainWebsite();
                    this.closeEditTestimonialModal();
                    this.showNotification(`Testimonial "${name}" updated successfully!`, 'success');
                } else {
                    this.showNotification('Failed to update testimonial', 'error');
                }
            } catch (error) {
                console.error('Error updating testimonial:', error);
                this.showNotification('Failed to update testimonial', 'error');
            } finally {
                // Restore button state
                const submitBtn = document.querySelector('#edit-testimonial-form button[type="submit"]');
                if (submitBtn) {
                    submitBtn.textContent = 'Save Changes';
                    submitBtn.disabled = false;
                }
            }
        }
    }

    closeEditTestimonialModal() {
        const modal = document.getElementById('edit-testimonial-modal');
        modal.classList.remove('active');
        this.currentEditingTestimonial = null;
    }

    async deleteTestimonial(id) {
        if (confirm('Are you sure you want to delete this testimonial?')) {
            try {
                const response = await this.requestMiddleware(`/api/testimonials/${id}`, {
                    method: 'DELETE'
                });
                
                if (response && response.ok) {
                    this.data.testimonials = this.data.testimonials.filter(t => t.id !== id);
                    this.saveData();
                    this.loadTestimonials();
                    this.updateMainWebsite();
                    this.showNotification('Testimonial deleted successfully!', 'success');
                } else {
                    this.showNotification('Failed to delete testimonial', 'error');
                }
            } catch (error) {
                console.error('Error deleting testimonial:', error);
                this.showNotification('Failed to delete testimonial', 'error');
            }
        }
    }

    loadFAQ() {
        const container = document.getElementById('faq-list');
        container.innerHTML = '';
        
        this.data.faq.forEach(faq => {
            const item = this.createFAQItem(faq);
            container.appendChild(item);
        });
    }

    createFAQItem(faq) {
        const div = document.createElement('div');
        div.className = 'content-item';
        div.innerHTML = `
            <div class="content-item-header">
                <div class="content-item-title">${faq.question}</div>
                <div class="content-item-actions">
                    <button class="btn btn-small btn-secondary" onclick="adminPanel.editFAQ(${faq.id})">Edit</button>
                    <button class="btn btn-small btn-danger" onclick="adminPanel.deleteFAQ(${faq.id})">Delete</button>
                </div>
            </div>
            <div class="content-item-content">${faq.answer}</div>
        `;
        return div;
    }

    addFAQ() {
        const question = prompt('Enter FAQ question:');
        const answer = prompt('Enter FAQ answer:');
        
        if (question && answer) {
            const newFAQ = {
                id: Date.now(),
                question,
                answer
            };
            this.data.faq.push(newFAQ);
            this.saveData();
            this.loadFAQ();
            this.updateMainWebsite();
        }
    }

    editFAQ(id) {
        const faq = this.data.faq.find(f => f.id === id);
        if (faq) {
            this.currentEditingFAQ = faq;
            this.showEditFAQModal(faq);
        }
    }

    showEditFAQModal(faq) {
        const modal = document.getElementById('edit-faq-modal');
        const form = document.getElementById('edit-faq-form');
        
        // Populate form with existing data
        document.getElementById('edit-faq-question').value = faq.question || '';
        document.getElementById('edit-faq-answer').value = faq.answer || '';
        
        // Show modal
        modal.classList.add('active');
        
        // Setup form submission
        form.onsubmit = (e) => {
            e.preventDefault();
            this.saveFAQEdit();
        };
    }

    saveFAQEdit() {
        const faq = this.currentEditingFAQ;
        if (!faq) return;
        
        const question = document.getElementById('edit-faq-question').value;
        const answer = document.getElementById('edit-faq-answer').value;
        
        if (question && answer) {
            faq.question = question;
            faq.answer = answer;
            this.logActivity('content', 'FAQ edited', 'info', `"${question}" updated`);
            this.saveData();
            this.loadFAQ();
            this.updateMainWebsite();
            this.closeEditFAQModal();
            this.showNotification(`FAQ "${question}" updated successfully!`, 'success');
        }
    }

    closeEditFAQModal() {
        const modal = document.getElementById('edit-faq-modal');
        modal.classList.remove('active');
        this.currentEditingFAQ = null;
    }

    deleteFAQ(id) {
        if (confirm('Are you sure you want to delete this FAQ?')) {
            this.data.faq = this.data.faq.filter(f => f.id !== id);
            this.saveData();
            this.loadFAQ();
            this.updateMainWebsite();
        }
    }

    // Pricing Management
    loadPricing() {
        const container = document.getElementById('pricing-list');
        container.innerHTML = '';
        
        this.data.pricing.forEach(plan => {
            const item = this.createPricingItem(plan);
            container.appendChild(item);
        });
    }

    createPricingItem(plan) {
        const div = document.createElement('div');
        div.className = 'pricing-item';
        div.innerHTML = `
            <div class="pricing-item-header">
                <div class="pricing-item-title">${plan.title} - ${plan.price}</div>
                <div class="pricing-item-actions">
                    <button class="btn btn-small btn-secondary" onclick="adminPanel.editPricingPlan('${plan.id}')">Edit</button>
                    <button class="btn btn-small btn-danger" onclick="adminPanel.deletePricingPlan('${plan.id}')">Delete</button>
                </div>
            </div>
            <div class="pricing-item-content">
                <div class="pricing-badge">${plan.badge || ''}</div>
                <ul class="pricing-features">
                    ${plan.features.map(feature => `<li>${feature}</li>`).join('')}
                </ul>
                <div class="pricing-button">${plan.buttonText}</div>
            </div>
        `;
        return div;
    }

    addPricingPlan() {
        this.showAddPricingModal();
    }

    showAddPricingModal() {
        const modal = document.getElementById('add-pricing-modal');
        const form = document.getElementById('add-pricing-form');
        
        // Clear form
        form.reset();
        
        // Show modal
        modal.classList.add('active');
        
        // Setup form submission
        form.onsubmit = (e) => {
            e.preventDefault();
            this.saveNewPricingPlan();
        };
    }

    async saveNewPricingPlan() {
        const title = document.getElementById('add-pricing-title').value;
        const price = document.getElementById('add-pricing-price').value;
        const badge = document.getElementById('add-pricing-badge').value;
        const features = document.getElementById('add-pricing-features').value.split('\n').filter(f => f.trim());
        const buttonText = document.getElementById('add-pricing-button-text').value;
        const buttonType = document.getElementById('add-pricing-button-type').value;
        const buttonUrl = document.getElementById('add-pricing-button-url').value;
        const isPopular = document.getElementById('add-pricing-popular').checked;

        if (!title || !price || features.length === 0 || !buttonText) {
            this.showNotification('Please fill in all required fields', 'error');
            return;
        }

        try {
            const newPlan = {
                title,
                price,
                badge: badge || null,
                features,
                buttonText,
                buttonType,
                buttonUrl: buttonUrl || null,
                isPopular
            };

            // Add to local data
            newPlan.id = Date.now().toString();
            this.data.pricing.push(newPlan);
            
            this.logActivity('pricing', 'Pricing plan added', 'success', `"${title}" plan created`);
            this.saveData();
            this.loadPricing();
            this.updateMainWebsite();
            this.closeAddPricingModal();
            this.showNotification('Pricing plan added successfully!', 'success');
        } catch (error) {
            console.error('Error adding pricing plan:', error);
            this.showNotification('Failed to add pricing plan', 'error');
        }
    }

    async editPricingPlan(id) {
        try {
            // Convert id to string for comparison
            const planId = String(id);
            const plan = this.data.pricing.find(p => String(p.id) === planId);
            if (!plan) {
                this.showNotification('Pricing plan not found', 'error');
                return;
            }

            this.currentEditingPricing = plan;
            this.showEditPricingModal(plan);
        } catch (error) {
            console.error('Error loading pricing plan:', error);
            this.showNotification('Failed to load pricing plan', 'error');
        }
    }

    showEditPricingModal(plan) {
        const modal = document.getElementById('edit-pricing-modal');
        const form = document.getElementById('edit-pricing-form');
        
        if (!modal || !form) {
            console.error('Edit pricing modal or form not found!');
            return;
        }
        
        // Populate form with existing data
        document.getElementById('edit-pricing-title').value = plan.title || '';
        document.getElementById('edit-pricing-price').value = plan.price || '';
        document.getElementById('edit-pricing-badge').value = plan.badge || '';
        document.getElementById('edit-pricing-features').value = plan.features ? plan.features.join('\n') : '';
        document.getElementById('edit-pricing-button-text').value = plan.buttonText || '';
        document.getElementById('edit-pricing-button-type').value = plan.buttonType || 'general';
        document.getElementById('edit-pricing-button-url').value = plan.buttonUrl || '';
        document.getElementById('edit-pricing-popular').checked = plan.isPopular || false;
        
        // Show modal
        modal.classList.add('active');
        
        // Setup form submission
        form.onsubmit = (e) => {
            e.preventDefault();
            this.savePricingEdit();
        };
    }

    async savePricingEdit() {
        const plan = this.currentEditingPricing;
        if (!plan) return;

        const title = document.getElementById('edit-pricing-title').value;
        const price = document.getElementById('edit-pricing-price').value;
        const badge = document.getElementById('edit-pricing-badge').value;
        const features = document.getElementById('edit-pricing-features').value.split('\n').filter(f => f.trim());
        const buttonText = document.getElementById('edit-pricing-button-text').value;
        const buttonType = document.getElementById('edit-pricing-button-type').value;
        const buttonUrl = document.getElementById('edit-pricing-button-url').value;
        const isPopular = document.getElementById('edit-pricing-popular').checked;

        if (!title || !price || features.length === 0 || !buttonText) {
            this.showNotification('Please fill in all required fields', 'error');
            return;
        }

        try {
            const oldTitle = plan.title;
            
            // Update plan data
            plan.title = title;
            plan.price = price;
            plan.badge = badge || null;
            plan.features = features;
            plan.buttonText = buttonText;
            plan.buttonType = buttonType;
            plan.buttonUrl = buttonUrl || null;
            plan.isPopular = isPopular;

            this.logActivity('pricing', 'Pricing plan edited', 'info', `"${oldTitle}" updated to "${title}"`);
            this.saveData();
            this.loadPricing();
            this.updateMainWebsite();
            this.closeEditPricingModal();
            this.showNotification('Pricing plan updated successfully!', 'success');
        } catch (error) {
            console.error('Error updating pricing plan:', error);
            this.showNotification('Failed to update pricing plan', 'error');
        }
    }

    deletePricingPlan(id) {
        if (confirm('Are you sure you want to delete this pricing plan?')) {
            // Convert id to string for comparison
            const planId = String(id);
            const plan = this.data.pricing.find(p => String(p.id) === planId);
            this.data.pricing = this.data.pricing.filter(p => String(p.id) !== planId);
            this.logActivity('pricing', 'Pricing plan deleted', 'warning', `"${plan ? plan.title : 'Unknown'}" plan removed`);
            this.saveData();
            this.loadPricing();
            this.updateMainWebsite();
            this.showNotification('Pricing plan deleted successfully!', 'success');
        }
    }

    closeAddPricingModal() {
        const modal = document.getElementById('add-pricing-modal');
        modal.classList.remove('active');
    }

    closeEditPricingModal() {
        const modal = document.getElementById('edit-pricing-modal');
        modal.classList.remove('active');
        this.currentEditingPricing = null;
    }

    // Auto-logout functionality
    initializeAutoLogout() {
        this.startLogoutTimer();
        // Only log activity if we have a valid context
        if (this && this.logActivity) {
            this.logActivity('system', 'Auto-logout initialized', 'info', '30-minute inactivity timer started');
        }
    }

    setupActivityTracking() {
        // Track various user activities
        const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
        
        events.forEach(event => {
            document.addEventListener(event, () => {
                this.resetLogoutTimer();
            }, true);
        });

        // Track form interactions
        document.addEventListener('input', () => {
            this.resetLogoutTimer();
        }, true);

        // Track modal interactions
        document.addEventListener('modal-open', () => {
            this.resetLogoutTimer();
        }, true);
    }

    resetLogoutTimer() {
        this.lastActivity = Date.now();
        
        // Clear existing timers
        if (this.logoutTimer) {
            clearTimeout(this.logoutTimer);
        }
        if (this.logoutWarningTimer) {
            clearTimeout(this.logoutWarningTimer);
        }

        // Start new timers
        this.startLogoutTimer();
    }

    startLogoutTimer() {
        // Set warning timer (25 minutes)
        this.logoutWarningTimer = setTimeout(() => {
            this.showLogoutWarning();
        }, this.autoLogoutTimeout - this.logoutWarningTime);

        // Set actual logout timer (30 minutes)
        this.logoutTimer = setTimeout(() => {
            this.performAutoLogout();
        }, this.autoLogoutTimeout);
    }

    showLogoutWarning() {
        // Create warning modal
        const warningModal = document.createElement('div');
        warningModal.id = 'logout-warning-modal';
        warningModal.className = 'modal active';
        warningModal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3><i class="fas fa-exclamation-triangle"></i> Session Timeout Warning</h3>
                </div>
                <div class="modal-body">
                    <p>Your session will expire in <strong id="logout-countdown">5:00</strong> minutes due to inactivity.</p>
                    <p>Click "Stay Logged In" to continue your session, or you will be automatically logged out.</p>
                </div>
                <div class="modal-actions">
                    <button type="button" class="btn btn-secondary" onclick="adminPanel.performAutoLogout()">Logout Now</button>
                    <button type="button" class="btn btn-primary" onclick="adminPanel.stayLoggedIn()">Stay Logged In</button>
                </div>
            </div>
        `;

        document.body.appendChild(warningModal);

        // Start countdown
        this.startCountdown();
    }

    startCountdown() {
        let timeLeft = this.logoutWarningTime / 1000; // Convert to seconds
        const countdownElement = document.getElementById('logout-countdown');
        
        const countdownInterval = setInterval(() => {
            const minutes = Math.floor(timeLeft / 60);
            const seconds = Math.floor(timeLeft % 60);
            countdownElement.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
            
            timeLeft--;
            
            if (timeLeft < 0) {
                clearInterval(countdownInterval);
            }
        }, 1000);
    }

    stayLoggedIn() {
        // Remove warning modal
        const warningModal = document.getElementById('logout-warning-modal');
        if (warningModal) {
            warningModal.remove();
        }

        // Reset timers
        this.resetLogoutTimer();
        
        // Log the activity
        this.logActivity('system', 'Session extended', 'info', 'User chose to stay logged in');
        
        // Show confirmation
        this.showNotification('Session extended successfully!', 'success');
    }

    performAutoLogout() {
        // Clear all timers
        if (this.logoutTimer) {
            clearTimeout(this.logoutTimer);
        }
        if (this.logoutWarningTimer) {
            clearTimeout(this.logoutWarningTimer);
        }

        // Remove warning modal if it exists
        const warningModal = document.getElementById('logout-warning-modal');
        if (warningModal) {
            warningModal.remove();
        }

        // Log the auto-logout
        this.logActivity('system', 'Auto-logout performed', 'warning', 'Session expired due to inactivity');

        // Clear authentication
        localStorage.removeItem('adminToken');
        localStorage.removeItem('adminUser');

        // Show logout message
        this.showNotification('You have been automatically logged out due to inactivity.', 'warning');

        // Redirect to login page
        setTimeout(() => {
            window.location.href = '/admin-login.html';
        }, 2000);
    }

    // Manual logout function
    logout() {
        // Clear all timers
        if (this.logoutTimer) {
            clearTimeout(this.logoutTimer);
        }
        if (this.logoutWarningTimer) {
            clearTimeout(this.logoutWarningTimer);
        }

        // Log the manual logout
        this.logActivity('system', 'Manual logout', 'info', 'User manually logged out');

        // Clear authentication
        localStorage.removeItem('adminToken');
        localStorage.removeItem('adminUser');

        // Show logout message
        this.showNotification('You have been logged out successfully.', 'success');

        // Redirect to login page
        setTimeout(() => {
            window.location.href = '/admin-login.html';
        }, 1000);
    }

    // Blog Management
    async loadBlog() {
        if (!await this.checkAuth()) return;
        
        this.loadingMiddleware(true);
        
        try {
            const response = await this.requestMiddleware('/api/admin/blog-posts');
            if (response && response.ok) {
                this.blogPosts = await response.json();
                // Apply current filter when loading
                this.filterBlogPosts(this.currentBlogFilter);
            } else {
                this.errorMiddleware('Failed to load blog posts', 'loadBlog');
            }
        } catch (error) {
            this.errorMiddleware(error, 'loadBlog');
        } finally {
            this.loadingMiddleware(false);
        }
    }

    renderBlogPosts(posts) {
        const container = document.getElementById('blog-list');
        if (!container) return;
        
        container.innerHTML = '';
        
        // Show filter status
        const totalPosts = this.blogPosts.length;
        const filteredCount = posts.length;
        const filterStatus = this.getFilterStatusText();
        
        if (posts.length === 0) {
            if (this.currentBlogFilter === 'all') {
                container.innerHTML = '<div class="no-posts">No blog posts found. <button class="btn btn-primary" onclick="showBlogEditor()">Create your first post</button></div>';
            } else {
                container.innerHTML = `<div class="no-posts">No ${filterStatus.toLowerCase()} posts found. <button class="btn btn-primary" onclick="showBlogEditor()">Create your first post</button></div>`;
            }
            return;
        }
        
        // Add filter status header
        const statusHeader = document.createElement('div');
        statusHeader.className = 'blog-filter-status';
        statusHeader.innerHTML = `
            <div class="filter-info">
                <span class="filter-text">Showing ${filteredCount} of ${totalPosts} posts</span>
                <span class="filter-type">${filterStatus}</span>
            </div>
        `;
        container.appendChild(statusHeader);
        
        posts.forEach(post => {
            const item = this.createBlogItem(post);
            container.appendChild(item);
        });
    }

    getFilterStatusText() {
        switch (this.currentBlogFilter) {
            case 'published':
                return 'Published Posts';
            case 'draft':
                return 'Draft Posts';
            default:
                return 'All Posts';
        }
    }

    filterBlogPosts(status) {
        this.currentBlogFilter = status;
        
        let filteredPosts = this.blogPosts;
        
        if (status === 'published') {
            filteredPosts = this.blogPosts.filter(post => post.status === 'published');
        } else if (status === 'draft') {
            filteredPosts = this.blogPosts.filter(post => post.status === 'draft');
        }
        // 'all' shows all posts, so no filtering needed
        
        this.renderBlogPosts(filteredPosts);
        
        // Update the filter dropdown to show current selection
        const filterSelect = document.getElementById('blog-filter');
        if (filterSelect) {
            filterSelect.value = status;
        }
    }

    createBlogItem(post) {
        const div = document.createElement('div');
        div.className = 'blog-item';
        
        const statusClass = post.status === 'published' ? 'status-published' : 
                           post.status === 'draft' ? 'status-draft' : 'status-pending';
        
        const createdDate = post.createdAt ? new Date(post.createdAt).toLocaleDateString() : 'Unknown date';
        const author = post.createdBy ? post.createdBy.username : 'Unknown';
        
        div.innerHTML = `
            <div class="blog-item-header">
                <div class="blog-item-title">${post.title || 'Untitled'}</div>
                <div class="blog-item-actions">
                    <button class="btn btn-small btn-secondary" onclick="adminPanel.editBlogPost('${post.id}')">Edit</button>
                    <button class="btn btn-small btn-danger" onclick="adminPanel.deleteBlogPost('${post.id}')">Delete</button>
                </div>
            </div>
            <div class="blog-item-content">${post.excerpt || post.content?.substring(0, 150) + '...' || 'No excerpt available'}</div>
            <div class="blog-item-meta">
                <span class="blog-status ${statusClass}">${post.status || 'draft'}</span>
                <span>Category: ${post.category || 'Uncategorized'}</span>
                <span>Created: ${createdDate}</span>
                <span>Author: ${author}</span>
                ${post.seoTitle || post.seoDescription || post.seoKeywords ? '<span style="color: #25D366;">🔍 SEO Configured</span>' : ''}
            </div>
        `;
        return div;
    }

    async showBlogEditor(postId = null) {
        const modal = document.getElementById('blog-editor-modal');
        const form = document.getElementById('blog-editor-form');
        
        // Show modal immediately
        modal.classList.add('active');
        this.currentEditingPost = postId;
        
        if (postId) {
            // Show loading state
            const submitBtn = form.querySelector('button[type="submit"]');
            const originalText = submitBtn.textContent;
            submitBtn.textContent = 'Loading...';
            submitBtn.disabled = true;
            
            // Load the specific blog post from API
            try {
                const response = await this.requestMiddleware(`/api/admin/blog-posts`);
                if (response && response.ok) {
                    const posts = await response.json();
                    const post = posts.find(p => p.id === postId);
                    
                    if (post) {
                        document.getElementById('blog-title').value = post.title || '';
                        document.getElementById('blog-slug').value = post.slug || '';
                        document.getElementById('blog-excerpt').value = post.excerpt || '';
                        document.getElementById('blog-content').value = post.content || '';
                        document.getElementById('blog-category').value = post.category || '';
                        document.getElementById('blog-status').value = post.status || 'draft';
                        document.getElementById('blog-featured-image').value = post.featuredImageUrl || '';
                        
                        // Load SEO fields
                        document.getElementById('blog-seo-title').value = post.seoTitle || '';
                        document.getElementById('blog-seo-description').value = post.seoDescription || '';
                        document.getElementById('blog-seo-keywords').value = post.seoKeywords || '';
                        
                        // Setup character count updates for SEO fields
                        this.setupBlogSEOCharCounts();
                        
                        console.log('✅ Blog post loaded for editing:', post.title);
                    } else {
                        console.error('Blog post not found:', postId);
                        this.showNotification('Blog post not found', 'error');
                        modal.classList.remove('active');
                        return;
                    }
                } else {
                    console.error('Failed to load blog posts for editing');
                    this.showNotification('Failed to load blog post data', 'error');
                    modal.classList.remove('active');
                    return;
                }
            } catch (error) {
                console.error('Error loading blog post for editing:', error);
                this.showNotification('Error loading blog post data', 'error');
                modal.classList.remove('active');
                return;
            } finally {
                // Restore button state
                submitBtn.textContent = originalText;
                submitBtn.disabled = false;
            }
        } else {
            form.reset();
            // Setup character count updates for SEO fields
            this.setupBlogSEOCharCounts();
        }
    }

    closeBlogEditor() {
        document.getElementById('blog-editor-modal').classList.remove('active');
        this.currentEditingPost = null;
    }

    setupBlogSEOCharCounts() {
        const titleInput = document.getElementById('blog-seo-title');
        const descInput = document.getElementById('blog-seo-description');
        
        if (titleInput) {
            titleInput.addEventListener('input', () => this.updateCharCount(titleInput, 60));
            this.updateCharCount(titleInput, 60);
        }
        
        if (descInput) {
            descInput.addEventListener('input', () => this.updateCharCount(descInput, 160));
            this.updateCharCount(descInput, 160);
        }
    }

    async saveBlogPost() {
        if (!await this.checkAuth()) return;
        
        const title = document.getElementById('blog-title').value;
        const slug = document.getElementById('blog-slug').value;
        const excerpt = document.getElementById('blog-excerpt').value;
        const content = document.getElementById('blog-content').value;
        const category = document.getElementById('blog-category').value;
        const status = document.getElementById('blog-status').value;
        const featuredImage = document.getElementById('blog-featured-image').value;
        
        // SEO fields
        const seoTitle = document.getElementById('blog-seo-title').value;
        const seoDescription = document.getElementById('blog-seo-description').value;
        const seoKeywords = document.getElementById('blog-seo-keywords').value;
        
        if (!title || !slug || !content) {
            this.showMessage('Please fill in all required fields', 'error');
            return;
        }
        
        const postData = {
            title,
            slug,
            excerpt,
            content,
            category,
            status,
            featuredImageUrl: featuredImage,
            seoTitle: seoTitle || null,
            seoDescription: seoDescription || null,
            seoKeywords: seoKeywords || null
        };
        
        this.loadingMiddleware(true);
        
        try {
            let response;
            if (this.currentEditingPost) {
                // Update existing post
                response = await this.requestMiddleware(`/api/blog-posts/${this.currentEditingPost}`, {
                    method: 'PUT',
                    headers: this.getAuthHeaders(),
                    body: JSON.stringify(postData)
                });
            } else {
                // Create new post
                response = await this.requestMiddleware('/api/blog-posts', {
                    method: 'POST',
                    headers: this.getAuthHeaders(),
                    body: JSON.stringify(postData)
                });
            }
            
            if (response && response.ok) {
                this.showNotification(
                    this.currentEditingPost ? 'Blog post updated successfully!' : 'Blog post created successfully!', 
                    'success'
                );
                await this.loadBlog();
                this.closeBlogEditor();
            } else {
                this.errorMiddleware('Failed to save blog post', 'saveBlogPost');
            }
        } catch (error) {
            this.errorMiddleware(error, 'saveBlogPost');
        } finally {
            this.loadingMiddleware(false);
        }
    }

    async editBlogPost(id) {
        await this.showBlogEditor(id);
    }

    async deleteBlogPost(id) {
        if (!await this.checkAuth()) return;
        
        if (confirm('Are you sure you want to delete this blog post?')) {
            this.loadingMiddleware(true);
            
            try {
                const response = await this.requestMiddleware(`/api/blog-posts/${id}`, {
                    method: 'DELETE',
                    headers: this.getAuthHeaders()
                });
                
                if (response && response.ok) {
                    this.showNotification('Blog post deleted successfully!', 'success');
                    await this.loadBlog();
                } else {
                    this.errorMiddleware('Failed to delete blog post', 'deleteBlogPost');
                }
            } catch (error) {
                this.errorMiddleware(error, 'deleteBlogPost');
            } finally {
                this.loadingMiddleware(false);
            }
        }
    }

    // SEO Management
    loadSEO() {
        const seo = this.data.seo;
        
        // Homepage SEO
        document.getElementById('home-title').value = seo.home.title;
        document.getElementById('home-description').value = seo.home.description;
        document.getElementById('home-keywords').value = seo.home.keywords;
        
        // Meta tags
        document.getElementById('og-title').value = seo.meta.ogTitle;
        document.getElementById('og-description').value = seo.meta.ogDescription;
        document.getElementById('og-image').value = seo.meta.ogImage;
        document.getElementById('twitter-card').value = seo.meta.twitterCard;
        
        this.updateCharCounts();
    }


    saveSEO() {
        this.data.seo = {
            home: {
                title: document.getElementById('home-title').value,
                description: document.getElementById('home-description').value,
                keywords: document.getElementById('home-keywords').value
            },
            meta: {
                ogTitle: document.getElementById('og-title').value,
                ogDescription: document.getElementById('og-description').value,
                ogImage: document.getElementById('og-image').value,
                twitterCard: document.getElementById('twitter-card').value
            }
        };
        this.logActivity('seo', 'SEO settings updated', 'success', 'Homepage and meta tags modified');
        this.saveData();
        this.updateMainWebsite();
    }

    saveSettings() {
        this.data.settings = {
            siteName: document.getElementById('site-name').value,
            whatsappNumber: document.getElementById('whatsapp-number').value,
            contactEmail: document.getElementById('contact-email').value
        };
        this.logActivity('settings', 'Settings updated', 'info', 'General settings modified');
        this.saveData();
        this.updateMainWebsite();
    }

    // Utility Functions
    showMessage(message, type = 'info') {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}`;
        messageDiv.textContent = message;
        
        const container = document.querySelector('.main-content');
        container.insertBefore(messageDiv, container.firstChild);
        
        setTimeout(() => {
            messageDiv.remove();
        }, 5000);
    }

    updateMainWebsite() {
        // Refresh the main website content
        if (window.parent && window.parent.contentIntegration) {
            window.parent.contentIntegration.refresh();
        }
        
        // Also try to refresh if we're in the same window
        if (window.contentIntegration) {
            window.contentIntegration.refresh();
        }
        
        this.showMessage('Website content updated!', 'success');
    }

    exportData() {
        const dataStr = JSON.stringify(this.data, null, 2);
        const dataBlob = new Blob([dataStr], {type: 'application/json'});
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'language-baba-admin-data.json';
        link.click();
        URL.revokeObjectURL(url);
        this.logActivity('system', 'Data exported', 'info', 'Admin data downloaded as JSON');
    }

    importData() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    try {
                        const importedData = JSON.parse(e.target.result);
                        this.data = { ...this.data, ...importedData };
                        this.logActivity('system', 'Data imported', 'success', 'Admin data restored from backup');
                        this.saveData();
                        this.showMessage('Data imported successfully!', 'success');
                        this.loadDashboard();
                        this.loadContent();
                        this.loadPricing();
                        this.loadBlog();
                        this.loadSEO();
                    } catch (error) {
                        this.logActivity('system', 'Data import failed', 'danger', 'Invalid file format');
                        this.showMessage('Error importing data. Please check the file format.', 'error');
                    }
                };
                reader.readAsText(file);
            }
        };
        input.click();
    }

    clearAllData() {
        if (confirm('Are you sure you want to clear all data? This action cannot be undone.')) {
            localStorage.removeItem('languageBabaAdminData');
            this.data = this.loadData();
            this.logActivity('system', 'All data cleared', 'danger');
            this.showMessage('All data cleared!', 'success');
            this.loadDashboard();
            this.loadContent();
            this.loadPricing();
            this.loadBlog();
            this.loadSEO();
        }
    }

    // Activity Logging System
    initializeActivityLogs() {
        if (!this.data.activityLogs) {
            this.data.activityLogs = [];
        }
    }

    logActivity(type, action, severity = 'info', details = '') {
        const activity = {
            id: Date.now(),
            timestamp: new Date().toISOString(),
            type: type, // 'content', 'blog', 'seo', 'pricing', 'settings', 'system'
            action: action,
            severity: severity, // 'info', 'success', 'warning', 'danger'
            details: details,
            user: 'Admin'
        };

        this.data.activityLogs.unshift(activity); // Add to beginning

        // Keep only last 100 activities
        if (this.data.activityLogs.length > 100) {
            this.data.activityLogs = this.data.activityLogs.slice(0, 100);
        }

        this.saveData();
        this.updateActivityLogs();
        
        // Refresh activity display if we're on the dashboard
        if (this.currentSection === 'dashboard') {
            this.loadRecentActivity();
        }
    }

    updateActivityLogs(activities = null) {
        // This method is now handled by loadRecentActivity and appendActivityLogs
        // Keeping for backward compatibility but redirecting to new system
        if (activities && activities.length > 0) {
            this.appendActivityLogs(activities);
        } else {
            // Fallback to local data if no activities provided
            const container = document.getElementById('activity-list');
            if (container && (!this.activityPagination || this.activityPagination.currentPage === 0)) {
                container.innerHTML = '<div class="no-activities">No recent activity</div>';
            }
        }
    }

    getActivityIcon(type, severity) {
        const icons = {
            content: 'fas fa-edit',
            blog: 'fas fa-blog',
            seo: 'fas fa-search',
            pricing: 'fas fa-tags',
            settings: 'fas fa-cog',
            system: 'fas fa-cogs'
        };

        const severityClasses = {
            info: '',
            success: 'text-success',
            warning: 'text-warning',
            danger: 'text-danger'
        };

        const baseIcon = icons[type] || 'fas fa-circle';
        const severityClass = severityClasses[severity] || '';
        
        return `${baseIcon} ${severityClass}`;
    }

    getTimeAgo(timestamp) {
        const now = new Date();
        const activityTime = new Date(timestamp);
        const diffInSeconds = Math.floor((now - activityTime) / 1000);

        if (diffInSeconds < 60) {
            return 'Just now';
        } else if (diffInSeconds < 3600) {
            const minutes = Math.floor(diffInSeconds / 60);
            return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
        } else if (diffInSeconds < 86400) {
            const hours = Math.floor(diffInSeconds / 3600);
            return `${hours} hour${hours > 1 ? 's' : ''} ago`;
        } else {
            const days = Math.floor(diffInSeconds / 86400);
            return `${days} day${days > 1 ? 's' : ''} ago`;
        }
    }

    async retryMiddleware(requestFn, maxRetries = 3) {
        for (let i = 0; i < maxRetries; i++) {
            try {
                const result = await requestFn();
                if (result) return result;
            } catch (error) {
                console.error(`Retry attempt ${i + 1} failed:`, error);
                if (i === maxRetries - 1) throw error;
                await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1))); // Exponential backoff
            }
        }
        return null;
    }

    loadingMiddleware(showLoading = true) {
        const loadingElement = document.getElementById('loading-indicator');
        if (showLoading && loadingElement) {
            loadingElement.style.display = 'block';
        } else if (!showLoading && loadingElement) {
            loadingElement.style.display = 'none';
        }
    }

    errorMiddleware(error, context = '') {
        console.error(`Error in ${context}:`, error);
        
        let message = 'An unexpected error occurred';
        
        if (error.message) {
            message = error.message;
        } else if (typeof error === 'string') {
            message = error;
        }
        
        this.showNotification(`${context ? context + ': ' : ''}${message}`, 'error');
    }

    validationMiddleware(data, rules) {
        const errors = [];
        
        for (const [field, rule] of Object.entries(rules)) {
            const value = data[field];
            
            if (rule.required && (!value || value.trim() === '')) {
                errors.push(`${rule.label || field} is required`);
            }
            
            if (rule.email && value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
                errors.push(`${rule.label || field} must be a valid email`);
            }
            
            if (rule.minLength && value && value.length < rule.minLength) {
                errors.push(`${rule.label || field} must be at least ${rule.minLength} characters`);
            }
            
            if (rule.maxLength && value && value.length > rule.maxLength) {
                errors.push(`${rule.label || field} must be no more than ${rule.maxLength} characters`);
            }
        }
        
        return errors;
    }

    cacheMiddleware(key, data, ttl = 300000) { // 5 minutes default TTL
        const now = Date.now();
        const cached = localStorage.getItem(`cache_${key}`);
        
        if (cached) {
            const { data: cachedData, timestamp } = JSON.parse(cached);
            if (now - timestamp < ttl) {
                return cachedData;
            }
        }
        
        if (data) {
            localStorage.setItem(`cache_${key}`, JSON.stringify({
                data,
                timestamp: now
            }));
        }
        
        return data;
    }

    // Authentication Methods
    async login(username, password) {
        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password })
            });

            if (response.ok) {
                const data = await response.json();
                localStorage.setItem('adminToken', data.token);
                localStorage.setItem('adminUser', JSON.stringify(data.user));
                
                // Initialize auto-logout after successful login
                this.initializeAutoLogout();
                
                this.showNotification('Login successful!', 'success');
                return true;
            } else {
                const error = await response.json();
                this.showNotification(error.error || 'Login failed', 'error');
                return false;
            }
        } catch (error) {
            console.error('Login error:', error);
            this.showNotification('Login error', 'error');
            return false;
        }
    }

    getCurrentUser() {
        const userStr = localStorage.getItem('adminUser');
        return userStr ? JSON.parse(userStr) : null;
    }

    isCurrentUserSuperuser() {
        const currentUser = this.getCurrentUser();
        return currentUser && currentUser.role === 'superuser';
    }

    async checkAuth() {
        const token = localStorage.getItem('adminToken');
        if (!token) {
            this.showLoginModal();
            return false;
        }
        
        // Verify token is still valid by making a test request
        try {
            const response = await fetch('/api/auth/me', {
                headers: this.getAuthHeaders()
            });
            
            if (!response.ok) {
                localStorage.removeItem('adminToken');
                localStorage.removeItem('adminUser');
                this.showLoginModal();
                return false;
            }
            
            // Initialize auto-logout if not already initialized
            if (!this.logoutTimer) {
                this.initializeAutoLogout();
            }
            
            return true;
        } catch (error) {
            localStorage.removeItem('adminToken');
            localStorage.removeItem('adminUser');
            this.showLoginModal();
            return false;
        }
    }

    showLoginModal() {
        console.log('Creating login modal...');
        
        // Remove existing modal if any
        const existingModal = document.getElementById('login-modal');
        if (existingModal) {
            existingModal.remove();
        }
        
        // Hide all content sections
        const sections = document.querySelectorAll('.content-section');
        sections.forEach(section => {
            section.style.display = 'none';
            section.classList.remove('active');
        });
        
        // Hide sidebar
        const sidebar = document.querySelector('.sidebar');
        if (sidebar) {
            sidebar.style.display = 'none';
        }
        
        // Hide header
        const header = document.querySelector('.admin-header');
        if (header) {
            header.style.display = 'none';
        }
        
        const modal = document.createElement('div');
        modal.id = 'login-modal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10000;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        `;
        
        modal.innerHTML = `
            <div style="background: white; padding: 40px; border-radius: 15px; width: 400px; max-width: 90%; box-shadow: 0 20px 40px rgba(0,0,0,0.1);">
                <div style="text-align: center; margin-bottom: 30px;">
                    <h2 style="margin: 0; color: #333; font-size: 28px; font-weight: 600;">Admin Login</h2>
                    <p style="margin: 10px 0 0 0; color: #666; font-size: 14px;">Enter your credentials to access the admin panel</p>
                </div>
                <form id="login-form">
                    <div style="margin-bottom: 20px;">
                        <label style="display: block; margin-bottom: 8px; color: #333; font-weight: 500;">Username:</label>
                        <input type="text" id="login-username" required 
                               style="width: 100%; padding: 12px; border: 2px solid #e1e5e9; border-radius: 8px; font-size: 16px; transition: border-color 0.3s;"
                               placeholder="Enter username">
                    </div>
                    <div style="margin-bottom: 25px;">
                        <label style="display: block; margin-bottom: 8px; color: #333; font-weight: 500;">Password:</label>
                        <input type="password" id="login-password" required 
                               style="width: 100%; padding: 12px; border: 2px solid #e1e5e9; border-radius: 8px; font-size: 16px; transition: border-color 0.3s;"
                               placeholder="Enter password">
                    </div>
                    <button type="submit" 
                            style="width: 100%; padding: 14px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 16px; font-weight: 600; transition: transform 0.2s;">
                        Login
                    </button>
                    <div id="login-error" style="margin-top: 15px; padding: 10px; background: #fee; color: #c33; border-radius: 5px; display: none; text-align: center;"></div>
                </form>
            </div>
        `;
        
        document.body.appendChild(modal);
        console.log('Login modal created and appended to body');
        
        document.getElementById('login-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = document.getElementById('login-username').value;
            const password = document.getElementById('login-password').value;
            
            // Show loading state
            const submitBtn = e.target.querySelector('button[type="submit"]');
            const originalText = submitBtn.textContent;
            submitBtn.textContent = 'Logging in...';
            submitBtn.disabled = true;
            
            const success = await this.login(username, password);
            if (success) {
                // Remove login modal
                modal.remove();
                
                // Show sidebar and header
                const sidebar = document.querySelector('.sidebar');
                if (sidebar) {
                    sidebar.style.display = 'block';
                }
                
                const header = document.querySelector('.admin-header');
                if (header) {
                    header.style.display = 'flex';
                }
                
                // Show dashboard by default
                this.showSection('dashboard');
                
                console.log('Login successful, showing dashboard');
            } else {
                // Show error message
                const errorDiv = document.getElementById('login-error');
                if (errorDiv) {
                    errorDiv.textContent = 'Invalid username or password';
                    errorDiv.style.display = 'block';
                }
                
                // Reset button
                submitBtn.textContent = originalText;
                submitBtn.disabled = false;
            }
        });
    }

    // Admin Management Methods
    async loadAdminUsers() {
        if (!await this.checkAuth()) return;
        
        this.loadingMiddleware(true);
        
        try {
            // Check cache first
            const cachedUsers = this.cacheMiddleware('admin_users');
            if (cachedUsers) {
                this.renderAdminUsers(cachedUsers);
                this.loadingMiddleware(false);
                return;
            }

            const response = await this.requestMiddleware('/api/admin/users');
            if (response && response.ok) {
                const users = await response.json();
                this.cacheMiddleware('admin_users', users);
                this.renderAdminUsers(users);
            } else {
                this.errorMiddleware('Failed to load admin users', 'loadAdminUsers');
            }
        } catch (error) {
            this.errorMiddleware(error, 'loadAdminUsers');
        } finally {
            this.loadingMiddleware(false);
        }
    }

    renderAdminUsers(users) {
        const tbody = document.getElementById('admin-list-tbody');
        if (!tbody) return;

        const currentUser = this.getCurrentUser();
        const isCurrentUserSuperuser = currentUser && currentUser.role === 'superuser';

        tbody.innerHTML = users.map(user => {
            const isSuperuser = user.role === 'superuser';
            const canModifySuperuser = isCurrentUserSuperuser;
            
            return `
            <tr>
                <td>${user.username}</td>
                <td>${user.email}</td>
                <td>${user.fullName}</td>
                <td><span class="role-badge ${user.role}">${user.role}</span></td>
                <td><span class="status-badge ${user.isActive ? 'active' : 'inactive'}">${user.isActive ? 'Active' : 'Inactive'}</span></td>
                <td>${user.lastLogin ? this.getTimeAgo(user.lastLogin) : 'Never'}</td>
                <td>
                    <div class="action-buttons">
                        <button class="action-btn edit" onclick="editAdmin('${user.id}')" ${isSuperuser && !canModifySuperuser ? 'disabled' : ''}>
                            <i class="fas fa-edit"></i> Edit
                        </button>
                        <button class="action-btn toggle" onclick="toggleAdminStatus('${user.id}', ${user.isActive})" ${isSuperuser && !canModifySuperuser ? 'disabled' : ''}>
                            <i class="fas fa-${user.isActive ? 'ban' : 'check'}"></i> ${user.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                        <button class="action-btn delete" onclick="deleteAdmin('${user.id}')" ${isSuperuser ? 'disabled' : ''}>
                            <i class="fas fa-trash"></i> Delete
                        </button>
                    </div>
                </td>
            </tr>
        `;
        }).join('');
    }

    async createAdmin(formData) {
        if (!await this.checkAuth()) return;
        
        // Validate form data
        const validationRules = {
            username: { required: true, minLength: 3, maxLength: 50, label: 'Username' },
            email: { required: true, email: true, label: 'Email' },
            fullName: { required: true, minLength: 2, maxLength: 100, label: 'Full Name' },
            role: { required: true, label: 'Role' },
            password: { required: true, minLength: 6, label: 'Password' }
        };
        
        const validationErrors = this.validationMiddleware(formData, validationRules);
        if (validationErrors.length > 0) {
            validationErrors.forEach(error => this.showNotification(error, 'error'));
            return;
        }
        
        this.loadingMiddleware(true);
        
        try {
            const response = await this.requestMiddleware('/api/admin/users', {
                method: 'POST',
                body: JSON.stringify(formData)
            });

            if (response && response.ok) {
                this.showNotification('Admin user created successfully', 'success');
                // Clear cache to force refresh
                localStorage.removeItem('cache_admin_users');
                this.loadAdminUsers();
                document.getElementById('add-admin-form').reset();
            } else {
                const error = await response.json();
                this.errorMiddleware(error.message || 'Failed to create admin user', 'createAdmin');
            }
        } catch (error) {
            this.errorMiddleware(error, 'createAdmin');
        } finally {
            this.loadingMiddleware(false);
        }
    }

    async updateAdmin(id, formData) {
        if (!await this.checkAuth()) return;
        
        // Check if trying to modify a superuser
        const targetUser = this.data.adminUsers ? this.data.adminUsers.find(u => u.id === id) : null;
        if (targetUser && targetUser.role === 'superuser' && !this.isCurrentUserSuperuser()) {
            this.showNotification('Insufficient permissions to modify superuser', 'error');
            return;
        }
        
        // Validate form data
        const validationRules = {
            username: { required: true, minLength: 3, maxLength: 50, label: 'Username' },
            email: { required: true, email: true, label: 'Email' },
            fullName: { required: true, minLength: 2, maxLength: 100, label: 'Full Name' },
            role: { required: true, label: 'Role' }
        };
        
        const validationErrors = this.validationMiddleware(formData, validationRules);
        if (validationErrors.length > 0) {
            validationErrors.forEach(error => this.showNotification(error, 'error'));
            return;
        }
        
        this.loadingMiddleware(true);
        
        try {
            const response = await this.requestMiddleware(`/api/admin/users/${id}`, {
                method: 'PUT',
                body: JSON.stringify(formData)
            });

            if (response && response.ok) {
                this.showNotification('Admin user updated successfully', 'success');
                // Clear cache to force refresh
                localStorage.removeItem('cache_admin_users');
                this.loadAdminUsers();
                this.closeEditModal();
            } else {
                const error = await response.json();
                this.errorMiddleware(error.message || 'Failed to update admin user', 'updateAdmin');
            }
        } catch (error) {
            this.errorMiddleware(error, 'updateAdmin');
        } finally {
            this.loadingMiddleware(false);
        }
    }

    async deleteAdmin(id) {
        if (!await this.checkAuth()) return;
        
        // Check if trying to delete a superuser
        const targetUser = this.data.adminUsers ? this.data.adminUsers.find(u => u.id === id) : null;
        if (targetUser && targetUser.role === 'superuser') {
            this.showNotification('Cannot delete superuser', 'error');
            return;
        }
        
        if (!confirm('Are you sure you want to delete this admin user? This action cannot be undone.')) {
            return;
        }

        this.loadingMiddleware(true);

        try {
            const response = await this.requestMiddleware(`/api/admin/users/${id}`, {
                method: 'DELETE'
            });

            if (response && response.ok) {
                this.showNotification('Admin user deleted successfully', 'success');
                // Clear cache to force refresh
                localStorage.removeItem('cache_admin_users');
                this.loadAdminUsers();
            } else {
                const error = await response.json();
                this.errorMiddleware(error.message || 'Failed to delete admin user', 'deleteAdmin');
            }
        } catch (error) {
            this.errorMiddleware(error, 'deleteAdmin');
        } finally {
            this.loadingMiddleware(false);
        }
    }

    async toggleAdminStatus(id, currentStatus) {
        if (!await this.checkAuth()) return;
        
        // Check if trying to modify a superuser
        const targetUser = this.data.adminUsers ? this.data.adminUsers.find(u => u.id === id) : null;
        if (targetUser && targetUser.role === 'superuser' && !this.isCurrentUserSuperuser()) {
            this.showNotification('Insufficient permissions to modify superuser status', 'error');
            return;
        }
        
        // Prevent deactivating superuser
        if (targetUser && targetUser.role === 'superuser' && !currentStatus) {
            this.showNotification('Cannot deactivate superuser', 'error');
            return;
        }
        
        this.loadingMiddleware(true);

        try {
            const response = await this.requestMiddleware(`/api/admin/users/${id}/toggle`, {
                method: 'PATCH',
                body: JSON.stringify({ isActive: !currentStatus })
            });

            if (response && response.ok) {
                this.showNotification(`Admin user ${!currentStatus ? 'activated' : 'deactivated'} successfully`, 'success');
                // Clear cache to force refresh
                localStorage.removeItem('cache_admin_users');
                this.loadAdminUsers();
            } else {
                const error = await response.json();
                this.errorMiddleware(error.message || 'Failed to update admin status', 'toggleAdminStatus');
            }
        } catch (error) {
            this.errorMiddleware(error, 'toggleAdminStatus');
        } finally {
            this.loadingMiddleware(false);
        }
    }

    async loadAdminForEdit(id) {
        if (!await this.checkAuth()) return;
        
        this.loadingMiddleware(true);

        try {
            const response = await this.requestMiddleware(`/api/admin/users/${id}`);
            if (response && response.ok) {
                const user = await response.json();
                this.populateEditForm(user);
                document.getElementById('edit-admin-modal').style.display = 'block';
            } else {
                this.errorMiddleware('Failed to load admin user details', 'loadAdminForEdit');
            }
        } catch (error) {
            this.errorMiddleware(error, 'loadAdminForEdit');
        } finally {
            this.loadingMiddleware(false);
        }
    }

    populateEditForm(user) {
        document.getElementById('edit-admin-id').value = user.id;
        document.getElementById('edit-admin-username').value = user.username;
        document.getElementById('edit-admin-email').value = user.email;
        document.getElementById('edit-admin-fullname').value = user.fullName;
        document.getElementById('edit-admin-status').value = user.isActive.toString();
        document.getElementById('edit-admin-password').value = '';

        // Handle role field based on user type
        const roleSelect = document.getElementById('edit-admin-role');
        const roleLabel = roleSelect.previousElementSibling;
        
        if (user.role === 'superuser') {
            // For superusers, disable role editing and show current role
            roleSelect.value = 'superuser';
            roleSelect.disabled = true;
            // Don't set required attribute for superusers
            roleSelect.style.backgroundColor = '#f5f5f5';
            roleSelect.style.color = '#666';
            roleLabel.innerHTML = 'Role <span style="color: #666; font-size: 0.9em;">(Protected)</span>';
            
            // Add a note about superuser protection
            if (!document.getElementById('superuser-note')) {
                const note = document.createElement('div');
                note.id = 'superuser-note';
                note.style.cssText = 'background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 4px; padding: 8px; margin: 10px 0; font-size: 0.9em; color: #856404;';
                note.innerHTML = '<i class="fas fa-shield-alt"></i> Superuser role is protected and cannot be changed.';
                roleSelect.parentNode.appendChild(note);
            }
        } else {
            // For regular users, enable role editing
            roleSelect.disabled = false;
            roleSelect.setAttribute('required', 'required'); // Add required attribute for regular users
            roleSelect.style.backgroundColor = '';
            roleSelect.style.color = '';
            roleLabel.innerHTML = 'Role';
            roleSelect.value = user.role;
            
            // Remove superuser note if it exists
            const existingNote = document.getElementById('superuser-note');
            if (existingNote) {
                existingNote.remove();
            }
        }
    }

    closeEditModal() {
        document.getElementById('edit-admin-modal').style.display = 'none';
        document.getElementById('edit-admin-form').reset();
        
        // Clean up superuser note if it exists
        const existingNote = document.getElementById('superuser-note');
        if (existingNote) {
            existingNote.remove();
        }
        
        // Reset role field styling
        const roleSelect = document.getElementById('edit-admin-role');
        const roleLabel = roleSelect.previousElementSibling;
        roleSelect.disabled = false;
        roleSelect.removeAttribute('required'); // Don't set required by default
        roleSelect.style.backgroundColor = '';
        roleSelect.style.color = '';
        roleLabel.innerHTML = 'Role';
    }

    logout() {
        console.log('Starting logout process...');
        
        // Clear any stored authentication data
        localStorage.removeItem('adminToken');
        localStorage.removeItem('adminUser');
        localStorage.removeItem('cache_admin_users');
        console.log('Cleared localStorage data');
        
        // Show notification
        this.showNotification('Logged out successfully', 'info');
        console.log('Logout completed successfully - page will refresh automatically');
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
                <span>${message}</span>
            </div>
        `;

        // Add to page
        document.body.appendChild(notification);

        // Show notification
        setTimeout(() => notification.classList.add('show'), 100);

        // Remove after 3 seconds
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    // Device Authorization Methods
    generateDeviceFingerprint() {
        try {
            // Generate a unique device fingerprint based on various browser characteristics
            const factors = [
                navigator.userAgent,
                navigator.language,
                navigator.platform,
                screen.width + 'x' + screen.height,
                screen.colorDepth,
                new Date().getTimezoneOffset().toString(),
                navigator.hardwareConcurrency || 'unknown',
                navigator.maxTouchPoints || '0'
            ];
            
            // Create a hash from the factors
            let hash = 0;
            const str = factors.join('|');
            for (let i = 0; i < str.length; i++) {
                const char = str.charCodeAt(i);
                hash = ((hash << 5) - hash) + char;
                hash = hash & hash; // Convert to 32-bit integer
            }
            
            return 'device_' + Math.abs(hash).toString(36) + '_' + Date.now().toString(36);
        } catch (error) {
            console.warn('Failed to generate device fingerprint, using fallback:', error);
            // Fallback fingerprint based on timestamp and random number
            return 'device_fallback_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2);
        }
    }

    getAuthHeaders() {
        const token = localStorage.getItem('adminToken');
        const headers = {
            'Content-Type': 'application/json'
        };
        
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        
        // Add device fingerprint to all requests
        headers['X-Device-Fingerprint'] = this.deviceFingerprint;
        
        return headers;
    }

    async checkDeviceAuthorization() {
        try {
            // Try to make a request to see if device is authorized
            const response = await fetch('/api/auth/me', {
                headers: this.getAuthHeaders()
            });
            
            if (response.status === 403) {
                const error = await response.json();
                if (error.error === 'Device not authorized') {
                    this.showDeviceAuthorizationModal();
                    return false;
                }
            }
            
            return true;
        } catch (error) {
            console.error('Device authorization check failed:', error);
            return false;
        }
    }

    showDeviceAuthorizationModal() {
        // Create device authorization modal
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.id = 'device-auth-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>🔒 Device Authorization Required</h3>
                </div>
                <div class="modal-body">
                    <div class="device-info">
                        <p><strong>This device is not authorized to access the admin panel.</strong></p>
                        <p>Please contact the administrator to authorize this device.</p>
                        
                        <div class="device-details">
                            <h4>Device Information:</h4>
                            <p><strong>Device Fingerprint:</strong> <code>${this.deviceFingerprint}</code></p>
                            <p><strong>User Agent:</strong> <code>${navigator.userAgent}</code></p>
                            <p><strong>Screen Resolution:</strong> <code>${screen.width}x${screen.height}</code></p>
                            <p><strong>Language:</strong> <code>${navigator.language}</code></p>
                        </div>
                        
                        <div class="copy-section">
                            <button type="button" class="btn btn-primary" onclick="copyDeviceInfo()">
                                📋 Copy Device Information
                            </button>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" onclick="location.reload()">
                        🔄 Refresh Page
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Add global function for copying device info
        window.copyDeviceInfo = () => {
            const deviceInfo = `Device Fingerprint: ${this.deviceFingerprint}
User Agent: ${navigator.userAgent}
Screen Resolution: ${screen.width}x${screen.height}
Language: ${navigator.language}
IP Address: ${window.location.hostname}`;
            
            navigator.clipboard.writeText(deviceInfo).then(() => {
                this.showNotification('Device information copied to clipboard!', 'success');
            }).catch(() => {
                // Fallback for older browsers
                const textArea = document.createElement('textarea');
                textArea.value = deviceInfo;
                document.body.appendChild(textArea);
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);
                this.showNotification('Device information copied to clipboard!', 'success');
            });
        };
    }

    async requestMiddleware(url, options = {}) {
        try {
            // Add device fingerprint to all requests
            const headers = {
                ...this.getAuthHeaders(),
                ...options.headers
            };
            
            const response = await fetch(url, {
                ...options,
                headers
            });
            
            // Check for device authorization errors
            if (response.status === 403) {
                const error = await response.json();
                if (error.error === 'Device not authorized') {
                    this.showDeviceAuthorizationModal();
                    return null;
                }
            }
            
            return response;
        } catch (error) {
            console.error('Request failed:', error);
            return null;
        }
    }
}

// Global functions for HTML onclick handlers
function addBenefit() {
    adminPanel.addBenefit();
}

function addTestimonial() {
    adminPanel.addTestimonial();
}

function addFAQ() {
    adminPanel.addFAQ();
}

function addPricingPlan() {
    adminPanel.addPricingPlan();
}

function closeAddPricingModal() {
    adminPanel.closeAddPricingModal();
}

function closeEditPricingModal() {
    adminPanel.closeEditPricingModal();
}

function logout() {
    adminPanel.logout();
}

async function showBlogEditor() {
    await adminPanel.showBlogEditor();
}

function closeBlogEditor() {
    adminPanel.closeBlogEditor();
}

function exportData() {
    adminPanel.exportData();
}

function importData() {
    adminPanel.importData();
}

function clearAllData() {
    adminPanel.clearAllData();
}

// Admin Management Global Functions
function refreshAdminList() {
    adminPanel.loadAdminUsers();
}

function editAdmin(id) {
    adminPanel.loadAdminForEdit(id);
}

function deleteAdmin(id) {
    adminPanel.deleteAdmin(id);
}

function toggleAdminStatus(id, currentStatus) {
    adminPanel.toggleAdminStatus(id, currentStatus);
}

function closeEditModal() {
    adminPanel.closeEditModal();
}

// Device Management Global Functions
function refreshDeviceList() {
    adminPanel.loadDevices();
}

function revokeDevice(deviceId) {
    adminPanel.revokeDevice(deviceId);
}

function closeEditBenefitModal() {
    adminPanel.closeEditBenefitModal();
}

function closeEditTestimonialModal() {
    adminPanel.closeEditTestimonialModal();
}

function closeEditFAQModal() {
    adminPanel.closeEditFAQModal();
}

function closeAddTestimonialModal() {
    adminPanel.closeAddTestimonialModal();
}

function logout() {
    console.log('Logout button clicked - calling adminPanel.logout()');
    console.log('adminPanel exists:', !!window.adminPanel);
    
    if (window.adminPanel) {
        try {
            adminPanel.logout();
            console.log('Logout function called successfully');
            // Automatically refresh the page after logout
            setTimeout(() => {
                window.location.reload();
            }, 1000);
        } catch (error) {
            console.error('Error calling logout:', error);
            // Fallback: clear data and refresh
            localStorage.removeItem('adminToken');
            localStorage.removeItem('adminUser');
            localStorage.removeItem('cache_admin_users');
            window.location.reload();
        }
    } else {
        console.error('adminPanel not found!');
        // Fallback logout
        console.log('Performing fallback logout...');
        localStorage.removeItem('adminToken');
        localStorage.removeItem('adminUser');
        localStorage.removeItem('cache_admin_users');
        // Automatically refresh the page
        window.location.reload();
    }
}

// Password visibility toggle function
function togglePasswordVisibility(inputId, iconId) {
    const input = document.getElementById(inputId);
    const icon = document.getElementById(iconId);
    
    if (input && icon) {
        if (input.type === 'password') {
            input.type = 'text';
            icon.classList.remove('fa-eye');
            icon.classList.add('fa-eye-slash');
            icon.title = 'Hide password';
        } else {
            input.type = 'password';
            icon.classList.remove('fa-eye-slash');
            icon.classList.add('fa-eye');
            icon.title = 'Show password';
        }
    }
}

// Global function for refreshing activities
function refreshActivities() {
    if (window.adminPanel) {
        window.adminPanel.refreshActivities();
    }
}

// Global function for loading more activities
function loadMoreActivities() {
    if (window.adminPanel) {
        window.adminPanel.loadMoreActivities();
    }
}


// Initialize admin panel when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
    window.adminPanel = new AdminPanel();
    
    // Setup admin management form handlers
    setupAdminFormHandlers();
    
    // Setup logout button event listener as backup
    const logoutBtn = document.querySelector('.logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            console.log('Logout button clicked via event listener');
            logout();
        });
    }
    
    // Check authentication on page load
    const token = localStorage.getItem('adminToken');
    if (!token) {
        // Clear any existing data and show login modal
        localStorage.removeItem('adminToken');
        localStorage.removeItem('adminUser');
        adminPanel.showLoginModal();
    } else {
        // Verify token is still valid
        const isValid = await adminPanel.checkAuth();
        if (!isValid) {
            adminPanel.showLoginModal();
        } else {
            // If authenticated, show dashboard by default
            adminPanel.showSection('dashboard');
        }
    }
});

function setupAdminFormHandlers() {
    // Add admin form
    const addAdminForm = document.getElementById('add-admin-form');
    if (addAdminForm) {
        addAdminForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = {
                username: document.getElementById('admin-username').value,
                email: document.getElementById('admin-email').value,
                fullName: document.getElementById('admin-fullname').value,
                role: document.getElementById('admin-role').value,
                password: document.getElementById('admin-password').value
            };
            await adminPanel.createAdmin(formData);
        });
    }

    // Edit admin form
    const editAdminForm = document.getElementById('edit-admin-form');
    if (editAdminForm) {
        editAdminForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const id = document.getElementById('edit-admin-id').value;
            const formData = {
                username: document.getElementById('edit-admin-username').value,
                email: document.getElementById('edit-admin-email').value,
                fullName: document.getElementById('edit-admin-fullname').value,
                role: document.getElementById('edit-admin-role').value,
                isActive: document.getElementById('edit-admin-status').value === 'true',
                password: document.getElementById('edit-admin-password').value || undefined
            };
            await adminPanel.updateAdmin(id, formData);
        });
    }

    // Device management form
    const addDeviceForm = document.getElementById('add-device-form');
    if (addDeviceForm) {
        addDeviceForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = {
                deviceFingerprint: document.getElementById('device-fingerprint').value,
                deviceName: document.getElementById('device-name').value,
                ipAddress: document.getElementById('device-ip').value || null,
                description: document.getElementById('device-description').value
            };
            await adminPanel.authorizeDevice(formData);
        });
    }
}

// Global function for admin tab switching
function showAdminTab(tab) {
    if (window.adminPanel) {
        window.adminPanel.showAdminTab(tab);
    }
}
