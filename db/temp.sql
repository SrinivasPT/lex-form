SELECT * FROM dbo.control WHERE type = 'SELECT';
SELECT * FROM dbo.form WHERE code = 'EMPLOYEE_FORM';
UPDATE dbo.control SET dependent_on = 'countryCode' WHERE code = 'employee_address.state_code';

SELECT code, display_text AS displayText, parent_code AS parentCode, extension_json AS extension FROM dbo.domain_data WHERE category_code = 'COUNTRY_CODE'
    AND is_active = 1 ORDER BY sort_order FOR JSON PATH

SELECT code, display_text AS displayText, parent_code AS parentCode, extension_json AS extension FROM dbo.domain_data WHERE category_code = 'STATE_CODE'
    AND is_active = 1 ORDER BY sort_order FOR JSON PATH    