// Prisma-based database service for Language Baba Admin Panel
const { prisma } = require('./prisma/client');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

class DatabasePrisma {
    constructor() {
        this.prisma = prisma;
    }

    // User Management
    async getAllUsers() {
        return await this.prisma.user.findMany({
            select: {
                id: true,
                username: true,
                email: true,
                fullName: true,
                role: true,
                isActive: true,
                lastLogin: true,
                createdAt: true,
                updatedAt: true
            }
        });
    }

    async getUserById(id) {
        return await this.prisma.user.findUnique({
            where: { id },
            select: {
                id: true,
                username: true,
                email: true,
                fullName: true,
                role: true,
                isActive: true,
                lastLogin: true,
                createdAt: true,
                updatedAt: true
            }
        });
    }

    async getUserByEmail(email) {
        return await this.prisma.user.findUnique({
            where: { email },
            select: {
                id: true,
                username: true,
                email: true,
                fullName: true,
                role: true,
                isActive: true,
                lastLogin: true,
                createdAt: true,
                updatedAt: true
            }
        });
    }

    async getUserByUsername(username) {
        return await this.prisma.user.findUnique({
            where: { username },
            select: {
                id: true,
                username: true,
                email: true,
                fullName: true,
                role: true,
                isActive: true,
                lastLogin: true,
                createdAt: true,
                updatedAt: true
            }
        });
    }

    async createUser(userData) {
        const { username, email, fullName, role, password } = userData;

        // Hash password
        const passwordHash = await bcrypt.hash(password, 10);

        return await this.prisma.user.create({
            data: {
                username,
                email,
                fullName,
                role: role || 'admin',
                passwordHash,
                isActive: true
            },
            select: {
                id: true,
                username: true,
                email: true,
                fullName: true,
                role: true,
                isActive: true,
                lastLogin: true,
                createdAt: true,
                updatedAt: true
            }
        });
    }

    async updateUser(id, userData) {
        const updateData = { ...userData };

        // Hash password if provided
        if (userData.password) {
            updateData.passwordHash = await bcrypt.hash(userData.password, 10);
            delete updateData.password;
        }

        return await this.prisma.user.update({
            where: { id },
            data: updateData,
            select: {
                id: true,
                username: true,
                email: true,
                fullName: true,
                role: true,
                isActive: true,
                lastLogin: true,
                createdAt: true,
                updatedAt: true
            }
        });
    }

    async deleteUser(id) {
        return await this.prisma.user.delete({
            where: { id }
        });
    }

    async authenticateUser(username, password) {
        const user = await this.prisma.user.findFirst({
            where: {
                OR: [
                    { username: username },
                    { email: username }
                ],
                isActive: true
            }
        });

        if (!user) {
            return null;
        }

        const isValidPassword = await bcrypt.compare(password, user.passwordHash);
        if (!isValidPassword) {
            return null;
        }

        // Update last login
        await this.prisma.user.update({
            where: { id: user.id },
            data: { lastLogin: new Date() }
        });

        return {
            id: user.id,
            username: user.username,
            email: user.email,
            fullName: user.fullName,
            role: user.role,
            isActive: user.isActive
        };
    }

    // Activity Logging
    async logActivity(userId, activityType, action, description, severity = 'info', ipAddress = null, userAgent = null) {
        try {
            const { v4: uuidv4 } = require('uuid');
            await this.prisma.activityLog.create({
                data: {
                    id: uuidv4(),
                    userId,
                    activityType,
                    action,
                    description,
                    severity,
                    ipAddress,
                    userAgent,
                    createdAt: new Date()
                }
            });
        } catch (error) {
            console.error('Failed to log activity:', error);
        }
    }

    async getActivityLogs(limit = 50, offset = 0) {
        return await this.prisma.activityLog.findMany({
            take: limit,
            skip: offset,
            orderBy: { createdAt: 'desc' },
            include: {
                user: {
                    select: {
                        id: true,
                        username: true,
                        fullName: true,
                        role: true
                    }
                }
            }
        });
    }

