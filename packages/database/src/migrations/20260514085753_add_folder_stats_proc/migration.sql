IF OBJECT_ID('GetFolderStats', 'P') IS NOT NULL
DROP PROCEDURE GetFolderStats;

EXEC('
CREATE PROCEDURE GetFolderStats
  @FolderId UNIQUEIDENTIFIER
AS
BEGIN
  SET NOCOUNT ON;

  IF NOT EXISTS (SELECT 1 FROM Folder WHERE id = @FolderId AND deletedAt IS NULL)
    BEGIN
    SELECT 0 AS totalFolders, 0 AS totalDocuments;
    RETURN;
  END;

  WITH FolderTree AS (
    SELECT id
    FROM Folder
    WHERE id = @FolderId AND deletedAt IS NULL

    UNION ALL

    SELECT f.id
    FROM Folder f
    INNER JOIN FolderTree ft ON f.parentFolderId = ft.id
    WHERE f.deletedAt IS NULL
  )
  SELECT
    COUNT(DISTINCT ft.id) - 1 AS totalFolders,
    COUNT(d.id) AS totalDocuments
  FROM FolderTree ft
  LEFT JOIN Document d
    ON d.folderId = ft.id
    AND d.deletedAt IS NULL;
END
');
