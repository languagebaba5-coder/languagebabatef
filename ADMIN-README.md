# Language Baba Admin Panel

This admin panel allows you to manage your Language Baba website content, blog posts, and SEO settings.

## Features

### 🎛️ Dashboard
- View website statistics
- Monitor recent activity
- Quick overview of content

### 📝 Content Management
- **Hero Section**: Update main title, subtitle, description, and stats
- **Benefits**: Add, edit, or delete benefit cards
- **Testimonials**: Manage customer testimonials
- **FAQ**: Add or modify frequently asked questions

### 💰 Pricing Section
- Manage pricing plans and programs
- Update prices, features, and descriptions
- Add new pricing tiers

### 📚 Blog Management
- Create and publish blog posts
- Organize posts by categories
- Manage post status (draft/published)
- Rich text content editor

### 🔍 SEO Management
- Update page titles and meta descriptions
- Manage keywords for better search visibility
- Configure Open Graph and Twitter Card settings
- Character count indicators for optimal SEO

### ⚙️ Settings
- Update contact information
- Manage WhatsApp number
- Export/import data
- Clear all data (with confirmation)

## How to Use

### Accessing the Admin Panel
1. Open `admin.html` in your web browser
2. The admin panel will load with your current website data

### Managing Content
1. Navigate to the desired section using the sidebar
2. Make your changes in the forms
3. Click "Save Changes" to update the website
4. Changes are automatically applied to the main website

### Creating Blog Posts
1. Go to "Blog Management" section
2. Click "Create New Post"
3. Fill in the post details:
   - Title (required)
   - URL slug (required)
   - Excerpt
   - Content (required)
   - Category
   - Status (Draft/Published)
   - Featured image URL
4. Click "Save Post"

### Managing SEO
1. Go to "SEO Management" section
2. Update homepage SEO settings
3. Configure meta tags for social sharing
4. Save changes to apply to the website

## Data Storage

- All data is stored locally in your browser's localStorage
- Data persists between sessions
- You can export data as JSON for backup
- Import functionality allows data restoration

## File Structure

```
├── admin.html              # Admin panel interface
├── admin-style.css         # Admin panel styles
├── admin-script.js         # Admin panel functionality
├── blog.html              # Blog page
├── blog-style.css         # Blog page styles
├── blog-script.js         # Blog functionality
├── content-integration.js # Updates main website
└── index.html             # Main website
```

## Browser Compatibility

- Modern browsers (Chrome, Firefox, Safari, Edge)
- Local storage support required
- JavaScript must be enabled

## Security Note

This admin panel is designed for local use. For production deployment, consider adding:
- User authentication
- Server-side data storage
- Input validation and sanitization
- CSRF protection

## Support

For technical support or questions about the admin panel, please contact the development team.

---

**Language Baba Admin Panel** - Manage your TEF Canada website with ease!
