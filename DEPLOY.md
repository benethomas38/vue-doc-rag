# Mise en ligne sur un VPS OVH

Architecture : un VPS Ubuntu avec Docker, qui fait tourner deux conteneurs :
- **app** : le site Vue + le serveur Node + le RAG ;
- **caddy** : reçoit les visiteurs et gère le HTTPS automatiquement.

Dans les commandes ci-dessous, remplace `IP_DU_VPS` par l'adresse IP de ton VPS
et `thomasbene.fr` par ton nom de domaine.

---

## 1. Commander chez OVH

1. **Le VPS** : la plus petite offre VPS suffit (le site + le modèle d'embeddings
   utilisent moins de 1 Go de mémoire). Système : **Ubuntu 24.04**.
2. **Le nom de domaine**, si ce n'est pas déjà fait.

OVH t'envoie par e-mail l'**adresse IP** du VPS, l'utilisateur (`ubuntu`) et un mot de passe.

## 2. Faire pointer le domaine vers le VPS

Espace client OVH → **Web Cloud → Noms de domaine → ton domaine → Zone DNS** :

| Type | Sous-domaine | Cible |
| --- | --- | --- |
| A | *(vide)* | `IP_DU_VPS` |
| A | `www` | `IP_DU_VPS` |

S'il existe déjà des enregistrements **A** ou **AAAA** pour le domaine nu ou `www`
(souvent une page de parking OVH), **supprime-les** d'abord.

La propagation prend de quelques minutes à quelques heures. Pour vérifier depuis
PowerShell : `Resolve-DnsName thomasbene.fr` doit renvoyer l'IP du VPS.

## 3. Se connecter au VPS (depuis PowerShell)

```powershell
ssh ubuntu@IP_DU_VPS
```

Tape `yes` à la première connexion, puis le mot de passe reçu par e-mail.

**Recommandé : une clé SSH à la place du mot de passe.** Sur ton PC :

```powershell
ssh-keygen -t ed25519
type $env:USERPROFILE\.ssh\id_ed25519.pub | ssh ubuntu@IP_DU_VPS "mkdir -p ~/.ssh && cat >> ~/.ssh/authorized_keys"
```

Ensuite, `ssh ubuntu@IP_DU_VPS` ne demande plus de mot de passe.

## 4. Préparer le serveur (sur le VPS)

```bash
# Mises à jour
sudo apt update && sudo apt upgrade -y

# Pare-feu : seulement SSH, HTTP et HTTPS
sudo ufw allow OpenSSH
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable

# Docker
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker ubuntu
exit
```

Reconnecte-toi (`ssh ubuntu@IP_DU_VPS`) pour que le groupe `docker` soit pris en compte,
puis vérifie : `docker run --rm hello-world`.

## 5. Installer le site (sur le VPS)

```bash
git clone https://github.com/benethomas38/vue-doc-rag.git
cd vue-doc-rag
cp .env.example .env
nano .env
```

Dans `.env`, renseigne au minimum :

```
ANTHROPIC_API_KEY=sk-ant-...
DOMAIN=thomasbene.fr
```

(`Ctrl+O` puis Entrée pour enregistrer, `Ctrl+X` pour quitter nano.)

Puis lance tout :

```bash
docker compose up -d --build
```

Le premier build prend plusieurs minutes (clonage de la doc, embeddings, build du site).
Suivre ce qui se passe :

```bash
docker compose logs -f
```

Quand tu vois `Serveur prêt` et que Caddy a obtenu son certificat, ouvre
**https://thomasbene.fr**. (`Ctrl+C` pour quitter les logs, le site continue de tourner.)

## 6. Mettre à jour le site après un push

```bash
cd ~/vue-doc-rag
git pull
docker compose up -d --build
```

## 7. Sécurité de la clé API

- Dans la console Anthropic, fixe une **limite de dépenses mensuelle** : c'est la
  protection ultime, quoi qu'il arrive sur le serveur.
- Les limites du site se règlent dans `.env` (`RATE_LIMIT_PER_HOUR`, `DAILY_LIMIT`),
  puis `docker compose up -d` pour les appliquer.

## Dépannage

| Problème | Piste |
| --- | --- |
| Le site ne répond pas | `docker compose ps` : les deux conteneurs doivent être `running` |
| Erreur de certificat | Le DNS ne pointe pas encore vers le VPS (étape 2), ou les ports 80/443 sont fermés |
| La démo répond « Erreur » | `docker compose logs app` : clé API absente ou invalide dans `.env` |
| Le build s'arrête sans raison | Mémoire insuffisante pendant le build : `free -h` |
