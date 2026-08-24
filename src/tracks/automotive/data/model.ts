import type { Channel, Scenario, Zone } from "../types";

export const BASELINE_READING = 3.64;

export const channels: Channel[] = [
  {
    id: "regulation",
    shortLabel: "Rules",
    label: "Regulation & road access",
    weight: 18,
    baseline: 4,
    rationale: "Can an approved system move from a pilot to lawful operation across Member States?",
    evidenceSupports: "EU type-approval rules and early national operating frameworks provide a legal and technical foundation.",
    currentConstraint: "Road access and operating rules remain fragmented across Member States.",
    nextEvidence: "Repeated operational access in several Member States through documented and predictable authorisation processes.",
    markers: [
      {
        value: 4,
        label: "EU technical foundation",
        description: "EU type approval and early national frameworks provide a foundation, while road access remains fragmented.",
        kind: "threshold"
      },
      {
        value: 7,
        label: "Repeatable road access",
        description: "Authorisation supports recurring operation across several Member States.",
        kind: "operational"
      },
      {
        value: 9,
        label: "Integrated European pathway",
        description: "Interoperable approvals support predictable cross-border operation.",
        kind: "scale"
      }
    ]
  },
  {
    id: "deployment",
    shortLabel: "Scale",
    label: "Deployment & scalability",
    weight: 20,
    baseline: 3,
    rationale: "Are services progressing from small pilots to repeatable fleets, cities and corridors?",
    evidenceSupports: "Geofenced fleet operations and announced public-transport pilots demonstrate credible early use cases.",
    currentConstraint: "Verified European activity remains concentrated in pilots, planned launches and locally bounded services.",
    nextEvidence: "Multi-site services reporting fleet size, duration, service quality and operational outcomes through shared measures.",
    markers: [
      {
        value: 4,
        label: "Repeatable pilots",
        description: "Comparable pilots recur beyond one-off demonstrations.",
        kind: "threshold"
      },
      {
        value: 6,
        label: "Multi-site deployment",
        description: "Several sites operate comparable services with shared performance measures.",
        kind: "operational"
      },
      {
        value: 8,
        label: "European deployment scale",
        description: "Fleets, cities or corridors sustain deployment across several markets.",
        kind: "scale"
      }
    ]
  },
  {
    id: "data",
    shortLabel: "Data",
    label: "Data, validation & safety",
    weight: 17,
    baseline: 3,
    rationale: "Can lawful data reuse, simulation and safety evidence create a shared learning loop?",
    evidenceSupports: "ISO 21448 and related safety-assurance standards provide a foundation for validation practice.",
    currentConstraint: "Lawful data reuse and reusable evidence loops across deployments remain limited.",
    nextEvidence: "Documented reuse of scenario data, validation assets and safety-case evidence across deployments and authorities.",
    markers: [
      {
        value: 4,
        label: "Reusable validation assets",
        description: "Scenario data, validation assets and safety evidence begin to support reuse.",
        kind: "threshold"
      },
      {
        value: 6,
        label: "Shared European evidence loop",
        description: "Deployments reuse scenario data, validation assets and safety-case evidence.",
        kind: "operational"
      },
      {
        value: 8,
        label: "Continuous learning infrastructure",
        description: "Cross-border deployments continuously improve shared safety evidence.",
        kind: "scale"
      }
    ]
  },
  {
    id: "technology",
    shortLabel: "Tech",
    label: "Technology & integration",
    weight: 13,
    baseline: 5,
    rationale: "Are the software, compute, sensors and integration layers ready for European deployment?",
    evidenceSupports: "European manufacturers and suppliers account for a large share of global automotive R&D, providing a strong technical capability base.",
    currentConstraint: "Gaps remain in software, AI, compute integration and software-led skills.",
    nextEvidence: "A production-grade integrated stack demonstrated through secure, repeatable operational deployment.",
    markers: [
      {
        value: 5,
        label: "Credible capability base",
        description: "Europe has credible engineering, supplier and research capability across the deployment stack.",
        kind: "threshold"
      },
      {
        value: 7,
        label: "Integrated European stack",
        description: "The integrated stack supports secure and repeatable operational deployment.",
        kind: "operational"
      },
      {
        value: 9,
        label: "Competitive deployable platform",
        description: "The platform supports sustained operation and upgrades across large fleets.",
        kind: "scale"
      }
    ]
  },
  {
    id: "finance",
    shortLabel: "Demand",
    label: "Investment & business case",
    weight: 12,
    baseline: 3,
    rationale: "Is there a credible route from funded prototypes to aggregated demand and scale-up capital?",
    evidenceSupports: "EU programmes provide substantial funding for automotive R&D and mobility innovation.",
    currentConstraint: "Private investment, procurement demand and scale-up market conditions remain weak.",
    nextEvidence: "Recurring procurement, viable operating economics and private capital supporting deployment expansion.",
    markers: [
      {
        value: 4,
        label: "Credible project pipeline",
        description: "Funded projects form a visible route beyond prototypes.",
        kind: "threshold"
      },
      {
        value: 6,
        label: "Repeatable procurement and finance",
        description: "Procurement and viable operating economics support recurring deployments.",
        kind: "operational"
      },
      {
        value: 8,
        label: "Sustained scale-up market",
        description: "Recurring demand and private capital support continued expansion.",
        kind: "scale"
      }
    ]
  },
  {
    id: "publicValue",
    shortLabel: "Trust",
    label: "Public value, workforce & trust",
    weight: 10,
    baseline: 4,
    rationale: "Are safety, access, labour and climate outcomes visible, accountable and legitimate?",
    evidenceSupports: "Public strategies identify credible safety, accessibility and efficiency benefits alongside transition needs.",
    currentConstraint: "Comparable observed outcomes on trust, workforce and social transition remain limited.",
    nextEvidence: "Comparable outcome data from several deployments, including documented safeguards and workforce effects.",
    markers: [
      {
        value: 4,
        label: "Defined safeguards",
        description: "Public-value aims, safeguards and transition needs are defined.",
        kind: "threshold"
      },
      {
        value: 6,
        label: "Measured public outcomes",
        description: "Multiple sites report comparable safety, access, labour and climate outcomes.",
        kind: "operational"
      },
      {
        value: 8,
        label: "Durable public legitimacy",
        description: "Results and safeguards support lasting confidence across communities.",
        kind: "scale"
      }
    ]
  },
  {
    id: "sovereignty",
    shortLabel: "Control",
    label: "European capability & competitiveness",
    weight: 10,
    baseline: 4,
    rationale: "Does Europe retain control of strategic capability and the learning generated by deployment?",
    evidenceSupports: "Europe retains a strong industrial, supplier and automotive R&D base.",
    currentConstraint: "Dependencies in software, AI, digital hardware and operational learning expose strategic control and value capture.",
    nextEvidence: "Deployments that retain critical stack control, operational data and learning within Europe.",
    markers: [
      {
        value: 4,
        label: "Strategic capability base",
        description: "Europe retains a credible base of critical suppliers, skills and infrastructure.",
        kind: "threshold"
      },
      {
        value: 7,
        label: "European control of learning",
        description: "Critical technology and operational learning remain under European control.",
        kind: "operational"
      },
      {
        value: 9,
        label: "Competitive next-generation ecosystem",
        description: "A resilient European ecosystem competes globally across the deployment stack.",
        kind: "scale"
      }
    ]
  }
];

