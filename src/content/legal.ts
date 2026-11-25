// Copied from the app (frontend/src/screens/common/LegalScreen.tsx) so the site
// shows the same Terms and Privacy text.

export interface Section {
  title: string;
  paragraphs: string[];
}

export const LAST_UPDATED = 'August 3, 2026';

// Kept intentionally direct rather than generic boilerplate — Section 3 (Zero-Tolerance
// Content Policy) is the App Store Guideline 1.2 requirement for apps with UGC (reels):
// it must state a zero-tolerance stance and point at a real reporting/removal mechanism.
export const TERMS_SECTIONS: Section[] = [
  {
    title: '1. Acceptance of These Terms',
    paragraphs: [
      'By creating a Juvi account or using the Juvi app, you agree to these Terms of Service. If you do not agree, do not use Juvi.',
      'Juvi is a marketplace that connects customers with independent beauty and wellness artists ("Artists") to arrange in-person, real-world services. Juvi is not itself a provider of beauty services and is not a party to the service arrangement between a customer and an Artist.',
    ],
  },
  {
    title: '2. Eligibility & Your Account',
    paragraphs: [
      'You must be at least 18 years old to create a Juvi account. You are responsible for the accuracy of the information on your account and for all activity that happens under it.',
      'Artist accounts are subject to an onboarding and verification process before they can accept bookings. Juvi may decline, suspend, or remove an Artist account at its discretion, including for failed verification.',
    ],
  },
  {
    title: '3. Zero-Tolerance Content Policy',
    paragraphs: [
      'Juvi has zero tolerance for objectionable content or abusive behavior anywhere in the app — including reels, profile photos and portfolios, chat messages, reviews, and any other content you post or send ("User Content").',
      'The following are never permitted, under any circumstances:',
      '• Harassment, bullying, threats, or targeted abuse of another person\n• Hate speech, or content that attacks or demeans people based on race, ethnicity, religion, gender, sexual orientation, disability, or similar characteristics\n• Nudity or sexually explicit content\n• Violence, graphic, or gratuitously disturbing content\n• Spam, scams, or fraudulent content\n• Content that is illegal, or that promotes or facilitates illegal activity\n• Infringement of another person\'s intellectual property or privacy',
      'This policy applies to all users equally, in every part of the app, at all times — there is no exception for "artistic" framing, captions, or private messages.',
    ],
  },
  {
    title: '4. Reporting & Enforcement',
    paragraphs: [
      'Every reel, profile, and user in Juvi can be reported directly from within the app, and any user can block another user to immediately stop seeing their content and prevent further contact. These tools are available at all times, not just after something goes wrong.',
      'Juvi reviews reports and acts on confirmed violations of Section 3. Depending on severity, this can include removing the specific content, issuing a warning, temporarily suspending the account, or permanently terminating it — without a refund of any fees already incurred. Juvi may also remove content or take action proactively, without a user report, if it becomes aware of a violation.',
      'If you see content or behavior that violates this policy, report it in the app right away. We take every report seriously and aim to review it promptly.',
    ],
  },
  {
    title: '5. Our Right to Remove Content & Suspend Accounts',
    paragraphs: [
      'Juvi may remove or restrict access to any User Content, and may suspend or permanently terminate any account, at its sole discretion — with or without prior notice — if it reasonably believes this policy, these Terms, or the law has been violated.',
      'Termination for a policy violation does not entitle the user to a refund of subscription fees, service fees, or amounts already paid to an Artist for completed services.',
    ],
  },
  {
    title: '6. Bookings & Payments',
    paragraphs: [
      'When you book a service through Juvi, you are entering into an arrangement with an independent Artist for real-world beauty or wellness services. Prices, service scope, and appointment details are set at the time of booking.',
      'Payments are processed through Paytm. Depending on the booking, Juvi may collect an advance payment at booking confirmation and the remaining balance after the service is completed. You authorize Juvi to facilitate these charges to your chosen payment method via Paytm on behalf of the Artist.',
      'Cancellation terms and any applicable cancellation fees are shown at the time you cancel a booking, in-app, before you confirm the cancellation.',
    ],
  },
  {
    title: '7. Account Deletion',
    paragraphs: [
      'You can permanently delete your account at any time from Settings → Delete Account. This immediately and permanently removes your account and associated data from Juvi\'s systems and cannot be undone.',
      'Account deletion may be temporarily blocked if you have active bookings or an unsettled Artist payout — you\'ll be told exactly what needs to be resolved first.',
    ],
  },
  {
    title: '8. Intellectual Property',
    paragraphs: [
      'You retain ownership of the content you post (such as reels and portfolio photos), but by posting it you grant Juvi a non-exclusive, worldwide, royalty-free license to host, store, display, and distribute it within the app for the purpose of operating the Service. This license ends when you delete the content or your account, except where a copy is retained for a limited time as required for legal, safety, or moderation records.',
      'The Juvi name, logo, and app are the property of Juvi and may not be used without permission.',
    ],
  },
  {
    title: '9. Disclaimers & Limitation of Liability',
    paragraphs: [
      'Juvi provides the app "as is." Artists are independent providers, not employees or agents of Juvi, and Juvi does not guarantee the quality, safety, or outcome of any service booked through the app.',
      'To the maximum extent permitted by law, Juvi is not liable for indirect, incidental, or consequential damages arising from your use of the app or a service booked through it. Juvi\'s total liability for any claim relating to the Service is limited to the amount you paid to Juvi in the six months before the claim arose.',
    ],
  },
  {
    title: '10. Governing Law',
    paragraphs: [
      'These Terms are governed by the laws of India. Any dispute arising from these Terms or your use of Juvi is subject to the exclusive jurisdiction of the courts of India.',
    ],
  },
  {
    title: '11. Changes to These Terms',
    paragraphs: [
      'Juvi may update these Terms from time to time. Continued use of the app after an update means you accept the revised Terms. Material changes will be reflected by updating the "last updated" date above.',
    ],
  },
  {
    title: '12. Contact',
    paragraphs: [
      'Questions about these Terms, or reports that need a human, can be sent to support@juviapp.com.',
    ],
  },
];

export const PRIVACY_SECTIONS: Section[] = [
  {
    title: '1. Information We Collect',
    paragraphs: [
      'We collect information you provide directly — such as your name, email, phone number, city, profile photo, and payment method — plus content you post (reels, portfolio images) and information generated by using the app, such as bookings, messages, and device location (only when you grant permission, used to show nearby artists).',
    ],
  },
  {
    title: '2. How We Use Information',
    paragraphs: [
      'We use this information to operate the marketplace: to create and secure your account, process bookings and payments, show you relevant nearby artists, enable messaging between customers and artists, respond to support requests, and enforce the Zero-Tolerance Content Policy described in the Terms of Service above.',
    ],
  },
  {
    title: '3. Sharing of Information',
    paragraphs: [
      'We share the minimum necessary information with service providers who help us run Juvi — for example, Paytm for payment processing, and cloud hosting/storage providers. We do not sell your personal information.',
      'When you book a service, your name and contact details necessary to complete the appointment are shared with the Artist you booked, and vice versa.',
    ],
  },
  {
    title: '4. Your Choices',
    paragraphs: [
      'You can review and edit your profile information in-app at any time, control location and notification permissions from your device settings, and permanently delete your account and data from Settings → Delete Account.',
    ],
  },
];
