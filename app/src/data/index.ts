import type { Note, Project, ArchiveItem } from "@/types";

export const notesData: Note[] = [
  {
    id: "note-1",
    title: "Architecture Research",
    summary: "Notes on the brutalist movement and its impact on digital archives...",
    content: `The project explores the intersection of digital archives and physical layout systems.

1. Layout Physics
The interface relies on a strict separation of concerns, mimicking a filing cabinet. The tabs at the top provide context switching without losing the sense of permanence.

2. Visual DNA
- Colors: Monochromatic warm greys with high contrast black ink.
- Typography: Functional, grotesque sans-serif.
- Shapes: Softened geometric forms, specifically the tab shape.

To Do:
- [ ] Finalize color contrast ratios
- [ ] Export SVG assets for the folder tabs
- [ ] Review mobile responsiveness logic

Reference material includes early 20th-century Dutch design manuals and industrial filing systems.`,
    timestamp: "10:42 AM",
    groupLabel: "10:42 AM",
    lastEdited: "Last edited today at 10:42 AM",
  },
  {
    id: "note-2",
    title: "Meeting: Cirkel Sector",
    summary: "Discuss timeline for the archival project launch...",
    content: `Meeting with the Cirkel Sector team on archival project timeline.

Attendees: M. de Vries, J. Bakker, L. Janssen

Key Points:
- Launch date moved to Q2 2025
- Budget approval pending for physical space renovation
- Digital catalog needs integration with existing library system

Action Items:
- [ ] Send updated proposal to steering committee
- [ ] Schedule site visit for March 15
- [ ] Confirm vendor for climate control units

Next meeting: March 3, 2025`,
    timestamp: "Yesterday",
    groupLabel: "YESTERDAY",
    lastEdited: "Last edited yesterday at 4:15 PM",
  },
  {
    id: "note-3",
    title: "Material Palette",
    summary: "Concrete, raw steel, unbleached paper. Need to finalize swatches...",
    content: `Material palette for the physical archive space.

Primary Surfaces:
- Polished concrete floors (reference: Mies van der Rohe Pavilion)
- Raw steel shelving units, untreated
- Unbleached cotton paper for all printed materials

Accent Materials:
- Oiled oak for reading tables
- Matte black powder-coated steel for signage
- Linen binding tape for document repair

Color Samples:
- Concrete: Pantone Cool Gray 8 C
- Steel: Pantone 877 C Metallic
- Paper: Pantone 7500 C

Notes: The contrast between cold industrial materials and warm paper creates the right tension. Visitors should feel they are entering a working space, not a museum.`,
    timestamp: "Oct 24",
    groupLabel: "OCT 24",
    lastEdited: "Last edited Oct 24 at 2:30 PM",
  },
  {
    id: "note-4",
    title: "Typography System",
    summary: "Exploring monospace pairings for the header elements...",
    content: `Typography system for the archive interface and print materials.

Header Font: Neue Haas Grotesk
- Weights: 400, 500, 700
- Tracking: -0.02em for headlines
- Used for: Navigation, titles, section headers

Body Font: System sans-serif stack
- Weights: 400, 400i, 600
- Size: 15px / line-height 1.7
- Used for: All body text, descriptions, notes

Monospace Font: SF Mono / Menlo
- Weights: 400, 500
- Size: 13px
- Used for: Timestamps, metadata, technical labels

Pixel Font (decorative): "Press Start 2P"
- Size: 8px–10px only
- Used for: Status indicators, decorative badges only

Open Questions:
- [ ] License for Neue Haas in digital environment
- [ ] Fallback stack if SF Mono unavailable
- [ ] Test rendering at small sizes on Windows`,
    timestamp: "Oct 22",
    groupLabel: "OCT 22",
    lastEdited: "Last edited Oct 22 at 11:00 AM",
  },
  {
    id: "note-5",
    title: "Digital Archive Schema",
    summary: "Draft v0.3 of the metadata structure for catalog entries...",
    content: `Metadata schema for digital archive entries.

Core Fields:
- entry_id: UUID v4
- title: String (max 200 chars)
- creators: Array of {name, role, dates}
- date_created: ISO 8601 date or date range
- date_digitized: ISO 8601 datetime
- material_type: Enum [paper, photograph, audio, video, object]
- dimensions: {width, height, depth, unit}
- condition: Enum [excellent, good, fair, poor, critical]

Indexing:
- Full-text search on title, description, transcription
- Faceted search on date ranges, material type, condition
- Related entries via manual curation + automated similarity

To Do:
- [ ] Validate schema against existing 500 entries
- [ ] Write migration script from v0.2
- [ ] Set up Elasticsearch mapping`,
    timestamp: "Oct 20",
    groupLabel: "OCT 20",
    lastEdited: "Last edited Oct 20 at 9:45 AM",
  },
  {
    id: "note-6",
    title: "Visitor Flow Analysis",
    summary: "Heatmap data from the first month of soft opening...",
    content: `Visitor flow analysis — first month of soft opening (Sept 15–Oct 15).

Peak Hours:
- Weekdays: 2:00 PM – 5:00 PM
- Weekends: 10:00 AM – 1:00 PM
- Average dwell time: 47 minutes

Hot Zones:
1. Architecture photography section (34% of visit time)
2. Interactive digitization station (22%)
3. Reading area by the window (18%)

Cold Zones:
- Archive storage viewing corridor (only 8% visit)
- Audio listening station (12%)

Recommendations:
- Add directional signage to storage corridor
- Relocate audio station near the photography section
- Consider timed entry slots for weekends`,
    timestamp: "Oct 18",
    groupLabel: "OCT 18",
    lastEdited: "Last edited Oct 18 at 3:20 PM",
  },
];

