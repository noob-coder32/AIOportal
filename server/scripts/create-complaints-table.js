require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });

const { execute } = require("../db/mssql");

const DB_NAME = process.env.DB_NAME;

async function ensureComplaintTables() {
    if (!DB_NAME) {
        throw new Error("DB_NAME is missing in backend/.env");
    }

    await execute(
        DB_NAME,
        `
        IF OBJECT_ID('dbo.complaints', 'U') IS NULL
        BEGIN
            CREATE TABLE dbo.complaints (
                id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
                complaint_no NVARCHAR(30) NULL,
                department NVARCHAR(200) NOT NULL,
                description NVARCHAR(MAX) NOT NULL,
                category NVARCHAR(100) NOT NULL,
                complaint_mode NVARCHAR(50) NULL,
                status NVARCHAR(20) NOT NULL
                    CONSTRAINT DF_complaints_status DEFAULT 'Pending',
                complainant_user_id INT NULL,
                complainant_name NVARCHAR(150) NULL,
                complainant_contact NVARCHAR(150) NULL,
                admin_remarks NVARCHAR(1000) NULL,
                created_by_user_id INT NOT NULL,
                created_at DATETIME2 NOT NULL
                    CONSTRAINT DF_complaints_created_at DEFAULT GETDATE(),
                resolved_at DATETIME2 NULL
            );
        END
        `
    );

    await execute(
        DB_NAME,
        `
        IF OBJECT_ID('dbo.complaint_attachments', 'U') IS NULL
        BEGIN
            CREATE TABLE dbo.complaint_attachments (
                id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
                complaint_id INT NOT NULL,
                original_name NVARCHAR(255) NOT NULL,
                stored_name NVARCHAR(255) NOT NULL,
                stored_path NVARCHAR(500) NOT NULL,
                mime_type NVARCHAR(100) NOT NULL,
                file_size BIGINT NOT NULL,
                uploaded_by_user_id INT NULL,
                created_at DATETIME2 NOT NULL
                    CONSTRAINT DF_complaint_attachments_created_at DEFAULT GETDATE()
            );

            ALTER TABLE dbo.complaint_attachments
                ADD CONSTRAINT FK_complaint_attachments_complaints
                FOREIGN KEY (complaint_id) REFERENCES dbo.complaints(id) ON DELETE CASCADE;
        END
        `
    );

    await execute(
        DB_NAME,
        `
        IF COL_LENGTH('dbo.complaints', 'department') IS NULL
           AND COL_LENGTH('dbo.complaints', 'title') IS NOT NULL
        BEGIN
            EXEC sp_rename 'dbo.complaints.title', 'department', 'COLUMN';
        END

        IF COL_LENGTH('dbo.complaints', 'complaint_no') IS NULL
        BEGIN
            ALTER TABLE dbo.complaints
                ADD complaint_no NVARCHAR(30) NULL;
        END

        IF COL_LENGTH('dbo.complaints', 'department') IS NULL
        BEGIN
            ALTER TABLE dbo.complaints
                ADD department NVARCHAR(200) NOT NULL
                    CONSTRAINT DF_complaints_department DEFAULT '';
        END

        IF COL_LENGTH('dbo.complaints', 'description') IS NULL
        BEGIN
            ALTER TABLE dbo.complaints
                ADD description NVARCHAR(MAX) NOT NULL
                    CONSTRAINT DF_complaints_description DEFAULT '';
        END

        IF COL_LENGTH('dbo.complaints', 'category') IS NULL
        BEGIN
            ALTER TABLE dbo.complaints
                ADD category NVARCHAR(100) NOT NULL
                    CONSTRAINT DF_complaints_category DEFAULT '';
        END

        IF COL_LENGTH('dbo.complaints', 'complaint_mode') IS NULL
        BEGIN
            ALTER TABLE dbo.complaints
                ADD complaint_mode NVARCHAR(50) NULL;
        END

        IF COL_LENGTH('dbo.complaints', 'status') IS NULL
        BEGIN
            ALTER TABLE dbo.complaints
                ADD status NVARCHAR(20) NOT NULL
                    CONSTRAINT DF_complaints_status DEFAULT 'Pending';
        END

        IF COL_LENGTH('dbo.complaints', 'complainant_user_id') IS NULL
        BEGIN
            ALTER TABLE dbo.complaints
                ADD complainant_user_id INT NULL;
        END

        IF COL_LENGTH('dbo.complaints', 'complainant_name') IS NULL
        BEGIN
            ALTER TABLE dbo.complaints
                ADD complainant_name NVARCHAR(150) NULL;
        END

        IF COL_LENGTH('dbo.complaints', 'complainant_contact') IS NULL
        BEGIN
            ALTER TABLE dbo.complaints
                ADD complainant_contact NVARCHAR(150) NULL;
        END

        IF COL_LENGTH('dbo.complaints', 'admin_remarks') IS NULL
        BEGIN
            ALTER TABLE dbo.complaints
                ADD admin_remarks NVARCHAR(1000) NULL;
        END

        IF COL_LENGTH('dbo.complaints', 'created_by_user_id') IS NULL
        BEGIN
            ALTER TABLE dbo.complaints
                ADD created_by_user_id INT NOT NULL
                    CONSTRAINT DF_complaints_created_by_user_id DEFAULT 1;
        END

        IF COL_LENGTH('dbo.complaints', 'created_at') IS NULL
        BEGIN
            ALTER TABLE dbo.complaints
                ADD created_at DATETIME2 NOT NULL
                    CONSTRAINT DF_complaints_created_at DEFAULT GETDATE();
        END

        IF COL_LENGTH('dbo.complaints', 'resolved_at') IS NULL
        BEGIN
            ALTER TABLE dbo.complaints
                ADD resolved_at DATETIME2 NULL;
        END

        IF OBJECT_ID('dbo.complaint_attachments', 'U') IS NOT NULL
        BEGIN
            IF COL_LENGTH('dbo.complaint_attachments', 'complaint_id') IS NULL
            BEGIN
                ALTER TABLE dbo.complaint_attachments
                    ADD complaint_id INT NULL;
            END

            IF COL_LENGTH('dbo.complaint_attachments', 'original_name') IS NULL
            BEGIN
                ALTER TABLE dbo.complaint_attachments
                    ADD original_name NVARCHAR(255) NULL;
            END

            IF COL_LENGTH('dbo.complaint_attachments', 'stored_name') IS NULL
            BEGIN
                ALTER TABLE dbo.complaint_attachments
                    ADD stored_name NVARCHAR(255) NULL;
            END

            IF COL_LENGTH('dbo.complaint_attachments', 'stored_path') IS NULL
            BEGIN
                ALTER TABLE dbo.complaint_attachments
                    ADD stored_path NVARCHAR(500) NULL;
            END

            IF COL_LENGTH('dbo.complaint_attachments', 'mime_type') IS NULL
            BEGIN
                ALTER TABLE dbo.complaint_attachments
                    ADD mime_type NVARCHAR(100) NULL;
            END

            IF COL_LENGTH('dbo.complaint_attachments', 'file_size') IS NULL
            BEGIN
                ALTER TABLE dbo.complaint_attachments
                    ADD file_size BIGINT NULL;
            END

            IF COL_LENGTH('dbo.complaint_attachments', 'uploaded_by_user_id') IS NULL
            BEGIN
                ALTER TABLE dbo.complaint_attachments
                    ADD uploaded_by_user_id INT NULL;
            END

            IF COL_LENGTH('dbo.complaint_attachments', 'created_at') IS NULL
            BEGIN
                ALTER TABLE dbo.complaint_attachments
                    ADD created_at DATETIME2 NOT NULL
                        CONSTRAINT DF_complaint_attachments_created_at_v2 DEFAULT GETDATE();
            END
        END
        `
    );

    await execute(
        DB_NAME,
        `
        IF COL_LENGTH('dbo.complaints', 'department') IS NOT NULL
        BEGIN
            UPDATE dbo.complaints
            SET department = ''
            WHERE department IS NULL;
        END

        IF COL_LENGTH('dbo.complaints', 'complaint_mode') IS NOT NULL
        BEGIN
            UPDATE dbo.complaints
            SET complaint_mode = ''
            WHERE complaint_mode IS NULL;
        END

        IF COL_LENGTH('dbo.complaints', 'title') IS NOT NULL
           AND COL_LENGTH('dbo.complaints', 'department') IS NOT NULL
        BEGIN
            DECLARE @migrateTitleSql NVARCHAR(MAX) = N'
                UPDATE dbo.complaints
                SET department = title
                WHERE LTRIM(RTRIM(department)) = ''''
                  AND title IS NOT NULL
                  AND LTRIM(RTRIM(title)) <> '''';

                DECLARE @titleDefaultConstraint NVARCHAR(128);

                SELECT @titleDefaultConstraint = dc.name
                FROM sys.default_constraints dc
                INNER JOIN sys.columns c
                    ON c.default_object_id = dc.object_id
                WHERE dc.parent_object_id = OBJECT_ID(''dbo.complaints'')
                  AND c.name = ''title'';

                IF @titleDefaultConstraint IS NOT NULL
                BEGIN
                    DECLARE @dropTitleConstraintSql NVARCHAR(MAX);
                    SET @dropTitleConstraintSql =
                        N''ALTER TABLE dbo.complaints DROP CONSTRAINT '' + QUOTENAME(@titleDefaultConstraint);
                    EXEC(@dropTitleConstraintSql);
                END

                ALTER TABLE dbo.complaints DROP COLUMN title;
            ';

            EXEC(@migrateTitleSql);
        END
        `
    );

    await execute(
        DB_NAME,
        `
        UPDATE dbo.complaints
        SET complaint_no = 'CMP-' + RIGHT('000000' + CAST(id AS VARCHAR(6)), 6)
        WHERE complaint_no IS NULL OR LTRIM(RTRIM(complaint_no)) = '';
        `
    );

    await execute(
        DB_NAME,
        `
        IF OBJECT_ID('dbo.complaint_attachments', 'U') IS NOT NULL
        BEGIN
            UPDATE ca
            SET
                original_name = ''
            FROM dbo.complaint_attachments ca
            WHERE ca.original_name IS NULL;

            UPDATE ca
            SET
                stored_name = ''
            FROM dbo.complaint_attachments ca
            WHERE ca.stored_name IS NULL;

            UPDATE ca
            SET
                stored_path = ''
            FROM dbo.complaint_attachments ca
            WHERE ca.stored_path IS NULL;

            UPDATE ca
            SET
                mime_type = 'application/octet-stream'
            FROM dbo.complaint_attachments ca
            WHERE ca.mime_type IS NULL;

            UPDATE ca
            SET
                file_size = 0
            FROM dbo.complaint_attachments ca
            WHERE ca.file_size IS NULL;
        END
        `
    );

    await execute(
        DB_NAME,
        `
        IF NOT EXISTS (
            SELECT 1
            FROM sys.indexes
            WHERE name = 'UX_complaints_complaint_no'
              AND object_id = OBJECT_ID('dbo.complaints')
        )
        BEGIN
            CREATE UNIQUE INDEX UX_complaints_complaint_no
                ON dbo.complaints (complaint_no)
                WHERE complaint_no IS NOT NULL;
        END

        IF NOT EXISTS (
            SELECT 1
            FROM sys.indexes
            WHERE name = 'IX_complaints_created_at'
              AND object_id = OBJECT_ID('dbo.complaints')
        )
        BEGIN
            CREATE INDEX IX_complaints_created_at
                ON dbo.complaints (created_at DESC, id DESC);
        END

        IF NOT EXISTS (
            SELECT 1
            FROM sys.indexes
            WHERE name = 'IX_complaints_status_category'
              AND object_id = OBJECT_ID('dbo.complaints')
        )
        BEGIN
            CREATE INDEX IX_complaints_status_category
                ON dbo.complaints (status, category);
        END

        IF OBJECT_ID('dbo.complaint_attachments', 'U') IS NOT NULL
           AND NOT EXISTS (
                SELECT 1
                FROM sys.indexes
                WHERE name = 'IX_complaint_attachments_complaint_id'
                  AND object_id = OBJECT_ID('dbo.complaint_attachments')
            )
        BEGIN
            CREATE INDEX IX_complaint_attachments_complaint_id
                ON dbo.complaint_attachments (complaint_id, created_at DESC, id DESC);
        END
        `
    );
}

if (require.main === module) {
    ensureComplaintTables().catch((error) => {
        console.error(error.message);
        process.exitCode = 1;
    });
}

module.exports = {
    ensureComplaintTables,
};
