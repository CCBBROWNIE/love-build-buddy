-- Update memory descriptions to fix Coco -> SoCo typo
UPDATE memories 
SET description = REPLACE(description, 'Coco Apartments', 'SoCo Apartments'),
    description = REPLACE(description, 'coco apartment', 'SoCo apartment'),
    location = REPLACE(location, 'Coco Apartments', 'SoCo Apartments'),
    location = REPLACE(location, 'coco apartment', 'SoCo apartment'),
    extracted_location = REPLACE(extracted_location, 'Coco Apartments', 'SoCo Apartments'),
    extracted_location = REPLACE(extracted_location, 'coco apartment', 'SoCo apartment')
WHERE description ILIKE '%coco%' OR location ILIKE '%coco%' OR extracted_location ILIKE '%coco%';

-- Update match reasons to fix Coco -> SoCo typo
UPDATE matches 
SET match_reason = REPLACE(match_reason, 'Coco Apartments', 'SoCo Apartments')
WHERE match_reason ILIKE '%coco%';