    // Dashboard Stats
    async getDashboardStats() {
        const [
            totalUsers,
            totalBlogPosts,
            totalTestimonials,
            totalBenefits,
            totalFaqs,
            totalPricingPlans,
            recentActivity
        ] = await Promise.all([
            this.prisma.user.count(),
            this.prisma.blogPost.count(),
            this.prisma.testimonial.count(),
            this.prisma.benefit.count(),
            this.prisma.faq.count(),
            this.prisma.pricingPlan.count(),
            this.prisma.activityLog.count({
                where: {
                    createdAt: {
                        gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
                    }
                }
            })
        ]);

        return {
            totalUsers,
            totalBlogPosts,
            totalTestimonials,
            totalBenefits,
            totalFaqs,
            totalPricingPlans,
            recentActivity
        };
    }

    // Benefits Management
    async getBenefits() {
        return await this.prisma.benefit.findMany({
            orderBy: { orderIndex: 'asc' }
        });
    }

    async createBenefit(benefitData, userId) {
        return await this.prisma.benefit.create({
            data: {
                ...benefitData,
                createdById: userId,
                updatedById: userId
            }
        });
    }

    async updateBenefit(id, benefitData, userId) {
        return await this.prisma.benefit.update({
            where: { id },
            data: {
                ...benefitData,
                updatedById: userId
            }
        });
    }

    async deleteBenefit(id) {
        return await this.prisma.benefit.delete({
            where: { id }
        });
    }

    // Testimonials Management
    async getTestimonials() {
        const testimonials = await this.prisma.testimonial.findMany({
            orderBy: { orderIndex: 'asc' }
        });

        // Convert BigInt to Number for JSON serialization
        return testimonials.map(testimonial => ({
            ...testimonial,
            rating: testimonial.rating ? Number(testimonial.rating) : 5,
            orderIndex: testimonial.orderIndex ? Number(testimonial.orderIndex) : 0
        }));
    }

    async getTestimonialById(id) {
        const testimonial = await this.prisma.testimonial.findUnique({
            where: { id }
        });

        if (!testimonial) return null;

        // Convert BigInt to Number for JSON serialization
        return {
            ...testimonial,
            rating: testimonial.rating ? Number(testimonial.rating) : 5,
            orderIndex: testimonial.orderIndex ? Number(testimonial.orderIndex) : 0
        };
    }

    async createTestimonial(testimonialData, userId) {
        return await this.prisma.testimonial.create({
            data: {
                ...testimonialData,
                createdById: userId,
                updatedById: userId
            }
        });
    }

    async updateTestimonial(id, testimonialData, userId) {
        return await this.prisma.testimonial.update({
            where: { id },
            data: {
                ...testimonialData,
                updatedById: userId
            }
        });
    }

    async deleteTestimonial(id) {
        return await this.prisma.testimonial.delete({
            where: { id }
        });
    }

    // FAQs Management
    async getFAQs() {
        return await this.prisma.faq.findMany({
            orderBy: { orderIndex: 'asc' }
        });
    }

    async createFAQ(faqData, userId) {
        return await this.prisma.faq.create({
            data: {
                ...faqData,
                createdById: userId,
                updatedById: userId
            }
        });
    }

    async updateFAQ(id, faqData, userId) {
        return await this.prisma.faq.update({
            where: { id },
            data: {
                ...faqData,
                updatedById: userId
            }
        });
    }

    async deleteFAQ(id) {
        return await this.prisma.faq.delete({
            where: { id }
        });
    }

    // Pricing Plans Management
    async getPricingPlans() {
        const plans = await this.prisma.pricingPlan.findMany({
            orderBy: { orderIndex: 'asc' }
        });

        // Convert BigInt to Number for JSON serialization
        return plans.map(plan => ({
            ...plan,
            orderIndex: plan.orderIndex ? Number(plan.orderIndex) : 0
        }));
    }

