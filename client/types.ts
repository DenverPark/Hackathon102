export type TestType = 'shrinkage' | 'staining';
export interface Measurement {
  shrinkage_pct?: number;
  staining_grade?: number;
  wash_temp_c?: number;
  wash_minutes?: number;
  cycles?: number;
  drying?: string;
  direction?: 'warp' | 'weft';
}
export interface FabricSample {
  sample_id?: string;
  fabric_id: string;
  color_depth?: 'dark' | 'light' | 'medium' | 'unknown';
  prewashed?: boolean | null;
  measurement?: Measurement | null;
}
export interface AnalysisInput { purpose: string; items: FabricSample[]; }
export interface AnalysisResponse {
  schema_version: '1.0'; rule_version: string; purpose: string;
  status: 'insufficient_data' | 'needs_testing' | 'no_rule_triggered';
  fabric_snapshots: Array<{sample_id:string;fabric_id:string;name:string;composition:Record<string,number>;color_depth:string;prewashed:boolean|null;source_ids:string[];catalogue_data_gaps:string[]}>;
  warnings: Array<{code:string;message:string;source_ids:string[];rule_status?:string;difference_pp?:number;threshold_pp?:number}>;
  unknown_fields: Array<{sample_id?:string;field:string;reason?:string}>;
  recommended_tests: Array<{test_type:TestType;reason:string;priority:'recommended'}>;
  shrinkage_difference_pp: number|null;
  measurement_basis: 'user_reported_only'; purpose_usage:string; disclaimer:string;
}
