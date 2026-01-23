-- 1. Ensure bucket exists (idempotent setup)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('branding', 'branding', true, 5242880, ARRAY['image/*'])
ON CONFLICT (id) DO UPDATE SET public = true;

-- 2. Allow Public Uploads (INSERT)
CREATE POLICY "Allow Public Uploads" 
ON storage.objects 
FOR INSERT 
TO public 
WITH CHECK (bucket_id = 'branding');

-- 3. Allow Public Updates (UPDATE) - for overwriting if needed
CREATE POLICY "Allow Public Updates" 
ON storage.objects 
FOR UPDATE
TO public 
USING (bucket_id = 'branding');

-- 4. Allow Public Reads (SELECT) - already handled by public bucket usually, but good to be explicit
CREATE POLICY "Allow Public Select" 
ON storage.objects 
FOR SELECT 
TO public 
USING (bucket_id = 'branding');
