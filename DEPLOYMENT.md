# Deployment Guide for FindGreatStocks.com

## Overview
This guide covers deploying FindGreatStocks.com using Replit Deployments with a custom Namecheap domain.

## Prerequisites
- Replit account with deployment access
- Namecheap domain registration
- Financial Modeling Prep API key
- Google Analytics and AdSense accounts (optional)

## Environment Variables Setup

Before deployment, ensure these environment variables are configured in Replit Secrets:

### Required Variables
```
DATABASE_URL=postgresql://[provided by Replit]
FMP_API_KEY=your_financial_modeling_prep_api_key
SESSION_SECRET=your_secure_random_session_secret
PGDATABASE=[auto-provided]
PGHOST=[auto-provided]
PGPASSWORD=[auto-provided]
PGPORT=[auto-provided]
PGUSER=[auto-provided]
```

### Optional Analytics Variables
```
VITE_GA_MEASUREMENT_ID=G-XXXXXXXXXX
```

## Replit Deployment Steps

### 1. Code Preparation
- Ensure all code is committed and tested
- Verify database schema is up to date
- Test all functionality in development

### 2. Database Setup
```bash
npm run db:push
```

### 3. Initial Data Import
```bash
npm run data:import
```

### 4. Deploy on Replit
1. Click the "Deploy" button in your Replit workspace
2. Choose "Autoscale" deployment for production traffic
3. Configure the deployment settings:
   - Build command: `npm run build`
   - Start command: `npm start`
   - Environment: Production

### 5. Verify Deployment
- Test the deployed URL provided by Replit
- Verify all API endpoints are working
- Check database connectivity
- Test user authentication flow

## Custom Domain Configuration (Namecheap)

### Step 1: Get Replit Deployment URL
After successful deployment, Replit will provide a deployment URL like:
`https://your-app-name.your-username.replit.app`

### Step 2: Configure DNS in Namecheap
1. Log into your Namecheap account
2. Go to Domain List → Manage → Advanced DNS
3. Add these DNS records:

#### For root domain (findgreatstocks.com):
```
Type: CNAME
Host: @
Value: your-deployment-url.replit.app
TTL: Automatic
```

#### For www subdomain:
```
Type: CNAME
Host: www
Value: your-deployment-url.replit.app
TTL: Automatic
```

### Step 3: Configure Custom Domain in Replit
1. In your Replit deployment dashboard
2. Go to "Domains" section
3. Add your custom domain: `findgreatstocks.com`
4. Add www subdomain: `www.findgreatstocks.com`
5. Enable SSL/TLS certificate (automatic)

### Step 4: DNS Propagation
- DNS changes can take 24-48 hours to fully propagate
- Use tools like `dig` or online DNS checkers to verify
- Test both `findgreatstocks.com` and `www.findgreatstocks.com`

## SSL Certificate Setup
Replit automatically provides SSL certificates for custom domains:
- Certificates are issued via Let's Encrypt
- Automatic renewal every 90 days
- HTTPS redirect is enabled by default

## Post-Deployment Configuration

### 1. Google Analytics Setup
1. Create Google Analytics 4 property for your domain
2. Get Measurement ID (G-XXXXXXXXXX)
3. Add to Replit Secrets as `VITE_GA_MEASUREMENT_ID`
4. Redeploy to activate analytics

### 2. Google AdSense Setup
1. Apply for AdSense with your deployed domain
2. Get Publisher ID after approval
3. Update `client/src/components/google-ads-banner.tsx`:
   ```typescript
   data-ad-client="ca-pub-YOUR-PUBLISHER-ID"
   ```
4. Create ad units and update slot IDs
5. Redeploy with updated ad configuration

### 3. Email Configuration
Ensure the contact email `hello@findgreatstocks.com` is:
- Set up with your domain registrar
- Configured to receive emails
- Monitored for user inquiries

## Monitoring and Maintenance

### Health Checks
Replit automatically monitors:
- Application uptime
- Response times
- Error rates
- Resource usage

### Database Maintenance
- Regular backups are handled by Replit
- Monitor database performance
- Scale resources as needed

### Data Updates
The application includes automated daily updates:
- Stock prices refresh after 4 PM ET
- Financial data updates automatically
- Monitor logs for any API issues

## Scaling Considerations

### Traffic Growth
- Replit Autoscale handles traffic increases automatically
- Monitor performance metrics
- Consider upgrading plans for high traffic

### Database Scaling
- PostgreSQL can handle substantial load
- Monitor query performance
- Add indexes for frequently queried data

## Troubleshooting

### Common Issues
1. **Domain not resolving**: Check DNS configuration
2. **SSL certificate issues**: Verify domain ownership
3. **API errors**: Check environment variables
4. **Database connection**: Verify PostgreSQL settings

### Debug Steps
1. Check Replit deployment logs
2. Verify environment variables
3. Test API endpoints individually
4. Check database connectivity

### Support Resources
- Replit Documentation: https://docs.replit.com
- Namecheap Support: https://www.namecheap.com/support/
- Project Issues: Create GitHub issue

## Performance Optimization

### Frontend Optimization
- Vite automatically optimizes bundle size
- Images are optimized for web
- CSS is minified and tree-shaken

### Backend Optimization
- Database queries are optimized
- API responses are cached where appropriate
- Express.js is configured for production

### CDN and Caching
- Static assets are served efficiently
- Browser caching headers are set
- API responses include appropriate cache headers

## Security Considerations

### Production Security
- Environment variables are secure
- Session management is PostgreSQL-backed
- HTTPS is enforced
- Input validation on all endpoints

### Regular Updates
- Monitor for security updates
- Keep dependencies current
- Review access logs regularly

## Backup Strategy

### Automated Backups
- Replit handles database backups
- Code is backed up to GitHub
- Regular deployment snapshots

### Manual Backups
- Export critical data periodically
- Document configuration settings
- Maintain local development environment

## Success Metrics

### Technical KPIs
- Uptime > 99.9%
- Page load time < 2 seconds
- API response time < 500ms
- Zero security incidents

### Business KPIs
- User registration growth
- Daily active users
- Page views and engagement
- Revenue from advertisements

---

For deployment support, contact hello@findgreatstocks.com