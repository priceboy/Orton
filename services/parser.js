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

    const patterns = [

        /(?:MR|MRS|MS|MISS)\s+([A-Z\/\s]+)/i,

        /PASSENGER(?: NAME)?[:\s]+([A-Z\/\s]+)/i,

        /TRAVELER(?: NAME)?[:\s]+([A-Z\/\s]+)/i,

        /»\s*([A-Z\s\/]+?)Check-In/i
    ];

    for (const pattern of patterns) {

        const match = text.match(pattern);

        if (match?.[1]) {

            return match[1]
                .replace(/[^A-Z\/\s]/gi, "")
                .replace(/\s+/g, " ")
                .trim();
        }
    }

    return null;
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
// DATE ABOVE SEGMENT
// ======================================

function extractDateAboveSegment(fullText, segmentText) {

    const index = fullText.indexOf(segmentText);

    if (index === -1) return null;

    const beforeText = fullText.substring(
        Math.max(0, index - 500),
        index
    );

    const dates = [

        ...beforeText.matchAll(
            /\b\d{1,2}\s+(?:JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)\s+\d{4}\b/gi
        )

    ].map(m => m[0]);

    if (dates.length === 0)
        return null;

    return dates[dates.length - 1];
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
    // FINAL DESTINATION
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

    rawSegments.forEach((segment, index) => {

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
                /Departing At:\s*([0-9]{2}:[0-9]{2})/i
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

        let depDate = null;

        // FIRST LEG = OUTBOUND DATE
        // SHOULD USE FIRST GLOBAL DATE

        if (index === 0) {

            depDate =
                globalDates[0] || null;
        }

        // OTHER LEGS
        // DATE IS ABOVE SEGMENT

        else {

            depDate =
                extractDateAboveSegment(
                    text,
                    segment
                );
        }

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

    // HEADER OVERRIDE

    if (finalDestination) {

        arrival_airport =
            finalDestination;
    }

    // ======================================
    // ROUND TRIP DETECTION
    // ======================================

    let isRoundTrip = false;

    const returnStarter = legs.find(
        (leg, idx) => {

            if (idx === 0)
                return false;

            return (
                leg.from === arrival_airport
            );
        }
    );

    if (returnStarter) {

        isRoundTrip = true;
    }

    // ======================================
    // RETURN
    // ======================================

    let return_departure_airport = null;
    let return_arrival_airport = null;

    let return_departure_date = null;
    let return_departure_time = null;
    let return_flight_number = null;

    if (isRoundTrip) {

        // REVERSE ROUTE

        return_departure_airport =
            arrival_airport;

        return_arrival_airport =
            departure_airport;

        // FIND LEG STARTING FROM RETURN DEP AIRPORT

        const returnLeg = legs.find(
            (leg, idx) => {

                if (idx === 0)
                    return false;

                return (
                    leg.from ===
                    return_departure_airport
                );
            }
        );

        console.log(
            "RETURN LEG:",
            returnLeg
        );

        if (returnLeg) {

            return_departure_date =
                returnLeg.depDate;

            return_departure_time =
                returnLeg.depTime;

            return_flight_number =
                returnLeg.flightNo;
        }
    }

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

        return_departure_date,

        cabin_luggage,

        checked_luggage
    });

    // ======================================
    // FINAL OUTPUT
    // ======================================

    return {

        customer_name,

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

        airline_name,

        flight_number:
            outboundLeg.flightNo || null,

        cabin_luggage,

        checked_luggage,

        trip_type:

            isRoundTrip
            ? "ROUND_TRIP"
            : "ONE_WAY",

        // ======================================
        // RETURN
        // ======================================

        return_departure_airport,

        return_arrival_airport,

        return_departure_date,

        return_departure_time,

        return_checkin_time:
            getCheckInTime(
                return_departure_time
            ),

        return_flight_number
    };
}

module.exports = parseTicket;
