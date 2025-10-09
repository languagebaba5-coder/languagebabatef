// Vercel serverless function to serve blog page
const fs = require('fs');
const path = require('path');

export default function handler(req, res) {
  try {
    // Set content type to HTML
    res.setHeader('Content-Type', 'text/html');
    
    // Read the blog.html file
    const blogPath = path.join(process.cwd(), 'blog.html');
    const blogContent = fs.readFileSync(blogPath, 'utf8');
    
    // Return the blog content
    res.status(200).send(blogContent);
  } catch (error) {
    console.error('Error serving blog page:', error);
    res.status(500).send('Error loading blog page');
  }
}
