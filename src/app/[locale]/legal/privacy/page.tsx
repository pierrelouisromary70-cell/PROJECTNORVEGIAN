import { setRequestLocale } from 'next-intl/server';
import Link from 'next/link';

export default async function PrivacyPage(props: { params: Promise<{ locale: string }> }) {
  const params = await props.params;

  const {
    locale
  } = params;

  setRequestLocale(locale);
  return (
    <main className="min-h-screen bg-white text-ink-950">
      <div className="max-w-3xl mx-auto px-6 py-16">
        <Link href={`/${locale}`} className="text-sm text-ink-600 hover:text-ink-900">← Nordic Run</Link>
        <h1 className="display text-4xl md:text-5xl mt-6">Politique de Confidentialité</h1>
        <p className="text-sm text-ink-500 mt-2">Dernière mise à jour : 20 mai 2026 — Conforme RGPD</p>

        <div className="mt-10 space-y-6 text-ink-800">
          <Section title="Responsable du traitement">
            <p>
              Nordic Run, [forme juridique + adresse]. Contact RGPD : privacy@nordicrun.app.
              Vous pouvez à tout moment exercer vos droits par cette adresse ou auprès de la CNIL
              (www.cnil.fr).
            </p>
          </Section>

          <Section title="Données collectées et finalités">
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <strong>Compte :</strong> email, mot de passe haché. Finalité : authentification.
                Base légale : exécution du contrat. Durée : tant que le compte est actif + 3 ans.
              </li>
              <li>
                <strong>Profil sportif :</strong> sexe, années de pratique, volume hebdomadaire,
                VDOT, objectif, contraintes de temps. Finalité : génération des plans
                d&apos;entraînement. Base légale : exécution du contrat.
              </li>
              <li>
                <strong>Performances :</strong> temps de course, allures saisies. Finalité :
                calibration du VDOT. Base légale : exécution du contrat.
              </li>
              <li>
                <strong>Ressenti quotidien (fatigue, douleur, notes) :</strong> données
                considérées comme données de santé au sens de l&apos;article 4(15) du RGPD.
                Finalité : adaptation du plan. Base légale : <strong>consentement explicite</strong>
                (article 9.2.a RGPD), révocable à tout moment dans le profil.
              </li>
              <li>
                <strong>Cycle menstruel :</strong> donnée de santé sensible. Collectée uniquement
                après <strong>opt-in explicite</strong> dans le profil. Finalité : adaptation de
                l&apos;intensité aux phases physiologiques. Base légale : consentement explicite,
                révocable à tout moment, supprimable individuellement.
              </li>
              <li>
                <strong>Paiement :</strong> traité par Stripe Inc. (sous-traitant). Nordic Run ne
                stocke aucune coordonnée bancaire. Conservation : durée légale comptable (10 ans
                pour les factures).
              </li>
            </ul>
          </Section>

          <Section title="Sous-traitants et hébergement">
            <ul className="list-disc pl-5 space-y-2">
              <li><strong>Supabase Inc.</strong> (base de données et authentification) — hébergement
                UE (Francfort) si configuré ainsi. DPA signé.</li>
              <li><strong>Stripe Payments Europe</strong> (paiement) — hébergement UE/US, clauses
                contractuelles types signées.</li>
              <li><strong>Vercel Inc.</strong> (hébergement frontend) — région UE configurable, DPA
                signé.</li>
            </ul>
            <p>
              Aucune donnée n&apos;est revendue à des tiers, jamais. Aucun croisement avec des
              régies publicitaires.
            </p>
          </Section>

          <Section title="Vos droits">
            <p>
              Conformément au RGPD, vous disposez à tout moment des droits suivants :
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Droit d&apos;accès à vos données (article 15)</li>
              <li>Droit de rectification (article 16)</li>
              <li>Droit à l&apos;effacement / oubli (article 17) — suppression du compte depuis
                l&apos;application</li>
              <li>Droit à la portabilité (article 20) — export JSON disponible sur demande à
                privacy@nordicrun.app, réponse sous 30 jours</li>
              <li>Droit de retirer votre consentement à tout moment pour les données de santé
                (cycle, ressenti)</li>
              <li>Droit d&apos;introduire une réclamation auprès de la CNIL (www.cnil.fr)</li>
            </ul>
          </Section>

          <Section title="Cookies">
            <p>
              Nordic Run utilise uniquement des cookies strictement nécessaires
              (authentification, préférence de langue). Aucun cookie de mesure d&apos;audience ou
              publicitaire n&apos;est déposé sans votre consentement. Aucun pixel de tracking tiers.
            </p>
          </Section>

          <Section title="Sécurité">
            <p>
              Toutes les communications sont chiffrées en transit (HTTPS/TLS). Les mots de passe
              sont hachés (algorithme bcrypt). Les données sensibles (cycle, santé) sont stockées
              dans des tables séparées avec contrôle d&apos;accès au niveau ligne (Row Level
              Security PostgreSQL). En cas de violation de données, vous serez informé sous 72
              heures conformément à l&apos;article 34 du RGPD.
            </p>
          </Section>

          <Section title="Mineurs">
            <p>
              Nordic Run n&apos;est pas destiné aux enfants de moins de 16 ans. Aucune donnée
              n&apos;est sciemment collectée auprès de cette population. Si vous êtes parent et
              constatez qu&apos;un mineur s&apos;est inscrit, contactez privacy@nordicrun.app pour
              suppression immédiate.
            </p>
          </Section>
        </div>
      </div>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="font-display text-2xl text-ink-950 mb-3">{title}</h2>
      <div className="space-y-3 text-ink-800 leading-relaxed">{children}</div>
    </section>
  );
}
