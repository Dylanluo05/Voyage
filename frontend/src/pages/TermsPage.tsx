import { Link } from 'react-router-dom';

const LAST_UPDATED = 'October 22, 2026';
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
        an account or using Voyage, you agree to these Terms and to our{' '}
        <Link to="/privacy">Privacy Policy</Link>. If you don't agree, please don't use the app.
      </p>

      <h2>1. Eligibility</h2>
      <p>
        You must be at least 16 years old to use Voyage. If you are under 18, you confirm that
        a parent or guardian is aware you are using it. Do not attend in-person sidequest events
        arranged through Voyage unless you are 18 or older, or are accompanied by a parent or
        guardian.
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
        <li>Use Voyage for anything illegal, or to harass, abuse, threaten, or harm another person.</li>
        <li>Upload or post content that is obscene, sexually explicit, hateful, infringing, or otherwise unlawful, or any content involving minors that is sexual or exploitative.</li>
        <li>Create sidequests that encourage illegal activity, trespassing, or conduct likely to cause injury to anyone.</li>
        <li>Submit photos for sidequest verification that you did not take, or otherwise try to cheat XP, badges, or the leaderboard.</li>
        <li>Attempt to abuse, circumvent, or excessively automate the AI chat, sidequest, or invite features (for example, scripting requests to bypass usage limits).</li>
        <li>Attempt to gain unauthorized access to other users' accounts, trips, or data, or probe, scrape, or overload the service.</li>
        <li>Interfere with or disrupt the operation of the service.</li>
      </ul>
      <p>We may remove content and suspend or terminate accounts that violate these rules.</p>

      <h2>4. Your content</h2>
      <p>
        You retain ownership of the trips, photos, comments, and other content you create in
        Voyage ("your content"). By submitting content, you grant us a limited, worldwide,
        non-exclusive license to host, store, reproduce, and display it as needed to operate the
        app — for example, showing your trip to collaborators, displaying a public trip on the
        Discover feed if you choose to make it public, or showing a public sidequest photo to
        other users.
      </p>
      <p>
        You're responsible for your content and for having the right to share anything you
        upload, including photos and any people who appear in them. Content you mark public, or
        submit as part of a public sidequest, is visible to other users; trip share links are
        visible to anyone with the link. Anyone who has a share link to a public trip may also be
        able to add photos to its trip log.
      </p>

      <h2>5. Moderation and reporting</h2>
      <p>
        You can report trips, sidequests, comments, and sidequest photos using the "Report"
        buttons in the app, or by emailing <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
        We review reports and may remove content or restrict accounts at our discretion. We are
        not obligated to monitor content and do not guarantee that all objectionable content will
        be found or removed.
      </p>

      <h2>6. Copyright complaints</h2>
      <p>
        If you believe content on Voyage infringes your copyright, email{' '}
        <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> with: a description of the work;
        where the allegedly infringing material appears (a link); your name and contact details;
        a statement that you believe in good faith the use is not authorized; and a statement,
        under penalty of perjury, that the information is accurate and that you are the owner or
        authorized to act for the owner. We may remove the material and, for repeat infringers,
        terminate accounts. If you believe content was removed by mistake, you may send us a
        counter-notice by email.
      </p>

      <h2>7. Sidequests, travel, and your safety</h2>
      <p>
        Sidequests are optional challenges you choose to attempt in the real world, and many are
        created by other users, not by us. We do not review sidequests for safety, legality, or
        suitability, and the XP shown is a game mechanic — never a reason to take a risk.
      </p>
      <p>
        You attempt sidequests, travel, and all activities you plan or discover through Voyage
        entirely at your own risk. You are solely responsible for deciding whether an activity is
        safe and legal for you; for following local laws, safety rules, and posted signs; for
        respecting private property and other people; and for your own insurance, health, and
        travel documents. Do not do anything that may endanger yourself or others, and do not
        trespass, damage property, or break the law to complete a sidequest.
      </p>
      <p>
        If you meet other people through Voyage, including at sidequest events, use the same
        caution you would with any stranger: meet in public places, tell someone where you are
        going, and leave if you feel uncomfortable. We do not screen, vet, or background-check
        users and are not responsible for the conduct of other users, online or offline.
      </p>

      <h2>8. AI features</h2>
      <p>
        Voyage's AI trip assistant can suggest itinerary items, answer questions, make edits to
        your trip on your request, and help import booking details and check sidequest photos.
        AI-generated output may be inaccurate, incomplete, or outdated — it is not professional
        travel, safety, medical, or legal advice, and you should independently verify anything
        important (opening hours, prices, entry requirements, safety) before relying on it. AI
        photo verification can make mistakes in either direction; we may adjust or revoke XP
        where it appears to have been awarded incorrectly or unfairly. AI features are subject to
        daily usage limits that depend on your plan.
      </p>

      <h2>9. Third-party services</h2>
      <p>
        Voyage integrates with third-party services, including Google Maps, Spotify, Pexels, and
        weather and transit data providers. We don't control these services and aren't
        responsible for their accuracy, availability, or content. Your use of them may be subject
        to their own terms.
      </p>

      <h2>10. Subscriptions and payment</h2>
      <p>
        Voyage offers optional paid plans with additional features or higher usage limits. Current
        plans and prices are shown on the <Link to="/subscription">Plans</Link> page and again at
        checkout. Payments are processed by Stripe.
      </p>
      <p>
        <strong>Automatic renewal.</strong> Paid subscriptions renew automatically each month at
        the then-current price until you cancel. You can cancel at any time from the "Manage
        billing" button on the Plans page, or by emailing us; cancellation takes effect at the
        end of the current billing period and you keep paid features until then. We will tell you
        in advance if the price of your plan changes. Fees are non-refundable except where
        required by law. If a payment fails, we may downgrade your account to the free plan.
      </p>

      <h2>11. Termination</h2>
      <p>
        You may stop using Voyage and delete your account at any time from your profile page. We
        may suspend or terminate your access if you violate these Terms or put others at risk, or
        discontinue the service (or parts of it) at our discretion, with reasonable notice where
        practical.
      </p>

      <h2>12. Disclaimer of warranties</h2>
      <p>
        Voyage is provided "as is" and "as available," without warranties of any kind, express or
        implied, including merchantability, fitness for a particular purpose, and
        non-infringement. We don't guarantee the app will be uninterrupted, error-free, or secure,
        that content will not be lost, or that any particular travel outcome will result from
        using it.
      </p>

      <h2>13. Limitation of liability</h2>
      <p>
        To the fullest extent permitted by law, Voyage and its operator are not liable for any
        indirect, incidental, special, consequential, or punitive damages arising from your use
        of the app, including lost bookings, travel disruptions, personal injury or property
        damage arising from activities you undertake, or data loss. Our total liability for any
        claim arising from your use of Voyage is limited to the greater of the amount you paid us
        in the twelve months before the claim arose or fifty US dollars ($50). Some jurisdictions
        do not allow certain limitations, so some of these may not apply to you.
      </p>

      <h2>14. Indemnification</h2>
      <p>
        You agree to defend and indemnify Voyage and its operator against claims, damages, and
        expenses (including reasonable legal fees) arising from your content, your sidequests,
        your violation of these Terms, or your violation of anyone else's rights or the law.
      </p>

      <h2>15. Governing law and disputes</h2>
      <p>
        These Terms are governed by the laws of the State of California, without regard to its
        conflict-of-laws rules. Before filing a claim, you agree to contact us at{' '}
        <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> and try to resolve the dispute
        informally for at least 30 days. Any claim that is not resolved will be brought in the
        state or federal courts located in California, and you and we consent to their
        jurisdiction, except that either of us may bring an individual claim in small claims
        court.
      </p>

      <h2>16. Changes to these terms</h2>
      <p>
        We may update these Terms as the app evolves. If we make material changes, we'll update
        the "last updated" date above and, where appropriate, notify you directly. Continued use
        of Voyage after changes take effect means you accept the updated Terms.
      </p>

      <h2>17. General</h2>
      <p>
        These Terms and the Privacy Policy are the entire agreement between you and Voyage about
        the service. If any part is found unenforceable, the rest remains in effect. Our failure
        to enforce a provision is not a waiver of it. You may not transfer your rights under these
        Terms; we may transfer ours as part of a sale or reorganization of the service.
      </p>

      <h2>18. Contact us</h2>
      <p>
        Questions about these Terms? Email <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
        See also our <Link to="/privacy">Privacy Policy</Link>.
      </p>
    </main>
  );
}
