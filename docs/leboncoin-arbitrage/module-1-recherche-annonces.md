# Module 1 — Recherche d'annonces

Cadrage technique et fonctionnel de la couche "veille" de l'outil d'arbitrage
Leboncoin. Cette doc fige les choix issus de la discussion de mai 2026 et sert
de référence pour l'implémentation du Module 1, ainsi que d'interface avec les
Modules 2 (scoring), 3 (stock) et 4 (négociation).

---

## 1. Principes directeurs

Le Module 1 n'est pas une infrastructure de scraping de masse. Quatre partis
pris structurent toute l'architecture qui suit.

1. **Comportement humain low-volume** — l'outil mime un utilisateur qui a
   sauvegardé une dizaine de recherches précises et les rafraîchit régulièrement,
   pas un crawler.
2. **Filtre paiement sécurisé obligatoire** — toute annonce hors flux LBC
   sécurisé (livraison + paiement) est ignorée à la source. Ce filtre
   conditionne la rentabilité, la scalabilité et la maîtrise du risque.
3. **Trois profils de recherche distincts** — une seule logique de veille ne
   suffit pas : configs incohérentes fraîches, composants ciblés, et annonces
   froides ont des cadences, des cibles et des leviers différents.
4. **Historique d'annonces, pas flux instantané** — la valeur la plus dense
   vient du suivi temporel (âge, baisses de prix, remontages, disparitions),
   pas du seul listing brut.

---

## 2. Choix technique d'accès

**Voie retenue : API privée Leboncoin (reverse-engineerée)**, mode "recherches
sauvegardées".

| Voie | Statut | Raison |
|---|---|---|
| A — API privée | **Retenue** | Volume faible + queries précises = pattern indistinguable d'un user mobile avec alertes. JSON propre, pas de parsing HTML. |
| B — Playwright headless | Réservée Module 4 | Overkill pour la veille ; pertinente pour piloter la messagerie. |
| C — Agent IA navigation | Réservée Module 4/6 | Coût injustifié pour la veille ; envisagée pour la publication d'annonces. |

### Contraintes techniques d'usage

- **1 seul compte LBC** (pas de multi-compte au démarrage)
- **1 seul worker** (pas de parallélisation par instance)
- **Session persistante** + cookies réalistes + UA app mobile
- **Pas de proxy résidentiel au démarrage** (inutile au volume cible)
- **Jitter ±30%** sur chaque intervalle de polling
- **Backoff exponentiel** sur rate-limit (429) ou 5xx
- **Pas de retry agressif** : un échec = on attend le prochain cycle

---

## 3. Filtre paiement sécurisé — règle non négociable

Toute annonce sans `shippable=true` (livraison + paiement sécurisé LBC) est
écartée avant scoring. Justifications cumulées :

- Réduction du bruit : 60-80% des annonces tombent → moins de coût LLM et de
  charge de scoring
- Cohérence opérationnelle : flux entièrement digital, pas de remise en main
  propre, donc scalable sans contrainte géographique
- Protection arnaque intégrée par LBC → simplifie le scoring fiabilité du
  Module 2
- Trace de transaction utile pour la conformité fiscale ultérieure

---

## 4. Les trois profils de recherche

### 4.1 Profil A — Configs incohérentes fraîches

**Objectif** : détecter des PC complets dont la somme valeur composants dépasse
significativement le prix demandé, typiquement parce que le vendeur a une
vision "globale" et sous-estime une ou deux pièces premium.

| Paramètre | Valeur |
|---|---|
| Catégorie LBC | Ordinateurs de bureau / Unités centrales |
| Mots-clés | `PC gamer`, `tour gamer`, `unité centrale`, `PC fixe`, `PC complet`, `PC bureautique` |
| Fourchette prix | 300 – 1500 € |
| Tri | `date desc` |
| Filtre obligatoire | `shippable=true` |
| Nombre de recherches sauvegardées | 10 à 15 (variantes mots-clés × fourchettes) |
| Cadence polling | 5–10 min avec jitter |
| Levier d'arbitrage | Achat rapide au prix demandé (peu de négo possible) |

