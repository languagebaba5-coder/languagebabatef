// Express server for Language Baba Admin Panel API
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const jwt = require('jsonwebtoken');
const path = require('path');
const DatabasePrisma = require('./database-prisma');
require('dotenv').config();

// Add BigInt serializer for JSON responses
BigInt.prototype.toJSON = function() {
    return Number(this);
};

// Fallback connection string if .env is not loaded
if (!process.env.DATABASE_URL) {
    process.env.DATABASE_URL = 'postgresql://vastwk-lbaba:Coj7AuGwucMXC4FF_LQzww@languagebaba-16817.j77.cockroachlabs.cloud:26257/defaultdb?sslmode=verify-full';
}

const app = express();
const db = new DatabasePrisma();

// Middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'", "'unsafe-inline'"],
            scriptSrcAttr: ["'unsafe-inline'"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'"],
            fontSrc: ["'self'", "https:", "data:"],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"],
            frameSrc: ["'none'"],
        },
    },
}));
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve static files
app.use(express.static('.'));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 200 // limit each IP to 200 requests per windowMs (reasonable for admin usage)
});
app.use('/api/', limiter);

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Authentication middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Invalid or expired token' });
        }
        req.user = user;
        next();
    });
};

// Permission middleware
const checkPermission = (permission, action) => {
    return async (req, res, next) => {
        try {
            const permissions = await db.getUserPermissions(req.user.id);
            const userPermission = permissions.find(p => p.permissionType === permission);
            
            if (!userPermission || !userPermission[`can${action.charAt(0).toUpperCase() + action.slice(1)}`]) {
                return res.status(403).json({ error: `Insufficient permissions for ${action} on ${permission}` });
            }
            
            next();
        } catch (error) {
            res.status(500).json({ error: 'Permission check failed' });
        }
    };
};

// Device Authorization Middleware
const checkDeviceAuthorization = async (req, res, next) => {
    try {
        // Skip device check for login endpoint and auth verification
        if (req.path === '/api/auth/login' || req.path === '/api/auth/me') {
            return next();
        }

        // Get device fingerprint from headers
        const deviceFingerprint = req.headers['x-device-fingerprint'];
        const userAgent = req.headers['user-agent'];
        const ipAddress = req.ip || req.connection.remoteAddress || req.socket.remoteAddress;
        
        if (!deviceFingerprint) {
            return res.status(403).json({ 
                error: 'Device not authorized', 
                message: 'Device fingerprint required. Please contact administrator to authorize this device.' 
            });
        }

        // Check if device is authorized
        const isAuthorized = await db.isDeviceAuthorized(deviceFingerprint, ipAddress);
        
        if (!isAuthorized) {
            // Log unauthorized access attempt
            await db.logActivity(null, 'security', 'Unauthorized device access attempt', 
                `Unauthorized device: ${deviceFingerprint} from IP: ${ipAddress}`, 'warning');
            
            return res.status(403).json({ 
                error: 'Device not authorized', 
                message: 'This device is not authorized to access the admin panel. Please contact administrator.' 
            });
        }

        // Update last access time for authorized device
        await db.updateDeviceLastAccess(deviceFingerprint);
        
        next();
    } catch (error) {
        console.error('Device authorization error:', error);
        res.status(500).json({ error: 'Device authorization check failed' });
    }
};

// Routes

