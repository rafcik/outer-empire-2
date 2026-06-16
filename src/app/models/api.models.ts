export interface ServiceResponse<T> {
  success: boolean;
  returnCode: number;
  returnString: string;
  data: T;
  errors?: ValidationError[];
}

export interface ValidationError {
  field: string;
  error: string;
}

export interface TokenResponse {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
  characterId: number;
  scopes: string[];
  subscription: string;
}

export interface CharacterLevel {
  track: string;
  levelId: number;
  levelName: string;
  currentXP: number;
  xpToNextLevel: number;
}

export interface PublicCharacter {
  characterId: number;
  firstName: string;
  lastName: string;
  activeTimeMinutes: number;
  levels: CharacterLevel[];
}

// ── Assets ──────────────────────────────────────────────────────────────────

export interface AssetLocation {
  locationId: number;
  locationType: string;
  locationName: string;
  systemName: string;
  systemId: number;
  assetCount: number;
}

export interface AssetCargoProperty {
  modTypeId: number;
  propertyName: string;
  friendlyPropertyName: string;
  propertyValue: number;
  unit: string;
  evolution: number;
  originalPropertyValue: number;
  researchPositive: boolean;
  canResearch: boolean;
}

export interface AssetCargoItem {
  id: number;
  typeId: number;
  amount: number;
  jobRef: number | null;
  jobDeliveryLoc: number | null;
  healthPercentage: number | null;
  lastRepairHealthPercentage: number | null;
  resourceName: string;
  evolution: number | null;
  icon: string;
  typeC: string;
  mass: number | null;
  volume: number | null;
  properties: AssetCargoProperty[];
  jobName: string;
  jobTrack: string;
  shipPartType: string;
}

export interface AssetShip {
  shipTypeId: number;
  shipTypeName: string;
  assetName: string;
  shipName: string;
  primaryCareer: string;
  licenseLevel: number | null;
  shipSize: string;
  transponder: string;
}

export interface AssetLocationDetail {
  cargo: AssetCargoItem[];
  ships: AssetShip[];
}

export interface Blueprint {
  id: number;
  name: string;
  type: string;
  evolution: number;
  partTypeIcon: string;
  description: string;
  manufactureTime: number;
  manufactureAmount: number;
}

export interface BlueprintResource {
  resourceId: number;
  resourceName: string;
  resourceIcon: string;
  resourceAmount: number;
  rarityClassification: string;
}

export interface AssetBlueprint {
  blueprint: Blueprint;
  resourcesRequired: BlueprintResource[];
  blueprintProperties: AssetCargoProperty[];
}

export interface SurveyResource {
  resourceId: number;
  resourceName: string;
  accessibility: number;
  abundance: number;
  rarityClassification: string;
  maxReserve: number | null;
}

export interface Survey {
  id: number;
  traceElements: boolean;
  scanDate: string;
  scanCharacter: string;
  encryptedId: string;
  systemObjectId: number;
  objectType: string;
  resources: SurveyResource[];
}

export interface AssetSurvey {
  survey: Survey;
}

export interface AssetCrateContents {
  cargo: AssetCargoItem[];
}

// ── Colonies ─────────────────────────────────────────────────────────────────

export interface ColonyListItem {
  colonyId: number;
  colonyName: string;
  systemObjectName: string;
  systemName: string;
  systemId: number;
  colonySize: number;
  remoteAccess: number;
  distance: number;
  surfaceVariation: number;
  atmosVariation: number;
  hexValue: string;
  systemObjectTypeName: string;
  imagePreFix: string;
  hasManufacturing: number;
  manufacturingInProgress: number;
  hasMining: number;
  miningInProgress: number;
  hasRefining: number;
  refiningInProgress: number;
  hasResearch: number;
  researchInProgress: number;
  manufacturingBlocked: number;
  workerCurrentAttitude: number;
  contentmentIndex: number;
}

export interface ColonyNotice {
  noticeText: string;
  noticeDt: string;
}

export interface ColonyIndustry {
  sum: number;
  industryId: number;
  industryName: string;
}

export interface ColonyOperation {
  operationType: string;
}

export interface ColonyDurability {
  maxColonyDurability: number;
  currentColonyDurability: number;
}

export interface ColonyOperationalEfficiency {
  modTypeId: number;
  propertyName: string;
  friendlyPropertyName: string;
  propertyValue: number;
  unit: string;
}

export interface ColonySummary {
  colonyId: number;
  colonyName: string;
  canLand: boolean;
  characterName: string;
  colonySize: number;
  isOwnColony: boolean;
  systemObjectName: string;
  systemName: string;
  assetValue: number;
  hasCommandCenter: boolean;
  timeToFirstBuildingComplete: number;
  mustSolidifyClaim: string;
  imagePreFix: string;
  surfaceVariation: number;
  atmosVariation: number;
  hexValue: string;
  notices: ColonyNotice[];
  industriesPresent: ColonyIndustry[];
  operationsPresent: ColonyOperation[];
  colonyDurability: ColonyDurability;
  operationalEfficiencies: ColonyOperationalEfficiency[];
}

