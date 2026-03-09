/**
 * whitelist.js — Module de whitelist des dépôts de widgets autorisés
 * Widget Métropole de Lyon × Grist
 *
 * Usage :
 *   Whitelist.checkUrl(url, customEntries)  → { allowed, entry?, parsed?, reason? }
 *   Whitelist.parseUrl(url)                 → { type, username?, host?, display }
 *   Whitelist.DEFAULT_ENTRIES               → liste des entrées natives
 */

(function (global) {
  'use strict';

  // ─── Liste native (non supprimable depuis l'UI) ────────────────────────────

  const DEFAULT_ENTRIES = [
    {
      id: 'gristlabs',
      type: 'github',
      username: 'gristlabs',
      label: 'Grist Labs (officiel)',
      builtin: true,
    },
    {
      id: 'arthurpanck',
      type: 'github',
      username: 'arthurpanck',
      label: 'Arthur Panck',
      builtin: true,
    },
    {
      id: 'betagouv',
      type: 'github',
      username: 'betagouv',
      label: 'Beta Gouv — widgets fr-admin',
      builtin: true,
    },
    {
      id: 'eric.couillard',
      type: 'gitlab',
      host: 'gitlab-forge.din.developpement-durable.gouv.fr',
      username: 'eric.couillard',
      label: 'Eric Couillard (MTE / Forge nationale)',
      builtin: true,
    },
    {
      id: 'forge.grandlyon.com',
      type: 'forge',
      host: 'forge.grandlyon.com',
      label: 'Forge Grand Lyon (domaine entier)',
      builtin: true,
    },
  ];

  // ─── Parsing d'URL ─────────────────────────────────────────────────────────

  /**
   * Extrait les informations d'origine d'une URL de widget.
   *
   * Cas supportés :
   *   - GitHub Pages  : username.github.io/…
   *   - GitHub.com    : github.com/username/…  ou  raw.githubusercontent.com/username/…
   *   - GitLab.com    : gitlab.com/username/…
   *   - Forges custom : host/username/…  (1er segment du path = username)
   *   - Forge entière : on whitelist le host, pas de username
   *
   * @param {string} rawUrl
   * @returns {{ type: string, username?: string, host?: string, display: string } | null}
   */
  function parseUrl(rawUrl) {
    if (!rawUrl || !rawUrl.trim()) return null;

    let u;
    try {
      u = new URL(rawUrl.trim());
    } catch (_) {
      return null;
    }

    const host = u.hostname.toLowerCase();
    const parts = u.pathname.split('/').filter(Boolean);

    // ── GitHub Pages : username.github.io ──────────────────────────────────
    if (host.endsWith('.github.io')) {
      const username = host.slice(0, host.indexOf('.github.io'));
      return { type: 'github', username, display: 'github · ' + username };
    }

    // ── GitHub.com / raw.githubusercontent.com ─────────────────────────────
    if (host === 'github.com' || host === 'raw.githubusercontent.com') {
      const username = (parts[0] || '').toLowerCase();
      return { type: 'github', username, display: 'github · ' + username };
    }

    // ── GitLab.com ─────────────────────────────────────────────────────────
    if (host === 'gitlab.com') {
      const username = (parts[0] || '').toLowerCase();
      return { type: 'gitlab', host, username, display: 'gitlab.com · ' + username };
    }

    // ── Forge Grand Lyon ───────────────────────────────────────────────────
    if (host === 'forge.grandlyon.com') {
      return { type: 'forge', host, display: 'forge.grandlyon.com' };
    }

    // ── Autre instance GitLab / forge custom ───────────────────────────────
    // Premier segment du path = username ou groupe
    if (parts.length >= 1) {
      const username = parts[0].toLowerCase();
      return { type: 'gitlab', host, username, display: host + ' · ' + username };
    }

    return { type: 'unknown', host, display: host };
  }

  // ─── Vérification whitelist ────────────────────────────────────────────────

  /**
   * Vérifie si une URL de widget est autorisée par la whitelist.
   *
   * @param {string} url
   * @param {Array}  customEntries  Entrées ajoutées par l'utilisateur (depuis grist.setOption)
   * @returns {{ allowed: boolean, entry?: object, parsed?: object, reason?: string }}
   */
  function checkUrl(url, customEntries) {
    const parsed = parseUrl(url);

    if (!parsed) {
      return { allowed: false, reason: 'URL invalide ou vide.' };
    }

    if (parsed.type === 'unknown') {
      return {
        allowed: false,
        parsed,
        reason: 'Domaine non reconnu : "' + parsed.host + '".',
      };
    }

    const all = DEFAULT_ENTRIES.concat(customEntries || []);

    for (let i = 0; i < all.length; i++) {
      if (_matches(parsed, all[i])) {
        return { allowed: true, entry: all[i], parsed };
      }
    }

    return {
      allowed: false,
      parsed,
      reason: 'Dépôt non autorisé (' + parsed.display + ').',
    };
  }

  // ─── Helpers privés ────────────────────────────────────────────────────────

  function _matches(parsed, entry) {
    // GitHub
    if (entry.type === 'github' && parsed.type === 'github') {
      return parsed.username === entry.username.toLowerCase();
    }
    // Forge (domaine entier, pas de username)
    if (entry.type === 'forge' && parsed.type === 'forge') {
      return parsed.host === entry.host.toLowerCase();
    }
    // GitLab custom (host + username)
    if (entry.type === 'gitlab' && parsed.type === 'gitlab') {
      return (
        parsed.host === entry.host.toLowerCase() &&
        parsed.username === entry.username.toLowerCase()
      );
    }
    return false;
  }

  // ─── Export ────────────────────────────────────────────────────────────────

  global.Whitelist = {
    DEFAULT_ENTRIES: DEFAULT_ENTRIES,
    parseUrl: parseUrl,
    checkUrl: checkUrl,
  };

})(window);
