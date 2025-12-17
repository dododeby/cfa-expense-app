-- Create responsible_persons table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.responsible_persons (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES public.organizations(id),
    unit_responsible_name TEXT,
    unit_responsible_cra_number TEXT,
    data_responsible_name TEXT,
    data_responsible_role TEXT,
    data_responsible_doc_type TEXT,
    data_responsible_doc_number TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_by UUID REFERENCES auth.users(id),
    
    UNIQUE(organization_id)
);

-- Add RLS policies for responsible_persons
ALTER TABLE public.responsible_persons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view responsible persons of their organization" 
ON public.responsible_persons FOR SELECT 
USING (organization_id IN (
    SELECT organization_id FROM public.users WHERE id = auth.uid()
));

CREATE POLICY "Users can update responsible persons of their organization" 
ON public.responsible_persons FOR UPDATE 
USING (organization_id IN (
    SELECT organization_id FROM public.users WHERE id = auth.uid()
));

CREATE POLICY "Users can insert responsible persons for their organization" 
ON public.responsible_persons FOR INSERT 
WITH CHECK (organization_id IN (
    SELECT organization_id FROM public.users WHERE id = auth.uid()
));

-- Add CNPJ column to organizations if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'organizations' AND column_name = 'cnpj') THEN
        ALTER TABLE public.organizations ADD COLUMN cnpj TEXT;
    END IF;
END $$;
