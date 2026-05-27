function getCheckInTime(time) {

    if (!time) return null;

    let [h, m] = time.split(":").map(Number);

    h -= 4;

    if (h < 0) h += 24;

    return `${h.toString().padStart(2, "0")}:${m
        .toString()
        .padStart(2, "0")}`;
}

function cleanText(text) {

    return text
        .replace(/\r/g, "\n")
        .replace(/\t/g, " ")
        .replace(/[ ]{2,}/g, " ")
        .replace(/\n{2,}/g, "\n");
}

// ======================================
// NAME EXTRACTION
// ======================================

function extractName(text) {

    const blacklist = [

        "SEATS",
        "SEAT",
        "CHECK",
        "CHECK IN",
        "BAGGAGE",
        "FLIGHT",
        "BOARDING",
        "GATE",
        "TERMINAL",
        "ECONOMY"
    ];

    const patterns = [

        // ======================================
        // YOUR ORIGINAL PERFECT WORKING FORMAT
        // ======================================

        /»\s*([A-Z\s\/]+?)\s*Check-In/i,

        // MR JOHN DOE
        /\b(?:MR|MRS|MS|MISS)\.?\s+([A-Z\/ ]{5,60})/i,

        // PASSENGER NAME
        /PASSENGER(?: NAME)?[:\s]+([A-Z\/ ]{5,60})/i,

        // TRAVELER NAME
        /TRAVELER(?: NAME)?[:\s]+([A-Z\/ ]{5,60})/i,

        // NAME BEFORE CHECK-IN
        /([A-Z][A-Z\s\/]{5,60})\s+Check-In/i
    ];

    for (const pattern of patterns) {

        const match = text.match(pattern);

        if (!match?.[1]) continue;

        let cleaned = match[1]

            .replace(/[^A-Z\/ ]/gi, "")
            .replace(/\s+/g, " ")
            .trim();

        cleaned = cleaned
            .replace(/^(MR|MRS|MS|MISS)\s+/i, "")
            .trim();

        const upper =
            cleaned.toUpperCase();

        const bad =
            blacklist.some(word =>
                upper.includes(word)
            );

        if (bad) continue;

        if (cleaned.length < 4)
            continue;

        return cleaned;
    }

    return "UNKNOWN CUSTOMER";
}

// ======================================
// HEADER DESTINATION
// ======================================

function extractHeaderDestination(text) {

    const match = text.match(
        /TRIP TO\s+([A-Z]+)/i
    );

    if (!match) return null;

    const city = match[1].toUpperCase();

    const cityMap = {

        DOUALA: "DLA",
        PARIS: "CDG",
        KIGALI: "KGL",
        BANGUI: "BGF",
        YAOUNDE: "NSI",
        BRUSSELS: "BRU",
        ISTANBUL: "IST",
        LONDON: "LHR",
        DUBAI: "DXB"
    };

    return cityMap[city] || null;
}

// ======================================
// GLOBAL DATES
// ======================================

function extractAllDates(text) {

    return [

        ...text.matchAll(
            /\b\d{1,2}\s+(?:JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)\s+\d{4}\b/gi
        )

    ].map(m => m[0]);
}

// ======================================
// BAGGAGE
// ======================================

function extractBaggage(text, type) {

    const regexes = {

        cabin: [

            /Cabin Baggage:\s*Adult,\s*([^\n]+)/i,

            /Cabin Baggage\s*:?[\s\n]*([^\n]+)/i,

            /CABIN BAGGAGE\s*:?[\s\n]*([^\n]+)/i
        ],

        checked: [

            /Checked Baggage:\s*Adult,\s*([^\n]+)/i,

            /Checked Baggage\s*:?[\s\n]*([^\n]+)/i,

            /CHECKED BAGGAGE\s*:?[\s\n]*([^\n]+)/i
        ]
    };

    for (const reg of regexes[type]) {

        const match = text.match(reg);

        if (match?.[1]) {

            return match[1]
                .replace(/\s+/g, " ")
                .trim();
        }
    }

    return null;
}

// ======================================
// DATE EXTRACTION
// ======================================

function extractDateInsideSegment(segment) {

    const dateMatches = [

        ...segment.matchAll(
            /\b(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun),?\s+\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{4}\b/gi
        ),

        ...segment.matchAll(
            /\b\d{1,2}\s+(?:JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)\s+\d{4}\b/gi
        )
    ];

    return dateMatches.length > 0
        ? dateMatches[0][0]
        : null;
}

// ======================================
// MAIN PARSER
// ======================================

