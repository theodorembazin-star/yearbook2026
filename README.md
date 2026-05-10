# Yearbook 2026

Un yearbook collaboratif en ligne. Les contributeurs ajoutent des photos sans
créer de compte ; elles sont triées automatiquement par date (EXIF) et par
personne (clusters de visages), et tout le monde peut co-éditer la mise en page
le long d'une frise chronologique.

## Stack

- **Next.js 15** (App Router) + React 19 + TypeScript
- **Tailwind CSS** + shadcn-style primitives + Framer Motion + lucide-react
- **Supabase** (Postgres + Realtime + RLS) — schema dans `supabase/migrations/`
- **Cloudflare R2** pour les photos (uploads présignés)
- **Liveblocks** ou **Yjs** pour la co-édition de la mise en page (post-MVP)
- Côté navigateur : `exifr` (date EXIF), `browser-image-compression` (compression)

## Démarrer en local

```bash
npm install
npm run dev
# http://localhost:3000
```

Le projet tourne **sans backend** pour le moment : `/y/<slug>` rend une démo
(`src/lib/mock.ts`) et l'upload est simulé. Cela permet d'itérer librement sur
le design avant de brancher Supabase + R2.

## Structure

```
src/
  app/
    page.tsx                 Landing
    create/page.tsx          Formulaire de création de yearbook
    y/[slug]/page.tsx        Vue yearbook (server component)
  components/
    YearbookView.tsx         Layout: header, timeline + colonne principale
    Timeline.tsx             Frise sticky avec scroll-spy
    PhotoSection.tsx         Mosaïque magazine + lightbox
    PeopleFilter.tsx         Filtre par personne
    UploadDialog.tsx         Drag & drop, EXIF, compression client
  lib/
    types.ts                 Modèle TypeScript (= schéma DB)
    mock.ts                  Données de démo
    utils.ts                 Helpers (cn, date FR, monthKey)
supabase/
  migrations/0001_init.sql   Schéma Postgres + RLS de départ
```

## Brancher le backend (prochaines étapes)

1. **Supabase** : créer un projet, lancer la migration, créer une fonction edge
   qui signe `invite_token`/`admin_token` en JWT pour activer les policies RLS.
2. **R2** : créer un bucket, ajouter une route `POST /api/photos/upload-url`
   qui renvoie une URL PUT présignée. Remplacer le `setTimeout` simulé dans
   `UploadDialog.tsx`.
3. **Worker post-upload** (Trigger.dev/Inngest) : EXIF, vignettes, pHash,
   embeddings de visages, NSFW.
4. **Realtime** : abonner la `YearbookView` au canal Supabase
   `yearbook:{id}` pour recevoir les nouvelles photos en direct.
5. **Liveblocks** : envelopper le futur éditeur de layout d'un `RoomProvider`
   pour les curseurs multi-utilisateurs.

## Roadmap

- [x] S1 — Fondations : scaffold, schéma, vue démo
- [ ] S2 — Upload & tri auto (R2, EXIF serveur, dédup, vignettes)
- [ ] S3 — Éditeur de layout (dnd-kit, grille 12 col, polaroïds, templates)
- [ ] S4 — Collab temps réel + clustering visages + modération + export PDF

## Conformité & sécurité

- Reconnaissance faciale **opt-in** ; embeddings stockés sans visage isolé
  ; droit à la suppression accessible depuis le lien admin.
- Liens d'invitation signés (HMAC) pour limiter le partage incontrôlé.
- Modération (file d'attente + scan NSFW) activable par yearbook.
