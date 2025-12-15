SELECT id, raison_sociale, email
FROM clients
ORDER BY created_at DESC NULLS LAST
LIMIT 10;
