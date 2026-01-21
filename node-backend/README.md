# NiyuktiSetu Node Backend

Node.js backend for NiyuktiSetu with OTP-based authentication using MySQL.

## Features

- ✅ OTP-based registration and authentication
- ✅ JWT token generation and validation
- ✅ MySQL database integration
- ✅ Email OTP sending (configurable)
- ✅ Password hashing with bcrypt
- ✅ Protected routes with JWT middleware
- ✅ CORS enabled
- ✅ Request logging

## Prerequisites

- Node.js (v14 or higher)
- MySQL 8.0+
- MySQL Workbench (optional, for database management)

## Setup Instructions

### 1. Install Dependencies

```bash
cd node-backend
npm install
```

### 2. Configure Environment Variables

Edit `.env` file with your database credentials:

```env
PORT=9091
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=shreya@15
DB_NAME=niyuktisetu
DB_PORT=3306

JWT_SECRET=your-secret-key-change-this-in-production
JWT_EXPIRATION=24h

# Email Configuration (optional)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
EMAIL_FROM=noreply@niyuktisetu.com
```

### 3. Setup Database

Run the SQL schema in MySQL Workbench:

1. Open MySQL Workbench
2. Connect to your MySQL server
3. Open `database/schema.sql`
4. Execute the script

Or via command line:

```bash
mysql -u root -p < database/schema.sql
```

### 4. Start the Server

**Development mode (with auto-restart):**
```bash
npm run dev
```

**Production mode:**
```bash
npm start
```

The server will start on `http://localhost:9091`

## API Endpoints

### Public Endpoints

#### 1. Health Check
```
GET /health
```
Response:
```json
{
  "status": "OK",
  "message": "NiyuktiSetu Node Backend is running",
  "timestamp": "2025-11-09T10:30:00.000Z"
}
```

#### 2. Send OTP
```
POST /otp-auth/send
```
Request Body:
```json
{
  "name": "Nikunj Agarwal",
  "email": "nikunjagarwal445@gmail.com",
  "password": "nikunj0098"
}
```
Response:
```json
{
  "message": "OTP sent successfully",
  "otp": "123456"
}
```

#### 3. Verify OTP
```
POST /otp-auth/verify
```
Request Body:
```json
{
  "email": "nikunjagarwal445@gmail.com",
  "otp": "123456"
}
```
Response:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "name": "Nikunj Agarwal",
  "email": "nikunjagarwal445@gmail.com",
  "message": "OTP verified successfully"
}
```

### Protected Endpoints (Require JWT Token)

#### 4. Get User Profile
```
GET /user/profile
Authorization: Bearer <token>
```
Response:
```json
{
  "id": 1,
  "name": "Nikunj Agarwal",
  "email": "nikunjagarwal445@gmail.com",
  "verified": true
}
```

#### 5. Update User Profile
```
PUT /user/profile
Authorization: Bearer <token>
```
Request Body:
```json
{
  "name": "Updated Name"
}
```
Response:
```json
{
  "message": "Profile updated successfully"
}
```

## Testing with Postman

### Test OTP Flow:

1. **Send OTP:**
   - POST `http://localhost:9091/otp-auth/send`
   - Body: `{"name": "Test User", "email": "test@example.com", "password": "test123"}`
   - Copy the OTP from response

2. **Verify OTP:**
   - POST `http://localhost:9091/otp-auth/verify`
   - Body: `{"email": "test@example.com", "otp": "123456"}`
   - Copy the token from response

3. **Access Protected Route:**
   - GET `http://localhost:9091/user/profile`
   - Headers: `Authorization: Bearer <your-token>`

## Email Configuration (Optional)

To enable email OTP sending:

1. Get Gmail App Password:
   - Go to Google Account Settings
   - Security → 2-Step Verification → App Passwords
   - Generate password for "Mail"

2. Update `.env`:
   ```env
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASSWORD=your-16-char-app-password
   ```

3. Uncomment in `routes/otpAuth.js`:
   ```javascript
   await sendOtpEmail(email, otp, name);
   ```

## Project Structure

```
node-backend/
├── config/
│   └── database.js          # MySQL connection pool
├── middleware/
│   └── auth.js              # JWT authentication middleware
├── routes/
│   ├── otpAuth.js          # OTP authentication routes
│   └── user.js             # User profile routes
├── utils/
│   └── emailService.js     # Email sending service
├── database/
│   └── schema.sql          # Database schema
├── .env                    # Environment variables
├── server.js              # Express server entry point
└── package.json           # Dependencies
```

## Database Schema

### Users Table
| Column | Type | Description |
|--------|------|-------------|
| id | INT | Primary key (auto-increment) |
| name | VARCHAR(255) | User's full name |
| email | VARCHAR(255) | Unique email address |
| password | VARCHAR(255) | Hashed password |
| otp | VARCHAR(6) | 6-digit OTP code |
| verified | BOOLEAN | Email verification status |
| created_at | TIMESTAMP | Creation timestamp |
| updated_at | TIMESTAMP | Last update timestamp |

## Security Features

- ✅ Password hashing with bcrypt (10 rounds)
- ✅ JWT tokens with expiration
- ✅ CORS protection
- ✅ SQL injection prevention (parameterized queries)
- ✅ Environment variables for sensitive data

## Notes

- Remove `otp: otp` from response in production (`routes/otpAuth.js` line 50)
- Change `JWT_SECRET` to a strong random string in production
- Enable email sending for production use
- Consider adding rate limiting for OTP requests
- Add OTP expiration (currently OTP doesn't expire)

## Troubleshooting

### Database Connection Error
- Verify MySQL is running
- Check credentials in `.env`
- Ensure database exists: `CREATE DATABASE niyuktisetu;`

### Port Already in Use
- Change PORT in `.env` to another port
- Or kill process using port 9091:
  ```bash
  netstat -ano | findstr :9091
  taskkill /PID <process-id> /F
  ```

## License

MIT
