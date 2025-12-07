-- Insert domain data for countries
USE lex_form_db
GO

INSERT INTO dbo.domain_data (category_code, code, display_text, parent_code, extension_json)
VALUES
    ('COUNTRY_CODE', 'US', 'United States', NULL, '{}'),
    ('COUNTRY_CODE', 'CA', 'Canada', NULL, '{}'),
    ('COUNTRY_CODE', 'UK', 'United Kingdom', NULL, '{}');

-- Insert domain data for states
INSERT INTO dbo.domain_data (category_code, code, display_text, parent_code, extension_json)
VALUES
    ('STATE_CODE', 'NY', 'New York', 'US', '{}'),
    ('STATE_CODE', 'CA', 'California', 'US', '{}'),
    ('STATE_CODE', 'TX', 'Texas', 'US', '{}'),
    ('STATE_CODE', 'ON', 'Ontario', 'CA', '{}'),
    ('STATE_CODE', 'QC', 'Quebec', 'CA', '{}'),
    ('STATE_CODE', 'BC', 'British Columbia', 'CA', '{}');
GO
