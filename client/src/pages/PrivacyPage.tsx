import Footer from '../components/Footer';

// Privacy policy for Storyhand
export default function PrivacyPage() {
  return (
    <div className="max-w-2xl mx-auto mt-12 px-4 pb-16">
      <h2 className="text-2xl font-bold mb-6 text-gray-800 dark:text-white">Privacy Policy</h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">Last updated: March 2026</p>

      <div className="flex flex-col gap-6 text-gray-700 dark:text-gray-300 text-sm leading-relaxed">
        <section>
          <h3 className="font-semibold text-gray-800 dark:text-white mb-2">What Storyhand Is</h3>
          <p>
            Storyhand is a free, open-source planning poker tool for agile teams. It lets
            you create estimation sessions, share a session code, and vote on story points
            in real time — no accounts required.
          </p>
        </section>

        <section>
          <h3 className="font-semibold text-gray-800 dark:text-white mb-2">Data We Collect</h3>
          <p>Storyhand collects the minimum data needed to run a session:</p>
          <ul className="list-disc pl-5 mt-2 flex flex-col gap-1">
            <li><strong>Display names</strong> — the name you enter when creating or joining a session. This is not tied to any account or identity.</li>
            <li><strong>Session data</strong> — game settings, votes, and round history for the duration of the session.</li>
            <li><strong>Connection data</strong> — basic socket connection information to manage real-time communication.</li>
          </ul>
        </section>

        <section>
          <h3 className="font-semibold text-gray-800 dark:text-white mb-2">What We Don't Collect</h3>
          <ul className="list-disc pl-5 flex flex-col gap-1">
            <li>No email addresses or personal accounts</li>
            <li>No passwords or authentication credentials</li>
            <li>No cookies or tracking pixels</li>
            <li>No analytics or third-party tracking scripts</li>
            <li>No location data</li>
          </ul>
        </section>

        <section>
          <h3 className="font-semibold text-gray-800 dark:text-white mb-2">How Data Is Stored</h3>
          <p>
            All session data is held <strong>in memory only</strong> on the server. Nothing is
            written to a database or disk. When a session ends — either by the host leaving
            or by inactivity timeout — all data for that session is permanently deleted.
            There is no way to recover a session after it ends.
          </p>
        </section>

        <section>
          <h3 className="font-semibold text-gray-800 dark:text-white mb-2">Data Sharing</h3>
          <p>
            Storyhand does not sell, share, or transmit your data to any third party.
            Session data is only visible to participants in the same session.
          </p>
        </section>

        <section>
          <h3 className="font-semibold text-gray-800 dark:text-white mb-2">Open Source</h3>
          <p>
            Storyhand is open source. You can review the code, verify these claims, or
            host your own instance. The source is available
            at <a href="https://github.com/francis-eye/storyhand" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">github.com/francis-eye/storyhand</a>.
          </p>
        </section>

        <section>
          <h3 className="font-semibold text-gray-800 dark:text-white mb-2">Contact</h3>
          <p>
            Questions about this policy? Open an issue on the <a href="https://github.com/francis-eye/storyhand/issues" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">GitHub repository</a>.
          </p>
        </section>
      </div>

      <Footer />
    </div>
  );
}