### 4.2 Profil B — Composants ciblés

**Objectif** : compléter ou upgrader une config en stock avec une pièce précise
dont le prix max acceptable est calculé par le Module 3.

| Paramètre | Valeur |
|---|---|
| Catégorie LBC | Composants |
| Mots-clés | Modèle exact (`RTX 4070`, `Ryzen 7 5800X`, `DDR4 32GB 3600 CL16`) |
| Fourchette prix | Calculée dynamiquement par le Module 3 |
| Tri | `date desc` |
| Filtre obligatoire | `shippable=true` |
| Nombre de recherches | N = nombre de pièces manquantes actives |
| Cadence polling | 15–30 min |
| Levier d'arbitrage | Négociation moyenne |

Les recherches du Profil B sont **générées dynamiquement** par le Module 3 et
expirent dès que la pièce est acquise ou la config abandonnée.

### 4.3 Profil C — Annonces froides

**Objectif** : trouver des vendeurs fatigués (>3 semaines d'annonce, encore en
ligne, paiement sécurisé activé) pour négocier fortement.

| Paramètre | Valeur |
|---|---|
| Catégorie LBC | Ordinateurs de bureau + Composants |
| Mots-clés | Mêmes pools que Profils A et B |
| Fourchette prix | Identique aux Profils A/B |
| Tri | `date asc` (les plus vieilles en premier) |
| Filtre obligatoire | `shippable=true` + `first_publication_date < J-21` |
| Cadence polling | 1–2 fois par jour suffit |
| Levier d'arbitrage | Négociation forte (-15 à -30%) |

Le Profil C **n'a pas besoin** d'être réactif : une annonce de 30 jours sera
encore là dans 2h. Cela libère du budget pour densifier le Profil A.

---

## 5. Détection d'incohérence (cœur du Profil A)

Trois familles de signaux à combiner en un score composite. Aucune n'est
suffisante seule.

### 5.1 Écart de gamme entre composants principaux

Chaque composant est classé sur une échelle (4 niveaux à valider : `entry`,
`mid`, `high`, `enthusiast`).

- Config homogène (tout `mid`) → vendeur averti, prix probablement juste
- Config hétérogène (GPU `high` + CPU `entry`) → vendeur a upgradé la pièce
  visible (GPU) sans toucher au reste, prix global sous-estime la pièce premium

Indicateur : variance/écart-type des classes de gamme sur les composants
principaux (CPU, GPU, RAM, SSD, PSU, mobo).

### 5.2 Décalage générationnel

Signaux typiques :

