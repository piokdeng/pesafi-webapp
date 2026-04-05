import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Service - KermaPay',
  description: 'Terms of Service for KermaPay - A decentralized financial platform built on Base L2 blockchain',
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl [&_a]:text-emerald-400 [&_a:hover]:text-emerald-300 [&_a:hover]:underline">
        <div className="prose prose-lg max-w-none">
          <h1 className="text-3xl font-bold text-foreground mb-8">Terms of Service</h1>
          
          <div className="text-sm text-muted-foreground mb-8">
            <strong>Last Updated:</strong> January 2025
          </div>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4">1. Introduction</h2>
            <p className="text-muted-foreground leading-relaxed">
              Welcome to KermaPay ("we," "our," or "us"). These Terms of Service ("Terms") govern your use of the KermaPay platform, 
              a decentralized financial platform built on the Base L2 blockchain that provides digital wallet services, 
              cross-border payments, and financial inclusion solutions for users in East Africa and globally.
            </p>
            <p className="text-muted-foreground leading-relaxed mt-4">
              By accessing or using our services, you agree to be bound by these Terms. If you do not agree to these Terms, 
              please do not use our services.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4">2. About KermaPay</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              KermaPay is a financial technology platform that offers:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
              <li><strong>Digital Wallets:</strong> Secure digital wallets supporting USDC and other cryptocurrencies on Base L2</li>
              <li><strong>Cross-Border Payments:</strong> Low-cost, instant money transfers within East Africa and globally</li>
              <li><strong>Merchant Services:</strong> Payment solutions for businesses including QR code payments and e-commerce integration</li>
              <li><strong>Financial Inclusion:</strong> Access to financial services for unbanked and underbanked populations</li>
              <li><strong>DeFi Integration:</strong> Access to decentralized finance protocols for savings and lending</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4">3. Eligibility and Account Creation</h2>
            
            <h3 className="text-xl font-semibold text-foreground mb-3">3.1 Eligibility Requirements</h3>
            <p className="text-muted-foreground leading-relaxed mb-4">
              To use KermaPay services, you must:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4 mb-4">
              <li>Be at least 18 years old (or the age of majority in your jurisdiction)</li>
              <li>Provide accurate and complete information during registration</li>
              <li>Comply with all applicable laws and regulations</li>
              <li>Not be located in a jurisdiction where our services are prohibited</li>
            </ul>

            <h3 className="text-xl font-semibold text-foreground mb-3">3.2 Account Registration</h3>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4 mb-4">
              <li>You must create an account using your email address and phone number</li>
              <li>You are responsible for maintaining the security of your account credentials</li>
              <li>You must notify us immediately of any unauthorized access to your account</li>
              <li>We reserve the right to suspend or terminate accounts that violate these Terms</li>
            </ul>

            <h3 className="text-xl font-semibold text-foreground mb-3">3.3 Identity Verification</h3>
            <p className="text-muted-foreground leading-relaxed">
              We may require identity verification (KYC) for certain services or transaction limits to comply with 
              regulatory requirements and prevent fraud.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4">4. Services Description</h2>
            
            <h3 className="text-xl font-semibold text-foreground mb-3">4.1 Digital Wallet Services</h3>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4 mb-4">
              <li><strong>Wallet Creation:</strong> We automatically create a smart wallet on Base L2 for each user</li>
              <li><strong>Asset Storage:</strong> Your digital assets are stored on the blockchain, not in our custody</li>
              <li><strong>Private Keys:</strong> We manage private keys securely using account abstraction technology</li>
              <li><strong>Social Recovery:</strong> Account recovery through trusted contacts (no seed phrases required)</li>
            </ul>

            <h3 className="text-xl font-semibold text-foreground mb-3">4.2 Payment Services</h3>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4 mb-4">
              <li><strong>Peer-to-Peer Transfers:</strong> Send and receive USDC instantly with minimal fees</li>
              <li><strong>Cross-Border Payments:</strong> International money transfers with competitive exchange rates</li>
              <li><strong>Merchant Payments:</strong> Pay at participating merchants using QR codes</li>
              <li><strong>Request Money:</strong> Request payments from other users</li>
            </ul>

            <h3 className="text-xl font-semibold text-foreground mb-3">4.3 Additional Services</h3>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
              <li><strong>Currency Conversion:</strong> Convert between USDC and local currencies using real-time exchange rates</li>
              <li><strong>Transaction History:</strong> Access detailed transaction records and receipts</li>
              <li><strong>Notifications:</strong> Receive SMS and email notifications for account activity</li>
              <li><strong>Customer Support:</strong> 24/7 customer support via email and chat</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4">5. User Responsibilities</h2>
            
            <h3 className="text-xl font-semibold text-foreground mb-3">5.1 Compliance</h3>
            <p className="text-muted-foreground leading-relaxed mb-4">
              You agree to:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4 mb-4">
              <li>Use our services only for lawful purposes</li>
              <li>Comply with all applicable laws and regulations in your jurisdiction</li>
              <li>Not engage in money laundering, terrorist financing, or other illegal activities</li>
              <li>Provide accurate information and update it as necessary</li>
            </ul>

            <h3 className="text-xl font-semibold text-foreground mb-3">5.2 Prohibited Activities</h3>
            <p className="text-muted-foreground leading-relaxed mb-4">
              You may not:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4 mb-4">
              <li>Use our services for illegal purposes or to facilitate illegal activities</li>
              <li>Attempt to hack, disrupt, or compromise our systems</li>
              <li>Create multiple accounts to circumvent restrictions</li>
              <li>Use our services to evade taxes or regulatory requirements</li>
              <li>Engage in market manipulation or fraudulent activities</li>
            </ul>

            <h3 className="text-xl font-semibold text-foreground mb-3">5.3 Security</h3>
            <p className="text-muted-foreground leading-relaxed mb-4">
              You are responsible for:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
              <li>Keeping your login credentials secure</li>
              <li>Using strong passwords and enabling two-factor authentication when available</li>
              <li>Not sharing your account information with others</li>
              <li>Reporting suspicious activity immediately</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4">6. Fees and Charges</h2>
            
            <h3 className="text-xl font-semibold text-foreground mb-3">6.1 Transaction Fees</h3>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4 mb-4">
              <li><strong>Peer-to-Peer Transfers:</strong> Minimal fees (typically &lt;$0.01)</li>
              <li><strong>Cross-Border Payments:</strong> Competitive fees with transparent pricing</li>
              <li><strong>Currency Conversion:</strong> Small spread on exchange rates (0.5-1%)</li>
              <li><strong>Merchant Payments:</strong> 0.5% fee for merchants</li>
            </ul>

            <h3 className="text-xl font-semibold text-foreground mb-3">6.2 Fee Structure</h3>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4 mb-4">
              <li>All fees are clearly displayed before transaction confirmation</li>
              <li>Fees may vary based on network conditions and service type</li>
              <li>We reserve the right to adjust fees with 30 days' notice</li>
            </ul>

            <h3 className="text-xl font-semibold text-foreground mb-3">6.3 No Hidden Fees</h3>
            <p className="text-muted-foreground leading-relaxed">
              We believe in transparent pricing. All fees are clearly disclosed before you complete any transaction.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4">7. Risk Disclosures</h2>
            
            <h3 className="text-xl font-semibold text-foreground mb-3">7.1 Cryptocurrency Risks</h3>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4 mb-4">
              <li><strong>Volatility:</strong> Cryptocurrency prices can fluctuate significantly</li>
              <li><strong>Regulatory Risk:</strong> Cryptocurrency regulations may change</li>
              <li><strong>Technology Risk:</strong> Blockchain technology is still evolving</li>
              <li><strong>Market Risk:</strong> Cryptocurrency markets can be highly volatile</li>
            </ul>

            <h3 className="text-xl font-semibold text-foreground mb-3">7.2 Platform Risks</h3>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4 mb-4">
              <li><strong>Smart Contract Risk:</strong> Smart contracts may contain bugs or vulnerabilities</li>
              <li><strong>Network Risk:</strong> Base L2 network may experience downtime or congestion</li>
              <li><strong>Liquidity Risk:</strong> Some assets may have limited liquidity</li>
              <li><strong>Operational Risk:</strong> Technical issues may temporarily affect services</li>
            </ul>

            <h3 className="text-xl font-semibold text-foreground mb-3">7.3 User Acknowledgment</h3>
            <p className="text-muted-foreground leading-relaxed">
              By using our services, you acknowledge and accept these risks. You should only invest what you can afford to lose.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4">8. Contact Information</h2>
            
            <h3 className="text-xl font-semibold text-foreground mb-3">8.1 Customer Support</h3>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4 mb-4">
              <li><strong>Email:</strong> support@kermapay.com</li>
              <li><strong>Phone:</strong> [Phone Number]</li>
              <li><strong>Address:</strong> [Business Address]</li>
            </ul>

            <h3 className="text-xl font-semibold text-foreground mb-3">8.2 Legal Notices</h3>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
              <li><strong>Email:</strong> legal@kermapay.com</li>
              <li><strong>Address:</strong> [Legal Address]</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4">9. Changes to Terms</h2>
            
            <h3 className="text-xl font-semibold text-foreground mb-3">9.1 Updates</h3>
            <p className="text-muted-foreground leading-relaxed mb-4">
              We may update these Terms from time to time to reflect:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4 mb-4">
              <li>Changes in our services</li>
              <li>Legal or regulatory requirements</li>
              <li>Industry best practices</li>
              <li>User feedback</li>
            </ul>

            <h3 className="text-xl font-semibold text-foreground mb-3">9.2 Notification</h3>
            <p className="text-muted-foreground leading-relaxed mb-4">
              We will notify you of material changes via:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4 mb-4">
              <li>Email notification</li>
              <li>In-app notification</li>
              <li>Website announcement</li>
            </ul>

            <h3 className="text-xl font-semibold text-foreground mb-3">9.3 Acceptance</h3>
            <p className="text-muted-foreground leading-relaxed">
              Continued use of our services after changes constitutes acceptance of the updated Terms.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4">10. Acknowledgment</h2>
            <p className="text-muted-foreground leading-relaxed">
              By using KermaPay services, you acknowledge that you have read, understood, and agree to be bound by these Terms of Service.
            </p>
          </section>

          <div className="mt-12 p-6 bg-muted rounded-lg">
            <h3 className="text-lg font-semibold text-foreground mb-2">KermaPay - Empowering Financial Freedom Through Blockchain Technology</h3>
            <p className="text-muted-foreground">
              For questions about these Terms, please contact us at{' '}
              <a href="mailto:legal@kermapay.com" className="text-primary hover:underline">
                legal@kermapay.com
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