export const projectsData: Project[] = [
  {
    id: "proj-1",
    name: "Cirkel Sector Archive",
    status: "ACTIVE",
    description:
      "A comprehensive digital and physical archive for the Cirkel Sector industrial heritage site. The project encompasses cataloging 10,000+ artifacts, designing exhibition spaces, and building a public-facing digital research platform.",
    techStack: ["Next.js", "PostgreSQL", "Elasticsearch", "IIIF"],
    link: "https://cirkelsector.archive",
    milestones: [
      { date: "2024-09", label: "Phase 1: Site survey completed" },
      { date: "2024-11", label: "Phase 2: Cataloging 2,400 items" },
      { date: "2025-02", label: "Phase 3: Digital platform beta" },
      { date: "2025-05", label: "Phase 4: Public launch" },
    ],
    lastEdited: "Last edited today at 9:30 AM",
    groupLabel: "ACTIVE",
  },
  {
    id: "proj-2",
    name: "Type Specimen Microsite",
    status: "ACTIVE",
    description:
      "An interactive microsite showcasing the archive's typography collection. Features variable font demonstrations, historical timeline, and downloadable specimens.",
    techStack: ["React", "Vite", "GSAP", "Variable Fonts"],
    link: "https://type.cirkelsector.archive",
    milestones: [
      { date: "2024-10", label: "Design system finalized" },
      { date: "2024-12", label: "Core interactions built" },
      { date: "2025-01", label: "Content integration" },
    ],
    lastEdited: "Last edited yesterday at 6:00 PM",
    groupLabel: "ACTIVE",
  },
  {
    id: "proj-3",
    name: "Audio Preservation Pipeline",
    status: "COMPLETED",
    description:
      "Built an automated workflow for digitizing and preserving analog audio recordings from the 1960s–1980s. The pipeline handles reel-to-reel tapes, cassettes, and vinyl records.",
    techStack: ["Python", "FFmpeg", "Django", "AWS S3"],
    milestones: [
      { date: "2023-06", label: "Equipment procurement" },
      { date: "2023-09", label: "Pipeline v1 operational" },
      { date: "2024-03", label: "500 recordings digitized" },
      { date: "2024-08", label: "Project completed" },
    ],
    lastEdited: "Last edited Aug 15, 2024",
    groupLabel: "COMPLETED",
  },
  {
    id: "proj-4",
    name: "Wayfinding System",
    status: "COMPLETED",
    description:
      "Designed and installed a comprehensive wayfinding system for the archive building. Includes wall-mounted signage, floor graphics, and a digital directory kiosk.",
    techStack: ["Adobe Illustrator", "Figma", "Custom SVG"],
    milestones: [
      { date: "2024-01", label: "User research completed" },
      { date: "2024-04", label: "Signage production" },
      { date: "2024-06", label: "Installation" },
      { date: "2024-07", label: "Project completed" },
    ],
    lastEdited: "Last edited Jul 30, 2024",
    groupLabel: "COMPLETED",
  },
];

