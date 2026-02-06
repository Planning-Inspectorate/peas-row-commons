export type DateErrorState =
	| 'allEmpty'
	| 'dayOnly'
	| 'monthOnly'
	| 'yearOnly'
	| 'dayMonthOnly'
	| 'dayYearOnly'
	| 'monthYearOnly'
	| 'invalidDay'
	| 'invalidMonth'
	| 'invalidYear';
