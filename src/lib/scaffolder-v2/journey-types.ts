/**
 * Journey-First Architecture Types
 * 
 * These types replace the CRUD-focused schema-first approach with a
 * user experience-first design system. The AI agents design the complete
 * user journey before considering data storage.
 */

import { generateId } from '@/lib/utils';

// ============================================================================
// Core Journey Types - Design the Experience First
// ============================================================================

/**
 * A user flow represents a complete journey through the app
 * e.g., "Onboarding", "Daily Check-in", "View Progress"
 */
export interface UserFlow {
  id: string;
  name: string;
  description: string;
  /** Is this the primary flow users will use most often? */
  isPrimary: boolean;
  /** Steps in this flow */
  steps: FlowStep[];
  /** Entry points to this flow */
  entryPoints: string[];
  /** Exit points from this flow */
  exitPoints: string[];
}

/**
 * A single step within a user flow
 */
export interface FlowStep {
  id: string;
  name: string;
  description: string;
  /** What the user sees at this step */
  view: string;
  /** What actions can the user take */
  possibleActions: UserAction[];
  /** What triggers moving to the next step */
  transitions: FlowTransition[];
}

/**
 * A possible action the user can take
 */
export interface UserAction {
  id: string;
  name: string;
  description: string;
  /** Type of action */
  type: 'tap' | 'swipe' | 'drag' | 'type' | 'select' | 'long-press' | 'hover' | 'scroll';
  /** What happens when this action is taken */
  effect: string;
  /** Feedback to give the user */
  feedback?: ActionFeedback;
}

/**
 * Feedback shown to user after an action
 */
export interface ActionFeedback {
  type: 'visual' | 'haptic' | 'audio' | 'animation';
  description: string;
  duration?: number;
}

/**
 * Transition between flow steps
 */
export interface FlowTransition {
  id: string;
  /** What triggers this transition */
  trigger: string;
  /** Where does this go */
  targetStepId: string;
  /** Animation/transition style */
  animation?: TransitionAnimation;
}

/**
 * Animation for transitions between views
 */
export interface TransitionAnimation {
  type: 'fade' | 'slide' | 'zoom' | 'flip' | 'morph' | 'custom';
  direction?: 'left' | 'right' | 'up' | 'down';
  duration: number;
  easing: string;
  customSpec?: string;
}

/**
 * App state that affects what the user sees
 */
export interface AppState {
  name: string;
  description: string;
  /** What view to show in this state */
  view: string;
  /** Conditions to enter this state */
  conditions: string[];
}

/**
 * A key moment in the user experience that should be memorable
 */
export interface KeyMoment {
  id: string;
  name: string;
  description: string;
  /** When does this moment occur */
  trigger: string;
  /** Special treatment for this moment */
  celebration?: CelebrationSpec;
}

/**
 * How to celebrate a key moment
 */
export interface CelebrationSpec {
  type: 'confetti' | 'fireworks' | 'particles' | 'glow' | 'shake' | 'custom';
  intensity: 'subtle' | 'moderate' | 'dramatic';
  duration: number;
  sound?: string;
  haptic?: string;
  customSpec?: string;
}

/**
 * Complete user journey specification
 */
export interface UserJourney {
  id: string;
  appName: string;
  appPurpose: string;
  
  /** All user flows */
  flows: UserFlow[];
  
  /** App states (empty, loading, error, etc.) */
  states: AppState[];
  
  /** Key moments to celebrate */
  keyMoments: KeyMoment[];
  
  /** Entry point flow */
  entryFlowId: string;
  
  /** Navigation structure */
  navigation: NavigationSpec;
}

/**
 * Navigation structure for the app
 */
export interface NavigationSpec {
  type: 'bottom-tabs' | 'sidebar' | 'hamburger' | 'floating' | 'minimal' | 'none';
  items: NavigationItem[];
  primaryAction?: PrimaryActionSpec;
}

/**
 * A navigation item
 */
export interface NavigationItem {
  id: string;
  label: string;
  icon: string;
  targetFlowId: string;
  badge?: BadgeSpec;
}

/**
 * Badge on navigation items
 */
export interface BadgeSpec {
  type: 'count' | 'dot' | 'custom';
  condition: string;
  value?: string;
}

/**
 * Primary action button (FAB, etc.)
 */
