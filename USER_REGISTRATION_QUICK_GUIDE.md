# 🚀 User Registration - Quick Start Guide

## ✨ What's New?

Your admin dashboard now has a **complete user registration system**!

Admins can now:
- 👨‍💼 Register new Students
- 🎓 Register new Mentors  
- 👨‍💼 Register new Admins

---

## 📍 Where to Find It

**Sidebar:** User Management → `/admin/users`

---

## 🎮 How to Use (Step by Step)

### 1. Navigate to User Management
- Click "User Management" in the admin sidebar
- You'll see the User Management page with stats

### 2. Click "Add User" Button
- Blue button at the top right
- Opens the registration modal

### 3. Select User Role
Three options appear:
- **👨‍🎓 Student** - For enrolling new students
- **🎓 Mentor** - For adding project mentors
- **👨‍💼 Admin** - For creating new administrators

### 4. Fill Registration Form
The form shows different fields based on role:

**All Roles:**
- User ID (non-editable - auto-generated)
- Email address
- Password
- Confirm Password
- Full Name

**Student Only:**
- Roll Number
- Year (1st, 2nd, 3rd, 4th)
- Division (A/B/C)
- Department

**Mentor & Admin:**
- Department
- Designation (e.g., Professor, Assistant Professor)
- Contact Number (optional)

### 5. Click "Register User"
- Form validates all fields
- If valid → Success message
- If invalid → Error message with details

### 6. Done! ✅
- Modal closes automatically
- User appears in the registered users list

---

## 📋 Form Fields Explained

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| User ID | Text | Yes | Auto-generated format (ENR/EMP + ID) |
| Email | Email | Yes | Must be unique in system |
| Password | Password | Yes | Minimum 6 characters |
| Confirm Password | Password | Yes | Must match password |
| Full Name | Text | Yes | User's full name |
| Roll Number | Text | Yes (Student) | Enrollment roll number |
| Year | Select | Yes (Student) | 1st, 2nd, 3rd, or 4th year |
| Division | Text | Yes (Student) | Class division (A/B/C) |
| Department | Text | Yes | Department name |
| Designation | Text | Yes (Mentor/Admin) | Job title |
| Contact | Tel | No | Phone number |

---

## ⚠️ Validation Rules

- ✅ All required fields must be filled
- ✅ Email must be valid format
- ✅ Password must be at least 6 characters
- ✅ Passwords must match exactly
- ✅ User ID must be unique
- ✅ Email must be unique

---

## 🎯 User ID Formats

**For Students:**
- Format: `ENR` + Number
- Example: `ENR2024001`

**For Mentors/Admins:**
- Format: `EMP` + Number
- Example: `EMP2024001`

> **Note:** These are just suggestions. You can use any format you want!

---

## 📊 Registered Users Table

After registering users, you'll see them in the table showing:
- **User ID** - Unique identifier
- **Name** - Full name
- **Email** - Email address
- **Role** - Student/Mentor/Admin
- **Status** - Active

---

## 🔐 Security Notes

✅ **Only Admins can register users**
- Other roles cannot access `/admin/users`
- Requires valid JWT token
- Enforced on both frontend and backend

✅ **Passwords are encrypted**
- Stored securely with bcrypt hashing
- Never stored in plain text

✅ **User data is validated**
- Frontend validation for user experience
- Backend validation for security
- Prevents invalid data entry

---

## ❌ Common Errors & Solutions

| Error | Solution |
|-------|----------|
| "Passwords do not match" | Ensure both password fields are identical |
| "Please fill all required fields" | Check all fields in the form are completed |
| "Email already exists" | Use a different email address |
| "User ID already exists" | Use a different user ID |
| "Access Denied" | Login as an admin user |
| "Modal won't open" | Refresh the page and try again |

---

## 📱 Mobile Friendly

The registration form works on:
- ✅ Desktop computers
- ✅ Tablets
- ✅ Mobile phones

Form adapts automatically to screen size!

---

## 🔄 User Journey

```
Login as Admin
    ↓
Go to User Management (/admin/users)
    ↓
Click "Add User" button
    ↓
Select role (Student/Mentor/Admin)
    ↓
Fill registration form
    ↓
Click "Register User"
    ↓
✅ Success! User registered
    ↓
User appears in registered users list
    ↓
User can now login with provided credentials
```

---

## 🎓 Example: Register a Student

1. Click "Add User"
2. Select "Student" option
3. Fill form:
   - User ID: `ENR2024101`
   - Email: `john.doe@university.edu`
   - Password: `MySecurePass123`
   - Confirm: `MySecurePass123`
   - Name: `John Doe`
   - Roll: `2024101`
   - Year: `2`
   - Division: `A`
   - Dept: `Computer Science`
4. Click "Register User"
5. ✅ Success!

Now John can login with:
- **ID/Email:** john.doe@university.edu
- **Password:** MySecurePass123
- **Role:** STUDENT

---

## 🎓 Example: Register a Mentor

1. Click "Add User"
2. Select "Mentor" option
3. Fill form:
   - User ID: `EMP202401`
   - Email: `dr.smith@university.edu`
   - Password: `SecurePassword456`
   - Confirm: `SecurePassword456`
   - Name: `Dr. Rajesh Kumar`
   - Department: `Computer Science`
   - Designation: `Associate Professor`
   - Contact: `9876543210`
4. Click "Register User"
5. ✅ Success!

---

## 🔄 Backend API (For Developers)

**Endpoint:** `POST /admin/register-user`

**Example Request:**
```json
{
  "user_key": "ENR2024001",
  "role": "STUDENT",
  "email": "student@university.edu",
  "password": "SecurePass123",
  "profile": {
    "full_name": "John Doe",
    "department": "Computer Science",
    "year": "2",
    "division": "A",
    "roll_number": "2024001"
  }
}
```

**Example Response:**
```json
{
  "message": "User registered successfully",
  "data": {
    "message": "User registered successfully",
    "user_key": "ENR2024001",
    "role": "STUDENT"
  }
}
```

---

## 📞 Need Help?

**If registration fails:**
1. Check all fields are filled
2. Verify email format is correct
3. Ensure password is at least 6 characters
4. Check that passwords match
5. Try a different email (it might already exist)
6. Refresh page and try again

**Still having issues?**
- Check browser console (F12 → Console tab)
- Check network requests (F12 → Network tab)
- Verify you're logged in as admin
- Contact support with error message

---

## ✅ Checklist Before Registering

- [ ] You're logged in as Admin
- [ ] You have correct user information
- [ ] Email address is unique (not used before)
- [ ] You have a strong password
- [ ] All required fields are filled
- [ ] User type (Student/Mentor/Admin) is correct

---

**Status:** ✅ Ready to Use
**Version:** 1.0
**Last Updated:** January 25, 2026
