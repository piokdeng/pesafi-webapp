import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy - KermaPay',
  description: 'Privacy Policy for KermaPay - How we collect, use, and protect your personal information',
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl [&_a]:text-emerald-400 [&_a:hover]:text-emerald-300 [&_a:hover]:underline">
        <div className="prose prose-lg max-w-none">
          <h1 className="text-3xl font-bold text-foreground mb-8">Privacy Policy</h1>
          
          <div className="text-sm text-muted-foreground mb-8">
            <strong>Last Updated:</strong> January 2025
          </div>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4">1. Introduction</h2>
            <p className="text-muted-foreground leading-relaxed">
              KermaPay ("we," "our," or "us") is committed to protecting your privacy and personal information. 
              This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use 
              our decentralized financial platform built on the Base L2 blockchain.
            </p>
            <p className="text-muted-foreground leading-relaxed mt-4">
              By using our services, you consent to the data practices described in this Privacy Policy. 
              If you do not agree with our practices, please do not use our services.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4">2. Information We Collect</h2>
            
            <h3 className="text-xl font-semibold text-foreground mb-3">2.1 Personal Information</h3>
            <p className="text-muted-foreground leading-relaxed mb-4">
              We collect personal information that you provide directly to us, including:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4 mb-4">
              <li><strong>Identity Information:</strong> Full name, date of birth, government-issued ID numbers</li>
              <li><strong>Contact Information:</strong> Email address, phone number, physical address</li>
              <li><strong>Account Information:</strong> Username, password, security questions</li>
              <li><strong>Financial Information:</strong> Bank account details (if applicable), transaction history</li>
              <li><strong>Biometric Information:</strong> Fingerprint or facial recognition data (if used for authentication)</li>
            </ul>

            <h3 className="text-xl font-semibold text-foreground mb-3">2.2 Transaction Information</h3>
            <p className="text-muted-foreground leading-relaxed mb-4">
              We collect information about your financial transactions, including:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4 mb-4">
              <li><strong>Transaction Details:</strong> Amount, date, time, recipient/sender information</li>
              <li><strong>Payment Methods:</strong> USDC transfers, currency conversions, merchant payments</li>
              <li><strong>Transaction History:</strong> Complete record of all platform activities</li>
              <li><strong>Cross-Border Payments:</strong> International transfer details and compliance information</li>
            </ul>

            <h3 className="text-xl font-semibold text-foreground mb-3">2.3 Technical Information</h3>
            <p className="text-muted-foreground leading-relaxed mb-4">
              We automatically collect technical information when you use our services:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4 mb-4">
              <li><strong>Device Information:</strong> Device type, operating system, browser type, IP address</li>
              <li><strong>Usage Data:</strong> Pages visited, features used, time spent on platform</li>
              <li><strong>Location Data:</strong> General location based on IP address (country/region level)</li>
              <li><strong>Log Data:</strong> Server logs, error reports, performance data</li>
              <li><strong>Cookies and Tracking:</strong> Browser cookies, local storage, tracking pixels</li>
            </ul>

            <h3 className="text-xl font-semibold text-foreground mb-3">2.4 Blockchain Information</h3>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Due to the decentralized nature of our platform, certain information is publicly available on the blockchain:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
              <li><strong>Wallet Addresses:</strong> Your public wallet address on Base L2</li>
              <li><strong>Transaction Records:</strong> All transactions are recorded on the blockchain</li>
              <li><strong>Smart Contract Interactions:</strong> Interactions with our smart contracts</li>
              <li><strong>Network Data:</strong> Gas fees, transaction confirmations, block information</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4">3. How We Use Your Information</h2>
            
            <h3 className="text-xl font-semibold text-foreground mb-3">3.1 Service Provision</h3>
            <p className="text-muted-foreground leading-relaxed mb-4">
              We use your information to:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4 mb-4">
              <li><strong>Account Management:</strong> Create and maintain your account</li>
              <li><strong>Transaction Processing:</strong> Process payments, transfers, and currency conversions</li>
              <li><strong>Wallet Services:</strong> Manage your digital wallet and private keys</li>
              <li><strong>Customer Support:</strong> Provide assistance and resolve issues</li>
              <li><strong>Security:</strong> Protect against fraud and unauthorized access</li>
            </ul>

            <h3 className="text-xl font-semibold text-foreground mb-3">3.2 Compliance and Legal Requirements</h3>
            <p className="text-muted-foreground leading-relaxed mb-4">
              We use your information to:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4 mb-4">
              <li><strong>Regulatory Compliance:</strong> Meet AML, KYC, and other regulatory requirements</li>
              <li><strong>Tax Reporting:</strong> Comply with tax obligations where applicable</li>
              <li><strong>Legal Requests:</strong> Respond to law enforcement and legal requests</li>
              <li><strong>Sanctions Screening:</strong> Screen against sanctions lists and watchlists</li>
              <li><strong>Risk Management:</strong> Assess and manage financial and operational risks</li>
            </ul>

            <h3 className="text-xl font-semibold text-foreground mb-3">3.3 Service Improvement</h3>
            <p className="text-muted-foreground leading-relaxed mb-4">
              We use your information to:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
              <li><strong>Product Development:</strong> Improve existing features and develop new ones</li>
              <li><strong>Analytics:</strong> Analyze usage patterns and user behavior</li>
              <li><strong>Performance Monitoring:</strong> Monitor system performance and identify issues</li>
              <li><strong>Research:</strong> Conduct research to improve our services</li>
              <li><strong>Personalization:</strong> Customize your experience and provide relevant content</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4">4. Information Sharing and Disclosure</h2>
            
            <h3 className="text-xl font-semibold text-foreground mb-3">4.1 Third-Party Service Providers</h3>
            <p className="text-muted-foreground leading-relaxed mb-4">
              We may share your information with trusted third-party service providers who assist us in:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4 mb-4">
              <li><strong>Payment Processing:</strong> Payment processors and financial institutions</li>
              <li><strong>Identity Verification:</strong> KYC/AML service providers</li>
              <li><strong>Cloud Services:</strong> Cloud storage and computing providers</li>
              <li><strong>Analytics:</strong> Analytics and data analysis services</li>
              <li><strong>Customer Support:</strong> Customer support and communication tools</li>
              <li><strong>Security:</strong> Security and fraud prevention services</li>
            </ul>

            <h3 className="text-xl font-semibold text-foreground mb-3">4.2 Legal and Regulatory Requirements</h3>
            <p className="text-muted-foreground leading-relaxed mb-4">
              We may disclose your information when required by:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
              <li><strong>Law Enforcement:</strong> Valid legal requests from law enforcement agencies</li>
              <li><strong>Regulatory Authorities:</strong> Requests from financial regulators and government agencies</li>
              <li><strong>Court Orders:</strong> Valid court orders, subpoenas, or legal processes</li>
              <li><strong>Compliance:</strong> Compliance with applicable laws and regulations</li>
              <li><strong>Protection:</strong> Protection of our rights, property, or safety</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4">5. Data Security</h2>
            
            <h3 className="text-xl font-semibold text-foreground mb-3">5.1 Security Measures</h3>
            <p className="text-muted-foreground leading-relaxed mb-4">
              We implement comprehensive security measures to protect your information:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4 mb-4">
              <li><strong>Encryption:</strong> End-to-end encryption for sensitive data transmission</li>
              <li><strong>Access Controls:</strong> Role-based access controls and authentication</li>
              <li><strong>Secure Storage:</strong> Encrypted data storage with regular security audits</li>
              <li><strong>Network Security:</strong> Firewalls, intrusion detection, and monitoring systems</li>
              <li><strong>Employee Training:</strong> Regular security training for all employees</li>
              <li><strong>Incident Response:</strong> Incident response procedures and breach notification protocols</li>
            </ul>

            <h3 className="text-xl font-semibold text-foreground mb-3">5.2 Blockchain Security</h3>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Our platform leverages blockchain technology for enhanced security:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
              <li><strong>Decentralization:</strong> Reduced single points of failure</li>
              <li><strong>Cryptographic Security:</strong> Advanced cryptographic protection</li>
              <li><strong>Immutable Records:</strong> Tamper-proof transaction records</li>
              <li><strong>Smart Contract Security:</strong> Audited smart contracts for secure operations</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4">6. Your Rights and Choices</h2>
            
            <h3 className="text-xl font-semibold text-foreground mb-3">6.1 Access and Portability</h3>
            <p className="text-muted-foreground leading-relaxed mb-4">
              You have the right to:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4 mb-4">
              <li><strong>Access:</strong> Request access to your personal information</li>
              <li><strong>Portability:</strong> Receive your data in a portable format</li>
              <li><strong>Correction:</strong> Request correction of inaccurate information</li>
              <li><strong>Deletion:</strong> Request deletion of your personal information</li>
            </ul>

            <h3 className="text-xl font-semibold text-foreground mb-3">6.2 Communication Preferences</h3>
            <p className="text-muted-foreground leading-relaxed mb-4">
              You can control how we communicate with you:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4 mb-4">
              <li><strong>Email Preferences:</strong> Opt out of marketing emails while receiving important service communications</li>
              <li><strong>SMS Preferences:</strong> Manage SMS notifications and alerts</li>
              <li><strong>Push Notifications:</strong> Control push notification settings in the app</li>
              <li><strong>Marketing:</strong> Opt out of marketing communications at any time</li>
            </ul>

            <h3 className="text-xl font-semibold text-foreground mb-3">6.3 Exercising Your Rights</h3>
            <p className="text-muted-foreground leading-relaxed mb-4">
              To exercise your rights, you can:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
              <li><strong>Contact Us:</strong> Email us at privacy@kermapay.com</li>
              <li><strong>Account Settings:</strong> Use the privacy controls in your account</li>
              <li><strong>Support:</strong> Contact our customer support team</li>
              <li><strong>Legal:</strong> Contact our legal team for complex requests</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4">7. Regional Privacy Rights</h2>
            
            <h3 className="text-xl font-semibold text-foreground mb-3">7.1 European Union (GDPR)</h3>
            <p className="text-muted-foreground leading-relaxed mb-4">
              If you are in the EU, you have additional rights under the General Data Protection Regulation:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4 mb-4">
              <li><strong>Right to Access:</strong> Access your personal data</li>
              <li><strong>Right to Rectification:</strong> Correct inaccurate data</li>
              <li><strong>Right to Erasure:</strong> Request deletion of your data</li>
              <li><strong>Right to Restrict Processing:</strong> Limit how we use your data</li>
              <li><strong>Right to Data Portability:</strong> Receive your data in a portable format</li>
              <li><strong>Right to Object:</strong> Object to certain types of processing</li>
              <li><strong>Rights Related to Automated Decision Making:</strong> Rights regarding automated decisions</li>
            </ul>

            <h3 className="text-xl font-semibold text-foreground mb-3">7.2 California (CCPA)</h3>
            <p className="text-muted-foreground leading-relaxed mb-4">
              If you are a California resident, you have rights under the California Consumer Privacy Act:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
              <li><strong>Right to Know:</strong> Know what personal information we collect</li>
              <li><strong>Right to Delete:</strong> Request deletion of personal information</li>
              <li><strong>Right to Opt-Out:</strong> Opt out of the sale of personal information</li>
              <li><strong>Right to Non-Discrimination:</strong> Not be discriminated against for exercising your rights</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4">8. Changes to This Privacy Policy</h2>
            
            <h3 className="text-xl font-semibold text-foreground mb-3">8.1 Updates</h3>
            <p className="text-muted-foreground leading-relaxed mb-4">
              We may update this Privacy Policy from time to time to reflect:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4 mb-4">
              <li>Changes in our services</li>
              <li>New legal or regulatory requirements</li>
              <li>Changes in industry best practices</li>
              <li>Feedback from users and stakeholders</li>
            </ul>

            <h3 className="text-xl font-semibold text-foreground mb-3">8.2 Notification of Changes</h3>
            <p className="text-muted-foreground leading-relaxed mb-4">
              We will notify you of material changes through:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4 mb-4">
              <li>Email notification to your registered address</li>
              <li>In-app notification within the platform</li>
              <li>Notice on our website</li>
              <li>Announcement on our social media channels</li>
            </ul>

            <h3 className="text-xl font-semibold text-foreground mb-3">8.3 Continued Use</h3>
            <p className="text-muted-foreground leading-relaxed">
              Your continued use of our services after changes constitutes acceptance of the updated Privacy Policy.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4">9. Contact Information</h2>
            
            <h3 className="text-xl font-semibold text-foreground mb-3">9.1 Privacy Questions</h3>
            <p className="text-muted-foreground leading-relaxed mb-4">
              If you have questions about this Privacy Policy or our privacy practices, please contact us:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4 mb-4">
              <li><strong>Email:</strong> privacy@kermapay.com</li>
              <li><strong>Phone:</strong> [Phone Number]</li>
              <li><strong>Address:</strong> [Privacy Office Address]</li>
            </ul>

            <h3 className="text-xl font-semibold text-foreground mb-3">9.2 Data Protection Officer</h3>
            <p className="text-muted-foreground leading-relaxed mb-4">
              For complex privacy matters, you can contact our Data Protection Officer:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
              <li><strong>Email:</strong> dpo@kermapay.com</li>
              <li><strong>Address:</strong> [DPO Address]</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4">10. Glossary</h2>
            <div className="grid gap-4">
              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-semibold text-foreground mb-2">Account Abstraction</h4>
                <p className="text-muted-foreground text-sm">Technology that allows for more flexible wallet management without traditional private keys.</p>
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-semibold text-foreground mb-2">AML</h4>
                <p className="text-muted-foreground text-sm">Anti-Money Laundering regulations designed to prevent money laundering activities.</p>
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-semibold text-foreground mb-2">Base L2</h4>
                <p className="text-muted-foreground text-sm">A Layer 2 blockchain built on Ethereum that provides faster and cheaper transactions.</p>
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-semibold text-foreground mb-2">DeFi</h4>
                <p className="text-muted-foreground text-sm">Decentralized Finance protocols that provide financial services without traditional intermediaries.</p>
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-semibold text-foreground mb-2">KYC</h4>
                <p className="text-muted-foreground text-sm">Know Your Customer procedures to verify customer identity and prevent fraud.</p>
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-semibold text-foreground mb-2">Smart Contract</h4>
                <p className="text-muted-foreground text-sm">Self-executing contracts with terms directly written into code on the blockchain.</p>
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-semibold text-foreground mb-2">USDC</h4>
                <p className="text-muted-foreground text-sm">USD Coin, a stablecoin pegged to the US dollar.</p>
              </div>
            </div>
          </section>

          <div className="mt-12 p-6 bg-muted rounded-lg">
            <h3 className="text-lg font-semibold text-foreground mb-2">KermaPay - Protecting Your Privacy While Empowering Financial Freedom</h3>
            <p className="text-muted-foreground">
              For privacy-related questions, please contact us at{' '}
              <a href="mailto:privacy@kermapay.com" className="text-primary hover:underline">
                privacy@kermapay.com
              </a>
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              <strong>Effective Date:</strong> This Privacy Policy is effective as of January 2025 and applies to all information collected from that date forward.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
