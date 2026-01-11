# Form Admin - Final Verification Checklist

## Pre-Launch Checklist

### ☑️ Database Setup

-   [ ] SQL Server is running
-   [ ] Database `lex_form_db` exists
-   [ ] User `lex_form_user` has access
-   [ ] All migration scripts executed successfully:
    -   [ ] `0.util.sql`
    -   [ ] `1.0.schema.sql`
    -   [ ] `2.insert_domain_data.sql`
    -   [ ] `3.insert_control_master.sql`
    -   [ ] `4.insert_control_group.sql`
    -   [ ] `5.table_control_creation.sql`
    -   [ ] `6.insert_form.sql`
    -   [ ] `7.employee_form.sql`

**Quick Verify**:

```sql
SELECT * FROM dbo.form WHERE code = 'control_form';
SELECT * FROM dbo.domain_data WHERE category_code = 'ATOMIC_LEVEL';
SELECT * FROM dbo.domain_data WHERE category_code = 'CONTROL_TYPE';
SELECT COUNT(*) FROM dbo.control; -- Should have controls
SELECT COUNT(*) FROM dbo.control_group; -- Should have associations
```

### ☑️ Backend Configuration

-   [ ] `backend/.env` file exists
-   [ ] Database credentials correct in `.env`
-   [ ] Port 3001 is available
-   [ ] Dependencies installed (`npm install` in backend/)

**Quick Verify**:

```bash
cd backend
npm start
# Should see: "Connected to SQL Server" and "Server running on port 3001"
```

**Test Endpoint**:

```bash
curl http://localhost:3001/api/form-admin/controls
# Should return JSON array of controls
```

### ☑️ Frontend Configuration

-   [ ] Dependencies installed (`npm install` in root)
-   [ ] Port 4200 is available
-   [ ] No compilation errors

**Quick Verify**:

```bash
npm start
# Should compile successfully
# Navigate to http://localhost:4200
```

### ☑️ Automated Tests

-   [ ] Run backend API tests:

```bash
cd backend
node test-form-admin.js
# Should pass all 10 tests
```

### ☑️ Manual Smoke Test (5 minutes)

**Step 1: Access Form Admin**

-   [ ] Navigate to `http://localhost:4200/form-admin/control_form`
-   [ ] No console errors
-   [ ] Page loads successfully
-   [ ] Header shows "Form Administration"

**Step 2: Tree Navigation**

-   [ ] Tree loads in left panel
-   [ ] Tree shows control hierarchy
-   [ ] Clicking nodes updates form on right
-   [ ] Form fields populate with data
-   [ ] Loading spinner appears briefly

**Step 3: Context Menu**

-   [ ] Right-click on a SECTION node
-   [ ] Context menu appears
-   [ ] Menu shows: "Create Child Control", "Associate Controls", "Delete"
-   [ ] Right-click on BASE node (e.g., text input)
-   [ ] Context menu does NOT appear (correct behavior)

**Step 4: Create Control**

-   [ ] Click "Create Control" button in header
-   [ ] Dialog opens
-   [ ] Fill form:
    -   Code: `test_section_${timestamp}`
    -   Atomic Level: SECTION
    -   Type: section
    -   Label: Test Section
-   [ ] Click "Create"
-   [ ] Toast notification: "Control created and associated successfully"
-   [ ] Tree refreshes
-   [ ] New control appears in tree
-   [ ] New control auto-selected

**Step 5: Associate Controls**

-   [ ] Select test_section node (or any SECTION node)
-   [ ] Click "Associate Controls" button
-   [ ] Dialog opens with table of available controls
-   [ ] Filter textbox works
-   [ ] Select 2-3 BASE controls
-   [ ] Click "Associate X Control(s)"
-   [ ] Toast notification: "X control(s) associated successfully"
-   [ ] Tree refreshes
-   [ ] Associated controls appear as children

**Step 6: Edit Control**

-   [ ] Select test_section node
-   [ ] Modify "Label" field
-   [ ] Modify "Help Text" field
-   [ ] Click "Save"
-   [ ] Toast notification: "Control updated successfully"
-   [ ] Select another node, then back to test_section
-   [ ] Changes persisted

**Step 7: Delete Attempt (With Dependencies)**

-   [ ] Right-click test_section (has children from step 5)
-   [ ] Select "Delete"
-   [ ] Confirm dialog
-   [ ] Toast notification: "Failed to delete: Control has X parent association(s) and Y child association(s)"
-   [ ] Control remains in tree (correct behavior)

