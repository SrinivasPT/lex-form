SELECT * FROM dbo.form;

SELECT
                f.code,
                f.version,
                f.label,
                JSON_QUERY((
                    SELECT
                        c.label,
                        c.[key],
                        c.[type],
                        -- Parse layout_config for width (assuming it's {"xs":12, "md":6} or similar)
                        -- For simplicity, using the JSON as is; you may need to parse it further
                        c.layout_config AS width,
                        JSON_QUERY((
                            SELECT
                                c2.code,
                                c2.[key],
                                c2.type,
                                c2.label,
                                c2.placeholder,
                                c2.help_text AS helpText,
                                c2.is_required AS required,
                                c2.is_readonly AS readonly,
                                c2.min_val AS min,
                                c2.max_val AS max,
                                c2.min_length AS minLength,
                                c2.max_length AS maxLength,
                                c2.pattern,
                                c2.category_code AS categoryCode,
                                c2.dependent_on AS dependentOn,
                                c2.visible_when AS visibleWhen,
                                c2.disabled_when AS disabledWhen,
                                c2.required_when AS requiredWhen,
                                c2.properties_json AS properties,
                                (SELECT JSON_QUERY((
                                    SELECT
                                        c3.code,
                                        c3.[key],
                                        c3.type,
                                        c3.label,
                                        c3.placeholder,
                                        c3.help_text AS helpText,
                                        c3.is_required AS required,
                                        c3.is_readonly AS readonly,
                                        c3.min_val AS min,
                                        c3.max_val AS max,
                                        c3.min_length AS minLength,
                                        c3.max_length AS maxLength,
                                        c3.pattern,
                                        c3.category_code AS categoryCode,
                                        c3.dependent_on AS dependentOn,
                                        c3.visible_when AS visibleWhen,
                                        c3.disabled_when AS disabledWhen,
                                        c3.required_when AS requiredWhen,
                                        c3.properties_json AS properties
                                    FROM dbo.control c3
                                    INNER JOIN dbo.control_group cg2 ON cg2.control_code = c2.code AND cg2.child_control_code = c3.code
                                    ORDER BY cg2.sort_order
                                    FOR JSON PATH
                                )) WHERE c2.type IN ('group','table')) AS controls
                            FROM dbo.control c2
                            INNER JOIN dbo.control_group cg ON cg.control_code = c.code AND cg.child_control_code = c2.code
                            ORDER BY cg.sort_order
                            FOR JSON PATH
                        )) AS controls
                    FROM dbo.control c
                    WHERE c.form_code = f.code
                        AND c.parent_control_code IS NULL
                        AND c.atomic_level_code = 'SECTION'  -- Assuming sections are top-level controls with this level
                    ORDER BY c.sort_order
                    FOR JSON PATH
                )) AS sections
            FROM dbo.form f
            WHERE f.code = 'control_form'
            FOR JSON PATH, WITHOUT_ARRAY_WRAPPER