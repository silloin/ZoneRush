-- Fix SOS alerts table - make location column nullable
ALTER TABLE sos_alerts ALTER COLUMN location DROP NOT NULL;
