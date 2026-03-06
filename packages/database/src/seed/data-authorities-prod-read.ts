import { readFile, writeFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const HEADERS: Readonly<{ [x: string]: string }> = {
	AUTHORITY_NAME: 'pinsName',
	PINS_LPA_CODE: 'pinsCode',
	STATUS: 'status'
};

/**
 * Reads the CSV file specified by the LPA_DATA_FILE_PATH environment variable, parses it, and writes a JSON file with the same data in a format suitable for seeding the database.
 * The CSV file is expected to have three columns: pinsName, pinsCode, and status. The first row is treated as headers.
 * The output JSON file will be written to the same directory as this script, with the name 'data-authorities-prod-list.json'.
 */
async function run(): Promise<void> {
	const LPA_DATA_FILE_PATH = process.env.LPA_DATA_FILE_PATH;
	if (!LPA_DATA_FILE_PATH) {
		throw new Error('LPA_DATA_FILE_PATH is required');
	}
	const contents = await readFile(LPA_DATA_FILE_PATH, 'utf8');
	const lines = contents
		.toString()
		.split('\n')
		.filter(Boolean)
		.map((l) => l.trim())
		.map(parseCSVLine);

	const headers = lines[0];
	if (headers.length !== 3) {
		throw new Error('Expected 3 columns');
	}
	const allMatch = lines.every((line) => line.length === headers.length);
	if (!allMatch) {
		throw new Error('Not all lines have the same number of columns');
	}

	const createInputs = lines
		.slice(1)
		.map((l) => mapToObject(headers, l))
		.map(toCreateInput);

	// quick data integrity check - codes may not be unique, but should always have the same name
	const pinsCodeToName = new Map();
	for (const authority of createInputs) {
		if (authority.pinsCode) {
			if (pinsCodeToName.has(authority.pinsCode)) {
				const name = pinsCodeToName.get(authority.pinsCode);
				if (name !== authority.name) {
					throw new Error(
						`Duplicate onsCode with different names, code: ${authority.pinsCode}, names: ${name}, ${authority.name}`
					);
				}
			}
			pinsCodeToName.set(authority.pinsCode, authority.name);
		}
	}

	await writeFile(
		path.join(__dirname, 'data-authorities-prod-list.json'),
		JSON.stringify(createInputs, null, 2),
		'utf8'
	);
	console.log(`data-authorities-prod-list.json written with ${createInputs.length} LPAs`);
}

/**
 * Convert a record representing an LPA to a format suitable for creating an Authority in the database. The record is expected to have keys corresponding to the headers defined in the HEADERS constant.
 */
function toCreateInput(lpa: Record<string, string>) {
	return {
		//TODO: Add static mapping to ID - required for the question-generation to function which links by ID
		//id: PINS_CODE_TO_ID[lpa[HEADERS.PINS_LPA_CODE]],
		name: lpa[HEADERS.AUTHORITY_NAME],
		pinsCode: lpa[HEADERS.PINS_LPA_CODE],
		authorityStatusId: lpa[HEADERS.STATUS]
	};
}

function mapToObject(headers: string[], line: string[]): Record<string, string> {
	const obj: Record<string, string> = {};
	headers.forEach((header, i) => {
		obj[header] = line[i];
	});
	return obj;
}

/**
 * Parse one line of a CSV file, handling quoted fields and escaped quotes
 */
function parseCSVLine(line: string): string[] {
	const result = [];
	let field = '';
	let inQuotes = false;

	for (let i = 0; i < line.length; i++) {
		const char = line[i];
		if (char === '"') {
			if (inQuotes && line[i + 1] === '"') {
				field += '"';
				i++;
			} else {
				inQuotes = !inQuotes;
			}
		} else if (char === ',' && !inQuotes) {
			result.push(field);
			field = '';
		} else {
			field += char;
		}
	}
	result.push(field);
	return result;
}

run().catch(console.error);

// // static mapping to ID - required for the question-generation to function which links by ID
// const PINS_CODE_TO_ID = Object.freeze({
// 	Z0645
// 	J3205
// 	G1250
// 	Q1255
// 	P0430
// 	J0215
// 	N0220
// 	X0605
// 	B0610
// 	K0615
// 	P0620
// 	C0630
// 	L0635
// 	K0805
// 	P0810
// 	Y0815
// 	C0820
// 	L0825
// 	Q0830
// 	E1210
// 	U1240
// 	N1215
// 	B1225
// 	F1230
// 	P1235
// 	G1305
// 	V1315
// 	Z1320
// 	H1325
// 	M1330
// 	W1335
// 	A1340
// 	Q2908
// 	V2913
// 	N2915
// 	T2920
// 	R2928
// 	F2930
// 	V2723
// 	N3210
// 	X3215
// 	B3220
// 	K3225
// 	D3315
// 	H3320
// 	H3510
// 	E3525
// 	J3530
// 	T3535
// 	E3905
// 	J3910
// 	T3915
// 	F3925
// 	X0225
// 	E0535
// 	B0800
// 	H0900
// 	U1050
// 	J1155
// 	C1245
// 	J1345
// 	G1440
// 	Z1585
// 	T1600
// 	Q1770
// 	M1900
// 	W2275
// 	Q2371
// 	M2460
// 	Q2500
// 	X2600
// 	K2800
// 	R2900
// 	P2745
// 	L3055
// 	U3100
// 	G3300
// 	D3450
// 	V3500
// 	B3600
// 	H3700
// 	P3800
// 	E1855
// 	G6100
// 	Y3235
// 	CA0001
// 	CA0002
// 	CA0003
// 	CA0004
// 	CA0005
// 	CA0006
// 	CA0007
// 	CA0008
// 	CA0009
// 	CA0010
// 	CA0011
// 	CA0012
// 	CA0013
// 	CA0014
// 	CA0015
// 	CA0016
// 	CA0017
// 	CA0018
// 	W5000
// 	X1355
// 	N1350
// 	H0724
// 	W0734
// 	P2935
// 	V0728
// 	H0738
// 	H4505
// 	M4510
// 	W4515
// 	A4520
// 	J4525
// 	M2372
// 	J2373
// 	R0660
// 	A0665
// 	D0650
// 	M0655
// 	G0908
// 	W0910
// 	E0915
// 	Z0923
// 	H0928
// 	M0933
// 	N4205
// 	T4210
// 	B4215
// 	W4223
// 	P4225
// 	U4230
// 	C4235
// 	G4240
// 	Q4245
// 	V4250
// 	Z2315
// 	D2320
// 	M2325
// 	R2330
// 	A2335
// 	E2340
// 	N2345
// 	T2350
// 	B2355
// 	F2360
// 	P2365
// 	U2370
// 	V4305
// 	Z4310
// 	M4320
// 	H4315
// 	W4325
// 	E2001
// 	V2004
// 	B2002
// 	Y2003
// 	C2741
// 	C2708
// 	G2713
// 	E2734
// 	Y2736
// 	H2733
// 	N2739
// 	R4408
// 	F4410
// 	P4415
// 	J4423
// 	W4705
// 	A4710
// 	Z4718
// 	N4720
// 	X4725
// 	C1055
// 	W2465
// 	Q3060
// 	A2470
// 	M1005
// 	R1010
// 	A1015
// 	P1045
// 	N1025
// 	H1033
// 	R1038
// 	F1040
// 	T2405
// 	X2410
// 	F2415
// 	K2420
// 	Y2430
// 	G2435
// 	L2440
// 	Z2505
// 	D2510
// 	M2515
// 	R2520
// 	A2525
// 	E2530
// 	N2535
// 	U2805
// 	Y2810
// 	G2815
// 	L2820
// 	V2825
// 	Z2830
// 	H2835
// 	W3005
// 	A3010
// 	J3015
// 	N3020
// 	X3025
// 	B3030
// 	P3040
// 	W1850
// 	L3245
// 	M3455
// 	C3240
// 	X3405
// 	B3410
// 	K3415
// 	P3420
// 	C3430
// 	Y3425
// 	B3438
// 	Z3445
// 	R3705
// 	W3710
// 	E3715
// 	J3720
// 	T3725
// 	P4605
// 	U4610
// 	C4615
// 	G4620
// 	Q4625
// 	V4630
// 	D4635
// 	P1805
// 	J1860
// 	Q1825
// 	D1835
// 	H1840
// 	R1845
// 	K0235
// 	P0240
// 	B0230
// 	J0540
// 	D1590
// 	M1595
// 	Q0505
// 	V0510
// 	D0515
// 	H0520
// 	W0530
// 	V1505
// 	Z1510
// 	H1515
// 	M1520
// 	W1525
// 	A1530
// 	J1535
// 	N1540
// 	X1545
// 	B1550
// 	P1560
// 	C1570
// 	W1905
// 	A1910
// 	J1915
// 	N1920
// 	X1925
// 	B1930
// 	K1935
// 	P1940
// 	Y1945
// 	C1950
// 	F2605
// 	K2610
// 	U2615
// 	V2635
// 	Y2620
// 	G2625
// 	L2630
// 	D3505
// 	X3540
// 	R3515
// 	W3520
// 	F3545
// 	X5210
// 	K5030
// 	U5360
// 	H5390
// 	Y5420
// 	V5570
// 	K5600
// 	N5660
// 	C5690
// 	G5750
// 	A5840
// 	E5900
// 	H5960
// 	X5990
// 	Z5060
// 	N5090
// 	D5120
// 	T5150
// 	G5180
// 	L5240
// 	A5270
// 	Q5300
// 	E5330
// 	M5450
// 	B5480
// 	R5510
// 	F5540
// 	Z5630
// 	T5720
// 	W5780
// 	L5810
// 	P5870
// 	U5930
// 	R0335
// 	Q1445
// 	P2114
// 	A2280
// 	Y0435
// 	Z1775
// 	E0345
// 	J0350
// 	D1780
// 	W0340
// 	T0355
// 	X0360
// 	J0405
// 	X0415
// 	N0410
// 	K0425
// 	T1410
// 	B1415
// 	P1425
// 	U1430
// 	C1435
// 	H1705
// 	M1710
// 	W1715
// 	A1720
// 	J1725
// 	N1730
// 	X1735
// 	B1740
// 	P1750
// 	C1760
// 	L1765
// 	E2205
// 	J2210
// 	T2215
// 	X2220
// 	L2250
// 	K2230
// 	U2235
// 	G2245
// 	V2255
// 	Z2260
// 	H2265
// 	M2270
// 	C3105
// 	G3110
// 	Q3115
// 	V3120
// 	D3125
// 	K3605
// 	P3610
// 	Y3615
// 	C3620
// 	L3625
// 	Q3630
// 	Z3635
// 	D3640
// 	M3645
// 	R3650
// 	A3655
// 	Y3805
// 	C3810
// 	L3815
// 	Q3820
// 	Z3825
// 	D3830
// 	M3835
// 	F0114
// 	V1260
// 	Z0116
// 	D0840
// 	D1265
// 	Z0835
// 	D0121
// 	N1160
// 	P0119
// 	U3935
// 	X1165
// 	Y3940
// 	U1105
// 	Y1110
// 	Y1138
// 	X1118
// 	K1128
// 	P1133
// 	W1145
// 	Q1153
// 	B1605
// 	F1610
// 	P1615
// 	U1620
// 	C1625
// 	G1630
// 	Q3305
// 	W3330
// 	R3325
// 	J9497
// 	F9498
// 	Q9495
// 	B9506
// 	W9500
// 	T9501
// 	M9496
// 	Y9507
// 	E9505
// 	C9499
// 	J2285
// 	M9584
// 	F5730
// 	C0440
// 	M2840
// 	W2845
// 	F0935
// 	K0940
// 	U2750
// 	V3310
// 	E3335
// 	F0745
// 	K0750
// 	L6805
// 	Q6810
// 	H9504
// 	T6905
// 	R6830
// 	A6835
// 	H6955
// 	T6850
// 	D6820
// 	L9503
// 	N6845
// 	M6825
// 	P9502
// 	U6925
// 	B6855
// 	Y6930
// 	F6915
// 	Z6950
// 	Z6815
// 	L6940
// 	K6920
// 	X6910
// 	V6945
// 	E6840
// 	G6935
// 	JSP033
// 	JSP035
// 	NA
// 	JSP021
// 	JSP034
// 	M9565
// 	M9570
// 	K3930
// 	U9582
// 	W0205
// 	A9580
// 	W9575
// 	JSP033
// 	JSP002
// 	JSP003
// 	JSP031
// 	JSP014
// 	JSP005
// 	JSP006
// 	JSP008
// 	JSP026
// 	JSP009
// 	JSP010
// 	JSP011
// 	JSP012
// 	JSP013
// 	JSP028
// 	JSP015
// 	JSP016
// 	JSP029
// 	JSP018
// 	JSP019
// 	JSP032
// 	JSP020
// 	JSP021
// 	JSP022
// 	JSP030
// 	JSP023
// 	JSP024
// 	JSP025
// 	JSP034
// 	JSP035
// 	JSP017
// 	JSP007
// });
