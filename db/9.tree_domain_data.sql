-- -- Example: Hierarchical Department Data for Tree Control
-- -- This demonstrates how to structure domain data for tree controls

-- -- First, ensure the domain_value table supports parentCode
-- -- (It should already have this column based on the schema)

-- -- Insert root-level departments
-- INSERT INTO domain_value (category_code, code, display_text, parent_code, display_order)
-- VALUES
--     ('DEPARTMENT', 'ENG', 'Engineering', NULL, 1),
--     ('DEPARTMENT', 'SALES', 'Sales', NULL, 2),
--     ('DEPARTMENT', 'SUPPORT', 'Support', NULL, 3),
--     ('DEPARTMENT', 'ADMIN', 'Administration', NULL, 4);

-- -- Insert Engineering sub-departments
-- INSERT INTO domain_value (category_code, code, display_text, parent_code, display_order)
-- VALUES
--     ('DEPARTMENT', 'ENG-FE', 'Frontend Team', 'ENG', 1),
--     ('DEPARTMENT', 'ENG-BE', 'Backend Team', 'ENG', 2),
--     ('DEPARTMENT', 'ENG-QA', 'QA Team', 'ENG', 3),
--     ('DEPARTMENT', 'ENG-DEVOPS', 'DevOps Team', 'ENG', 4);

-- -- Insert Frontend sub-teams
-- INSERT INTO domain_value (category_code, code, display_text, parent_code, display_order)
-- VALUES
--     ('DEPARTMENT', 'ENG-FE-WEB', 'Web Frontend', 'ENG-FE', 1),
--     ('DEPARTMENT', 'ENG-FE-MOBILE', 'Mobile Frontend', 'ENG-FE', 2);

-- -- Insert Sales sub-departments
-- INSERT INTO domain_value (category_code, code, display_text, parent_code, display_order)
-- VALUES
--     ('DEPARTMENT', 'SALES-ENT', 'Enterprise Sales', 'SALES', 1),
--     ('DEPARTMENT', 'SALES-SMB', 'SMB Sales', 'SALES', 2),
--     ('DEPARTMENT', 'SALES-PRESALES', 'Pre-Sales', 'SALES', 3);

-- -- Insert Support sub-departments
-- INSERT INTO domain_value (category_code, code, display_text, parent_code, display_order)
-- VALUES
--     ('DEPARTMENT', 'SUPPORT-L1', 'Level 1 Support', 'SUPPORT', 1),
--     ('DEPARTMENT', 'SUPPORT-L2', 'Level 2 Support', 'SUPPORT', 2),
--     ('DEPARTMENT', 'SUPPORT-L3', 'Level 3 Support', 'SUPPORT', 3);

-- -- Example: Geographic Location Hierarchy
-- INSERT INTO domain_value (category_code, code, display_text, parent_code, display_order)
-- VALUES
--     -- Countries
--     ('LOCATION', 'USA', 'United States', NULL, 1),
--     ('LOCATION', 'CAN', 'Canada', NULL, 2),
--     ('LOCATION', 'UK', 'United Kingdom', NULL, 3),
    
--     -- US States
--     ('LOCATION', 'USA-CA', 'California', 'USA', 1),
--     ('LOCATION', 'USA-NY', 'New York', 'USA', 2),
--     ('LOCATION', 'USA-TX', 'Texas', 'USA', 3),
    
--     -- California Cities
--     ('LOCATION', 'USA-CA-SF', 'San Francisco', 'USA-CA', 1),
--     ('LOCATION', 'USA-CA-LA', 'Los Angeles', 'USA-CA', 2),
--     ('LOCATION', 'USA-CA-SD', 'San Diego', 'USA-CA', 3),
    
--     -- New York Cities
--     ('LOCATION', 'USA-NY-NYC', 'New York City', 'USA-NY', 1),
--     ('LOCATION', 'USA-NY-BUF', 'Buffalo', 'USA-NY', 2),
    
--     -- Canadian Provinces
--     ('LOCATION', 'CAN-ON', 'Ontario', 'CAN', 1),
--     ('LOCATION', 'CAN-BC', 'British Columbia', 'CAN', 2),
    
--     -- Ontario Cities
--     ('LOCATION', 'CAN-ON-TOR', 'Toronto', 'CAN-ON', 1),
--     ('LOCATION', 'CAN-ON-OTT', 'Ottawa', 'CAN-ON', 2);

-- -- Example: Product Category Hierarchy
-- INSERT INTO domain_value (category_code, code, display_text, parent_code, display_order)
-- VALUES
--     -- Top Level
--     ('PRODUCT_CAT', 'ELEC', 'Electronics', NULL, 1),
--     ('PRODUCT_CAT', 'FURN', 'Furniture', NULL, 2),
    
--     -- Electronics Categories
--     ('PRODUCT_CAT', 'ELEC-COMP', 'Computers', 'ELEC', 1),
--     ('PRODUCT_CAT', 'ELEC-PHONE', 'Phones', 'ELEC', 2),
--     ('PRODUCT_CAT', 'ELEC-ACC', 'Accessories', 'ELEC', 3),
    
--     -- Computer Sub-categories
--     ('PRODUCT_CAT', 'ELEC-COMP-LAPTOP', 'Laptops', 'ELEC-COMP', 1),
--     ('PRODUCT_CAT', 'ELEC-COMP-DESKTOP', 'Desktops', 'ELEC-COMP', 2),
--     ('PRODUCT_CAT', 'ELEC-COMP-TABLET', 'Tablets', 'ELEC-COMP', 3),
    
--     -- Furniture Categories
--     ('PRODUCT_CAT', 'FURN-OFF', 'Office Furniture', 'FURN', 1),
--     ('PRODUCT_CAT', 'FURN-HOME', 'Home Furniture', 'FURN', 2),
    
--     -- Office Furniture Sub-categories
--     ('PRODUCT_CAT', 'FURN-OFF-DESK', 'Desks', 'FURN-OFF', 1),
--     ('PRODUCT_CAT', 'FURN-OFF-CHAIR', 'Chairs', 'FURN-OFF', 2),
--     ('PRODUCT_CAT', 'FURN-OFF-STORAGE', 'Storage', 'FURN-OFF', 3);

-- -- Query to verify the hierarchy
-- SELECT 
--     dv.category_code,
--     dv.code,
--     dv.display_text,
--     dv.parent_code,
--     dv.display_order,
--     parent.display_text as parent_name
-- FROM domain_value dv
-- LEFT JOIN domain_value parent ON dv.parent_code = parent.code
-- WHERE dv.category_code IN ('DEPARTMENT', 'LOCATION', 'PRODUCT_CAT')
-- ORDER BY dv.category_code, dv.display_order;
