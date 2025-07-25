-- Make verification-selfies bucket public for easier access
UPDATE storage.buckets 
SET public = true 
WHERE id = 'verification-selfies';