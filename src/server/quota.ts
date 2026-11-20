/**
 * Plafond global de questions par jour, tous visiteurs confondus.
 * Complète la limite par visiteur : même avec beaucoup de visiteurs différents,
 * la facture de l'API Claude ne peut pas s'emballer.
 * Le compteur est en mémoire : il repart à zéro au redémarrage du serveur, ce qui suffit ici.
 */
export function createDailyQuota(limit: number, now: () => Date = () => new Date()) {
  let day = "";
  let used = 0;

  return {
    /** Consomme une question ; renvoie false si le plafond du jour est atteint. */
    take(): boolean {
      const today = now().toISOString().slice(0, 10);
      if (today !== day) {
        day = today;
        used = 0;
      }
      if (used >= limit) return false;
      used++;
      return true;
    },
    remaining(): number {
      const today = now().toISOString().slice(0, 10);
      return today === day ? Math.max(0, limit - used) : limit;
    },
  };
}
