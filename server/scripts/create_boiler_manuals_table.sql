-- Create boiler_manuals table for manual finder functionality
CREATE TABLE IF NOT EXISTS boiler_manuals (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    model VARCHAR(255),
    make VARCHAR(255),
    manufacturer VARCHAR(255),
    url TEXT,
    download_url TEXT,
    file_type VARCHAR(50) DEFAULT 'application/pdf',
    description TEXT,
    popularity INTEGER DEFAULT 0,
    upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_boiler_manuals_make ON boiler_manuals(make);
CREATE INDEX IF NOT EXISTS idx_boiler_manuals_manufacturer ON boiler_manuals(manufacturer);
CREATE INDEX IF NOT EXISTS idx_boiler_manuals_model ON boiler_manuals(model);
CREATE INDEX IF NOT EXISTS idx_boiler_manuals_name ON boiler_manuals(name);

-- Insert sample boiler manual data
INSERT INTO boiler_manuals (name, model, make, manufacturer, url, description, popularity) VALUES
('Baxi EcoBlue Advance Installation Manual', 'EcoBlue Advance', 'Baxi', 'Baxi', 'https://www.baxi.co.uk/downloads/ecoblue-advance-installation-manual.pdf', 'Complete installation and service manual for Baxi EcoBlue Advance combi boilers', 15),
('Baxi EcoBlue Heat Service Manual', 'EcoBlue Heat', 'Baxi', 'Baxi', 'https://www.baxi.co.uk/downloads/ecoblue-heat-service-manual.pdf', 'Service and maintenance manual for Baxi EcoBlue Heat system boilers', 12),
('Baxi Duo-tec Combi Installation Guide', 'Duo-tec Combi', 'Baxi', 'Baxi', 'https://www.baxi.co.uk/downloads/duo-tec-combi-installation.pdf', 'Installation guide for Baxi Duo-tec combi boiler range', 18),
('Baxi Platinum Combi Service Manual', 'Platinum Combi', 'Baxi', 'Baxi', 'https://www.baxi.co.uk/downloads/platinum-combi-service.pdf', 'Complete service manual for Baxi Platinum combi boilers', 10),
('Ideal Logic Max Combi Installation Manual', 'Logic Max Combi', 'Ideal', 'Ideal Heating', 'https://www.idealheating.com/downloads/logic-max-combi-installation.pdf', 'Installation and commissioning manual for Ideal Logic Max combi boilers', 20),
('Ideal Logic Heat System Installation Guide', 'Logic Heat System', 'Ideal', 'Ideal Heating', 'https://www.idealheating.com/downloads/logic-heat-system-installation.pdf', 'Installation guide for Ideal Logic Heat system boilers', 14),
('Ideal Vogue Max Combi Service Manual', 'Vogue Max Combi', 'Ideal', 'Ideal Heating', 'https://www.idealheating.com/downloads/vogue-max-combi-service.pdf', 'Service and maintenance manual for Ideal Vogue Max combi boilers', 16),
('Worcester Bosch Greenstar CDi Classic Installation', 'Greenstar CDi Classic', 'Worcester Bosch', 'Worcester Bosch', 'https://www.worcester-bosch.co.uk/downloads/greenstar-cdi-classic-installation.pdf', 'Installation manual for Worcester Bosch Greenstar CDi Classic range', 22),
('Worcester Bosch Greenstar Si Compact Service Guide', 'Greenstar Si Compact', 'Worcester Bosch', 'Worcester Bosch', 'https://www.worcester-bosch.co.uk/downloads/greenstar-si-compact-service.pdf', 'Service guide for Worcester Bosch Greenstar Si Compact combi boilers', 19),
('Vaillant ecoTEC Plus Installation Manual', 'ecoTEC Plus', 'Vaillant', 'Vaillant', 'https://www.vaillant.co.uk/downloads/ecotec-plus-installation.pdf', 'Complete installation manual for Vaillant ecoTEC Plus combi boilers', 17),
('Vaillant ecoTEC Pro Service Manual', 'ecoTEC Pro', 'Vaillant', 'Vaillant', 'https://www.vaillant.co.uk/downloads/ecotec-pro-service.pdf', 'Service and maintenance manual for Vaillant ecoTEC Pro range', 13),
('Glow-worm Energy Combi Installation Guide', 'Energy Combi', 'Glow-worm', 'Glow-worm', 'https://www.glow-worm.co.uk/downloads/energy-combi-installation.pdf', 'Installation guide for Glow-worm Energy combi boilers', 11),
('Potterton Promax Combi Service Manual', 'Promax Combi', 'Potterton', 'Potterton', 'https://www.potterton.co.uk/downloads/promax-combi-service.pdf', 'Service manual for Potterton Promax combi boiler range', 9),
('Ferroli Modena HE Installation Manual', 'Modena HE', 'Ferroli', 'Ferroli', 'https://www.ferroli.co.uk/downloads/modena-he-installation.pdf', 'Installation manual for Ferroli Modena HE combi boilers', 8),
('Alpha E-Tec Plus Installation Guide', 'E-Tec Plus', 'Alpha', 'Alpha Heating Innovation', 'https://www.alpha-innovation.co.uk/downloads/e-tec-plus-installation.pdf', 'Installation guide for Alpha E-Tec Plus combi boilers', 7);
