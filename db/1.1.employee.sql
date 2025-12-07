USE lex_form_db
GO

-- =============================================
-- 2. EMPLOYEE TABLE
-- =============================================

CREATE TABLE dbo.employee (
    id NVARCHAR(50) PRIMARY KEY,
    first_name NVARCHAR(100) NOT NULL,
    last_name NVARCHAR(100) NOT NULL,
    nick_name NVARCHAR(100),
    email NVARCHAR(255) UNIQUE NOT NULL,
    date_of_birth DATE,
    is_married BIT DEFAULT 0,
    age INT,
    about NVARCHAR(MAX),
    nationality NVARCHAR(10),
    has_nick_name BIT DEFAULT 0,

    -- System Versioning
    guid UNIQUEIDENTIFIER DEFAULT NEWID(),
    sys_start_time DATETIME2(7) GENERATED ALWAYS AS ROW START HIDDEN NOT NULL,
    sys_end_time   DATETIME2(7) GENERATED ALWAYS AS ROW END HIDDEN NOT NULL,
    PERIOD FOR SYSTEM_TIME (sys_start_time, sys_end_time)
)
WITH (SYSTEM_VERSIONING = ON (HISTORY_TABLE = dbo.employee_history));

-- =============================================
-- 3. EMPLOYEE ADDRESS TABLE
-- =============================================
CREATE TABLE dbo.employee_address (
    id INT IDENTITY(1,1) PRIMARY KEY,
        employee_id NVARCHAR(50) NOT NULL,
        street NVARCHAR(255),
        city NVARCHAR(100),
        country_code NVARCHAR(10),
        state_code NVARCHAR(10),

        -- System Versioning
        guid UNIQUEIDENTIFIER DEFAULT NEWID(),
        sys_start_time DATETIME2(7) GENERATED ALWAYS AS ROW START HIDDEN NOT NULL,
        sys_end_time   DATETIME2(7) GENERATED ALWAYS AS ROW END HIDDEN NOT NULL,
        PERIOD FOR SYSTEM_TIME (sys_start_time, sys_end_time),

        CONSTRAINT fk_employee_address_employee FOREIGN KEY (employee_id) REFERENCES dbo.employee(id)
    )
WITH (SYSTEM_VERSIONING = ON (HISTORY_TABLE = dbo.employee_address_history));

-- =============================================
-- 4. EMPLOYEE DEPENDENT TABLE
-- =============================================
CREATE TABLE dbo.employee_dependent (
    id INT IDENTITY(1,1) PRIMARY KEY,
    employee_id NVARCHAR(50) NOT NULL,
        dep_id NVARCHAR(50) NOT NULL,
        first_name NVARCHAR(100) NOT NULL,
        last_name NVARCHAR(100) NOT NULL,
        relation NVARCHAR(50),
        age INT,

        -- System Versioning
        guid UNIQUEIDENTIFIER DEFAULT NEWID(),
        sys_start_time DATETIME2(7) GENERATED ALWAYS AS ROW START HIDDEN NOT NULL,
        sys_end_time   DATETIME2(7) GENERATED ALWAYS AS ROW END HIDDEN NOT NULL,
        PERIOD FOR SYSTEM_TIME (sys_start_time, sys_end_time),

        CONSTRAINT fk_employee_dependent_employee FOREIGN KEY (employee_id) REFERENCES dbo.employee(id)
    )
WITH (SYSTEM_VERSIONING = ON (HISTORY_TABLE = dbo.employee_dependent_history));

-- =============================================
-- 5. INDEXES
-- =============================================

CREATE INDEX idx_employee_email ON dbo.employee(email);
CREATE INDEX idx_employee_address_employee_id ON dbo.employee_address(employee_id);
CREATE INDEX idx_employee_dependent_employee_id ON dbo.employee_dependent(employee_id);

GO
