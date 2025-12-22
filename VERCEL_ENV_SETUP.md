# Vercel Environment Variables Setup

## Required Environment Variables

Set these in your Vercel dashboard under **Settings > Environment Variables**:

### 1. DATABASE_URL
```
postgresql://vastwk-lbaba:Coj7AuGwucMXC4FF_LQzww@languagebaba-16817.j77.cockroachlabs.cloud:26257/defaultdb?sslmode=verify-full
```

### 2. JWT_SECRET
```
languagebaba-super-secret-jwt-key-2024-production-ready
```

### 3. PORT (Optional)
```
3000
```

## How to Set Environment Variables in Vercel

1. Go to your Vercel dashboard
2. Select your project
3. Go to **Settings** tab
4. Click **Environment Variables**
5. Add each variable:
   - **Name**: `DATABASE_URL`
   - **Value**: `[your-database-url]`
   - **Environment**: Production, Preview, Development (select all)
6. Click **Save**

## Important Notes

- ✅ **No hardcoded credentials** in code
- ✅ **Singleton Prisma client** prevents connection issues
- ✅ **Vercel build script** ensures Prisma generates on deployment
- ✅ **Environment validation** ensures required variables are set

## Deployment Checklist

- [ ] Set DATABASE_URL in Vercel environment variables
- [ ] Set JWT_SECRET in Vercel environment variables
- [ ] Verify `vercel-build` script runs `npx prisma generate`
- [ ] Test API endpoints after deployment
- [ ] Check Vercel function logs for any errors

## Troubleshooting

If you see connection errors:
1. Verify DATABASE_URL is correctly set in Vercel
2. Check that your database allows connections from Vercel IPs
3. Ensure SSL mode is set correctly in the connection string
4. Check Vercel function logs for detailed error messages
