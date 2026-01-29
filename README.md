# Role-Based Authentication System

A backend system demonstrating **role-based authentication and authorization**. Users can register, log in, and access protected routes based on their roles (e.g., `user`, `admin`). The project follows a clean architecture with separate folders for controllers, routes, models, and middleware.

## 🚀 Features

- User registration and login
- Password hashing using bcrypt
- Role assignment (user, admin, etc.)
- Protected routes accessible only to authorized roles
- JWT-based authentication
- Access token + refresh token support for session renewal
- Forgot password & reset password via email
- Two-Factor Authentication (2FA) for enhanced account security
- Middleware for authentication & role validation
- Email notifications using Mailtrap SMTP
- Clean and modular project structure

## 🛠 Tech Stack

**Backend**  
- Node.js  
- Express.js  
- Database: MongoDB  
- Authentication: JSON Web Tokens (JWT)  
- Password hashing: bcrypt  

## 📂 Project Structure

```
Role-Based-Authentication-System/
│
├── backend/ # Backend server and API
│ ├── config/ # Database configuration
│ │ └── db.config.js
│ ├── controllers/ # Controller logic for auth and users
│ │ ├── auth.controller.js
│ │ └── user.controller.js
│ ├── middleware/ # Authentication & role-check middleware
│ │ ├── authJwt.js
│ │ └── verifyRole.js
│ ├── models/ # Database models
│ │ ├── user.model.js
│ │ └── role.model.js
│ ├── routes/ # API routes
│ │ ├── auth.routes.js
│ │ └── user.routes.js
│ ├── utils/ # Helper functions
│ │ └── helper.js
│ ├── .env # Environment variables (not committed)
│ ├── app.js # Express app entry
│ └── package.json
│
└── README.md
```


## 📦 Getting Started

### Prerequisites

Before installing, ensure you have:

- Node.js (v14+)  
- npm or yarn  
- A database connection (MongoDB)  

### 🔧 Installation

1. Clone the repository:

```bash
git clone https://github.com/Saaait/Role-Based-Authentication-System.git
cd backend
```

2. Install backend dependencies:

```bash
cd backend
npm install
```

### ⚙️ Environment Variables

Inside the `backend/` folder, create a `.env` file with values such as:

```
# Port
PORT=5000

# Connection string
CONNECTION_STRING=<your_database_connection_string>

# Secret Tokens
ACCESS_TOKEN_SECERT = <your_secret_key>
REFRESH_TOKEN_SECRET= <your_secret_refresh_key>

# Mailtrap SMTP 
SMTP_HOST=smtp.mailtrap.io
SMTP_PORT=2525
SMTP_USER=<your_smtp_user_id>
SMTP_PASS=your_smtp_password>
EMAIL_FROM="No Reply <noreply@yourdomain.com>"

# Temporary URL 
FRONTEND_URL=http://localhost:5001
```


### ▶️ Run the Application

Start the backend:

```bash
cd backend
npm start
```
