import type { LegalContent } from "@/app/en/components/legal-page";

const LAST_UPDATED = "July 11, 2026";
const COMPANY = "withSolver";
const CONTACT_EMAIL = "destek@withsolver.com";

export const PRIVACY: LegalContent = {
  title: "Privacy Policy",
  intro: `At ${COMPANY}, we care about the privacy of your personal data. This policy explains what data we collect when you use Solver AI WordPress Builder, how we process it and what your rights are.`,
  updatedAt: LAST_UPDATED,
  sections: [
    {
      heading: "Data We Collect",
      paragraphs: [
        "To provide our service, we collect certain data from you and from your usage.",
      ],
      bullets: [
        "Account information: name, email address and password (passwords are stored irreversibly hashed).",
        "Content data: the sites you create, the prompts you send and the generated WordPress content.",
        "Usage data: IP address, browser type, session and interaction logs.",
      ],
    },
    {
      heading: "How We Use Your Data",
      bullets: [
        "To provide the service, build and host your sites.",
        "To manage your account and respond to your support requests.",
        "To measure service quality, ensure security and prevent abuse.",
        "To fulfil our legal obligations.",
      ],
    },
    {
      heading: "AI Processing",
      paragraphs: [
        "The prompts you send may be transmitted to AI providers in order to generate WordPress content and images. This data is processed only to fulfil your request and is not shared with third parties for advertising purposes.",
      ],
    },
    {
      heading: "Sharing of Data",
      paragraphs: [
        "We do not sell your data. We only share it with hosting, infrastructure and AI service providers that are necessary to deliver the service, under contractual confidentiality obligations. Data may be shared with competent authorities where legally required.",
      ],
    },
    {
      heading: "Data Security and Retention",
      paragraphs: [
        "We apply reasonable technical and administrative measures to protect your data against unauthorized access. We retain your data as long as it is necessary to provide the service and throughout the legal retention periods.",
      ],
    },
    {
      heading: "Your Rights",
      paragraphs: [
        `You have the right to access, correct, delete and object to the processing of your personal data. You can send your requests to ${CONTACT_EMAIL}.`,
      ],
    },
    {
      heading: "Contact",
      paragraphs: [
        `For questions about our privacy practices, you can reach us at ${CONTACT_EMAIL}.`,
      ],
    },
  ],
};

export const TERMS: LegalContent = {
  title: "Terms of Service",
  intro: `By using Solver AI WordPress Builder you accept the following terms. Please read them carefully.`,
  updatedAt: LAST_UPDATED,
  sections: [
    {
      heading: "Scope of the Service",
      paragraphs: [
        `${COMPANY} provides a service that lets you create, edit and publish WordPress sites using AI. The features of the service may be improved or changed from time to time.`,
      ],
    },
    {
      heading: "Account Responsibility",
      bullets: [
        "You are responsible for the confidentiality of your account details and for all activity that takes place under your account.",
        "You are required to provide accurate and up-to-date information.",
        "You must notify us immediately if you notice any unauthorized use.",
      ],
    },
    {
      heading: "Acceptable Use",
      paragraphs: [
        "You may not use the service to generate content that is unlawful, harmful, misleading or that infringes the rights of third parties.",
      ],
      bullets: [
        "Generating illegal, hateful or copyright-infringing content is prohibited.",
        "Behavior that threatens the security of the system, overloads it or abuses it is prohibited.",
        "You may not use the service for spam or fraud.",
      ],
    },
    {
      heading: "Content and Intellectual Property",
      paragraphs: [
        "The sites and content you create belong to you. The software, brand and design elements of the service belong to withSolver. You are responsible for the legality of the content you produce through the service.",
      ],
    },
    {
      heading: "Payment and Subscription",
      paragraphs: [
        "For paid plans, fees are charged according to the terms specified at the time of purchase. Your withdrawal and refund rights arising from applicable consumer legislation are reserved.",
      ],
    },
    {
      heading: "Limitation of Liability",
      paragraphs: [
        `The service is provided "as is". To the extent permitted by applicable law, ${COMPANY} cannot be held liable for indirect damages or for interruptions of the service.`,
      ],
    },
    {
      heading: "Termination",
      paragraphs: [
        "We reserve the right to suspend or terminate your account if you violate these terms. You may close your account at any time.",
      ],
    },
    {
      heading: "Governing Law",
      paragraphs: [
        "These terms are governed by the laws of the Republic of Türkiye. Turkish courts and enforcement offices have jurisdiction over disputes.",
      ],
    },
  ],
};

export const COOKIES: LegalContent = {
  title: "Cookie Policy",
  intro: `This policy explains how we use cookies and similar technologies on Solver AI WordPress Builder.`,
  updatedAt: LAST_UPDATED,
  sections: [
    {
      heading: "What Is a Cookie?",
      paragraphs: [
        "Cookies are small text files stored in your browser when you visit the site. They are used to maintain your session and improve your experience.",
      ],
    },
    {
      heading: "Types of Cookies We Use",
      bullets: [
        "Essential cookies: required for core functions such as sign-in and security.",
        "Preference cookies: remember your language and interface preferences.",
        "Analytics cookies: help us understand how you use the service and improve it.",
      ],
    },
    {
      heading: "Managing Cookies",
      paragraphs: [
        "You can delete or block cookies from your browser settings. However, disabling essential cookies may cause some parts of the service to stop working.",
      ],
    },
    {
      heading: "Contact",
      paragraphs: [
        `For questions about our use of cookies, you can write to ${CONTACT_EMAIL}.`,
      ],
    },
  ],
};

export const DATA_PROTECTION: LegalContent = {
  title: "Data Protection Notice",
  intro: `This notice, prepared by ${COMPANY} as the data controller, describes how your personal data is processed, including under the Turkish Personal Data Protection Law (KVKK, Law No. 6698).`,
  updatedAt: LAST_UPDATED,
  sections: [
    {
      heading: "Data Controller",
      paragraphs: [
        `Your personal data is processed by the data controller ${COMPANY} within the scope described below.`,
      ],
    },
    {
      heading: "Personal Data Processed",
      bullets: [
        "Identity and contact data: name, email address.",
        "Transaction security data: IP address, session and log records.",
        "Customer transaction data: the sites you create and the requests you send.",
      ],
    },
    {
      heading: "Purposes of Processing",
      bullets: [
        "Providing the service and performing the contract.",
        "Account management and customer support.",
        "Carrying out information security processes.",
        "Fulfilling legal obligations.",
      ],
    },
    {
      heading: "Legal Grounds",
      paragraphs: [
        "Your personal data is processed on the legal grounds of the establishment and performance of the contract, the fulfilment of legal obligations and legitimate interest.",
      ],
    },
    {
      heading: "Transfer of Data",
      paragraphs: [
        "Your data may be transferred to the hosting and infrastructure providers required to deliver the service, within the framework of the security measures required by applicable data protection law.",
      ],
    },
    {
      heading: "Your Rights",
      bullets: [
        "To learn whether your personal data is being processed.",
        "To request information if it has been processed.",
        "To request correction if it has been processed incompletely or incorrectly.",
        "To request its deletion or destruction under the conditions set out in the law.",
        "To request compensation for damages if you suffer loss due to unlawful processing.",
      ],
    },
    {
      heading: "Applications",
      paragraphs: [
        `You can send your requests regarding data protection to ${CONTACT_EMAIL}. Your requests will be resolved as soon as possible and within 30 days at the latest.`,
      ],
    },
  ],
};
