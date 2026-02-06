import type { WorkArea, CaseType } from '../types/workAreaCaseTypes.ts';
import type { Drought, CPOs, SoS, Wayleaves, CoastalAccess, CommonLand, RightOfWay } from '../types/subTypes.ts';

export type Journeys =
	| {
			name: string;
			caseworkArea: WorkArea;
			caseType: CaseType;
			droughtSubtype: Drought;
	  }
	| {
			name: string;
			caseworkArea: WorkArea;
			caseType: CaseType;
			cpoSubtype: CPOs;
	  }
	| {
			name: string;
			caseworkArea: WorkArea;
			caseType: CaseType;
			sosSubtype: SoS;
	  }
	| {
			name: string;
			caseworkArea: WorkArea;
			caseType: CaseType;
	  }
	| {
			name: string;
			caseworkArea: WorkArea;
			caseType: CaseType;
			wayleavesSubtype: Wayleaves;
	  }
	| {
			name: string;
			caseworkArea: WorkArea;
			caseType: CaseType;
			coastalAccessSubtype: CoastalAccess;
	  }
	| {
			name: string;
			caseworkArea: WorkArea;
			caseType: CaseType;
			commonLandSubtype: CommonLand;
	  }
	| {
			name: string;
			caseworkArea: WorkArea;
			caseType: CaseType;
			rightsOfWaySubtype: RightOfWay;
	  };
