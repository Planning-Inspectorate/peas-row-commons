import type { WorkArea, CaseType } from './work-area-case-types.ts';
import type { Drought, CPOs, SoS, Wayleaves, CoastalAccess, CommonLand, RightOfWay } from './journey-subtypes.ts';

export type JourneyTag = 'smoke' | 'regression';

type BaseJourney = {
	name: string;
	caseworkArea: WorkArea;
	caseType: CaseType;
	referencePrefix: string;
	tags?: JourneyTag[];
};

export type Journeys =
	| (BaseJourney & {
			droughtSubtype: Drought;
	  })
	| (BaseJourney & {
			cpoSubtype: CPOs;
	  })
	| (BaseJourney & {
			sosSubtype: SoS;
	  })
	| BaseJourney
	| (BaseJourney & {
			wayleavesSubtype: Wayleaves;
	  })
	| (BaseJourney & {
			coastalAccessSubtype: CoastalAccess;
	  })
	| (BaseJourney & {
			commonLandSubtype: CommonLand;
	  })
	| (BaseJourney & {
			rightsOfWaySubtype: RightOfWay;
	  });

export type JourneyName = Journeys['name'];

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
