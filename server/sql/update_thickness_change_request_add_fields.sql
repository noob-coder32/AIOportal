-- Add fields required by the thickness change request flow
-- width and bundle_weight are used to validate against the thickness2 master table
-- remark is required when the bundle weight is out of range

ALTER TABLE thickness_change_request
ADD
    width decimal(18,2) NULL,
    remark nvarchar(500) NULL;
