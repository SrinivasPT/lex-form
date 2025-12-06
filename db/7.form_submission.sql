-- Create form_submission table for storing form data as JSON

USE lex_form_db
GO

CREATE TABLE dbo.form_submission (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    form_code VARCHAR(128) NOT NULL,
    submission_data NVARCHAR(MAX) NOT NULL, -- JSON data
    submitted_at DATETIME2 DEFAULT GETDATE(),

    -- Foreign key to form
    CONSTRAINT fk_form_submission_form FOREIGN KEY (form_code) REFERENCES dbo.form(code),

    -- Ensure it's valid JSON
    CONSTRAINT chk_submission_json CHECK (ISJSON(submission_data) = 1)
);