// Authentication
app.post('/api/auth/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password required' });
        }

        const user = await db.authenticateUser(username, password);
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Update last login
        await db.updateUser(user.id, { lastLogin: new Date() });

        // Generate JWT token
        const token = jwt.sign(
            { 
                id: user.id, 
                username: user.username, 
                role: user.role 
            },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        // Log activity
        await db.logActivity(user.id, 'system', 'User login', 'Successful login', 'info', req.ip, req.get('User-Agent'));

        res.json({
            token,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                full_name: user.full_name,
                role: user.role
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
});

// Get current user
app.get('/api/auth/me', authenticateToken, async (req, res) => {
    try {
        const user = await db.getUserById(req.user.id);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const permissions = await db.getUserPermissions(user.id);
        
        res.json({
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                full_name: user.full_name,
                role: user.role,
                last_login: user.last_login
            },
            permissions
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to get user info' });
    }
});

// Dashboard
app.get('/api/dashboard/stats', authenticateToken, async (req, res) => {
    try {
        const stats = await db.getDashboardStats();
        res.json(stats);
    } catch (error) {
        res.status(500).json({ error: 'Failed to get dashboard stats' });
    }
});

// Activity Logs
app.get('/api/activity-logs', authenticateToken, checkPermission('users', 'read'), async (req, res) => {
    try {
        const { limit = 50, offset = 0 } = req.query;
        const logs = await db.getActivityLogs(parseInt(limit), parseInt(offset));
        res.json(logs);
    } catch (error) {
        res.status(500).json({ error: 'Failed to get activity logs' });
    }
});

// User Management
app.get('/api/users', authenticateToken, checkPermission('users', 'read'), async (req, res) => {
    try {
        const users = await db.getAllUsers();
        res.json(users);
    } catch (error) {
        res.status(500).json({ error: 'Failed to get users' });
    }
});

app.post('/api/users', authenticateToken, checkPermission('users', 'create'), async (req, res) => {
    try {
        const user = await db.createUser(req.body);
        await db.logActivity(req.user.id, 'users', 'User created', `User "${user.username}" created`, 'success');
        res.json(user);
    } catch (error) {
        res.status(500).json({ error: 'Failed to create user' });
    }
});

app.put('/api/users/:id', authenticateToken, checkPermission('users', 'write'), async (req, res) => {
    try {
        const user = await db.updateUser(req.params.id, req.body);
        await db.logActivity(req.user.id, 'users', 'User updated', `User "${user.username}" updated`, 'info');
        res.json(user);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update user' });
    }
});

app.delete('/api/users/:id', authenticateToken, checkPermission('users', 'delete'), async (req, res) => {
    try {
        await db.deleteUser(req.params.id);
        await db.logActivity(req.user.id, 'users', 'User deleted', `User ID ${req.params.id} deleted`, 'warning');
        res.json({ message: 'User deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete user' });
    }
});

// User Permissions
app.get('/api/users/:id/permissions', authenticateToken, checkPermission('users', 'read'), async (req, res) => {
    try {
        const permissions = await db.getUserPermissions(req.params.id);
        res.json(permissions);
    } catch (error) {
        res.status(500).json({ error: 'Failed to get user permissions' });
    }
});

app.put('/api/users/:id/permissions', authenticateToken, checkPermission('users', 'write'), async (req, res) => {
    try {
        await db.setUserPermissions(req.params.id, req.body);
        await db.logActivity(req.user.id, 'users', 'Permissions updated', `Permissions updated for user ID ${req.params.id}`, 'info');
        res.json({ message: 'Permissions updated successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update permissions' });
    }
});

// Admin Management Routes
app.get('/api/admin/users', checkDeviceAuthorization, authenticateToken, checkPermission('users', 'read'), async (req, res) => {
    try {
        const users = await db.getAllUsers();
        res.json(users);
    } catch (error) {
        res.status(500).json({ error: 'Failed to get admin users' });
    }
});

app.post('/api/admin/users', checkDeviceAuthorization, authenticateToken, checkPermission('users', 'create'), async (req, res) => {
    try {
        const { username, email, fullName, role, password } = req.body;
        
        // Validate required fields
        if (!username || !email || !fullName || !role || !password) {
            return res.status(400).json({ error: 'All fields are required' });
        }

        // Check if user already exists
        const existingUser = await db.getUserByEmail(email);
        if (existingUser) {
            return res.status(400).json({ error: 'User with this email already exists' });
        }

        const user = await db.createUser({
            username,
            email,
            fullName,
            role,
            password
        });
        
        await db.logActivity(req.user.id, 'users', 'Admin user created', `Created admin user: ${username}`, 'info');
        res.status(201).json(user);
    } catch (error) {
        res.status(500).json({ error: 'Failed to create admin user' });
    }
});

app.get('/api/admin/users/:id', checkDeviceAuthorization, authenticateToken, checkPermission('users', 'read'), async (req, res) => {
    try {
        const user = await db.getUserById(req.params.id);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json(user);
    } catch (error) {
        res.status(500).json({ error: 'Failed to get user' });
    }
});

app.put('/api/admin/users/:id', checkDeviceAuthorization, authenticateToken, checkPermission('users', 'write'), async (req, res) => {
    try {
        const { username, email, fullName, role, isActive, password } = req.body;
        
        // Get the target user being updated
        const targetUser = await db.getUserById(req.params.id);
        if (!targetUser) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Get the current user's role from database to ensure accuracy
        const currentUser = await db.getUserById(req.user.id);
        if (!currentUser) {
            return res.status(404).json({ error: 'Current user not found' });
        }

        // Define role hierarchy (higher number = higher privilege)
        const roleHierarchy = {
            'viewer': 1,
            'editor': 2,
            'admin': 3,
            'superuser': 4
        };

        // Prevent users from elevating their own role to a higher privilege level
        if (req.params.id === req.user.id && role && currentUser.role !== 'superuser') {
            const currentRoleLevel = roleHierarchy[currentUser.role] || 0;
            const targetRoleLevel = roleHierarchy[role] || 0;
            
            if (targetRoleLevel > currentRoleLevel) {
                return res.status(403).json({ 
                    error: `Cannot elevate your own role from ${currentUser.role} to ${role}. Only superusers can promote users to higher roles.` 
                });
            }
        }

        // Prevent non-superusers from modifying superusers
        if (targetUser.role === 'superuser' && currentUser.role !== 'superuser') {
            return res.status(403).json({ error: 'Insufficient permissions to modify superuser' });
        }

        // Prevent changing superuser role to non-superuser
        if (targetUser.role === 'superuser' && role && role !== 'superuser') {
            return res.status(400).json({ error: 'Cannot change superuser role' });
        }

        // Prevent deactivating superuser
        if (targetUser.role === 'superuser' && isActive === false) {
            return res.status(400).json({ error: 'Cannot deactivate superuser' });
        }
        
        const updateData = {
            username,
            email,
            fullName,
            role,
            isActive
        };

        // Only update password if provided
        if (password) {
            updateData.password = password;
        }

        const user = await db.updateUser(req.params.id, updateData);
        await db.logActivity(req.user.id, 'users', 'Admin user updated', `Updated admin user: ${username}`, 'info');
        res.json(user);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update admin user' });
    }
});

app.delete('/api/admin/users/:id', checkDeviceAuthorization, authenticateToken, checkPermission('users', 'delete'), async (req, res) => {
    try {
        const user = await db.getUserById(req.params.id);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Get the current user's role from database to ensure accuracy
        const currentUser = await db.getUserById(req.user.id);
        if (!currentUser) {
            return res.status(404).json({ error: 'Current user not found' });
        }

        // Prevent non-superusers from deleting superusers
        if (user.role === 'superuser' && currentUser.role !== 'superuser') {
            return res.status(403).json({ error: 'Insufficient permissions to delete superuser' });
        }

        // Prevent deletion of superuser (even by superusers for safety)
        if (user.role === 'superuser') {
            return res.status(400).json({ error: 'Cannot delete superuser' });
        }

        await db.deleteUser(req.params.id);
        await db.logActivity(req.user.id, 'users', 'Admin user deleted', `Deleted admin user: ${user.username}`, 'warning');
        res.json({ message: 'User deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete admin user' });
    }
});

app.patch('/api/admin/users/:id/toggle', checkDeviceAuthorization, authenticateToken, checkPermission('users', 'write'), async (req, res) => {
    try {
        const { isActive } = req.body;
        const user = await db.getUserById(req.params.id);
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Get the current user's role from database to ensure accuracy
        const currentUser = await db.getUserById(req.user.id);
        if (!currentUser) {
            return res.status(404).json({ error: 'Current user not found' });
        }

        // Prevent non-superusers from modifying superuser status
        if (user.role === 'superuser' && currentUser.role !== 'superuser') {
            return res.status(403).json({ error: 'Insufficient permissions to modify superuser status' });
        }

        // Prevent deactivating superuser
        if (user.role === 'superuser' && !isActive) {
            return res.status(400).json({ error: 'Cannot deactivate superuser' });
        }

        const updatedUser = await db.updateUser(req.params.id, { isActive });
        await db.logActivity(req.user.id, 'users', 'Admin status toggled', `Admin user ${user.username} ${isActive ? 'activated' : 'deactivated'}`, 'info');
        res.json(updatedUser);
    } catch (error) {
        res.status(500).json({ error: 'Failed to toggle admin status' });
    }
});

// Device Management Routes (Superuser only)
app.get('/api/admin/devices', checkDeviceAuthorization, authenticateToken, checkPermission('users', 'read'), async (req, res) => {
    try {
        // Only superusers can manage devices
        const currentUser = await db.getUserById(req.user.id);
        if (currentUser.role !== 'superuser') {
            return res.status(403).json({ error: 'Only superusers can manage devices' });
        }

        const devices = await db.getAllAuthorizedDevices();
        res.json(devices);
    } catch (error) {
        res.status(500).json({ error: 'Failed to get authorized devices' });
    }
});

app.post('/api/admin/devices', checkDeviceAuthorization, authenticateToken, checkPermission('users', 'create'), async (req, res) => {
    try {
        // Only superusers can authorize devices
        const currentUser = await db.getUserById(req.user.id);
        if (currentUser.role !== 'superuser') {
            return res.status(403).json({ error: 'Only superusers can authorize devices' });
        }

        const { deviceFingerprint, deviceName, ipAddress, description } = req.body;
        
        if (!deviceFingerprint) {
            return res.status(400).json({ error: 'Device fingerprint is required' });
        }

        const device = await db.authorizeDevice(deviceFingerprint, deviceName, ipAddress, description, req.user.id);
        await db.logActivity(req.user.id, 'security', 'Device authorized', `Authorized device: ${deviceName || deviceFingerprint}`, 'info');
        
        res.status(201).json(device);
    } catch (error) {
        res.status(500).json({ error: 'Failed to authorize device' });
    }
});

app.delete('/api/admin/devices/:id', checkDeviceAuthorization, authenticateToken, checkPermission('users', 'delete'), async (req, res) => {
    try {
        // Only superusers can revoke device authorization
        const currentUser = await db.getUserById(req.user.id);
        if (currentUser.role !== 'superuser') {
            return res.status(403).json({ error: 'Only superusers can revoke device authorization' });
        }

        const device = await db.getAuthorizedDeviceById(req.params.id);
        if (!device) {
            return res.status(404).json({ error: 'Device not found' });
        }

        await db.revokeDeviceAuthorization(req.params.id);
        await db.logActivity(req.user.id, 'security', 'Device authorization revoked', `Revoked authorization for device: ${device.deviceName || device.deviceFingerprint}`, 'warning');
        
        res.json({ message: 'Device authorization revoked successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to revoke device authorization' });
    }
});

// Website Content
app.get('/api/content', authenticateToken, checkPermission('content', 'read'), async (req, res) => {
    try {
        const { type } = req.query;
        const content = await db.getWebsiteContent(type);
        res.json(content);
    } catch (error) {
        res.status(500).json({ error: 'Failed to get content' });
    }
});

app.put('/api/content/:type/:key', authenticateToken, checkPermission('content', 'write'), async (req, res) => {
    try {
        const content = await db.updateWebsiteContent(req.params.type, req.params.key, req.body, req.user.id);
        await db.logActivity(req.user.id, 'content', 'Content updated', `${req.params.type}/${req.params.key} updated`, 'info');
        res.json(content);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update content' });
    }
});

// Benefits Management
app.get('/api/benefits', authenticateToken, checkPermission('content', 'read'), async (req, res) => {
    try {
        const benefits = await db.getBenefits();
        res.json(benefits);
    } catch (error) {
        res.status(500).json({ error: 'Failed to get benefits' });
    }
});

app.post('/api/benefits', authenticateToken, checkPermission('content', 'create'), async (req, res) => {
    try {
        const benefit = await db.createBenefit(req.body, req.user.id);
        await db.logActivity(req.user.id, 'content', 'Benefit created', `"${benefit.title}" created`, 'success');
        res.json(benefit);
    } catch (error) {
        res.status(500).json({ error: 'Failed to create benefit' });
    }
});

app.put('/api/benefits/:id', authenticateToken, checkPermission('content', 'write'), async (req, res) => {
    try {
        const benefit = await db.updateBenefit(req.params.id, req.body, req.user.id);
        await db.logActivity(req.user.id, 'content', 'Benefit updated', `"${benefit.title}" updated`, 'info');
        res.json(benefit);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update benefit' });
    }
});

app.delete('/api/benefits/:id', authenticateToken, checkPermission('content', 'delete'), async (req, res) => {
    try {
        await db.deleteBenefit(req.params.id);
        await db.logActivity(req.user.id, 'content', 'Benefit deleted', `Benefit ID ${req.params.id} deleted`, 'warning');
        res.json({ message: 'Benefit deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete benefit' });
    }
});

// Testimonials Management
app.get('/api/testimonials', authenticateToken, checkPermission('content', 'read'), async (req, res) => {
    try {
        const testimonials = await db.getTestimonials();
        res.json(testimonials);
    } catch (error) {
        res.status(500).json({ error: 'Failed to get testimonials' });
    }
});

app.get('/api/testimonials/:id', authenticateToken, checkPermission('content', 'read'), async (req, res) => {
    try {
        const testimonial = await db.getTestimonialById(req.params.id);
        if (!testimonial) {
            return res.status(404).json({ error: 'Testimonial not found' });
        }
        res.json(testimonial);
    } catch (error) {
        res.status(500).json({ error: 'Failed to get testimonial' });
    }
});

app.post('/api/testimonials', authenticateToken, checkPermission('content', 'create'), async (req, res) => {
    try {
        const testimonial = await db.createTestimonial(req.body, req.user.id);
        await db.logActivity(req.user.id, 'content', 'Testimonial created', `"${testimonial.name}" testimonial created`, 'success');
        res.json(testimonial);
    } catch (error) {
        res.status(500).json({ error: 'Failed to create testimonial' });
    }
});

app.put('/api/testimonials/:id', authenticateToken, checkPermission('content', 'write'), async (req, res) => {
    try {
        const testimonial = await db.updateTestimonial(req.params.id, req.body, req.user.id);
        await db.logActivity(req.user.id, 'content', 'Testimonial updated', `"${testimonial.name}" testimonial updated`, 'info');
        res.json(testimonial);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update testimonial' });
    }
});

app.delete('/api/testimonials/:id', authenticateToken, checkPermission('content', 'delete'), async (req, res) => {
    try {
        await db.deleteTestimonial(req.params.id);
        await db.logActivity(req.user.id, 'content', 'Testimonial deleted', `Testimonial ID ${req.params.id} deleted`, 'warning');
        res.json({ message: 'Testimonial deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete testimonial' });
    }
});

// FAQ Management
app.get('/api/faqs', authenticateToken, checkPermission('content', 'read'), async (req, res) => {
    try {
        const faqs = await db.getFAQs();
        res.json(faqs);
    } catch (error) {
        res.status(500).json({ error: 'Failed to get FAQs' });
    }
});

app.post('/api/faqs', authenticateToken, checkPermission('content', 'create'), async (req, res) => {
    try {
        const faq = await db.createFAQ(req.body, req.user.id);
        await db.logActivity(req.user.id, 'content', 'FAQ created', `"${faq.question}" FAQ created`, 'success');
        res.json(faq);
    } catch (error) {
        res.status(500).json({ error: 'Failed to create FAQ' });
    }
});

app.put('/api/faqs/:id', authenticateToken, checkPermission('content', 'write'), async (req, res) => {
    try {
        const faq = await db.updateFAQ(req.params.id, req.body, req.user.id);
        await db.logActivity(req.user.id, 'content', 'FAQ updated', `"${faq.question}" FAQ updated`, 'info');
        res.json(faq);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update FAQ' });
    }
});

app.delete('/api/faqs/:id', authenticateToken, checkPermission('content', 'delete'), async (req, res) => {
    try {
        await db.deleteFAQ(req.params.id);
        await db.logActivity(req.user.id, 'content', 'FAQ deleted', `FAQ ID ${req.params.id} deleted`, 'warning');
        res.json({ message: 'FAQ deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete FAQ' });
    }
});

// Pricing Plans Management
app.get('/api/pricing-plans', authenticateToken, checkPermission('pricing', 'read'), async (req, res) => {
    try {
        const plans = await db.getPricingPlans();
        res.json(plans);
    } catch (error) {
        res.status(500).json({ error: 'Failed to get pricing plans' });
    }
});

app.post('/api/pricing-plans', authenticateToken, checkPermission('pricing', 'create'), async (req, res) => {
    try {
        const plan = await db.createPricingPlan(req.body, req.user.id);
        await db.logActivity(req.user.id, 'pricing', 'Pricing plan created', `"${plan.title}" plan created`, 'success');
        res.json(plan);
    } catch (error) {
        res.status(500).json({ error: 'Failed to create pricing plan' });
    }
});

app.put('/api/pricing-plans/:id', authenticateToken, checkPermission('pricing', 'write'), async (req, res) => {
    try {
        const plan = await db.updatePricingPlan(req.params.id, req.body, req.user.id);
        await db.logActivity(req.user.id, 'pricing', 'Pricing plan updated', `"${plan.title}" plan updated`, 'info');
        res.json(plan);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update pricing plan' });
    }
});

app.delete('/api/pricing-plans/:id', authenticateToken, checkPermission('pricing', 'delete'), async (req, res) => {
    try {
        await db.deletePricingPlan(req.params.id);
        await db.logActivity(req.user.id, 'pricing', 'Pricing plan deleted', `Plan ID ${req.params.id} deleted`, 'warning');
        res.json({ message: 'Pricing plan deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete pricing plan' });
    }
});

// Blog Posts - Public endpoint for published posts
app.get('/api/blog-posts', async (req, res) => {
    try {
        console.log('Blog posts API called');
        const { status = 'published', limit = 50, offset = 0 } = req.query;
        console.log('Query params:', { status, limit, offset });
        
        // Only allow published posts for public access
        const posts = await db.getBlogPosts('published', parseInt(limit), parseInt(offset));
        console.log('Posts retrieved:', posts.length);
        res.json(posts);
    } catch (error) {
        console.error('Error in blog posts API:', error);
        res.status(500).json({ error: 'Failed to get blog posts', details: error.message });
    }
});

// Testimonials - Public endpoint for main website
app.get('/api/public/testimonials', async (req, res) => {
    try {
        console.log('Public testimonials API called');
        const testimonials = await db.getTestimonials();
        console.log('Testimonials retrieved:', testimonials.length);
        res.json(testimonials);
    } catch (error) {
        console.error('Error in public testimonials API:', error);
        res.status(500).json({ error: 'Failed to get testimonials', details: error.message });
    }
});

// Blog Posts - Admin endpoint (requires authentication)
app.get('/api/admin/blog-posts', authenticateToken, checkPermission('blog', 'read'), async (req, res) => {
    try {
        console.log('Admin blog posts API called');
        const { status, limit = 50, offset = 0 } = req.query;
        console.log('Query params:', { status, limit, offset });
        
        const posts = await db.getBlogPosts(status, parseInt(limit), parseInt(offset));
        console.log('Posts retrieved:', posts.length);
        res.json(posts);
    } catch (error) {
        console.error('Error in admin blog posts API:', error);
        res.status(500).json({ error: 'Failed to get blog posts', details: error.message });
    }
});

app.get('/api/blog-posts/:slug', async (req, res) => {
    try {
        const post = await db.getBlogPostBySlug(req.params.slug);
        if (!post) {
            return res.status(404).json({ error: 'Post not found' });
        }
        res.json(post);
    } catch (error) {
        res.status(500).json({ error: 'Failed to get blog post' });
    }
});

app.post('/api/blog-posts', authenticateToken, checkPermission('blog', 'create'), async (req, res) => {
    try {
        const post = await db.createBlogPost(req.body, req.user.id);
        await db.logActivity(req.user.id, 'blog', 'Blog post created', `"${post.title}" created`, 'success');
        res.json(post);
    } catch (error) {
        res.status(500).json({ error: 'Failed to create blog post' });
    }
});

app.put('/api/blog-posts/:id', authenticateToken, checkPermission('blog', 'write'), async (req, res) => {
    try {
        const post = await db.updateBlogPost(req.params.id, req.body, req.user.id);
        await db.logActivity(req.user.id, 'blog', 'Blog post updated', `"${post.title}" updated`, 'info');
        res.json(post);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update blog post' });
    }
});

app.delete('/api/blog-posts/:id', authenticateToken, checkPermission('blog', 'delete'), async (req, res) => {
    try {
        await db.deleteBlogPost(req.params.id);
        await db.logActivity(req.user.id, 'blog', 'Blog post deleted', `Post ID ${req.params.id} deleted`, 'warning');
        res.json({ message: 'Blog post deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete blog post' });
    }
});

// SEO Settings
app.get('/api/seo/:pageType', authenticateToken, checkPermission('seo', 'read'), async (req, res) => {
    try {
        const { pageIdentifier } = req.query;
        const seo = await db.getSEOSettings(req.params.pageType, pageIdentifier);
        res.json(seo);
    } catch (error) {
        res.status(500).json({ error: 'Failed to get SEO settings' });
    }
});

app.put('/api/seo/:pageType', authenticateToken, checkPermission('seo', 'write'), async (req, res) => {
    try {
        const { pageIdentifier } = req.query;
        const seo = await db.updateSEOSettings(req.params.pageType, req.body, req.user.id, pageIdentifier);
        await db.logActivity(req.user.id, 'seo', 'SEO updated', `${req.params.pageType} SEO updated`, 'info');
        res.json(seo);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update SEO settings' });
    }
});

// Settings
app.get('/api/settings', authenticateToken, checkPermission('settings', 'read'), async (req, res) => {
    try {
        const settings = await db.getSettings();
        res.json(settings);
    } catch (error) {
        res.status(500).json({ error: 'Failed to get settings' });
    }
});

app.put('/api/settings/:key', authenticateToken, checkPermission('settings', 'write'), async (req, res) => {
    try {
        const setting = await db.updateSetting(req.params.key, req.body.value, req.user.id);
        await db.logActivity(req.user.id, 'settings', 'Setting updated', `${req.params.key} updated`, 'info');
        res.json(setting);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update setting' });
    }
});

// Analytics
app.post('/api/analytics/track', async (req, res) => {
    try {
        await db.trackVisitor(req.body);
        res.json({ message: 'Visitor tracked successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to track visitor' });
    }
});

app.get('/api/analytics', authenticateToken, checkPermission('settings', 'read'), async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        const analytics = await db.getAnalytics(startDate, endDate);
        res.json(analytics);
    } catch (error) {
        res.status(500).json({ error: 'Failed to get analytics' });
    }
});

