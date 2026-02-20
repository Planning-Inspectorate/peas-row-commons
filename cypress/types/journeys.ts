import type { WorkArea, CaseType } from '../types/workAreaCaseTypes.ts';
import type { Drought, CPOs, SoS, Wayleaves, CoastalAccess, CommonLand, RightOfWay } from '../types/subTypes.ts';

export type Journeys =
	| {
			name: string;
			caseworkArea: WorkArea;
			caseType: CaseType;
			droughtSubtype: Drought;
			referencePrefix: string;
	  }
	| {
			name: string;
			caseworkArea: WorkArea;
			caseType: CaseType;
			cpoSubtype: CPOs;
			referencePrefix: string;
	  }
	| {
			name: string;
			caseworkArea: WorkArea;
			caseType: CaseType;
			sosSubtype: SoS;
			referencePrefix: string;
	  }
	| {
			name: string;
			caseworkArea: WorkArea;
			caseType: CaseType;
			referencePrefix: string;
	  }
	| {
			name: string;
			caseworkArea: WorkArea;
			caseType: CaseType;
			wayleavesSubtype: Wayleaves;
			referencePrefix: string;
	  }
	| {
			name: string;
			caseworkArea: WorkArea;
			caseType: CaseType;
			coastalAccessSubtype: CoastalAccess;
			referencePrefix: string;
	  }
	| {
			name: string;
			caseworkArea: WorkArea;
			caseType: CaseType;
			commonLandSubtype: CommonLand;
			referencePrefix: string;
	  }
	| {
			name: string;
			caseworkArea: WorkArea;
			caseType: CaseType;
			rightsOfWaySubtype: RightOfWay;
			referencePrefix: string;
	  };

export type JourneyAnswers = Partial<{
	caseworkAreaLabel: string;
	caseTypeLabel: string;
	subtypeLabel: string;
	caseName: string;
	externalReference: string;
	receivedDateLabel: string;
	applicant: string;
	siteAddressLabel: string;
	siteLocation: string;
	authority: string;
	caseOfficerLabel: string;
}>;