    async createPricingPlan(planData, userId) {
        const plan = await this.prisma.pricingPlan.create({
            data: {
                ...planData,
                createdById: userId,
                updatedById: userId
            }
        });

        // Convert BigInt to Number for JSON serialization
        return {
            ...plan,
            orderIndex: plan.orderIndex ? Number(plan.orderIndex) : 0
        };
    }

    async updatePricingPlan(id, planData, userId) {
        try {
            console.log('Updating pricing plan:', { id, planData, userId });
            
            const plan = await this.prisma.pricingPlan.update({
                where: { id },
                data: {
                    ...planData,
                    updatedById: userId,
                    updatedAt: new Date()
                }
            });

            // Convert BigInt to Number for JSON serialization
            return {
                ...plan,
                orderIndex: plan.orderIndex ? Number(plan.orderIndex) : 0
            };
        } catch (error) {
            console.error('Error in updatePricingPlan:', error);
            console.error('Plan data received:', planData);
            console.error('Error code:', error.code);
            console.error('Error meta:', error.meta);
            throw error;
        }
    }

    async deletePricingPlan(id) {
        return await this.prisma.pricingPlan.delete({
            where: { id }
        });
    }

    // Blog Posts Management
    async getBlogPosts(status = null, limit = 50, offset = 0) {
        const where = status ? { status } : {};

        const posts = await this.prisma.blogPost.findMany({
            where,
            take: limit,
            skip: offset,
            orderBy: { createdAt: 'desc' },
            include: {
                createdBy: {
                    select: {
                        id: true,
                        username: true,
                        fullName: true
                    }
                }
            }
        });

        // Convert BigInt to Number for JSON serialization
        return posts.map(post => ({
            ...post,
            viewCount: post.viewCount ? Number(post.viewCount) : 0
        }));
    }

    async getBlogPostBySlug(slug) {
        return await this.prisma.blogPost.findUnique({
            where: { slug },
            include: {
                createdBy: {
                    select: {
                        id: true,
                        username: true,
                        fullName: true
                    }
                }
            }
        });
    }

    async createBlogPost(postData, userId) {
        const post = await this.prisma.blogPost.create({
            data: {
                ...postData,
                createdById: userId,
                updatedById: userId
            }
        });

        // Convert BigInt to Number for JSON serialization
        return {
            ...post,
            viewCount: post.viewCount ? Number(post.viewCount) : 0
        };
    }

    async updateBlogPost(id, postData, userId) {
        const post = await this.prisma.blogPost.update({
            where: { id },
            data: {
                ...postData,
                updatedById: userId
            }
        });

        // Convert BigInt to Number for JSON serialization
        return {
            ...post,
            viewCount: post.viewCount ? Number(post.viewCount) : 0
        };
    }

    async deleteBlogPost(id) {
        return await this.prisma.blogPost.delete({
            where: { id }
        });
    }

    // Settings Management
    async getSettings() {
        const settings = await this.prisma.setting.findMany();
        const settingsObj = {};
        settings.forEach(setting => {
            settingsObj[setting.settingKey] = setting.settingValue;
        });
        return settingsObj;
    }

    async updateSetting(key, value, userId) {
        return await this.prisma.setting.upsert({
            where: { settingKey: key },
            update: {
                settingValue: value,
                updatedById: userId
            },
            create: {
                settingKey: key,
                settingValue: value,
                updatedById: userId
            }
        });
    }

    // Analytics
    async trackVisitor(visitorData) {
        try {
            await this.prisma.visitorAnalytics.create({
                data: visitorData
            });
        } catch (error) {
            console.error('Failed to track visitor:', error);
        }
    }

    async trackWhatsAppInteraction(interactionData) {
        try {
            await this.prisma.whatsappInteraction.create({
                data: interactionData
            });
        } catch (error) {
            console.error('Failed to track WhatsApp interaction:', error);
        }
    }

    async createContactSubmission(submissionData) {
        return await this.prisma.contactSubmission.create({
            data: submissionData
        });
    }

