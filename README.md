# LexForm - Dynamic Form Builder

A metadata-driven form builder with tree navigation and CRUD operations for managing control schemas.

## 🚀 Quick Start

### Prerequisites

-   Node.js 18+
-   SQL Server 2019+
-   npm 11+

### Installation

```bash
# Clone repository
git clone <repository-url>
cd lex-form

# Install frontend dependencies
npm install

# Install backend dependencies
cd backend
npm install
cd ..
```

### Database Setup

```bash
# Connect to SQL Server
sqlcmd -U lex_form_user -S localhost

# Run database scripts in order
cd db
sqlcmd -U lex_form_user -S localhost -i 0.util.sql
sqlcmd -U lex_form_user -S localhost -i 1.0.schema.sql
sqlcmd -U lex_form_user -S localhost -i 2.insert_domain_data.sql
sqlcmd -U lex_form_user -S localhost -i 3.insert_control_master.sql
sqlcmd -U lex_form_user -S localhost -i 4.insert_control_group.sql
sqlcmd -U lex_form_user -S localhost -i 5.table_control_creation.sql
sqlcmd -U lex_form_user -S localhost -i 6.insert_form.sql
sqlcmd -U lex_form_user -S localhost -i 7.employee_form.sql
```

### Backend Configuration

Create `backend/.env` file:

```env
DB_SERVER=localhost
DB_PORT=1433
DB_USER=lex_form_user
DB_PASSWORD=your_password
DB_NAME=lex_form_db
PORT=3001
```

### Running the Application

```bash
# Terminal 1: Start backend server
cd backend
npm start

# Terminal 2: Start frontend dev server
npm start
```

Navigate to `http://localhost:4200`

## 📋 Features

### Form Admin

-   **Tree Navigation**: Hierarchical view of form controls
-   **CRUD Operations**: Create, read, update, delete controls
-   **Two Workflows**:
    -   **Create New**: Minimal dialog → Creates SECTION/TAB/GROUP controls
    -   **Associate Existing**: Multi-select dialog → Bulk associate BASE controls
-   **Context Menu**: Right-click operations on tree nodes
-   **Conditional Fields**: Dynamic form based on control type
-   **Toast Notifications**: User-friendly feedback for all operations

### Demo App

-   **Dynamic Forms**: Schema-driven form rendering
-   **Reactive Forms**: Real-time validation and state management
-   **Tree Control**: Hierarchical data selection
-   **Table Control**: Editable data grids

## 🗂️ Project Structure

```
lex-form/
├── backend/                  # Node.js Express API
│   ├── server.js            # Main server file
│   ├── form_admin.js        # Form Admin endpoints
│   └── test-form-admin.js   # API test script
├── db/                      # Database scripts
│   ├── 0.util.sql           # Utility stored procedures
│   ├── 1.0.schema.sql       # Core schema
│   ├── 2.insert_domain_data.sql  # Domain/lookup data
│   ├── 6.insert_form.sql    # Control form schema
│   └── ...
├── docs/                    # Documentation
│   ├── form-admin-design.md # Design specification
│   └── form-admin-testing.md # Test plan
├── src/
│   └── app/
│       ├── core/
│       │   └── services/
│       │       ├── form-data.service.ts  # API client
│       │       └── toast.service.ts      # Notifications
│       ├── form-admin/      # Form Admin feature
│       │   ├── form-admin-control.component.ts
│       │   ├── create-control-dialog.component.ts
│       │   └── associate-controls-dialog.component.ts
│       └── shared/
│           ├── components/
│           │   └── toast-container.component.ts
│           └── layout/
└── projects/
    └── form-lib/            # Reusable form library
```

## 🧪 Testing

### Backend API Tests

```bash
cd backend
node test-form-admin.js
```

### Manual Testing

See [docs/form-admin-testing.md](docs/form-admin-testing.md) for comprehensive test plan.

**Quick Smoke Test**:

