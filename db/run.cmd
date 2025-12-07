@echo off
REM Run SQL files using sqlcmd in the specified order

SET /P PASSWORD=Enter database password: 

echo ========================================
echo Running 0.util.sql
echo ========================================
sqlcmd -S localhost -U lex_form_user -P "%PASSWORD%" -d lex_form_db -i 0.util.sql
IF %ERRORLEVEL% NEQ 0 (
    echo Error running 0.util.sql
    exit /b 1
)
echo Completed 0.util.sql
echo.

echo ========================================
echo Running 0.0drop_all_objects.sql
echo ========================================
sqlcmd -S localhost -U lex_form_user -P "%PASSWORD%" -d lex_form_db -i 0.0drop_all_objects.sql
IF %ERRORLEVEL% NEQ 0 (
    echo Error running 0.0drop_all_objects.sql
    exit /b 1
)
echo Completed 0.0drop_all_objects.sql
echo.

echo ========================================
echo Running 1.0.schema.sql
echo ========================================
sqlcmd -S localhost -U lex_form_user -P "%PASSWORD%" -d lex_form_db -i 1.0.schema.sql
IF %ERRORLEVEL% NEQ 0 (
    echo Error running 1.0.schema.sql
    exit /b 1
)
echo Completed 1.0.schema.sql
echo.

echo ========================================
echo Running 1.1.employee.sql
echo ========================================
sqlcmd -S localhost -U lex_form_user -P "%PASSWORD%" -d lex_form_db -i 1.1.employee.sql
IF %ERRORLEVEL% NEQ 0 (
    echo Error running 1.1.employee.sql
    exit /b 1
)
echo Completed 1.1.employee.sql
echo.

echo ========================================
echo Running 2.insert_domain_data.sql
echo ========================================
sqlcmd -S localhost -U lex_form_user -P "%PASSWORD%" -d lex_form_db -i 2.insert_domain_data.sql
IF %ERRORLEVEL% NEQ 0 (
    echo Error running 2.insert_domain_data.sql
    exit /b 1
)
echo Completed 2.insert_domain_data.sql
echo.

echo ========================================
echo Running 3.insert_control_master.sql
echo ========================================
sqlcmd -S localhost -U lex_form_user -P "%PASSWORD%" -d lex_form_db -i 3.insert_control_master.sql
IF %ERRORLEVEL% NEQ 0 (
    echo Error running 3.insert_control_master.sql
    exit /b 1
)
echo Completed 3.insert_control_master.sql
echo.

echo ========================================
echo Running 4.insert_control_group.sql
echo ========================================
sqlcmd -S localhost -U lex_form_user -P "%PASSWORD%" -d lex_form_db -i 4.insert_control_group.sql
IF %ERRORLEVEL% NEQ 0 (
    echo Error running 4.insert_control_group.sql
    exit /b 1
)
echo Completed 4.insert_control_group.sql
echo.

echo ========================================
echo Running 5.table_control_creation.sql
echo ========================================
sqlcmd -S localhost -U lex_form_user -P "%PASSWORD%" -d lex_form_db -i 5.table_control_creation.sql
IF %ERRORLEVEL% NEQ 0 (
    echo Error running 5.table_control_creation.sql
    exit /b 1
)
echo Completed 5.table_control_creation.sql
echo.

echo ========================================
echo Running 6.insert_form.sql
echo ========================================
sqlcmd -S localhost -U lex_form_user -P "%PASSWORD%" -d lex_form_db -i 6.insert_form.sql
IF %ERRORLEVEL% NEQ 0 (
    echo Error running 6.insert_form.sql
    exit /b 1
)
echo Completed 6.insert_form.sql
echo.

echo ========================================
echo Running 7.employee_form.sql
echo ========================================
sqlcmd -S localhost -U lex_form_user -P "%PASSWORD%" -d lex_form_db -i 7.employee_form.sql
IF %ERRORLEVEL% NEQ 0 (
    echo Error running 7.employee_form.sql
    exit /b 1
)
echo Completed 7.employee_form.sql
echo.

echo ========================================
echo Running 8.other_scripts.sql
echo ========================================
sqlcmd -S localhost -U lex_form_user -P "%PASSWORD%" -d lex_form_db -i 8.other_scripts.sql
IF %ERRORLEVEL% NEQ 0 (
    echo Error running 8.other_scripts.sql
    exit /b 1
)
echo Completed 8.other_scripts.sql
echo.

echo All SQL files executed successfully.
