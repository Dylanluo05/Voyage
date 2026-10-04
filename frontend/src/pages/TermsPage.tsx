import { Link } from 'react-router-dom';

const LAST_UPDATED = 'October 4, 2026';
const CONTACT_EMAIL = 'team.voyageapp@gmail.com';

export default function TermsPage() {
  return (
    <main className="wrap legal-page">
      <span className="eyebrow">Legal</span>
      <h1>Terms of Service</h1>
      <p className="legal-updated">Last updated: {LAST_UPDATED}</p>

      <p>
        These Terms of Service ("Terms") govern your use of Voyage, a trip-planning app operated
        by an individual based in California, United States ("Voyage", "we", "us"). By creating
        an account or using Voyage, you agree to these Terms. If you don't agree, please don't
        use the app.
      </p>

      <h2>1. Eligibility</h2>
      <p>
        You must be at least 16 years old to use Voyage. By using the app, you confirm that you
        meet this requirement.
      </p>

      <h2>2. Your account</h2>
      <p>
        You're responsible for the accuracy of the information you provide and for keeping your
        password secure. You're responsible for all activity that happens under your account.
        Let us know right away at <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> if you
        suspect unauthorized access.
      </p>

      <h2>3. Acceptable use</h2>
      <p>You agree not to:</p>
      <ul>
        <li>Use Voyage for anything illegal, or to harass, abuse, or harm another person.</li>
        <li>Upload content that is obscene, hateful, infringing, or otherwise unlawful.</li>
        <li>Attempt to abuse, circumvent, or excessively automate the AI chat, sidequest, or invite features (for example, scripting requests to bypass usage limits).</li>
        <li>Attempt to gain unauthorized access to other users' accounts, trips, or data.</li>
        <li>Interfere with or disrupt the operation of the service.</li>
      </ul>
      <p>We may suspend or terminate accounts that violate these rules.</p>

      <h2>4. Your content</h2>
      <p>
        You retain ownership of the trips, photos, comments, and other content you create in
        Voyage ("your content"). By submitting content, you grant us a limited license to host,
        store, and display it as needed to operate the app — for example, showing your trip to
        collaborators, or displaying a public trip on the Discover feed if you choose to make it
        public.
      </p>
      <p>
        You're responsible for your content and for having the right to share anything you
        upload, including photos. Content you mark public, or submit as part of a public
        sidequest, is visible to other users; trip share links are visible to anyone with the
        link.
      </p>

      <h2>5. AI features</h2>
      <p>
        Voyage's AI trip assistant can suggest itinerary items, answer questions, and make
        edits to your trip on your request. AI-generated suggestions may be inaccurate or
        outdated — they are not professional travel, safety, or legal advice, and you should
        independently verify anything important (opening hours, prices, travel requirements)
        before relying on it.
      </p>

      <h2>6. Third-party services</h2>
      <p>
        Voyage integrates with third-party services, including Google Maps, Spotify, and weather
        and transit data providers. We don't control these services and aren't responsible for
        their accuracy, availability, or content.
      </p>

      <h2>7. Subscriptions and payment</h2>
      <p>
        Voyage offers optional paid plans with additional features or higher usage limits.
        Payments are processed by Stripe. Subscriptions renew automatically until cancelled; you
        can cancel anytime from your subscription settings, and cancellation takes effect at the
        end of the current billing period. Fees are non-refundable except where required by law.
      </p>

      <h2>8. Termination</h2>
      <p>
        You may stop using Voyage and delete your account at any time. We may suspend or
        terminate your access if you violate these Terms, or discontinue the service (or parts of
        it) at our discretion, with reasonable notice where practical.
      </p>

      <h2>9. Disclaimer of warranties</h2>
      <p>
        Voyage is provided "as is" and "as available," without warranties of any kind, express or
        implied. We don't guarantee the app will be uninterrupted, error-free, or that any
        particular travel outcome will result from using it.
      </p>

      <h2>10. Limitation of liability</h2>
      <p>
        To the fullest extent permitted by law, Voyage and its operator are not liable for any
        indirect, incidental, special, or consequential damages arising from your use of the app,
        including lost bookings, travel disruptions, or data loss. Our total liability for any
        claim arising from your use of Voyage is limited to the amount you paid us, if any, in
        the twelve months before the claim arose.
      </p>

      <h2>11. Governing law</h2>
      <p>
        These Terms are governed by the laws of the State of California, without regard to its
        conflict-of-laws rules.
      </p>

      <h2>12. Changes to these terms</h2>
      <p>
        We may update these Terms as the app evolves. If we make material changes, we'll update
        the "last updated" date above and, where appropriate, notify you directly. Continued use
        of Voyage after changes take effect means you accept the updated Terms.
      </p>

      <h2>13. Contact us</h2>
      <p>
        Questions about these Terms? Email <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
        See also our <Link to="/privacy">Privacy Policy</Link>.
      </p>
    </main>
  );
}
