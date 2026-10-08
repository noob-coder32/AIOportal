CREATE TABLE bill_submission_requests (
    id INT IDENTITY(1,1) PRIMARY KEY,
    bill_submission_reference_no NVARCHAR(50) NOT NULL,
    division NVARCHAR(20) NOT NULL,
    bill_submission_date DATE NOT NULL,
    supplier_code NVARCHAR(50) NOT NULL,
    total_bill_amount DECIMAL(18, 2) NOT NULL,
    created_by NVARCHAR(100) NULL,
    created_at DATETIME2 NOT NULL CONSTRAINT DF_bill_submission_requests_created_at DEFAULT SYSDATETIME()
);

CREATE INDEX IX_bill_submission_requests_division
ON bill_submission_requests (division);

CREATE INDEX IX_bill_submission_requests_reference_no
ON bill_submission_requests (bill_submission_reference_no);
