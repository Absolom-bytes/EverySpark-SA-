export const TOOL_CATEGORIES = [
  { id: 'teacher', name: 'Educators', icon: 'fa-chalkboard-user' },
  { id: 'leadership', name: 'Principals', icon: 'fa-user-tie' },
  { id: 'admin', name: 'School Admin', icon: 'fa-envelope-open-text' },
  { id: 'learner', name: 'Learners', icon: 'fa-graduation-cap' },
];

export interface ToolConfig {
  id: string;
  categoryId: string;
  name: string;
  basePrompt: string;
  examplePrompt: string;
  description: string;
}

export const TOOLS_CONFIG: ToolConfig[] = [
  {
    id: 'lesson-plan',
    categoryId: 'teacher',
    name: 'CAPS Lesson Planner',
    description: 'Generates high-fidelity, CAPS-aligned lesson plans with innovative pedagogy.',
    basePrompt: 'Generate a high-fidelity lesson plan that is fully CAPS aligned. Focus on innovative teaching methods, time-saving workflows, and 10x output for the educator.',
    examplePrompt: 'Grade 10 Geography: The structure of the Earth and plate tectonics. Focus on active learning for a 60-minute session.'
  },
  {
    id: 'assessment-gen',
    categoryId: 'teacher',
    name: 'Assessment Architect',
    description: 'Creates formal assessments with Bloom\'s Taxonomy analysis and memos.',
    basePrompt: 'Create a formal assessment or worksheet based on the provided topic. Include a marking memorandum and cognitive levels analysis (Bloom\'s Taxonomy).',
    examplePrompt: 'Grade 9 Mathematics: Algebraic expressions and equations. Include 5 multiple choice and 3 structured problem questions.'
  },
  {
    id: 'strategy-toolkit',
    categoryId: 'leadership',
    name: 'Strategic School Lead',
    description: 'Corporate-grade management roadmaps for school principals and SGBs.',
    basePrompt: 'Draft a strategic memo or leadership roadmap for a Principal dealing with the provided scenario. Treat the Principal as a CEO. Use corporate management logic applied to education.',
    examplePrompt: 'Scenario: Designing a digital literacy roadmap for a school with limited hardware but high community interest.'
  },
  {
    id: 'sgb-governance',
    categoryId: 'leadership',
    name: 'SGB Governance Advisor',
    description: 'Professional policy drafting and compliance logic for Governing Bodies.',
    basePrompt: 'Draft a professional school policy or SGB resolution. Ensure the language is high-tier, legally sound in a South African context, and community-focused.',
    examplePrompt: 'Drafting a new Code of Conduct for Learners that prioritizes restorative justice and community values.'
  },
  {
    id: 'parent-comms',
    categoryId: 'admin',
    name: 'Elite Comms Engine',
    description: 'Automates professional stakeholder communications and newsletters.',
    basePrompt: 'Draft a professional, empathetic, and clear newsletter or parent communication regarding school updates. Focus on building community trust and professional clarity.',
    examplePrompt: 'Newsletter announcement about the upcoming EverySpark AI launch and how it will benefit student learning outcomes.'
  },
  {
    id: 'fundraising-pro',
    categoryId: 'admin',
    name: 'Sponsorship Pitcher',
    description: 'Generates high-impact corporate sponsorship proposals for school projects.',
    basePrompt: 'Write a corporate-grade sponsorship proposal for a school project. Focus on ROI for the corporate partner and Social Economic Development (SED) points.',
    examplePrompt: 'Pitching to a local bank to sponsor a new science lab. Highlight naming rights and community impact metrics.'
  },
  {
    id: 'study-guide',
    categoryId: 'learner',
    name: 'Syllabus Synthesizer',
    description: 'Converts complex syllabus content into high-impact revision guides.',
    basePrompt: 'Convert complex syllabus concepts into a "cheat sheet" or high-impact summary for a South African learner. Use mnemonic devices and simplified executive summaries.',
    examplePrompt: 'Grade 12 Life Sciences: DNA replication and protein synthesis. Summarize the process for quick exam revision.'
  }
];
