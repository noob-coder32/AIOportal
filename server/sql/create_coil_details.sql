IF OBJECT_ID('dbo.coil_detail_entries', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.coil_detail_entries (
        id BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        coil_no NVARCHAR(100) NOT NULL,
        division_code NVARCHAR(50) NOT NULL,
        production_line NVARCHAR(100) NOT NULL,
        existing_thickness DECIMAL(18,4) NOT NULL,
        existing_item_code NVARCHAR(100) NOT NULL,
        existing_output_qty DECIMAL(18,3) NOT NULL,
        existing_output_width DECIMAL(18,3) NOT NULL,
        existing_output_length DECIMAL(18,3) NOT NULL,
        existing_output_grade NVARCHAR(100) NOT NULL,
        existing_output_bw DECIMAL(18,3) NOT NULL,
        existing_output_logo NVARCHAR(100) NOT NULL,
        existing_output_print_thickness NVARCHAR(100) NOT NULL,
        to_be_thickness DECIMAL(18,4) NOT NULL,
        to_be_item_code NVARCHAR(100) NOT NULL,
        to_be_output_qty DECIMAL(18,3) NOT NULL,
        to_be_output_width DECIMAL(18,3) NOT NULL,
        to_be_output_length DECIMAL(18,3) NOT NULL,
        to_be_output_grade NVARCHAR(100) NOT NULL,
        to_be_output_bw DECIMAL(18,3) NOT NULL,
        to_be_output_logo NVARCHAR(100) NOT NULL,
        to_be_output_print_thickness NVARCHAR(100) NOT NULL,
        created_by INT NULL,
        created_on DATETIME2 NOT NULL DEFAULT GETDATE()
    );
END;

IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = 'IX_coil_detail_entries_coil_no'
      AND object_id = OBJECT_ID('dbo.coil_detail_entries')
)
BEGIN
    CREATE INDEX IX_coil_detail_entries_coil_no
        ON dbo.coil_detail_entries (coil_no);
END;

IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = 'IX_coil_detail_entries_coil_division_line'
      AND object_id = OBJECT_ID('dbo.coil_detail_entries')
)
BEGIN
    CREATE INDEX IX_coil_detail_entries_coil_division_line
        ON dbo.coil_detail_entries (coil_no, division_code, production_line);
END;

IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = 'IX_coil_detail_entries_created_on_desc'
      AND object_id = OBJECT_ID('dbo.coil_detail_entries')
)
BEGIN
    CREATE INDEX IX_coil_detail_entries_created_on_desc
        ON dbo.coil_detail_entries (created_on DESC);
END;