export interface PrimaryActionSpec {
  type: 'fab' | 'inline' | 'header';
  position: 'bottom-right' | 'bottom-center' | 'top-right' | 'center';
  label: string;
  icon: string;
  action: UserAction;
}

// ============================================================================
// Interaction Design Types - Gestures, Animations, Micro-interactions
// ============================================================================

/**
 * Complete interaction specification for the app
 */
export interface InteractionSpec {
  id: string;
  
  /** All gestures used in the app */
  gestures: GestureSpec[];
  
  /** All animations */
  animations: AnimationSpec[];
  
  /** Micro-interactions */
  microInteractions: MicroInteraction[];
  
  /** Page transitions */
  pageTransitions: PageTransitionSpec[];
  
  /** Loading states */
  loadingStates: LoadingStateSpec[];
}

/**
 * A gesture the app responds to
 */
export interface GestureSpec {
  id: string;
  name: string;
  type: 'tap' | 'double-tap' | 'long-press' | 'swipe' | 'pinch' | 'rotate' | 'drag' | 'pan';
  direction?: 'left' | 'right' | 'up' | 'down' | 'any';
  /** Where this gesture is active */
  target: string;
  /** What happens */
  effect: string;
  /** Visual feedback during gesture */
  feedbackDuring?: string;
  /** Visual feedback after gesture */
  feedbackAfter?: string;
}

/**
 * An animation specification
 */
export interface AnimationSpec {
  id: string;
  name: string;
  /** What triggers this animation */
  trigger: 'mount' | 'unmount' | 'state-change' | 'interaction' | 'scroll' | 'custom';
  /** Target element(s) */
  target: string;
  /** Animation keyframes or description */
  keyframes: AnimationKeyframe[];
  /** Duration in ms */
  duration: number;
  /** Easing function */
  easing: string;
  /** Delay before starting */
  delay?: number;
  /** Whether to stagger child animations */
  stagger?: StaggerSpec;
}

/**
 * Animation keyframe
 */
export interface AnimationKeyframe {
  offset: number; // 0-1
  properties: Record<string, string | number>;
}

/**
 * Stagger specification for child animations
 */
export interface StaggerSpec {
  delay: number;
  direction: 'forward' | 'reverse' | 'center';
}

/**
 * A micro-interaction (small feedback animations)
 */
export interface MicroInteraction {
  id: string;
  name: string;
  trigger: string;
  animation: string;
  sound?: string;
  haptic?: string;
}

/**
 * Page transition specification
 */
export interface PageTransitionSpec {
  id: string;
  from: string;
  to: string;
  animation: TransitionAnimation;
  /** Shared elements that morph between pages */
  sharedElements?: SharedElement[];
}

/**
 * Shared element for page transitions
 */
export interface SharedElement {
  sourceId: string;
  targetId: string;
  morphType: 'size' | 'position' | 'both' | 'custom';
}

/**
 * Loading state specification
 */
export interface LoadingStateSpec {
  id: string;
  context: string;
  type: 'skeleton' | 'spinner' | 'progress' | 'shimmer' | 'custom';
  animation?: string;
}

// ============================================================================
// Component Architecture Types - Custom Components Per App
// ============================================================================

/**
 * Complete component system for an app
 */
export interface ComponentSystem {
  id: string;
  
  /** All custom components */
  components: ComponentDesign[];
  
  /** Shared design tokens */
  designTokens: DesignTokens;
  
  /** Component relationships */
  relationships: ComponentRelationship[];
}

/**
 * A custom component design (NO predefined types)
 */
export interface ComponentDesign {
  id: string;
  name: string;
  
  /** What this component does */
  purpose: string;
  
  /** Detailed description for code generation */
  description: string;
  
  /** User interactions this component handles */
  interactions: ComponentInteraction[];
  
  /** Visual specification */
  visual: ComponentVisualSpec;
  
  /** Data this component needs */
  dataNeeds: ComponentDataNeed[];
  
  /** Props interface (generated) */
  propsSpec: PropSpec[];
  
  /** State management needs */
  stateNeeds: StateNeed[];
  
  /** Suggested libraries for implementation */
  suggestedLibraries: string[];
  
  /** Is this the primary/hero component? */
  isPrimary: boolean;
  
  /** Layout positioning */
  layoutRole: 'hero' | 'supporting' | 'floating' | 'modal' | 'navigation' | 'utility';
}

