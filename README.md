# Poules de Luxe

Application privée de gestion d'inventaire et de ventes en marché.

- Vue 3 + Vite
- Supabase (base de données Postgres, connexion, photos)
- Hébergement : GitHub Pages, déploiement automatique à chaque push sur `main`

## Développement local

```
npm install
npm run dev
```

## Sécurité

L'URL et la clé publique de Supabase sont dans `src/lib/supabase.js`. Elles sont
publiques par conception. Les données sont protégées par la connexion et les
règles de sécurité de la base. Ne jamais ajouter ici la clé secrète.
