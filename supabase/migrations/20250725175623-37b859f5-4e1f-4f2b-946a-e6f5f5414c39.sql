-- Fix the remaining "Coco" references that were missed
UPDATE public.memories 
SET 
  extracted_location = 'SoCo apartment in Napa, California',
  location = 'SoCo apartment in Napa, California'
WHERE id = '23012c4a-05ab-44d4-9e50-f7a5dd43c4a4';