/**
 * Interaction a component handles
 */
export interface ComponentInteraction {
  id: string;
  trigger: string;
  effect: string;
  animation?: string;
  feedback?: string;
}

/**
 * Visual specification for a component
 */
export interface ComponentVisualSpec {
  /** Size/layout */
  sizing: {
    width: string;
    height: string;
    minWidth?: string;
    maxWidth?: string;
  };
  
  /** Spacing */
  spacing: {
    padding: string;
    margin: string;
    gap?: string;
  };
  
  /** Visual style description */
  style: string;
  
  /** Color usage */
  colors: {
    background: string;
    foreground: string;
    accent?: string;
  };
  
  /** Border/shadow */
  decoration?: {
    borderRadius?: string;
    border?: string;
    shadow?: string;
  };
  
  /** Responsive behavior */
  responsive?: {
    mobile: string;
    tablet: string;
    desktop: string;
  };
}

/**
 * Data a component needs
 */
export interface ComponentDataNeed {
  name: string;
  type: string;
  description: string;
  source: 'prop' | 'context' | 'hook' | 'api';
}

/**
 * Prop specification
 */
export interface PropSpec {
  name: string;
  type: string;
  required: boolean;
  description: string;
  defaultValue?: unknown;
}

/**
 * State management need
 */
export interface StateNeed {
  name: string;
  type: string;
  initial: unknown;
  description: string;
  persistence: 'none' | 'local' | 'session' | 'api';
}

/**
 * Relationship between components
 */
export interface ComponentRelationship {
  parentId: string;
  childId: string;
  type: 'contains' | 'triggers' | 'shares-data' | 'navigation';
  description: string;
}

/**
 * Design tokens shared across components
 */
export interface DesignTokens {
  colors: Record<string, string>;
  fonts: Record<string, string>;
  spacing: Record<string, string>;
  radii: Record<string, string>;
  shadows: Record<string, string>;
  transitions: Record<string, string>;
}

// ============================================================================
// Data Architecture Types - Designed AFTER UX
// ============================================================================

/**
 * Complete data layer specification
 */
export interface DataLayer {
  id: string;
  
  /** Data structures */
  structures: DataStructure[];
  
  /** Operations needed by the UX */
  operations: DataOperationSpec[];
  
  /** Storage strategy */
  storage: StorageStrategy;
  
  /** Real-time needs */
  realtime?: RealtimeSpec;
}

/**
 * A data structure (NOT a database schema - designed for the UX)
 */
export interface DataStructure {
  id: string;
  name: string;
  
  /** What this data represents */
  purpose: string;
  
  /** Fields in this structure */
  fields: DataField[];
  
  /** Computed/derived fields */
  computed?: ComputedDataField[];
  
  /** Indexing for fast access */
  indexes?: string[];
}

/**
 * A field in a data structure
 */
export interface DataField {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'date' | 'array' | 'object';
  description: string;
  required: boolean;
  defaultValue?: unknown;
}

/**
 * A computed field
 */
export interface ComputedDataField {
  name: string;
  type: string;
  computation: string;
  description: string;
}

/**
 * A data operation (NOT CRUD - custom for this app)
 */
export interface DataOperationSpec {
  id: string;
  name: string;
  
  /** What this operation does */
  description: string;
  
  /** Which flow/interaction triggers this */
  triggeredBy: string;
  
  /** Input parameters */
  inputs: OperationInput[];
  
  /** Output type */
  output: string;
  
  /** Side effects */
  sideEffects?: string[];
  
  /** Implementation hints */
  implementationHints?: string;
}

/**
 * Input to a data operation
 */
export interface OperationInput {
  name: string;
  type: string;
  required: boolean;
  description: string;
}

/**
 * Storage strategy for the app
 */
export interface StorageStrategy {
  type: 'local' | 'session' | 'api' | 'hybrid';
  
  /** For API storage */
  apiEndpoint?: string;
  
  /** Sync strategy */
  syncStrategy?: 'immediate' | 'debounced' | 'manual' | 'background';
  
  /** Offline support */
  offlineSupport?: boolean;
  
  /** Cache strategy */
  caching?: CacheStrategy;
}

/**
 * Cache strategy
 */
export interface CacheStrategy {
  type: 'memory' | 'localStorage' | 'indexedDB';
  ttl?: number;
  maxItems?: number;
}