function parseTicket(text) {

    text = cleanText(text);

    // ======================================
    // CUSTOMER NAME
    // ======================================

    const customer_name =
        extractName(text);

    // ======================================
    // DESTINATION
    // ======================================

    const finalDestination =
        extractHeaderDestination(text);

    // ======================================
    // GLOBAL DATES
    // ======================================

    const globalDates =
        extractAllDates(text);

    // ======================================
    // SPLIT SEGMENTS
    // ======================================

    const rawSegments =
        text.split(/DEPARTURE:/i).slice(1);

    const legs = [];

    rawSegments.forEach((rawSegment) => {

        const segment =
            "DEPARTURE:" + rawSegment;

        // ======================================
        // AIRPORTS
        // ======================================

        const airportMatches = [

            ...segment.matchAll(/\b[A-Z]{3}\b/g)

        ]

        .map(m => m[0])

        .filter(code => {

            return ![

                "ADT",
                "CNN",
                "INF",
                "BAG",
                "CAB",
                "VAT",

                "JAN",
                "FEB",
                "MAR",
                "APR",
                "MAY",
                "JUN",
                "JUL",
                "AUG",
                "SEP",
                "OCT",
                "NOV",
                "DEC"

            ].includes(code);
        });

        const uniqueAirports =
            [...new Set(airportMatches)];

        if (uniqueAirports.length < 2)
            return;

        const from =
            uniqueAirports[0];

        const to =
            uniqueAirports[1];

        // ======================================
        // TIME
        // ======================================

        const depTime =

            segment.match(
                /Departing At:\s*\n?\s*([0-9]{2}:[0-9]{2})/i
            )?.[1]

            ||

            segment.match(
                /\b([0-9]{2}:\d{2})\b/
            )?.[1]

            ||

            null;

        // ======================================
        // FLIGHT NUMBER
        // ======================================

        const flightNo =

            segment.match(
                /\b([A-Z]{2}\s?\d{3,4})\b/
            )?.[1]

            ||

            null;

        // ======================================
        // DATE
        // ======================================

        const depDate =

            extractDateInsideSegment(segment)

            ||

            globalDates[0]

            ||

            null;

        legs.push({

            from,
            to,
            depDate,
            depTime,
            flightNo
        });
    });

    console.log("ALL LEGS:", legs);

    // ======================================
    // OUTBOUND
    // ======================================

    const outboundLeg =
        legs[0] || {};

    const departure_airport =
        outboundLeg.from || null;

    let arrival_airport =
        outboundLeg.to || null;

    if (finalDestination) {

        arrival_airport =
            finalDestination;
    }

    // ======================================
    // RETURN LEG
    // ======================================

    const returnLeg = legs.find(
        (leg, idx) => {

            if (idx === 0)
                return false;

            return (

                leg.from === arrival_airport &&

                leg.to === departure_airport
            );
        }
    );

    const isRoundTrip =
        !!returnLeg;

    // ======================================
    // AIRLINE
    // ======================================

    const airline_name =

        text.match(
            /\b(ETHIOPIAN AIRLINES|RWANDAIR|AIR FRANCE|KENYA AIRWAYS|TURKISH AIRLINES)\b/i
        )?.[1]

        ||

        text.match(
            /\n([A-Z ]+LIMITED)/i
        )?.[1]

        ||

        null;

    // ======================================
    // BAGGAGE
    // ======================================

    const cabin_luggage =
        extractBaggage(text, "cabin");

    const checked_luggage =
        extractBaggage(text, "checked");

    console.log("FINAL PARSED:", {

        customer_name,

        departure_airport,

        arrival_airport,

        departure_date:
            outboundLeg.depDate,

        return_departure_date:
            returnLeg?.depDate,

        cabin_luggage,

        checked_luggage
    });

    // ======================================
    // FINAL OUTPUT
    // ======================================

    return {

        customer_name,

        // ======================================
        // OUTBOUND
        // ======================================

        departure_airport,

        arrival_airport,

        departure_date:
            outboundLeg.depDate || null,

        departure_time:
            outboundLeg.depTime || null,

        checkin_time:
            getCheckInTime(
                outboundLeg.depTime
            ),

        flight_number:
            outboundLeg.flightNo || null,

        // ======================================
        // RETURN
        // ======================================

        return_departure_airport:
            returnLeg?.from || null,

        return_arrival_airport:
            returnLeg?.to || null,

        return_departure_date:
            returnLeg?.depDate || null,

        return_departure_time:
            returnLeg?.depTime || null,

        return_checkin_time:
            getCheckInTime(
                returnLeg?.depTime
            ),

        return_flight_number:
            returnLeg?.flightNo || null,

        // ======================================
        // OTHER
        // ======================================

        airline_name,

        cabin_luggage,

        checked_luggage,

        trip_type:
            isRoundTrip
            ? "ROUND_TRIP"
            : "ONE_WAY"
    };
}

module.exports = parseTicket;