// Contact Submissions
app.post('/api/contact', async (req, res) => {
    try {
        const submission = await db.createContactSubmission(req.body);
        res.json(submission);
    } catch (error) {
        res.status(500).json({ error: 'Failed to submit contact form' });
    }
});

app.get('/api/contact-submissions', authenticateToken, checkPermission('settings', 'read'), async (req, res) => {
    try {
        const { limit = 50, offset = 0 } = req.query;
        const submissions = await db.getContactSubmissions(parseInt(limit), parseInt(offset));
        res.json(submissions);
    } catch (error) {
        res.status(500).json({ error: 'Failed to get contact submissions' });
    }
});

// WhatsApp Interactions
app.post('/api/whatsapp/track', async (req, res) => {
    try {
        await db.trackWhatsAppInteraction(req.body);
        res.json({ message: 'WhatsApp interaction tracked successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to track WhatsApp interaction' });
    }
});

// Database Inspection APIs - using Prisma instead of raw queries

// Raw query endpoint removed - using Prisma ORM instead

app.get('/api/database-stats', async (req, res) => {
    try {
        const stats = await db.getDashboardStats();
        res.json(stats);
    } catch (error) {
        res.status(500).json({ error: 'Failed to get database stats' });
    }
});

// Serve HTML files
app.get('*.html', (req, res) => {
    res.sendFile(path.join(__dirname, req.path));
});

// Catch-all route for non-API requests
app.get('*', (req, res) => {
    if (req.path.startsWith('/api/')) {
        return res.status(404).json({ error: 'API endpoint not found' });
    }
    res.sendFile(path.join(__dirname, req.path));
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Route not found' });
});

// Start server
const PORT = process.env.PORT || 3000;

async function startServer() {
    try {
        // Test Prisma connection
        await db.prisma.$connect();
        console.log('Prisma connected successfully');
        
        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
            console.log(`Database connected successfully`);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

startServer();

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('Shutting down gracefully...');
    await db.disconnect();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('Shutting down gracefully...');
    await db.disconnect();
    process.exit(0);
});

module.exports = app;
