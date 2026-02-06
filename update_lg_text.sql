-- Update question_text replacing standalone "LG" with "Gel Caps"
UPDATE questions
SET question_text = REGEXP_REPLACE(question_text, '\yLG\y', 'Gel Caps', 'g')
WHERE question_text ~ '\yLG\y';

-- Update options (JSONB)
-- Casting to text, replacing, and casting back to JSONB to handle all occurrences in the array
UPDATE questions
SET options = REGEXP_REPLACE(options::text, '\yLG\y', 'Gel Caps', 'g')::jsonb
WHERE options::text ~ '\yLG\y';