- GPU récent (Ada / RDNA3) sur plateforme ancienne (DDR4, PCIe 3.0, alim 500W
  d'origine)
- SSD NVMe Gen4 dans une config par ailleurs obsolète
- Boîtier premium (Fractal, NZXT, Lian Li, Phanteks) avec contenu modeste

Le vendeur ne réalise souvent pas que la pièce récente vaut 60-80% du prix
demandé pour l'ensemble.

### 5.3 Signaux textuels et photos

- Description vague sur les pièces premium ("avec une bonne carte graphique")
- Titre générique (`PC gamer` plutôt que `PC gamer RTX 4070 i7-13700K`)
- Photos sans détail des étiquettes / refs des composants
- Mention "ne joue plus", "passage sur console", "déménagement", "héritage"
- Vendeur récent sur la plateforme ou peu d'annonces

### 5.4 Règle d'invalidation

Même score d'incohérence élevé : si **prix demandé > valeur estimée + 20%**,
on ignore. Le vendeur est dans le déni, pas dans la fatigue ; aucune négo ne
ramènera la marge.

---

## 6. Suivi d'historique d'annonces

Couche transversale aux trois profils. Transforme la base d'observation en
**observatoire de marché** plutôt qu'en liste de flux.

### 6.1 Données suivies par annonce

| Champ | Description |
|---|---|
| `first_seen_at` | Première détection par l'outil |
| `published_at` | Date de publication LBC (champ `first_publication_date`) |
| `last_index_date` | Dernier remontage LBC (champ `index_date`) |
| `price_history[]` | Liste de `(timestamp, prix)` à chaque variation détectée |
| `republish_events[]` | Liste de remontages sans changement de prix |
| `last_seen_at` | Dernière vérification où l'annonce était active |
| `disappeared_at` | Date de disparition (vendu ou retiré) |
| `reappeared_at` | Date de réapparition éventuelle après disparition |

### 6.2 Worker de re-check

Un worker secondaire (ou un cron du même worker) re-vérifie quotidiennement
les annonces actives en base, pas seulement les nouvelles. Coût : quelques
centaines de requêtes/jour, négligeable.

**Logique post-disparition** : 7 jours après une disparition, on re-vérifie.
Si l'annonce ne revient pas → marquée `sold` (probable) → enrichit la base
composants comme prix de transaction confirmé. Si elle revient → `withdrawn`
(retirée volontairement, signal de vendeur capricieux).

### 6.3 Distinction `index_date` vs `first_publication_date`

Beaucoup de vendeurs utilisent la fonction "remontage" pour réapparaître en
tête de liste. L'API LBC expose les deux dates :

- `index_date` → ce que LBC affiche pour le tri "récent"
- `first_publication_date` → la vraie ancienneté

Le scoring de levier **doit utiliser `first_publication_date`**, jamais
`index_date`.

---

## 7. Score de levier de négociation

Calculé à partir de l'historique. Pondère ensuite le prix d'attaque et le
prix plancher proposés au Module 4.

| Indicateur | Signal |
|---|---|
| Âge depuis publication initiale | 0 (frais) → 1 (>30 j) |
| Nombre de baisses de prix | Chaque baisse → vendeur ouvert |
| Magnitude cumulée des baisses | Un vendeur qui a déjà concédé 10% en concédera plus |
| Fréquence de remontages sans baisse | Vendeur têtu mais motivé (utile + dangereux) |
| Disparition/réapparition | A reçu des offres jugées insuffisantes |

### Sorties du moteur

À partir des scores (incohérence + valeur composants + levier), trois valeurs
sont produites pour chaque annonce qualifiée :

1. **Prix d'attaque** — la première offre envoyée
2. **Prix plancher** — au-delà, on lâche
3. **Angle de négociation suggéré** au Module 4 (urgence, défaut visible, frais
   de port, fatigue d'annonce, etc.)

---

## 8. Agent IA léger — périmètre exact

**Modèle cible : Claude Haiku** + base composants en contexte. Trois tâches
distinctes, toutes structurées.

| Tâche | Input | Output | Déclencheur |
|---|---|---|---|
| Extraction BOM | titre + description + OCR photos | JSON `(cpu, gpu, ram, ssd, psu, mobo, case)` avec confiance par champ | Annonce qui passe le pré-filtre prix |
| Classification gamme | BOM extraite + base composants | Score de gamme par composant + score d'incohérence global | Si extraction confiance > seuil |
| Plan de swap | BOM + configs cibles + stock | Liste ordonnée : pièces à garder / revendre seules / remplacer, avec spec de remplacement et marge attendue | Si incohérence > seuil ET prix < valeur estimée |

**L'agent ne décide pas d'acheter.** Il produit le dossier que le moteur de
décision déterministe consomme. La traçabilité et les seuils restent dans le
code.

### OCR photos

L'extraction depuis les photos d'étiquettes améliore significativement la
qualité du Profil A (vendeurs flemmards qui photographient les boîtes mais ne
remplissent pas la description). Coût estimé : 0,5–1 ct par annonce candidate
via Haiku vision. **À valider** (décision ouverte §11).

---

## 9. Base composants

Asset central, alimenté en continu par les trois profils.

### Schéma minimal

| Catégorie | Champs |
|---|---|
| Identité | modèle, génération, socket / format, TDP, specs clés |
| Marché | prix médian LBC (rolling 90j), P10, P90, volume mensuel, vélocité (temps moyen avant vente) |
| Classification | gamme (entry / mid / high / enthusiast), année de sortie |
| Compatibilité | socket CPU, format RAM, longueur max (GPU / case), watts requis |

### Bootstrap

2–3 semaines de Profil A en mode passif (aucune action automatisée) suffisent
à constituer une base exploitable. La logique de disparition (§6.2) enrichit
ensuite la base gratuitement avec des prix de transaction confirmés.

---

## 10. Pièges identifiés

### 10.1 Faux "frais" rebumpés
Voir §6.3 — utiliser `first_publication_date`, pas `index_date`.

### 10.2 Biais de survie inversé
Une annonce vieille n'est pas toujours une opportunité. Voir §5.4 — seuil
absolu sur écart prix / valeur estimée.

### 10.3 Normalisation des références
`4070`, `RTX4070`, `Nvidia 4070`, `4070 Super`, `4070 Ti` — Haiku gère ça
mieux que des regex mais nécessite un format de sortie strict (modèle exact,
suffixe, mémoire) pour permettre le matching base composants.

### 10.4 Configs hétérogènes honnêtes
Combo cohérent mais pas haut de gamme partout (ex : 4070 + i5-12400) = score
d'incohérence faible → priorité basse, pas exclusion.

### 10.5 Cadence trop régulière
Le polling à intervalle exact est détectable. Jitter ±30% obligatoire ; idéal :
distribution gaussienne autour de la cadence cible.

### 10.6 Re-check trop fréquent
Re-vérifier une annonce 10×/jour est plus suspect que la voir apparaître une
fois. 1 re-check/jour suffit pour le suivi d'historique.

---

## 11. Décisions ouvertes — à trancher avant implémentation

| # | Sujet | Options |
|---|---|---|
| 1 | Granularité classification gamme | 4 niveaux discrets vs score continu |
| 2 | OCR photos via Haiku vision | Oui (qualité +, ~1 ct/annonce) / Non (texte seul) |
| 3 | Compte LBC | Neuf vs existant avec historique |
| 4 | Périmètre démarrage | Configs entières seulement (cycle court, pas de montage) vs configs + composants dès J1 |
| 5 | Filtre géographique | France entière vs zones à frais de port maîtrisés |
| 6 | Politique configs honnêtes | Garder en priorité basse vs écarter |
| 7 | Seuil d'âge "froid" (Profil C) | 21 j (proposé) / 14 j / 30 j |
| 8 | Exploitation disparitions | Re-check post-disparition activé dès J1 ? |

---

## 12. Interfaces avec les autres modules

| Module aval | Données fournies par Module 1 |
|---|---|
| Module 2 (scoring) | BOM extraite, classification gamme, score d'incohérence, prix demandé, valeur estimée |
| Module 3 (stock) | Liste d'annonces qualifiées + plan de swap proposé |
| Module 4 (négociation) | Prix d'attaque, prix plancher, angle suggéré, score de levier |
| Base composants | Prix observés, prix de transaction (via disparitions), volume / vélocité |

Les recherches du Profil B sont **entrées** depuis le Module 3 (pièces
manquantes pour configs en cours).

---

## 13. Plan d'incrémentation Module 1

1. **Veille brute Profil A** — polling, dedupe, stockage, affichage.
   Validation : estimation de prix tient la route sur 2–3 semaines.
2. **Couche historique** — `price_history`, re-check quotidien, distinction
   `index_date` / `first_publication_date`.
   Validation : détection correcte des baisses et des remontages.
3. **Profil C** — activation des recherches froides + score de levier.
   Validation : taux de réponse vendeur sur annonces froides vs fraîches.
4. **Agent IA d'extraction** — Haiku texte seul d'abord, OCR ensuite.
   Validation : précision BOM > 90% sur échantillon manuel.
5. **Profil B** — branchement avec Module 3, recherches dynamiques.
   Validation : pièces ciblées trouvées dans le budget < 7 jours.

Chaque étape doit être validée avant la suivante. Une étape qui ne tient pas
ses hypothèses est corrigée ou abandonnée, pas empilée.
