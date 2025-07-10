# Production Setup Guide

This guide explains how to securely deploy the Trading App in production.

## Environment Variables

### Required Variables

Copy the `.env.example` file from the backend directory and create a `.env` file with your production values:

```bash
cp trading/backend/.env.example trading/backend/.env
```

### Admin User Configuration

**IMPORTANT:** The admin user is created automatically when the server starts, but only if you provide the required environment variables.

1. **ADMIN_PASSWORD** (Required): Set a strong password for the admin user
   ```bash
   ADMIN_PASSWORD=YourSecureAdminPassword123!
   ```

2. **ADMIN_USERNAME** (Optional): Default is "admin"
   ```bash
   ADMIN_USERNAME=your_admin_username
   ```

3. **ADMIN_EMAIL** (Optional): Default is "admin@trading.app"
   ```bash
   ADMIN_EMAIL=admin@yourdomain.com
   ```

### Other Required Variables

1. **JWT_SECRET**: Used for signing JWT tokens
   ```bash
   JWT_SECRET=your_very_long_and_secure_jwt_secret_key_here
   ```

2. **MONGODB_URI**: Your MongoDB connection string
   ```bash
   MONGODB_URI=mongodb://username:password@localhost:27017/trading?authSource=admin
   ```

### Optional Variables

1. **Alpaca API** (for live market data):
   ```bash
   ALPACA_API_KEY=your_alpaca_api_key
   ALPACA_SECRET_KEY=your_alpaca_secret_key
   ALPACA_BASE_URL=https://paper-api.alpaca.markets/v2
   ```

2. **Application Configuration**:
   ```bash
   NODE_ENV=production
   PORT=3001
   ```

## Security Best Practices

### 1. Admin Password Security
- Use a strong password with at least 12 characters
- Include uppercase, lowercase, numbers, and special characters
- Never commit the `.env` file to version control
- Consider using a password manager to generate and store the password

### 2. JWT Secret
- Use a long, random string (at least 32 characters)
- Generate using: `openssl rand -base64 32`
- Keep this secret secure and never expose it

### 3. Database Security
- Use a dedicated database user with minimal permissions
- Enable authentication on your MongoDB instance
- Use SSL/TLS connections in production

## Deployment Steps

1. **Set up your environment variables**:
   ```bash
   cd trading/backend
   cp .env.example .env
   # Edit .env with your production values
   ```

2. **Install dependencies**:
   ```bash
   # Backend
   cd trading/backend
   npm install

   # Frontend
   cd ../frontend
   npm install
   npm run build
   ```

3. **Start the application**:
   ```bash
   cd trading/backend
   npm start
   ```

4. **Verify admin user creation**:
   - Check the server logs for: "✅ Admin user created successfully"
   - If you see a warning about ADMIN_PASSWORD not being set, check your .env file

## Admin Access

Once deployed:
1. Navigate to your application URL
2. Click "Login"
3. Use your configured admin credentials:
   - Username: (your ADMIN_USERNAME or "admin")
   - Password: (your ADMIN_PASSWORD)

## Troubleshooting

### Admin User Not Created
- Check that ADMIN_PASSWORD is set in your .env file
- Verify the .env file is in the correct location (trading/backend/.env)
- Check server logs for error messages

### JWT Token Issues
- Verify JWT_SECRET is set in your .env file
- Clear browser localStorage and try logging in again

### Database Connection Issues
- Verify MONGODB_URI is correct
- Test database connectivity separately
- Check MongoDB server status

## Production Checklist

- [ ] Set strong ADMIN_PASSWORD
- [ ] Set secure JWT_SECRET (32+ characters)
- [ ] Configure production MONGODB_URI
- [ ] Set NODE_ENV=production
- [ ] Remove any development/debug code
- [ ] Set up proper logging
- [ ] Configure HTTPS/SSL
- [ ] Set up monitoring and backups
- [ ] Test admin login functionality
- [ ] Verify user registration works
- [ ] Test portfolio creation and management 