**Step 8: Remove Associations**

-   [ ] Right-click one of the associated child controls
-   [ ] Select "Delete"
-   [ ] Toast notification: "Control association removed successfully"
-   [ ] Child removed from parent (but still exists in system)

**Step 9: Delete Control (No Dependencies)**

-   [ ] Right-click test_section (now has no children)
-   [ ] Select "Delete"
-   [ ] Confirm dialog
-   [ ] Toast notification: "Control deleted successfully"
-   [ ] Tree refreshes
-   [ ] Control removed from tree

**Step 10: Form Validation**

-   [ ] Select a control
-   [ ] Clear required field (e.g., Label)
-   [ ] Save button becomes disabled
-   [ ] Fill field again
-   [ ] Save button enabled
-   [ ] Click "Reset"
-   [ ] Form reverts to original values

### ☑️ Edge Cases

**Test 1: Duplicate Code**

-   [ ] Try creating control with existing code
-   [ ] Toast error: "Failed to create control: Control code already exists"

**Test 2: Invalid Pattern**

-   [ ] Try creating control with uppercase or spaces in code
-   [ ] Validation error appears
-   [ ] Create button disabled

**Test 3: Rapid Navigation**

-   [ ] Click through tree nodes quickly
-   [ ] Loading states appear/disappear smoothly
-   [ ] No errors in console
-   [ ] Form data matches selected node

**Test 4: Empty Fields**

-   [ ] Try creating control without label
-   [ ] Required field validation appears
-   [ ] Create button disabled

### ☑️ Browser Console Check

-   [ ] Open browser DevTools (F12)
-   [ ] Navigate through Form Admin
-   [ ] No red errors in console
-   [ ] Only informational logs (API calls, etc.)

### ☑️ Network Tab Check

-   [ ] Open Network tab in DevTools
-   [ ] Perform operations (create, associate, delete)
-   [ ] All API calls return proper status codes:
    -   200 OK for successful operations
    -   201 Created for create operations
    -   404 Not Found for missing resources
    -   400 Bad Request for validation errors
    -   409 Conflict for duplicate codes

### ☑️ Toast Notifications

-   [ ] Success toasts are green
-   [ ] Error toasts are red
-   [ ] Toasts auto-dismiss after 3-5 seconds
-   [ ] Click X or toast itself to dismiss immediately
-   [ ] Multiple toasts stack vertically

### ☑️ Responsive Design

-   [ ] Tree panel has fixed width (300px)
-   [ ] Form panel fills remaining space
-   [ ] Header is sticky at top
-   [ ] Dialogs are centered and sized appropriately
-   [ ] No horizontal scrollbar on main page

### ☑️ Accessibility

-   [ ] Tab navigation works through form fields
-   [ ] Enter key submits forms in dialogs
-   [ ] Escape key closes dialogs
-   [ ] ARIA labels present
-   [ ] Focus indicators visible

## Known Issues / Limitations

Document any issues found during verification:

### Issue 1:

-   **Description**:
-   **Severity**: Critical / High / Medium / Low
-   **Workaround**:
-   **Fix Required**: Yes / No

### Issue 2:

-   **Description**:
-   **Severity**:
-   **Workaround**:
-   **Fix Required**:

## Sign-Off

**Verified By**: ********\_\_\_********
**Date**: ********\_\_\_********
**Status**: ✅ Pass / ❌ Fail
**Notes**:

---

## Quick Troubleshooting

### Backend won't start

-   Check database connection in `.env`
-   Verify SQL Server is running
-   Check port 3001 is not in use
-   Review console for specific error

### Frontend compilation errors

-   Run `npm install` again
-   Clear `node_modules` and reinstall
-   Check for TypeScript errors
-   Verify all imports are correct

### Tree not loading

-   Check backend is running
-   Verify API endpoint in browser: `http://localhost:3001/api/form-admin/controls`
-   Check browser console for errors
-   Verify database has data

### Context menu not appearing

-   Right-click on SECTION/TAB/GROUP nodes only (not BASE)
-   Check MatMenuModule is imported
-   Verify no JavaScript errors

### Toast notifications not showing

-   Check ToastContainerComponent is in app.component.ts
-   Verify ToastService is provided in root
-   Check z-index isn't being overridden

### Save not working

-   Check form is valid (no validation errors)
-   Check backend endpoint is correct
-   Verify database connection
-   Check browser Network tab for API call status

---

**Ready for Production**: ☐ Yes ☐ No ☐ With Reservations

**If No, What's Needed**:

1.
2.
3.
