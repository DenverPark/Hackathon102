export type TestType = 'shrinkage' | 'staining';
export interface Measurement {
  shrinkage_kind?: 'relaxation' | 'felting' | 'combined' | 'unknown';
  shrinkage_basis?: 'linear'; // Area shrinkage is not accepted as directional shrinkage_pct.
  shrinkage_pct?: number;
  staining_grade?: number;
  wash_temp_c?: number;
  wash_minutes?: number;
  cycles?: number;
  drying?: string;
  direction?: 'warp' | 'weft';
}
export interface FabricSample {
  nylon_type?: 'nylon6' | 'nylon66' | 'unknown';
  coating?: 'none' | 'pu' | 'acrylic' | 'dwr' | 'multiple' | 'other' | 'unknown';
  heat_set?: boolean | null;
  construction?: 'woven' | 'knit' | 'unknown';
  shrinkproofed?: boolean | null;
  sample_id?: string;
  fabric_id: string;
  color_depth?: 'dark' | 'light' | 'medium' | 'unknown';
  prewashed?: boolean | null;
  measurement?: Measurement | null;
}
export interface AnalysisInput { purpose: string; items: FabricSample[]; }
export interface AnalysisResponse {
  schema_version: '1.1'; rule_version: string; purpose: string;
  status: 'insufficient_data' | 'needs_testing' | 'no_rule_triggered';
  fabric_snapshots: Array<{sample_id:string;fabric_id:string;name:string;composition:Record<string,number>;color_depth:string;prewashed:boolean|null;source_ids:string[];catalogue_data_gaps:string[];profile_details:Record<string,unknown>;processing:Record<string,string|boolean|null>}>;
  warnings: Array<{code:string;message:string;source_ids:string[];rule_status?:string;difference_pp?:number;threshold_pp?:number}>;
  unknown_fields: Array<{sample_id?:string;field:string;reason?:string}>;
  recommended_tests: Array<{test_type:TestType;reason:string;priority:'recommended'}>;
  shrinkage_difference_pp: number|null;
  measurement_basis: 'user_reported_only'; purpose_usage:string; disclaimer:string;
}