export const archiveData: ArchiveItem[] = [
  {
    id: "arch-1",
    title: "De Stijl Exhibition Notes",
    content: `Exhibition notes from the "De Stijl and Beyond" temporary exhibition held in Spring 2023.

The exhibition featured 45 original works from the archive's De Stijl collection, supplemented by loans from the Gemeentemuseum Den Haag.

Visitor numbers: 12,400 over 8 weeks
Media coverage: 6 publications, 2 radio features

Key learnings:
- The chronological layout worked better than the thematic approach tested in the pilot
- Audio guides saw 78% adoption rate
- Gift shop revenue exceeded projections by 23%

This exhibition formed the basis for the current permanent gallery layout.`,
    archivedDate: "2023-07-15",
    originalType: "note",
    year: "2023",
    groupLabel: "2023",
  },
  {
    id: "arch-2",
    title: "Building Renovation Plan v1",
    content: `Original renovation plan for the Cirkel Sector archive building (draft, superseded by v2 in 2024).

This version proposed a more radical intervention including:
- Full glass curtain wall on the north facade
- Basement level excavation for climate-controlled storage
- Rooftop event space

The plan was revised after structural assessment revealed foundation limitations. The final v2 plan is significantly more conservative and respects the existing industrial character.

Preserved for historical reference.`,
    archivedDate: "2023-04-22",
    originalType: "project",
    year: "2023",
    groupLabel: "2023",
  },
  {
    id: "arch-3",
    title: "Rietveld Chair Documentation",
    content: `Documentation of the red-blue chair restoration project completed in late 2022.

The chair (production model, ca. 1923) was acquired by the archive in 2019 in poor condition. The restoration was carried out by Atelier Nieuwegein over 14 months.

Restoration steps:
1. Structural assessment and wood consolidation
2. Removal of non-original blue paint layer (1970s)
3. Color analysis and reconstruction of original finish
4. Reupholstery with period-correct fabric

The chair is now on display in the permanent collection gallery.`,
    archivedDate: "2022-12-10",
    originalType: "note",
    year: "2022",
    groupLabel: "2022",
  },
  {
    id: "arch-4",
    title: "Archive Catalog 2019–2021",
    content: `The first comprehensive digital catalog of the archive collection, covering acquisitions from 2019 to 2021.

Total entries: 3,247 items
Photography: 1,892 items
Documents: 834 items
Objects: 521 items

This catalog was built using a simple Airtable base and has since been migrated to the current PostgreSQL + Elasticsearch system. The original Airtable base is preserved as a snapshot.

Limitations of this early catalog:
- No controlled vocabulary
- Limited metadata fields
- No IIIF image serving
- No faceted search`,
    archivedDate: "2022-06-30",
    originalType: "project",
    year: "2022",
    groupLabel: "2022",
  },
  {
    id: "arch-5",
    title: "Founding Charter",
    content: `The founding charter of the Cirkel Sector Archive, signed on March 15, 2019.

Signatories:
- Municipality of Rotterdam
- Cirkel Sector Foundation
- Dutch Cultural Heritage Agency

Mission statement:
"To preserve, document, and make accessible the industrial and cultural heritage of the Cirkel Sector for current and future generations."

Original operating principles:
1. Open access to all non-restricted materials
2. Collaboration with academic researchers
3. Community engagement and education programs
4. Sustainable preservation practices

These principles remain the guiding framework for all archive activities.`,
    archivedDate: "2019-03-15",
    originalType: "note",
    year: "2019",
    groupLabel: "2019",
  },
];
