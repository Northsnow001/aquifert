/** Fill these in once registration is complete; every document reads them from here. */
export const COMPANY_NUMBER = "[●]";
export const REGISTERED_OFFICE = "[●]";

export const LEGAL_UPDATED = "October 2026";
export const LEGAL_CONTACT = "Aquifert Ltd · London · enquiry@aquifert.com";

const ENTITY = `Aquifert Ltd (company number ${COMPANY_NUMBER}), whose registered office is at ${REGISTERED_OFFICE}, United Kingdom (“Aquifert”, “we”, “us”, “our”)`;

/** A string is a paragraph; an array of strings is a bulleted list. */
export type LegalBlock = string | string[];

export type LegalSection = { id: string; title: string; body: LegalBlock[] };

export type LegalDoc = {
  slug: string;
  title: string;
  summary: string;
  sections: LegalSection[];
};

const section = (title: string, body: LegalBlock[], id?: string): LegalSection => ({
  id:
    id ??
    title
      .toLowerCase()
      .replace(/&/g, "and")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, ""),
  title,
  body,
});

export const LEGAL_DOCS: LegalDoc[] = [
  {
    slug: "terms-of-trading",
    title: "Terms & Conditions of Trading",
    summary: "The contractual terms that govern requests, quotations, orders and deliveries of fertilizer and related products traded through the Aquifert platform.",
    sections: [
      section("Who we are and what these terms cover", [
        `These Terms & Conditions of Trading (“Terms”) govern all sourcing requests, quotations, orders, contracts and deliveries of fertilizer and related products (“Products”) made through the Aquifert platform (the “Platform”), operated by ${ENTITY}.`,
        "These Terms apply to business customers only. By submitting a sourcing request, accepting a quotation, or placing an order through the Platform, you confirm that you act in the course of a business and accept these Terms. Separate Platform Terms of Use govern your general use of the website and software.",
      ]),
      section("The Aquifert model", [
        "Aquifert operates a governed B2B trading platform. Unless expressly stated otherwise in an order confirmation, Aquifert contracts with the buyer as principal seller of the Products and sources from vetted producers, traders and distributors (“Suppliers”). In certain identified transactions Aquifert may act as disclosed agent; where this is the case it will be stated on the quotation.",
        "Our operating principle is: the engine flags; a human clears. Automated systems screen counterparties, documents and transactions for compliance risk, but no transaction is released without review and clearance by a member of the Aquifert compliance or operations team.",
        "Supplier anonymity is fundamental to the Platform. Nothing that could reveal the identity of a Supplier is shared with a buyer — ever. Quotations, documents and communications are re-issued or redacted by Aquifert so that pricing, origin and documentation are disclosed without identifying the underlying Supplier.",
      ]),
      section("Membership and eligibility", [
        "Access to sourcing requests, quotations, ordering, insights and financing features requires an active paid membership, unless otherwise agreed in writing. Free (AQ1) accounts may access market information and other features as described on the Platform from time to time.",
        "All buyers and Suppliers are subject to onboarding checks, which may include company verification, know-your-customer (KYC), anti-money-laundering (AML), sanctions and credit screening. We may decline, suspend or terminate access where these checks are not satisfied.",
      ]),
      section("Requests, quotations and contract formation", [
        "A sourcing request submitted through the Platform is an invitation to treat, not an order. A quotation issued by Aquifert is an offer open for the validity period stated on it (or, if none, 48 hours). A binding contract is formed only when Aquifert issues an order confirmation following your acceptance of a quotation.",
        "The order confirmation, together with these Terms and any documents expressly referenced in it, forms the entire contract for that transaction. Your own standard terms are excluded.",
        "Quotations state the product, specification, quantity, packaging, price, currency, delivery terms (by reference to Incoterms® 2020), shipment or delivery window, and payment terms. Any variation must be agreed in writing by Aquifert.",
      ]),
      section("Price and payment", [
        "Prices are as stated on the order confirmation. Unless stated otherwise, prices are exclusive of VAT and any applicable duties, taxes, inspection fees or bank charges, which are payable by the buyer.",
        "Payment terms (including any deposit, letter of credit, documentary collection or open-account terms) are stated on the quotation and order confirmation. Time of payment is of the essence. We may charge interest on overdue sums at 4% per annum above the Bank of England base rate, accruing daily, together with reasonable recovery costs, in accordance with the Late Payment of Commercial Debts (Interest) Act 1998.",
        "Our Payment & Refund Policy applies to membership fees, invoicing, refunds and cancellations.",
      ]),
      section("Delivery, risk and title", [
        "Delivery is made on the Incoterm stated in the order confirmation, interpreted in accordance with Incoterms® 2020. Risk passes in accordance with that Incoterm.",
        "Title to Products passes on receipt of full payment in cleared funds. Until title passes, the buyer holds the Products as bailee, stores them identifiably, and grants Aquifert a right to recover them in the event of insolvency or non-payment.",
        "Delivery dates are estimates given in good faith. We will notify material delays and keep tracking information updated on the Platform.",
      ]),
      section("Quality, documents and claims", [
        "Products are supplied to the specification stated in the order confirmation. Independent inspection (e.g. SGS, Intertek or equivalent) may be included where stated, and the resulting certificates will be made available through the Platform’s document vault.",
        "Any claim for shortage, damage or non-conformity must be notified through the Platform (with photographs and inspection evidence where relevant) within 7 days of delivery for apparent defects, or within 30 days for latent defects, and in any event before the Products are resold, blended or applied.",
        "Our liability for a valid claim is limited, at our option, to replacement of the affected Products, a price reduction, or a refund of the price paid for the affected quantity.",
      ]),
      section("Compliance", [
        "Both parties shall comply with all applicable laws, including sanctions and export-control laws of the UK, the UN, the EU and the US, anti-bribery laws (including the Bribery Act 2010), and AML regulations.",
        "We may suspend or cancel any transaction, before or after contract formation, where our compliance screening identifies a sanctions, AML, fraud or other regulatory risk, or where continuing would breach applicable law. In such cases our liability is limited to refunding payments received for the affected Products.",
      ]),
      section("Liability", [
        "Nothing in these Terms excludes liability for death or personal injury caused by negligence, fraud, or any liability that cannot be excluded by law.",
        "Subject to that, we are not liable for loss of profit, loss of revenue, loss of business, loss of crops or yield, or any indirect or consequential loss. Our aggregate liability arising out of a transaction shall not exceed the price paid or payable for the Products giving rise to the claim.",
      ]),
      section("Force majeure", [
        "Neither party is liable for delay or failure caused by events beyond its reasonable control, including extreme weather, natural disaster, war, terrorism, port congestion or closure, strikes, export bans, government action, or failure of utilities or transport networks. The affected party must notify promptly and mitigate. If the event continues for more than 60 days, either party may cancel the affected transaction without liability (save for accrued rights).",
      ]),
      section("Governing law and disputes", [
        "These Terms and every contract formed under them are governed by the laws of England and Wales. The parties submit to the exclusive jurisdiction of the courts of England and Wales, save that Aquifert may seek interim or injunctive relief in any competent jurisdiction. The United Nations Convention on Contracts for the International Sale of Goods (CISG) does not apply.",
      ]),
    ],
  },
  {
    slug: "terms-of-use",
    title: "Platform Terms of Use",
    summary: "The rules for using the Aquifert website, applications, data and AI assistant, applying to every visitor and account holder.",
    sections: [
      section("Acceptance", [
        `These Terms of Use govern your access to and use of the Aquifert website, web application, data, tools and services (together, the “Platform”), operated by ${ENTITY}.`,
        "By accessing the Platform you accept these Terms of Use. If you use the Platform on behalf of a company, you confirm you are authorised to bind that company. Trading transactions are additionally governed by our Terms & Conditions of Trading, and paid features by our Payment & Refund Policy.",
      ]),
      section("Accounts", [
        "You must provide accurate registration information, keep your credentials confidential, and notify us immediately of any unauthorised use. You are responsible for all activity under your account. We recommend enabling any multi-factor authentication offered.",
        "Accounts are for the registered organisation. Sharing credentials between organisations or with unvetted third parties is prohibited.",
      ]),
      section("Acceptable use", [
        "You must not:",
        [
          "use the Platform for any unlawful purpose, or in breach of sanctions, export-control, AML or anti-bribery laws;",
          "attempt to identify, contact or circumvent a Supplier introduced through the Platform, or otherwise bypass Aquifert in respect of a transaction originated on the Platform;",
          "scrape, crawl, harvest or bulk-download Platform data except through an API or licence we have expressly granted;",
          "introduce malware, probe or test vulnerabilities, or interfere with the Platform’s operation or security;",
          "misrepresent your identity, authority, company status or the intended end-use of Products;",
          "use Platform data, prices or reports to build a competing product or service, or resell them without a licence;",
          "upload content that is unlawful, infringing, misleading or defamatory.",
        ],
      ]),
      section("Circumvention and non-circumvention", [
        "The value of the Platform depends on governed, anonymised introduction of counterparties. For 24 months following any introduction made through the Platform, you must not knowingly complete a transaction with the introduced counterparty other than through Aquifert, nor solicit the identity of an anonymised counterparty. Breach of this clause entitles Aquifert to liquidated damages equal to the margin or fee that would have applied to the circumvented transaction, without prejudice to other remedies.",
      ]),
      section(
        "Market data, reports and Aquibot (AI assistant)",
        [
          "Prices, telex reports, indices, calculators and analysis on the Platform are provided for information only. They do not constitute investment, agronomic, legal or tax advice, and are not an offer to trade. Market data may be delayed, estimated or derived from third-party sources and must be verified before reliance.",
          "Aquibot is an AI assistant. Its answers are generated from the Aquifert playbook and Platform data, may be incomplete or incorrect, and must not be relied upon as professional advice or as a binding commitment by Aquifert. Aquibot can make mistakes — check important figures. Queries Aquibot cannot resolve are escalated to our human team.",
          "You must not use Aquibot or any Platform output to make decisions that require regulatory clearance (e.g. sanctions determinations); such determinations are made by our compliance team under the principle: the engine flags; a human clears.",
        ],
        "market-data",
      ),
      section("Intellectual property", [
        "The Platform, its design, software, brand, reports, data compilations and content are owned by or licensed to Aquifert and protected by intellectual-property laws. We grant you a limited, non-exclusive, non-transferable, revocable licence to use the Platform for your internal business purposes in accordance with these terms.",
        "You retain ownership of data you submit. You grant us a licence to use it to operate the Platform, perform contracts, meet legal obligations and — in aggregated, anonymised form only — improve our market intelligence products.",
      ]),
      section("Availability and changes", [
        "We aim for high availability but do not warrant uninterrupted operation. We may suspend the Platform for maintenance, security or legal reasons, and may update these Terms of Use with reasonable notice (material changes notified by email or in-app notice). Continued use after the effective date constitutes acceptance.",
      ]),
      section("Liability", [
        "The Platform and its content are provided “as is”. Nothing in these Terms of Use excludes liability for death or personal injury caused by negligence, fraud, or liability that cannot be excluded by law. Subject to that, we exclude all implied warranties to the fullest extent permitted, and we are not liable for loss of profit, business, data or goodwill, or indirect or consequential loss. Our aggregate liability under these Terms of Use is limited to the fees you paid us in the 12 months preceding the claim, or £1,000 if greater.",
      ]),
      section("Governing law", ["These Terms of Use are governed by the laws of England and Wales, and the courts of England and Wales have exclusive jurisdiction."]),
      section("Contact", ["Questions about these Terms of Use: enquiry@aquifert.com."]),
    ],
  },
  {
    slug: "privacy",
    title: "Privacy Policy",
    summary: "What personal data we collect, why, how long we keep it, who we share it with, and the rights you have under UK data protection law.",
    sections: [
      section("Who is responsible for your data", [
        `The data controller for personal data processed through the Platform is ${ENTITY}.`,
        "You can contact our data protection lead at privacy@aquifert.com. See our Data Protection & GDPR page for further detail on our compliance programme.",
      ]),
      section("The data we collect", [
        [
          "Identity and contact data: name, job title, work email, phone number, company name and role.",
          "Business and verification data: company registration details, VAT number, directors/beneficial owners (for KYC/AML screening), trade references.",
          "Account and usage data: login events, pages and features used, searches, saved preferences, language and cookie choices.",
          "Transaction data: sourcing requests, quotations, orders, invoices, payment status, delivery and claims history.",
          "Communications: messages with our team, Aquibot conversations, support tickets, call records and meeting notes.",
          "Technical data: IP address, device and browser type, approximate location derived from IP, and telemetry/cookie identifiers.",
          "Payment data: payment method details are processed by our payment providers; we do not store full card numbers.",
        ],
      ]),
      section("Why we use it and our lawful bases", [
        "Under UK GDPR we rely on the following lawful bases:",
        [
          "Contract: to operate your account, provide membership features, process transactions, deliver Products and provide support.",
          "Legal obligation: KYC/AML screening, sanctions checks, tax and accounting records, and regulatory reporting.",
          "Legitimate interests: platform security and fraud prevention, service improvement, anonymised market analytics, and B2B marketing to existing customers (balanced against your rights).",
          "Consent: optional marketing communications and non-essential cookies. You may withdraw consent at any time.",
        ],
      ]),
      section("Who we share it with", [
        "We share personal data only as needed, under contract, and in line with data protection law:",
        [
          "Service providers (processors): hosting and database, payment processing, email delivery, customer support tooling, and analytics — each bound by data processing agreements.",
          "Counterparties and logistics providers: only the information needed to perform a transaction — and never information that would reveal a Supplier’s identity to a buyer, in line with our anonymity principle.",
          "Authorities and regulators: where required by law, sanctions regimes, court order or to protect our legal rights.",
          "Professional advisers and, in the event of a merger or acquisition, prospective buyers under confidentiality.",
        ],
      ]),
      section("International transfers", [
        "Some providers process data outside the UK. Where they do, we rely on UK adequacy regulations, the UK International Data Transfer Agreement (IDTA) or the UK addendum to EU Standard Contractual Clauses, with supplementary measures where required.",
      ]),
      section("How long we keep data", [
        [
          "Account data: for the life of the account and up to 24 months after closure.",
          "Transaction, invoice and tax records: 6 years from the end of the relevant financial year (legal requirement).",
          "KYC/AML records: 5 years after the end of the business relationship (legal requirement).",
          "Support and Aquibot conversations: up to 24 months, then deleted or anonymised.",
          "Marketing data: until you unsubscribe or object.",
        ],
      ]),
      section("Security", [
        "We apply technical and organisational measures including encryption in transit and at rest, role-based access control, audit logging, segregated environments, and staff confidentiality obligations. No system is perfectly secure; if a breach risks your rights we will notify you and the ICO as required by law.",
      ]),
      section("Your rights", [
        "You have the right to:",
        [
          "access a copy of your personal data;",
          "rectify inaccurate or incomplete data;",
          "erase your data (subject to legal retention duties);",
          "restrict or object to processing, including objection to direct marketing at any time;",
          "data portability for data processed by automated means under contract or consent;",
          "withdraw consent where processing is based on consent;",
          "not be subject to decisions based solely on automated processing that produce legal or similarly significant effects — our compliance decisions always involve human review.",
        ],
      ]),
      section("Exercising your rights and complaints", [
        "Email privacy@aquifert.com. We respond within one month. You also have the right to complain to the UK Information Commissioner’s Office (ICO), Wycliffe House, Water Lane, Wilmslow, Cheshire SK9 5AF, ico.org.uk — though we would welcome the chance to resolve your concern first.",
      ]),
      section("Cookies", [
        "We use strictly necessary cookies to operate the Platform and, with your consent via the cookie banner or Cookie Preferences, analytics cookies. You can change your choices at any time via Cookie Preferences in the site footer.",
      ]),
      section("Changes", ["We may update this policy; material changes will be notified by email or in-app notice. The “last updated” date above shows the current version."]),
    ],
  },
  {
    slug: "data-protection",
    title: "Data Protection & GDPR",
    summary: "Our UK GDPR compliance programme: governance, records of processing, DPIAs, sub-processors, international transfers, breach handling and how automated screening stays human-supervised.",
    sections: [
      section("Our commitment", [
        `Aquifert processes personal data principally of business contacts, but we apply the UK GDPR and the Data Protection Act 2018 in full. The controller is ${ENTITY}.`,
        "Data protection is designed into the Platform rather than added on: data minimisation, purpose limitation, role-based access and audit logging are built into how the product works.",
      ]),
      section("Governance", [
        [
          "Data protection lead: reachable at privacy@aquifert.com (DPO function).",
          "Records of processing activities (ROPA) maintained under Article 30 UK GDPR and reviewed at least annually.",
          "Staff confidentiality obligations and data protection training on induction and annually.",
          "Data protection impact assessments (DPIAs) conducted for higher-risk processing, including AI-assisted features and compliance screening, before launch and on material change.",
          "A standing privacy-by-design checkpoint in our engineering review process.",
        ],
      ]),
      section("Human oversight of automated screening", [
        "Our compliance and matching systems use automated screening (sanctions lists, document checks, risk scoring). No decision with legal or similarly significant effect is made solely by automated means: the engine flags; a human clears. Every flagged transaction or account is reviewed by a trained member of our compliance or operations team, and you may request human review of any decision affecting you by emailing privacy@aquifert.com.",
      ]),
      section("Counterparty anonymity and data minimisation", [
        "A core data-minimisation control is structural: the Platform is architected so that nothing that could reveal a Supplier reaches a buyer — ever. Quotations, shipping documents and certificates are re-issued or redacted before a buyer can see them. This limits the personal and commercial data any counterparty ever receives to the minimum needed to perform the contract.",
      ]),
      section("Sub-processors", [
        "Categories of sub-processors we engage (each under a written data processing agreement with Article 28 terms):",
        [
          "Cloud hosting and managed database (EU/UK regions where available);",
          "Payment processing and billing;",
          "Transactional email and customer communications;",
          "Customer support and ticketing;",
          "Product analytics (subject to cookie consent);",
          "KYC/AML and sanctions screening providers.",
        ],
      ]),
      section("International transfers", [
        "Where personal data is transferred outside the UK, we rely on UK adequacy regulations, the UK IDTA, or the UK addendum to EU Standard Contractual Clauses, and assess transfer risk with supplementary measures (encryption, access controls) where required.",
      ]),
      section("Data subject requests", [
        "We handle access, rectification, erasure, restriction, objection and portability requests free of charge and within one month of receipt (extendable by two further months for complex requests, with notice). Requests: privacy@aquifert.com. We may need to verify your identity first.",
      ]),
      section("Personal data breaches", [
        "We maintain a breach response procedure. Breaches likely to risk individuals’ rights and freedoms are reported to the ICO within 72 hours of becoming aware, and affected individuals are notified without undue delay where there is a high risk.",
      ]),
      section("Retention", ["Retention periods are set out in our Privacy Policy (section 6). Data is deleted or irreversibly anonymised at the end of its retention period, subject to legal holds."]),
      section("Contact", ["Data protection lead, Aquifert Ltd — privacy@aquifert.com. Supervisory authority: UK Information Commissioner’s Office (ico.org.uk)."]),
    ],
  },
  {
    slug: "payments-and-refunds",
    title: "Payment & Refund Policy",
    summary: "How membership fees, transaction margins and invoices are billed; payment methods; late payment; cancellations, cooling-off and refunds.",
    sections: [
      section("What this policy covers", [
        `This policy applies to all payments made to ${ENTITY}, including membership subscriptions, transaction margins/commissions, report and data-licence fees, and any other chargeable services on the Platform.`,
      ]),
      section("Membership subscriptions", [
        [
          "Billing cycle: monthly or annually in advance, as selected at checkout or in your membership agreement.",
          "Auto-renewal: memberships renew automatically unless cancelled before the renewal date (see section 5).",
          "Free plan (AQ1): no charge; paid features are unlocked only after a successful payment.",
          "Price changes: we give at least 30 days’ notice of subscription price changes; the new price applies from your next renewal after the notice period.",
          "VAT: prices are exclusive of VAT unless stated; VAT is added at the prevailing UK rate where applicable. A VAT invoice is issued for every payment.",
        ],
      ]),
      section("Transaction payments", [
        "Payment terms for Product purchases (deposit, letter of credit, documentary collection or open account) are stated on each quotation and order confirmation. Unless otherwise agreed, invoices are payable within the stated terms in the invoice currency, free of bank charges.",
        "Invoices are numbered sequentially (format INV-YYYY-NNNNN) and available in the Billing area of the Platform. Please quote the invoice number on all payments.",
      ]),
      section("Payment methods and security", [
        "We accept bank transfer and the card/account payment methods shown at checkout. Card payments are processed by PCI-DSS-compliant providers; we never see or store full card numbers. For trade transactions we may require payment to a designated Aquifert client account notified on the invoice — always verify bank details by contacting us on a known number before paying to new account details, as we will never notify bank-detail changes by email alone.",
      ]),
      section("Cancellation", [
        [
          "Monthly membership: cancel any time in the app or by emailing billing@aquifert.com; cancellation takes effect at the end of the current billing month. No partial-month refunds except as set out in section 6.",
          "Annual membership: cancel before the renewal date to avoid the next year’s charge. Annual fees are otherwise non-refundable except as set out in section 6.",
          "Orders: a confirmed order may only be cancelled with Aquifert’s written agreement and may incur costs already committed (e.g. product, freight, finance or hedging costs), which will be evidenced and invoiced.",
        ],
      ]),
      section("Refunds", [
        "Approved refunds are processed within 10 business days to the original payment method.",
        [
          "Statutory rights: this policy does not affect any rights that cannot be excluded by law. The Platform is B2B; consumer cancellation rights generally do not apply to business customers.",
          "Goodwill cooling-off: new subscribers may request a full refund within 14 days of first subscribing, provided no chargeable Platform service (e.g. a sourcing request executed, report downloaded under licence, or quotation issued) has been used in that period.",
          "Service failure: if a paid feature is materially unavailable for more than 72 consecutive hours (excluding scheduled maintenance notified in advance), you may claim a pro-rata credit or refund for the affected period as your sole remedy.",
          "Duplicate or erroneous charges: refunded in full to the original payment method once verified.",
          "Transaction refunds (product claims) are handled under the Terms & Conditions of Trading, section 7.",
        ],
      ]),
      section("Late payment, disputes and chargebacks", [
        "Overdue amounts bear interest under the Late Payment of Commercial Debts (Interest) Act 1998 at 4% above the Bank of England base rate plus reasonable recovery costs. We may suspend accounts and withhold deliveries while sums are overdue.",
        "If you dispute an invoice, notify billing@aquifert.com within 14 days of the invoice date, paying any undisputed portion. Initiating a card chargeback for a valid charge may result in account suspension; please contact us first so we can resolve the issue.",
      ]),
      section("Currency and tax", [
        "Subscription fees are charged in GBP unless otherwise stated. Transaction currencies are stated on each quotation. You are responsible for any taxes, duties or withholdings applicable in your jurisdiction, other than taxes on Aquifert’s own income.",
      ]),
      section("Contact", ["Billing queries: billing@aquifert.com. General: enquiry@aquifert.com."]),
    ],
  },
];

export const legalDoc = (slug: string | undefined) => LEGAL_DOCS.find((doc) => doc.slug === slug);

export const LEGAL_LINKS = [
  { to: "/legal/terms-of-trading", label: "Terms of Trading" },
  { to: "/legal/terms-of-use", label: "Terms of Use" },
  { to: "/legal/privacy", label: "Privacy Policy" },
  { to: "/legal/privacy#cookies", label: "Cookie Policy" },
  { to: "/legal/data-protection", label: "Data Protection & GDPR" },
  { to: "/legal/payments-and-refunds", label: "Payment & Refunds" },
  { to: "/legal/terms-of-use#market-data", label: "Disclaimer" },
];