1. Navigate to http://localhost:4200/form-admin/control_form
2. Verify tree loads with controls
3. Click different nodes
4. Right-click node → Create Control
5. Right-click node → Associate Controls
6. Edit a control and save

## 📚 API Documentation

### Form Admin Endpoints

All endpoints prefixed with `/api/form-admin`

#### GET /controls

Get all controls for association dialog

**Response**: `200 OK`

```json
[
    {
        "code": "employee_name",
        "atomicLevelCode": "BASE",
        "type": "text",
        "label": "Employee Name",
        "sortOrder": 1
    }
]
```

#### POST /control

Create new control

**Request Body**:

```json
{
    "code": "test_section",
    "atomic_level_code": "SECTION",
    "type": "section",
    "label": "Test Section",
    "sort_order": 10
}
```

**Response**: `201 Created`

#### PUT /control/:code

Update control metadata

**Request Body**: Partial control object with fields to update

**Response**: `200 OK`

#### POST /control-group

Create bulk associations

**Request Body**:

```json
{
    "control_code": "parent_section",
    "child_control_codes": ["control1", "control2"],
    "width": "[12, 6]"
}
```

**Response**: `201 Created`

#### DELETE /control-group/:parent/:child

Delete single association

**Response**: `200 OK`

#### GET /control/:code/can-delete

Check delete eligibility

**Response**: `200 OK`

```json
{
    "canDelete": true,
    "deletesAssociation": false,
    "deletesControl": true,
    "reason": "Control has no associations"
}
```

#### DELETE /control/:code

Delete control or remove association

**Response**: `200 OK`

## 🏗️ Architecture

### Frontend

-   **Angular 21**: Standalone components with signals
-   **Material Design**: UI components and theming
-   **RxJS**: Reactive data streams
-   **Form-Lib**: Custom reusable form library

### Backend

-   **Node.js + Express**: REST API server
-   **mssql**: SQL Server database driver
-   **No ORM**: Direct SQL queries for transparency
-   **No Stored Procedures**: Business logic in Node.js

### Database

-   **SQL Server**: Temporal tables for audit history
-   **Schema-Driven**: Everything is a "control" (BASE, COMPOSITE, SECTION)
-   **Recursive Relationships**: control_group for parent-child associations

## 🔧 Development

### Code Conventions

See [.github/copilot-instructions.md](.github/copilot-instructions.md)

-   **Angular**: `.github/instructions/angular.instructions.md`
-   **Backend**: `.github/instructions/backend.instructions.md`
-   **Database**: `.github/instructions/db.instructions.md`

### Adding New Features

1. **Backend**: Add endpoint to `backend/form_admin.js`
2. **Service**: Add method to `form-data.service.ts`
3. **Component**: Implement UI in Form Admin component
4. **Test**: Add test cases to `test-form-admin.js`
5. **Document**: Update relevant docs

## 📖 Key Concepts

### Control Hierarchy

-   **BASE**: Database column-level controls (text, select, date, etc.)
-   **COMPOSITE**: Table-level aggregates (data tables)
-   **SECTION/TAB/GROUP**: UI organizational containers

### Two Workflows

1. **Create New Control**: For SECTION/TAB/GROUP organizational elements
2. **Associate Existing Controls**: For linking BASE controls to containers

### Delete Logic

-   **BASE controls**: Delete removes association only (control still exists)
-   **SECTION controls**: Delete removes control IF no dependencies exist
-   **Validation**: Backend checks parent and child associations before delete

## 🚧 Known Limitations

1. Tree hierarchy endpoint needs implementation
2. Cascading select support in progress
3. Expression evaluation for conditional visibility
4. Drag-and-drop reordering not yet implemented

See [docs/form-admin-testing.md](docs/form-admin-testing.md) for full list.

## 📝 License

MIT

## 🤝 Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

---

**Need Help?** Check [docs/](docs/) folder for detailed documentation.
