export interface LegalSection {
  heading: string;
  body: string;
}

export interface LegalDoc {
  title: string;
  updated: string;
  sections: LegalSection[];
}

/**
 * Legal & policy content — edit here, not in the page components.
 * Kept in a structured config so updates don't touch UI code.
 */
export const legalDocs = {
  privacy: {
    title: 'Privacy Policy',
    updated: 'August 2026',
    sections: [
      {
        heading: 'Introduction',
        body: 'Navo Live ("we", "us", "our") respects your privacy. This policy explains what information we collect when you use our live-streaming platform and how we use, protect, and share it.',
      },
      {
        heading: 'Information We Collect',
        body: 'We collect the phone number you register with, your nickname and avatar, your profile statistics, live-stream session data, chat messages, transactions, and usage analytics. With your permission, we access your microphone and camera only while you are in a live stream or call.',
      },
      {
        heading: 'How We Use Your Information',
        body: 'Your information is used to operate the platform: authenticating your account, powering live streams and calls, processing virtual-currency transactions, delivering notifications, showing follow and gift activity, and improving our services.',
      },
      {
        heading: 'Sharing of Information',
        body: 'We do not sell your personal information. Public profile details (nickname, avatar, level, live status) are visible to other users as part of the product. We share data with service providers such as Firebase, Agora, and Cloudinary solely to deliver authentication, real-time media, and storage.',
      },
      {
        heading: 'Data Retention',
        body: 'We retain your data while your account is active. When you delete your account, we permanently remove your profile, streams, chats, notifications, and owned content, and anonymize transaction records for audit purposes.',
      },
      {
        heading: 'Your Rights',
        body: 'You may request a copy of your data, correct your profile, or delete your account at any time from Settings. For assistance, contact us through the in-app Contact Us channel.',
      },
      {
        heading: 'Contact',
        body: 'Questions about this policy can be sent to us through the Contact Us option in your profile, or by messaging an administrator in the app.',
      },
    ],
  } as LegalDoc,

  guidelines: {
    title: 'Community Guidelines',
    updated: 'August 2026',
    sections: [
      {
        heading: 'Respect Everyone',
        body: 'Treat every user with respect. Harassment, hate speech, bullying, doxxing, and targeted abuse are not tolerated and will result in moderation action.',
      },
      {
        heading: 'No Inappropriate Content',
        body: 'Sexually explicit material, nudity, graphic violence, illegal activity, and content promoting self-harm are strictly prohibited in live streams, profiles, moments, and messages.',
      },
      {
        heading: 'No Fraud or Impersonation',
        body: 'Do not impersonate other users, staff, or brands. Do not attempt to manipulate the platform, its currency systems, or other users with fake offers or scams.',
      },
      {
        heading: 'Live Streaming Conduct',
        body: 'Only stream content you have the right to share. Do not stream other people without their consent, do not broadcast copyrighted material, and do not use the live feature to evade bans or platform rules.',
      },
      {
        heading: 'Transactions and Currency',
        body: 'Virtual currency purchases and sales must follow the platform rules. Attempting chargebacks, payment fraud, or exploiting system errors violates these guidelines.',
      },
      {
        heading: 'Reporting Violations',
        body: 'If you see a violation, use the Report option on profiles, streams, moments, or messages. Reports are reviewed by our moderation team, and action may include warnings, content removal, or account suspension.',
      },
      {
        heading: 'Changes',
        body: 'We may update these guidelines as the platform evolves. Continued use of the app after changes means you accept the updated guidelines.',
      },
    ],
  } as LegalDoc,

  terms: {
    title: 'Terms & Conditions',
    updated: 'August 2026',
    sections: [
      {
        heading: 'Acceptance of Terms',
        body: 'By creating an account or using Navo Live, you agree to these Terms & Conditions and our Community Guidelines. If you do not agree, please do not use the platform.',
      },
      {
        heading: 'Eligibility',
        body: 'You must be at least 13 years old (or the minimum age in your country) to use Navo Live. You are responsible for maintaining the confidentiality of your account credentials.',
      },
      {
        heading: 'Account Responsibilities',
        body: 'You are responsible for all activity under your account. You must provide accurate information and keep your phone number and password secure. Notify us immediately of unauthorized use.',
      },
      {
        heading: 'Virtual Currency',
        body: 'Diamonds and coins are virtual items with no monetary value outside the platform. They are non-refundable, non-transferable between users except through platform features (gifts), and subject to our moderation rules.',
      },
      {
        heading: 'User Content',
        body: 'You retain ownership of content you create, but you grant us a worldwide, non-exclusive license to host, display, and distribute it within the platform. You confirm you have the rights to the content you share.',
      },
      {
        heading: 'Acceptable Use',
        body: 'You agree not to misuse the platform, attempt to breach security, reverse-engineer the service, spam other users, or interfere with other users\' experience. Violations may lead to account termination.',
      },
      {
        heading: 'Termination',
        body: 'We may suspend or terminate accounts that violate these terms, applicable laws, or platform integrity. You may delete your account at any time from Settings.',
      },
      {
        heading: 'Disclaimers and Liability',
        body: 'The platform is provided "as is" without warranties. To the maximum extent permitted by law, we are not liable for indirect or consequential damages arising from your use of the service.',
      },
      {
        heading: 'Governing Law',
        body: 'These terms are governed by the applicable laws of the jurisdiction where the service operator is established. Any disputes shall be resolved in the competent courts of that jurisdiction.',
      },
    ],
  } as LegalDoc,

  about: {
    title: 'About Us',
    updated: 'August 2026',
    sections: [
      {
        heading: 'Welcome to Navo Live',
        body: 'Navo Live is a live-streaming and social platform that lets creators go live, connect with their audience, send gifts, chat, and share moments in real time. Our goal is a safe, vibrant community where everyone can create, discover, and connect.',
      },
      {
        heading: 'What We Offer',
        body: 'Go-live streaming with video, voice, and interactive games, one-to-one audio and video calls, direct messaging, a virtual economy of diamonds and coins, live-stream gifts and reactions, and a Moments feed for sharing images and videos with your followers.',
      },
      {
        heading: 'Our Values',
        body: 'We prioritize creator empowerment, community safety, and fair play. Live content is moderated, users can report violations, and our virtual-currency systems are designed to be transparent and auditable.',
      },
      {
        heading: 'Contact Us',
        body: 'For help, feedback, or reporting an issue, use the Contact Us option in your profile, or reach out to an administrator through the app. We are always happy to hear from you.',
      },
    ],
  } as LegalDoc,
};
