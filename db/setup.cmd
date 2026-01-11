@echo off
REM Quick setup script for LexForm database
REM Run this from the db folder

echo.
echo ========================================
echo LexForm Database Setup
echo ========================================
echo.

set /p SQLCMD_USER="Enter SQL Server username (default: lex_form_user): " || set SQLCMD_USER=lex_form_user
set /p SQLCMD_SERVER="Enter SQL Server (default: localhost): " || set SQLCMD_SERVER=localhost

echo.
echo Connecting to SQL Server: %SQLCMD_SERVER%
echo Using username: %SQLCMD_USER%
echo.

echo [1/8] Running utility scripts...
sqlcmd -U %SQLCMD_USER% -S %SQLCMD_SERVER% -i 0.util.sql
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Failed to run utility scripts
    pause
    exit /b 1
)

echo [2/8] Creating schema...
sqlcmd -U %SQLCMD_USER% -S %SQLCMD_SERVER% -i 1.0.schema.sql
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Failed to create schema
    pause
    exit /b 1
)

echo [3/8] Inserting domain data...
sqlcmd -U %SQLCMD_USER% -S %SQLCMD_SERVER% -i 2.insert_domain_data.sql
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Failed to insert domain data
    pause
    exit /b 1
)

echo [4/8] Creating control master...
sqlcmd -U %SQLCMD_USER% -S %SQLCMD_SERVER% -i 3.insert_control_master.sql
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Failed to create control master
    pause
    exit /b 1
)

echo [5/8] Creating control groups...
sqlcmd -U %SQLCMD_USER% -S %SQLCMD_SERVER% -i 4.insert_control_group.sql
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Failed to create control groups
    pause
    exit /b 1
)

echo [6/8] Creating table controls...
sqlcmd -U %SQLCMD_USER% -S %SQLCMD_SERVER% -i 5.table_control_creation.sql
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Failed to create table controls
    pause
    exit /b 1
)

echo [7/8] Creating control form...
sqlcmd -U %SQLCMD_USER% -S %SQLCMD_SERVER% -i 6.insert_form.sql
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Failed to create control form
    pause
    exit /b 1
)

echo [8/8] Creating employee form...
sqlcmd -U %SQLCMD_USER% -S %SQLCMD_SERVER% -i 7.employee_form.sql
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Failed to create employee form
    pause
    exit /b 1
)

echo.
echo ========================================
echo Database setup completed successfully!
echo ========================================
echo.
echo Next steps:
echo 1. Configure backend/.env with database credentials
echo 2. Start backend: cd backend ^&^& npm start
echo 3. Start frontend: npm start
echo 4. Navigate to http://localhost:4200/form-admin/control_form
echo.

pause
