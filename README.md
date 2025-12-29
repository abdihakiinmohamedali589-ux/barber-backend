# Barber App Backend API

Node.js + Express + MongoDB backend for the Barber Booking App.

## 🚀 Quick Start

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Setup Environment Variables**
   ```bash
   cp env.example .env
   # Edit .env with your configuration
   ```

3. **Start MongoDB**
   ```bash
   # Make sure MongoDB is running locally
   # Or update MONGODB_URI in .env to use MongoDB Atlas
   ```

4. **Run the Server**
   ```bash
   # Development mode (with auto-reload)
   npm run dev

   # Production mode
   npm start
   ```

## 📋 Environment Variables

Create a `.env` file with:

```env
PORT=3000
NODE_ENV=development
MONGODB_URI=mongodb+srv://sabrinaibraahiimidow_db_user:baaAWQg9xNLOEZCx@cluster0.ebywtrx.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0
JWT_SECRET=your-super-secret-jwt-key
EMAIL_USER=sabrinaibraahiimidow@gmail.com
EMAIL_PASSWORD=othcirrggbcapmor
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
ADMIN_EMAIL=sabrinaibraahiimidow@gmail.com
CLIENT_URL=http://localhost:5173/
```

## 📡 API Endpoints

### Authentication
- `POST /api/auth/send-otp` - Send OTP to email
- `POST /api/auth/verify-otp` - Verify OTP
- `POST /api/auth/signup` - Complete user registration
- `POST /api/auth/signin` - Sign in user
- `GET /api/auth/me` - Get current user (requires token)
- `POST /api/auth/signout` - Sign out

### Bookings
- `GET /api/bookings/user/:userId` - Get user bookings
- `GET /api/bookings/barber/:barberId` - Get barber bookings
- `POST /api/bookings` - Create booking
- `PATCH /api/bookings/:id` - Update booking

### Barbers
- `GET /api/barbers` - Get all barbers
- `GET /api/barbers/:id` - Get barber by ID
- `POST /api/barbers` - Create barber profile

### Feedback & Chat
- `POST /api/feedback` - Submit contact form feedback
- `POST /api/chat` - Submit chat session feedback

### Admin
- `GET /api/admin/stats` - Get dashboard statistics

## 🔐 Authentication

The API uses JWT tokens. Include the token in the Authorization header:
```
Authorization: Bearer <your-token>
```

## 📧 Email Configuration

Currently configured to use Gmail SMTP. The email service sends:
- OTP verification codes
- Feedback notifications to admin

## 🗄️ Database Models

- **User** - User accounts (customers, barbers, admins)
- **Barber** - Barber profiles and shop information
- **Booking** - Appointment bookings
- **Payment** - Payment transactions (to be implemented)
- **Review** - Customer reviews (to be implemented)

## 📝 Notes

- OTP expires after 10 minutes
- JWT tokens expire after 30 days
- In development mode, OTP is logged to console if email fails
- Feedback emails are sent to ADMIN_EMAIL
- Chat sessions are logged (can be saved to MongoDB)

## 🔧 Port Configuration

**Note:** The React frontend code calls `http://localhost:5000/api/feedback`, but this backend runs on port 3000 by default. Either:
1. Change the frontend to use port 3000, OR
2. Set `PORT=5000` in your `.env` file
