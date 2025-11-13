export function sanitizeFilename(filename) {
  if (!filename) return '';
  
  const withoutAccents = filename.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  
  const sanitized = withoutAccents
    .toLowerCase()
    .replace(/\s+/g, '_') // Remplacer les espaces par des underscores
    .replace(/[^a-z0-9_.-]/g, '') // Supprimer les caractères non alphanumériques sauf _, ., -
    .replace(/_{2,}/g, '_') // Remplacer les underscores multiples par un seul
    .replace(/^-+|-+$/g, ''); // Supprimer les tirets au début/fin

  return sanitized;
}