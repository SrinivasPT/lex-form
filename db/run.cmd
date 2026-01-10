@echo off
REM Generic script to run all .sql files in the current directory using sqlcmd
REM Usage: run.cmd [server] [user] [database]
REM Defaults: server=localhost, user=lex_form_user, database=lex_form_db

REM Set defaults
SET SERVER=%~1
IF "%SERVER%"=="" SET SERVER=localhost

SET USER=%~2
IF "%USER%"=="" SET USER=lex_form_user

SET DATABASE=%~3
IF "%DATABASE%"=="" SET DATABASE=lex_form_db

REM Prompt for password securely
SET /P PASSWORD=Enter database password for user '%USER%' on '%SERVER%\%DATABASE%': 

echo ========================================
echo Starting SQL script execution on %SERVER%\%DATABASE% as %USER%
echo ========================================
echo.

REM Get list of .sql files sorted by name and run them
FOR /F "delims=" %%f IN ('dir /b /on *.sql 2^>nul') DO (
    echo ========================================
    echo Running %%f
    echo ========================================
    sqlcmd -S "%SERVER%" -U "%USER%" -P "%PASSWORD%" -d "%DATABASE%" -i "%%f"
    IF %ERRORLEVEL% NEQ 0 (
        echo Error running %%f
        echo Check the script or database connection.
        exit /b 1
    )
    echo Completed %%f
    echo.
)

echo ========================================
echo All SQL files executed successfully on %SERVER%\%DATABASE%.
echo ========================================