# Admin User Management Dashboard - Implementation Guide

## Overview
Complete admin user management feature with dashboard showing total users, student list, mentor list, and admin list from the database.

---

## Backend APIs Added

### 1. **Get User Statistics**
- **Endpoint**: `GET /api/admin/users/statistics`
- **Auth**: ADMIN role required
- **Response**:
```json
{
  "success": true,
  "data": {
    "total_users": 45,
    "total_students": 30,
    "total_mentors": 12,
    "total_admins": 3
  }
}
```

### 2. **Get All Students (Paginated)**
- **Endpoint**: `GET /api/admin/users/students?page=1&limit=10`
- **Auth**: ADMIN role required
- **Response**:
```json
{
  "success": true,
  "data": {
    "students": [
      {
        "user_key": "ENRL001",
        "email": "student@example.com",
        "created_at": "2024-01-15T10:00:00Z",
        "full_name": "John Doe",
        "student_email": "student@example.com",
        "department": "CSE",
        "year": "3",
        "division": "A",
        "roll_number": "12345"
      }
    ],
    "total": 30,
    "page": 1,
    "limit": 10
  }
}
```

### 3. **Get All Mentors (Paginated)**
- **Endpoint**: `GET /api/admin/users/mentors?page=1&limit=10`
- **Auth**: ADMIN role required
- **Response**:
```json
{
  "success": true,
  "data": {
    "mentors": [
      {
        "user_key": "EMP001",
        "email": "mentor@example.com",
        "created_at": "2024-01-15T10:00:00Z",
        "full_name": "Jane Smith",
        "official_email": "mentor@example.com",
        "department": "Engineering",
        "designation": "Senior Engineer",
        "bio": "Expert in full-stack development"
      }
    ],
    "total": 12,
    "page": 1,
    "limit": 10
  }
}
```

### 4. **Get All Users (Paginated)**
- **Endpoint**: `GET /api/admin/users?page=1&limit=10`
- **Auth**: ADMIN role required
- **Response**:
```json
{
  "success": true,
  "data": {
    "users": [
      {
        "user_key": "ENRL001",
        "role": "STUDENT",
        "email": "student@example.com",
        "created_at": "2024-01-15T10:00:00Z",
        "full_name": "John Doe",
        "department": "CSE"
      }
    ],
    "total": 45,
    "page": 1,
    "limit": 10
  }
}
```

---

## Backend Files Modified

### 1. **Services** (`backend/src/services/admin.service.js`)
Added 4 new service functions:
- `getUserStatisticsService()` - Returns user count statistics
- `getAllStudentsService(page, limit)` - Retrieves paginated student list
- `getAllMentorsService(page, limit)` - Retrieves paginated mentor list
- `getAllUsersService(page, limit)` - Retrieves paginated all users list

### 2. **Controllers** (`backend/src/controllers/admin.controller.js`)
Added 4 new controller functions:
- `getUserStatistics(req, res, next)` - Handles statistics endpoint
- `getAllStudents(req, res, next)` - Handles students endpoint
- `getAllMentors(req, res, next)` - Handles mentors endpoint
- `getAllUsers(req, res, next)` - Handles all users endpoint

### 3. **Routes** (`backend/src/routes/admin.routes.js`)
Added 4 new routes:
- `GET /api/admin/users/statistics` - Get statistics
- `GET /api/admin/users/students` - Get students list
- `GET /api/admin/users/mentors` - Get mentors list
- `GET /api/admin/users` - Get all users list

---

## Frontend Implementation

### Admin User Management Page
**Location**: `frontend/src/app/admin/users/page.tsx`

#### Features:
1. **Statistics Dashboard**
   - 4 stat cards showing: Total Users, Total Students, Total Mentors, Total Admins
   - Beautiful card layout with color-coded icons
   - Real-time data from backend

2. **Tabbed User List**
   - Tab 1: All Users - Shows all users with role badges
   - Tab 2: Students - Shows student-specific details (Department, Year)
   - Tab 3: Mentors - Shows mentor-specific details (Designation)

3. **Pagination**
   - 10 users per page (configurable)
   - Previous/Next navigation buttons
   - Current page indicator