export interface ColonyCapacities {
  powerDraw: number;
  powerGenerated: number;
  luxuriesNeeded: number;
  luxuriesAvailable: number;
  habitationNeeded: number;
  habitationAvailable: number;
  warehouseUsed: number;
  warehouseCapacity: number;
  foodNeeded: number;
  foodAvailable: number;
}

export interface ColonyBuildingAttribute {
  modTypeId: number;
  propertyName: string;
  friendlyPropertyName: string;
  propertyValue: number;
  unit: string;
}

export interface ColonyBuildingStatusEffect {
  statusId: number;
  modTypeId: number;
  change: number;
}

export interface ColonyBuildingIndustry {
  Id: number | null;
  name: string;
}

export interface ColonyBuildingDetailRequirement {
  name: string;
  detailTypeId: number;
  numberRequired: number;
  workerId: number;
  workerStatusId: number;
}

export interface ColonyBuildingExtraProperty {
  info1: string;
  info2: string;
  info3: string;
  info4: string;
}

export interface ColonyBuilding {
  buildingId: number;
  colonyBuildingTypeId: number;
  blueprintDesignName: string;
  buildingOnline: boolean;
  statusId: number;
  opsStatusEffects: ColonyBuildingStatusEffect[];
  constructingBuildingFinish: string | null;
  industries: ColonyBuildingIndustry[];
  durabilityCurrent: number;
  durabilityMax: number;
  detailsRequired: ColonyBuildingDetailRequirement[];
  supportDetailsRequired: ColonyBuildingDetailRequirement[];
  buildingAttributes: ColonyBuildingAttribute[];
  extraProperties: ColonyBuildingExtraProperty[];
  resourceId: number;
  resourceIcon: string;
  resourceName: string;
  manufactureAmountPerRun: number;
  maxRate: number;
  manufactureNumber: number;
  nextFinish: string | null;
}

export interface ColonyBuildingsSummary {
  totalStructures: number;
  fullyOperational: number;
  partiallyOperational: number;
  offlineS: number;
  upgrading: number;
  constructing: number;
  repairing: number;
  damaged: number;
  ruined: number;
  systemObjectId: number;
  manufacturingBlocked: boolean;
}

export interface ColonyBuildings {
  summary: ColonyBuildingsSummary;
  colonyCapacities: ColonyCapacities;
  buildings: ColonyBuilding[];
}

export interface ColonyWarehouse {
  warehouseCapacity: number;
  canAccess: boolean;
  contents: AssetCargoItem[];
}

export interface ColonyWorkforceOverview {
  blueCollarAllocated: number;
  blueCollarUnallocated: number;
  whiteCollarAllocated: number;
  whiteCollarUnallocated: number;
  specialistAllocated: number;
  specialistUnallocated: number;
}

export interface ColonyModifier {
  Id: number | null;
  description: string;
  modifierNumber: number;
  positive: boolean;
  temporary: boolean;
}

export interface ColonyCommodityDemand {
  id: number;
  typeC: string;
  commodityType: string;
  typeId: number;
  typeName: string;
  amount: number;
  requiredBy: string;
  fulfilled: boolean;
}

export interface ColonyWorker {
  workerId: number;
  workerTypeId: number;
  buildingTypeId: number;
  name: string;
  downTools: number;
}

export interface ColonyWages {
  currentWagePercentage: number;
  galacticWageStandard: number;
  currentWageBillPerCycle: number;
  lastWageChange: string | null;
}

export interface ColonyWorkers {
  workerCurrentAttitude: number;
  colonyModifiers: ColonyModifier[];
  colonyCapacities: ColonyCapacities;
  workforceCommodityDemands: ColonyCommodityDemand[];
  workforceOverview: ColonyWorkforceOverview;
  workforceDetail: ColonyWorker[];
  wages: ColonyWages;
}

// ── App state models ──────────────────────────────────────────────────────────

export interface AuthState {
  clientId: string;
  secret: string;
  token: string;
  expiresAt: number;
  characterId: number;
  characterName: string;
  scopes: string[];
}

export interface ColonyFullData {
  listItem: ColonyListItem;
  summary: ColonySummary | null;
  buildings: ColonyBuildings | null;
  warehouse: ColonyWarehouse | null;
  workers: ColonyWorkers | null;
}

export interface AssetLocationWithDetail {
  locationMeta: AssetLocation;
  detail: AssetLocationDetail;
  crateContents: Record<number, AssetCrateContents>;
  blueprintDetails: Record<number, AssetBlueprint>;
  surveyDetails: Record<number, AssetSurvey>;
}

export interface SyncedData {
  lastSynced: string | null;
  colonies: ColonyFullData[];
  assetLocations: AssetLocationWithDetail[];
}

export interface SyncProgress {
  phase: string;
  done: number;
  total: number;
  error?: string;
}
