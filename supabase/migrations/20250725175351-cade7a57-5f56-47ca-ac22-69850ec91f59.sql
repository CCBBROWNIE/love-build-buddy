-- Update all references from "Coco" to "SoCo" in memories
UPDATE public.memories 
SET 
  description = REPLACE(description, 'Coco Apartments', 'SoCo Apartments'),
  description = REPLACE(description, 'coco apartment', 'SoCo apartment'),
  extracted_location = REPLACE(extracted_location, 'Coco Apartments', 'SoCo Apartments'),
  extracted_location = REPLACE(extracted_location, 'coco apartment', 'SoCo apartment'),
  location = REPLACE(location, 'Coco Apartments', 'SoCo Apartments'),
  location = REPLACE(location, 'coco apartment', 'SoCo apartment'),
  extracted_details = CASE 
    WHEN extracted_details IS NOT NULL THEN 
      REPLACE(extracted_details::text, 'Coco apartment', 'SoCo apartment')::jsonb
    ELSE extracted_details 
  END
WHERE description ILIKE '%coco%' 
   OR extracted_location ILIKE '%coco%' 
   OR location ILIKE '%coco%'
   OR extracted_details::text ILIKE '%coco%';

-- Update all references from "Coco" to "SoCo" in matches
UPDATE public.matches 
SET match_reason = REPLACE(match_reason, 'Coco Apartments', 'SoCo Apartments')
WHERE match_reason ILIKE '%coco%';