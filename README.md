# Language Baba - TEF Canada Preparation Platform

A comprehensive web platform for TEF Canada preparation with an integrated admin panel for content management.

## 🚀 Features

### Public Website
- **Homepage**: Modern landing page with course information
- **Blog System**: Dynamic blog posts with categories
- **Pricing Plans**: Flexible pricing management
- **Testimonials**: Customer feedback showcase
- **SEO Optimized**: Meta tags and structured data

### Admin Panel
- **Dashboard**: Analytics and overview
- **Content Management**: Blog posts, FAQs, benefits
- **Pricing Management**: Dynamic pricing plans
- **Testimonial Management**: Customer feedback system
- **User Management**: Role-based access control
- **Device Authorization**: Secure device management
- **Activity Logging**: Comprehensive audit trail

## 🛠️ Technology Stack

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Backend**: Node.js, Express.js
- **Database**: PostgreSQL (CockroachDB)
- **ORM**: Prisma
- **Authentication**: JWT tokens
- **Security**: Device fingerprinting, role-based access

## 📋 Prerequisites

- Node.js (v14 or higher)
- PostgreSQL database (CockroachDB recommended)
- npm or yarn

## 🔧 Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd language-baba-tef-canada
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   Create a `.env` file in the root directory:
   ```env
   DATABASE_URL=your_postgresql_connection_string
   JWT_SECRET=your_jwt_secret_key
   PORT=3000
   ```

4. **Set up the database**
   ```bash
   npx prisma db push
   npx prisma generate
   ```

5. **Start the server**
   ```bash
   npm start
   ```

## 🗄️ Database Setup

The application uses Prisma ORM with PostgreSQL. Key models include:

- **Users**: Admin users with role-based permissions
- **Blog Posts**: Dynamic blog content
- **Pricing Plans**: Flexible pricing management
- **Testimonials**: Customer feedback
- **Activity Logs**: Audit trail
- **Authorized Devices**: Device management

## 🔐 Security Features

- **JWT Authentication**: Secure token-based auth
- **Role-Based Access Control**: Superuser, Admin, Editor, Viewer roles
- **Device Authorization**: Device fingerprinting and IP restrictions
- **Activity Logging**: Comprehensive audit trail
- **Rate Limiting**: API protection
- **Password Hashing**: Secure password storage

## 📱 Admin Panel Access

### Default Superuser Account
- **Username**: `raj`
- **Password**: `admin123`
- **Role**: `superuser`

### Access Levels
- **Superuser**: Full access, can manage all users and devices
- **Admin**: Content management, user management (except superusers)
- **Editor**: Content editing only
- **Viewer**: Read-only access

## 🚀 Deployment

### Vercel (Recommended)
1. Connect your GitHub repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy automatically on push

### Manual Deployment
1. Build the project
2. Set up production environment variables
3. Deploy to your preferred hosting platform

## 📁 Project Structure

```
├── admin.html              # Admin panel interface
├── admin-script.js          # Admin panel JavaScript
├── admin-style.css         # Admin panel styles
├── blog.html               # Blog page
├── blog-script.js          # Blog functionality
├── blog-style.css          # Blog styles
├── index.html              # Main website
├── privacy.html            # Privacy policy
├── script.js               # Main website JavaScript
├── server.js               # Express server
├── database-prisma.js      # Database operations
├── style.css               # Main website styles
├── prisma/
│   ├── schema.prisma       # Database schema
│   ├── client.js           # Prisma client
│   └── seed.js             # Database seeding
├── public/                 # Static assets
└── package.json            # Dependencies
```

## 🔧 Configuration

### Environment Variables
- `DATABASE_URL`: PostgreSQL connection string
- `JWT_SECRET`: Secret key for JWT tokens
- `PORT`: Server port (default: 3000)

### Database Configuration
The application uses CockroachDB (PostgreSQL-compatible) with the following features:
- UUID primary keys
- Timestamp tracking
- Soft deletes
- Activity logging

## 📊 API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user

### Content Management
- `GET /api/blog` - Get blog posts
- `POST /api/blog` - Create blog post
- `PUT /api/blog/:id` - Update blog post
- `DELETE /api/blog/:id` - Delete blog post

### Admin Management
- `GET /api/admin/users` - Get admin users
- `POST /api/admin/users` - Create admin user
- `PUT /api/admin/users/:id` - Update admin user
- `DELETE /api/admin/users/:id` - Delete admin user

### Device Management
- `GET /api/admin/devices` - Get authorized devices
- `POST /api/admin/devices` - Authorize device
- `DELETE /api/admin/devices/:id` - Revoke device

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is proprietary software. All rights reserved.

## 🆘 Support

For support and questions, please contact the development team.

---

**Language Baba** - Empowering TEF Canada success through quality education and innovative technology.