/**
 * Real-time data needs
 */
export interface RealtimeSpec {
  enabled: boolean;
  updates: string[];
  strategy: 'polling' | 'websocket' | 'sse';
  interval?: number;
}

// ============================================================================
// Design Session Types - Multi-Turn Agent Dialogue
// ============================================================================

/**
 * A design session where agents collaborate
 */
export interface DesignSession {
  id: string;
  
  /** Original user request */
  userRequest: string;
  
  /** Session status */
  status: 'active' | 'consensus-reached' | 'complete' | 'failed';
  
  /** All contributions from agents */
  contributions: AgentContribution[];
  
  /** Current turn number */
  turn: number;
  
  /** Maximum turns allowed */
  maxTurns: number;
  
  /** Has consensus been reached? */
  hasConsensus: boolean;
  
  /** Consensus details */
  consensus?: DesignConsensus;
  
  /** Start time */
  startedAt: Date;
  
  /** End time */
  endedAt?: Date;
}

/**
 * A contribution from an agent during the design session
 */
export interface AgentContribution {
  id: string;
  
  /** Which agent made this contribution */
  agentType: JourneyAgentType;
  
  /** Turn number when this was made */
  turn: number;
  
  /** What the agent is proposing/responding to */
  content: string;
  
  /** Structured output from the agent */
  structuredOutput?: unknown;
  
  /** Is this agent responding to another agent? */
  respondingTo?: string;
  
  /** Confidence in this contribution */
  confidence: number;
  
  /** Timestamp */
  timestamp: Date;
}

/**
 * Agent types in the journey-first architecture
 */
export type JourneyAgentType = 
  | 'journey-architect'
  | 'ux-designer'
  | 'interaction-designer'
  | 'component-architect'
  | 'data-architect'
  | 'implementation-engineer';

/**
 * Design consensus reached by agents
 */
export interface DesignConsensus {
  /** Final user journey */
  journey: UserJourney;
  
  /** Final interaction spec */
  interactions: InteractionSpec;
  
  /** Final component system */
  components: ComponentSystem;
  
  /** Final data layer */
  dataLayer: DataLayer;
  
  /** Summary of decisions */
  summary: string;
  
  /** All agents agreed */
  agreedBy: JourneyAgentType[];
  
  /** Any dissenting opinions */
  dissent?: AgentDissent[];
}

/**
 * Dissenting opinion from an agent
 */
export interface AgentDissent {
  agent: JourneyAgentType;
  concern: string;
  alternative: string;
  severity: 'minor' | 'moderate' | 'major';
}

// ============================================================================
// Implementation Types - Generated from Design
// ============================================================================

/**
 * Complete implementation specification
 */
export interface ImplementationSpec {
  id: string;
  
  /** From the design session */
  designSessionId: string;
  
  /** Components to generate */
  components: GeneratedComponentSpec[];
  
  /** Data layer to generate */
  dataLayer: GeneratedDataLayerSpec;
  
  /** Main app structure */
  appStructure: AppStructureSpec;
  
  /** Dependencies needed */
  dependencies: DependencySpec[];
}

/**
 * Specification for generating a component
 */
export interface GeneratedComponentSpec {
  name: string;
  
  /** Based on this component design */
  designId: string;
  
  /** Full implementation prompt for LLM */
  implementationPrompt: string;
  
  /** Expected file path */
  filePath: string;
  
  /** Dependencies */
  imports: ImportSpec[];
}

/**
 * Import specification
 */
export interface ImportSpec {
  from: string;
  imports: string[];
  isDefault?: boolean;
}

/**
 * Specification for generating the data layer
 */
export interface GeneratedDataLayerSpec {
  /** Operations to generate */
  operations: GeneratedOperationSpec[];
  
  /** Types to generate */
  types: GeneratedTypeSpec[];
  
  /** Storage implementation */
  storage: GeneratedStorageSpec;
}

/**
 * Specification for generating an operation
 */
export interface GeneratedOperationSpec {
  name: string;
  
  /** Based on this operation design */
  designId: string;
  
  /** Full implementation prompt */
  implementationPrompt: string;
  
  /** File path */
  filePath: string;
}

/**
 * Specification for generating types
 */
export interface GeneratedTypeSpec {
  name: string;
  fields: string;
  filePath: string;
}

/**
 * Specification for generating storage
 */
