const { prisma } = require('./prisma/client');

async function removeAdminUser() {
    try {
        console.log('🔍 Looking for user with username "admin"...');
        
        // Find the user first
        const user = await prisma.user.findFirst({
            where: {
                username: 'admin'
            }
        });
        
        if (!user) {
            console.log('❌ No user found with username "admin"');
            return;
        }
        
        console.log('👤 Found user:', {
            id: user.id,
            username: user.username,
            email: user.email,
            fullName: user.fullName,
            role: user.role,
            isActive: user.isActive
        });
        
        // Confirm deletion
        console.log('⚠️  WARNING: This will permanently delete the admin user and all related data!');
        console.log('📋 User details:');
        console.log(`   - ID: ${user.id}`);
        console.log(`   - Username: ${user.username}`);
        console.log(`   - Email: ${user.email}`);
        console.log(`   - Full Name: ${user.fullName}`);
        console.log(`   - Role: ${user.role}`);
        
        // Delete user permissions first (due to foreign key constraints)
        console.log('🗑️  Deleting user permissions...');
        const deletedPermissions = await prisma.userPermission.deleteMany({
            where: {
                userId: user.id
            }
        });
        console.log(`✅ Deleted ${deletedPermissions.count} permission records`);
        
        // Delete activity logs created by this user
        console.log('🗑️  Deleting activity logs...');
        const deletedLogs = await prisma.activityLog.deleteMany({
            where: {
                userId: user.id
            }
        });
        console.log(`✅ Deleted ${deletedLogs.count} activity log records`);
        
        // Delete authorized devices created by this user
        console.log('🗑️  Deleting authorized devices...');
        const deletedDevices = await prisma.authorizedDevice.deleteMany({
            where: {
                authorizedById: user.id
            }
        });
        console.log(`✅ Deleted ${deletedDevices.count} authorized device records`);
        
        // Update pricing plans to remove references to this user
        console.log('🔄 Updating pricing plans...');
        const updatedPricingPlans = await prisma.pricingPlan.updateMany({
            where: {
                OR: [
                    { createdById: user.id },
                    { updatedById: user.id }
                ]
            },
            data: {
                createdById: null,
                updatedById: null
            }
        });
        console.log(`✅ Updated ${updatedPricingPlans.count} pricing plan records`);
        
        // Update testimonials to remove references to this user
        console.log('🔄 Updating testimonials...');
        const updatedTestimonials = await prisma.testimonial.updateMany({
            where: {
                OR: [
                    { createdById: user.id },
                    { updatedById: user.id }
                ]
            },
            data: {
                createdById: null,
                updatedById: null
            }
        });
        console.log(`✅ Updated ${updatedTestimonials.count} testimonial records`);
        
        // Update blog posts to remove references to this user
        console.log('🔄 Updating blog posts...');
        const updatedBlogPosts = await prisma.blogPost.updateMany({
            where: {
                OR: [
                    { createdById: user.id },
                    { updatedById: user.id }
                ]
            },
            data: {
                createdById: null,
                updatedById: null
            }
        });
        console.log(`✅ Updated ${updatedBlogPosts.count} blog post records`);
        
        // Finally delete the user
        console.log('🗑️  Deleting user...');
        const deletedUser = await prisma.user.delete({
            where: {
                id: user.id
            }
        });
        
        console.log('✅ Successfully deleted admin user!');
        console.log('📋 Deleted user details:', {
            id: deletedUser.id,
            username: deletedUser.username,
            email: deletedUser.email,
            fullName: deletedUser.fullName,
            role: deletedUser.role
        });
        
    } catch (error) {
        console.error('❌ Error deleting admin user:', error);
    } finally {
        await prisma.$disconnect();
    }
}

// Run the function
removeAdminUser();