4. **Data Fetching**
   - Automatic data refresh on tab change
   - Loading state with spinner
   - Error handling
   - Uses axios instance with automatic token handling

5. **User Registration Integration**
   - "Add User" button opens registration modal
   - Automatic data refresh after new user registration

### Styling
- Tailwind CSS for responsive design
- Color-coded role badges (Blue=Student, Purple=Mentor, Orange=Admin)
- Professional card and table layouts
- Mobile-friendly responsive grid

---

## How It Works

### Flow:
1. Admin logs in to the system
2. Navigates to "User Management" page under Admin dashboard
3. Page loads with:
   - Statistics cards showing user counts
   - Tabbed interface for viewing different user types
   - Paginated list of users

### Tab Features:
- **All Users**: Shows all registered users with their role
- **Students**: Shows students with department and year information
- **Mentors**: Shows mentors with designation information

### Data Updates:
- Statistics update automatically when switching tabs
- Data refreshes after registering new users
- Pagination persists when changing tabs

---

## Database Queries

### Query 1: Get Statistics
```sql
SELECT
  (SELECT COUNT(*) FROM users WHERE role = 'STUDENT') as total_students,
  (SELECT COUNT(*) FROM users WHERE role = 'MENTOR') as total_mentors,
  (SELECT COUNT(*) FROM users WHERE role = 'ADMIN') as total_admins,
  (SELECT COUNT(*) FROM users) as total_users
```

### Query 2: Get Students with Profiles
```sql
SELECT u.user_key, u.email, u.created_at,
       sp.full_name, sp.student_email, sp.department, 
       sp.year, sp.division, sp.roll_number
FROM users u
INNER JOIN student_profiles sp ON u.user_key = sp.enrollment_id
WHERE u.role = 'STUDENT'
ORDER BY u.created_at DESC
LIMIT $1 OFFSET $2
```

### Query 3: Get Mentors with Profiles
```sql
SELECT u.user_key, u.email, u.created_at,
       mp.full_name, mp.official_email, mp.department, 
       mp.designation, mp.bio
FROM users u
INNER JOIN mentor_profiles mp ON u.user_key = mp.employee_id
WHERE u.role = 'MENTOR'
ORDER BY u.created_at DESC
LIMIT $1 OFFSET $2
```

### Query 4: Get All Users (Combined)
```sql
SELECT u.user_key, u.role, u.email, u.created_at,
       COALESCE(sp.full_name, mp.full_name, ap.full_name) as full_name,
       COALESCE(sp.department, mp.department, ap.department) as department
FROM users u
LEFT JOIN student_profiles sp ON u.user_key = sp.enrollment_id
LEFT JOIN mentor_profiles mp ON u.user_key = mp.employee_id
LEFT JOIN admin_profiles ap ON u.user_key = ap.employee_id
ORDER BY u.created_at DESC
LIMIT $1 OFFSET $2
```

---

## Testing

### Test the API:
```bash
# Statistics
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:5000/api/admin/users/statistics

# Students
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:5000/api/admin/users/students?page=1&limit=10

# Mentors
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:5000/api/admin/users/mentors?page=1&limit=10

# All Users
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:5000/api/admin/users?page=1&limit=10
```

### Test the Frontend:
1. Log in as ADMIN user
2. Navigate to Admin Dashboard → User Management
3. View statistics cards
4. Click on different tabs (All Users, Students, Mentors)
5. Test pagination
6. Try adding a new user and see automatic refresh

---

## Security
- ✅ All endpoints require ADMIN role authentication
- ✅ JWT token validation on every request
- ✅ Role-based access control (ADMIN only)
- ✅ Database parameterized queries to prevent SQL injection

---

## Performance
- ✅ Pagination implemented (10 users per page default)
- ✅ Indexed queries on role field
- ✅ Left joins used for combined user data to handle missing profiles
- ✅ Efficient COUNT(*) queries for statistics

---

## Future Enhancements
- [ ] Search functionality within each tab
- [ ] Sort by different columns (name, department, date)
- [ ] Export data to CSV
- [ ] Edit user details inline
- [ ] Delete user functionality
- [ ] Filter by department/designation
- [ ] Advanced analytics and charts
