# 🎯 Quick Start Guide - Mentor Assignment Feature

## How It Works

### For Admin Users:

1. **Go to Admin Dashboard**
   - Navigate to `/admin/dashboard`
   - You'll see "Pending Project Approvals" section

2. **Click Review Button**
   - Click the blue "Review" button on any pending project
   - A modal window will pop up

3. **Select a Mentor**
   - The modal shows all active mentors
   - Click on any mentor card to select them
   - See their details: name, email, department, designation, phone, workload

4. **Assign Mentor**
   - Click "Assign Mentor" button at bottom right
   - You'll see a success message
   - Modal closes automatically
   - Dashboard refreshes and project disappears from pending list

---

## 🔌 API Endpoints

### Get Active Mentors
```
GET /mentor/admin/active
```
Returns: List of all active mentors with their details and project count

### Assign Mentor to Project
```
POST /project/admin/assign-mentor
{
  "projectId": "PROJ_ID",
  "mentorEmployeeId": "EMP_ID"
}
```
Returns: Success confirmation with updated project status

---

## 📝 Component Structure

```
AdminDashboard (page.tsx)
├── State Management
│   ├── modalOpen (boolean)
│   └── selectedProject (object)
├── Handlers
│   ├── handleReviewClick()
│   └── handleMentorAssigned()
└── Modal Component
    ├── MentorList
    ├── MentorSelection
    └── AssignmentAPI
```

---

## 🛠️ Development Notes

### Backend Stack
- Framework: Express.js
- Service Layer: mentor.service.js
- Controller: mentor.controller.js
- Route: mentor.routes.js
- Database: PostgreSQL

### Frontend Stack
- Framework: Next.js + React
- Component: MentorSelectionModal.tsx
- Styling: Tailwind CSS
- HTTP Client: Axios

### Key Files to Modify
1. `backend/src/services/mentor.service.js` - Add mentor logic
2. `backend/src/controllers/mentor.controller.js` - Add controller methods
3. `backend/src/routes/mentor.routes.js` - Add routes
4. `frontend/src/components/modals/MentorSelectionModal.tsx` - Modal component
5. `frontend/src/app/admin/dashboard/page.tsx` - Dashboard integration

---

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| Modal not opening | Check if `modalOpen` state is true, Review button onClick handler |
| No mentors displayed | Verify `/mentor/admin/active` endpoint returns data, check auth token |
| Assignment fails | Check if project status is 'PENDING', verify mentor exists |
| Success message not showing | Check network request, verify API response format |
| Dashboard not refreshing | Ensure `handleMentorAssigned()` calls `fetchDashboardData()` |

---

## 📊 Data Flow Diagram

```
User clicks "Review"
        ↓
  Modal Opens
        ↓
  Fetch /mentor/admin/active
        ↓
  Display Mentors in List
        ↓
  User Selects Mentor
        ↓
  User Clicks "Assign Mentor"
        ↓
  POST /project/admin/assign-mentor
        ↓
  API Updates Project Status
        ↓
  Success Message Shown
        ↓
  Modal Auto-Closes
        ↓
  Dashboard Refreshes
```

---

## ✅ Testing Scenarios

### Scenario 1: Happy Path
1. Admin sees pending project with Review button
2. Clicks Review → Modal opens
3. Selects a mentor from the list
4. Clicks Assign Mentor
5. Success message appears
6. Modal closes and dashboard refreshes
7. Project no longer in pending list

### Scenario 2: Error Handling
1. Network fails during mentor fetch → Error message shown
2. Admin tries to assign without selecting → Validation error
3. API fails to assign → Error message with details
4. Project not found → Alert user appropriately

### Scenario 3: Edge Cases
1. No mentors available → Display "No active mentors available"
2. Project already assigned → Show appropriate message
3. Admin permission missing → Prevent modal from opening

---

## 🔐 Security Checklist

✅ Only admins can access `/mentor/admin/active`
✅ JWT token required for all API calls
✅ Mentor must be active (is_active = true)
✅ Project must be in PENDING status
✅ Server-side validation of permissions
✅ Error messages don't leak sensitive data

---

## 📈 Performance Tips

- Mentors list loads only when modal opens
- Uses pagination if more than 50 mentors (can add later)
- Caches mentor list for 5 minutes (can add later)
- Debounces assignment API calls
- No unnecessary re-renders in modal

---

## 🎨 UI/UX Features

- Smooth animations and transitions
- Clear visual feedback on mentor selection
- Loading spinners during API calls
- Color-coded status messages (green = success, red = error)
- Responsive design works on mobile too
- Keyboard navigation support
- Close modal with ESC key (can add)

---

**Version:** 1.0
**Last Updated:** January 2026
**Status:** ✅ Production Ready