export const zones: Zone[] = [
  { label: "No foundation", range: "0–1", min: 0, description: "The basic institutional or market foundations are absent." },
  { label: "Isolated foundations", range: "2–3", min: 2, description: "Useful assets and pilots exist in fragmented settings." },
  { label: "Emerging pathway", range: "4–5", min: 4, description: "Capabilities are credible and repeatability remains limited." },
  { label: "Repeatable deployment", range: "6–7", min: 6, description: "Several readiness channels support recurring operation." },
  { label: "European scale", range: "8–10", min: 8, description: "Deployment and strategic capability operate at European scale in line with the Draghi benchmark." }
];

export const scenarios: Scenario[] = [
  {
    id: "road-access",
    horizon: "12–18 months",
    title: "Single-market deployment pathway",
    description: "A common operational template links EU approval to national road access in participating Member States.",
    illustration: "./assets/pathways/road-access.webp",
    illustrationAlt: "An autonomous shuttle crossing connected road sections and coordinated checkpoints.",
    startingPoint: "June 2026: EU type approval provides a shared technical foundation, while operational road access remains fragmented across national regimes.",
    timeline: [
      {
        period: "Autumn 2026",
        title: "A common operating dossier",
        description: "Participating authorities agree on shared information requirements, named contact points and a reusable application format."
      },
      {
        period: "Spring 2027",
        title: "The first multi-country corridor",
        description: "Operators reuse the dossier across a connected test corridor, while authorities coordinate permits and incident reporting."
      },
      {
        period: "Late 2027",
        title: "Access becomes repeatable",
        description: "Several Member States apply the common pathway to recurring services, reducing the time between approval and operation."
      }
    ],
    outcome: "A system approved at EU level can reach operational roads through a more predictable multi-country process.",
    effectRationale: {
      regulation: "A reusable dossier and coordinated permitting move road access toward the repeatable-authorisation tier.",
      deployment: "Faster access allows operators to repeat services across more than one national setting.",
      sovereignty: "European authorities and operators retain more of the regulatory and operational learning."
    },
    assumptions: [
      "A core group of Member States participates voluntarily.",
      "The common dossier works within national legal powers.",
      "Operators share comparable safety and incident evidence."
    ],
    sources: [
      {
        label: "European Commission Automotive Action Plan",
        url: "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX%3A52025DC0095"
      },
      {
        label: "Cross-border testbed declaration",
        url: "https://transport.ec.europa.eu/news-events/news/eu-ministers-back-cross-border-initiative-autonomous-vehicle-testbeds-2026-06-08_en"
      }
    ],
    changes: { regulation: 2, deployment: 1, sovereignty: 1 }
  },
  {
    id: "cities",
    horizon: "18–24 months",
    title: "Ambition Cities buying coalition",
    description: "Cities aggregate demand for larger L4 public-transport and shuttle fleets with shared outcome metrics.",
    illustration: "./assets/pathways/ambition-cities.webp",
    illustrationAlt: "Several cities and autonomous shuttle routes connected through a shared public procurement hub.",
    startingPoint: "June 2026: European activity is concentrated in tests, pilots and planned launches, while city demand remains fragmented.",
    timeline: [
      {
        period: "Autumn 2026",
        title: "Cities define a shared mission",
        description: "A first group of cities selects comparable use cases and agrees on service, safety, accessibility and workforce measures."
      },
      {
        period: "Spring 2027",
        title: "Demand is aggregated",
        description: "The coalition launches coordinated procurement with common requirements, larger fleet volumes and staged deployment options."
      },
      {
        period: "During 2028",
        title: "Pilots become services",
        description: "Contracted fleets operate across several cities and publish comparable service outcomes, costs and operational lessons."
      }
    ],
    outcome: "A visible European customer base gives operators and investors a credible route from individual pilots to repeatable services.",
    effectRationale: {
      deployment: "Multi-city contracts create repeated operations with shared service measures.",
      finance: "Aggregated demand improves procurement visibility and the business case for fleet expansion.",
      publicValue: "Comparable outcome reporting makes benefits, safeguards and workforce effects more visible."
    },
    assumptions: [
      "Cities align enough requirements to procure together.",
      "Contracts include meaningful fleet volumes and operating periods.",
      "Outcome measures remain comparable across local contexts."
    ],
    sources: [
      {
        label: "European Commission Apply AI Strategy",
        url: "https://eur-lex.europa.eu/legal-content/EN/ALL/?uri=celex%3A52025DC0723"
      },
      {
        label: "European Commission Automotive Action Plan",
        url: "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX%3A52025DC0095"
      }
    ],
    changes: { deployment: 2, finance: 2, publicValue: 1 }
  },
  {
    id: "data-loop",
    horizon: "12–24 months",
    title: "European validation commons",
    description: "A lawful data-sharing pathway, scenario library and reusable safety-case assets create a common learning loop.",
    illustration: "./assets/pathways/validation-commons.webp",
    illustrationAlt: "An autonomous shuttle connected to reusable data, simulation and safety-validation assets.",
    startingPoint: "June 2026: safety standards provide a foundation, while scenario data, validation assets and lawful reuse pathways remain difficult to share.",
    timeline: [
      {
        period: "Late 2026",
        title: "A governance pact is agreed",
        description: "Authorities, operators and research partners define lawful access, contribution rules and a shared validation vocabulary."
      },
      {
        period: "Mid 2027",
        title: "Reusable assets enter operation",
        description: "Participating deployments contribute scenario data and reuse simulation cases, validation results and safety-case components."
      },
      {
        period: "During 2028",
        title: "Evidence compounds across sites",
        description: "New deployments begin with a larger evidence base and feed operational findings back into shared validation resources."
      }
    ],
    outcome: "Each participating deployment strengthens a European evidence base that lowers duplication and improves safety learning.",
    effectRationale: {
      data: "Reusable scenario and safety evidence establishes the shared validation loop represented by the next tier.",
      technology: "Common validation assets make integrated systems easier to test and improve across deployments.",
      sovereignty: "European participants retain operational evidence and learning as a shared strategic asset."
    },
    assumptions: [
      "The governance model supports lawful and commercially acceptable reuse.",
      "Contributors use interoperable formats and quality requirements.",
      "Authorities accept reusable evidence as part of deployment assessment."
    ],
    sources: [
      {
        label: "EDPB connected-vehicle data guidance",
        url: "https://www.edpb.europa.eu/documents/guideline/guidelines-012020-on-processing-personal-data-in-the-context-of-connected_en"
      },
      {
        label: "ISO 21448 road-vehicle safety standard",
        url: "https://www.iso.org/standard/77490.html"
      }
    ],
    changes: { data: 3, technology: 1, sovereignty: 1 }
  },
  {
    id: "european-stack",
    horizon: "18–30 months",
    title: "European autonomous-driving stack",
    description: "European industry turns shared software, AI and chiplet-based computing building blocks into a deployable autonomous-driving platform.",
    illustration: "./assets/pathways/european-stack.webp",
    illustrationAlt: "A vehicle connected to an exploded modular stack of software, AI processors and automotive chiplets.",
    startingPoint: "June 2026: Europe has strong automotive engineering and active ECAVA working groups, alongside gaps in software, AI, computing and system integration.",
    timeline: [
      {
        period: "Autumn 2026",
        title: "A shared technical roadmap",
        description: "Industry agrees which software, AI, interfaces, computing platforms and chiplet components can be developed collaboratively as European building blocks."
      },
      {
        period: "During 2027",
        title: "The stack enters a distributed pilot facility",
        description: "Manufacturers, suppliers and technology companies integrate the shared stack and a modular in-vehicle computing architecture in vehicles, then test them against common engineering requirements."
      },
      {
        period: "During 2028",
        title: "A production platform emerges",
        description: "Several vehicle programmes reuse the stack, its interfaces and its upgrade pathway across operational deployments."
      }
    ],
    outcome: "Europe converts its research and supplier base into a maintainable platform that supports deployment while retaining critical technical capability.",
    effectRationale: {
      technology: "A shared, tested stack connects software and AI with modular chiplet-based computing and moves integration into repeatable deployment.",
      deployment: "Reusable components shorten integration work for new fleets and operating environments.",
      sovereignty: "European participants retain control of core architecture, engineering knowledge and upgrade pathways."
    },
    assumptions: [
      "Industry agrees on shared components while preserving competitive differentiation.",
      "Common interfaces connect software, AI, chiplets, computing platforms and vehicle-safety engineering.",
      "Several manufacturers and suppliers adopt the outputs in vehicle programmes."
    ],
    sources: [
      {
        label: "European Connected and Autonomous Vehicle Alliance",
        url: "https://digital-strategy.ec.europa.eu/en/policies/vehicle-alliance"
      },
      {
        label: "European Commission Automotive Action Plan",
        url: "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX%3A52025DC0095"
      }
    ],
    changes: { technology: 2, deployment: 1, sovereignty: 2 }
  },
  {
    id: "scale-up-compact",
    horizon: "18–30 months",
    title: "Deployment scale-up compact",
    description: "Public buyers, operators and finance providers combine recurring demand with capital for larger autonomous-mobility deployments.",
    illustration: "./assets/pathways/scale-up-compact.webp",
    illustrationAlt: "Contracts and financing connecting a small autonomous shuttle project to a larger operating fleet.",
    startingPoint: "June 2026: public innovation funding is available, while recurring procurement, private investment and commercial-scale operating evidence remain limited.",
    timeline: [
      {
        period: "Late 2026",
        title: "A European project pipeline",
        description: "Cities, transport authorities and operators group deployment proposals around comparable fleet, service and outcome requirements."
      },
      {
        period: "Mid 2027",
        title: "Contracts and capital align",
        description: "Public buyers offer staged service commitments while lenders and investors finance vehicles, infrastructure and operating expansion against delivery milestones."
      },
      {
        period: "During 2028",
        title: "Operating evidence unlocks expansion",
        description: "A portfolio of contracted services produces comparable cost and performance evidence that supports follow-on procurement and financing."
      }
    ],
    outcome: "Autonomous-mobility projects gain a credible route from funded innovation to contracted services and financeable fleet growth.",
    effectRationale: {
      finance: "A visible project pipeline and staged capital address the gap between research funding and deployment finance.",
      deployment: "Recurring service contracts support larger fleets and longer operating periods.",
      publicValue: "Outcome-linked contracts make service benefits and safeguards visible to public buyers and communities.",
      sovereignty: "European financing and procurement retain more operational value and learning within the ecosystem."
    },
    assumptions: [
      "Public buyers create contracts large enough to support commercial operations.",
      "Finance providers accept staged deployment and operating milestones.",
      "Projects report comparable costs, service outcomes and safeguards."
    ],
    sources: [
      {
        label: "European Commission Automotive Action Plan",
        url: "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX%3A52025DC0095"
      },
      {
        label: "EIB support for automotive innovation",
        url: "https://www.eib.org/en/press/all/2025-185-eib-group-approves-new-financing-for-european-security-transport-energy-water-and-deep-tech-as-well-as-support-for-ukrainian-firms"
      }
    ],
    changes: { finance: 2, deployment: 2, publicValue: 1, sovereignty: 1 }
  }
];
