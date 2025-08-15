-- Create boiler_manuals table
CREATE TABLE public.boiler_manuals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    manufacturer VARCHAR(255) NOT NULL,
    url TEXT NOT NULL,
    description TEXT,
    file_type VARCHAR(50) DEFAULT 'application/pdf',
    upload_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    popularity INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better query performance
CREATE INDEX idx_boiler_manuals_manufacturer ON public.boiler_manuals(manufacturer);
CREATE INDEX idx_boiler_manuals_name ON public.boiler_manuals(name);
CREATE INDEX idx_boiler_manuals_upload_date ON public.boiler_manuals(upload_date);

-- Enable RLS (Row Level Security)
ALTER TABLE public.boiler_manuals ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Public read access" ON public.boiler_manuals
    FOR SELECT
    USING (true);

CREATE POLICY "Admin write access" ON public.boiler_manuals
    FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');