    async getContactSubmissions(limit = 50, offset = 0) {
        return await this.prisma.contactSubmission.findMany({
            take: limit,
            skip: offset,
            orderBy: { createdAt: 'desc' }
        });
    }

    // User Permissions (placeholder - implement as needed)
    async getUserPermissions(userId) {
        return await this.prisma.userPermission.findMany({
            where: { userId }
        });
    }

    async setUserPermissions(userId, permissions) {
        // Delete existing permissions
        await this.prisma.userPermission.deleteMany({
            where: { userId }
        });

        // Create new permissions
        if (permissions && permissions.length > 0) {
            await this.prisma.userPermission.createMany({
                data: permissions.map(permission => ({
                    ...permission,
                    userId
                }))
            });
        }
    }

    // Website Content (placeholder - implement as needed)
    async getWebsiteContent(type) {
        return await this.prisma.websiteContent.findMany({
            where: { contentType: type }
        });
    }

    async updateWebsiteContent(type, key, content, userId) {
        return await this.prisma.websiteContent.upsert({
            where: {
                contentType_contentKey: {
                    contentType: type,
                    contentKey: key
                }
            },
            update: {
                ...content,
                updatedById: userId
            },
            create: {
                contentType: type,
                contentKey: key,
                ...content,
                createdById: userId,
                updatedById: userId
            }
        });
    }

    // SEO Settings (placeholder - implement as needed)
    async getSEOSettings(pageType, pageIdentifier = null) {
        return await this.prisma.seoSetting.findFirst({
            where: {
                pageType,
                pageIdentifier
            }
        });
    }

    async updateSEOSettings(pageType, seoData, userId, pageIdentifier = null) {
        return await this.prisma.seoSetting.upsert({
            where: {
                pageType_pageIdentifier: {
                    pageType,
                    pageIdentifier
                }
            },
            update: {
                ...seoData,
                updatedById: userId
            },
            create: {
                pageType,
                pageIdentifier,
                ...seoData,
                createdById: userId,
                updatedById: userId
            }
        });
    }

    // Device Authorization Management
    async isDeviceAuthorized(deviceFingerprint, ipAddress) {
        const device = await this.prisma.authorizedDevice.findFirst({
            where: {
                deviceFingerprint,
                isActive: true,
                OR: [
                    { ipAddress: ipAddress },
                    { ipAddress: null } // Allow devices with no IP restriction
                ]
            }
        });

        return !!device;
    }

    async getAllAuthorizedDevices() {
        return await this.prisma.authorizedDevice.findMany({
            orderBy: { lastAccess: 'desc' },
            include: {
                authorizedBy: {
                    select: {
                        username: true,
                        fullName: true
                    }
                }
            }
        });
    }

    async getAuthorizedDeviceById(id) {
        return await this.prisma.authorizedDevice.findUnique({
            where: { id },
            include: {
                authorizedBy: {
                    select: {
                        username: true,
                        fullName: true
                    }
                }
            }
        });
    }

    async authorizeDevice(deviceFingerprint, deviceName, ipAddress, description, authorizedById) {
        return await this.prisma.authorizedDevice.upsert({
            where: { deviceFingerprint },
            update: {
                deviceName,
                ipAddress,
                description,
                isActive: true,
                lastAccess: new Date(),
                authorizedById
            },
            create: {
                deviceFingerprint,
                deviceName,
                ipAddress,
                description,
                isActive: true,
                lastAccess: new Date(),
                authorizedById
            }
        });
    }

    async updateDeviceLastAccess(deviceFingerprint) {
        await this.prisma.authorizedDevice.updateMany({
            where: { deviceFingerprint },
            data: { lastAccess: new Date() }
        });
    }

    async revokeDeviceAuthorization(deviceId) {
        await this.prisma.authorizedDevice.update({
            where: { id: deviceId },
            data: { isActive: false }
        });
    }

    // Disconnect
    async disconnect() {
        await this.prisma.$disconnect();
    }
}

module.exports = DatabasePrisma;