export interface GeneratedStorageSpec {
  strategy: StorageStrategy;
  implementationPrompt: string;
  filePath: string;
}

/**
 * App structure specification
 */
export interface AppStructureSpec {
  /** Entry point component */
  entryComponent: string;
  
  /** Layout structure */
  layout: LayoutStructure;
  
  /** Routing (if any) */
  routing?: RoutingSpec;
}

/**
 * Layout structure
 */
export interface LayoutStructure {
  type: 'single-page' | 'multi-page' | 'tabs' | 'drawer';
  regions: LayoutRegion[];
}

/**
 * Layout region
 */
export interface LayoutRegion {
  name: string;
  position: 'header' | 'main' | 'sidebar' | 'footer' | 'floating' | 'modal';
  componentId: string;
}

/**
 * Routing specification
 */
export interface RoutingSpec {
  type: 'hash' | 'history' | 'state';
  routes: RouteSpec[];
}

/**
 * Route specification
 */
export interface RouteSpec {
  path: string;
  componentId: string;
}

/**
 * Dependency specification
 */
export interface DependencySpec {
  name: string;
  version?: string;
  reason: string;
}

// ============================================================================
// Journey Conversation State - Replaces Schema-First State
// ============================================================================

/**
 * Conversation state for journey-first architecture
 */
export interface JourneyConversationState {
  id: string;
  version: 'v3-journey';
  
  /** Current design session */
  designSession?: DesignSession;
  
  /** Final design (after consensus) */
  finalDesign?: DesignConsensus;
  
  /** Implementation spec (after design finalized) */
  implementationSpec?: ImplementationSpec;
  
  /** Generated code */
  generatedCode?: GeneratedCode;
  
  /** Conversation messages */
  messages: JourneyMessage[];
  
  /** App name */
  appName?: string;
  
  /** Timestamps */
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Message in journey conversation
 */
export interface JourneyMessage {
  id: string;
  role: 'user' | 'assistant' | 'agent';
  agentType?: JourneyAgentType;
  content: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

/**
 * Generated code output
 */
export interface GeneratedCode {
  /** All generated files */
  files: GeneratedFile[];
  
  /** Entry point */
  entryPoint: string;
  
  /** Dependencies */
  dependencies: Record<string, string>;
}

/**
 * A generated file
 */
export interface GeneratedFile {
  path: string;
  content: string;
  type: 'component' | 'data' | 'types' | 'utils' | 'styles' | 'entry';
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Create an empty design session
 */
export function createDesignSession(userRequest: string): DesignSession {
  return {
    id: generateId(),
    userRequest,
    status: 'active',
    contributions: [],
    turn: 0,
    maxTurns: 10,
    hasConsensus: false,
    startedAt: new Date(),
  };
}

/**
 * Create an empty journey conversation state
 */
export function createJourneyConversationState(): JourneyConversationState {
  return {
    id: generateId(),
    version: 'v3-journey',
    messages: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

/**
 * Add a contribution to a design session
 */
export function addContribution(
  session: DesignSession,
  agentType: JourneyAgentType,
  content: string,
  structuredOutput?: unknown,
  respondingTo?: string
): DesignSession {
  const contribution: AgentContribution = {
    id: generateId(),
    agentType,
    turn: session.turn,
    content,
    structuredOutput,
    respondingTo,
    confidence: 0.8, // Default confidence
    timestamp: new Date(),
  };

  return {
    ...session,
    contributions: [...session.contributions, contribution],
  };
}

/**
 * Check if design session has reached consensus
 */
export function checkConsensus(session: DesignSession): boolean {
  // Need at least contributions from all 4 design agents
  const agentTypes = new Set(session.contributions.map(c => c.agentType));
  const requiredAgents: JourneyAgentType[] = [
    'ux-designer',
    'interaction-designer', 
    'component-architect',
    'data-architect',
  ];
  
  const hasAllAgents = requiredAgents.every(a => agentTypes.has(a));
  
  // Need at least 3 turns of discussion
  const hasEnoughTurns = session.turn >= 3;
  
  // Check if recent contributions show agreement (simplified)
  const recentContributions = session.contributions.slice(-4);
  const allHighConfidence = recentContributions.every(c => c.confidence >= 0.7);
  
  return hasAllAgents && hasEnoughTurns && allHighConfidence;
}
